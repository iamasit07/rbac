import { Request, Response, NextFunction } from "express";
import { safeGet, safeSet } from "../lib/redis";

const IDEMPOTENCY_TTL = 86400; // 24 hours

export function idempotency(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers["idempotency-key"];

  if (!key || typeof key !== "string") {
    return next();
  }

  const cacheKey = `idempotency:${req.user?.userId ?? "anon"}:${key}`;

  (async () => {
    const cached = await safeGet(cacheKey);
    if (cached) {
      try {
        const { status, body } = JSON.parse(cached);
        res.status(status).json(body);
        return;
      } catch {
      }
    }

    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        safeSet(cacheKey, JSON.stringify({ status: res.statusCode, body }), "EX", IDEMPOTENCY_TTL);
      }
      return originalJson(body);
    };

    next();
  })().catch(next);
}
