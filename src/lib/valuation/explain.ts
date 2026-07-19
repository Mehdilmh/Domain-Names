import { createHash } from "node:crypto";
import { kv } from "@/lib/redis";
import { llmProvider } from "@/lib/providers/anthropic";
import { APPRAISAL_CACHE_DAYS } from "@/config/app";
import type { Comp, DomainFeatures, Prediction, TrademarkResult } from "./types";

const SYSTEM_PROMPT = `You are a domain valuation analyst for a tool called DomainPulse.
Given extracted features, a price estimate, and comparable sales, write ONE concise
paragraph (3-5 sentences) of plain-English reasoning explaining the valuation.
Reference concrete drivers (length, TLD, keyword demand, comparables). Be measured and
neutral. Do not give financial advice, do not invent facts, do not use markdown.`;

function usd(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

/** Deterministic, provider-free explanation used when no API key is set. */
export function fallbackExplanation(
  features: DomainFeatures,
  prediction: Prediction,
  comps: Comp[],
  trademark: TrademarkResult,
): string {
  const parts: string[] = [];
  const topComp = comps[0];

  parts.push(
    `${features.domain} is a ${features.length}-character .${features.tld} name in the ${features.category} category, valued around ${usd(
      prediction.mid,
    )} (range ${usd(prediction.low)}–${usd(prediction.high)}).`,
  );

  const drivers: string[] = [];
  if (features.length <= 8) drivers.push("its short length");
  if (features.tld === "com") drivers.push("the premium .com extension");
  if (features.isDictionaryWord) drivers.push("its dictionary-word clarity");
  if (features.keywordVolume > 5000)
    drivers.push(`strong keyword demand (~${features.keywordVolume.toLocaleString()} monthly searches)`);
  if (drivers.length)
    parts.push(`The estimate is lifted by ${drivers.join(", ")}.`);

  const drags: string[] = [];
  if (features.hasHyphen) drags.push("a hyphen");
  if (features.hasNumbers) drags.push("digits");
  if (features.pronounceability < 0.4) drags.push("weak pronounceability");
  if (drags.length) parts.push(`It is weighed down by ${drags.join(" and ")}.`);

  if (topComp)
    parts.push(
      `The closest comparable, ${topComp.domain} (${usd(topComp.price)}, ${topComp.similarity}% similar), anchors the estimate.`,
    );

  parts.push(
    `Estimated time-to-sell is about ${prediction.monthsToSell} months given a liquidity score of ${prediction.liquidity}/100.`,
  );

  if (trademark.risk) parts.push(`Note: ${trademark.note}`);

  return parts.join(" ");
}

function explanationKey(features: DomainFeatures, prediction: Prediction): string {
  const material = `${features.domain}|${prediction.low}|${prediction.mid}|${prediction.high}`;
  return "explain:" + createHash("sha256").update(material).digest("hex");
}

/**
 * Produce a one-paragraph explanation. Cached by domain+price hash for the
 * appraisal TTL. Uses Claude when ANTHROPIC_API_KEY is present, otherwise
 * the deterministic fallback.
 */
export async function explain(
  features: DomainFeatures,
  prediction: Prediction,
  comps: Comp[],
  trademark: TrademarkResult,
): Promise<string> {
  const cacheKey = explanationKey(features, prediction);
  const cached = await kv.get(cacheKey);
  if (cached) return cached;

  let text: string | null = null;
  if (llmProvider.enabled) {
    const compLines = comps
      .slice(0, 6)
      .map((c) => `- ${c.domain}: ${usd(c.price)} (${c.similarity}% similar, sold ${c.soldAt.slice(0, 10)})`)
      .join("\n");
    const userMsg = [
      `Domain: ${features.domain}`,
      `Features: length=${features.length}, tld=${features.tld}, category=${features.category}, dictionaryWord=${features.isDictionaryWord}, pronounceability=${features.pronounceability.toFixed(2)}, keywordVolume=${features.keywordVolume}, ageYears=${features.ageYears}, hyphens=${features.hyphens}, digits=${features.digits}`,
      `Estimate: low=${usd(prediction.low)}, mid=${usd(prediction.mid)}, high=${usd(prediction.high)}, confidence=${prediction.confidence}, monthsToSell=${prediction.monthsToSell}, liquidity=${prediction.liquidity}`,
      `Trademark: ${trademark.risk ? trademark.note : "no obvious conflicts"}`,
      `Comparable sales:\n${compLines}`,
    ].join("\n");
    text = await llmProvider.complete(SYSTEM_PROMPT, userMsg);
  }

  const explanation = text ?? fallbackExplanation(features, prediction, comps, trademark);
  await kv.set(cacheKey, explanation, APPRAISAL_CACHE_DAYS * 86400);
  return explanation;
}
