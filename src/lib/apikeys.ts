import { createHash, randomBytes } from "node:crypto";
import { prisma } from "./db";

/** Hash a full API key for storage/lookup (never store the raw key). */
export function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Mint a new API key. Returns the raw key exactly once — only its hash and a
 * short visible prefix are persisted.
 */
export async function createApiKey(userId: string, name: string, tier: string) {
  const secret = randomBytes(24).toString("base64url");
  const raw = `dp_live_${secret}`;
  const prefix = raw.slice(0, 12);
  const key = await prisma.apiKey.create({
    data: { userId, name, tier, prefix, hashedKey: hashKey(raw) },
  });
  return { raw, prefix, id: key.id };
}

/** Resolve an API key from an Authorization header value. */
export async function resolveApiKey(rawKey: string) {
  const key = await prisma.apiKey.findUnique({
    where: { hashedKey: hashKey(rawKey) },
    include: { user: true },
  });
  if (!key || key.revokedAt) return null;
  // fire-and-forget last-used update
  prisma.apiKey
    .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});
  return key;
}
