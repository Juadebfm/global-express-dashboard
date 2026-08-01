import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CapabilityDefinition, PermissionsMatrix } from '@/types';
import {
  getCapabilityCatalogue,
  getUserPermissions,
  setUserCapability,
} from '@/services';
import { STALE_TIME } from '@/lib/queryDefaults';
import { usePermissions, MY_PERMISSIONS_KEY } from './usePermissions';

const TOKEN_KEY = 'globalxpress_token';

function getToken(): string {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) throw new Error('Not authenticated');
  return token;
}

/**
 * Superadmin-only capability administration.
 *
 * These three routes are `requireSuperAdmin` on the backend — not capability
 * gated — so `role === 'superadmin'` is the correct check here and is the one
 * place the contract sanctions a bare role comparison. Every query below is
 * disabled for anyone else so a non-superadmin never fires a call that 403s.
 */

/** The code-defined catalogue. Effectively static within a session. */
export function useCapabilityCatalogue() {
  const { isSuperadmin } = usePermissions();
  return useQuery<CapabilityDefinition[]>({
    queryKey: ['permissions', 'catalogue'],
    queryFn: () => getCapabilityCatalogue(getToken()),
    enabled: isSuperadmin,
    staleTime: STALE_TIME.STATIC,
  });
}

/** One internal user's effective matrix. Pass null to stay idle. */
export function useUserPermissions(userId: string | null) {
  const { isSuperadmin } = usePermissions();
  return useQuery<PermissionsMatrix>({
    queryKey: ['permissions', 'user', userId],
    queryFn: () => getUserPermissions(getToken(), userId as string),
    enabled: isSuperadmin && !!userId,
    staleTime: STALE_TIME.REAL_TIME,
  });
}

export interface SetCapabilityInput {
  userId: string;
  capability: string;
  enabled: boolean;
}

/**
 * Grant or revoke one capability.
 *
 * The PUT returns the target's full refreshed matrix, so we write that
 * response straight into the cache rather than patching the toggled row —
 * the guide asks for the displayed matrix to be *replaced* by the response,
 * which also picks up any server-side adjustment we didn't predict.
 *
 * When the target is the acting superadmin, their own matrix is invalidated
 * too so the change reaches their live gating without a reload.
 */
export function useSetUserCapability() {
  const queryClient = useQueryClient();
  const { matrix } = usePermissions();

  return useMutation({
    mutationFn: ({ userId, capability, enabled }: SetCapabilityInput) =>
      setUserCapability(getToken(), userId, capability, enabled),
    onSuccess: (updated, variables) => {
      queryClient.setQueryData(['permissions', 'user', variables.userId], updated);
      if (matrix?.userId === variables.userId) {
        void queryClient.invalidateQueries({ queryKey: MY_PERMISSIONS_KEY });
      }
    },
  });
}
