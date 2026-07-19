import { createHash } from "node:crypto";
import { prisma } from "./db";
import { kv } from "./redis";
import { APPRAISAL_CACHE_DAYS } from "@/config/app";
import type { AppraisalResult } from "./valuation/types";

/** Normalize + hash a domain for content-addressed caching. */
export function domainKey(domain: string): string {
  const normalized = domain.trim().toLowerCase().replace(/^www\./, "");
  return createHash("sha256").update(normalized).digest("hex");
}

/** In-process registry of in-flight appraisals for request de-duplication. */
const inFlight = new Map<string, Promise<AppraisalResult>>();

/**
 * De-duplicate identical concurrent appraisals: the first caller runs the
 * work, everyone else awaits the same promise.
 */
export function dedupe(
  key: string,
  work: () => Promise<AppraisalResult>,
): Promise<AppraisalResult> {
  const existing = inFlight.get(key);
  if (existing) return existing;
  const p = work().finally(() => inFlight.delete(key));
  inFlight.set(key, p);
  return p;
}

/** Read a cached appraisal (KV first for speed, then durable DB). */
export async function getCachedAppraisal(domain: string): Promise<AppraisalResult | null> {
  const key = domainKey(domain);

  const fromKv = await kv.get(`appraisal:${key}`);
  if (fromKv) {
    try {
      return { ...(JSON.parse(fromKv) as AppraisalResult), cached: true };
    } catch {
      /* fall through */
    }
  }

  const row = await prisma.appraisalCache.findUnique({ where: { domainKey: key } });
  if (row && row.expiresAt > new Date()) {
    const result = row.payload as unknown as AppraisalResult;
    // warm the KV layer
    await kv.set(`appraisal:${key}`, JSON.stringify(result), ttlSeconds());
    return { ...result, cached: true };
  }
  return null;
}

/** Persist an appraisal to both cache layers for 30 days. */
export async function setCachedAppraisal(result: AppraisalResult): Promise<void> {
  const key = domainKey(result.domain);
  const expiresAt = new Date(Date.now() + APPRAISAL_CACHE_DAYS * 86400 * 1000);

  await kv.set(`appraisal:${key}`, JSON.stringify(result), ttlSeconds());
  await prisma.appraisalCache.upsert({
    where: { domainKey: key },
    create: { domainKey: key, domain: result.domain, payload: result as object, expiresAt },
    update: { payload: result as object, expiresAt },
  });
}

function ttlSeconds(): number {
  return APPRAISAL_CACHE_DAYS * 86400;
}
