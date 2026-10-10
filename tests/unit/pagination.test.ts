import { describe, expect, it } from "vitest";
import { paginationHelper } from "../../src/app/utils/pagination.js";

describe("paginationHelper.calculatePagination", () => {
  it("applies defaults (page 1, limit 9, sort createdAt desc)", () => {
    expect(paginationHelper.calculatePagination({})).toEqual({
      page: 1,
      limit: 9,
      skip: 0,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  });

  it("computes skip from page and limit", () => {
    const result = paginationHelper.calculatePagination({ page: 3, limit: 10 });
    expect(result.skip).toBe(20);
  });

  it("respects sortBy/sortOrder overrides", () => {
    const result = paginationHelper.calculatePagination({ sortBy: "eventDate", sortOrder: "asc" });
    expect(result.sortBy).toBe("eventDate");
    expect(result.sortOrder).toBe("asc");
  });
});
