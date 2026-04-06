import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { safeGet, safeSet, safeDel } from "../lib/redis";

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

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

    const userId = result.data.sub;

    const cachedUser = await safeGet(`user:${userId}`);
    if (cachedUser) {
      try {
        const parsedCache = JSON.parse(cachedUser);
        if(parsedCache.status === "inactive") {
          res.status(401).json({ error: "Unauthorized" });
          return;
        }
        
        req.user = { userId, role: parsedCache.role };
        return next();
      } catch (parseError) {
         await safeDel(`user:${userId}`); // Evict corrupted logic
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, isActive: true, deletedAt: true }
    });

    if (!user || user.deletedAt !== null || !user.isActive) {
      await safeSet(`user:${userId}`, JSON.stringify({ status: "inactive" }), "EX", 3600);
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    await safeSet(`user:${userId}`, JSON.stringify({ role: user.role }), "EX", 3600);

    req.user = {
      userId,
      role: user.role,
    };

    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
};
