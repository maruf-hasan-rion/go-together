import { z } from "zod";

const login = z.object({
  body: z.object({
    email: z.string().min(1, "Email is required").email("Invalid email"),
    password: z.string().min(1, "Password is required"),
  }),
});

const applyHost = z.object({
  body: z.object({
    message: z.string().min(10, "Please tell us more about yourself"),
  }),
});

const changePassword = z.object({
  body: z.object({
    oldPassword: z.string().min(1, "Old password is required"),
    newPassword: z
      .string()
      .min(6, "New password must be at least 6 characters long"),
  }),
});

export const AuthValidation = {
  login,
  applyHost,
  changePassword,
};
