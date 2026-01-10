import z from "zod";

const createUser = z.object({
  fullName: z.string().nonempty("Name is required"),
  email: z.string().nonempty("Email is required"),
  password: z
    .string({ error: "Password is required!" })
    .min(6, "Password must be at least 6 characters long"),
  profilePhoto: z.string().optional(),
});

// const updateUser = z.object({
//   fullName: z.string().optional(),

//   bio: z.string().min(5, "Bio must be at least 5 characters").optional(),

//   location: z
//     .string()
//     .min(2, "Location must be at least 2 characters")
//     .optional(),

//   profilePhoto: z.string().url("Invalid image URL").optional(),

//   interests: z
//     .array(z.string().min(2, "Interest must be at least 2 characters"))
//     .optional(),
// });

export const UserValidation = {
  createUser,
  // updateUser,
};
