import { describe, expect, it } from "vitest";
import { catalogPageSchema, catalogPagination, parsePageNumber } from "./catalog-schema";

describe("catalog contract", () => {
  it("accepts an empty page from the backend", () => {
    expect(catalogPageSchema.parse({ items: [], page: 0, size: 12, totalElements: 0, totalPages: 0 }).items).toEqual([]);
  });

  it("rejects a malformed identifier at the HTTP trust boundary", () => {
    expect(() => catalogPageSchema.parse({ items: [{ id: "not-a-uuid", slug: "valid", name: "Item", description: "", createdAt: "2026-11-11T00:00:00Z" }], page: 0, size: 12, totalElements: 1, totalPages: 1 })).toThrow();
  });

  it.each([undefined, "-1", "10001", "NaN", "1.5", ["1", "2"], "1e3"])("bounds untrusted page input %s", (input) => {
    expect(parsePageNumber(input)).toBe(0);
  });

  it("accepts valid bounded pages", () => {
    expect(parsePageNumber("12")).toBe(12);
    expect(parsePageNumber("10000")).toBe(10000);
  });

  it("stops navigation at the API page limit even when more data exists", () => {
    expect(catalogPagination(9999, 10002)).toEqual({ previousPage: 9998, nextPage: 10000 });
    expect(catalogPagination(10000, 10002)).toEqual({ previousPage: 9999, nextPage: null });
    expect(catalogPagination(0, 1)).toEqual({ previousPage: null, nextPage: null });
    expect(catalogPagination(1, 2)).toEqual({ previousPage: 0, nextPage: null });
  });

  it("rejects response page numbers outside the OpenAPI bound", () => {
    expect(catalogPageSchema.safeParse({ items: [], page: 10001, size: 12, totalElements: 0, totalPages: 0 }).success).toBe(false);
  });
});
