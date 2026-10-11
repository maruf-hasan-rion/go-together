import type { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { userPublicSelect } from "../../serializers/user.js";
import type { IJWTPayload } from "../../types/common.js";
import type { IPaginationOptions } from "../../types/pagination.js";
import ApiError from "../../utils/ApiError.js";
import { paginationHelper } from "../../utils/pagination.js";

type TAddReviewPayload = {
  eventId: string;
  rating: number;
  comment?: string;
};

const addReview = async (user: IJWTPayload, payload: TAddReviewPayload) => {
  const { rating, comment, eventId } = payload;

  const userInfo = await prisma.user.findUniqueOrThrow({
    where: { email: user.email },
  });

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, hostId: true },
  });

  if (!event) throw new ApiError(404, "Event not found");
  if (event.hostId === userInfo.id) {
    throw new ApiError(400, "You cannot review your own event");
  }

  // Eligibility: the reviewer must have an active booking for the event.
  const booking = await prisma.booking.findUnique({
    where: { userId_eventId: { userId: userInfo.id, eventId } },
  });

  if (!booking || !["CONFIRMED", "COMPLETED"].includes(booking.status)) {
    throw new ApiError(403, "You can only review events you have attended");
  }

  const existingReview = await prisma.review.findUnique({
    where: { userId_eventId: { userId: userInfo.id, eventId } },
  });

  if (existingReview) {
    throw new ApiError(409, "You have already reviewed this event");
  }

  return prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: {
        rating,
        comment,
        userId: userInfo.id,
        hostId: event.hostId,
        eventId,
      },
      include: {
        user: { select: userPublicSelect },
        host: { select: userPublicSelect },
        event: { select: { id: true, title: true } },
      },
    });

    // Keep the host's aggregates in sync in the same transaction.
    const agg = await tx.review.aggregate({
      where: { hostId: event.hostId },
      _avg: { rating: true },
      _count: { _all: true },
    });

    await tx.user.update({
      where: { id: event.hostId },
      data: {
        averageRating: agg._avg.rating ?? 0,
        totalReviews: agg._count._all,
      },
    });

    return created;
  });
};

const listReviews = async (where: Prisma.ReviewWhereInput, options: IPaginationOptions = {}) => {
  const { page, limit, skip } = paginationHelper.calculatePagination(options);

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: userPublicSelect },
        event: { select: { id: true, title: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);

  return { meta: { page, limit, total }, data: reviews };
};

const getEventReviews = async (eventId: string, options: IPaginationOptions = {}) =>
  listReviews({ eventId }, options);

const getHostReviews = async (hostId: string, options: IPaginationOptions = {}) =>
  listReviews({ hostId }, options);

const getMyReviewForEvent = async (user: IJWTPayload, eventId: string) => {
  const userInfo = await prisma.user.findUniqueOrThrow({
    where: { email: user.email },
  });

  return prisma.review.findUnique({
    where: { userId_eventId: { userId: userInfo.id, eventId } },
  });
};

const getPublicTestimonials = async (limit = 6) => {
  return prisma.review.findMany({
    where: { rating: { gte: 4 } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: { select: userPublicSelect },
      event: { select: { id: true, title: true } },
    },
  });
};

export const ReviewService = {
  addReview,
  getEventReviews,
  getHostReviews,
  getMyReviewForEvent,
  getPublicTestimonials,
};
