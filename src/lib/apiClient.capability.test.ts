import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiGet, apiPatch } from './apiClient';
import type { CapabilityDeniedDetail } from '@/types';

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

/** The exact 403 body the backend's requireCapability guard returns. */
function capabilityDenial(capability = 'batches.finalise'): unknown {
  return {
    success: false,
    message: 'Forbidden — this action requires an additional capability.',
    code: 'CAPABILITY_REQUIRED',
    capability,
  };
}

async function captureDenial(
  run: () => Promise<unknown>,
): Promise<CapabilityDeniedDetail[]> {
  const seen: CapabilityDeniedDetail[] = [];
  const handler = (event: Event): void => {
    seen.push((event as CustomEvent<CapabilityDeniedDetail>).detail);
  };
  window.addEventListener('auth:capability-denied', handler);
  try {
    await expect(run()).rejects.toThrow();
  } finally {
    window.removeEventListener('auth:capability-denied', handler);
  }
  return seen;
}

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

describe('apiClient capability-denial handler', () => {
  it('dispatches auth:capability-denied with the named capability', async () => {
    mockFetch(capabilityDenial('batches.finalise'), 403);
    const seen = await captureDenial(() => apiPatch('/batches/b1/close', {}, 'token'));

    expect(seen).toHaveLength(1);
    expect(seen[0].capability).toBe('batches.finalise');
  });

  it('carries a null capability when the body names none', async () => {
    mockFetch({ success: false, message: 'Forbidden', code: 'CAPABILITY_REQUIRED' }, 403);
    const seen = await captureDenial(() => apiGet('/reports/revenue', 'token'));

    expect(seen).toHaveLength(1);
    expect(seen[0].capability).toBeNull();
  });

  // A plain role-guard 403 carries no `code`. It must NOT be treated as a
  // capability denial, or every ordinary permission error would needlessly
  // refetch the matrix and show a "you no longer have access" toast.
  it('ignores a 403 without the CAPABILITY_REQUIRED code', async () => {
    mockFetch({ success: false, message: 'Forbidden' }, 403);
    const handler = vi.fn();
    window.addEventListener('auth:capability-denied', handler);
    try {
      await expect(apiGet('/team', 'token')).rejects.toThrow();
      expect(handler).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('auth:capability-denied', handler);
    }
  });

  it('ignores a non-403 response carrying the code', async () => {
    mockFetch(capabilityDenial(), 422);
    const handler = vi.fn();
    window.addEventListener('auth:capability-denied', handler);
    try {
      await expect(apiGet('/orders', 'token')).rejects.toThrow();
      expect(handler).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('auth:capability-denied', handler);
    }
  });

  // The generic role-refresh signal still fires — a demotion can revoke both
  // a role and a capability, and AuthContext needs to re-probe the user.
  it('still dispatches auth:forbidden alongside the capability event', async () => {
    mockFetch(capabilityDenial(), 403);
    const forbidden = vi.fn();
    window.addEventListener('auth:forbidden', forbidden);
    try {
      await expect(apiGet('/reports/audit-logs', 'token')).rejects.toThrow();
      expect(forbidden).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener('auth:forbidden', forbidden);
    }
  });

  it('does not dispatch for the auth boot probe', async () => {
    mockFetch(capabilityDenial(), 403);
    const handler = vi.fn();
    window.addEventListener('auth:capability-denied', handler);
    try {
      await expect(apiGet('/auth/me', 'token')).rejects.toThrow();
      expect(handler).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('auth:capability-denied', handler);
    }
  });

  it('surfaces the backend message on the thrown ApiError', async () => {
    mockFetch(capabilityDenial(), 403);
    await expect(apiGet('/reports/revenue', 'token')).rejects.toThrow(
      /requires an additional capability/,
    );
  });
});
