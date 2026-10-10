import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { IJWTPayload } from "../../types/common.js";
import ApiError from "../../utils/ApiError.js";
import catchAsync from "../../utils/catchAsync.js";
import pick from "../../utils/pick.js";
import sendResponse from "../../utils/sendResponse.js";
import { hostFilterableFields, userFilterableFields } from "./admin.constant.js";
import { AdminService } from "./admin.service.js";

const actor = (req: Request & { user?: IJWTPayload }) => {
  if (!req.user) throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
  return { id: req.user.id, role: req.user.role, ip: req.ip };
};

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, userFilterableFields);
  const options = pick(req.query, ["limit", "page", "sortBy", "sortOrder"]);
  const result = await AdminService.getAllUsers(filters, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All Users fetched Successfully!",
    meta: result.meta,
    data: result.data,
  });
});

const getHosts = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, hostFilterableFields);
  const options = pick(req.query, ["limit", "page", "sortBy", "sortOrder"]);
  const result = await AdminService.getHosts(filters, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All Hosts fetched Successfully!",
    meta: result.meta,
    data: result.data,
  });
});

const getAllHostApplications = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, ["status"]);
  const options = pick(req.query, ["limit", "page", "sortBy", "sortOrder"]);
  const result = await AdminService.getAllHostApplications(filters, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Host applications fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

const approveHost = catchAsync(async (req: Request & { user?: IJWTPayload }, res: Response) => {
  const { id } = req.params;
  const result = await AdminService.approveHostApplication(id, actor(req));

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Host application approved!",
    data: result,
  });
});

const rejectHost = catchAsync(async (req: Request & { user?: IJWTPayload }, res: Response) => {
  const { id } = req.params;
  const result = await AdminService.rejectHostApplication(id, req.body?.reason, actor(req));

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Host application rejected!",
    data: result,
  });
});

const blockUser = catchAsync(async (req: Request & { user?: IJWTPayload }, res: Response) => {
  const result = await AdminService.blockUser(req.params.id, actor(req));

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User blocked successfully",
    data: result,
  });
});

const unblockUser = catchAsync(async (req: Request & { user?: IJWTPayload }, res: Response) => {
  const result = await AdminService.unblockUser(req.params.id, actor(req));

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User unblocked successfully",
    data: result,
  });
});

const deleteUser = catchAsync(async (req: Request & { user?: IJWTPayload }, res: Response) => {
  const result = await AdminService.deleteUser(req.params.id, actor(req));

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User deleted successfully",
    data: result,
  });
});

export const AdminController = {
  getAllUsers,
  getHosts,
  getAllHostApplications,
  approveHost,
  rejectHost,
  blockUser,
  unblockUser,
  deleteUser,
};
