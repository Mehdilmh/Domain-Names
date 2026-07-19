import { kv } from "./redis";
import { API_RATE_LIMIT } from "@/config/app";

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

/**
 * Fixed-window rate limiter backed by the KV store (Redis or in-memory).
 * Keyed by an identifier (API key id or IP) within a time window.
 */
export async function rateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number = API_RATE_LIMIT.windowSeconds,
): Promise<RateLimitResult> {
  const window = Math.floor(Date.now() / 1000 / windowSeconds);
  const key = `ratelimit:${identifier}:${window}`;
  const count = await kv.incrWithExpiry(key, windowSeconds);
  const remaining = Math.max(0, limit - count);
  return {
    ok: count <= limit,
    limit,
    remaining,
    resetSeconds: windowSeconds - (Math.floor(Date.now() / 1000) % windowSeconds),
  };
}

/** Resolve the per-window request limit for a tier. */
export function limitForTier(tier: string): number {
  if (tier === "agency") return API_RATE_LIMIT.agency;
  if (tier === "pro") return API_RATE_LIMIT.pro;
  return API_RATE_LIMIT.free;
}
