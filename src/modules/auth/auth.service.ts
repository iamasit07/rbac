import jwt from "jsonwebtoken";
import argon2 from "argon2";
import type { StringValue } from 'ms';
import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { AppError } from "../../middlewares/errorHandler";
import type { RegisterInput, LoginInput } from "./auth.schema";

function signToken(userId: string, role: string): string {
  const payload = { sub: userId, role };
  return jwt.sign(payload, env.JWT_SECRET , {
    expiresIn: env.JWT_EXPIRY as StringValue,
  });
}

export async function register(data: RegisterInput) {
  const hashedPassword = await argon2.hash(data.password);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: "VIEWER",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  const token = signToken(user.id, user.role);

  return { user, token };
}

export async function login(data: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: data.email, deletedAt: null },
  });

  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }

  const validPassword = await argon2.verify(user.password, data.password);

  if (!validPassword) {
    throw new AppError("Invalid credentials", 401);
  }

  if (!user.isActive) {
    throw new AppError("Account is disabled", 403);
  }

  const token = signToken(user.id, user.role);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    token,
  };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return user;
}
