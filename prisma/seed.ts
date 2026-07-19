import { PrismaClient } from "@prisma/client";
import { extractFeatures, toVector } from "../src/lib/valuation/features";
import { predict } from "../src/lib/valuation/model";
import { ADMIN_EMAILS } from "../src/config/app";

const prisma = new PrismaClient();

/**
 * Generates ~3,000 realistic historical domain sales:
 *  - varied TLDs (weighted toward .com)
 *  - log-normal / power-law price distribution (NOT uniform)
 *  - sale dates spanning the last 4 years
 *  - a cached feature vector per row for fast cosine comps
 */

const SEED = 1337;
let _s = SEED;
/** Deterministic PRNG (mulberry32) so seeds are reproducible. */
function rand(): number {
  _s |= 0;
  _s = (_s + 0x6d2b79f5) | 0;
  let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}
/** Standard normal via Box-Muller. */
function gaussian(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const PREFIXES = [
  "cloud", "smart", "quick", "prime", "meta", "hyper", "nova", "swift", "true", "next",
  "open", "core", "flux", "pulse", "spark", "bright", "clear", "bold", "pure", "vivid",
  "get", "try", "go", "my", "the", "we", "on", "up", "in", "co",
];
const ROOTS = [
  "cloud", "data", "pay", "bank", "coin", "chain", "health", "care", "game", "play",
  "shop", "store", "code", "dev", "ai", "bot", "mind", "brain", "fit", "flow",
  "market", "trade", "fund", "invest", "learn", "teach", "media", "news", "space", "labs",
  "logic", "vault", "stack", "grid", "node", "byte", "pixel", "vision", "sense", "sync",
];
const SUFFIXES = [
  "ly", "ify", "io", "hub", "base", "kit", "box", "lab", "labs", "app",
  "hq", "zone", "spot", "works", "flow", "wave", "ers", "ory", "ex", "ora",
];
const TLD_WEIGHTS: { tld: string; w: number }[] = [
  { tld: "com", w: 55 },
  { tld: "io", w: 10 },
  { tld: "ai", w: 8 },
  { tld: "co", w: 7 },
  { tld: "net", w: 6 },
  { tld: "org", w: 4 },
  { tld: "app", w: 3 },
  { tld: "dev", w: 2 },
  { tld: "xyz", w: 3 },
  { tld: "me", w: 2 },
];

function weightedTld(): string {
  const total = TLD_WEIGHTS.reduce((s, t) => s + t.w, 0);
  let r = rand() * total;
  for (const t of TLD_WEIGHTS) {
    if (r < t.w) return t.tld;
    r -= t.w;
  }
  return "com";
}

function makeSld(): string {
  const style = rand();
  if (style < 0.35) return pick(PREFIXES) + pick(ROOTS);
  if (style < 0.6) return pick(ROOTS) + pick(SUFFIXES);
  if (style < 0.78) return pick(ROOTS);
  if (style < 0.9) return pick(PREFIXES) + pick(ROOTS) + pick(SUFFIXES);
  // short brandable coined names
  const vowels = "aeiou";
  const cons = "bcdfghklmnprstvz";
  let s = "";
  const len = 4 + Math.floor(rand() * 3);
  for (let i = 0; i < len; i++) s += i % 2 === 0 ? pick(cons.split("")) : pick(vowels.split(""));
  return s;
}

async function main() {
  console.log("🌱 Seeding DomainPulse sales data…");
  await prisma.sale.deleteMany();

  const TARGET = 3000;
  const now = Date.now();
  const fourYearsMs = 4 * 365 * 86400 * 1000;
  const rows: {
    domain: string;
    sld: string;
    tld: string;
    price: number;
    soldAt: Date;
    featureVec: number[];
    source: string;
  }[] = [];

  const seen = new Set<string>();
  let attempts = 0;
  while (rows.length < TARGET && attempts < TARGET * 5) {
    attempts++;
    const sld = makeSld();
    const tld = weightedTld();
    const domain = `${sld}.${tld}`;
    if (seen.has(domain)) continue;
    seen.add(domain);

    const features = await extractFeatures(domain);
    const prediction = predict(features);

    // Anchor price on the model mid, then apply log-normal market noise so
    // realized sales scatter around fair value with a heavy right tail.
    const logNoise = gaussian() * 0.55; // ~±55% in ln space
    const price = Math.max(
      50,
      Math.round(prediction.mid * Math.exp(logNoise)),
    );

    // sale date over the last 4 years, mildly more recent-weighted
    const t = Math.pow(rand(), 0.8);
    const soldAt = new Date(now - t * fourYearsMs);

    rows.push({
      domain,
      sld,
      tld,
      price,
      soldAt,
      featureVec: toVector(features),
      source: "seed",
    });
  }

  // batch insert
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    await prisma.sale.createMany({ data: rows.slice(i, i + BATCH) });
    console.log(`  inserted ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }

  // Ensure a ready-to-use admin account (unlimited credits) for each allowlisted email.
  for (const email of ADMIN_EMAILS) {
    await prisma.user.upsert({
      where: { email },
      create: { email, name: "Admin", role: "admin", credits: 1_000_000, tier: "agency" },
      update: { role: "admin", credits: 1_000_000, tier: "agency" },
    });
    console.log(`👑 Admin account ready: ${email}`);
  }

  const prices = rows.map((r) => r.price).sort((a, b) => a - b);
  const median = prices[Math.floor(prices.length / 2)];
  const max = prices[prices.length - 1];
  const min = prices[0];
  console.log(
    `✅ Seeded ${rows.length} sales. price min $${min} / median $${median} / max $${max.toLocaleString()}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
