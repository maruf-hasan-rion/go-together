import type { Response } from "express";

type FlattenedDecimal = { s: number; e: number; d: number[] };

/**
 * Rebuild a number from a base-1e7 digit array (decimal.js internals) so a
 * Decimal that already lost its prototype — e.g. `{ s: 1, e: 2, d: [400] }`
 * from a prior JSON round-trip — still serializes as a real number.
 */
const decodeBase1e7 = (s: number, e: number, d: number[]): number => {
  const digits = d.map((n, i) => (i === 0 ? String(n) : String(n).padStart(7, "0"))).join("");
  return s * Number(digits) * 10 ** (e - (digits.length - 1));
};

const hasToNumber = (value: unknown): value is { toNumber: () => number } =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { toNumber?: unknown }).toNumber === "function";

const isFlattenedDecimal = (value: unknown): value is FlattenedDecimal =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as FlattenedDecimal).s === "number" &&
  typeof (value as FlattenedDecimal).e === "number" &&
  Array.isArray((value as FlattenedDecimal).d);

/**
 * Recursively convert Prisma Decimal values to plain numbers so money fields
 * serialize as JSON numbers (Decimal's own toJSON would emit strings).
 */
const normalize = (value: unknown): unknown => {
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) return value.map(normalize);

  if (typeof value === "object") {
    if (value instanceof Date) return value;

    if (hasToNumber(value)) return value.toNumber();
    if (isFlattenedDecimal(value)) return decodeBase1e7(value.s, value.e, value.d);

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
