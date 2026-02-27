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

async function requestBlob(
  path: string,
  options: RequestInit = {}
): Promise<{ blob: Blob; headers: Headers }> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      ...(options.headers as Record<string, string>),
    },
    ...options,
  });

  if (!response.ok) {
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
