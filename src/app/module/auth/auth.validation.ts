import { z } from "zod";

const changePassword = z.object({
  body: z.object({
    oldPassword: z.string().min(1, "Old password is required"),
    newPassword: z
      .string()
      .min(6, "New password must be at least 6 characters long"),
  }),
});

export const AuthValidation = {
  changePassword,
};
