import express from "express";
import { authLimiter } from "../../middleware/rateLimiter.js";
import validateRequest from "../../middleware/validateRequest.js";
import { ContactController } from "./contact.controller.js";
import { ContactValidation } from "./contact.validation.js";

const router = express.Router();

router.post("/", authLimiter, validateRequest(ContactValidation.submitMessage), ContactController.submitMessage);

export const ContactRoutes = router;
