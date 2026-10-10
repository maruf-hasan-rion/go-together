import type { JwtPayload } from "jsonwebtoken";
import { EventStatus, PaymentStatus } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import ApiError from "../../utils/ApiError.js";
import { UserRole } from "../user/user.interface.js";

const fetchDashboardMetaData = async (user: JwtPayload) => {
  const payload: any = user as any;

  if (!payload?.role) {
    throw new ApiError(400, "Invalid user payload");
  }

  // ADMIN dashboard
  if (payload.role === UserRole.ADMIN) {
    const [
      totalUsers,
      totalAdmins,
      totalHosts,
      totalClients,
      totalEvents,
      totalCompletedEvents,
      totalCancelledEvents,
      pendingHostApplications,
      paymentsSum,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: UserRole.ADMIN } }),
      prisma.user.count({ where: { role: UserRole.HOST } }),
      prisma.user.count({ where: { role: UserRole.USER } }),
      prisma.event.count({
        where: { status: { in: [EventStatus.OPEN, EventStatus.FULL] } },
      }),
      prisma.event.count({ where: { status: EventStatus.COMPLETED } }),
      prisma.event.count({ where: { status: EventStatus.CANCELLED } }),
      prisma.hostApplication.count({ where: { status: "PENDING" } }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: PaymentStatus.COMPLETED },
      }),
    ]);

    return {
      role: UserRole.ADMIN,
      totalUsers,
      totalAdmins,
      totalClients,
      totalHosts,
      totalEvents,
      totalCompletedEvents,
      totalRejectedEvents: totalCancelledEvents,
      pendingHostApplications,
      pendingEventApplications: 0,
      totalPaymentsIncome: Number(paymentsSum._sum.amount ?? 0),
      totalAdminIncome: 0,
    };
  }

  // HOST dashboard
  if (payload.role === UserRole.HOST) {
    if (!payload.email) throw new ApiError(400, "Host email missing in token");

    const host = await prisma.user.findUnique({
      where: { email: payload.email },
    });
    if (!host) throw new ApiError(404, "Host profile not found");

    const [totalEvents, totalCompletedEvents, totalCancelledEvents, totalOpenEvents, paymentsSum] =
      await Promise.all([
        prisma.event.count({
          where: { hostId: host.id, status: { in: [EventStatus.OPEN, EventStatus.FULL] } },
        }),
        prisma.event.count({ where: { hostId: host.id, status: EventStatus.COMPLETED } }),
        prisma.event.count({ where: { hostId: host.id, status: EventStatus.CANCELLED } }),
        prisma.event.count({ where: { hostId: host.id, status: EventStatus.OPEN } }),
        // Income is scoped to this host's events (via booking -> event -> hostId).
        prisma.payment.aggregate({
          _sum: { amount: true },
          where: {
            status: PaymentStatus.COMPLETED,
            booking: { event: { hostId: host.id } },
          },
        }),
      ]);

    const hostIncome = Number(paymentsSum._sum.amount ?? 0);

    return {
      role: UserRole.HOST,
      hostId: host.id,
      hostName: host.fullName,
      totalEvents,
      totalCompletedEvents,
      totalRejectedEvents: totalCancelledEvents,
      totalPendingEvents: totalOpenEvents,
      totalPaymentsIncome: hostIncome,
      hostIncome,
      hostRating: Number(host.averageRating ?? 0),
      hostRatingCount: host.totalReviews ?? 0,
    };
  }

  // USER dashboard
  if (payload.role === UserRole.USER) {
    const user = await prisma.user.findUnique({
      where: { email: payload.email },
    });
    if (!user) throw new ApiError(404, "User not found");

    const [totalBookings, confirmedBookings, completedBookings] = await Promise.all([
      prisma.booking.count({ where: { userId: user.id } }),
      prisma.booking.count({ where: { userId: user.id, status: "CONFIRMED" } }),
      prisma.booking.count({ where: { userId: user.id, status: "COMPLETED" } }),
    ]);

    return {
      role: UserRole.USER,
      totalBookings,
      confirmedBookings,
      completedBookings,
    };
  }

  throw new ApiError(403, "Dashboard not available for this user role");
};

const getLandingPageStats = async () => {
  const [
    totalEvents,
    totalCompletedEvents,
    totalSuccessfulPayments,
    totalClients,
    totalHosts,
    totalReviews,
    avgHostRating,
  ] = await Promise.all([
    prisma.event.count({
      where: { status: { in: [EventStatus.OPEN, EventStatus.FULL] } },
    }),
    prisma.event.count({ where: { status: EventStatus.COMPLETED } }),
    prisma.payment.count({ where: { status: PaymentStatus.COMPLETED } }),
    prisma.user.count({ where: { role: UserRole.USER } }),
    prisma.user.count({ where: { role: UserRole.HOST } }),
    prisma.review.count(),
    prisma.user.aggregate({ _avg: { averageRating: true } }),
  ]);

  return {
    stats: {
      totalEvents,
      totalCompletedEvents,
      totalSuccessfulPayments,
      totalClients,
      totalHosts,
      totalReviews,
      averageHostRating: Number(Number(avgHostRating._avg.averageRating ?? 0).toFixed(2)),
    },
    message: "Landing page statistics retrieved successfully",
  };
};

export const MetaService = {
  fetchDashboardMetaData,
  getLandingPageStats,
};
