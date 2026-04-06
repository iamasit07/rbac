import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { redis } from "../lib/redis";
import { env } from "../config/env";

const bypassLimitersForTests = (req: any, res: any, next: any) => next();

export const globalLimiter = env.NODE_ENV === "test" ? bypassLimitersForTests : rateLimit({
  store: new RedisStore({ sendCommand: (...args: string[]) => redis.call(args[0], ...(args.slice(1) as any)) as any }),
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

export const authLimiter = env.NODE_ENV === "test" ? bypassLimitersForTests : rateLimit({
  store: new RedisStore({ sendCommand: (...args: string[]) => redis.call(args[0], ...(args.slice(1) as any)) as any }),
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts, please try again later." },
});
