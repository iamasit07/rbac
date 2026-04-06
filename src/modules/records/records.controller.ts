import { Request, Response } from "express";
import * as recordsService from "./records.service";
import type { CreateRecordInput, UpdateRecordInput, ListRecordsQuery } from "./records.schema";
import { safeGet, safeSet } from "../../lib/redis";
import { catchAsync } from "../../utils/catchAsync";

export const createRecord = catchAsync(async (req: Request, res: Response) => {
  const record = await recordsService.createRecord(
    req.body as CreateRecordInput,
    req.user!.userId
  );
  res.status(201).json(record);
});

export const listRecords = catchAsync(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListRecordsQuery;
  const isPurePage1 = query.page === 1 && !query.search && !query.category && !query.type && !query.from && !query.to && query.sortBy === "date" && query.order === "desc";

  const cacheLimit = query.limit ?? 20;
  const hasFullAccess = req.user!.role === "ADMIN" || req.user!.role === "ANALYST";
  const cacheScope = hasFullAccess ? "global" : req.user!.userId;
  const cacheKey = `records:${cacheScope}:page:1:limit:${cacheLimit}`;

  if (isPurePage1) {
    const cached = await safeGet(cacheKey);
    if (cached) {
      try {
        return res.status(200).json(JSON.parse(cached));
      } catch { /* corrupted cache — skip */ }
    }
  }

  const result = await recordsService.listRecords(
    query,
    req.user!.userId,
    req.user!.role
  );

  if (isPurePage1) {
    await safeSet(cacheKey, JSON.stringify(result), "EX", 60);
  }

  res.status(200).json(result);
});

export const getRecordById = catchAsync(async (req: Request, res: Response) => {
  const record = await recordsService.getRecordById(
    req.params.id as string,
    req.user!.userId,
    req.user!.role
  );
  res.status(200).json(record);
});

export const updateRecord = catchAsync(async (req: Request, res: Response) => {
  const record = await recordsService.updateRecord(
    req.params.id as string,
    req.body as UpdateRecordInput,
    req.user!.userId,
    req.user!.role
  );
  res.status(200).json(record);
});

export const deleteRecord = catchAsync(async (req: Request, res: Response) => {
  await recordsService.deleteRecord(
    req.params.id as string,
    req.user!.userId,
    req.user!.role
  );
  res.status(204).send();
});
