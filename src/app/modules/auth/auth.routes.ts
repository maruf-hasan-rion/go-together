import express from "express";
import { AuthController } from "./auth.controller";
import { UserRole } from "../user/user.interface";
import auth from "../../middlewares/auth";

const router = express.Router();

router.post("/login", AuthController.login);

router.post("/refresh-token", AuthController.refreshToken);

router.get("/me", AuthController.getMe);

router.post("/apply-host", auth(UserRole.USER), AuthController.applyHost);

export const AuthRoutes = router;
