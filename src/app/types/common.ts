import type { UserRole } from "../module/user/user.interface.js";

export type IJWTPayload = {
  id: string;
  email: string;
  role: UserRole;
};
