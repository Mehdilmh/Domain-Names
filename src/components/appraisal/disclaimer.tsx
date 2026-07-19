import { APPRAISAL_DISCLAIMER } from "@/config/app";

/** The non-negotiable disclaimer shown on every appraisal. */
export function Disclaimer({ text }: { text?: string }) {
  return (
    <p className="rounded-lg border border-border bg-background/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
      <span className="font-medium text-secondary">Disclaimer: </span>
      {text ?? APPRAISAL_DISCLAIMER}
    </p>
  );
}
