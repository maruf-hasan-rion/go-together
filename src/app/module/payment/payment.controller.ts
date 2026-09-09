import type { Request, Response } from "express";
import httpStatus from "http-status";
import { prisma } from "../../lib/prisma.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { PaymentService } from "./payment.service.js";

// const handleStripeWebhookEvent = catchAsync(async (req: Request, res: Response) => {

//     const sig = req.headers["stripe-signature"] as string;
//     let event;
//     try {
//         event = stripe.webhooks.constructEvent(req.body, sig,  config.webhook_secret_key as string);
//     } catch (err: any) {
//         console.error("⚠️ Webhook signature verification failed:", err.message);
//         return res.status(400).send(`Webhook Error: ${err.message}`);
//     }
//     const result = await PaymentService.handleStripeWebhookEvent(event);

//     sendResponse(res, {
//         statusCode: 200,
//         success: true,
//         message: 'Webhook req send successfully',
//         data: result,
//     });
// });

const createPaymentIntent = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await PaymentService.createPaymentIntent(req.body.bookingId, req.user?.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment intent created successfully",
    data: result,
  });
});

const confirmPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.confirmPayment(req.body.paymentIntentId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment confirmed successfully",
    data: result,
  });
});

const getPaymentHistory = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const payments = await PaymentService.getPaymentHistory(req.user?.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment history fetched successfully",
    data: payments,
  });
});
const updatePaymentStatus = catchAsync(async (req: Request, res: Response) => {
  const { paymentIntentId } = req.params;

  const payment = await prisma.payment.update({
    where: { transactionId: paymentIntentId },
    data: { status: "COMPLETED" },
  });

  await prisma.booking.update({
    where: { id: payment.bookingId },
    data: { status: "CONFIRMED" },
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment updated",
    data: payment,
  });
});
export const PaymentController = {
  createPaymentIntent,
  confirmPayment,
  getPaymentHistory,
  updatePaymentStatus,
};
