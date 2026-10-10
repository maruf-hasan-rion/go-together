import { z } from "zod";

export const ContactValidation = {
  submitMessage: z.object({
    body: z.object({
      name: z.string().min(1, "Name is required").max(120),
      email: z.string().min(1, "Email is required").email("Invalid email"),
      message: z.string().min(10, "Please write at least 10 characters").max(2000),
    }),
  }),
};
