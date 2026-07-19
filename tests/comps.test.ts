import { describe, it, expect } from "vitest";
import { cosineSimilarity, rankComps } from "@/lib/valuation/comps";
import { extractFeatures, toVector } from "@/lib/valuation/features";

describe("cosineSimilarity", () => {
  it("is 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 5);
  });
  it("is 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);
  });
  it("handles zero vectors without NaN", () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});

describe("rankComps", () => {
  it("ranks the most similar candidate first", async () => {
    const target = await extractFeatures("cloudpay.com");
    const near = await extractFeatures("cloudbank.com");
    const far = await extractFeatures("x-9q-longname.info");

    const comps = rankComps(target, [
      { domain: "x-9q-longname.info", price: 200, soldAt: "2023-01-01", vector: toVector(far) },
      { domain: "cloudbank.com", price: 8000, soldAt: "2024-01-01", vector: toVector(near) },
    ]);

    expect(comps[0].domain).toBe("cloudbank.com");
    expect(comps[0].similarity).toBeGreaterThan(comps[1].similarity);
  });

  it("caps output to the requested limit and reports 0-100 similarity", async () => {
    const target = await extractFeatures("cloudpay.com");
    const candidates = await Promise.all(
      ["a.com", "b.com", "c.com", "d.com"].map(async (d) => ({
        domain: d,
        price: 100,
        soldAt: "2024-01-01",
        vector: toVector(await extractFeatures(d)),
      })),
    );
    const comps = rankComps(target, candidates, 2);
    expect(comps).toHaveLength(2);
    for (const c of comps) {
      expect(c.similarity).toBeGreaterThanOrEqual(0);
      expect(c.similarity).toBeLessThanOrEqual(100);
    }
  });
});
