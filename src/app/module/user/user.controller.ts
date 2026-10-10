import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { IJWTPayload } from "../../types/common.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { UserService } from "./user.service.js";

const createUser = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.createUser(req);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User created successfully!",
    data: result,
  });
});

// const becomeHost = catchAsync(
//   async (req: Request & { user?: IJWTPayload }, res: Response) => {
//     const user = req.user;
//     const result = await UserService.becomeHost(user as IJWTPayload);
//     sendResponse(res, {
//       statusCode: httpStatus.OK,
//       success: true,
//       message: "Host request submitted successfully",
//       data: result,
//     });
//   }
// );

const updateMyProfile = catchAsync(async (req: Request & { user?: IJWTPayload }, res: Response) => {
  const user = req.user;

  const result = await UserService.updateMyProfile(user as IJWTPayload, req);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "My profile updated!",
    data: result,
  });
});

const getPublicProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getPublicProfile(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile retrieved successfully",
    data: result,
  });
});

export const UserController = {
  createUser,
  // becomeHost,
  updateMyProfile,
  getPublicProfile,
};
