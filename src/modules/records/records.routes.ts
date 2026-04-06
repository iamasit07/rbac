import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/rbac.middleware";
import { validate, validateQuery } from "../../middlewares/validate";
import { createRecordSchema, updateRecordSchema, listRecordsSchema } from "./records.schema";
import { roleLimiter } from "../../middlewares/roleLimiter";
import { idempotency } from "../../middlewares/idempotency";
import * as recordsController from "./records.controller";

const router = Router();

router.get(
  "/",
  authenticate,
  roleLimiter,
  validateQuery(listRecordsSchema),
  recordsController.listRecords
);

router.get(
  "/:id",
  authenticate,
  roleLimiter,
  recordsController.getRecordById
);

router.post(
  "/",
  authenticate,
  authorize("ANALYST"),
  roleLimiter,
  idempotency,
  validate(createRecordSchema),
  recordsController.createRecord
);

router.patch(
  "/:id",
  authenticate,
  authorize("ANALYST"),
  roleLimiter,
  validate(updateRecordSchema),
  recordsController.updateRecord
);

router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  roleLimiter,
  recordsController.deleteRecord
);

export default router;
