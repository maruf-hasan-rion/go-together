import express from "express";
import auth from "../../middleware/auth.js";
import { UserRole } from "../user/user.interface.js";
import { MetaController } from "./meta.controller.js";

// import { UserRole } from '../../../generated/prisma/client.js';

const router = express.Router();

// Dashboard metadata
router.get(
  "/",
  auth(UserRole.ADMIN, UserRole.HOST, UserRole.USER),
  MetaController.fetchDashboardMetaData,
);

// Landing page stats
router.get("/landing-page", MetaController.getLandingPageStats);

export const MetaRoutes = router;
