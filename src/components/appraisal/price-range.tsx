import { formatPrice } from "@/lib/utils";

/** Low / mid / high price range with the mid emphasized. Prices in mono. */
export function PriceRange({
  low,
  mid,
  high,
}: {
  low: number;
  mid: number;
  high: number;
}) {
  const pct = ((mid - low) / (high - low || 1)) * 100;
  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Estimated value</div>
          <div className="mono-num mt-1 text-4xl font-semibold text-foreground sm:text-5xl">
            {formatPrice(mid)}
          </div>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <div className="mono-num">{formatPrice(low)}</div>
          <div className="text-[10px] uppercase">low</div>
        </div>
      </div>

      <div className="relative mt-4 h-2 rounded-full bg-background">
        <div className="absolute inset-y-0 left-0 rounded-full bg-primary/25" style={{ width: "100%" }} />
        <div
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary"
          style={{ left: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      <div className="mono-num mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{formatPrice(low)}</span>
        <span className="text-secondary">Buy-It-Now {formatPrice(high)}</span>
      </div>
    </div>
  );
}
