import express from "express";
import { ReviewController } from "./review.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "../user/user.interface";
import validateRequest from "../../middlewares/validateRequest";
import { ReviewValidation } from "./review.validation";

const router = express.Router();

router.post(
  "/",
  auth(UserRole.USER),
  validateRequest(ReviewValidation.addReviewValidationSchema),
  ReviewController.addReview
);

router.get("/", ReviewController.getAllReview);

export const ReviewRoutes = router;
