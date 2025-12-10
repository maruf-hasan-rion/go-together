export interface User {
  email: string;
  password: string;
  role: UserRole.USER;
}

export enum UserRole {
  USER = "USER",
  HOST = "HOST",
  ADMIN = "ADMIN",
}
