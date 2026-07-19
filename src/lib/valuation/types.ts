/** Feature vector extracted from a domain. */
export interface DomainFeatures {
  domain: string;
  sld: string;
  tld: string;
  length: number; // length of the SLD
  hyphens: number;
  digits: number;
  hasNumbers: boolean;
  hasHyphen: boolean;
  isDictionaryWord: boolean;
  dictionaryWordCount: number; // number of recognized dictionary words in the SLD
  syllables: number;
  pronounceability: number; // 0-1
  category: DomainCategory;
  keywordVolume: number; // monthly searches (mock provider)
  ageYears: number; // registration age (mock provider)
  tldScore: number; // 0-1 desirability of the TLD
  brandability: number; // 0-1 composite
}

export type DomainCategory =
  | "tech"
  | "finance"
  | "health"
  | "crypto"
  | "ecommerce"
  | "ai"
  | "gaming"
  | "generic";

/** Model output. */
export interface Prediction {
  low: number;
  mid: number;
  high: number;
  confidence: number; // 0-100
  monthsToSell: number;
  liquidity: number; // 0-100
  contributions: FeatureContribution[];
}

export interface FeatureContribution {
  label: string;
  /** signed multiplier impact on price, e.g. +0.35 means +35% */
  impact: number;
  detail: string;
}

/** A comparable sale surfaced for transparency. */
export interface Comp {
  domain: string;
  price: number;
  soldAt: string; // ISO date
  similarity: number; // 0-100
}

export interface TrademarkResult {
  risk: boolean;
  level: "none" | "low" | "medium" | "high";
  note: string;
  matchedMark?: string;
}

/** The full appraisal payload returned to callers and cached. */
export interface AppraisalResult {
  domain: string;
  low: number;
  mid: number;
  high: number;
  confidence: number;
  monthsToSell: number;
  liquidity: number;
  features: DomainFeatures;
  contributions: FeatureContribution[];
  comps: Comp[];
  explanation: string;
  trademark: TrademarkResult;
  disclaimer: string;
  cached: boolean;
  generatedAt: string;
}
