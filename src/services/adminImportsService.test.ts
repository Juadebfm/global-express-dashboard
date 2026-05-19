import { afterEach, describe, expect, it, vi } from 'vitest';

import { importUsersSuppliers } from './adminImportsService';

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

function csvFile(): File {
  return new File(['email,role\nuser@example.com,user\n'], 'import.csv', {
    type: 'text/csv',
  });
}

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

describe('importUsersSuppliers', () => {
  it('POSTs multipart form-data with the file field and no JSON content type', async () => {
    mockFetch({
      success: true,
      data: {
        dryRun: false,
        summary: { totalRows: 1, created: 1, updated: 0, skipped: 0, errors: 0 },
        results: [
          { rowNumber: 1, role: 'user', email: 'user@example.com', action: 'create' },
        ],
      },
    });

    const result = await importUsersSuppliers('token', { file: csvFile() });

    expect(result.summary.created).toBe(1);
    const { url, init } = lastCall();
    expect(url).toContain('/admin/imports/users-suppliers');
    expect(url).not.toContain('dryRun=true');
    expect(init.method).toBe('POST');

    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBe('Bearer token');
    // Browser must set the multipart boundary — we never force JSON.
    expect(headers.get('Content-Type')).toBeNull();
    expect(init.body).toBeInstanceOf(FormData);
    const fd = init.body as FormData;
    expect(fd.get('file')).toBeInstanceOf(File);
    expect((fd.get('file') as File).name).toBe('import.csv');
  });

  it('appends ?dryRun=true when dryRun=true', async () => {
    mockFetch({
      success: true,
      data: {
        dryRun: true,
        summary: { totalRows: 0, created: 0, updated: 0, skipped: 0, errors: 0 },
        results: [],
      },
    });
    await importUsersSuppliers('token', { file: csvFile(), dryRun: true });
    expect(lastCall().url).toContain('dryRun=true');
  });

  it('surfaces 400 bad-file errors from the server', async () => {
    mockFetch({ message: 'Bad CSV header' }, 400);
    await expect(
      importUsersSuppliers('token', { file: csvFile() }),
    ).rejects.toThrow('Bad CSV header');
  });
});
