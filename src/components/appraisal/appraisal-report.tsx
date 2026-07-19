import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AppraisalResult } from "@/lib/valuation/types";
import { PriceRange } from "./price-range";
import { StatTiles } from "./stat-tiles";
import { FeatureBreakdown } from "./feature-breakdown";
import { CompsTable } from "./comps-table";
import { TrademarkFlag } from "./trademark-flag";
import { Disclaimer } from "./disclaimer";

/** Full appraisal report. `preview` hides comps/breakdown behind a paywall. */
export function AppraisalReport({
  result,
  preview = false,
}: {
  result: AppraisalResult;
  preview?: boolean;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="mono-num text-xl font-semibold text-foreground">{result.domain}</h2>
            <div className="flex items-center gap-2">
              <Badge variant="muted">{result.features.category}</Badge>
              {result.cached && <Badge variant="muted">cached</Badge>}
            </div>
          </div>
          <PriceRange low={result.low} mid={result.mid} high={result.high} />
          <div className="mt-5">
            <StatTiles
              confidence={result.confidence}
              monthsToSell={result.monthsToSell}
              liquidity={result.liquidity}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Why this estimate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm leading-relaxed text-muted-foreground">{result.explanation}</p>
            <TrademarkFlag trademark={result.trademark} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Feature breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {preview ? (
              <PaywallNotice label="Feature breakdown" />
            ) : (
              <FeatureBreakdown contributions={result.contributions} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Comparable sales{" "}
            <span className="text-sm font-normal text-muted-foreground">
              — the sales that drove this estimate
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {preview ? <PaywallNotice label="Full comparable sales" /> : <CompsTable comps={result.comps} />}
        </CardContent>
      </Card>

      <Disclaimer text={result.disclaimer} />
    </div>
  );
}

function PaywallNotice({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-background/40 p-6 text-center">
      <p className="text-sm text-muted-foreground">
        {label} is part of the full report.
      </p>
      <a href="/pricing" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
        Unlock the full appraisal →
      </a>
    </div>
  );
}
