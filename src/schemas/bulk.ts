import { z } from "zod";
import { BULK_MAX_ROWS } from "@/config/app";
import { domainSchema } from "./appraise";

export const bulkInputSchema = z.object({
  domains: z
    .array(domainSchema)
    .min(1, "Provide at least one domain")
    .max(BULK_MAX_ROWS, `Bulk uploads are limited to ${BULK_MAX_ROWS} rows`),
});

export type BulkInput = z.infer<typeof bulkInputSchema>;

/** Parse a CSV/newline blob into a de-duplicated domain list. */
export function parseDomainCsv(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of raw.split(/[\r\n,]+/)) {
    const d = line.trim().toLowerCase();
    if (!d || d === "domain") continue; // skip header
    if (seen.has(d)) continue;
    seen.add(d);
    out.push(d);
  }
  return out;
}
