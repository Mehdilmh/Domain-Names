import type { Comp, DomainFeatures } from "./types";
import { toVector } from "./features";
import { prisma } from "@/lib/db";

/** Cosine similarity between two equal-length vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

interface CompCandidate {
  domain: string;
  price: number;
  soldAt: Date;
  featureVec: unknown;
  tld: string;
  category?: string;
}

/**
 * Rank seeded sales by cosine similarity to the target feature vector.
 * Pulls a candidate window (same TLD + a broader net) to keep it fast on
 * large tables, then scores in memory.
 */
export async function findComps(
  features: DomainFeatures,
  limit = 8,
): Promise<Comp[]> {
  const target = toVector(features);

  // Candidate window: prioritize same TLD, backfill with recent sales.
  const sameTld = await prisma.sale.findMany({
    where: { tld: features.tld },
    orderBy: { soldAt: "desc" },
    take: 400,
    select: { domain: true, price: true, soldAt: true, featureVec: true, tld: true },
  });

  let candidates: CompCandidate[] = sameTld;
  if (candidates.length < 150) {
    const backfill = await prisma.sale.findMany({
      orderBy: { soldAt: "desc" },
      take: 400,
      select: { domain: true, price: true, soldAt: true, featureVec: true, tld: true },
    });
    const seen = new Set(candidates.map((c) => c.domain));
    candidates = candidates.concat(backfill.filter((c) => !seen.has(c.domain)));
  }

  const scored = candidates
    .map((c) => {
      const vec = Array.isArray(c.featureVec) ? (c.featureVec as number[]) : [];
      if (vec.length !== target.length) return null;
      const sim = cosineSimilarity(target, vec);
      return {
        domain: c.domain,
        price: c.price,
        soldAt: c.soldAt.toISOString(),
        similarity: Math.round(sim * 1000) / 10, // 0-100, one decimal
      } satisfies Comp;
    })
    .filter((x): x is Comp => x !== null)
    .sort((a, b) => b.similarity - a.similarity);

  // Dedupe by domain, take top N (min 5 for transparency when available).
  const out: Comp[] = [];
  const seen = new Set<string>();
  for (const s of scored) {
    if (seen.has(s.domain)) continue;
    seen.add(s.domain);
    out.push(s);
    if (out.length >= Math.max(limit, 5)) break;
  }
  return out;
}

/**
 * In-memory comps for tests / offline use — same ranking logic against a
 * provided candidate list, no database.
 */
export function rankComps(
  features: DomainFeatures,
  candidates: { domain: string; price: number; soldAt: string; vector: number[] }[],
  limit = 8,
): Comp[] {
  const target = toVector(features);
  return candidates
    .map((c) => ({
      domain: c.domain,
      price: c.price,
      soldAt: c.soldAt,
      similarity: Math.round(cosineSimilarity(target, c.vector) * 1000) / 10,
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}
