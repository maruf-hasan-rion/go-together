import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { IJWTPayload } from "../../types/common.js";
import ApiError from "../../utils/ApiError.js";
import { writeAuditLog } from "../../utils/audit.js";
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

const getUserBookings = catchAsync(async (req: Request & { user?: IJWTPayload }, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");

  const result = await BookingService.getUserBookings(userId, req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Booking details retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getBookingDetails = catchAsync(
  async (req: Request & { user?: IJWTPayload }, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");

    const { bookingId } = req.params;
    const result = await BookingService.getBookingDetails(
      bookingId as string,
      userId,
      req.user!.role,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Booking details retrieved successfully",
      data: { result },
    });
  },
);

const cancelBooking = catchAsync(async (req: Request & { user?: IJWTPayload }, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");

  const { bookingId } = req.params;
  const result = await BookingService.cancelBooking(bookingId as string, userId);

  await writeAuditLog({
    actorId: userId,
    actorRole: req.user?.role,
    action: "BOOKING_CANCELLED",
    resourceType: "Booking",
    resourceId: bookingId as string,
    ip: req.ip,
  });

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
