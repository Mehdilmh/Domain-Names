import { describe, it, expect } from "vitest";
import { extractFeatures } from "@/lib/valuation/features";
import { predict } from "@/lib/valuation/model";

async function priceOf(domain: string) {
  return predict(await extractFeatures(domain));
}

describe("predict", () => {
  it("returns a coherent low <= mid <= high range", async () => {
    const p = await priceOf("cloudpay.com");
    expect(p.low).toBeLessThanOrEqual(p.mid);
    expect(p.mid).toBeLessThanOrEqual(p.high);
    expect(p.low).toBeGreaterThan(0);
  });

  it("bounds confidence, liquidity to 0..100 and months positive", async () => {
    const p = await priceOf("smartchain.io");
    expect(p.confidence).toBeGreaterThanOrEqual(20);
    expect(p.confidence).toBeLessThanOrEqual(96);
    expect(p.liquidity).toBeGreaterThanOrEqual(0);
    expect(p.liquidity).toBeLessThanOrEqual(100);
    expect(p.monthsToSell).toBeGreaterThan(0);
  });

  it("prices short premium .com above long hyphenated names", async () => {
    const premium = await priceOf("fly.com");
    const junk = await priceOf("my-super-long-domain-name-2024.info");
    expect(premium.mid).toBeGreaterThan(junk.mid);
  });

  it("penalizes hyphens and digits", async () => {
    const clean = await priceOf("cloudpay.com");
    const dirty = await priceOf("cloud-pay1.com");
    expect(dirty.mid).toBeLessThan(clean.mid);
  });

  it("rewards premium TLD over obscure TLD for the same name", async () => {
    const com = await priceOf("datavault.com");
    const info = await priceOf("datavault.info");
    expect(com.mid).toBeGreaterThan(info.mid);
  });

  it("exposes feature contributions for transparency", async () => {
    const p = await priceOf("cryptobank.com");
    expect(p.contributions.length).toBeGreaterThan(3);
    expect(p.contributions.some((c) => c.label === "TLD")).toBe(true);
    for (const c of p.contributions) {
      expect(typeof c.impact).toBe("number");
      expect(c.detail).toBeTruthy();
    }
  });

  it("produces higher confidence for a clean .com than a messy name", async () => {
    const clean = await priceOf("brightlabs.com");
    const messy = await priceOf("x7-zq.xyz");
    expect(clean.confidence).toBeGreaterThan(messy.confidence);
  });
});
