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

describe('cf-turnstile-response header', () => {
  it('apiPost attaches cf-turnstile-response when opts.turnstileToken is set', async () => {
    mockFetch({ success: true, data: { message: 'Subscribed' } });
    await apiPost('/public/newsletter/subscribe', { email: 'a@b.test' }, undefined, {
      turnstileToken: 'cf-token-1',
    });
    expect(lastHeader('cf-turnstile-response')).toBe('cf-token-1');
    // No Authorization on public endpoints
    expect(lastHeader('Authorization')).toBeNull();
  });

  it('apiPostData attaches the header (envelope unwrap path)', async () => {
    mockFetch({ success: true, data: { ticket: { id: 't1' } } });
    await apiPostData('/public/d2d/intake', { fullName: 'Ada' }, undefined, {
      turnstileToken: 'cf-token-2',
    });
    expect(lastHeader('cf-turnstile-response')).toBe('cf-token-2');
  });

  it('apiPostMultipart attaches the header (FormData path)', async () => {
    mockFetch({ success: true, data: {} });
    const fd = new FormData();
    fd.set('file', new File(['x'], 'x.csv', { type: 'text/csv' }));
    await apiPostMultipart('/public/some-multipart', fd, undefined, {
      turnstileToken: 'cf-token-3',
    });
    expect(lastHeader('cf-turnstile-response')).toBe('cf-token-3');
  });

  it('does NOT attach the header when opts is omitted', async () => {
    mockFetch({ success: true, data: {} });
    await apiPost('/some/endpoint', {});
    expect(lastHeader('cf-turnstile-response')).toBeNull();
  });

  it('does NOT attach the header when opts.turnstileToken is empty string', async () => {
    mockFetch({ success: true, data: {} });
    await apiPost('/some/endpoint', {}, undefined, { turnstileToken: '' });
    expect(lastHeader('cf-turnstile-response')).toBeNull();
  });

  it('composes with Authorization on authed POSTs that also need turnstile', async () => {
    // Hypothetical case — for completeness. Today's 5 captcha-protected
    // endpoints are all unauthenticated, but the apiClient layer composes
    // both headers cleanly.
    mockFetch({ success: true, data: {} });
    await apiPost('/some/endpoint', {}, 'jwt-token', { turnstileToken: 'cf-x' });
    expect(lastHeader('Authorization')).toBe('Bearer jwt-token');
    expect(lastHeader('cf-turnstile-response')).toBe('cf-x');
  });
});
