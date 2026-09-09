import { prisma } from "../../lib/prisma.js";
import { userPublicSelect } from "../../serializers/user.js";
import type { IJWTPayload } from "../../types/common.js";

const addReview = async (user: IJWTPayload, payload: any) => {
  const { rating, comment, eventId } = payload;

  const userInfo = await prisma.user.findUniqueOrThrow({
    where: { email: user.email },
  });

  const event = await prisma.event.findUniqueOrThrow({
    where: { id: eventId },
    // include: { currentParticipant: true },
  });

  if (event.status !== "COMPLETED") {
    throw new Error("You can only review events that have been completed");
  }

  // const hasJoined = event.participants.some(
  //   (p: { userId: any }) => p.userId === userInfo.id
  // );

  // if (!hasJoined) {
  //   throw new Error("You can only review events you have joined");
  // }

  const review = await prisma.review.create({
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

  return review;
};

const getAllReview = async () => {
  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          // profile: true,
        },
      },
      host: {
        select: {
          id: true,
          // profile: true,
        },
      },
      event: {
        select: {
          id: true,
          title: true,
          // date: true,
        },
      },
    },
  });

  return reviews;
};

export const ReviewService = {
  addReview,
  getAllReview,
};
