/** Shared, framework-agnostic pagination helpers. */

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type PageParams = { page: number; pageSize: number; offset: number };

function clampInt(value: number, min: number, max: number): number {
  const n = Math.floor(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/** Normalise page/pageSize into valid ranges and compute the SQL offset. */
export function resolvePageParams(input: { page?: number; pageSize?: number } = {}): PageParams {
  const pageSize = clampInt(input.pageSize ?? DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
  const page = clampInt(input.page ?? 1, 1, Number.MAX_SAFE_INTEGER);
  return { page, pageSize, offset: (page - 1) * pageSize };
}

/** Number of pages for a result set (always at least 1). */
export function totalPagesFor(total: number, pageSize: number): number {
  if (pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(Math.max(0, total) / pageSize));
}

/** Assemble a Paginated result from a page of items and the total count. */
export function paginate<T>(
  items: T[],
  total: number,
  params: { page: number; pageSize: number },
): Paginated<T> {
  return {
    items,
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: totalPagesFor(total, params.pageSize),
  };
}
