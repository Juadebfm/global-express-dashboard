import type { CapabilityKey, SidebarItem, User } from '@/types';
import { ROUTES } from '@/constants';

type Role = User['role'];

// ── Role-based nav definitions ──────────────────────────────────────────────
//
// Hard-coded per-role arrays rather than a `useCan(action)` filter because:
// (a) nav order matters for muscle memory and shouldn't shift when a single
// action flips, and (b) the lists rarely change. When they do, edit here.
//
// Customers land at /dashboard; operators at /admin/dashboard — the
// dashboard item href is intentionally different per branch.

export const CUSTOMER_NAV: SidebarItem[] = [
  { id: 'myShipments', icon: 'clipboard', href: ROUTES.DASHBOARD },
  { id: 'payments', icon: 'wallet', href: ROUTES.PAYMENTS },
  { id: 'd2dRequests', icon: 'truck', href: ROUTES.D2D_MY_REQUESTS },
  { id: 'deliverySchedule', icon: 'calendar', href: ROUTES.DELIVERY_SCHEDULE },
  { id: 'notification', icon: 'bell', href: ROUTES.NOTIFICATIONS },
];

export const STAFF_NAV: SidebarItem[] = [
  { id: 'adminDashboard', icon: 'dashboard', href: ROUTES.ADMIN_DASHBOARD },
  { id: 'operations', icon: 'layers', href: ROUTES.OPERATIONS },
  { id: 'batches', icon: 'boxes', href: ROUTES.BATCHES },
  { id: 'adminGallery', icon: 'image', href: ROUTES.ADMIN_GALLERY },
  { id: 'leads', icon: 'inbox', href: ROUTES.LEADS },
  { id: 'supplierNotices', icon: 'package', href: ROUTES.SUPPLIER_NOTICES },
  { id: 'payments', icon: 'wallet', href: ROUTES.PAYMENTS },
  { id: 'notification', icon: 'bell', href: ROUTES.NOTIFICATIONS },
  { id: 'reports', icon: 'chart', href: ROUTES.REPORTS },
  { id: 'newsletterSubscribers', icon: 'mail', href: ROUTES.NEWSLETTER_SUBSCRIBERS },
];

export const ADMIN_NAV: SidebarItem[] = [
  { id: 'adminDashboard', icon: 'dashboard', href: ROUTES.ADMIN_DASHBOARD },
  { id: 'operations', icon: 'layers', href: ROUTES.OPERATIONS },
  { id: 'batches', icon: 'boxes', href: ROUTES.BATCHES },
  { id: 'adminGallery', icon: 'image', href: ROUTES.ADMIN_GALLERY },
  { id: 'clients', icon: 'users', href: ROUTES.CLIENTS },
  { id: 'leads', icon: 'inbox', href: ROUTES.LEADS },
  { id: 'supplierNotices', icon: 'package', href: ROUTES.SUPPLIER_NOTICES },
  { id: 'payments', icon: 'wallet', href: ROUTES.PAYMENTS },
  { id: 'notification', icon: 'bell', href: ROUTES.NOTIFICATIONS },
  { id: 'reports', icon: 'chart', href: ROUTES.REPORTS },
  { id: 'newsletterSubscribers', icon: 'mail', href: ROUTES.NEWSLETTER_SUBSCRIBERS },
];

