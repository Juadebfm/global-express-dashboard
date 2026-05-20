import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ApiError,
  apiDeleteData,
  apiGet,
  apiGetData,
  apiPatchData,
  apiPostData,
  apiPostMultipartData,
  apiPutData,
} from './apiClient';

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

function lastCall(): { url: string; init: RequestInit } {
  const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
  const [url, init] = calls.at(-1) ?? ['', {}];
  return { url: String(url), init: init as RequestInit };
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

describe('envelope unwrap helpers', () => {
  it('apiGetData returns response.data directly', async () => {
    mockFetch({ success: true, data: { id: 'u1', email: 'a@b.test' } });
    const result = await apiGetData<{ id: string; email: string }>('/users/u1', 'token');
    expect(result).toEqual({ id: 'u1', email: 'a@b.test' });
  });

  it('apiPostData sends a JSON body and unwraps the response', async () => {
    mockFetch({ success: true, data: { id: 'o1', status: 'created' } });
    const result = await apiPostData<{ id: string; status: string }>(
      '/orders',
      { recipientName: 'Ada' },
      'token',
    );
    expect(result.id).toBe('o1');
    const { init } = lastCall();
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ recipientName: 'Ada' });
  });

  it('apiPatchData PATCHes and unwraps', async () => {
    mockFetch({ success: true, data: { id: 'u1' } });
    await apiPatchData('/users/u1', { isActive: false }, 'token');
    expect(lastCall().init.method).toBe('PATCH');
  });

  it('apiPutData PUTs and unwraps', async () => {
    mockFetch({ success: true, data: { types: [] } });
    await apiPutData('/internal/settings/special-packaging', { types: [] }, 'token');
    expect(lastCall().init.method).toBe('PUT');
  });

  it('apiDeleteData DELETEs and unwraps', async () => {
    mockFetch({ success: true, data: { message: 'User deleted' } });
    const result = await apiDeleteData<{ message: string }>('/users/u1', 'token');
    expect(result.message).toBe('User deleted');
    expect(lastCall().init.method).toBe('DELETE');
  });

  it('apiPostMultipartData uploads FormData and unwraps', async () => {
    mockFetch({
      success: true,
      data: {
        dryRun: true,
        summary: { totalRows: 0, created: 0, updated: 0, skipped: 0, errors: 0 },
        results: [],
      },
    });
    const fd = new FormData();
    fd.set('file', new File(['email\n'], 'x.csv', { type: 'text/csv' }));
    const result = await apiPostMultipartData<{ dryRun: boolean }>(
      '/admin/imports/users-suppliers',
      fd,
      'token',
    );
    expect(result.dryRun).toBe(true);
    expect(lastCall().init.body).toBeInstanceOf(FormData);
  });

  it('still propagates HTTP errors through .then chain', async () => {
    mockFetch({ message: 'Forbidden' }, 403);
    await expect(apiGetData('/orders', 'token')).rejects.toThrow('Forbidden');
  });
});
