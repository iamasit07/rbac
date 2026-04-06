import { Request, Response } from "express";
import * as dashboardService from "./dashboard.service";
import { safeGet, safeSet } from "../../lib/redis";
import { catchAsync } from "../../utils/catchAsync";

export const getSummary = catchAsync(async (req: Request, res: Response) => {
  const cacheKey = `dashboard:${req.user!.userId}:summary`;
  const cached = await safeGet(cacheKey);
  if (cached) {
    try {
      return res.status(200).json(JSON.parse(cached));
    } catch { /* bypass corrupted cache */ }
  }

  const summary = await dashboardService.getSummary(req.user!.userId, req.user!.role);
  await safeSet(cacheKey, JSON.stringify(summary), "EX", 300);
  res.status(200).json(summary);
});

export const getByCategory = catchAsync(async (req: Request, res: Response) => {
  const cacheKey = `dashboard:${req.user!.userId}:by-category`;
  const cached = await safeGet(cacheKey);
  if (cached) {
    try {
      return res.status(200).json(JSON.parse(cached));
    } catch { /* bypass */ }
  }

  const data = await dashboardService.getByCategory(req.user!.userId, req.user!.role);
  await safeSet(cacheKey, JSON.stringify(data), "EX", 300);
  res.status(200).json(data);
});

export const getTrends = catchAsync(async (req: Request, res: Response) => {
  const cacheKey = `dashboard:${req.user!.userId}:trends`;
  const cached = await safeGet(cacheKey);
  if (cached) {
    try {
      return res.status(200).json(JSON.parse(cached));
    } catch { /* bypass */ }
  }

  const data = await dashboardService.getTrends(req.user!.userId, req.user!.role);
  await safeSet(cacheKey, JSON.stringify(data), "EX", 300);
  res.status(200).json(data);
});

export const getRecent = catchAsync(async (req: Request, res: Response) => {
  const cacheKey = `dashboard:${req.user!.userId}:recent`;
  const cached = await safeGet(cacheKey);
  if (cached) {
    try {
      return res.status(200).json(JSON.parse(cached));
    } catch { /* bypass */ }
  }

  const data = await dashboardService.getRecent(req.user!.userId, req.user!.role);
  await safeSet(cacheKey, JSON.stringify(data), "EX", 60);
  res.status(200).json(data);
});
