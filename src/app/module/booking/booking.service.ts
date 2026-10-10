import { prisma } from "../../lib/prisma.js";
import { userPublicSelect } from "../../serializers/user.js";
import type { IPaginationOptions } from "../../types/pagination.js";
import ApiError from "../../utils/ApiError.js";
import { paginationHelper } from "../../utils/pagination.js";
import { PaymentService } from "../payment/payment.service.js";

interface CreateBookingData {
  eventId: string;
}

/** A PENDING booking that is never paid releases its seat after this window. */
export const PENDING_BOOKING_TTL_MS = 15 * 60 * 1000;

export const createBookingService = async (userId: string, data: CreateBookingData) => {
  const { eventId } = data;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      bookings: {
        where: { status: { in: ["CONFIRMED", "PENDING"] } },
        select: { id: true },
      },
    },
  });

  if (!event || event.deletedAt) throw new ApiError(404, "Event not found");
  if (event.status !== "OPEN") throw new ApiError(400, "Event is not available");
  if (event.hostId === userId) throw new ApiError(400, "You cannot book your own event");

  const amount = Number(event.joiningFee ?? 0);
  // Free events book straight to CONFIRMED; paid events go to PENDING and wait
  // for payment.
  const isFree = amount <= 0;

  // Check if user already booked
  let existingBooking = await prisma.booking.findUnique({
    where: {
      userId_eventId: {
        userId,
        eventId,
      },
    },
  });

  // Expire the caller's own stale PENDING booking so they can retry.
  if (
    existingBooking?.status === "PENDING" &&
    existingBooking.bookedAt.getTime() < Date.now() - PENDING_BOOKING_TTL_MS
  ) {
    existingBooking = await prisma.booking.update({
      where: { id: existingBooking.id },
      data: { status: "CANCELLED" },
    });
  }

  // allow re-book only if previously CANCELLED
  if (existingBooking && existingBooking.status !== "CANCELLED") {
    throw new ApiError(400, "Already booked this event");
  }

  // Transaction: lock the event row, re-check capacity, then create/renew the booking.
  const outcome = await prisma.$transaction(async (tx) => {
    // Serialize concurrent bookings for this event on the capacity check.
    await tx.$queryRaw`SELECT id FROM events WHERE id = ${eventId} FOR UPDATE`;

    // Release seats from abandoned PENDING bookings before counting.
    await tx.booking.updateMany({
      where: {
        eventId,
        status: "PENDING",
        bookedAt: { lt: new Date(Date.now() - PENDING_BOOKING_TTL_MS) },
      },
      data: { status: "CANCELLED" },
    });

    const activeCount = await tx.booking.count({
      where: { eventId, status: { in: ["CONFIRMED", "PENDING"] } },
    });

    if (activeCount >= event.maxParticipants) {
      return { full: true as const };
    }

    const booking =
      existingBooking?.status === "CANCELLED"
        ? await tx.booking.update({
            where: { id: existingBooking.id },
            data: {
              status: isFree ? "CONFIRMED" : "PENDING",
              totalAmount: amount,
            },
          })
        : await tx.booking.create({
            data: {
              userId,
              eventId,
              totalAmount: amount,
              status: isFree ? "CONFIRMED" : "PENDING",
            },
          });

    // Free booking: record a FREE payment so history/relations stay consistent.
    if (isFree) {
      await tx.payment.upsert({
        where: { bookingId: booking.id },
        create: { bookingId: booking.id, amount: 0, status: "FREE" },
        update: { amount: 0, status: "FREE" },
      });
    }

    // Last seat reserved -> mark the event FULL.
    if (activeCount + 1 >= event.maxParticipants) {
      await tx.event.update({ where: { id: eventId }, data: { status: "FULL" } });
    }

    return { full: false as const, booking };
  });

  // Persist FULL outside the transaction: throwing inside would roll the write back.
  if (outcome.full) {
    await prisma.event.update({ where: { id: eventId }, data: { status: "FULL" } }).catch(() => {});
    throw new ApiError(400, "Event is fully booked");
  }

  return outcome.booking;
};

// export const createBooking = async (
//   userId: string,
//   data: { eventId: string }
// ) => {
//   const { eventId } = data;

//   const event = await prisma.event.findUnique({ where: { id: eventId } });
//   if (!event) throw new ApiError(404, "Event not found");
//   if (event.status !== "OPEN")
//     throw new ApiError(400, "Event is not available for booking");
//   if (event.hostId === userId)
//     throw new ApiError(400, "You cannot book your own event");

//   const amount = Number(event.joiningFee ?? 0);
//   if (amount <= 0)
//     throw new ApiError(
//       400,
//       "Paid-only mode: joining fee must be greater than 0"
//     );

