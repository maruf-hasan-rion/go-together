import express from "express";
import { UserController } from "./user.controller.js";

const router = express.Router();

// Public profile (no auth) — used by the public host/user profile page.
router.get("/:id", UserController.getPublicProfile);

export const UserPublicRoutes = router;
