import { describe, expect, it } from "vitest";

import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  paginate,
  resolvePageParams,
  totalPagesFor,
} from "./pagination";

describe("resolvePageParams", () => {
  it("defaults page 1 and the default page size", () => {
    expect(resolvePageParams()).toEqual({ page: 1, pageSize: DEFAULT_PAGE_SIZE, offset: 0 });
  });

  it("computes the offset from page and pageSize", () => {
    expect(resolvePageParams({ page: 3, pageSize: 20 })).toEqual({
      page: 3,
      pageSize: 20,
      offset: 40,
    });
  });

  it("clamps page to at least 1", () => {
    expect(resolvePageParams({ page: 0 }).page).toBe(1);
    expect(resolvePageParams({ page: -5 }).page).toBe(1);
    expect(resolvePageParams({ page: NaN }).page).toBe(1);
  });

  it("clamps pageSize to [1, MAX] and floors fractions", () => {
    expect(resolvePageParams({ pageSize: 0 }).pageSize).toBe(1);
    expect(resolvePageParams({ pageSize: 5000 }).pageSize).toBe(MAX_PAGE_SIZE);
    expect(resolvePageParams({ page: 2.9 }).page).toBe(2);
  });
});

describe("totalPagesFor", () => {
  it("rounds up and is at least 1", () => {
    expect(totalPagesFor(0, 20)).toBe(1);
    expect(totalPagesFor(20, 20)).toBe(1);
    expect(totalPagesFor(21, 20)).toBe(2);
    expect(totalPagesFor(41, 20)).toBe(3);
  });

  it("handles a non-positive page size defensively", () => {
    expect(totalPagesFor(50, 0)).toBe(1);
  });
});

describe("paginate", () => {
  it("assembles a Paginated result", () => {
    const result = paginate([1, 2, 3], 45, { page: 2, pageSize: 20 });
    expect(result).toEqual({
      items: [1, 2, 3],
      total: 45,
      page: 2,
      pageSize: 20,
      totalPages: 3,
    });
  });
});
