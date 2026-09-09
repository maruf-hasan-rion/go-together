import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { IJWTPayload } from "../../types/common.js";
import ApiError from "../../utils/ApiError.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { BookingService } from "./booking.service.js";

// const createBooking = catchAsync(
//   async (req: Request & { user?: IJWTPayload }, res: Response) => {
//     const userId = req.user?.id;
//     if (!userId) {
//       throw new Error("Unauthorized");
//     }
//     const booking = await BookingService.createBooking(userId, req.body);

//     sendResponse(res, {
//       statusCode: httpStatus.OK,
//       success: true,
//       message:
//         booking.totalAmount > 0
//           ? "Booking created. Please complete payment to confirm."
//           : "Successfully joined the event!",
//       data: { booking },
//     });
//   }
// );

const createBooking = catchAsync(async (req: Request & { user?: IJWTPayload }, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");

  const booking = await BookingService.createBookingService(userId, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Booking created. Redirecting to payment.",
    data: { booking },
  });
});

const getUserBookings = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  // const { status } = req.query;
  const result = await BookingService.getUserBookings(
    req.user.userId,
    // status as any
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Booking details retrieved successfully",
    data: { result },
  });
});

const getBookingDetails = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const { bookingId } = req.params;
  const result = await BookingService.getBookingDetails(bookingId, req.user.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Booking details retrieved successfully",
    data: { result },
  });
});

const cancelBooking = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const { bookingId } = req.params;
  const result = await BookingService.cancelBooking(bookingId, req.user.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Booking cancelled successfully",
    data: { result },
  });
});

export const BookingController = {
  createBooking,
  getUserBookings,
  getBookingDetails,
  cancelBooking,
};
