import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { ZodError } from "zod";
import { Prisma } from "../../generated/prisma/client.js";
import config from "../../config/index.js";

const isProduction = config.node_env === "production";

/**
 * Central error handler. Maps known error types to proper HTTP status
 * codes, returns the standard envelope, and never leaks stack traces or
 * raw error objects to clients in production.
 */
const globalErrorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  // eslint-disable-next-line no-console
  console.error(err);

  let statusCode: number = err.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
  let message = err.message || "Something went wrong!";
  let error: unknown = err;
  let errors: unknown[] | undefined;

  if (err instanceof ZodError) {
    statusCode = httpStatus.BAD_REQUEST;
    message = "Validation failed";
    errors = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    error = errors;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      statusCode = httpStatus.CONFLICT;
      message = "Duplicate entry already exists";
      error = err.meta;
    } else if (err.code === "P1000") {
      statusCode = httpStatus.BAD_GATEWAY;
      message = "Authentication failed against database server";
      error = err.meta;
    } else if (err.code === "P2025") {
      statusCode = httpStatus.NOT_FOUND;
      message = "Record not found";
      error = err.meta;
    } else if (err.code === "P2003") {
      statusCode = httpStatus.BAD_REQUEST;
      message = "Foreign key constraint failed";
      error = err.meta;
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = httpStatus.BAD_REQUEST;
    message = "Invalid database request";
    error = err.message;
  } else if (
    err instanceof Prisma.PrismaClientUnknownRequestError ||
    err instanceof Prisma.PrismaClientInitializationError
  ) {
    statusCode = httpStatus.BAD_GATEWAY;
    message = "Database error";
    error = err.message;
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    ...(isProduction ? {} : { error }),
  });
};

export default globalErrorHandler;
