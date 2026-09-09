import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import type { Secret } from "jsonwebtoken";
import config from "../../config/index.js";
import { UserStatus } from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import type { IJWTPayload } from "../types/common.js";
import ApiError from "../utils/ApiError.js";
import { jwtHelper } from "../utils/jwt.js";

/**
 * Reference-style guard: auth(...roles).
 * Token source: Authorization: Bearer header first, then the accessToken
 * cookie. The token role is checked against the allowed roles, and the
 * account is re-validated against the database on every request so a
 * BLOCKED or soft-deleted user loses access immediately.
 */
const auth = (...roles: string[]) => {
  return async (req: Request & { user?: IJWTPayload }, _res: Response, next: NextFunction) => {
    try {
      const headerToken = req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice("Bearer ".length)
        : undefined;
      const token = headerToken || req.cookies?.accessToken;

      if (!token) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "You are not authorized!");
      }

      const verifyUser = jwtHelper.verifyToken(
        token,
        config.jwt.jwt_secret as Secret,
      ) as IJWTPayload;

      if (roles.length && !roles.includes(verifyUser.role)) {
        throw new ApiError(httpStatus.FORBIDDEN, "You are not authorized for this action!");
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: verifyUser.id },
        select: { status: true, deletedAt: true },
      });

      if (!dbUser || dbUser.status !== UserStatus.ACTIVE || dbUser.deletedAt) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "Your account is not active!");
      }

      req.user = verifyUser;

      next();
    } catch (err) {
      next(err);
    }
  };
};

export default auth;
