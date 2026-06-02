import { afterEach, describe, expect, it, vi } from 'vitest';

import { createOrder } from './ordersService';

const ORIGINAL_FETCH = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

describe('createOrder Idempotency-Key', () => {
  it('forwards the caller-supplied idempotencyKey as a request header', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ success: true, data: { id: 'o1' } }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    ) as typeof fetch;

    const key = '11111111-2222-3333-4444-555555555555';
    await createOrder(
      {
        recipientName: 'Ada',
        recipientPhone: '+1234',
        recipientEmail: 'ada@example.test',
        orderDirection: 'outbound',
        weight: '1kg',
        declaredValue: '100',
        description: 'box',
        shipmentType: 'air',
      } as never,
      'tok',
      key,
    );

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toContain('/orders');
    expect((init as RequestInit).method).toBe('POST');
    expect(new Headers((init as RequestInit).headers).get('Idempotency-Key')).toBe(key);
  });
});
