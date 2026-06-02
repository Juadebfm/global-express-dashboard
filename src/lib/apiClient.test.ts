import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ApiError,
  PROBLEM_TYPE,
  apiDelete,
  apiDeleteData,
  apiGet,
  apiGetData,
  apiPatch,
  apiPatchData,
  apiPostData,
  apiPostMultipart,
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

describe('RFC 7807 Problem Details parsing', () => {
  function mockProblem(problem: Record<string, unknown>, status: number): void {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify(problem), {
          status,
          headers: {
            'Content-Type': 'application/problem+json; charset=utf-8',
            'X-Request-ID': 'req-fallback',
          },
        }),
      ),
    ) as typeof fetch;
  }

  it('uses problem.detail as ApiError.message when present', async () => {
    mockProblem(
      {
        type: PROBLEM_TYPE.UNAUTHORIZED,
        title: 'Unauthorized',
        status: 401,
        detail: 'Invalid email or password',
        instance: '/api/v1/auth/login',
        requestId: 'req-2y',
      },
      401,
    );
    try {
      await apiGet('/auth/login', 'token');
      throw new Error('should not resolve');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.message).toBe('Invalid email or password');
      expect(apiErr.status).toBe(401);
      expect(apiErr.requestId).toBe('req-2y');
      expect(apiErr.problem?.type).toBe(PROBLEM_TYPE.UNAUTHORIZED);
    }
  });

  it('falls back to problem.title when detail is missing', async () => {
    mockProblem(
      {
        type: PROBLEM_TYPE.CONFLICT,
        title: 'Resource already exists',
        status: 409,
        // detail intentionally absent
        instance: '/api/v1/orders',
        requestId: 'req-9z',
      },
      409,
    );
    try {
      await apiGet('/orders');
      throw new Error('should not resolve');
    } catch (err) {
      expect((err as ApiError).message).toBe('Resource already exists');
    }
  });

  it('populates ApiError.problem.errors for 400 validation', async () => {
    mockProblem(
      {
        type: PROBLEM_TYPE.VALIDATION,
        title: 'Validation failed',
        status: 400,
        detail: 'One or more request fields failed validation.',
        instance: '/api/v1/payments/initialize',
        requestId: 'req-21',
        errors: [
          {
            path: ['amount'],
            message: 'Invalid input: expected number, received undefined',
            code: 'invalid_type',
          },
          { path: ['callbackUrl'], message: 'Required', code: 'invalid_type' },
        ],
      },
      400,
    );
    try {
      await apiGet('/payments', 'token');
      throw new Error('should not resolve');
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.problem?.errors).toHaveLength(2);
      expect(apiErr.problem?.errors?.[0].path).toEqual(['amount']);
      expect(apiErr.problem?.errors?.[1].path).toEqual(['callbackUrl']);
    }
  });

  it('reads lockedUntil as an extension field on a 423 problem', async () => {
    const lockedUntil = new Date(Date.now() + 60_000).toISOString();
    mockProblem(
      {
        type: PROBLEM_TYPE.LOCKED,
        title: 'Account locked',
        status: 423,
        detail: 'Too many failed attempts. Try again later.',
        instance: '/api/v1/auth/login',
        requestId: 'req-77',
        lockedUntil,
      },
      423,
    );
    try {
      await apiGet('/auth/login');
      throw new Error('should not resolve');
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(423);
      expect(apiErr.problem?.type).toBe(PROBLEM_TYPE.LOCKED);
      expect(apiErr.problem?.lockedUntil).toBe(lockedUntil);
    }
  });

  it('reads code as an extension field on a 422 CAPTCHA problem', async () => {
    mockProblem(
      {
        type: PROBLEM_TYPE.UNPROCESSABLE,
        title: 'Unprocessable',
        status: 422,
        detail: 'Captcha verification failed.',
        instance: '/api/v1/public/newsletter/subscribe',
        requestId: 'req-cf',
        code: 'captcha_failed',
      },
      422,
    );
    try {
      await apiGet('/public/newsletter');
      throw new Error('should not resolve');
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.problem?.code).toBe('captcha_failed');
    }
  });

  it('prefers problem.requestId but falls back to X-Request-ID header', async () => {
    // Problem body missing requestId — header should fill in.
    mockProblem(
      {
        type: PROBLEM_TYPE.NOT_FOUND,
        title: 'Not found',
        status: 404,
        detail: 'Resource not found',
        instance: '/api/v1/orders/x',
        // requestId omitted
      } as Record<string, unknown>,
      404,
    );
    try {
      await apiGet('/orders/x');
      throw new Error('should not resolve');
    } catch (err) {
      // The body had no requestId, but the header did.
      expect((err as ApiError).requestId).toBe('req-fallback');
    }
  });

  it('keeps the legacy { message } fallback for non-Problem bodies', async () => {
    mockFetch({ message: 'Forbidden' }, 403);
    try {
      await apiGet('/orders');
      throw new Error('should not resolve');
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.message).toBe('Forbidden');
      expect(apiErr.problem).toBeNull();
    }
  });
});

describe('Content-Type header', () => {
  function contentType(): string | null {
    const headers = lastCall().init.headers as HeadersInit;
    return new Headers(headers).get('Content-Type');
  }

  it('sets application/json on empty-body PATCH', async () => {
    mockFetch({ success: true, data: {} });
    await apiPatch('/users/u1', undefined, 'token');
    expect(contentType()).toBe('application/json');
  });

  it('sets application/json on empty-body DELETE', async () => {
    mockFetch({ success: true, data: {} });
    await apiDelete('/users/u1', 'token');
    expect(contentType()).toBe('application/json');
  });

  it('sets application/json on JSON-body POST', async () => {
    mockFetch({ success: true, data: {} });
    await apiPostData('/orders', { foo: 'bar' }, 'token');
    expect(contentType()).toBe('application/json');
  });

  it('does NOT set Content-Type on multipart uploads (browser owns the boundary)', async () => {
    mockFetch({ success: true, data: {} });
    const fd = new FormData();
    fd.set('file', new File(['x'], 'x.csv', { type: 'text/csv' }));
    await apiPostMultipart('/admin/imports/users-suppliers', fd, 'token');
    expect(contentType()).toBeNull();
  });
});
