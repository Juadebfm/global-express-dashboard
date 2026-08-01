import type { Capability, CapabilityDefinition, PermissionsMatrix } from '@/types';
import { apiGetData, apiPutData } from '@/lib/apiClient';

/**
 * Internal capability API. All four routes require an internal bearer token —
 * they are not reachable with a Clerk customer/supplier session.
 *
 * `/permissions/me` is readable by staff, admin and superadmin. The other
 * three are superadmin-only (`requireSuperAdmin` on the backend), so gate
 * their call sites on `role === 'superadmin'`, which is the one place the
 * guide permits a bare role check.
 */

/**
 * The authenticated internal user's own effective matrix. Read-only, and
 * cannot inspect anyone else — use `getUserPermissions` for that.
 */
export function getMyPermissions(token: string): Promise<PermissionsMatrix> {
  return apiGetData<PermissionsMatrix>('/permissions/me', token);
}

/** Every code-defined capability, without per-user state. Superadmin only. */
export function getCapabilityCatalogue(token: string): Promise<CapabilityDefinition[]> {
  return apiGetData<CapabilityDefinition[]>('/permissions/catalogue', token);
}

/** Another internal user's effective matrix. Superadmin only. */
export function getUserPermissions(token: string, userId: string): Promise<PermissionsMatrix> {
  return apiGetData<PermissionsMatrix>(`/permissions/users/${userId}`, token);
}

/**
 * Grant or revoke one capability. Superadmin only.
 *
 * Returns the target's full refreshed matrix — replace the displayed matrix
 * with this response rather than patching the toggled row locally, so an
 * `includes` change or a server-side adjustment can't drift from the UI.
 *
 * The backend rejects with 422 when the target is a superadmin (their access
 * is implicit), when the target's role is below the capability's
 * `minimumRole`, or when the key is unknown.
 */
export function setUserCapability(
  token: string,
  userId: string,
  capability: string,
  enabled: boolean,
): Promise<PermissionsMatrix> {
  return apiPutData<PermissionsMatrix>(
    `/permissions/users/${userId}/${capability}`,
    { enabled },
    token,
  );
}

/**
 * Build the set of granted capability keys for O(1) lookup.
 *
 * Only `granted` counts — `eligible` states that the role *could* hold the
 * capability, which is not access.
 */
export function grantedKeys(capabilities: Capability[]): Set<string> {
  return new Set(capabilities.filter((capability) => capability.granted).map((c) => c.key));
}
