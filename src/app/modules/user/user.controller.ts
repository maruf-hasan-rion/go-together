import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync";
import { UserService } from "./user.service";
import sendResponse from "../../shared/sendResponse";
import { IJWTPayload } from "../../types/common";
import httpStatus from "http-status";

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

const updateMyProfile = catchAsync(
  async (req: Request & { user?: IJWTPayload }, res: Response) => {
    const user = req.user;

    const result = await UserService.updateMyProfile(user as IJWTPayload, req);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "My profile updated!",
      data: result,
    });
  }
);

export const UserController = {
  createUser,
  // becomeHost,
  updateMyProfile,
};