export const SUPERADMIN_NAV: SidebarItem[] = [
  { id: 'adminDashboard', icon: 'dashboard', href: ROUTES.ADMIN_DASHBOARD },
  { id: 'operations', icon: 'layers', href: ROUTES.OPERATIONS },
  { id: 'batches', icon: 'boxes', href: ROUTES.BATCHES },
  { id: 'adminGallery', icon: 'image', href: ROUTES.ADMIN_GALLERY },
  { id: 'clients', icon: 'users', href: ROUTES.CLIENTS },
  { id: 'leads', icon: 'inbox', href: ROUTES.LEADS },
  { id: 'supplierNotices', icon: 'package', href: ROUTES.SUPPLIER_NOTICES },
  { id: 'payments', icon: 'wallet', href: ROUTES.PAYMENTS },
  { id: 'notification', icon: 'bell', href: ROUTES.NOTIFICATIONS },
  { id: 'team', icon: 'team', href: ROUTES.TEAM },
  { id: 'reports', icon: 'chart', href: ROUTES.REPORTS },
  { id: 'newsletterSubscribers', icon: 'mail', href: ROUTES.NEWSLETTER_SUBSCRIBERS },
  { id: 'permissions', icon: 'shield', href: ROUTES.PERMISSIONS },
];

export const CUSTOMER_FOOTER: SidebarItem[] = [
  { id: 'profile', icon: 'users', href: ROUTES.PROFILE },
  { id: 'support', icon: 'help', href: ROUTES.SUPPORT },
];

export const OPERATOR_FOOTER: SidebarItem[] = [
  { id: 'profile', icon: 'users', href: ROUTES.PROFILE },
  { id: 'settings', icon: 'settings', href: ROUTES.SETTINGS },
];

type CapabilityCheck = (key: CapabilityKey) => boolean;

// Only these entries are capability-gated. Everything else in the internal
// arrays is a Staff-baseline route or a true Superadmin route. Keeping this
// mapping beside the nav definitions makes it impossible for a role-only
// sidebar item to reappear accidentally after a grant is removed.
const NAV_CAPABILITIES: Partial<Record<SidebarItem['id'], readonly CapabilityKey[]>> = {
  adminGallery: ['catalogue.manage'],
  payments: ['finance.reports.view'],
  reports: ['finance.reports.view', 'reports.operational.view', 'audit_logs.view'],
  newsletterSubscribers: ['newsletter.manage'],
};

function isCapabilityVisible(item: SidebarItem, can: CapabilityCheck | undefined): boolean {
  const required = NAV_CAPABILITIES[item.id];
  if (!required) return true;
  // getNavItems remains usable as a static role mapping in non-rendering
  // contexts (tests, navigation tooling). AppLayout always passes the live
  // checker, which is where capability-gated chrome is rendered.
  if (!can) return true;
  return item.id === 'reports'
    ? required.some((capability) => can(capability))
    : required.every((capability) => can(capability));
}

/**
 * Pure mapping role → main nav array. `null` (unauthenticated) and
 * `'user'` / `'supplier'` (Clerk customer roles) both fall through to
 * the customer nav. Suppliers don't have a distinct flow yet — when /
 * if PM adds one, add a SUPPLIER_NAV array and a case here.
 *
 * Lives in its own module so tests can hit it directly without
 * mounting the AppLayout component (which pulls 6+ hook dependencies).
 */
export function getNavItems(
  role: Role | null | undefined,
  can?: CapabilityCheck,
): SidebarItem[] {
  const items = (() => {
    switch (role) {
      case 'superadmin': return SUPERADMIN_NAV;
      case 'admin': return ADMIN_NAV;
      case 'staff': return STAFF_NAV;
      default: return CUSTOMER_NAV;
    }
  })();

  // Customer payments are not an internal finance surface, so no permission
  // matrix is involved for the customer nav.
  if (role === 'user' || role === 'supplier' || !role) return items;
  if (!can) return items;
  return items.filter((item) => isCapabilityVisible(item, can));
}

/**
 * Pure mapping role → footer (small bottom nav). Customers see the
 * lighter Profile + Support pair; any operator (staff and above) also
 * gets Settings.
 */
export function getFooterItems(role: Role | null | undefined): SidebarItem[] {
  // Treat anyone who isn't a Clerk customer / supplier as "operator".
  // null falls through to CUSTOMER (anonymous user shouldn't see
  // Settings).
  if (role === 'staff' || role === 'admin' || role === 'superadmin') {
    return OPERATOR_FOOTER;
  }
  return CUSTOMER_FOOTER;
}
