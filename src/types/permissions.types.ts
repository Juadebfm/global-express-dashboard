/**
 * Internal capability model — mirrors the backend contract documented in
 * global-express-backend/FRONTEND_FLOW_GUIDE.md and enforced by
 * `requireCapability()` on 57 routes.
 *
 * Two DIFFERENT controls exist and must not be conflated:
 *
 *   role guard       — requireStaffOrAbove / requireAdminOrAbove / requireSuperAdmin.
 *                      FE mirror: `can(role, action)` in lib/permissions.ts.
 *   capability guard — requireCapability('<key>'). FE mirror: `useCapability(key)`.
 *
 * An `admin` is *eligible* for admin-level capabilities but is granted NONE of
 * them by having the role. Only `granted` opens a capability-gated feature.
 * A `superadmin` holds every capability implicitly.
 */

/** Roles that can hold an internal session and therefore a capability matrix. */
export type InternalRole = 'staff' | 'admin' | 'superadmin';

/**
 * The code-defined capability catalogue. Kept as a literal union so a typo in
 * a gate is a compile error rather than a silently-false check.
 *
 * Source of truth is the backend's `CAPABILITY_CATALOGUE`; this list must be
 * updated when the backend adds a key. The catalogue endpoint returns the
 * live set, so `PermissionsPage` renders whatever the server sends rather
 * than assuming this union is exhaustive.
 */
export type CapabilityKey =
  | 'catalogue.manage'
  | 'local_delivery.manage'
  | 'client_login.provision'
  | 'batches.manage'
  | 'batches.finalise'
  | 'operations.escalation.resolve'
  | 'reports.operational.view'
  | 'audit_logs.view'
  | 'payments.verify'
  | 'finance.reports.view'
  | 'bank_accounts.manage'
  | 'fx_rates.manage'
  | 'pricing.rules.manage'
  | 'warehouses.manage'
  | 'business_settings.manage'
  | 'restricted_items.override'
  | 'broadcasts.manage'
  | 'newsletter.manage'
  | 'leads.manage';

/**
 * One entry of `GET /permissions/catalogue` — the definition only, with no
 * per-user state. `name`, `description` and `includes` are the FE's source
 * for capability labels; don't hard-code copy for these.
 */
export interface CapabilityDefinition {
  key: string;
  name: string;
  minimumRole: 'staff' | 'admin';
  description: string;
  includes: string[];
}

/**
 * A capability as resolved for one internal user.
 *
 * - `eligible` — the user's role *could* hold this capability. Not access.
 * - `granted`  — the user holds it. The ONLY field that may open a feature.
 */
export interface Capability extends CapabilityDefinition {
  eligible: boolean;
  granted: boolean;
}

/** `GET /permissions/me` and the superadmin per-user / grant-toggle responses. */
export interface PermissionsMatrix {
  userId: string;
  role: InternalRole;
  isActive: boolean;
  capabilities: Capability[];
}

/**
 * Backend `code` on a 403 raised by a capability guard. Distinguishes "you
 * lack a capability" from a plain role-guard rejection, which matters because
 * only the former should refresh the matrix.
 */
export const CAPABILITY_REQUIRED = 'CAPABILITY_REQUIRED';

/** Detail carried by the `auth:capability-denied` window event. */
export interface CapabilityDeniedDetail {
  /** The capability the backend demanded, when it named one. */
  capability: string | null;
}
