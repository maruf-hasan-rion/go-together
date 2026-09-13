import express from "express";
import auth from "../../middleware/auth.js";
import { authLimiter } from "../../middleware/rateLimiter.js";
import validateRequest from "../../middleware/validateRequest.js";
import { UserRole } from "../user/user.interface.js";
import { AuthController } from "./auth.controller.js";
import { AuthValidation } from "./auth.validation.js";

const router = express.Router();

router.post("/login", authLimiter, validateRequest(AuthValidation.login), AuthController.login);

router.post(
  "/google",
  authLimiter,
  validateRequest(AuthValidation.googleLogin),
  AuthController.googleLogin,
);

router.post(
  "/forgot-password",
  authLimiter,
  validateRequest(AuthValidation.forgotPassword),
  AuthController.forgotPassword,
);

router.post(
  "/reset-password",
  authLimiter,
  validateRequest(AuthValidation.resetPassword),
  AuthController.resetPassword,
);

router.post(
  "/refresh-token",
  authLimiter,
  AuthController.refreshToken,
);

router.post("/logout", AuthController.logout);

router.post(
  "/change-password",
  auth(UserRole.USER, UserRole.HOST, UserRole.ADMIN),
  validateRequest(AuthValidation.changePassword),
  AuthController.changePassword,
);

router.get(
  "/me",
  auth(UserRole.USER, UserRole.HOST, UserRole.ADMIN),
  AuthController.getMe,
);

router.post(
  "/apply-host",
  auth(UserRole.USER),
  validateRequest(AuthValidation.applyHost),
  AuthController.applyHost,
);

export const AuthRoutes = router;
