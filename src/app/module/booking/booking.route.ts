import express from "express";
import auth from "../../middleware/auth.js";
import validateRequest from "../../middleware/validateRequest.js";
import { BookingController } from "./booking.controller.js";
import { BookingValidation } from "./booking.validation.js";

const router = express.Router();

// User routes
router.post(
  "/",
  auth(),
  validateRequest(BookingValidation.createBooking),
  BookingController.createBooking,
);

router.get("/my-bookings", auth(), BookingController.getUserBookings);

router.get("/:bookingId", auth(), BookingController.getBookingDetails);

router.delete("/:bookingId", auth(), BookingController.cancelBooking);

// Host routes
// router.get(
//   '/event/:eventId/participants',
//   AuthMiddleware.authorize('HOST', 'ADMIN'),
//   BookingController.getEventParticipants
// );
// router.get(
//   '/host/stats',
//   AuthMiddleware.authorize('HOST', 'ADMIN'),
//   BookingController.getHostStats
// );

export const BookingRoutes = router;
