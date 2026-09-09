import type { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync.js";
import pick from "../../utils/pick.js";
import sendResponse from "../../utils/sendResponse.js";
import { userFilterableFields } from "./admin.constant.js";
import { AdminService } from "./admin.service.js";

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, userFilterableFields);
  const options = pick(req.query, ["limit", "page", "sortBy", "sortOrder"]);
  const result = await AdminService.getAllUsers(filters, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All Users fetched Successfully!",
    data: result,
  });
});

const getAllHostApplications = catchAsync(async (_req: Request, res: Response) => {
  const result = await AdminService.getAllHostApplications();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Host requests fetched successfully",
    data: result,
  });
});

// const updateHostStatus = catchAsync(
//   async (req: Request & { user?: IJWTPayload }, res: Response) => {
//     const id = req.params.id;
//     const { status } = req.body;
//     const result = await AdminService.updateHostStatus(
//       id,
//       status as "APPROVED" | "REJECTED"
//     );
//     sendResponse(res, {
//       statusCode: httpStatus.OK,
//       success: true,
//       message: "Request approved successfully",
//       data: result,
//     });
//   }
// );

//  approve host application

const approveHost = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await AdminService.approveHostApplication(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Host application approved!",
    data: result,
  });
});

// reject host

const rejectHost = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await AdminService.rejectHostApplication(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Host application rejected!",
    data: result,
  });
});

export const AdminController = {
  // hostRequests,
  getAllUsers,
  getAllHostApplications,
  // updateHostStatus,
  approveHost,
  rejectHost,
};
