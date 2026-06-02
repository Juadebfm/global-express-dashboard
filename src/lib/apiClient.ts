import { getHttpFallbackMessage, sanitizeMessage } from './feedback';
import { useFeedbackStore } from '@/store/feedback/feedback.store';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 15000);

// RFC 7807 Problem Details — the backend now returns this shape on every
// error status (400, 401, 403, 404, 409, 422, 423, 429, 500, 503) with
// Content-Type `application/problem+json; charset=utf-8`.
//
// Known `type` URIs are enumerated in PROBLEM_TYPE for switch-on safety.
// Extension fields (`lockedUntil`, `code: "captcha_failed"`, etc.) appear
// at the top level, NOT nested — so the index signature catches them.
export interface ProblemValidationError {
  path: (string | number)[];
  message: string;
  code?: string;
}

export interface Problem {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  requestId: string;
  errors?: ProblemValidationError[];
  // Extension fields live at the top level. Callers that know they're
  // looking at e.g. `/problems/locked` can read `problem.lockedUntil as string`.
  [extension: string]: unknown;
}

export const PROBLEM_TYPE = {
  VALIDATION: '/problems/validation',
  UNAUTHORIZED: '/problems/unauthorized',
  FORBIDDEN: '/problems/forbidden',
  NOT_FOUND: '/problems/not-found',
  CONFLICT: '/problems/conflict',
  UNPROCESSABLE: '/problems/unprocessable',
  LOCKED: '/problems/locked',
  RATE_LIMITED: '/problems/rate-limited',
  INTERNAL: '/problems/internal',
  SERVICE_UNAVAILABLE: '/problems/service-unavailable',
} as const;

// Typed error preserved for the HTTP failure path. Callers that want to
// inspect status / retry-after / requestId / per-field validation errors on
// a thrown error can `instanceof ApiError`; everything else still treats it
// as a plain Error via .message.
export class ApiError extends Error {
  status: number;
  retryAfterSeconds: number | null;
  /**
   * The server's request correlation ID, surfaced in error UIs so a user
   * can quote it in support. Sourced from `problem.requestId` when the body
   * parsed as Problem Details, otherwise from the `X-Request-ID` header,
   * otherwise null.
   */
  requestId: string | null;
  /**
   * The parsed Problem Details body when the response was
   * `application/problem+json`. null for non-problem responses (legacy or
   * network errors). Callers can read `err.problem?.errors` for per-field
   * validation messages, or `err.problem?.code` for extension fields like
   * the CAPTCHA / lockout signals.
   */
  problem: Problem | null;

  constructor(
    message: string,
    status: number,
    retryAfterSeconds: number | null,
    requestId: string | null = null,
    problem: Problem | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
    this.requestId = requestId;
    this.problem = problem;
  }
}

// Type guard — does the parsed body look like an RFC 7807 Problem? We don't
// require all fields (server omits `errors` outside validation, may omit
// `instance` in edge cases), but `type` + `title` + `status` are the core.
function isProblem(payload: unknown): payload is Problem {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.type === 'string' &&
    typeof p.title === 'string' &&
    typeof p.status === 'number'
  );
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

// 423 Locked — backend's Problem body has `lockedUntil: <ISO 8601>` as an
// extension field at the top level. Dispatch a global event so the login
// screen can show a countdown without each form re-parsing the response.
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

// Build an ApiError from a non-OK Response + its already-parsed body.
// Picks the best human-readable message (problem.detail → problem.title →
// per-status HTTP fallback) and the best requestId (problem.requestId →
// X-Request-ID header → null).
function buildApiError(
  response: Response,
  payload: unknown,
  retryAfterSeconds: number | null,
): ApiError {
  const fallback = getHttpFallbackMessage(response.status);
  const headerRequestId = response.headers.get('x-request-id');

  if (isProblem(payload)) {
    const message = sanitizeMessage(
      payload.detail || payload.title,
      fallback,
    );
    return new ApiError(
      message,
      response.status,
      retryAfterSeconds,
      payload.requestId || headerRequestId,
      payload,
    );
  }

  // Legacy / non-conforming body — fall back to the pre-RFC-7807 shape
  // (`{ message }`) so endpoints that haven't migrated yet still surface a
  // sensible string, and X-Request-ID still threads through.
  const legacyMessage =
    payload && typeof payload === 'object' && 'message' in payload
      ? ((payload as { message?: unknown }).message as string | undefined)
      : undefined;
  return new ApiError(
    sanitizeMessage(legacyMessage, fallback),
    response.status,
    retryAfterSeconds,
    headerRequestId,
    null,
  );
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { headers: optionHeaders, body, ...restOptions } = options;
  const headers = new Headers(optionHeaders);
  // Set Content-Type: application/json on every request EXCEPT multipart
  // uploads (FormData), where the browser must own the multipart boundary.
  // This covers both JSON-body requests and the empty-body PATCH/DELETE
  // case — Fastify on the backend rejects empty bodies unless the header
  // is present, and some HTTP clients strip the header when the body is
  // undefined, so we set it explicitly.
  if (!(body instanceof FormData) && !headers.has('Content-Type')) {
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

    throw buildApiError(response, payload, retryAfter);
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

    // Try to parse JSON; if the server sent text/plain or no body, fall
    // back to the raw text so the message isn't lost.
    let payload: unknown = await response.clone().json().catch(() => null);
    if (payload === null) {
      const text = await response.clone().text().catch(() => '');
      if (text) payload = { message: text };
    }
    if (response.status === 423) dispatchAccountLocked(payload);

    throw buildApiError(response, payload, retryAfter);
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

// ── Envelope-unwrapping helpers ──────────────────────────────────────────────
//
// The backend wraps successful responses as `{ success: true, data: <T> }` on
// every route except the legacy `/auth/*` family, which returns a flat shape.
// These `*Data` helpers fetch and return the inner `T` directly so services
// don't each re-implement `response.data`.
//
// Legacy auth/* and any caller that needs the raw payload (e.g. when there's
// no envelope, or when the caller wants `pagination` alongside `data`) should
// keep using the raw `apiGet/apiPost/...` helpers above.

type Envelope<T> = { success?: boolean; data: T };

function unwrap<T>(payload: Envelope<T>): T {
  return payload.data;
}

export function apiGetData<T>(path: string, token?: string): Promise<T> {
  return apiGet<Envelope<T>>(path, token).then(unwrap);
}

export function apiPostData<T>(path: string, body?: unknown, token?: string): Promise<T> {
  return apiPost<Envelope<T>>(path, body, token).then(unwrap);
}

export function apiPutData<T>(path: string, body?: unknown, token?: string): Promise<T> {
  return apiPut<Envelope<T>>(path, body, token).then(unwrap);
}

export function apiPatchData<T>(path: string, body?: unknown, token?: string): Promise<T> {
  return apiPatch<Envelope<T>>(path, body, token).then(unwrap);
}

export function apiDeleteData<T>(path: string, token?: string, body?: unknown): Promise<T> {
  return apiDelete<Envelope<T>>(path, token, body).then(unwrap);
}

export function apiPostMultipartData<T>(
  path: string,
  formData: FormData,
  token?: string
): Promise<T> {
  return apiPostMultipart<Envelope<T>>(path, formData, token).then(unwrap);
}
