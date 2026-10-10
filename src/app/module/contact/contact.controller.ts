import type { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { ContactService } from "./contact.service.js";

const submitMessage = catchAsync(async (req: Request, res: Response) => {
  const result = await ContactService.submitMessage(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Thanks! We received your message and will get back to you soon.",
    data: result,
  });
});

export const ContactController = {
  submitMessage,
};
