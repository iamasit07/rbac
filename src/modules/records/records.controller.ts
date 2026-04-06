import { Request, Response, NextFunction } from "express";
import * as recordsService from "./records.service";
import type { CreateRecordInput, UpdateRecordInput, ListRecordsQuery } from "./records.schema";
import { redis } from "../../lib/redis";

export async function createRecord(req: Request, res: Response, next: NextFunction) {
  try {
    const record = await recordsService.createRecord(
      req.body as CreateRecordInput,
      req.user!.userId
    );
    res.status(201).json(record);
  } catch (error) {
    next(error);
  }
}

export async function listRecords(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.query as unknown as ListRecordsQuery;
    const isPurePage1 = query.page === 1 && !query.search && !query.category && !query.type && !query.from && !query.to && query.sortBy === "date" && query.order === "desc";
    const cacheKey = `records:${req.user!.userId}:page:1`;

    if (isPurePage1) {
      const cached = await redis.get(cacheKey);
      if (cached) return res.status(200).json(JSON.parse(cached));
    }

    const result = await recordsService.listRecords(
      query,
      req.user!.userId,
      req.user!.role
    );

    if (isPurePage1) {
      await redis.set(cacheKey, JSON.stringify(result), "EX", 60);
    }

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getRecordById(req: Request, res: Response, next: NextFunction) {
  try {
    const record = await recordsService.getRecordById(
      req.params.id as string,
      req.user!.userId,
      req.user!.role
    );
    res.status(200).json(record);
  } catch (error) {
    next(error);
  }
}

export async function updateRecord(req: Request, res: Response, next: NextFunction) {
  try {
    const record = await recordsService.updateRecord(
      req.params.id as string,
      req.body as UpdateRecordInput,
      req.user!.userId,
      req.user!.role
    );
    res.status(200).json(record);
  } catch (error) {
    next(error);
  }
}

export async function deleteRecord(req: Request, res: Response, next: NextFunction) {
  try {
    await recordsService.deleteRecord(
      req.params.id as string,
      req.user!.userId,
      req.user!.role
    );
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
