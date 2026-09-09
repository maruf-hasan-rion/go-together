import { z } from "zod";

const createUser = z.object({
  fullName: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Invalid email"),
  password: z
    .string({ error: "Password is required!" })
    .min(6, "Password must be at least 6 characters long"),
  profilePhoto: z.string().optional(),
});

/**
 * Whitelist for profile updates — role, email, password and any other
 * column can never be set through this endpoint.
 */
const updateMyProfile = z.object({
  fullName: z.string().min(1, "Name is required").max(100).optional(),
  bio: z.string().max(2000).optional(),
  location: z.string().max(200).optional(),
  profilePhoto: z.string().url("Invalid image URL").optional(),
  interests: z
    .union([z.string(), z.array(z.string())])
    .transform((value) => {
      const raw = Array.isArray(value) ? value : value.split(",");
      return raw
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .slice(0, 20);
    })
    .optional(),
});

export const UserValidation = {
  createUser,
  updateMyProfile,
};
