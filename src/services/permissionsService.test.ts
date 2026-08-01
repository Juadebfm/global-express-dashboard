import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getCapabilityCatalogue,
  getMyPermissions,
  getUserPermissions,
  grantedKeys,
  setUserCapability,
} from './permissionsService';
import type { Capability } from '@/types';

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

function lastCall(): { url: string; init: RequestInit } {
  const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
  const [url, init] = calls.at(-1) ?? ['', {}];
  return { url: String(url), init: init as RequestInit };
}

function capability(overrides: Partial<Capability> = {}): Capability {
  return {
    key: 'batches.manage',
    name: 'Manage dispatch batches',
    minimumRole: 'admin',
    description: 'Manage dispatch batches',
    includes: [],
    eligible: true,
    granted: true,
    ...overrides,
  };
}

const MATRIX = {
  userId: '11111111-1111-1111-1111-111111111111',
  role: 'staff' as const,
  isActive: true,
  capabilities: [capability()],
};

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

describe('getMyPermissions', () => {
  it('unwraps the envelope and sends the bearer token', async () => {
    mockFetch({ success: true, data: MATRIX });
    const result = await getMyPermissions('token');

    expect(result).toEqual(MATRIX);
    const { url, init } = lastCall();
    expect(url).toContain('/permissions/me');
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer token');
  });
});

describe('getCapabilityCatalogue', () => {
  it('returns the catalogue array', async () => {
    mockFetch({ success: true, data: [{ key: 'leads.manage' }] });
    const result = await getCapabilityCatalogue('token');

    expect(result).toHaveLength(1);
    expect(lastCall().url).toContain('/permissions/catalogue');
  });
});

describe('getUserPermissions', () => {
  it('targets the requested user id', async () => {
    mockFetch({ success: true, data: MATRIX });
    await getUserPermissions('token', 'user-9');

    expect(lastCall().url).toContain('/permissions/users/user-9');
  });
});

describe('setUserCapability', () => {
  it('PUTs { enabled } at the capability path and returns the refreshed matrix', async () => {
    mockFetch({ success: true, data: MATRIX });
    const result = await setUserCapability('token', 'user-9', 'batches.manage', true);

    expect(result).toEqual(MATRIX);
    const { url, init } = lastCall();
    expect(url).toContain('/permissions/users/user-9/batches.manage');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual({ enabled: true });
  });

  it('sends enabled:false when revoking', async () => {
    mockFetch({ success: true, data: MATRIX });
    await setUserCapability('token', 'user-9', 'batches.manage', false);

    expect(JSON.parse(lastCall().init.body as string)).toEqual({ enabled: false });
  });
});

describe('grantedKeys', () => {
  it('includes only granted capabilities', () => {
    const keys = grantedKeys([
      capability({ key: 'batches.manage', granted: true }),
      capability({ key: 'leads.manage', granted: false }),
    ]);

    expect(keys.has('batches.manage')).toBe(true);
    expect(keys.has('leads.manage')).toBe(false);
  });

  // The distinction the whole contract turns on: eligible means the role
  // *could* hold it, which is not access.
  it('excludes an eligible-but-not-granted capability', () => {
    const keys = grantedKeys([
      capability({ key: 'payments.verify', eligible: true, granted: false }),
    ]);

    expect(keys.has('payments.verify')).toBe(false);
    expect(keys.size).toBe(0);
  });

  it('returns an empty set for an empty matrix', () => {
    expect(grantedKeys([]).size).toBe(0);
  });
});
