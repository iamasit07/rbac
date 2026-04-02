import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate";
import { validateQuery } from "../../middlewares/validate";
import { createUserSchema, updateUserSchema, listUsersSchema } from "./users.schema";
import * as usersController from "./users.controller";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createUserSchema),
  usersController.createUser
);

router.get(
  "/",
  authenticate,
  authorize("ADMIN"),
  validateQuery(listUsersSchema),
  usersController.listUsers
);

router.get(
  "/:id",
  authenticate,
  authorize("ADMIN", "ANALYST"),
  usersController.getUserById
);

router.patch(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate(updateUserSchema),
  usersController.updateUser
);

router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  usersController.deleteUser
);

export default router;
