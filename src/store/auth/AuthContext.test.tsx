import type { ReactElement, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, renderHook } from '@testing-library/react';

// vi.mock must come BEFORE any imports that transitively import authService —
// otherwise the real getMe runs in checkAuth() on mount and we can't control
// the boot probe.
vi.mock('@/services/authService', () => ({
  login: vi.fn(),
  getMe: vi.fn(),
  getInternalMe: vi.fn(),
  logout: vi.fn(),
}));

import { AuthProvider } from './AuthContext';
import { useAuth } from '@/hooks';
import { queryClient } from '@/lib/queryClient';
import * as authService from '@/services/authService';

const TOKEN_KEY = 'globalxpress_token';

function Wrapper({ children }: { children: ReactNode }): ReactElement {
  return <AuthProvider>{children}</AuthProvider>;
}

function ProviderConsumer(): null {
  // Empty consumer — pulling useAuth keeps the provider hydrated; we don't
  // need the return value here.
  useAuth();
  return null;
}

beforeEach(() => {
  // Default: no session. The mocked getMe is unreachable when there's no
  // token (checkAuth short-circuits), but we set it to a safe value anyway
  // so tests that DO seed a token can override per-case.
  vi.mocked(authService.getMe).mockResolvedValue(undefined as never);
  vi.mocked(authService.getInternalMe).mockResolvedValue(undefined as never);
  vi.mocked(authService.logout).mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  queryClient.clear();
  vi.clearAllMocks();
});

describe('AuthContext — cache clearing on session loss', () => {
  it('clears the react-query cache when the user explicitly logs out', async () => {
    // Seed a token + cached query as if we were mid-session. getMe will be
    // called on mount; we make it return a fake operator so the boot probe
    // settles before the test exercises logout.
    sessionStorage.setItem(TOKEN_KEY, 'fake-token-123');
    vi.mocked(authService.getMe).mockResolvedValue({
      id: 'u-1',
      email: 'op@example.com',
      firstName: 'Op',
      lastName: 'One',
      role: 'staff',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    } as never);
    queryClient.setQueryData(['orders', 'list'], [{ id: 'order-1' }]);
    queryClient.setQueryData(['dashboard', 'overview'], { stats: 'whatever' });
    expect(queryClient.getQueryCache().getAll()).toHaveLength(2);

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.logout();
    });

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(authService.logout).toHaveBeenCalledWith('fake-token-123');
  });

  it('clears the react-query cache when a 401 dispatches auth:unauthorized', async () => {
    // Seed a token + cached data — the listener only runs when a token is
    // present (it's the "active session got revoked" signal).
    sessionStorage.setItem(TOKEN_KEY, 'fake-token-456');
    queryClient.setQueryData(['notifications', 'list'], { data: [] });
    queryClient.setQueryData(['users', 'me'], { id: 'user-1' });
    expect(queryClient.getQueryCache().getAll()).toHaveLength(2);

    render(
      <Wrapper>
        <ProviderConsumer />
      </Wrapper>,
    );

    await act(async () => {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    });

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('ignores auth:unauthorized when no token is present (idle tab)', async () => {
    // No token → the listener bails out before touching anything. Without
    // this guard, a stale 401 fired against a logged-out tab could wipe
    // cached data belonging to a different test/tab.
    queryClient.setQueryData(['some', 'query'], { still: 'here' });
    expect(queryClient.getQueryCache().getAll()).toHaveLength(1);

    render(
      <Wrapper>
        <ProviderConsumer />
      </Wrapper>,
    );

    await act(async () => {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    });

    expect(queryClient.getQueryCache().getAll()).toHaveLength(1);
  });
});

