import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { IJWTPayload } from "../../types/common.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { AuthService } from "./auth.service.js";

const login = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.login(req.body);
  const { accessToken, refreshToken } = result;

  res.cookie("accessToken", accessToken, {
    secure: true,
    httpOnly: true,
    sameSite: "none",
    maxAge: 1000 * 60 * 60,
  });
  res.cookie("refreshToken", refreshToken, {
    secure: true,
    httpOnly: true,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24 * 90,
  });

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "User loggedIn Successfully!",
    data: result,
  });
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const { refreshToken } = req.cookies;

  const result = await AuthService.refreshToken(refreshToken);
  res.cookie("accessToken", result.accessToken, {
    secure: true,
    httpOnly: true,
    sameSite: "none",
    maxAge: 1000 * 60 * 60,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Access token genereated successfully!",
    data: {
      message: "Access token genereated successfully!",
    },
  });
});

const getMe = catchAsync(async (req: Request, res: Response) => {
  const userSession = req.cookies;
  const result = await AuthService.getMe(userSession);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User retrive successfully!",
    data: result,
  });
});
const applyHost = catchAsync(async (req: Request & { user?: IJWTPayload }, res: Response) => {
  const userId = req.user?.id;

  if (!req.body?.message) {
    sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: "Message is required",
      data: null,
    });
    console.log("BODY:", req.body);

    return;
  }

  const result = await AuthService.applyHost(userId, req.body);

  sendResponse(res, {
    statusCode: result.success ? httpStatus.OK : httpStatus.BAD_REQUEST,
    success: result.success,
    message: result.message,
    data: result.data,
  });
});

export const AuthController = {
  login,
  refreshToken,
  getMe,
  applyHost,
};
