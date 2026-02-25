import { getHttpFallbackMessage, sanitizeMessage } from './feedback';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    },
    ...options,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const rawMessage =
      payload && typeof payload === 'object' && 'message' in payload
        ? (payload.message as string | undefined)
        : undefined;
    const fallback = getHttpFallbackMessage(response.status);
    throw new Error(sanitizeMessage(rawMessage, fallback));
  }

  return payload as T;
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

export function apiPatch<T>(path: string, body?: unknown, token?: string): Promise<T> {
  return request<T>(path, {
    method: 'PATCH',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}
