import { APPRAISAL_DISCLAIMER } from "@/config/app";
import { dedupe, domainKey, getCachedAppraisal, setCachedAppraisal } from "@/lib/cache";
import { checkTrademark } from "@/lib/providers/trademark";
import { extractFeatures, splitDomain } from "./features";
import { predict } from "./model";
import { findComps } from "./comps";
import { explain } from "./explain";
import type { AppraisalResult } from "./types";

export * from "./types";
export { extractFeatures, toVector, splitDomain } from "./features";
export { predict } from "./model";
export { cosineSimilarity, findComps, rankComps } from "./comps";
export { explain, fallbackExplanation } from "./explain";

export interface AppraiseOptions {
  /** Bypass the 30-day cache (used sparingly, e.g. forced refresh). */
  fresh?: boolean;
  /** Skip comps DB lookup — used in fast previews. */
  skipComps?: boolean;
  source?: "web" | "api" | "bulk";
}

/**
 * Full appraisal pipeline:
 *   cache → in-flight dedupe → features → model → comps → trademark → explain
 *
 * Cached 30 days; identical concurrent requests are de-duplicated.
 */
export async function appraise(
  rawDomain: string,
  opts: AppraiseOptions = {},
): Promise<AppraisalResult> {
  const { domain } = splitDomain(rawDomain);

  if (!opts.fresh) {
    const cached = await getCachedAppraisal(domain);
    if (cached) return cached;
  }

  const key = domainKey(domain);
  return dedupe(key, async () => {
    // double-check cache inside the dedupe guard
    if (!opts.fresh) {
      const cached = await getCachedAppraisal(domain);
      if (cached) return cached;
    }

    const features = await extractFeatures(domain);
    const prediction = predict(features);
    const [comps, trademark] = await Promise.all([
      opts.skipComps ? Promise.resolve([]) : findComps(features),
      checkTrademark(domain),
    ]);
    const explanation = await explain(features, prediction, comps, trademark);

    const result: AppraisalResult = {
      domain,
      low: prediction.low,
      mid: prediction.mid,
      high: prediction.high,
      confidence: prediction.confidence,
      monthsToSell: prediction.monthsToSell,
      liquidity: prediction.liquidity,
      features,
      contributions: prediction.contributions,
      comps,
      explanation,
      trademark,
      disclaimer: APPRAISAL_DISCLAIMER,
      cached: false,
      generatedAt: new Date().toISOString(),
    };

    await setCachedAppraisal(result);
    return result;
  });
}
