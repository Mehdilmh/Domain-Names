import type { TrademarkResult } from "@/lib/valuation/types";

/**
 * Trademark risk provider. Clean interface over a real source (USPTO TESS,
 * EUIPO, etc.); ships with a mock dataset so the flag works offline.
 *
 * NOTE: informational only — not legal advice.
 */
export interface TrademarkProvider {
  check(domain: string): Promise<TrademarkResult>;
}

/** A small mock registry of well-known marks. */
const MOCK_MARKS: { mark: string; level: "high" | "medium" }[] = [
  { mark: "google", level: "high" },
  { mark: "apple", level: "high" },
  { mark: "amazon", level: "high" },
  { mark: "meta", level: "high" },
  { mark: "facebook", level: "high" },
  { mark: "microsoft", level: "high" },
  { mark: "netflix", level: "high" },
  { mark: "tesla", level: "high" },
  { mark: "nike", level: "high" },
  { mark: "coca", level: "high" },
  { mark: "disney", level: "high" },
  { mark: "spotify", level: "medium" },
  { mark: "uber", level: "medium" },
  { mark: "airbnb", level: "medium" },
  { mark: "stripe", level: "medium" },
  { mark: "openai", level: "high" },
  { mark: "anthropic", level: "high" },
  { mark: "nvidia", level: "high" },
];

class MockTrademarkProvider implements TrademarkProvider {
  async check(domain: string): Promise<TrademarkResult> {
    const sld = domain.toLowerCase().split(".")[0];
    for (const { mark, level } of MOCK_MARKS) {
      if (sld.includes(mark)) {
        return {
          risk: true,
          level,
          matchedMark: mark,
          note:
            level === "high"
              ? `Contains "${mark}", a well-known registered mark. High risk of a trademark dispute — seek legal review before purchase.`
              : `Contains "${mark}", which resembles a known mark. Possible trademark exposure; verify before purchase.`,
        };
      }
    }
    return {
      risk: false,
      level: "none",
      note: "No obvious trademark conflicts found in the checked registry. This is not a comprehensive legal clearance.",
    };
  }
}

const provider: TrademarkProvider = new MockTrademarkProvider();

/** Public convenience wrapper with the clean interface the spec asks for. */
export async function checkTrademark(domain: string): Promise<TrademarkResult> {
  return provider.check(domain);
}
