import { z } from "zod";
import { EntryType } from "@prisma/client";

export const createRecordSchema = z.object({
  amount: z.union([
    z.number().positive("Amount must be positive"),
    z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Amount must be a positive numeric string")
  ]),
  type: z.enum(EntryType),
  category: z.string().min(1, "Category is required").max(100),
  date: z.iso.datetime("Invalid datetime format"),
  notes: z.string().max(500).optional(),
});

export const updateRecordSchema = createRecordSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided" }
);

export const listRecordsSchema = z.object({
  type: z.enum(EntryType).optional(),
  category: z.string().optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["date", "amount", "category"]).default("date"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateRecordInput = z.infer<typeof createRecordSchema>;
export type UpdateRecordInput = z.infer<typeof updateRecordSchema>;
export type ListRecordsQuery = z.infer<typeof listRecordsSchema>;
