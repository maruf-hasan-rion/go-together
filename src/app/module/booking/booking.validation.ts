import { z } from "zod";

export const createBooking = z.object({
  body: z.object({
    eventId: z.uuid("Invalid event ID"),
  }),
});

export const updateBookingStatus = z.object({
  body: z.object({
    status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]),
  }),
});

export const BookingValidation = {
  createBooking,
  updateBookingStatus,
};
