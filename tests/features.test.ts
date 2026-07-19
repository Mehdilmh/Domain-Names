import { describe, it, expect } from "vitest";
import {
  splitDomain,
  segmentWords,
  countSyllables,
  pronounceability,
  tldScore,
  classifyCategory,
  extractFeatures,
  toVector,
} from "@/lib/valuation/features";

describe("splitDomain", () => {
  it("splits sld and tld", () => {
    expect(splitDomain("cloudmind.io")).toEqual({
      sld: "cloudmind",
      tld: "io",
      domain: "cloudmind.io",
    });
  });
  it("strips protocol, www and paths", () => {
    expect(splitDomain("https://www.Example.com/path").domain).toBe("example.com");
  });
  it("defaults bare labels to .com", () => {
    expect(splitDomain("openai").tld).toBe("com");
  });
});

describe("segmentWords", () => {
  it("finds dictionary words via greedy longest match", () => {
    expect(segmentWords("cloudmind")).toEqual(["cloud", "mind"]);
  });
  it("returns empty for coined names", () => {
    expect(segmentWords("zxqwbk")).toEqual([]);
  });
});

describe("countSyllables", () => {
  it("counts vowel groups", () => {
    expect(countSyllables("cloud")).toBe(1);
    expect(countSyllables("banana")).toBe(3);
  });
});

describe("pronounceability", () => {
  it("rates balanced names higher than consonant clusters", () => {
    expect(pronounceability("banana")).toBeGreaterThan(pronounceability("bcdfgh"));
  });
  it("stays within 0..1", () => {
    for (const s of ["a", "xyz", "hello", "strengths"]) {
      const p = pronounceability(s);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });
});

describe("tldScore", () => {
  it("ranks .com highest", () => {
    expect(tldScore("com")).toBeGreaterThan(tldScore("io"));
    expect(tldScore("io")).toBeGreaterThan(tldScore("info"));
  });
});

describe("classifyCategory", () => {
  it("detects ai and crypto", () => {
    expect(classifyCategory(["neural", "bot"], "neuralbot")).toBe("ai");
    expect(classifyCategory(["coin"], "coinvault")).toBe("crypto");
  });
});

describe("extractFeatures", () => {
  it("produces a stable, well-formed feature object", async () => {
    const f = await extractFeatures("cloudmind.io");
    expect(f.sld).toBe("cloudmind");
    expect(f.tld).toBe("io");
    expect(f.isDictionaryWord).toBe(true);
    expect(f.length).toBe(9);
    expect(f.keywordVolume).toBeGreaterThanOrEqual(0);
    expect(f.pronounceability).toBeGreaterThan(0);
  });
  it("is deterministic", async () => {
    const a = await extractFeatures("swiftpay.com");
    const b = await extractFeatures("swiftpay.com");
    expect(toVector(a)).toEqual(toVector(b));
  });
  it("flags hyphens and digits", async () => {
    const f = await extractFeatures("my-shop123.net");
    expect(f.hasHyphen).toBe(true);
    expect(f.hasNumbers).toBe(true);
    expect(f.digits).toBe(3);
  });
});

describe("toVector", () => {
  it("returns a fixed-length normalized vector", async () => {
    const f = await extractFeatures("example.com");
    const v = toVector(f);
    expect(v).toHaveLength(11);
    for (const x of v) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
    }
  });
});
