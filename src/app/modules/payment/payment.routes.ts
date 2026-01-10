import express from "express";
import auth from "../../middlewares/auth";
import { PaymentController } from "./payment.controller";

const router = express.Router();

router.post("/create-intent", auth(), PaymentController.createPaymentIntent);
router.post("/confirm", auth(), PaymentController.confirmPayment);
router.get("/history", auth(), PaymentController.getPaymentHistory);
router.patch(
  "/:paymentIntentId",
  auth(),
  PaymentController.updatePaymentStatus
);

export const PaymentRoutes = router;
