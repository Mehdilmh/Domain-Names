import type { Metadata } from "next";
import { runBacktest } from "@/lib/backtest";
import { BacktestChart } from "@/components/charts/backtest-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Disclaimer } from "@/components/appraisal/disclaimer";

export const metadata: Metadata = {
  title: "Accuracy",
  description: "How our domain valuation model performs on a held-out backtest.",
};

// Recompute periodically; the seed data is static so this is cheap to cache.
export const revalidate = 3600;

export default async function AccuracyPage() {
  let backtest: Awaited<ReturnType<typeof runBacktest>> | null = null;
  try {
    backtest = await runBacktest(300);
  } catch {
    backtest = null;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Model accuracy</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Every prediction below was generated from a domain&apos;s features alone, then compared to
        the price it actually sold for in our historical dataset. Points near the amber line are
        accurate; the axes are log-scaled because domain prices span several orders of magnitude.
      </p>

      {!backtest ? (
        <Card className="mt-6">
          <CardContent className="pt-5 text-sm text-muted-foreground">
            No sales data found. Run <code className="mono-num">npm run seed</code> to populate the
            backtest.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Sample size" value={String(backtest.count)} />
            <Metric label="Median error" value={`${(backtest.medianAbsPctError * 100).toFixed(0)}%`} />
            <Metric label="Within 2×" value={`${(backtest.within2x * 100).toFixed(0)}%`} tone="text-primary" />
            <Metric label="Log correlation" value={backtest.correlation.toFixed(2)} />
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Predicted vs actual sale price</CardTitle>
            </CardHeader>
            <CardContent>
              <BacktestChart points={backtest.points} />
            </CardContent>
          </Card>
        </>
      )}

      <div className="mt-6">
        <Disclaimer />
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mono-num mt-1 text-xl font-semibold ${tone ?? "text-foreground"}`}>{value}</div>
    </div>
  );
}
