import z from "zod";

const createUserValidationSchema = z.object({
  fullName: z.string().nonempty("Name is required"),
  email: z.string().nonempty("Email is required"),
  password: z.string(),
});

export const UserValidation = {
  createUserValidationSchema,
};
