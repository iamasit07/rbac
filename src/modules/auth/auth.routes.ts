import { Router } from "express";
import { authLimiter } from "../../middlewares/rateLimiter";
import { validate } from "../../middlewares/validate";
import { authenticate } from "../../middlewares/auth.middleware";
import { registerSchema, loginSchema } from "./auth.schema";
import * as authController from "./auth.controller";

const router = Router();

router.post("/register", authLimiter, validate(registerSchema), authController.register);
router.post("/login", authLimiter, validate(loginSchema), authController.login);
router.get("/me", authenticate, authController.getMe);

export default router;