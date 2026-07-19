import IORedis from "ioredis";

/**
 * Redis with an in-memory fallback. If REDIS_URL is unset, everything
 * degrades to an in-process Map so the app runs with zero infra.
 */
export interface KvStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  incrWithExpiry(key: string, ttlSeconds: number): Promise<number>;
}

class RedisStore implements KvStore {
  constructor(private client: IORedis) {}
  async get(key: string) {
    return this.client.get(key);
  }
  async set(key: string, value: string, ttlSeconds?: number) {
    if (ttlSeconds) await this.client.set(key, value, "EX", ttlSeconds);
    else await this.client.set(key, value);
  }
  async del(key: string) {
    await this.client.del(key);
  }
  async incrWithExpiry(key: string, ttlSeconds: number) {
    const count = await this.client.incr(key);
    if (count === 1) await this.client.expire(key, ttlSeconds);
    return count;
  }
}

class MemoryStore implements KvStore {
  private map = new Map<string, { value: string; expiresAt: number | null }>();
  private counters = new Map<string, { count: number; expiresAt: number }>();

  async get(key: string) {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.map.delete(key);
      return null;
    }
    return entry.value;
  }
  async set(key: string, value: string, ttlSeconds?: number) {
    this.map.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
  }
  async del(key: string) {
    this.map.delete(key);
  }
  async incrWithExpiry(key: string, ttlSeconds: number) {
    const now = Date.now();
    const entry = this.counters.get(key);
    if (!entry || entry.expiresAt < now) {
      this.counters.set(key, { count: 1, expiresAt: now + ttlSeconds * 1000 });
      return 1;
    }
    entry.count += 1;
    return entry.count;
  }
}

let _redis: IORedis | null = null;
export function getRedisClient(): IORedis | null {
  if (!process.env.REDIS_URL) return null;
  if (!_redis) {
    _redis = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
  }
  return _redis;
}

const client = getRedisClient();
export const kv: KvStore = client ? new RedisStore(client) : new MemoryStore();
export const usingRedis = Boolean(client);
