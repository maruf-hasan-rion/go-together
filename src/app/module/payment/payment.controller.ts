import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { IJWTPayload } from "../../types/common.js";
import ApiError from "../../utils/ApiError.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { PaymentService } from "./payment.service.js";

const createPaymentIntent = catchAsync(
  async (req: Request & { user?: IJWTPayload }, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");

    const result = await PaymentService.createPaymentIntent(req.body.bookingId, userId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Payment intent created successfully",
      data: result,
    });
  },
);

const confirmPayment = catchAsync(
  async (req: Request & { user?: IJWTPayload }, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");

    const result = await PaymentService.confirmPayment(req.body.paymentIntentId, userId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Payment confirmed successfully",
      data: result,
    });
  },
);

const getPaymentHistory = catchAsync(
  async (req: Request & { user?: IJWTPayload }, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");

    const payments = await PaymentService.getPaymentHistory(userId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Payment history fetched successfully",
      data: payments,
    });
  },
);

export const PaymentController = {
  createPaymentIntent,
  confirmPayment,
  getPaymentHistory,
};
