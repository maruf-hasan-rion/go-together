import { Request, Response } from "express";

import { MetaService } from "./meta.service";

import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
// import { catchAsync } from "../../../shared/catchAsync";
// import { sendResponse } from "../../../shared/sendResponse";

const fetchDashboardMetaData = catchAsync(
  async (req: Request, res: Response) => {
    const user = (req as any).user;
    const result = await MetaService.fetchDashboardMetaData(user);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Meta data retrieval successfully!",
      data: result,
    });
  }
);

const getLandingPageStats = catchAsync(async (req: Request, res: Response) => {
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
