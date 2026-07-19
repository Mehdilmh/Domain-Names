import type { DomainCategory, DomainFeatures } from "./types";
import { keywordProvider } from "@/lib/providers/keyword";
import { whoisProvider } from "@/lib/providers/whois";

/**
 * Feature extraction. Pure and deterministic except for the two async
 * provider calls (keyword volume, age) which are mockable.
 */

/** A compact dictionary sufficient for word detection & category hints. */
const DICTIONARY = new Set<string>([
  // generic high-frequency
  "cloud", "data", "smart", "quick", "fast", "prime", "pro", "hub", "lab", "labs",
  "app", "web", "net", "world", "global", "digital", "online", "market", "shop",
  "store", "buy", "sell", "trade", "deal", "deals", "money", "cash", "pay", "bank",
  "fund", "invest", "capital", "wealth", "credit", "loan", "finance", "fintech",
  "health", "care", "med", "medical", "fit", "fitness", "well", "wellness", "life",
  "bio", "gene", "pharma", "dental", "clinic", "therapy", "mind", "brain",
  "crypto", "coin", "token", "chain", "block", "ledger", "wallet", "defi", "stake",
  "mint", "swap", "yield", "vault", "node", "meta", "nft",
  "ai", "ml", "neural", "robot", "auto", "bot", "agent", "vision", "learn", "model",
  "game", "games", "play", "player", "quest", "arena", "pixel", "gamer", "arcade",
  "green", "eco", "solar", "energy", "power", "electric", "clean", "nature",
  "food", "eat", "chef", "kitchen", "recipe", "fresh", "farm", "organic",
  "travel", "trip", "fly", "hotel", "stay", "tour", "voyage", "journey",
  "home", "house", "estate", "realty", "property", "space", "room", "nest",
  "code", "dev", "byte", "bit", "stack", "logic", "sync", "flow", "loop", "core",
  "star", "moon", "sun", "sky", "ocean", "river", "mountain", "forest", "stone",
  "gold", "silver", "iron", "steel", "ruby", "pearl", "diamond", "crystal",
  "swift", "rapid", "sonic", "turbo", "nova", "pulse", "spark", "flux", "wave",
  "north", "south", "east", "west", "central", "metro", "city", "urban",
  "team", "work", "job", "hire", "talent", "skill", "learn", "study", "school",
  "media", "news", "story", "voice", "video", "audio", "music", "sound", "art",
  "blue", "red", "black", "white", "amber", "coral", "jade", "onyx", "opal",
]);

const CATEGORY_KEYWORDS: Record<DomainCategory, string[]> = {
  ai: ["ai", "ml", "neural", "robot", "bot", "agent", "vision", "learn", "model", "gpt"],
  crypto: ["crypto", "coin", "token", "chain", "block", "ledger", "wallet", "defi", "stake", "mint", "swap", "nft", "meta"],
  finance: ["money", "cash", "pay", "bank", "fund", "invest", "capital", "wealth", "credit", "loan", "finance", "fintech"],
  health: ["health", "care", "med", "medical", "fit", "fitness", "well", "wellness", "bio", "pharma", "dental", "clinic", "therapy"],
  tech: ["cloud", "data", "code", "dev", "byte", "stack", "sync", "app", "web", "digital", "smart", "logic", "core"],
  ecommerce: ["shop", "store", "buy", "sell", "trade", "deal", "market", "cart", "retail"],
  gaming: ["game", "games", "play", "player", "quest", "arena", "pixel", "gamer", "arcade"],
  generic: [],
};

const VOWELS = new Set(["a", "e", "i", "o", "u", "y"]);

/** Split domain into second-level label and TLD (handles multi-part TLDs simply). */
export function splitDomain(raw: string): { sld: string; tld: string; domain: string } {
  const domain = raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
  const parts = domain.split(".");
  if (parts.length < 2) {
    return { sld: domain, tld: "com", domain: `${domain}.com` };
  }
  const tld = parts.slice(1).join(".");
  const sld = parts[0];
  return { sld, tld, domain };
}

