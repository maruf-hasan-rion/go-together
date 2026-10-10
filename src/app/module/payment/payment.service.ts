import type Stripe from "stripe";
import config from "../../../config/index.js";
import { prisma } from "../../lib/prisma.js";
import { stripe } from "../../lib/stripe.js";
import type { IPaginationOptions } from "../../types/pagination.js";
import ApiError from "../../utils/ApiError.js";
import { paginationHelper } from "../../utils/pagination.js";

// const handleStripeWebhookEvent = async (event: Stripe.Event) => {
//   if (event.type === "checkout.session.completed") {
//     const session: any = event.data.object;

//     const paymentId = session.metadata.paymentId;
//     const userId = session.metadata.userId;
//     const eventId = session.metadata.eventId;

//     await prisma.$transaction(
//       async (tx: {
//         payment: {
//           update: (arg0: {
//             where: { id: any };
//             data: { status: "COMPLETED" | "FAILED" };
//           }) => any;
//         };
//       }) => {
//         //  1. Save Payment
//         await tx.payment.update({
//           where: {
//             id: paymentId,
//           },
//           data: {
//             status:
//               session.payment_status === "paid"
//                 ? PaymentStatus.COMPLETED
//                 : PaymentStatus.FAILED,
//           },
//         });

//         // 2. Add user as participant
//         await prisma.participant.create({
//           data: {
//             userId,
//             eventId,
//             paymentStatus:
//               session.payment_status === "paid"
//                 ? PaymentStatus.COMPLETED
//                 : PaymentStatus.FAILED,
//           },
//         });
//       }
//     );
//   }
// };

const isDemoMode = config.node_env === "development" && config.demo_mode;

// payment.service.ts (শুধু createPaymentIntent ফাংশন)

