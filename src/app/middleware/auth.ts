import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import type { Secret } from "jsonwebtoken";
import config from "../../config/index.js";
import type { IJWTPayload } from "../types/common.js";
import ApiError from "../utils/ApiError.js";
import { jwtHelper } from "../utils/jwt.js";

const auth = (...roles: string[]) => {
  return async (req: Request & { user?: IJWTPayload }, _res: Response, next: NextFunction) => {
    try {
      const token = req.cookies.accessToken;

      if (!token) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "You are not authorized!");
      }

      const verifyUser = jwtHelper.verifyToken(
        token,
        config.jwt.jwt_secret as Secret,
      ) as IJWTPayload;

      req.user = verifyUser;

      if (roles.length && !roles.includes(verifyUser.role)) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "You are not authorized!");
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

export default auth;
