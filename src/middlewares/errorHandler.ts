import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  public readonly statusCode: number;
  
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

interface PrismaError extends Error {
  code?: string;
  meta?: Record<string, unknown>;
}

function isPrismaError(error: unknown): error is PrismaError {
  return (
    error instanceof Error &&
    "code" in error &&
    typeof (error as PrismaError).code === "string"
  );
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // AppError — known application error
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Prisma: Record not found
  if (isPrismaError(err) && err.code === "P2025") {
    res.status(404).json({ error: "Resource not found" });
    return;
  }

  // Prisma: Unique constraint violation
  if (isPrismaError(err) && err.code === "P2002") {
    res.status(409).json({ error: "Resource already exists" });
    return;
  }

  // Fallback — never leak stack traces in production
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
}
