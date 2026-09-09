import express from "express";
import auth from "../../middleware/auth.js";
import validateRequest from "../../middleware/validateRequest.js";
import { UserRole } from "../user/user.interface.js";
import { ReviewController } from "./review.controller.js";
import { ReviewValidation } from "./review.validation.js";

const router = express.Router();

router.post(
  "/",
  auth(UserRole.USER),
  validateRequest(ReviewValidation.addReviewValidationSchema),
  ReviewController.addReview,
);

router.get("/", ReviewController.getAllReview);

export const ReviewRoutes = router;
