import { afterEach, describe, expect, it, vi } from 'vitest';

import { getTeam } from './teamService';

const ORIGINAL_FETCH = globalThis.fetch;

function mockFetch(): void {
  globalThis.fetch = vi.fn(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          data: { data: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    ),
  ) as typeof fetch;
}

function lastUrl(): URL {
  const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
  const [url] = calls.at(-1) ?? [''];
  return new URL(String(url), 'http://localhost');
}

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

describe('getTeam', () => {
  it('sends a trimmed q search together with the selected filters and pagination', async () => {
    mockFetch();

    await getTeam('token', {
      q: '  lawal  ',
      page: 2,
      limit: 20,
      role: 'staff',
      isActive: true,
    });

    const url = lastUrl();
    expect(url.searchParams.get('q')).toBe('lawal');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('limit')).toBe('20');
    expect(url.searchParams.get('role')).toBe('staff');
    expect(url.searchParams.get('isActive')).toBe('true');
  });

  it('does not send q when the search field is blank', async () => {
    mockFetch();

    await getTeam('token', { q: '   ' });

    expect(lastUrl().searchParams.has('q')).toBe(false);
  });
});
