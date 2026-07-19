import Stripe from "stripe";

/**
 * Stripe client. Optional — if STRIPE_SECRET_KEY is unset the app renders
 * billing UI in "demo mode" and checkout endpoints return a friendly notice
 * instead of throwing.
 */
export const stripeEnabled = Boolean(process.env.STRIPE_SECRET_KEY);

export const stripe: Stripe | null = stripeEnabled
  ? new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion,
    })
  : null;
