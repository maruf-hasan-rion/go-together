import { describe, expect, it } from "vitest";
import sendResponse from "../../src/app/utils/sendResponse.js";

const makeRes = () => {
  const res: any = {
    statusCode: 0,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res;
};

describe("sendResponse", () => {
  it("preserves falsy-but-valid data (0, false, empty string)", () => {
    for (const value of [0, false, ""]) {
      const res = makeRes();
      sendResponse(res, { statusCode: 200, success: true, message: "ok", data: value });
      expect(res.body.data).toBe(value);
    }
  });

  it("preserves an empty array", () => {
    const res = makeRes();
    sendResponse(res, { statusCode: 200, success: true, message: "ok", data: [] });
    expect(res.body.data).toEqual([]);
  });

  it("maps null/undefined data to null", () => {
    const res = makeRes();
    sendResponse(res, { statusCode: 200, success: true, message: "ok", data: undefined });
    expect(res.body.data).toBeNull();
  });

  it("places meta at the top level when provided", () => {
    const res = makeRes();
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "ok",
      meta: { page: 1, limit: 9, total: 3 },
      data: [],
    });
    expect(res.body.meta).toEqual({ page: 1, limit: 9, total: 3 });
  });

  it("defaults meta to null when absent", () => {
    const res = makeRes();
    sendResponse(res, { statusCode: 200, success: true, message: "ok", data: [] });
    expect(res.body.meta).toBeNull();
  });
});
