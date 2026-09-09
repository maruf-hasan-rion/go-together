import type { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { MetaService } from "./meta.service.js";

// import { catchAsync } from "../../../shared/catchAsync";
// import { sendResponse } from "../../../shared/sendResponse";

const fetchDashboardMetaData = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const result = await MetaService.fetchDashboardMetaData(user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Meta data retrieval successfully!",
    data: result,
  });
});

const getLandingPageStats = catchAsync(async (_req: Request, res: Response) => {
  const result = await MetaService.getLandingPageStats();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: result.stats,
  });
});

export const MetaController = {
  fetchDashboardMetaData,
  getLandingPageStats,
};
