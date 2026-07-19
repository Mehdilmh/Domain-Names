/**
 * WHOIS / registration-age provider interface. Mock returns a deterministic
 * plausible age so appraisals are reproducible with zero API keys.
 */
export interface WhoisProvider {
  getAgeYears(domain: string): Promise<number>;
  isRegistered(domain: string): Promise<boolean>;
}

class MockWhoisProvider implements WhoisProvider {
  async getAgeYears(domain: string): Promise<number> {
    let hash = 0;
    for (const ch of domain) hash = (hash * 33 + ch.charCodeAt(0)) >>> 0;
    // 0-22 years, skewed toward younger
    return Math.round(Math.pow((hash % 1000) / 1000, 1.8) * 22);
  }

  async isRegistered(domain: string): Promise<boolean> {
    let hash = 0;
    for (const ch of domain) hash = (hash * 17 + ch.charCodeAt(0)) >>> 0;
    return hash % 100 > 20; // ~80% registered
  }
}

export const whoisProvider: WhoisProvider = new MockWhoisProvider();
