import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  updateClientLoginPermission,
  updateShipmentBatchPermission,
} from './adminUsersService';

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

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

describe('updateClientLoginPermission', () => {
  it('PATCHes the permission flag with Authorization', async () => {
    mockFetch({
      success: true,
      data: { id: 'u1', email: 'a@b.test', canProvisionClientLogin: true },
    });
    const result = await updateClientLoginPermission('token', 'u1', true);
    expect(result.canProvisionClientLogin).toBe(true);

    const { url, init } = lastCall();
    expect(url).toContain('/users/u1/client-login-permission');
    expect(init.method).toBe('PATCH');
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer token');
    expect(JSON.parse(init.body as string)).toEqual({ canProvisionClientLogin: true });
  });

  it('forwards false to revoke the permission', async () => {
    mockFetch({ success: true, data: { id: 'u1' } });
    await updateClientLoginPermission('token', 'u1', false);
    const { init } = lastCall();
    expect(JSON.parse(init.body as string)).toEqual({ canProvisionClientLogin: false });
  });
});

describe('updateShipmentBatchPermission', () => {
  it('PATCHes the shipment-batch flag with Authorization', async () => {
    mockFetch({
      success: true,
      data: { id: 'u1', canManageShipmentBatches: true },
    });
    const result = await updateShipmentBatchPermission('token', 'u1', true);
    expect(result.canManageShipmentBatches).toBe(true);

    const { url, init } = lastCall();
    expect(url).toContain('/users/u1/shipment-batch-permission');
    expect(init.method).toBe('PATCH');
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer token');
    expect(JSON.parse(init.body as string)).toEqual({ canManageShipmentBatches: true });
  });

  it('surfaces 403 errors from the server', async () => {
    mockFetch({ message: 'Forbidden' }, 403);
    await expect(updateShipmentBatchPermission('token', 'u1', true)).rejects.toThrow(
      'Forbidden',
    );
  });
});
