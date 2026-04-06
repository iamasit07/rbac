import Redis from "ioredis";
import { env } from "../config/env";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis = globalForRedis.redis ?? new Redis(env.REDIS_URL, { lazyConnect: true });
redis.on("error", (error) => {
  if (env.NODE_ENV !== "test") console.error("[Redis] Network Offline - Safely Degrading to Postgres");
});

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

export async function safeGet(key: string): Promise<string | null> {
  try {
    return await redis.get(key);
  } catch (error) {
    return null;
  }
}

export async function safeSet(key: string, value: string, mode: "EX", time: number): Promise<void> {
  try {
    await redis.set(key, value, mode, time);
  } catch (error) {
    return;
  }
}

export async function safeDel(...keys: string[]): Promise<void> {
  try {
    if (keys.length > 0) await redis.del(...keys);
  } catch (error) {
    return;
  }
}