//   // capacity: reserved seats = PENDING + CONFIRMED
//   const activeCount = await prisma.booking.count({
//     where: { eventId, status: { in: ["PENDING", "CONFIRMED"] } },
//   });

//   if (activeCount >= event.maxParticipants) {
//     await prisma.event
//       .update({ where: { id: eventId }, data: { status: "FULL" } })
//       .catch(() => {});
//     throw new ApiError(400, "Event is fully booked");
//   }

//   // unique booking per user+event
//   const existing = await prisma.booking.findUnique({
//     where: { userId_eventId: { userId, eventId } },
//   });

//   if (existing && existing.status !== "CANCELLED") {
//     throw new ApiError(400, "You already booked this event");
//   }

//   const CLIENT_URL = process.env.CLIENT_URL!;

//   const result = await prisma.$transaction(async (tx) => {
//     const booking =
//       existing?.status === "CANCELLED"
//         ? await tx.booking.update({
//             where: { id: existing.id },
//             data: { status: "PENDING", totalAmount: amount },
//           })
//         : await tx.booking.create({
//             data: {
//               userId,
//               eventId,
//               totalAmount: amount,
//               status: "PENDING",
//             },
//           });

//     // Stripe Checkout
//     const session = await stripe.checkout.sessions.create({
//       mode: "payment",
//       line_items: [
//         {
//           price_data: {
//             currency: "bdt",
//             product_data: { name: event.title },
//             unit_amount: Math.round(amount * 100),
//           },
//           quantity: 1,
//         },
//       ],
//       success_url: `${CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
//       cancel_url: `${CLIENT_URL}/payment/cancel?bookingId=${booking.id}`,
//       metadata: {
//         bookingId: booking.id,
//         eventId,
//         userId,
//       },
//     });

//     // Payment: 1 per booking
//     await tx.payment.upsert({
//       where: { bookingId: booking.id },
//       create: {
//         bookingId: booking.id,
//         amount,
//         transactionId: session.id,
//         paymentMethod: "STRIPE",
//         status: "PENDING",
//       },
//       update: {
//         amount,
//         transactionId: session.id,
//         paymentMethod: "STRIPE",
//         status: "PENDING",
//       },
//     });

//     return { booking, paymentUrl: session.url! };
//   });

//   return result;
// };

export const getUserBookings = async (userId: string, options: IPaginationOptions = {}) => {
  const { page, limit, skip } = paginationHelper.calculatePagination(options);

  const where = { userId };

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip,
      take: limit,
      orderBy: { bookedAt: "desc" },
      include: {
        event: {
          include: {
            host: {
              select: {
                id: true,
                fullName: true,
                profilePhoto: true,
              },
            },
          },
        },
        payments: true,
      },
    }),
    prisma.booking.count({ where }),
  ]);

  return { meta: { page, limit, total }, data: bookings };
};

export const getBookingDetails = async (bookingId: string, userId: string, role: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      event: {
        include: {
          host: { select: userPublicSelect },
        },
      },
      payments: true,
      user: { select: userPublicSelect },
    },
  });

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  const isOwner = booking.userId === userId;
  const isHost = booking.event.hostId === userId;

  if (!isOwner && !isHost && role !== "ADMIN") {
    throw new ApiError(403, "You do not have permission to view this booking");
  }

  return booking;
};

export const cancelBooking = async (bookingId: string, userId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payments: true },
  });

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  if (booking.userId !== userId) {
    throw new ApiError(403, "You do not have permission to cancel this booking");
  }

  if (booking.status === "CANCELLED") {
    throw new ApiError(400, "Booking is already cancelled");
  }

  // Refund a paid booking before cancelling. The external Stripe call runs
  // first; if it fails the booking is left intact (see refundBookingPayment).
  const paidPayment = booking.payments.find((p) => p.status === "COMPLETED");
  if (paidPayment) {
    await PaymentService.refundBookingPayment(paidPayment.id);
  }

  // Cancel the booking and reopen the event (if it was FULL) atomically.
  return prisma.$transaction(async (tx) => {
    const updatedBooking = await tx.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" },
    });

    const event = await tx.event.findUnique({
      where: { id: booking.eventId },
      select: { status: true },
    });

    if (event?.status === "FULL") {
      await tx.event.update({
        where: { id: booking.eventId },
        data: { status: "OPEN" },
      });
    }

    return updatedBooking;
  });
};

/** Global sweeper: release seats held by abandoned PENDING bookings. */
export const expireStalePendingBookings = async () => {
  const result = await prisma.booking.updateMany({
    where: {
      status: "PENDING",
      bookedAt: { lt: new Date(Date.now() - PENDING_BOOKING_TTL_MS) },
    },
    data: { status: "CANCELLED" },
  });

  return result.count;
};

export const BookingService = {
  createBookingService,
  getUserBookings,
  getBookingDetails,
  cancelBooking,
  expireStalePendingBookings,
};
