import { AlertTriangle, ShieldCheck } from "lucide-react";
import type { TrademarkResult } from "@/lib/valuation/types";

export function TrademarkFlag({ trademark }: { trademark: TrademarkResult }) {
  if (!trademark.risk) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>{trademark.note}</span>
      </div>
    );
  }
  const isHigh = trademark.level === "high";
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
        isHigh
          ? "border-danger/30 bg-danger/5 text-danger"
          : "border-secondary/30 bg-secondary/5 text-secondary"
      }`}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        <span className="font-semibold uppercase">{trademark.level} trademark risk. </span>
        {trademark.note}
      </span>
    </div>
  );
}
