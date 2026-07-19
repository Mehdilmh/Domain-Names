import { NextRequest, NextResponse } from "next/server";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { grantCredits } from "@/lib/credits";
import { CREDIT_PACKS, TIERS } from "@/config/app";

export const runtime = "nodejs";

/**
 * Stripe webhook: fulfil credit-pack purchases and sync subscription tiers.
 * No-op friendly response when Stripe isn't configured.
 */
export async function POST(req: NextRequest) {
  if (!stripeEnabled || !stripe) {
    return NextResponse.json({ ok: true, note: "Stripe not configured; ignoring." });
  }

  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const raw = await req.text();

  let event;
  try {
    event =
      sig && secret
        ? stripe.webhooks.constructEvent(raw, sig, secret)
        : (JSON.parse(raw) as import("stripe").Stripe.Event);
  } catch (err) {
    return NextResponse.json({ error: `Webhook signature failed: ${String(err)}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as import("stripe").Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const packId = session.metadata?.packId;
      if (userId && packId) {
        const pack = CREDIT_PACKS.find((p) => p.id === packId);
        if (pack) await grantCredits(userId, pack.credits, "purchase", session.id);
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const sub = event.data.object as import("stripe").Stripe.Subscription;
      const item = sub.items.data[0];
      const priceId = item?.price.id;
      const tier = TIERS.find((t) => t.stripePriceId === priceId)?.id ?? "pro";
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      // current_period_end lives on the subscription item in recent API versions,
      // and on the subscription in older ones — read whichever is present.
      const periodEnd =
        (item as unknown as { current_period_end?: number })?.current_period_end ??
        (sub as unknown as { current_period_end?: number }).current_period_end;
      const dbSub = await prisma.subscription.findFirst({ where: { stripeCustomerId: customerId } });
      if (dbSub) {
        await prisma.subscription.update({
          where: { id: dbSub.id },
          data: {
            tier,
            status: sub.status,
            stripeSubscriptionId: sub.id,
            currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
          },
        });
        await prisma.user.update({ where: { id: dbSub.userId }, data: { tier } });
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
