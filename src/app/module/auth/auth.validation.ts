import { z } from "zod";

const register = z.object({
  body: z.object({
    fullName: z.string().min(1, "Name is required").max(100),
    email: z.string().min(1, "Email is required").email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
  }),
});

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
    newPassword: z.string().min(6, "New password must be at least 6 characters long"),
  }),
});

const forgotPassword = z.object({
  body: z.object({
    email: z.string().min(1, "Email is required").email("Invalid email"),
  }),
});

const resetPassword = z.object({
  body: z.object({
    token: z.string().min(1, "Reset token is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters long"),
  }),
});

const googleLogin = z.object({
  body: z.object({
    idToken: z.string().min(1, "Google credential is required"),
  }),
});

export const AuthValidation = {
  register,
  login,
  applyHost,
  changePassword,
  forgotPassword,
  resetPassword,
  googleLogin,
};
