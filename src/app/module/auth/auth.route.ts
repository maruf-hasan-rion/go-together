import express from "express";
import auth from "../../middleware/auth.js";
import { UserRole } from "../user/user.interface.js";
import { AuthController } from "./auth.controller.js";

const router = express.Router();

router.post("/login", AuthController.login);

router.post("/refresh-token", AuthController.refreshToken);

router.get("/me", AuthController.getMe);

router.post("/apply-host", auth(UserRole.USER), AuthController.applyHost);

export const AuthRoutes = router;
