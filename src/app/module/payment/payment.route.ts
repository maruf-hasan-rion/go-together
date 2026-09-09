import express from "express";
import auth from "../../middleware/auth.js";
import { PaymentController } from "./payment.controller.js";

const router = express.Router();

router.post("/create-intent", auth(), PaymentController.createPaymentIntent);
router.post("/confirm", auth(), PaymentController.confirmPayment);
router.get("/history", auth(), PaymentController.getPaymentHistory);
router.patch("/:paymentIntentId", auth(), PaymentController.updatePaymentStatus);

export const PaymentRoutes = router;
