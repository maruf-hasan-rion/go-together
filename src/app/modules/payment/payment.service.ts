import Stripe from "stripe";
import { prisma } from "../../shared/prisma";
import config from "../../../config";
import ApiError from "../../errors/ApiError";

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

const stripe = new Stripe(config.stripe_secret_key || "", {
  // apiVersion: "2025-11-17.clover",
});

// Demo mode check
const IS_DEMO_MODE =
  config.node_env === "development" || !config.stripe_secret_key;

// payment.service.ts (শুধু createPaymentIntent ফাংশন)

const createPaymentIntent = async (bookingId: string, userId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { event: true },
  });

  if (!booking) throw new ApiError(404, "Booking not found");
  if (booking.userId !== userId) throw new ApiError(403, "Unauthorized");
  if (booking.status !== "PENDING")
    throw new ApiError(400, "Booking is not pending");

  // আগে থেকে কোনো payment আছে কিনা চেক কর
  const existingPayment = await prisma.payment.findFirst({
    where: {
      bookingId: booking.id,
      status: "PENDING", // শুধু PENDING চেক করবো
    },
  });

  if (existingPayment) {
    console.log("Returning existing payment:", existingPayment.transactionId);

    if (IS_DEMO_MODE || existingPayment.transactionId?.startsWith("demo_pi_")) {
      return {
        clientSecret: `${existingPayment.transactionId}_secret_demo`,
        paymentIntentId: existingPayment.transactionId, // <-- এখানে null হতে পারে?
      };
    }

    // Real Stripe এর ক্ষেত্রে retrieve করবো
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        existingPayment.transactionId! // <-- এখানে ! দিয়ে বলছি: "ভাই, আমি জানি এটা null না"
      );

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: existingPayment.transactionId!,
      };
    } catch (err) {
      console.log("Old intent not found on Stripe, creating new one");
      // fall through to create new
    }
  }

  // নতুন Payment Intent বানাও (Demo বা Real)
  let paymentIntent;
  let transactionId: string;

  if (IS_DEMO_MODE) {
    transactionId = `demo_pi_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    paymentIntent = {
      id: transactionId,
      client_secret: `${transactionId}_secret_demo`,
    };
  } else {
    paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(booking.totalAmount * 100),
      currency: "usd",
      metadata: {
        bookingId: booking.id,
        userId,
        eventId: booking.eventId,
      },
    });
    transactionId = paymentIntent.id;
  }

  // DB তে সেভ করো
  const newPayment = await prisma.payment.create({
    data: {
      bookingId: booking.id,
      amount: booking.totalAmount,
      transactionId,
      paymentMethod: IS_DEMO_MODE ? "demo" : "stripe",
      status: "PENDING",
    },
  });

  return {
    clientSecret: paymentIntent.client_secret!,
    paymentIntentId: transactionId,
  };
};

const confirmPayment = async (paymentIntentId: string) => {
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

  if (payment.status === "COMPLETED") {
    return { success: true, message: "Payment already confirmed" };
  }

  let isPaymentSuccessful = false;

  if (IS_DEMO_MODE || paymentIntentId.startsWith("demo_pi_")) {
    // Demo mode: Auto-approve
    isPaymentSuccessful = true;
    console.log("🎭 DEMO MODE: Auto-approving payment:", paymentIntentId);
  } else {
    // Production: Verify with Stripe
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntentId
      );
      isPaymentSuccessful = paymentIntent.status === "succeeded";
    } catch (error) {
      console.error("Stripe verification error:", error);
      throw new ApiError(400, "Failed to verify payment with Stripe");
    }
  }

  if (isPaymentSuccessful) {
    // Update payment and booking in transaction
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: "COMPLETED" },
      }),
      prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: "CONFIRMED" },
      }),
    ]);

    return { success: true, message: "Payment confirmed successfully" };
  }

  throw new ApiError(400, "Payment verification failed");
};

const getPaymentHistory = async (userId: string) => {
  const payments = await prisma.payment.findMany({
    where: {
      booking: {
        userId,
      },
    },
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
    orderBy: { createdAt: "desc" },
  });

  return payments;
};

export const PaymentService = {
  createPaymentIntent,
  confirmPayment,
  getPaymentHistory,
};
