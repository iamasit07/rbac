import { Prisma, Role } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middlewares/errorHandler";
import type { CreateRecordInput, UpdateRecordInput, ListRecordsQuery } from "./records.schema";

const recordSelectFields = {
  id: true,
  amount: true,
  type: true,
  category: true,
  date: true,
  notes: true,
  userId: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function createRecord(data: CreateRecordInput, userId: string) {
  const record = await prisma.record.create({
    data: {
      amount: new Prisma.Decimal(data.amount),
      type: data.type,
      category: data.category,
      date: new Date(data.date),
      notes: data.notes,
      userId,
    },
    select: recordSelectFields,
  });

  return record;
}

export async function listRecords(query: ListRecordsQuery, userId: string, role: Role) {
  const { page, limit, type, category, from, to, search, sortBy, order } = query;
  const skip = (page - 1) * limit >= 0 ? (page - 1) * limit : 0;

  const isAdmin = role === "ADMIN";

  const where: Prisma.RecordWhereInput = {
    deletedAt: null,
    ...(!isAdmin && { userId }),
    ...(type && { type }),
    ...(category && { category: { contains: category, mode: "insensitive" } }),
    ...(from && { date: { gte: new Date(from) } }),
    ...(to && {
      date: {
        ...(from && { gte: new Date(from) }),
        lte: new Date(to),
      },
    }),
    ...(search && {
      OR: [
        { notes: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const orderBy: Prisma.RecordOrderByWithRelationInput =
    sortBy === "amount"
      ? { amount: order }
      : sortBy === "category"
        ? { category: order }
        : { date: order };

  const [data, total] = await Promise.all([
    prisma.record.findMany({
      where,
      select: recordSelectFields,
      skip,
      take: limit,
      orderBy,
    }),
    prisma.record.count({ where }),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getRecordById(id: string, userId: string, role: Role) {
  const record = await prisma.record.findUnique({
    where: { id },
    select: recordSelectFields,
  });

  if (!record) {
    throw new AppError("Record not found", 404);
  }
  
  // Admin can access any record, owner can access their own
  if (role !== "ADMIN" && record.userId !== userId) {
    throw new AppError("Record not found", 404);
  }

  if (record.deletedAt !== null) {
    throw new AppError("Record has been deleted", 400);
  }

  return record;
}

export async function updateRecord(id: string, data: UpdateRecordInput, userId: string, role: Role) {
  const existing = await prisma.record.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new AppError("Record not found", 404);
  }

  if (existing.deletedAt !== null) {
    throw new AppError("Record has been deleted", 400);
  }

  if (role !== "ADMIN" && existing.userId !== userId) {
    throw new AppError("Record not found", 404);
  }

  const [record] = await prisma.$transaction([
    prisma.record.update({
      where: { id },
      data: {
        ...(data.amount !== undefined && { amount: new Prisma.Decimal(data.amount) }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.date !== undefined && { date: new Date(data.date) }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      select: recordSelectFields,
    }),
    prisma.auditLog.create({
      data: {
        actorId: userId,
        action: "UPDATE_RECORD",
        targetId: id,
        meta: JSON.parse(JSON.stringify(data)),
      },
    })
  ]);

  return record;
}

export async function deleteRecord(id: string, userId: string, role: Role) {
  const existing = await prisma.record.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new AppError("Record not found", 404);
  }

  if (existing.deletedAt !== null) {
    throw new AppError("Record is already deleted", 400);
  }

  if (role !== "ADMIN" && existing.userId !== userId) {
    throw new AppError("Record not found", 404);
  }

  await prisma.$transaction([
    prisma.record.update({
      where: { id },
      data: { deletedAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        actorId: userId,
        action: "DELETE_RECORD",
        targetId: id,
      },
    })
  ]);
}
