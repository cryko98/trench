import { Redis } from "@upstash/redis";

/**
 * Store layer. Uses Upstash Redis when the REST env vars are present,
 * otherwise falls back to an in-memory store so the app runs locally
 * with zero setup. Only the handful of commands the app needs are shimmed.
 */

type ZMember = { member: string; score: number };

interface Store {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, opts?: { ex?: number }): Promise<void>;
  del(key: string): Promise<void>;
  incr(key: string): Promise<number>;
  zadd(key: string, member: string, score: number): Promise<void>;
  zrem(key: string, member: string): Promise<void>;
  zrange(key: string, start: number, stop: number, rev: boolean): Promise<string[]>;
  zcard(key: string): Promise<number>;
  zincrby(key: string, member: string, by: number): Promise<void>;
  sadd(key: string, member: string): Promise<void>;
  srem(key: string, member: string): Promise<void>;
  smembers(key: string): Promise<string[]>;
  scard(key: string): Promise<number>;
  mget<T>(keys: string[]): Promise<(T | null)[]>;
}

class UpstashStore implements Store {
  constructor(private r: Redis) {}
  async get<T>(key: string) {
    return (await this.r.get<T>(key)) ?? null;
  }
  async set(key: string, value: unknown, opts?: { ex?: number }) {
    if (opts?.ex) await this.r.set(key, value, { ex: opts.ex });
    else await this.r.set(key, value);
  }
  async del(key: string) {
    await this.r.del(key);
  }
  async incr(key: string) {
    return await this.r.incr(key);
  }
  async zadd(key: string, member: string, score: number) {
    await this.r.zadd(key, { score, member });
  }
  async zrem(key: string, member: string) {
    await this.r.zrem(key, member);
  }
  async zrange(key: string, start: number, stop: number, rev: boolean) {
    return (await this.r.zrange<string[]>(key, start, stop, rev ? { rev: true } : {})) ?? [];
  }
  async zcard(key: string) {
    return await this.r.zcard(key);
  }
  async zincrby(key: string, member: string, by: number) {
    await this.r.zincrby(key, by, member);
  }
  async sadd(key: string, member: string) {
    await this.r.sadd(key, member);
  }
  async srem(key: string, member: string) {
    await this.r.srem(key, member);
  }
  async smembers(key: string) {
    return (await this.r.smembers(key)) ?? [];
  }
  async scard(key: string) {
    return await this.r.scard(key);
  }
  async mget<T>(keys: string[]) {
    if (keys.length === 0) return [];
    return (await this.r.mget<T[]>(...keys)) ?? keys.map(() => null);
  }
}

type MemEntry = { value: unknown; expires?: number };

class MemoryStore implements Store {
  private kv = new Map<string, MemEntry>();
  private zsets = new Map<string, Map<string, number>>();
  private sets = new Map<string, Set<string>>();

  private alive(key: string) {
    const e = this.kv.get(key);
    if (!e) return null;
    if (e.expires && e.expires < Date.now()) {
      this.kv.delete(key);
      return null;
    }
    return e;
  }
  private z(key: string) {
    let z = this.zsets.get(key);
    if (!z) {
      z = new Map();
      this.zsets.set(key, z);
    }
    return z;
  }
  private s(key: string) {
    let s = this.sets.get(key);
    if (!s) {
      s = new Set();
      this.sets.set(key, s);
    }
    return s;
  }

  async get<T>(key: string) {
    const e = this.alive(key);
    return e ? (e.value as T) : null;
  }
  async set(key: string, value: unknown, opts?: { ex?: number }) {
    this.kv.set(key, { value, expires: opts?.ex ? Date.now() + opts.ex * 1000 : undefined });
  }
  async del(key: string) {
    this.kv.delete(key);
    this.zsets.delete(key);
    this.sets.delete(key);
  }
  async incr(key: string) {
    const cur = Number((this.alive(key)?.value as number) ?? 0) + 1;
    this.kv.set(key, { value: cur });
    return cur;
  }
  async zadd(key: string, member: string, score: number) {
    this.z(key).set(member, score);
  }
  async zrem(key: string, member: string) {
    this.z(key).delete(member);
  }
  async zrange(key: string, start: number, stop: number, rev: boolean) {
    const sorted: ZMember[] = [...this.z(key).entries()]
      .map(([member, score]) => ({ member, score }))
      .sort((a, b) => (rev ? b.score - a.score : a.score - b.score));
    const end = stop < 0 ? sorted.length + stop + 1 : stop + 1;
    return sorted.slice(start, end).map((m) => m.member);
  }
  async zcard(key: string) {
    return this.z(key).size;
  }
  async zincrby(key: string, member: string, by: number) {
    const z = this.z(key);
    z.set(member, (z.get(member) ?? 0) + by);
  }
  async sadd(key: string, member: string) {
    this.s(key).add(member);
  }
  async srem(key: string, member: string) {
    this.s(key).delete(member);
  }
  async smembers(key: string) {
    return [...this.s(key)];
  }
  async scard(key: string) {
    return this.s(key).size;
  }
  async mget<T>(keys: string[]) {
    return keys.map((k) => {
      const e = this.alive(k);
      return e ? (e.value as T) : null;
    });
  }
}

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

export const usingRedis = Boolean(url && token);

// Keep one instance across hot reloads in dev so the memory store survives.
const globalForStore = globalThis as unknown as { __tfStore?: Store };

export const store: Store =
  globalForStore.__tfStore ??
  (globalForStore.__tfStore = usingRedis
    ? new UpstashStore(new Redis({ url: url!, token: token! }))
    : new MemoryStore());

export const K = {
  user: (wallet: string) => `user:${wallet}`,
  handleTaken: (handle: string) => `handle:${handle.toLowerCase()}`,
  nonce: (wallet: string) => `nonce:${wallet}`,
  post: (id: string) => `post:${id}`,
  feed: "feed",
  userPosts: (wallet: string) => `user:${wallet}:posts`,
  likes: (postId: string) => `post:${postId}:likes`,
  comments: (postId: string) => `post:${postId}:comments`,
  comment: (id: string) => `comment:${id}`,
  callIndex: "calls:index",
  callPosts: (ca: string) => `call:${ca}:posts`,
  token: (mint: string) => `token:${mint}`,
};
