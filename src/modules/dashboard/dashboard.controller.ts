import { Request, Response, NextFunction } from "express";
import * as dashboardService from "./dashboard.service";
import { redis } from "../../lib/redis";

export async function getSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const cacheKey = `dashboard:${req.user!.userId}:summary`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.status(200).json(JSON.parse(cached));

    const summary = await dashboardService.getSummary(req.user!.userId, req.user!.role);
    await redis.set(cacheKey, JSON.stringify(summary), "EX", 300);
    res.status(200).json(summary);
  } catch (error) {
    next(error);
  }
}

export async function getByCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const cacheKey = `dashboard:${req.user!.userId}:by-category`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.status(200).json(JSON.parse(cached));

    const data = await dashboardService.getByCategory(req.user!.userId, req.user!.role);
    await redis.set(cacheKey, JSON.stringify(data), "EX", 300);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
}

export async function getTrends(req: Request, res: Response, next: NextFunction) {
  try {
    const cacheKey = `dashboard:${req.user!.userId}:trends`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.status(200).json(JSON.parse(cached));

    const data = await dashboardService.getTrends(req.user!.userId, req.user!.role);
    await redis.set(cacheKey, JSON.stringify(data), "EX", 300);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
}

export async function getRecent(req: Request, res: Response, next: NextFunction) {
  try {
    const cacheKey = `dashboard:${req.user!.userId}:recent`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.status(200).json(JSON.parse(cached));

    const data = await dashboardService.getRecent(req.user!.userId, req.user!.role);
    await redis.set(cacheKey, JSON.stringify(data), "EX", 60); // 1-minute decay for recent records
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
}
