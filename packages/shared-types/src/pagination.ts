/**
 * Pagination query parameters — used in list endpoints.
 */
export interface PaginationQuery {
  /** 1-based page number. Default: 1 */
  page?: number;
  /** Items per page. Default: 20, max: 100 */
  pageSize?: number;
}

/** Computed pagination values derived from PaginationQuery + total count */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** Helper to compute pagination meta */
export function computePaginationMeta(
  query: PaginationQuery,
  total: number,
): PaginationMeta {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
  const totalPages = Math.ceil(total / pageSize);

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
