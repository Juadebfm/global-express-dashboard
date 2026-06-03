import type { User } from '@/types';

type Role = User['role'];

/**
 * Action keys for the FE capability check. Add new ones as needed —
 * keep the names domain-prefixed (`orders.*`, `clients.*`, ...) so the
 * action surface stays grep-able. Don't reuse a key for two different
 * checks — split if the rules diverge.
 *
 * The values in `policy` below are the source of truth. `can()` is a
 * pure lookup against this map.
 */
export type Action =
  // ── Coarse buckets — the "operator chrome" toggle that gates entire
  //    sections of pages. Use sparingly; prefer specific actions where
  //    a check is about a single button or row affordance.
  | 'app.operator'              // any internal user (staff or above)
  | 'app.admin'                 // admin or superadmin
  | 'app.superadmin'            // superadmin only

  // ── Orders
  | 'orders.deleteImage'        // remove an uploaded package photo
  | 'orders.approveOverride'    // approve a restricted-goods override
  | 'orders.delete'             // soft-delete an order
  | 'orders.updateStatus'       // advance the status pipeline
  | 'orders.warehouseVerify'    // record measurements + packages

  // ── Shipments
  | 'shipments.viewDetail'      // staff-only detail page
  | 'shipments.intake'          // record a new shipment at the warehouse
  | 'shipments.batchManage'     // edit dispatch batch carrier / status
  | 'shipments.batchApprove'    // approve dispatch batch cutoff

  // ── Clients / suppliers
  | 'clients.view'              // CRM list + detail
  | 'clients.invite'            // provision new customer login

  // ── Team
  | 'team.view'                 // internal team list
  | 'team.invite'               // create staff / superadmin accounts
  | 'team.approve'              // flip isActive on a new staff account
  | 'team.changeRole'           // promote/demote

  // ── Settings
  | 'settings.viewFx'
  | 'settings.editFx'
  | 'settings.editPricing'
  | 'settings.editShipmentTypes'
  | 'settings.editRestrictedGoods'
  | 'settings.editPackaging';

const STAFF_PLUS: ReadonlySet<Role> = new Set(['staff', 'admin', 'superadmin']);
const ADMIN_PLUS: ReadonlySet<Role> = new Set(['admin', 'superadmin']);
const SUPER_ONLY: ReadonlySet<Role> = new Set(['superadmin']);

/**
 * The capability map. ONE source of truth — when product or BE changes
 * who can do what, edit the value here and every call site flips.
 *
 * The shape (Action → Set<Role>) keeps the lookup O(1) and the policy
 * easy to eyeball.
 */
const policy: Record<Action, ReadonlySet<Role>> = {
  // App scopes
  'app.operator': STAFF_PLUS,
  'app.admin': ADMIN_PLUS,
  'app.superadmin': SUPER_ONLY,

  // Orders
  'orders.deleteImage': ADMIN_PLUS,
  'orders.approveOverride': ADMIN_PLUS,
  'orders.delete': ADMIN_PLUS,
  'orders.updateStatus': STAFF_PLUS,
  'orders.warehouseVerify': STAFF_PLUS,

  // Shipments
  'shipments.viewDetail': STAFF_PLUS,
  'shipments.intake': ADMIN_PLUS,
  'shipments.batchManage': STAFF_PLUS,
  'shipments.batchApprove': SUPER_ONLY,

  // Clients / suppliers
  'clients.view': STAFF_PLUS,
  'clients.invite': STAFF_PLUS,

  // Team
  'team.view': ADMIN_PLUS,
  'team.invite': ADMIN_PLUS,
  'team.approve': SUPER_ONLY,
  'team.changeRole': ADMIN_PLUS,

  // Settings
  'settings.viewFx': STAFF_PLUS,
  'settings.editFx': SUPER_ONLY,
  'settings.editPricing': SUPER_ONLY,
  'settings.editShipmentTypes': SUPER_ONLY,
  'settings.editRestrictedGoods': ADMIN_PLUS,
  'settings.editPackaging': SUPER_ONLY,
};

/**
 * Pure role-based capability check. Returns false for null/undefined
 * roles — never default to a permissive answer when the caller is
 * uncertain about identity.
 *
 * The backend remains the source of truth. `can()` is FE chrome only
 * — a user who bypasses the UI hits a 403 anyway.
 */
export function can(role: Role | null | undefined, action: Action): boolean {
  if (!role) return false;
  return policy[action].has(role);
}

/**
 * Migration debt: the codebase has ~140 raw `user?.role === '…'` checks
 * predating this helper. Migration is incremental — replace them when
 * you next touch each file. Greppable target patterns:
 *
 *   user?.role === 'staff' || user?.role === 'admin' || user?.role === 'superadmin'
 *   → useCan('app.operator')
 *
 *   user?.role === 'admin' || user?.role === 'superadmin'
 *   → useCan('app.admin')
 *
 *   user?.role === 'superadmin'
 *   → useCan('app.superadmin')
 *
 * Or, for component-internal booleans like `canDeleteImage`, swap to the
 * matching action: useCan('orders.deleteImage'), etc.
 */
