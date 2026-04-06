import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";

const ROLE_LIMITS: Record<Role, number> = {
  ADMIN: 500,
  ANALYST: 200,
  VIEWER: 100,
};

const WINDOW_MS = 15 * 60 * 1000;

interface BucketEntry {
  count: number;
  resetAt: number;
}

// In-memory store keyed by userId
const buckets = new Map<string, BucketEntry>();

// Periodically prune expired entries to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (now >= entry.resetAt) buckets.delete(key);
  }
}, 60_000).unref();

export function roleLimiter(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) return next();

  const { userId, role } = req.user;
  const maxRequests = ROLE_LIMITS[role] ?? ROLE_LIMITS.VIEWER;
  const now = Date.now();

  let bucket = buckets.get(userId);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(userId, bucket);
  }

  bucket.count++;

  const remaining = Math.max(0, maxRequests - bucket.count);
  res.setHeader("X-RateLimit-Limit", maxRequests);
  res.setHeader("X-RateLimit-Remaining", remaining);
  res.setHeader("X-RateLimit-Reset", Math.ceil(bucket.resetAt / 1000));

  if (bucket.count > maxRequests) {
    res.status(429).json({
      error: "Role-based rate limit exceeded. Please try again later.",
    });
    return;
  }

  next();
}
