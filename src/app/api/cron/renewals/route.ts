import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { formatDate, formatPrice, daysUntil } from "@/lib/utils";
import { APP_NAME, RENEWAL_ALERT_DAYS } from "@/config/app";

export const runtime = "nodejs";

/**
 * Daily cron: flag portfolio domains expiring within 30 days and email each
 * owner a digest. Protect with CRON_SECRET (Authorization: Bearer or ?secret=).
 *
 * Schedule via Vercel Cron / GitHub Actions / any scheduler hitting this URL.
 */
export async function GET(req: NextRequest) {
  const provided =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    req.nextUrl.searchParams.get("secret");
  if (process.env.CRON_SECRET && provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const threshold = new Date(Date.now() + RENEWAL_ALERT_DAYS * 86400 * 1000);
  const items = await prisma.portfolioItem.findMany({
    where: { renewsAt: { not: null, lte: threshold, gte: new Date() } },
    include: { portfolio: { include: { user: true } } },
    orderBy: { renewsAt: "asc" },
  });

  // group by user
  const byUser = new Map<string, { email: string; rows: typeof items }>();
  for (const item of items) {
    const user = item.portfolio.user;
    if (!user.email) continue;
    const entry = byUser.get(user.id) ?? { email: user.email, rows: [] as typeof items };
    entry.rows.push(item);
    byUser.set(user.id, entry);
  }

  let sent = 0;
  for (const { email, rows } of byUser.values()) {
    const lines = rows
      .map(
        (r) =>
          `• ${r.domain} — renews ${formatDate(r.renewsAt!)} (${daysUntil(r.renewsAt!)}d), ` +
          `renewal ${formatPrice(r.renewalCost)}, est. value ${r.estValue ? formatPrice(r.estValue) : "—"}`,
      )
      .join("\n");
    const html = `<h2>${APP_NAME} renewal digest</h2><p>${rows.length} domain(s) renew within ${RENEWAL_ALERT_DAYS} days:</p><pre>${lines}</pre>`;
    await sendEmail({
      to: email,
      subject: `${APP_NAME}: ${rows.length} domain(s) renewing soon`,
      html,
      text: `${rows.length} domain(s) renew within ${RENEWAL_ALERT_DAYS} days:\n${lines}`,
    });
    sent++;
  }

  return NextResponse.json({ ok: true, flagged: items.length, digestsSent: sent });
}
