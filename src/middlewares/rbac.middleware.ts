import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";

const ROLE_HIERARCHY: Record<Role, number> = {
  VIEWER: 0,
  ANALYST: 1,
  ADMIN: 2,
};

export function authorize(...minimumRoles: Role[]) {
  if (minimumRoles.length === 0) {
    throw new Error("authorize() called with no roles.");
  }

  const minimumLevel = Math.min(...minimumRoles.map((r) => ROLE_HIERARCHY[r]));

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const userLevel = ROLE_HIERARCHY[req.user.role];

    if (userLevel < minimumLevel) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    next();
  };
}
