/**
 * DomainPulse — central product configuration.
 *
 * Rename the entire product by changing APP_NAME. It flows through the UI,
 * metadata, emails, and OpenAPI docs.
 */
export const APP_NAME = "DomainPulse";
export const APP_TAGLINE = "AI-powered domain valuation";
export const APP_DESCRIPTION =
  "Estimate any domain's Buy-It-Now price range, confidence, and time-to-sell — backed by transparent comparable sales.";

/** The disclaimer shown on EVERY appraisal response. Non-negotiable. */
export const APPRAISAL_DISCLAIMER =
  "Estimates are algorithmic opinions for informational purposes only, not financial advice, an offer, or a guarantee of sale value.";

/** How long appraisals stay cached. */
export const APPRAISAL_CACHE_DAYS = 30;

/** Credit cost per unit of work. */
export const CREDIT_COST = {
  singleAppraisal: 1,
  bulkAppraisalPerRow: 1,
  apiAppraisal: 1,
} as const;

/** Bulk upload ceiling. */
export const BULK_MAX_ROWS = 5000;

/** Subscription tiers. */
export const TIERS = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    monthlyCredits: 25,
    features: ["25 appraisals / month", "Portfolio up to 10 domains", "Comps transparency"],
    stripePriceId: null,
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 29,
    monthlyCredits: 1000,
    features: [
      "1,000 appraisals / month",
      "Unlimited portfolio",
      "Bulk CSV up to 5,000 rows",
      "Renewal alerts",
      "Public API access",
    ],
    stripePriceId: "price_pro_monthly",
  },
  {
    id: "agency",
    name: "Agency",
    priceMonthly: 99,
    monthlyCredits: 5000,
    features: [
      "5,000 appraisals / month",
      "Everything in Pro",
      "Higher API rate limits",
      "Priority bulk jobs",
    ],
    stripePriceId: "price_agency_monthly",
  },
] as const;

/** One-time credit packs. */
export const CREDIT_PACKS = [
  { id: "pack_100", credits: 100, priceUsd: 9, stripePriceId: "price_pack_100" },
  { id: "pack_500", credits: 500, priceUsd: 39, stripePriceId: "price_pack_500" },
  { id: "pack_2000", credits: 2000, priceUsd: 129, stripePriceId: "price_pack_2000" },
] as const;

/** Per-API-key rate limits (requests per window). */
export const API_RATE_LIMIT = {
  windowSeconds: 60,
  free: 10,
  pro: 60,
  agency: 240,
} as const;

/** Renewal alert threshold. */
export const RENEWAL_ALERT_DAYS = 30;
