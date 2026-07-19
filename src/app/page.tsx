import Link from "next/link";
import { Layers, LineChart, ShieldCheck, Zap } from "lucide-react";
import { APP_NAME, APP_TAGLINE } from "@/config/app";
import { SearchHero } from "@/components/appraisal/search-hero";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  { icon: Zap, title: "Instant appraisals", body: "Price range, confidence, and time-to-sell in seconds." },
  { icon: LineChart, title: "Comps transparency", body: "Every estimate shows the real sales that drove it." },
  { icon: Layers, title: "Portfolio tracking", body: "Renewal alerts and keep/drop recommendations." },
  { icon: ShieldCheck, title: "Trademark flags", body: "Automatic risk checks before you buy." },
];

export default function HomePage() {
  return (
    <div>
      <section className="hero-glow relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-20 text-center">
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {APP_TAGLINE}
            </span>
            <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold leading-tight sm:text-6xl">
              What is your domain <span className="text-primary">actually</span> worth?
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
              {APP_NAME} estimates a Buy-It-Now range, confidence score, and time-to-sell — backed by
              transparent comparable sales, never a bare number.
            </p>
          </div>
          <div className="mt-10">
            <SearchHero />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Card key={f.title}>
              <CardContent className="pt-5">
                <f.icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 text-base font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm">
          <Link href="/bulk" className="btn-ghost">Bulk appraise a CSV</Link>
          <Link href="/accuracy" className="btn-ghost">See our accuracy</Link>
          <Link href="/docs/api" className="btn-ghost">Public API</Link>
        </div>
      </section>
    </div>
  );
}
