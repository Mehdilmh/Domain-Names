"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { appraise } from "@/lib/valuation";
import { addPortfolioItemSchema, removePortfolioItemSchema } from "@/schemas/portfolio";

async function requireUser() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) throw new Error("unauthenticated");
  return userId;
}

async function getOrCreatePortfolio(userId: string) {
  const existing = await prisma.portfolio.findFirst({ where: { userId } });
  if (existing) return existing;
  return prisma.portfolio.create({ data: { userId } });
}

export async function addPortfolioItem(input: unknown) {
  const userId = await requireUser();
  const parsed = addPortfolioItemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const portfolio = await getOrCreatePortfolio(userId);

  // seed an estimate so the portfolio table has value immediately (cache hit if seen before)
  const result = await appraise(parsed.data.domain, { source: "web", skipComps: true }).catch(() => null);

  await prisma.portfolioItem.upsert({
    where: { portfolioId_domain: { portfolioId: portfolio.id, domain: parsed.data.domain } },
    create: {
      portfolioId: portfolio.id,
      domain: parsed.data.domain,
      renewalCost: parsed.data.renewalCost,
      renewsAt: parsed.data.renewsAt,
      notes: parsed.data.notes,
      estValue: result?.mid ?? null,
      lastAppraised: result ? new Date() : null,
    },
    update: {
      renewalCost: parsed.data.renewalCost,
      renewsAt: parsed.data.renewsAt,
      notes: parsed.data.notes,
      estValue: result?.mid ?? undefined,
      lastAppraised: result ? new Date() : undefined,
    },
  });

  revalidatePath("/portfolio");
  return { ok: true as const };
}

export async function removePortfolioItem(input: unknown) {
  const userId = await requireUser();
  const parsed = removePortfolioItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid id" };

  // ensure ownership
  const item = await prisma.portfolioItem.findUnique({
    where: { id: parsed.data.id },
    include: { portfolio: true },
  });
  if (!item || item.portfolio.userId !== userId) {
    return { ok: false as const, error: "Not found" };
  }
  await prisma.portfolioItem.delete({ where: { id: parsed.data.id } });
  revalidatePath("/portfolio");
  return { ok: true as const };
}

/** Re-appraise every item in the user's portfolio (refresh values). */
export async function refreshPortfolio() {
  const userId = await requireUser();
  const portfolio = await getOrCreatePortfolio(userId);
  const items = await prisma.portfolioItem.findMany({ where: { portfolioId: portfolio.id } });

  for (const item of items) {
    const result = await appraise(item.domain, { source: "web", skipComps: true }).catch(() => null);
    if (result) {
      await prisma.portfolioItem.update({
        where: { id: item.id },
        data: { estValue: result.mid, lastAppraised: new Date() },
      });
    }
  }
  revalidatePath("/portfolio");
  return { ok: true as const };
}
