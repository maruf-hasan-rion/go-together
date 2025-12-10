import express from "express";
import { AuthController } from "./auth.controller";

const router = express.Router();

router.post("/login", AuthController.login);

router.post("/refresh-token", AuthController.refreshToken);

router.get("/me", AuthController.getMe);

export const authRoutes = router;
