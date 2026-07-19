/**
 * Keyword volume provider interface. Swap the mock for a real provider
 * (Google Keyword Planner, Ahrefs, etc.) by implementing this interface
 * and wiring it in — the valuation engine depends only on the interface.
 */
export interface KeywordVolumeProvider {
  getVolume(sld: string, words: string[]): Promise<number>;
}

/** Deterministic mock: hashes the label into a plausible power-law volume. */
class MockKeywordProvider implements KeywordVolumeProvider {
  async getVolume(sld: string, words: string[]): Promise<number> {
    let hash = 0;
    for (const ch of sld) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    // dictionary words carry demand; coined terms carry little
    const wordBoost = words.length > 0 ? 1 : 0.08;
    const base = (hash % 10000) / 10000; // 0-1
    // power-law: most low, a few very high
    const volume = Math.round(Math.pow(base, 3) * 240000 * wordBoost + (hash % 90));
    return volume;
  }
}

export const keywordProvider: KeywordVolumeProvider =
  process.env.KEYWORD_PROVIDER === "real"
    ? new MockKeywordProvider() // TODO: real provider once API key wired
    : new MockKeywordProvider();
