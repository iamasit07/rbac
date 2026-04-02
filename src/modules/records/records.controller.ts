import { Request, Response, NextFunction } from "express";
import * as recordsService from "./records.service";
import type { CreateRecordInput, UpdateRecordInput, ListRecordsQuery } from "./records.schema";

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
    const result = await recordsService.listRecords(req.query as unknown as ListRecordsQuery);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getRecordById(req: Request, res: Response, next: NextFunction) {
  try {
    const record = await recordsService.getRecordById(req.params.id as string);
    res.status(200).json(record);
  } catch (error) {
    next(error);
  }
}

export async function updateRecord(req: Request, res: Response, next: NextFunction) {
  try {
    const record = await recordsService.updateRecord(
      req.params.id as string,
      req.body as UpdateRecordInput
    );
    res.status(200).json(record);
  } catch (error) {
    next(error);
  }
}

export async function deleteRecord(req: Request, res: Response, next: NextFunction) {
  try {
    await recordsService.deleteRecord(req.params.id as string);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
