import type { ReactElement, ReactNode } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/clerk-react';
import type { DashboardUi, DashboardUser, SidebarItem } from '@/types';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { cn } from '@/utils';
import { useAuth, usePushNotifications, useWebSocket } from '@/hooks';
import { ROUTES } from '@/constants';

interface AppLayoutProps {
  children: ReactNode;
  ui: DashboardUi;
  user: DashboardUser;
}

// ── Role-based nav definitions ────────────────────────────────────────────────

const CUSTOMER_NAV: SidebarItem[] = [
  { id: 'dashboard', icon: 'dashboard', href: ROUTES.DASHBOARD },
  { id: 'shipments', icon: 'truck', href: ROUTES.SHIPMENTS },
  { id: 'deliverySchedule', icon: 'calendar', href: ROUTES.DELIVERY_SCHEDULE },
  { id: 'payments', icon: 'wallet', href: ROUTES.PAYMENTS },
  { id: 'notification', icon: 'bell', href: ROUTES.NOTIFICATIONS },
];

const OPERATOR_NAV: SidebarItem[] = [
  { id: 'dashboard', icon: 'dashboard', href: ROUTES.ADMIN_DASHBOARD },
  { id: 'shipments', icon: 'truck', href: ROUTES.SHIPMENTS },
  { id: 'orders', icon: 'clipboard', href: ROUTES.ORDERS },
  { id: 'bulkOrders', icon: 'package', href: ROUTES.BULK_ORDERS },
  { id: 'clients', icon: 'users', href: ROUTES.CLIENTS },
  { id: 'payments', icon: 'wallet', href: ROUTES.PAYMENTS },
  { id: 'notification', icon: 'bell', href: ROUTES.NOTIFICATIONS },
];

const ADMIN_EXTRA_NAV: SidebarItem[] = [
  { id: 'team', icon: 'team', href: ROUTES.TEAM },
  { id: 'reports', icon: 'chart', href: ROUTES.REPORTS },
];

const FOOTER_NAV: SidebarItem[] = [
  { id: 'settings', icon: 'settings', href: ROUTES.SETTINGS },
  { id: 'support', icon: 'help', href: ROUTES.SUPPORT },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function AppLayout({ children, ui, user }: AppLayoutProps): ReactElement {
  const { t } = useTranslation('nav');
  const { user: authUser } = useAuth();
  const { isSignedIn: isClerkSignedIn } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();
  useWebSocket();

  // Register browser push notifications for operator users
  const isOperator = !!authUser;
  usePushNotifications(isOperator);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const effectiveRole = authUser?.role ?? (isClerkSignedIn ? 'user' : null);
  const isCustomer = effectiveRole === 'user';
  const isSuperAdminOrAdmin = effectiveRole === 'superadmin' || effectiveRole === 'admin';

  const navItems: SidebarItem[] = isCustomer
    ? CUSTOMER_NAV
    : isSuperAdminOrAdmin
      ? [...OPERATOR_NAV, ...ADMIN_EXTRA_NAV]
      : OPERATOR_NAV;

  const roleLabel = effectiveRole && !isCustomer
    ? t(`common:roles.${effectiveRole}`, effectiveRole)
    : null;

  const effectiveUser: DashboardUser = (() => {
    if (authUser) {
      const translatedRole = t(`common:roles.${authUser.role}`, 'User');
      const englishRole = t(`common:roles.${authUser.role}`, { lng: 'en' }) as string;
      const rawName =
        authUser.firstName && authUser.lastName
          ? `${authUser.firstName} ${authUser.lastName}`
          : null;
      const displayName =
        rawName && rawName.toLowerCase() !== englishRole.toLowerCase()
          ? rawName
          : translatedRole;
      return {
        displayName,
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
        roleLabel={roleLabel}
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
          user={effectiveUser}
          onOpenMobile={() => setIsMobileSidebarOpen(true)}
        />
        <main className="flex-1 px-6 py-6 lg:px-10 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
