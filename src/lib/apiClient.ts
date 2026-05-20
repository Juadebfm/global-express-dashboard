import { getHttpFallbackMessage, sanitizeMessage } from './feedback';
import { useFeedbackStore } from '@/store/feedback/feedback.store';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 15000);

// Typed error preserved for the HTTP failure path. Callers that want to
// inspect status / retry-after on a thrown error can `instanceof ApiError`;
// everything else still treats it as an Error via .message.
export class ApiError extends Error {
  status: number;
  retryAfterSeconds: number | null;
  constructor(message: string, status: number, retryAfterSeconds: number | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

// Parse Retry-After per RFC 7231 — either a non-negative integer (seconds)
// or an HTTP-date. Returns null when missing or unparseable.
function parseRetryAfter(headerValue: string | null): number | null {
  if (!headerValue) return null;
  const asInt = Number(headerValue);
  if (Number.isFinite(asInt) && asInt >= 0) return Math.ceil(asInt);
  const asDate = Date.parse(headerValue);
  if (Number.isNaN(asDate)) return null;
  const delta = Math.ceil((asDate - Date.now()) / 1000);
  return delta > 0 ? delta : 0;
}

function showRateLimitToast(retryAfterSeconds: number | null): void {
  const suffix =
    retryAfterSeconds && retryAfterSeconds > 0
      ? ` Please wait ${retryAfterSeconds}s and try again.`
      : ' Please wait a moment and try again.';
  useFeedbackStore.getState().pushMessage({
    tone: 'warning',
    message: `Too many attempts.${suffix}`,
  });
}

// Single 401 handler — apiClient dispatches a global `auth:unauthorized`
// event, AuthContext subscribes and clears in-house session state. Per-caller
// code no longer needs to special-case 401.
//
// Skip the dispatch for the `/auth/me` boot-time probe used by AuthContext
// itself, because that caller already treats 401 as "no session" and handles
// its own cleanup. Without this skip, the very first checkAuth() on app load
// would loop through the global handler.
function isAuthBootProbe(path: string): boolean {
  return path === '/auth/me' || path === '/users/me';
}

function dispatchUnauthorized(path: string): void {
  if (isAuthBootProbe(path)) return;
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('auth:unauthorized'));
}

// 423 Locked — backend returns { message, lockedUntil: <ISO 8601> } after 5
// failed login attempts. Dispatch a global event so the login screen can
// show a countdown without each form re-parsing the response body.
function dispatchAccountLocked(payload: unknown): void {
  if (typeof window === 'undefined') return;
  const lockedUntil =
    payload && typeof payload === 'object' && 'lockedUntil' in payload
      ? (payload as { lockedUntil?: unknown }).lockedUntil
      : undefined;
  if (typeof lockedUntil !== 'string') return;
  window.dispatchEvent(
    new CustomEvent('auth:locked', { detail: { lockedUntil } }),
  );
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { headers: optionHeaders, body, ...restOptions } = options;
  const headers = new Headers(optionHeaders);
  if (typeof body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...restOptions,
      body,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    const rawMessage = error instanceof Error ? error.message : undefined;
    throw new Error(
      sanitizeMessage(
        rawMessage,
        'Unable to reach the server. Please check your internet and try again.'
      )
    );
  } finally {
    globalThis.clearTimeout(timeoutId);
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401) dispatchUnauthorized(path);
    if (response.status === 423) dispatchAccountLocked(payload);
    const retryAfter =
      response.status === 429 ? parseRetryAfter(response.headers.get('Retry-After')) : null;
    if (response.status === 429) showRateLimitToast(retryAfter);

    const rawMessage =
      payload && typeof payload === 'object' && 'message' in payload
        ? (payload.message as string | undefined)
        : undefined;
    const fallback = getHttpFallbackMessage(response.status);
    throw new ApiError(sanitizeMessage(rawMessage, fallback), response.status, retryAfter);
  }

  return payload as T;
}

async function requestBlob(
  path: string,
  options: RequestInit = {}
): Promise<{ blob: Blob; headers: Headers }> {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: {
        ...(options.headers as Record<string, string>),
      },
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    const rawMessage = error instanceof Error ? error.message : undefined;
    throw new Error(
      sanitizeMessage(
        rawMessage,
        'Unable to reach the server. Please check your internet and try again.'
      )
    );
  } finally {
    globalThis.clearTimeout(timeoutId);
  }

  if (!response.ok) {
    if (response.status === 401) dispatchUnauthorized(path);
    const retryAfter =
      response.status === 429 ? parseRetryAfter(response.headers.get('Retry-After')) : null;
    if (response.status === 429) showRateLimitToast(retryAfter);

    let rawMessage: string | undefined;

    const payload = await response.clone().json().catch(() => null);
    if (payload && typeof payload === 'object' && 'message' in payload) {
      rawMessage = payload.message as string | undefined;
    }

    if (!rawMessage) {
      const text = await response.clone().text().catch(() => '');
      rawMessage = text || undefined;
    }

    const fallback = getHttpFallbackMessage(response.status);
    throw new ApiError(sanitizeMessage(rawMessage, fallback), response.status, retryAfter);
  }

  return {
    blob: await response.blob(),
    headers: response.headers,
  };
}

export function apiGet<T>(path: string, token?: string): Promise<T> {
  return request<T>(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export function apiPost<T>(path: string, body?: unknown, token?: string): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function apiPut<T>(path: string, body?: unknown, token?: string): Promise<T> {
  return request<T>(path, {
    method: 'PUT',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function apiPatch<T>(path: string, body?: unknown, token?: string): Promise<T> {
  return request<T>(path, {
    method: 'PATCH',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function apiDelete<T>(path: string, token?: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function apiGetBlob(
  path: string,
  token?: string
): Promise<{ blob: Blob; headers: Headers }> {
  return requestBlob(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

// Multipart form-data POST. The browser must set the multipart boundary, so we
// do NOT set Content-Type ourselves — the request helper only forces JSON when
// the body is a string.
export function apiPostMultipart<T>(
  path: string,
  formData: FormData,
  token?: string
): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
}