const createPaymentIntent = async (bookingId: string, userId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { event: true },
  });

  if (!booking) throw new ApiError(404, "Booking not found");
  if (booking.userId !== userId) throw new ApiError(403, "Unauthorized");
  if (booking.status !== "PENDING") throw new ApiError(400, "Booking is not pending");

  // আগে থেকে কোনো payment আছে কিনা চেক কর
  const existingPayment = await prisma.payment.findFirst({
    where: {
      bookingId: booking.id,
      status: "PENDING", // শুধু PENDING চেক করবো
    },
  });

  if (existingPayment) {
    console.log("Returning existing payment:", existingPayment.transactionId);

    if (isDemoMode || existingPayment.transactionId?.startsWith("demo_pi_")) {
      return {
        clientSecret: `${existingPayment.transactionId}_secret_demo`,
        paymentIntentId: existingPayment.transactionId, // <-- এখানে null হতে পারে?
      };
    }

    // Real Stripe এর ক্ষেত্রে retrieve করবো
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        existingPayment.transactionId!, // <-- এখানে ! দিয়ে বলছি: "ভাই, আমি জানি এটা null না"
      );

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: existingPayment.transactionId!,
      };
    } catch (_err) {
      console.log("Old intent not found on Stripe, creating new one");
      // fall through to create new
    }
  }

  // নতুন Payment Intent বানাও (Demo বা Real)
  let paymentIntent: { id: string; client_secret: string | null };
  let transactionId: string;

  if (isDemoMode) {
    transactionId = `demo_pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    paymentIntent = {
      id: transactionId,
      client_secret: `${transactionId}_secret_demo`,
    };
  } else {
    paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(booking.totalAmount) * 100),
      currency: "usd",
      metadata: {
        bookingId: booking.id,
        userId,
        eventId: booking.eventId,
      },
    });
    transactionId = paymentIntent.id;
  }

  // Persist the payment row (one row per booking)
  const paymentData = {
    amount: booking.totalAmount,
    transactionId,
    paymentMethod: isDemoMode ? "demo" : "stripe",
    status: "PENDING" as const,
  };

  if (existingPayment) {
    // A previous intent died — refresh the single row instead of creating
    // a duplicate (payments.bookingId is unique).
    await prisma.payment.update({
      where: { id: existingPayment.id },
      data: paymentData,
    });
  } else {
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        ...paymentData,
      },
    });
  }

  return {
    clientSecret: paymentIntent.client_secret!,
    paymentIntentId: transactionId,
  };
};

const confirmPayment = async (paymentIntentId: string, userId: string) => {
  if (!paymentIntentId) {
    throw new ApiError(400, "Payment Intent ID is required");
  }
  const payment = await prisma.payment.findUnique({
    where: { transactionId: paymentIntentId },
    include: {
      booking: true,
    },
  });

  if (!payment) {
    throw new ApiError(404, "Payment not found");
  }

  if (payment.booking.userId !== userId) {
    throw new ApiError(403, "You do not own this payment");
  }

  if (payment.status === "COMPLETED") {
    return { success: true, message: "Payment already confirmed" };
  }

  const isDemoPayment = paymentIntentId.startsWith("demo_pi_");

  if (isDemoMode && isDemoPayment) {
    // Explicit dev-only demo flag — auto-approve.
    console.log("🎭 DEMO MODE: Auto-approving payment:", paymentIntentId);
  } else {
    // Production: the intent must exist on Stripe as succeeded AND match
    // the amount we recorded — client claims are never trusted.
    let paymentIntent: Stripe.PaymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      console.error("Stripe verification error:", error);
      throw new ApiError(400, "Failed to verify payment with Stripe");
    }

    if (paymentIntent.status !== "succeeded") {
      throw new ApiError(400, "Payment is not completed on Stripe");
    }
    if (paymentIntent.amount !== Math.round(Number(payment.amount) * 100)) {
      throw new ApiError(400, "Payment amount does not match the booking");
    }
  }

  await completePayment(payment.id, payment.bookingId, payment.booking.eventId);

  return { success: true, message: "Payment confirmed successfully" };
};

/**
 * Shared completion path used by both the client confirm endpoint and the
 * Stripe webhook: mark the payment COMPLETED, the booking CONFIRMED, and the
 * event FULL once it reaches capacity.
 */
const completePayment = async (paymentId: string, bookingId: string, eventId: string) => {
  await prisma.$transaction([
    prisma.payment.update({
      where: { id: paymentId },
      data: { status: "COMPLETED" },
    }),
    prisma.booking.update({
      where: { id: bookingId },
      data: { status: "CONFIRMED" },
    }),
  ]);

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { status: true, maxParticipants: true },
  });

  if (event?.status === "OPEN") {
    const activeCount = await prisma.booking.count({
      where: { eventId, status: { in: ["PENDING", "CONFIRMED"] } },
    });
    if (activeCount >= event.maxParticipants) {
      await prisma.event.update({ where: { id: eventId }, data: { status: "FULL" } });
    }
  }
};

/** Refund a COMPLETED payment on cancellation (skipped for demo payments). */
const refundBookingPayment = async (paymentId: string) => {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status !== "COMPLETED") return;

  const isDemoPayment = payment.transactionId?.startsWith("demo_pi_");

  if (!isDemoPayment && payment.transactionId) {
    try {
      await stripe.refunds.create({ payment_intent: payment.transactionId });
    } catch (error) {
      console.error("Stripe refund failed:", error);
      throw new ApiError(400, "Refund failed; booking was not cancelled");
    }
  }

  await prisma.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED" } });
};

/** Stripe webhook: authoritative payment confirmation, signature-verified. */
const handleStripeWebhook = async (rawBody: Buffer, signature: string | undefined) => {
  if (!config.webhook_secret_key) {
    throw new ApiError(400, "Webhook is not configured");
  }
  if (!signature) {
    throw new ApiError(400, "Missing Stripe signature");
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, config.webhook_secret_key);
  } catch {
    throw new ApiError(400, "Invalid Stripe signature");
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const payment = await prisma.payment.findUnique({
      where: { transactionId: intent.id },
      include: { booking: { select: { eventId: true } } },
    });

    if (payment && payment.status !== "COMPLETED") {
      await completePayment(payment.id, payment.bookingId, payment.booking.eventId);
    }
  }

  return { received: true };
};

const getPaymentHistory = async (userId: string, options: IPaginationOptions = {}) => {
  const { page, limit, skip } = paginationHelper.calculatePagination(options);

  const where = { booking: { userId } };

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        booking: {
          include: {
            event: {
              select: {
                title: true,
                eventDate: true,
                location: true,
              },
            },
          },
        },
      },
    }),
    prisma.payment.count({ where }),
  ]);

  return { meta: { page, limit, total }, data: payments };
};

export const PaymentService = {
  createPaymentIntent,
  confirmPayment,
  refundBookingPayment,
  handleStripeWebhook,
  getPaymentHistory,
};
