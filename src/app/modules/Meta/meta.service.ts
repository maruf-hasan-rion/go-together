import { JwtPayload } from "jsonwebtoken";
import { UserRole } from "../user/user.interface";
import { prisma } from "../../shared/prisma";
import { EventStatus, PaymentStatus } from "../../../generated/prisma";

const fetchDashboardMetaData = async (user: JwtPayload) => {
  const payload: any = user as any;

  if (!payload || !payload.role) {
    throw new Error("Invalid user payload");
  }

  // ADMIN dashboard
  if (payload.role === UserRole.ADMIN) {
    const [
      totalUsers,
      totalAdmins,
      totalClients,
      totalHosts,
      totalEvents,
      totalCompletedEvents,
      totalRejectedEvents,
      paymentsSumRes,
      adminIncomeRes,
      pendingHostApplications,
      pendingEventApplications,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: UserRole.ADMIN } }),
      prisma.user.count({ where: { role: UserRole.USER } }),
      prisma.user.count({ where: { role: UserRole.HOST } }),
      await prisma.event.count({
        where: {
          status: {
            in: [EventStatus.OPEN, EventStatus.FULL],
          },
        },
      }),
      prisma.event.count({ where: { status: EventStatus.COMPLETED } }),
      prisma.event.count({ where: { status: EventStatus.CANCELLED } }),
      // prisma.payment.aggregate({ _sum: { amount: true }, where: { paymentStatus: { not: PaymentStatus.CANCELLED || PaymentStatus.PENDING || PaymentStatus.REFUNDED} } }),
      // prisma.admin.aggregate({ _sum: { income: true } }),
      // prisma.hostApplication.count({ where: { status: HostApplicationStatus.PENDING } }),
      // prisma.event.count({ where: { status: EventStatus.PENDING } })
    ] as any);

    // const totalPaymentsIncome = Number(paymentsSumRes._sum?.amount || 0);
    // const totalAdminIncome = Number(adminIncomeRes._sum?.income || 0);

    return {
      role: UserRole.ADMIN,
      totalUsers,
      totalAdmins,
      totalHosts,
      totalClients,
      totalEvents,
      totalCompletedEvents,
      totalRejectedEvents,
      // totalPaymentsIncome,
      // totalAdminIncome,
      pendingHostApplications,
      pendingEventApplications,
    };
  }

  // HOST dashboard
  if (payload.role === UserRole.HOST) {
    if (!payload.email) throw new Error("Host email missing in token");

    const host = await prisma.user.findUnique({
      where: { email: payload.email },
    });
    if (!host) throw new Error("Host profile not found");

    const [
      totalEvents,
      totalCompletedEvents,
      totalRejectedEvents,
      totalPendingEvents,
      paymentsSumRes,
    ] = await Promise.all([
      await prisma.event.count({
        where: {
          hostId: host.id,
          status: {
            in: [EventStatus.OPEN, EventStatus.FULL],
          },
        },
      }),
      prisma.event.count({
        where: { hostId: host.id, status: EventStatus.COMPLETED },
      }),
      prisma.event.count({
        where: { hostId: host.id, status: EventStatus.CANCELLED },
      }),
      prisma.event.count({
        where: { hostId: host.id, status: EventStatus.OPEN },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: PaymentStatus.COMPLETED },
      }),
    ] as any);

    const totalPaymentsIncome = Number(paymentsSumRes._sum?.amount || 0);

    return {
      role: UserRole.HOST,
      hostId: host.id,
      // hostName: host.name,
      totalEvents,
      totalCompletedEvents,
      totalRejectedEvents,
      totalPendingEvents,
      totalPaymentsIncome,
      // hostIncome: Number(host.income || 0),
      // hostRating: Number(host.rating || 0),
      // hostRatingCount: host.ratingCount || 0
    };
  }

  throw new Error("Dashboard not available for this user role");
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
      where: {
        status: {
          in: [EventStatus.OPEN, EventStatus.FULL],
        },
      },
    }),
    prisma.event.count({ where: { status: EventStatus.COMPLETED } }),
    // prisma.payment.count({ where: { paymentStatus: PaymentStatus.COMPLETED } }),
    prisma.user.count({ where: { role: UserRole.USER } }),
    prisma.user.count({ where: { role: UserRole.HOST } }),
    prisma.review.count(),
    // prisma.user.aggregate({ _avg: { rating: true } })
  ] as any);

  const averageHostRating = Number(avgHostRating._avg?.rating || 0).toFixed(2);

  return {
    stats: {
      totalEvents,
      totalCompletedEvents,
      totalSuccessfulPayments,
      totalClients,
      totalHosts,
      totalReviews,
      averageHostRating: Number(averageHostRating),
    },
    message: "Landing page statistics retrieved successfully",
  };
};

export const MetaService = {
  fetchDashboardMetaData,
  getLandingPageStats,
};
