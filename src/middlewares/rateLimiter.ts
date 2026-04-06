import rateLimit, { MemoryStore } from "express-rate-limit";
import { NextFunction, Request, Response } from "express";
import RedisStore from "rate-limit-redis";
import { redis } from "../lib/redis";
import { env } from "../config/env";

const skipLimiting = env.NODE_ENV === "test" || env.NODE_ENV === "development";
const bypassLimiter = (req: Request, res: Response, next: NextFunction) => next();

let redisHealthy = true;

function createResilientStore() {
  if (!redisHealthy) return new MemoryStore();

  try {
    return new RedisStore({
      sendCommand: async (...args: string[]) => {
        try {
          return await redis.call(args[0], ...(args.slice(1) as any)) as any;
        } catch (err) {
          if (redisHealthy) {
            redisHealthy = false;
            console.warn("[RateLimiter] Redis unreachable — falling back to in-memory store");
          }
          throw err;
        }
      },
    });
  } catch {
    redisHealthy = false;
    return new MemoryStore();
  }
}

export const globalLimiter = skipLimiting ? bypassLimiter : rateLimit({
  store: createResilientStore(),
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
  passOnStoreError: true, // Fail-open only for store errors, limits still enforced via MemoryStore
});

export const authLimiter = skipLimiting ? bypassLimiter : rateLimit({
  store: createResilientStore(),
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts, please try again later." },
  passOnStoreError: true,
});
