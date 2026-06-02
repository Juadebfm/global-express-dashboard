import { afterEach, describe, expect, it, vi } from 'vitest';

import { createSupportTicket } from './supportService';

const ORIGINAL_FETCH = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

describe('createSupportTicket Idempotency-Key', () => {
  it('forwards the caller-supplied idempotencyKey as a request header', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              id: 't1',
              subject: 's',
              category: 'general',
              priority: 'normal',
              status: 'open',
              createdAt: '',
              updatedAt: '',
            },
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    ) as typeof fetch;

    const key = 'zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz';
    await createSupportTicket(
      {
        subject: 's',
        category: 'general',
        priority: 'normal',
        description: 'help',
      } as never,
      'tok',
      key,
    );

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toContain('/support/tickets');
    expect((init as RequestInit).method).toBe('POST');
    expect(new Headers((init as RequestInit).headers).get('Idempotency-Key')).toBe(key);
  });
});