/** Greedy longest-match segmentation used for dictionary-word detection. */
export function segmentWords(sld: string): string[] {
  const cleaned = sld.replace(/[^a-z]/g, "");
  const words: string[] = [];
  let i = 0;
  while (i < cleaned.length) {
    let matched = false;
    for (let len = Math.min(cleaned.length - i, 12); len >= 2; len--) {
      const candidate = cleaned.slice(i, i + len);
      if (DICTIONARY.has(candidate)) {
        words.push(candidate);
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) i++;
  }
  return words;
}

/** Rough syllable count via vowel-group heuristic. */
export function countSyllables(sld: string): number {
  const s = sld.replace(/[^a-z]/g, "");
  if (!s) return 1;
  let count = 0;
  let prevVowel = false;
  for (const ch of s) {
    const isVowel = VOWELS.has(ch);
    if (isVowel && !prevVowel) count++;
    prevVowel = isVowel;
  }
  if (s.endsWith("e") && count > 1) count--;
  return Math.max(1, count);
}

/**
 * Pronounceability 0-1. Penalizes long consonant runs and unusual
 * vowel ratios; rewards ~40-55% vowel content.
 */
export function pronounceability(sld: string): number {
  const s = sld.replace(/[^a-z]/g, "");
  if (!s) return 0;
  const vowelCount = [...s].filter((c) => VOWELS.has(c)).length;
  const vowelRatio = vowelCount / s.length;

  let maxConsonantRun = 0;
  let run = 0;
  for (const ch of s) {
    if (VOWELS.has(ch)) {
      run = 0;
    } else {
      run++;
      maxConsonantRun = Math.max(maxConsonantRun, run);
    }
  }
  // ideal vowel ratio ~0.45
  const ratioScore = 1 - Math.min(1, Math.abs(vowelRatio - 0.45) / 0.45);
  const runPenalty = Math.min(1, Math.max(0, (maxConsonantRun - 2) * 0.25));
  return Math.max(0, Math.min(1, ratioScore * 0.7 + (1 - runPenalty) * 0.3));
}

/** TLD desirability score, 0-1. */
export function tldScore(tld: string): number {
  const scores: Record<string, number> = {
    com: 1.0, ai: 0.82, io: 0.72, co: 0.62, net: 0.5, org: 0.48,
    app: 0.55, dev: 0.5, xyz: 0.35, tech: 0.4, info: 0.28, biz: 0.25,
    me: 0.42, tv: 0.45, gg: 0.5, finance: 0.35, health: 0.35, store: 0.4,
  };
  return scores[tld] ?? 0.3;
}

export function classifyCategory(words: string[], sld: string): DomainCategory {
  const scores: Partial<Record<DomainCategory, number>> = {};
  const haystack = words.length ? words : [sld];
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS) as [DomainCategory, string[]][]) {
    if (cat === "generic") continue;
    for (const kw of kws) {
      if (haystack.some((w) => w.includes(kw)) || sld.includes(kw)) {
        scores[cat] = (scores[cat] ?? 0) + 1;
      }
    }
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return (best?.[0] as DomainCategory) ?? "generic";
}

/** Composite brandability 0-1. */
export function brandability(opts: {
  length: number;
  pronounceability: number;
  hasHyphen: boolean;
  hasNumbers: boolean;
  isDictionaryWord: boolean;
  syllables: number;
}): number {
  let score = 0.5;
  // shorter is better, sweet spot 4-8 chars
  if (opts.length <= 8) score += 0.2;
  else if (opts.length <= 12) score += 0.05;
  else score -= 0.15;
  score += (opts.pronounceability - 0.5) * 0.3;
  if (opts.hasHyphen) score -= 0.2;
  if (opts.hasNumbers) score -= 0.15;
  if (opts.isDictionaryWord) score += 0.12;
  if (opts.syllables <= 3) score += 0.08;
  else if (opts.syllables >= 5) score -= 0.1;
  return Math.max(0, Math.min(1, score));
}

/** Full async feature extraction. */
export async function extractFeatures(rawDomain: string): Promise<DomainFeatures> {
  const { sld, tld, domain } = splitDomain(rawDomain);
  const length = sld.replace(/[^a-z0-9-]/g, "").length;
  const hyphens = (sld.match(/-/g) ?? []).length;
  const digits = (sld.match(/[0-9]/g) ?? []).length;
  const words = segmentWords(sld);
  const isDictionaryWord = words.length > 0 && words.join("").length >= sld.replace(/[^a-z]/g, "").length * 0.7;
  const syllables = countSyllables(sld);
  const pron = pronounceability(sld);
  const category = classifyCategory(words, sld);

  const [keywordVolume, ageYears] = await Promise.all([
    keywordProvider.getVolume(sld, words),
    whoisProvider.getAgeYears(domain),
  ]);

  const brand = brandability({
    length,
    pronounceability: pron,
    hasHyphen: hyphens > 0,
    hasNumbers: digits > 0,
    isDictionaryWord,
    syllables,
  });

  return {
    domain,
    sld,
    tld,
    length,
    hyphens,
    digits,
    hasNumbers: digits > 0,
    hasHyphen: hyphens > 0,
    isDictionaryWord,
    dictionaryWordCount: words.length,
    syllables,
    pronounceability: pron,
    category,
    keywordVolume,
    ageYears,
    tldScore: tldScore(tld),
    brandability: brand,
  };
}

/**
 * Numeric vector used by comps.ts cosine similarity. Deterministic and
 * normalized to comparable scales. Kept in sync with the seed generator.
 */
export function toVector(f: DomainFeatures): number[] {
  return [
    Math.min(1, f.length / 20),
    f.hasHyphen ? 1 : 0,
    Math.min(1, f.digits / 5),
    f.isDictionaryWord ? 1 : 0,
    Math.min(1, f.syllables / 6),
    f.pronounceability,
    f.tldScore,
    Math.min(1, Math.log10(f.keywordVolume + 1) / 6),
    Math.min(1, f.ageYears / 20),
    f.brandability,
    categoryToScalar(f.category),
  ];
}

export function categoryToScalar(cat: DomainCategory): number {
  const order: DomainCategory[] = [
    "generic", "ecommerce", "gaming", "health", "tech", "finance", "crypto", "ai",
  ];
  const idx = order.indexOf(cat);
  return idx < 0 ? 0 : idx / (order.length - 1);
}
