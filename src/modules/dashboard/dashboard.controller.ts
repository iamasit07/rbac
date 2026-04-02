import { Request, Response, NextFunction } from "express";
import * as dashboardService from "./dashboard.service";

export async function getSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const summary = await dashboardService.getSummary(req.user!.userId, req.user!.role);
    res.status(200).json(summary);
  } catch (error) {
    next(error);
  }
}

export async function getByCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await dashboardService.getByCategory(req.user!.userId, req.user!.role);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
}

export async function getTrends(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await dashboardService.getTrends(req.user!.userId, req.user!.role);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
}

export async function getRecent(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await dashboardService.getRecent(req.user!.userId, req.user!.role);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
}
