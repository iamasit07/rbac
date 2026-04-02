import { z } from "zod";
import { Role } from "@prisma/client";

const emailParser = z.email("Invalid email address");

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: emailParser,
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(Role),
});

export const updateUserSchema = z.object({
  role: z.enum(Role).optional(),
  isActive: z.boolean().optional(),
}).refine((data) => data.role !== undefined || data.isActive !== undefined, {
  message: "At least one of 'role' or 'isActive' must be provided",
});

export const listUsersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersSchema>;
