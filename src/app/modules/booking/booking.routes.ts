import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { BookingController } from "./booking.controller";
import { BookingValidation } from "./booking.validation";

const router = express.Router();

// User routes
router.post(
  "/",
  (req, res, next) => {
    console.log("content-type:", req.headers["content-type"]);
    console.log("req.body:", req.body);
    next();
  },
  auth(),
  validateRequest(BookingValidation.createBooking),
  BookingController.createBooking
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
