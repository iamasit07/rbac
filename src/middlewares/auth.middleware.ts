import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env";
import { Role } from "@prisma/client";

const jwtPayloadSchema = z.object({
  sub: z.string(),
  role: z.enum(Role),
});

export type AuthPayload = z.infer<typeof jwtPayloadSchema>;

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: Role;
      };
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const result = jwtPayloadSchema.safeParse(decoded);

    if (!result.success) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    req.user = {
      userId: result.data.sub,
      role: result.data.role,
    };

    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}
