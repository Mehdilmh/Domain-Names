import type { DomainFeatures, FeatureContribution, Prediction } from "./types";

/**
 * Heuristic valuation baseline.
 *
 * Operates in log-price space: a base log-price is adjusted by additive
 * log-contributions from each feature, then exponentiated. This produces a
 * naturally right-skewed (log-normal) price surface consistent with the
 * seed data distribution.
 *
 * TODO: replace with a trained GBM (e.g. LightGBM) fitted on the Sale table.
 * The public `predict()` signature is the stable contract the rest of the
 * app depends on — swap the internals, keep the interface.
 */

/** Natural-log base price ≈ e^6.9 ≈ $1,000 anchor before adjustments. */
const BASE_LOG_PRICE = 6.9;

interface LogContribution {
  label: string;
  logImpact: number; // additive in ln-space
  detail: string;
}

function computeContributions(f: DomainFeatures): LogContribution[] {
  const c: LogContribution[] = [];

  // Length: short names command large premiums.
  let lenImpact: number;
  if (f.length <= 3) lenImpact = 2.2;
  else if (f.length <= 5) lenImpact = 1.3;
  else if (f.length <= 8) lenImpact = 0.5;
  else if (f.length <= 12) lenImpact = 0;
  else if (f.length <= 16) lenImpact = -0.6;
  else lenImpact = -1.2;
  c.push({ label: "Length", logImpact: lenImpact, detail: `${f.length} characters` });

  // TLD desirability.
  c.push({
    label: "TLD",
    logImpact: (f.tldScore - 0.5) * 1.6,
    detail: `.${f.tld} (desirability ${(f.tldScore * 100).toFixed(0)}%)`,
  });

  // Dictionary word / real word premium.
  c.push({
    label: "Dictionary word",
    logImpact: f.isDictionaryWord ? 0.7 : f.dictionaryWordCount > 0 ? 0.3 : -0.1,
    detail: f.isDictionaryWord
      ? "recognized dictionary word(s)"
      : f.dictionaryWordCount > 0
      ? "partial dictionary match"
      : "coined / invented term",
  });

  // Pronounceability & brandability.
  c.push({
    label: "Pronounceability",
    logImpact: (f.pronounceability - 0.5) * 0.9,
    detail: `${(f.pronounceability * 100).toFixed(0)}% pronounceable`,
  });
  c.push({
    label: "Brandability",
    logImpact: (f.brandability - 0.5) * 1.1,
    detail: `${(f.brandability * 100).toFixed(0)}% brandable`,
  });

  // Hyphens & digits are strong negatives.
  if (f.hasHyphen) {
    c.push({ label: "Hyphens", logImpact: -0.5 * f.hyphens, detail: `${f.hyphens} hyphen(s)` });
  }
  if (f.hasNumbers) {
    c.push({ label: "Digits", logImpact: -0.35 * Math.min(f.digits, 3), detail: `${f.digits} digit(s)` });
  }

  // Keyword demand (log-scaled).
  const kwImpact = Math.min(1.2, Math.log10(f.keywordVolume + 1) / 5);
  c.push({
    label: "Keyword demand",
    logImpact: kwImpact,
    detail: `~${f.keywordVolume.toLocaleString()} monthly searches`,
  });

  // Category multiplier — hot verticals sell higher.
  const catBoost: Record<string, number> = {
    ai: 0.6, crypto: 0.45, finance: 0.4, tech: 0.25, health: 0.2,
    ecommerce: 0.15, gaming: 0.1, generic: 0,
  };
  c.push({
    label: "Category",
    logImpact: catBoost[f.category] ?? 0,
    detail: f.category,
  });

  // Age premium (aged domains carry SEO equity).
  c.push({
    label: "Age",
    logImpact: Math.min(0.5, f.ageYears * 0.03),
    detail: `${f.ageYears} year(s) old`,
  });

  return c;
}

/**
 * Confidence is higher when the name is unambiguous: strong signals
 * (short, dictionary, .com) and few conflicting negatives raise it.
 */
function computeConfidence(f: DomainFeatures, spreadRatio: number): number {
  let conf = 62;
  if (f.tld === "com") conf += 12;
  if (f.isDictionaryWord) conf += 8;
  if (f.length <= 8) conf += 6;
  if (f.hasHyphen) conf -= 10;
  if (f.hasNumbers) conf -= 8;
  if (f.pronounceability > 0.7) conf += 5;
  // wider predicted spread => lower confidence
  conf -= Math.min(20, (spreadRatio - 2) * 6);
  return Math.max(20, Math.min(96, Math.round(conf)));
}

/**
 * Estimated months-to-sell — inversely related to liquidity. Highly
 * liquid (short, .com, high demand) names move fast.
 */
function computeLiquidityAndTime(f: DomainFeatures): { liquidity: number; monthsToSell: number } {
  let liq = 40;
  liq += (f.tldScore - 0.5) * 40;
  if (f.length <= 6) liq += 20;
  else if (f.length <= 10) liq += 8;
  else liq -= 10;
  if (f.isDictionaryWord) liq += 12;
  if (f.hasHyphen) liq -= 15;
  if (f.hasNumbers) liq -= 10;
  liq += Math.min(15, Math.log10(f.keywordVolume + 1) * 3);
  liq = Math.max(3, Math.min(98, Math.round(liq)));

  // months-to-sell: 2 months at liq=98 up to ~48 months at liq=3
  const monthsToSell = Math.round((2 + (100 - liq) * 0.46) * 10) / 10;
  return { liquidity: liq, monthsToSell };
}

/** The stable prediction contract. */
export function predict(f: DomainFeatures): Prediction {
  const logContribs = computeContributions(f);
  const totalLog = BASE_LOG_PRICE + logContribs.reduce((s, c) => s + c.logImpact, 0);
  const mid = Math.exp(totalLog);

  // Spread widens with uncertainty (invented words, weird TLDs).
  const uncertainty =
    (f.isDictionaryWord ? 0 : 0.15) +
    (f.tld === "com" ? 0 : 0.1) +
    (f.hasNumbers || f.hasHyphen ? 0.1 : 0) +
    0.25;
  const low = mid / (1 + uncertainty);
  const high = mid * (1 + uncertainty);
  const spreadRatio = high / low;

  const confidence = computeConfidence(f, spreadRatio);
  const { liquidity, monthsToSell } = computeLiquidityAndTime(f);

  const contributions: FeatureContribution[] = logContribs.map((c) => ({
    label: c.label,
    impact: Math.exp(c.logImpact) - 1, // convert ln-space to signed % multiplier
    detail: c.detail,
  }));

  return {
    low: roundPrice(low),
    mid: roundPrice(mid),
    high: roundPrice(high),
    confidence,
    monthsToSell,
    liquidity,
    contributions,
  };
}

/** Round to a clean, human-plausible price. */
function roundPrice(p: number): number {
  if (p < 100) return Math.max(10, Math.round(p / 5) * 5);
  if (p < 1000) return Math.round(p / 25) * 25;
  if (p < 10000) return Math.round(p / 100) * 100;
  if (p < 100000) return Math.round(p / 500) * 500;
  return Math.round(p / 5000) * 5000;
}