describe('AuthContext — role refresh on auth:forbidden', () => {
  it('refetches /auth/me when a 403 fires so a demoted role catches up', async () => {
    // Seed a token + a "staff" user the boot probe will return first.
    sessionStorage.setItem(TOKEN_KEY, 'fake-token-789');
    const wasStaff = {
      id: 'u-2',
      email: 'op@example.com',
      firstName: 'Op',
      lastName: 'Two',
      role: 'staff' as const,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };
    const nowCustomer = { ...wasStaff, role: 'user' as const, updatedAt: '2026-06-04' };

    // First call (boot probe) returns the old staff role; second call
    // (triggered by auth:forbidden) returns the demoted shape.
    vi.mocked(authService.getMe)
      .mockResolvedValueOnce(wasStaff as never)
      .mockResolvedValueOnce(nowCustomer as never);
    vi.mocked(authService.getInternalMe).mockResolvedValue(nowCustomer as never);

    render(
      <Wrapper>
        <ProviderConsumer />
      </Wrapper>,
    );

    // Wait for the boot probe to settle so we know we're in the
    // "logged-in with the stale role" state before firing the event.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(authService.getMe).toHaveBeenCalledTimes(1);

    await act(async () => {
      window.dispatchEvent(new CustomEvent('auth:forbidden'));
      // Let the async handler resolve.
      await Promise.resolve();
      await Promise.resolve();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });

    expect(authService.getInternalMe).toHaveBeenCalledTimes(1);
  });

  it('ignores auth:forbidden when there is no active session', async () => {
    // No token → don't fire /auth/me. Without this guard a stray 403
    // on a logged-out tab would needlessly probe the BE.
    render(
      <Wrapper>
        <ProviderConsumer />
      </Wrapper>,
    );

    await act(async () => {
      window.dispatchEvent(new CustomEvent('auth:forbidden'));
      await Promise.resolve();
    });

    expect(authService.getMe).not.toHaveBeenCalled();
  });
});

describe('AuthContext — role refresh on tab refocus', () => {
  it('refetches /auth/me when the tab regains focus after a long idle', async () => {
    // Seed a token. The lastSyncedAtRef starts at 0, so Date.now() - 0
    // is a huge number — guaranteed to exceed the 5-minute idle window.
    sessionStorage.setItem(TOKEN_KEY, 'fake-token-vis-1');
    vi.mocked(authService.getMe).mockResolvedValue({
      id: 'u-3',
      email: 'op3@example.com',
      firstName: 'Op',
      lastName: 'Three',
      role: 'staff' as const,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    } as never);

    render(
      <Wrapper>
        <ProviderConsumer />
      </Wrapper>,
    );

    // Wait for boot probe to settle.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    const callsAfterBoot = vi.mocked(authService.getMe).mock.calls.length;

    // Mid-test the boot just stamped lastSyncedAtRef = Date.now(), so a
    // visibilitychange fired NOW would see elapsed ≈ 0 ms and skip.
    // Push the ref back into the deep past by stubbing Date.now.
    const realNow = Date.now;
    const stubNow = realNow() + 10 * 60 * 1000; // 10 min later
    vi.spyOn(Date, 'now').mockReturnValue(stubNow);

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(vi.mocked(authService.getMe).mock.calls.length).toBe(callsAfterBoot + 1);

    vi.spyOn(Date, 'now').mockImplementation(realNow);
  });

  it('skips the visibility refresh when there is no token', async () => {
    // No token → bail before probing. Without this an anonymous tab
    // would hit /auth/me every time the user came back to it.
    render(
      <Wrapper>
        <ProviderConsumer />
      </Wrapper>,
    );

    await act(async () => {
      await Promise.resolve();
    });
    const callsAfterBoot = vi.mocked(authService.getMe).mock.calls.length;

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });

    expect(vi.mocked(authService.getMe).mock.calls.length).toBe(callsAfterBoot);
  });

  it('skips the visibility refresh while the idle window is still fresh', async () => {
    // Boot just succeeded → lastSyncedAtRef ≈ Date.now(). Firing
    // visibilitychange immediately should NOT trigger a second probe —
    // we don't want to hammer /auth/me when the user is just tab-flicking
    // between two open windows of the dashboard.
    sessionStorage.setItem(TOKEN_KEY, 'fake-token-vis-2');
    vi.mocked(authService.getMe).mockResolvedValue({
      id: 'u-4',
      email: 'op4@example.com',
      firstName: 'Op',
      lastName: 'Four',
      role: 'admin' as const,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    } as never);

    render(
      <Wrapper>
        <ProviderConsumer />
      </Wrapper>,
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    const callsAfterBoot = vi.mocked(authService.getMe).mock.calls.length;

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });

    expect(vi.mocked(authService.getMe).mock.calls.length).toBe(callsAfterBoot);
  });
});
