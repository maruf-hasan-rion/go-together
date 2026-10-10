import { describe, expect, it } from "vitest";
import { parseMultipartJson } from "../../src/app/utils/multipartJson.js";

const req = (body: unknown) => ({ body }) as any;

describe("parseMultipartJson", () => {
  it("parses a JSON string payload", () => {
    expect(parseMultipartJson(req({ data: '{"title":"X"}' }))).toEqual({ title: "X" });
  });

  it("passes through an already-parsed object", () => {
    expect(parseMultipartJson(req({ data: { title: "X" } }))).toEqual({ title: "X" });
  });

  it("throws 400 when the data field is missing", () => {
    expect(() => parseMultipartJson(req({}))).toThrowError(/Missing multipart/);
  });

  it("throws 400 on invalid JSON", () => {
    expect(() => parseMultipartJson(req({ data: "{not json" }))).toThrowError(/Invalid JSON/);
  });
});
