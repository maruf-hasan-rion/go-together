import type { Response } from "express";

/**
 * Recursively convert Prisma Decimal values to plain numbers so money fields
 * serialize as JSON numbers (Decimal's own toJSON would emit strings).
 */
const normalize = (value: unknown): unknown => {
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) return value.map(normalize);

  if (typeof value === "object") {
    const obj = value as { constructor?: { name?: string }; toNumber?: () => number };
    if (obj.constructor?.name === "Decimal" && typeof obj.toNumber === "function") {
      return obj.toNumber();
    }
    if (value instanceof Date) return value;

    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = normalize(val);
    }
    return out;
  }

  return value;
};

const sendResponse = <T>(
  res: Response,
  jsonData: {
    statusCode: number;
    success: boolean;
    message: string;
    meta?: {
      page: number;
      limit: number;
      total: number;
      totalPage?: number;
    };
    data: T | null | undefined;
  },
) => {
  res.status(jsonData.statusCode).json({
    success: jsonData.success,
    message: jsonData.message,
    meta: jsonData.meta ?? null,
    data: normalize(jsonData.data) ?? null,
  });
};

export default sendResponse;
