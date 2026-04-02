import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/rbac.middleware";
import * as dashboardController from "./dashboard.controller";

const router = Router();

router.get(
  "/summary",
  authenticate,
  authorize("ANALYST", "ADMIN"),
  dashboardController.getSummary
);

router.get(
  "/by-category",
  authenticate,
  authorize("ANALYST", "ADMIN"),
  dashboardController.getByCategory
);

router.get(
  "/trends",
  authenticate,
  authorize("ANALYST", "ADMIN"),
  dashboardController.getTrends
);

router.get(
  "/recent",
  authenticate,
  authorize("ANALYST", "ADMIN"),
  dashboardController.getRecent
);

export default router;