import { UserRole } from "../modules/user/user.interface";

export type IJWTPayload = {
  id: string;
  email: string;
  role: UserRole;
};
