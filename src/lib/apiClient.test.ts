import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiGet } from './apiClient';

const ORIGINAL_FETCH = globalThis.fetch;

function mockFetch(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): void {
  globalThis.fetch = vi.fn(() =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...extraHeaders },
      }),
    ),
  ) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

describe('apiClient 401 handler', () => {
  it('dispatches auth:unauthorized on 401 for protected paths', async () => {
    mockFetch({ message: 'Unauthorized' }, 401);
    const handler = vi.fn();
    window.addEventListener('auth:unauthorized', handler);
    try {
      await expect(apiGet('/orders', 'token')).rejects.toThrow();
      expect(handler).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener('auth:unauthorized', handler);
    }
  });

  it('does not dispatch on 401 for the /auth/me boot-time probe', async () => {
    mockFetch({ message: 'Unauthorized' }, 401);
    const handler = vi.fn();
    window.addEventListener('auth:unauthorized', handler);
    try {
      await expect(apiGet('/auth/me', 'token')).rejects.toThrow();
      expect(handler).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('auth:unauthorized', handler);
    }
  });

  it('does not dispatch on non-401 errors', async () => {
    mockFetch({ message: 'Forbidden' }, 403);
    const handler = vi.fn();
    window.addEventListener('auth:unauthorized', handler);
    try {
      await expect(apiGet('/orders', 'token')).rejects.toThrow();
      expect(handler).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('auth:unauthorized', handler);
    }
  });
});

describe('apiClient error envelope', () => {
  it('throws an ApiError carrying status + retryAfterSeconds from numeric Retry-After', async () => {
    mockFetch({ message: 'Rate limited' }, 429, { 'Retry-After': '17' });
    try {
      await apiGet('/orders', 'token');
      throw new Error('should not resolve');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(429);
      expect(apiErr.retryAfterSeconds).toBe(17);
      expect(apiErr.message).toBe('Rate limited');
    }
  });

  it('treats missing Retry-After as null on 429', async () => {
    mockFetch({ message: 'Rate limited' }, 429);
    try {
      await apiGet('/orders', 'token');
      throw new Error('should not resolve');
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(429);
      expect(apiErr.retryAfterSeconds).toBeNull();
    }
  });

  it('leaves retryAfterSeconds null on non-429 errors', async () => {
    mockFetch({ message: 'Forbidden' }, 403);
    try {
      await apiGet('/orders', 'token');
      throw new Error('should not resolve');
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(403);
      expect(apiErr.retryAfterSeconds).toBeNull();
    }
  });

  it('parses HTTP-date Retry-After into seconds from now', async () => {
    const future = new Date(Date.now() + 30_000).toUTCString();
    mockFetch({ message: 'Rate limited' }, 429, { 'Retry-After': future });
    try {
      await apiGet('/orders', 'token');
      throw new Error('should not resolve');
    } catch (err) {
      const apiErr = err as ApiError;
      // Allow a tick of clock drift in CI — should be ~30s, certainly between 25 and 35.
      expect(apiErr.retryAfterSeconds).toBeGreaterThanOrEqual(25);
      expect(apiErr.retryAfterSeconds).toBeLessThanOrEqual(35);
    }
  });
});
