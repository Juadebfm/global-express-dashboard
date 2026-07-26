import { afterEach, describe, expect, it, vi } from 'vitest';
import { getWarehousePricingQuote } from './ordersService';

const ORIGINAL_FETCH = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

describe('getWarehousePricingQuote', () => {
  it('posts the authoritative air quote input with its rate owner', async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve(new Response(JSON.stringify({
      success: true,
      data: { estimatedCostUsd: 42.5 },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))) as typeof fetch;

    const result = await getWarehousePricingQuote(
      { shipmentType: 'air', weightKg: 12.5, rateOwnerId: 'customer-1' },
      'staff-token',
    );

    expect(result.estimatedCostUsd).toBe(42.5);
    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toContain('/orders/warehouse-pricing-quote');
    expect((init as RequestInit).method).toBe('POST');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      shipmentType: 'air', weightKg: 12.5, rateOwnerId: 'customer-1',
    });
    expect(new Headers((init as RequestInit).headers).get('Authorization')).toBe('Bearer staff-token');
  });

  it('preserves ocean CBM payloads without a frontend weight conversion', async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve(new Response(JSON.stringify({
      success: true,
      data: { estimatedCostUsd: 90 },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))) as typeof fetch;

    await getWarehousePricingQuote({ shipmentType: 'ocean', cbm: 0.42 }, 'staff-token');

    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ shipmentType: 'ocean', cbm: 0.42 });
  });
});
