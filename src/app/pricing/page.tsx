import type { Metadata } from "next";
import { Check } from "lucide-react";
import { TIERS, CREDIT_PACKS } from "@/config/app";
import { stripeEnabled } from "@/lib/stripe";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Pricing</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Subscribe for monthly credits, or top up any time with one-time credit packs.
      </p>
      {!stripeEnabled && (
        <div className="mt-4">
          <Badge variant="secondary">Demo mode — Stripe not configured; checkout is simulated.</Badge>
        </div>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {TIERS.map((tier) => (
          <Card key={tier.id} className={tier.id === "pro" ? "border-primary/40" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{tier.name}</CardTitle>
                {tier.id === "pro" && <Badge>Popular</Badge>}
              </div>
              <div className="mono-num mt-2 text-3xl font-semibold">
                {formatPrice(tier.priceMonthly)}
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              </div>
              <div className="mono-num text-sm text-primary">
                {tier.monthlyCredits.toLocaleString()} credits / month
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href={tier.id === "free" ? "/login" : "/api/checkout?tier=" + tier.id}
                className="btn-primary mt-5 w-full"
              >
                {tier.id === "free" ? "Start free" : `Choose ${tier.name}`}
              </a>
            </CardContent>
          </Card>
        ))}
      </div>

      <h2 className="mt-12 text-lg font-semibold">One-time credit packs</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {CREDIT_PACKS.map((pack) => (
          <Card key={pack.id}>
            <CardContent className="flex items-center justify-between pt-5">
              <div>
                <div className="mono-num text-2xl font-semibold text-primary">
                  {pack.credits.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">credits</div>
              </div>
              <a href={"/api/checkout?pack=" + pack.id} className="btn-ghost">
                {formatPrice(pack.priceUsd)}
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
