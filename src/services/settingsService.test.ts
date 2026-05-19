import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getShipmentTypesCatalog,
  updateShipmentTypesCatalog,
} from './settingsService';
import type { ShipmentTypeCatalogItem } from '@/types';

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

describe('getShipmentTypesCatalog', () => {
  it('GETs /settings/shipment-types with Authorization and unwraps the envelope', async () => {
    const items: ShipmentTypeCatalogItem[] = [
      {
        key: 'air',
        label: 'Air',
        isActive: true,
        coreShipmentType: 'air',
        estimatorMode: 'CALCULATED',
        requiredFields: [],
      },
    ];
    mockFetch({ success: true, data: { items, updatedAt: '2026-05-19' } });
    const result = await getShipmentTypesCatalog('token');
    expect(result.items).toHaveLength(1);
    expect(result.updatedAt).toBe('2026-05-19');

    const { url, init } = lastCall();
    expect(url).toContain('/settings/shipment-types');
    expect(init.method ?? 'GET').toBe('GET');
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer token');
  });
});

describe('updateShipmentTypesCatalog', () => {
  it('PATCHes the upsert payload and unwraps the summary envelope', async () => {
    mockFetch({
      success: true,
      data: {
        summary: { createdKeys: ['new'], updatedKeys: [], deletedKeys: ['old'] },
        items: [],
        updatedAt: '2026-05-19',
      },
    });
    const result = await updateShipmentTypesCatalog('token', {
      items: [
        {
          key: 'new',
          label: 'New mode',
          isActive: true,
          coreShipmentType: 'air',
          estimatorMode: 'CALCULATED',
        },
      ],
      deleteKeys: ['old'],
    });
    expect(result.summary.createdKeys).toEqual(['new']);
    expect(result.summary.deletedKeys).toEqual(['old']);

    const { url, init } = lastCall();
    expect(url).toContain('/settings/shipment-types');
    expect(init.method).toBe('PATCH');
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer token');
    const body = JSON.parse(init.body as string);
    expect(body.items?.[0]?.key).toBe('new');
    expect(body.deleteKeys).toEqual(['old']);
  });

  it('surfaces 403 forbidden errors', async () => {
    mockFetch({ message: 'Forbidden' }, 403);
    await expect(
      updateShipmentTypesCatalog('token', { items: [] }),
    ).rejects.toThrow('Forbidden');
  });
});
