import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { IJWTPayload } from "../../types/common.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { ReviewService } from "./review.service.js";

const addReview = catchAsync(async (req: Request & { user?: IJWTPayload }, res: Response) => {
  const user = req.user;
  const result = await ReviewService.addReview(user as IJWTPayload, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Review created successfully",
    data: result,
  });
});

const getAllReview = catchAsync(async (_req: Request, res: Response) => {
  const result = await ReviewService.getAllReview();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Reviews retrieval successfully",
    data: result,
  });
});

export const ReviewController = {
  addReview,
  getAllReview,
};
