import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { TIERS, CREDIT_PACKS } from "@/config/app";

/**
 * Start a Stripe Checkout session for a subscription tier or credit pack.
 * In demo mode (no Stripe key) it grants the pack/tier directly so the flow
 * is exercisable without keys.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.redirect(new URL("/login", req.url));

  const tierId = req.nextUrl.searchParams.get("tier");
  const packId = req.nextUrl.searchParams.get("pack");
  const origin = req.nextUrl.origin;

  const tier = TIERS.find((t) => t.id === tierId);
  const pack = CREDIT_PACKS.find((p) => p.id === packId);
  if (!tier && !pack) {
    return NextResponse.json({ error: "Specify ?tier= or ?pack=" }, { status: 400 });
  }

  // Demo mode: no Stripe → grant immediately and bounce back.
  if (!stripeEnabled || !stripe) {
    if (pack) {
      const { grantCredits } = await import("@/lib/credits");
      await grantCredits(userId, pack.credits, "purchase", `demo:${pack.id}`);
    }
    if (tier && tier.id !== "free") {
      await prisma.user.update({ where: { id: userId }, data: { tier: tier.id } });
    }
    return NextResponse.redirect(new URL("/portfolio?upgraded=demo", origin));
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: pack ? "payment" : "subscription",
    line_items: [
      {
        price: (pack ? pack.stripePriceId : tier?.stripePriceId) as string,
        quantity: 1,
      },
    ],
    success_url: `${origin}/portfolio?upgraded=1`,
    cancel_url: `${origin}/pricing`,
    metadata: { userId, packId: pack?.id ?? "", tierId: tier?.id ?? "" },
  });

  return NextResponse.redirect(checkout.url as string, { status: 303 });
}
