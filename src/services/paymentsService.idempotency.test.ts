import { afterEach, describe, expect, it, vi } from 'vitest';

import { initializePayment } from './paymentsService';

const ORIGINAL_FETCH = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

describe('initializePayment Idempotency-Key', () => {
  it('forwards the caller-supplied idempotencyKey as a request header', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ success: true, data: { authorizationUrl: 'x', reference: 'r1' } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    ) as typeof fetch;

    const key = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    await initializePayment(
      'tok',
      { orderId: 'o1', amount: 1000, callbackUrl: 'https://example.test/cb' } as never,
      key,
    );

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toContain('/payments/initialize');
    expect((init as RequestInit).method).toBe('POST');
    expect(new Headers((init as RequestInit).headers).get('Idempotency-Key')).toBe(key);
  });
});
