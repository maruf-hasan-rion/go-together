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

router.get("/public-testimonials", ReviewController.getPublicTestimonials);
router.get("/my-review/:eventId", auth(), ReviewController.getMyReviewForEvent);
router.get("/event/:eventId", ReviewController.getEventReviews);
router.get("/host/:hostId", ReviewController.getHostReviews);

export const ReviewRoutes = router;
