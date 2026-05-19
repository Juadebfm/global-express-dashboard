import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiPost } from './apiClient';

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

describe('apiClient 423 lockout handler', () => {
  it('dispatches auth:locked with the lockedUntil ISO string on 423', async () => {
    const lockedUntil = new Date(Date.now() + 60_000).toISOString();
    mockFetch(
      {
        success: false,
        message: 'Account locked due to too many failed attempts.',
        lockedUntil,
      },
      423,
    );
    const handler = vi.fn();
    window.addEventListener('auth:locked', handler);
    try {
      await expect(
        apiPost('/internal/auth/login', { email: 'a@b.test', password: 'x' }),
      ).rejects.toThrow();
      expect(handler).toHaveBeenCalledTimes(1);
      const detail = (handler.mock.calls[0][0] as CustomEvent).detail as {
        lockedUntil: string;
      };
      expect(detail.lockedUntil).toBe(lockedUntil);
    } finally {
      window.removeEventListener('auth:locked', handler);
    }
  });

  it('does not dispatch when the 423 body lacks lockedUntil', async () => {
    mockFetch({ message: 'Locked' }, 423);
    const handler = vi.fn();
    window.addEventListener('auth:locked', handler);
    try {
      await expect(apiPost('/internal/auth/login', {})).rejects.toThrow();
      expect(handler).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('auth:locked', handler);
    }
  });

  it('does not dispatch on non-423 errors', async () => {
    mockFetch({ message: 'Bad credentials' }, 401);
    const handler = vi.fn();
    window.addEventListener('auth:locked', handler);
    try {
      await expect(apiPost('/internal/auth/login', {})).rejects.toThrow();
      expect(handler).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('auth:locked', handler);
    }
  });
});
