/** Compact stat row: confidence, months-to-sell, liquidity. */
export function StatTiles({
  confidence,
  monthsToSell,
  liquidity,
}: {
  confidence: number;
  monthsToSell: number;
  liquidity: number;
}) {
  const tiles = [
    { label: "Confidence", value: `${confidence}`, unit: "/100", tone: toneFor(confidence) },
    { label: "Time to sell", value: `${monthsToSell}`, unit: "mo", tone: "text-foreground" },
    { label: "Liquidity", value: `${liquidity}`, unit: "/100", tone: toneFor(liquidity) },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-lg border border-border bg-background/40 p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.label}</div>
          <div className="mono-num mt-1 flex items-baseline gap-0.5">
            <span className={`text-2xl font-semibold ${t.tone}`}>{t.value}</span>
            <span className="text-xs text-muted-foreground">{t.unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function toneFor(score: number): string {
  if (score >= 70) return "text-primary";
  if (score >= 45) return "text-secondary";
  return "text-danger";
}
