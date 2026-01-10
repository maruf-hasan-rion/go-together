import ApiError from "../../errors/ApiError";
import { stripe } from "../../helper/stripe";
import { prisma } from "../../shared/prisma";

interface CreateBookingData {
  eventId: string;
}

export const createBookingService = async (
  userId: string,
  data: CreateBookingData
) => {
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

  if (!event) throw new ApiError(404, "Event not found");
  if (event.status !== "OPEN")
    throw new ApiError(400, "Event is not available");
  if (event.hostId === userId)
    throw new ApiError(400, "You cannot book your own event");

  const amount = Number(event.joiningFee ?? 0);
  if (amount <= 0)
    throw new ApiError(
      400,
      "Paid-only mode: joining fee must be greater than 0"
    );

  // seats already taken (active bookings)
  const totalBookedSeats = event.bookings.length; // 1 booking = 1 seat in your schema
  const spotsLeft = event.maxParticipants - totalBookedSeats;

  if (spotsLeft <= 0) {
    throw new ApiError(400, "Event is fully booked");
  }

  // Check if user already booked
  const existingBooking = await prisma.booking.findUnique({
    where: {
      userId_eventId: {
        userId,
        eventId,
      },
    },
  });

  // allow re-book only if previously CANCELLED
  if (existingBooking && existingBooking.status !== "CANCELLED") {
    throw new ApiError(400, "Already booked this event");
  }

  // ---- Transaction: create/renew booking + create checkout + upsert payment + update event status
  return await prisma.$transaction(async (tx) => {
    // Re-check capacity INSIDE transaction (prevents race condition)
    const activeCount = await tx.booking.count({
      where: { eventId, status: { in: ["CONFIRMED", "PENDING"] } },
    });

    if (activeCount >= event.maxParticipants) {
      await tx.event
        .update({ where: { id: eventId }, data: { status: "FULL" } })
        .catch(() => {});
      throw new ApiError(400, "Event is fully booked");
    }

    const booking =
      existingBooking?.status === "CANCELLED"
        ? await tx.booking.update({
            where: { id: existingBooking.id },
            data: {
              status: "PENDING",
              totalAmount: amount,
            },
          })
        : await tx.booking.create({
            data: {
              userId,
              eventId,
              totalAmount: amount,
              status: "PENDING",
            },
          });

    return booking;
  });
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

export const getUserBookings = async (userId: string) => {
  const bookings = await prisma.booking.findMany({
    where: { userId },
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
  });

  return bookings;
};

export const getBookingDetails = async (bookingId: string, userId: string) => {
  // Verify host owns the event
  const event = await prisma.event.findUnique({
    where: { id: bookingId },
  });

  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  if (event.hostId !== userId) {
    throw new ApiError(
      403,
      "You do not have permission to view these bookings"
    );
  }

  const bookings = await prisma.booking.findMany({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profilePhoto: true,
        },
      },
      // payments: true,
    },
    orderBy: { bookedAt: "desc" },
  });

  return bookings;
};

export const cancelBooking = async (bookingId: string, userId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { event: true },
  });

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  if (booking.userId !== userId) {
    throw new ApiError(
      403,
      "You do not have permission to cancel this booking"
    );
  }

  if (booking.status === "CANCELLED") {
    throw new ApiError(400, "Booking is already cancelled");
  }

  // Update booking status
  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" },
  });

  // Update event status if it was full
  if (booking.event.status === "FULL") {
    await prisma.event.update({
      where: { id: booking.eventId },
      data: { status: "OPEN" },
    });
  }

  return updatedBooking;
};

export const BookingService = {
  createBookingService,
  getUserBookings,
  getBookingDetails,
  cancelBooking,
};
