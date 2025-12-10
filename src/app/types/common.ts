import { UserRole } from "../modules/user/user.interface";

export type IJWTPayload = {
  email: string;
  role: UserRole;
};
