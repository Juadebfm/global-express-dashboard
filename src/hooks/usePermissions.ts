import { useCallback, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Capability,
  CapabilityDeniedDetail,
  CapabilityKey,
  InternalRole,
  PermissionsMatrix,
} from '@/types';
import { getMyPermissions, grantedKeys } from '@/services';
import { STALE_TIME } from '@/lib/queryDefaults';
import { useFeedbackStore } from '@/store/feedback/feedback.store';
import { useAuth } from './useAuth';

const TOKEN_KEY = 'globalxpress_token';

/** Query key for the current user's matrix. Exported so the denial handler
 *  and the superadmin grant screen can invalidate the same entry. */
export const MY_PERMISSIONS_KEY = ['permissions', 'me'] as const;

const INTERNAL_ROLES = new Set<string>(['staff', 'admin', 'superadmin']);

function isInternalRole(role: string | undefined): role is InternalRole {
  return role !== undefined && INTERNAL_ROLES.has(role);
}

export interface PermissionsState {
  /** The raw matrix, or null until it has loaded successfully. */
  matrix: PermissionsMatrix | null;
  capabilities: Capability[];
  /** Internal role from the matrix, falling back to the session user. */
  role: InternalRole | null;
  /**
   * The single capability checker for the whole dashboard.
   *
   * Fails closed: false while the matrix is loading, and false if the request
   * failed. A capability-gated control must not appear on an unknown matrix.
   */
  can: (capability: CapabilityKey) => boolean;
  /**
   * True once the matrix has loaded successfully. Gate rendering of
   * capability-dependent chrome on this so a staff user never sees a control
   * flash in and then disappear.
   */
  isReady: boolean;
  isLoading: boolean;
  isError: boolean;
  /**
   * Superadmin holds every capability implicitly. This is the ONLY sanctioned
   * role check — it exists for the permission-management area, whose routes
   * are `requireSuperAdmin` on the backend. Never use it as a stand-in for a
   * capability check.
   */
  isSuperadmin: boolean;
  /** Force a re-read of the matrix, e.g. after a capability denial. */
  refresh: () => Promise<void>;
}

/**
 * Loads and shares the internal capability matrix.
 *
 * Backed by one TanStack Query entry, so every consumer reads the same cached
 * matrix and a refresh propagates everywhere — no provider needed and no
 * duplicated capability logic per page.
 *
 * Disabled entirely for customer/supplier (Clerk) sessions: `/permissions/me`
 * is an internal-token route and would 403 for them.
 */
export function usePermissions(): PermissionsState {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const role = user?.role;
  const isInternal = isInternalRole(role);
  // A temporary-password session may only use the password-change screen.
  // In particular, do not start the capability request until the backend has
  // confirmed that the password-change requirement is cleared.
  const canLoadPermissions = isAuthenticated && isInternal && !user?.mustChangePassword;

  const { data, isLoading, isError } = useQuery({
    queryKey: MY_PERMISSIONS_KEY,
    queryFn: async () => {
      const token = sessionStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      return getMyPermissions(token);
    },
    enabled: canLoadPermissions,
    // Grants change rarely, and a superadmin toggling one invalidates this
    // key directly, so a short window would only add requests.
    staleTime: STALE_TIME.SLOW_MOVING,
    // Never retry an authorization read — a 401/403 here is an answer, not a
    // transient failure, and retrying delays the fail-closed state.
    retry: false,
  });

  // Do not expose a previously cached matrix to a temporary-password session.
  // That session is deliberately fail-closed until its account record clears
  // the password-change flag.
  const activeMatrix = canLoadPermissions ? data : undefined;

  const granted = useMemo(
    () => grantedKeys(activeMatrix?.capabilities ?? []),
    [activeMatrix?.capabilities],
  );

  const can = useCallback(
    (capability: CapabilityKey): boolean => granted.has(capability),
    [granted],
  );

  const refresh = useCallback(async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: MY_PERMISSIONS_KEY });
  }, [queryClient]);

  return {
    matrix: activeMatrix ?? null,
    capabilities: activeMatrix?.capabilities ?? [],
    role: activeMatrix?.role ?? (isInternal ? role : null),
    can,
    isReady: !!activeMatrix,
    isLoading: canLoadPermissions && isLoading,
    isError,
    isSuperadmin: canLoadPermissions && (activeMatrix?.role ?? role) === 'superadmin',
    refresh,
  };
}

/**
 * Single-capability convenience wrapper.
 *
 * Returns false while the matrix loads, so callers that only need to hide a
 * control can use this directly. Where the difference between "denied" and
 * "not loaded yet" matters — a route guard that would otherwise redirect on
 * first paint — use `usePermissions()` and branch on `isReady` first.
 */
export function useCapability(capability: CapabilityKey): boolean {
  const { can } = usePermissions();
  return can(capability);
}

/**
 * Mounts the app-wide reaction to a capability denial. Mount exactly once,
 * near the root.
 *
 * apiClient dispatches `auth:capability-denied` for a 403 carrying
 * `code: "CAPABILITY_REQUIRED"`. Per the backend contract we stop the action
 * (the request already threw), refresh the matrix so the now-denied control
 * disappears, and surface an access-denied message. We deliberately do NOT
 * retry — the grant is gone, and a retry would just fail again.
 */
export function usePermissionsSync(): void {
  const queryClient = useQueryClient();

  // Subscribing here is what actually kicks off the load: the query is
  // enabled as soon as AuthContext holds an internal user, which is the
  // moment after login (or after completeMfaChallenge) that the contract
  // asks us to fetch the matrix. Every other consumer then reads the same
  // warm cache entry instead of triggering its own first request.
  usePermissions();

  useEffect(() => {
    const handler = (event: Event): void => {
      const detail = (event as CustomEvent<CapabilityDeniedDetail>).detail;
      void queryClient.invalidateQueries({ queryKey: MY_PERMISSIONS_KEY });
      useFeedbackStore.getState().pushMessage({
        tone: 'error',
        message: detail?.capability
          ? `You no longer have access to this action (${detail.capability}).`
          : 'You no longer have access to this action.',
      });
    };
    window.addEventListener('auth:capability-denied', handler);
    return () => window.removeEventListener('auth:capability-denied', handler);
  }, [queryClient]);
}
