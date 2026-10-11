import { z } from "zod";

const addReviewValidationSchema = z.object({
  body: z.object({
    eventId: z.string({
      error: "Event Id is required",
    }),
    rating: z
      .number({
        error: "Rating is required",
      })
      .int("Rating must be a whole number")
      .min(1, "Rating must be at least 1")
      .max(5, "Rating must be at most 5"),
    comment: z.string().trim().max(1000, "Comment must be at most 1000 characters").optional(),
  }),
});

export const ReviewValidation = {
  addReviewValidationSchema,
};
