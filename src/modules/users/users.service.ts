import argon2 from "argon2";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middlewares/errorHandler";
import type { CreateUserInput, UpdateUserInput, ListUsersQuery } from "./users.schema";

const userSelectFields = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const;

export async function createUser(data: CreateUserInput) {
  const hashedPassword = await argon2.hash(data.password);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: data.role,
    },
    select: userSelectFields,
  });

  return user;
}

export async function listUsers(query: ListUsersQuery) {
  const { page, limit, search } = query;
  const skip = (page - 1) * limit >= 0 ? (page - 1) * limit : 0;

  const where = {
    deletedAt: null as null,
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: userSelectFields,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
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

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: userSelectFields,
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if(user.deletedAt !== null){
    throw new AppError("User is deleted", 400);
  }

  return user;
}

export async function updateUser(targetId: string, actorId: string, data: UpdateUserInput) {
  if (actorId === targetId) {
    throw new AppError("Admins cannot modify their own account.", 403);
  }

  // Verify target exists and is not soft-deleted
  const existing = await prisma.user.findUnique({
    where: { id: targetId },
  });

  if (!existing) {
    throw new AppError("User not found", 404);
  }

  if(existing.deletedAt !== null){
    throw new AppError("User is deleted", 400);
  }

  const user = await prisma.user.update({
    where: { id: targetId },
    data,
    select: userSelectFields,
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "UPDATE_USER",
      targetId,
      meta: JSON.parse(JSON.stringify(data)),
    },
  });

  return user;
}

export async function deleteUser(targetId: string, actorId: string) {
  if (actorId === targetId) {
    throw new AppError("Admins cannot delete their own account.", 403);
  }

  const existing = await prisma.user.findUnique({
    where: { id: targetId },
  });

  if (!existing) {
    throw new AppError("User not found", 404);
  }

  if(existing.deletedAt !== null){
    throw new AppError("User is already deleted", 400);
  }

  await prisma.user.update({
    where: { id: targetId },
    data: { deletedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "DELETE_USER",
      targetId,
    },
  });
}
