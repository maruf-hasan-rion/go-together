import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { IJWTPayload } from "../../types/common.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { ReviewService } from "./review.service.js";

const addReview = catchAsync(async (req: Request & { user?: IJWTPayload }, res: Response) => {
  const result = await ReviewService.addReview(req.user as IJWTPayload, req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Review created successfully",
    data: result,
  });
});

const getEventReviews = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewService.getEventReviews(req.params.eventId as string, req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Event reviews retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getHostReviews = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewService.getHostReviews(req.params.hostId as string, req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Host reviews retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getMyReviewForEvent = catchAsync(
  async (req: Request & { user?: IJWTPayload }, res: Response) => {
    const result = await ReviewService.getMyReviewForEvent(
      req.user as IJWTPayload,
      req.params.eventId as string,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Review retrieved successfully",
      data: result,
    });
  },
);

const getPublicTestimonials = catchAsync(async (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 6;
  const result = await ReviewService.getPublicTestimonials(limit);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Testimonials retrieved successfully",
    data: result,
  });
});

export const ReviewController = {
  addReview,
  getEventReviews,
  getHostReviews,
  getMyReviewForEvent,
  getPublicTestimonials,
};
