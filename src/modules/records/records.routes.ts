import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/rbac.middleware";
import { validate, validateQuery } from "../../middlewares/validate";
import { createRecordSchema, updateRecordSchema, listRecordsSchema } from "./records.schema";
import * as recordsController from "./records.controller";

const router = Router();

router.get(
  "/",
  authenticate,
  validateQuery(listRecordsSchema),
  recordsController.listRecords
);

router.get(
  "/:id",
  authenticate,
  recordsController.getRecordById
);

router.post(
  "/",
  authenticate,
  authorize("ANALYST", "ADMIN"),
  validate(createRecordSchema),
  recordsController.createRecord
);

router.patch(
  "/:id",
  authenticate,
  authorize("ANALYST", "ADMIN"),
  validate(updateRecordSchema),
  recordsController.updateRecord
);

router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  recordsController.deleteRecord
);

export default router;
