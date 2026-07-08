/**
 * Thin API client for apps/api (NestJS).
 * Attaches the Supabase session JWT to every request automatically.
 */
import { createClient } from '@/lib/supabase/client';
import type { ApiResponse } from '@lados/shared-types';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

async function getToken(): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = await getToken();

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    // Network error (API server unreachable, CORS preflight failure, etc.)
    return { success: false, data: null, error: { code: 'NETWORK_ERROR', message: 'API server unreachable' } } as ApiResponse<T>;
  }

  if (res.status === 204) {
    return { success: true, data: null, error: null } as ApiResponse<T>;
  }

  const text = await res.text();
  if (!text) {
    return {
      success: res.ok,
      data: null,
      error: res.ok ? null : { code: String(res.status), message: res.statusText },
    } as ApiResponse<T>;
  }

  return JSON.parse(text) as ApiResponse<T>;
}

/** Multipart upload — does NOT set Content-Type so browser adds boundary automatically */
async function requestForm<T>(path: string, body: FormData): Promise<ApiResponse<T>> {
  const token = await getToken();
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    body,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res.json() as Promise<ApiResponse<T>>;
}

export const apiClient = {
  get:      <T>(path: string) => request<T>(path),
  post:     <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch:    <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put:      <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete:   <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  postForm: <T>(path: string, body: FormData) => requestForm<T>(path, body),
};

/**
 * Extracts a user-safe message out of an `ApiResponse.error`.
 *
 * `ApiResponse<T>['error']` is always an `ApiError` object
 * (`{code, message, details?}` — see `@lados/shared-types`), NEVER a bare
 * string. Several pages (approvals, analytics, departments, the canvas's
 * paused-run panel) were written checking `typeof res.error === 'string'`
 * before reading it — a check that can never be true against this API's
 * actual error shape, so every real failure (a validation error, a
 * business-rule rejection, a membership check) silently fell through to a
 * generic hardcoded fallback message instead of the real, user-safe
 * `error.message` the server provided. Found 2026-07-06 when a delegate()
 * 400 surfaced as an unhelpful "Delegation failed" with no indication of
 * why. Use this helper everywhere an `ApiResponse.error` is turned into
 * display text, instead of re-deriving the (wrong) check locally.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  return fallback;
}
