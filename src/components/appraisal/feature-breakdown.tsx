import type { FeatureContribution } from "@/lib/valuation/types";

/** Signed feature contributions to the price, as impact bars. */
export function FeatureBreakdown({ contributions }: { contributions: FeatureContribution[] }) {
  const max = Math.max(0.01, ...contributions.map((c) => Math.abs(c.impact)));
  return (
    <div className="space-y-2.5">
      {contributions.map((c) => {
        const positive = c.impact >= 0;
        const width = (Math.abs(c.impact) / max) * 50; // half-width from center
        return (
          <div key={c.label} className="grid grid-cols-[9rem_1fr_4rem] items-center gap-3 text-sm">
            <div className="truncate">
              <div className="text-foreground">{c.label}</div>
              <div className="truncate text-xs text-muted-foreground">{c.detail}</div>
            </div>
            <div className="relative h-2 rounded-full bg-background">
              <div className="absolute left-1/2 top-0 h-full w-px bg-border" />
              <div
                className={`absolute top-0 h-full rounded-full ${positive ? "bg-primary" : "bg-danger"}`}
                style={
                  positive
                    ? { left: "50%", width: `${width}%` }
                    : { right: "50%", width: `${width}%` }
                }
              />
            </div>
            <div
              className={`mono-num text-right text-xs ${positive ? "text-primary" : "text-danger"}`}
            >
              {positive ? "+" : ""}
              {(c.impact * 100).toFixed(0)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
