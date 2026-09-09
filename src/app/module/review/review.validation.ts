import { z } from "zod";

const addReviewValidationSchema = z.object({
  body: z.object({
    eventId: z.string({
      error: "Event Id is required",
    }),
    rating: z.number({
      error: "Rating is required",
    }),
    comment: z.string({
      error: "Comment is required",
    }),
  }),
});

export const ReviewValidation = {
  addReviewValidationSchema,
};
