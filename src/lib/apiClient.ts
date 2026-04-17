import { getHttpFallbackMessage, sanitizeMessage } from './feedback';
import { useFeedbackStore } from '@/store/feedback/feedback.store';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 15000);

function showRateLimitToast(): void {
  useFeedbackStore.getState().pushMessage({
    tone: 'warning',
    message: 'Too many attempts. Please wait a moment and try again.',
  });
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
    if (response.status === 429) showRateLimitToast();

    const rawMessage =
      payload && typeof payload === 'object' && 'message' in payload
        ? (payload.message as string | undefined)
        : undefined;
    const fallback = getHttpFallbackMessage(response.status);
    throw new Error(sanitizeMessage(rawMessage, fallback));
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
    if (response.status === 429) showRateLimitToast();

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
    throw new Error(sanitizeMessage(rawMessage, fallback));
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
