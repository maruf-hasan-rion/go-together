import httpStatus from "http-status";
import type { Request } from "express";
import ApiError from "./ApiError.js";

/**
 * Multipart forms send their JSON payload as a `data` string field.
 * Parses it safely so malformed input becomes a 400 instead of a crash.
 */
export const parseMultipartJson = (req: Request): Record<string, unknown> => {
  const raw = (req.body as { data?: unknown })?.data;

  if (raw === undefined || raw === null) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Missing multipart 'data' field");
  }

  if (typeof raw === "object") {
    return raw as Record<string, unknown>;
  }

  if (typeof raw !== "string") {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid multipart 'data' field");
  }

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid JSON in multipart 'data' field");
  }
};
