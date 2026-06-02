import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiPost, apiPostData, apiPostMultipart } from './apiClient';

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

function lastHeader(name: string): string | null {
  const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
  const [, init] = calls.at(-1) ?? ['', {}];
  return new Headers((init as RequestInit).headers).get(name);
}

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

describe('Idempotency-Key header', () => {
  it('apiPost attaches Idempotency-Key when opts.idempotencyKey is set', async () => {
    mockFetch({ success: true, data: { id: 'x' } });
    await apiPost('/payments/initialize', { amount: 1 }, 'tok', {
      idempotencyKey: '11111111-2222-3333-4444-555555555555',
    });
    expect(lastHeader('Idempotency-Key')).toBe(
      '11111111-2222-3333-4444-555555555555',
    );
    // Authorization still attached too
    expect(lastHeader('Authorization')).toBe('Bearer tok');
  });

  it('apiPostData attaches Idempotency-Key (envelope unwrap path)', async () => {
    mockFetch({ success: true, data: { id: 'o1' } });
    await apiPostData('/orders', { foo: 'bar' }, 'tok', {
      idempotencyKey: 'abcd1234-abcd-1234-abcd-1234abcd1234',
    });
    expect(lastHeader('Idempotency-Key')).toBe(
      'abcd1234-abcd-1234-abcd-1234abcd1234',
    );
  });

  it('apiPostMultipart attaches Idempotency-Key (FormData path)', async () => {
    mockFetch({ success: true, data: {} });
    const fd = new FormData();
    fd.set('file', new File(['x'], 'x.csv', { type: 'text/csv' }));
    await apiPostMultipart('/uploads', fd, 'tok', {
      idempotencyKey: 'zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz',
    });
    expect(lastHeader('Idempotency-Key')).toBe(
      'zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz',
    );
  });

  it('does NOT attach Idempotency-Key when opts is omitted', async () => {
    mockFetch({ success: true, data: {} });
    await apiPost('/orders', {}, 'tok');
    expect(lastHeader('Idempotency-Key')).toBeNull();
  });

  it('does NOT attach Idempotency-Key when opts.idempotencyKey is empty string', async () => {
    mockFetch({ success: true, data: {} });
    await apiPost('/orders', {}, 'tok', { idempotencyKey: '' });
    expect(lastHeader('Idempotency-Key')).toBeNull();
  });
});
