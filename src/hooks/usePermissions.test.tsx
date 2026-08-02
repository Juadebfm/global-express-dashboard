import type { ReactElement, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { usePermissions } from './usePermissions';
import type { Capability, PermissionsMatrix } from '@/types';

const TOKEN_KEY = 'globalxpress_token';

// AuthContext pulls in Clerk and a router; the hook only reads `user.role`
// and `isAuthenticated`, so stub that surface rather than mounting the tree.
const authState = {
  user: { role: 'staff' } as { role: string; mustChangePassword?: boolean } | null,
  isAuthenticated: true,
};
vi.mock('./useAuth', () => ({
  useAuth: () => authState,
}));

const getMyPermissions = vi.fn<() => Promise<PermissionsMatrix>>();
vi.mock('@/services', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services')>();
  return {
    ...actual,
    getMyPermissions: (...args: unknown[]) =>
      getMyPermissions(...(args as [])),
  };
});

function capability(key: string, granted: boolean, eligible = true): Capability {
  return {
    key,
    name: key,
    minimumRole: 'admin',
    description: '',
    includes: [],
    eligible,
    granted,
  };
}

function matrix(capabilities: Capability[], role: PermissionsMatrix['role'] = 'staff'): PermissionsMatrix {
  return {
    userId: '11111111-1111-1111-1111-111111111111',
    role,
    isActive: true,
    capabilities,
  };
}

function wrapper({ children }: { children: ReactNode }): ReactElement {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  authState.user = { role: 'staff' };
  authState.isAuthenticated = true;
  sessionStorage.setItem(TOKEN_KEY, 'token');
  getMyPermissions.mockReset();
});

afterEach(() => {
  sessionStorage.clear();
  vi.clearAllMocks();
});

describe('usePermissions', () => {
  it('grants only capabilities marked granted', async () => {
    getMyPermissions.mockResolvedValue(
      matrix([capability('batches.manage', true), capability('payments.verify', false)]),
    );

    const { result } = renderHook(() => usePermissions(), { wrapper });
    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(result.current.can('batches.manage')).toBe(true);
    expect(result.current.can('payments.verify')).toBe(false);
  });

  // The distinction the contract turns on — eligible is not access.
  it('denies an eligible-but-ungranted capability', async () => {
    getMyPermissions.mockResolvedValue(
      matrix([capability('finance.reports.view', false, true)]),
    );

    const { result } = renderHook(() => usePermissions(), { wrapper });
    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(result.current.can('finance.reports.view')).toBe(false);
  });

  it('fails closed before the matrix has loaded', () => {
    getMyPermissions.mockReturnValue(new Promise(() => { /* never settles */ }));

    const { result } = renderHook(() => usePermissions(), { wrapper });

    expect(result.current.isReady).toBe(false);
    expect(result.current.can('batches.manage')).toBe(false);
  });

  it('fails closed when the matrix request errors', async () => {
    getMyPermissions.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => usePermissions(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.isReady).toBe(false);
    expect(result.current.can('batches.manage')).toBe(false);
  });

  // A superadmin's implicit access arrives as granted:true rows from the
  // backend, so `can()` needs no special case — but isSuperadmin must be
  // true so the permission-management area can gate on it.
  it('reports isSuperadmin from the matrix role', async () => {
    getMyPermissions.mockResolvedValue(matrix([capability('leads.manage', true)], 'superadmin'));

    const { result } = renderHook(() => usePermissions(), { wrapper });
    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(result.current.isSuperadmin).toBe(true);
    expect(result.current.can('leads.manage')).toBe(true);
  });

  it('does not report isSuperadmin for staff', async () => {
    getMyPermissions.mockResolvedValue(matrix([]));

    const { result } = renderHook(() => usePermissions(), { wrapper });
    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(result.current.isSuperadmin).toBe(false);
  });

  // Customer/supplier sessions hold no internal token; /permissions/me would
  // 403 for them, so the query must never fire.
  it('never requests the matrix for a non-internal session', () => {
    authState.user = null;
    authState.isAuthenticated = false;

    const { result } = renderHook(() => usePermissions(), { wrapper });

    expect(getMyPermissions).not.toHaveBeenCalled();
    expect(result.current.can('catalogue.manage')).toBe(false);
  });

  it('never requests or exposes the matrix while a temporary password must be changed', () => {
    authState.user = { role: 'staff', mustChangePassword: true };

    const { result } = renderHook(() => usePermissions(), { wrapper });

    expect(getMyPermissions).not.toHaveBeenCalled();
    expect(result.current.matrix).toBeNull();
    expect(result.current.isReady).toBe(false);
    expect(result.current.can('catalogue.manage')).toBe(false);
  });
});
