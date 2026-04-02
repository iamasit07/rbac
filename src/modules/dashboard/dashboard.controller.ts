import { Request, Response, NextFunction } from "express";
import * as dashboardService from "./dashboard.service";

export async function getSummary(_req: Request, res: Response, next: NextFunction) {
  try {
    const summary = await dashboardService.getSummary();
    res.status(200).json(summary);
  } catch (error) {
    next(error);
  }
}

export async function getByCategory(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await dashboardService.getByCategory();
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
}

export async function getTrends(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await dashboardService.getTrends();
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
}

export async function getRecent(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await dashboardService.getRecent();
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
}
