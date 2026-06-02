import { afterEach, describe, expect, it, vi } from 'vitest';

import { getFileScanStatus } from './fileScansService';

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

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

describe('fileScansService', () => {
  it('hits /internal/file-scans/status with the encoded r2Key + Bearer token', async () => {
    mockFetch({
      success: true,
      data: { r2Key: 'receipts/order-123/file.png', status: 'clean', scannedAt: '2026-06-02T00:00:00Z' },
    });

    const result = await getFileScanStatus('jwt-token', 'receipts/order-123/file.png');

    expect(result.status).toBe('clean');
    expect(result.scannedAt).toBe('2026-06-02T00:00:00Z');

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toContain('/internal/file-scans/status');
    expect(String(url)).toContain('r2Key=receipts%2Forder-123%2Ffile.png');
    expect((init as RequestInit).method ?? 'GET').toBe('GET');
    expect(new Headers((init as RequestInit).headers).get('Authorization')).toBe('Bearer jwt-token');
  });

  it('unwraps the envelope and returns the inner payload', async () => {
    mockFetch({
      success: true,
      data: { r2Key: 'k', status: 'malicious', scannedAt: '2026-06-02T00:00:00Z' },
    });

    const result = await getFileScanStatus('t', 'k');

    expect(result.r2Key).toBe('k');
    expect(result.status).toBe('malicious');
  });

  it('propagates BE errors as ApiError', async () => {
    mockFetch({ message: 'r2Key not found' }, 404);
    await expect(getFileScanStatus('t', 'missing')).rejects.toThrow('r2Key not found');
  });
});
