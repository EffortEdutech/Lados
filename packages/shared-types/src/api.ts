/**
 * Standard API response envelope used by all QS-OS API endpoints.
 *
 * Success:  { success: true,  data: T,    error: null }
 * Failure:  { success: false, data: null, error: ApiError }
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  meta?: ResponseMeta;
}

export interface ApiError {
  /** Machine-readable error code, e.g. "NOT_FOUND", "UNAUTHORIZED" */
  code: string;
  /** Human-readable message safe to surface in the UI */
  message: string;
  /** Optional extra context — path, validation details, etc. */
  details?: Record<string, unknown>;
}

export interface ResponseMeta {
  /** ISO-8601 timestamp of when the response was generated */
  timestamp?: string;
  /** Total items count (pagination) */
  total?: number;
  page?: number;
  pageSize?: number;
  /** Sprint or version tag for debugging */
  sprint?: string;
}

/** Paginated list response wrapper */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}
