import type { ReactElement, ReactNode } from 'react';
import { useState } from 'react';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/clerk-react';
import type { DashboardUi, DashboardUser, SidebarItem } from '@/types';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { cn } from '@/utils';
import { useAuth } from '@/hooks';
import { ROUTES } from '@/constants';

interface AppLayoutProps {
  children: ReactNode;
  ui: DashboardUi;
  user: DashboardUser;
}

// ── Role-based nav definitions ────────────────────────────────────────────────

const CUSTOMER_NAV: SidebarItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: ROUTES.DASHBOARD },
  { id: 'shipments', label: 'Shipments', icon: 'truck', href: ROUTES.SHIPMENTS },
  { id: 'deliverySchedule', label: 'Delivery Schedule', icon: 'calendar', href: ROUTES.DELIVERY_SCHEDULE },
  { id: 'notification', label: 'Notification', icon: 'bell', href: ROUTES.NOTIFICATIONS },
];

const OPERATOR_NAV: SidebarItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: ROUTES.ADMIN_DASHBOARD },
  { id: 'shipments', label: 'Shipments', icon: 'truck', href: ROUTES.SHIPMENTS },
  { id: 'orders', label: 'Orders', icon: 'clipboard', href: ROUTES.ORDERS },
  { id: 'clients', label: 'Clients', icon: 'users', href: ROUTES.CLIENTS },
  { id: 'notification', label: 'Notification', icon: 'bell', href: ROUTES.NOTIFICATIONS },
];

const ADMIN_EXTRA_NAV: SidebarItem[] = [
  { id: 'users', label: 'Users', icon: 'users', href: ROUTES.USERS },
  { id: 'team', label: 'Team', icon: 'team', href: ROUTES.TEAM },
];

const FOOTER_NAV: SidebarItem[] = [
  { id: 'settings', label: 'Settings', icon: 'settings', href: ROUTES.SETTINGS },
  { id: 'support', label: 'Support', icon: 'help', href: ROUTES.SUPPORT },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function AppLayout({ children, ui, user }: AppLayoutProps): ReactElement {
  const { user: authUser } = useAuth();
  const { isSignedIn: isClerkSignedIn } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const roleLabelMap: Record<string, string> = {
    superadmin: 'Super Admin',
    admin: 'Admin',
    staff: 'Staff',
    user: 'User',
  };

  const effectiveRole = authUser?.role ?? (isClerkSignedIn ? 'user' : null);
  const isCustomer = effectiveRole === 'user';
  const isSuperAdminOrAdmin = effectiveRole === 'superadmin' || effectiveRole === 'admin';

  const navItems: SidebarItem[] = isCustomer
    ? CUSTOMER_NAV
    : isSuperAdminOrAdmin
      ? [...OPERATOR_NAV, ...ADMIN_EXTRA_NAV]
      : OPERATOR_NAV;

  const effectiveUser: DashboardUser = (() => {
    if (authUser) {
      return {
        displayName:
          authUser.firstName && authUser.lastName
            ? `${authUser.firstName} ${authUser.lastName}`
            : roleLabelMap[authUser.role] ?? 'User',
        email: authUser.email,
        avatarUrl: '/images/favicon.svg',
      };
    }
    if (isClerkSignedIn && clerkUser) {
      return {
        displayName:
          clerkUser.fullName ||
          clerkUser.firstName ||
          clerkUser.emailAddresses[0]?.emailAddress ||
          'Customer',
        email: clerkUser.emailAddresses[0]?.emailAddress ?? '',
        avatarUrl: clerkUser.imageUrl || '/images/favicon.svg',
      };
    }
    return user;
  })();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        items={navItems}
        footerItems={FOOTER_NAV}
        user={effectiveUser}
        isCollapsed={isSidebarCollapsed}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      <div
        className={cn(
          'min-h-screen flex flex-col transition-all',
          isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'
        )}
      >
        <Topbar
          searchPlaceholder={ui.topbar.searchPlaceholder}
          notificationsCount={ui.topbar.notifications.unreadCount}
          user={effectiveUser}
          onOpenMobile={() => setIsMobileSidebarOpen(true)}
        />
        <main className="flex-1 px-6 py-6 lg:px-10 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
