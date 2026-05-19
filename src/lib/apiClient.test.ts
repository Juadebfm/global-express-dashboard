import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiGet } from './apiClient';

const ORIGINAL_FETCH = globalThis.fetch;

function mockFetch(body: unknown, status = 200): void {
  globalThis.fetch = vi.fn(() =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
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
