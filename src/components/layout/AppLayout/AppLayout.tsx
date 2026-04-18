import type { ReactElement, ReactNode } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/clerk-react';
import type { DashboardUser, SidebarItem } from '@/types';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { WelcomePopup, OnboardingTour, useOnboarding } from '@/components/onboarding';
import { cn } from '@/utils';
import { useAuth, useDashboardData, usePushNotifications, useWebSocket } from '@/hooks';
import { ROUTES } from '@/constants';

interface AppLayoutProps {
  children: ReactNode;
  user: DashboardUser;
}

// ── Role-based nav definitions ────────────────────────────────────────────────

const CUSTOMER_NAV: SidebarItem[] = [
  { id: 'dashboard', icon: 'dashboard', href: ROUTES.DASHBOARD },
  { id: 'shipments', icon: 'truck', href: ROUTES.SHIPMENTS },
  { id: 'orders', icon: 'clipboard', href: ROUTES.ORDERS },
  { id: 'deliverySchedule', icon: 'calendar', href: ROUTES.DELIVERY_SCHEDULE },
  { id: 'payments', icon: 'wallet', href: ROUTES.PAYMENTS },
  { id: 'notification', icon: 'bell', href: ROUTES.NOTIFICATIONS },
];

const STAFF_NAV: SidebarItem[] = [
  { id: 'dashboard', icon: 'dashboard', href: ROUTES.ADMIN_DASHBOARD },
  { id: 'shipments', icon: 'truck', href: ROUTES.SHIPMENTS },
  { id: 'orders', icon: 'clipboard', href: ROUTES.ORDERS },
  { id: 'bulkOrders', icon: 'package', href: ROUTES.BULK_ORDERS },
  { id: 'notification', icon: 'bell', href: ROUTES.NOTIFICATIONS },
];

const ADMIN_NAV: SidebarItem[] = [
  { id: 'dashboard', icon: 'dashboard', href: ROUTES.ADMIN_DASHBOARD },
  { id: 'shipments', icon: 'truck', href: ROUTES.SHIPMENTS },
  { id: 'orders', icon: 'clipboard', href: ROUTES.ORDERS },
  { id: 'bulkOrders', icon: 'package', href: ROUTES.BULK_ORDERS },
  { id: 'clients', icon: 'users', href: ROUTES.CLIENTS },
  { id: 'notification', icon: 'bell', href: ROUTES.NOTIFICATIONS },
  { id: 'team', icon: 'team', href: ROUTES.TEAM },
  { id: 'reports', icon: 'chart', href: ROUTES.REPORTS },
];

const SUPERADMIN_NAV: SidebarItem[] = [
  { id: 'dashboard', icon: 'dashboard', href: ROUTES.ADMIN_DASHBOARD },
  { id: 'shipments', icon: 'truck', href: ROUTES.SHIPMENTS },
  { id: 'orders', icon: 'clipboard', href: ROUTES.ORDERS },
  { id: 'bulkOrders', icon: 'package', href: ROUTES.BULK_ORDERS },
  { id: 'clients', icon: 'users', href: ROUTES.CLIENTS },
  { id: 'payments', icon: 'wallet', href: ROUTES.PAYMENTS },
  { id: 'notification', icon: 'bell', href: ROUTES.NOTIFICATIONS },
  { id: 'team', icon: 'team', href: ROUTES.TEAM },
  { id: 'reports', icon: 'chart', href: ROUTES.REPORTS },
];

const CUSTOMER_FOOTER: SidebarItem[] = [
  { id: 'profile', icon: 'users', href: ROUTES.PROFILE },
  { id: 'support', icon: 'help', href: ROUTES.SUPPORT },
];

const OPERATOR_FOOTER: SidebarItem[] = [
  { id: 'profile', icon: 'users', href: ROUTES.PROFILE },
  { id: 'settings', icon: 'settings', href: ROUTES.SETTINGS },
  { id: 'support', icon: 'help', href: ROUTES.SUPPORT },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function AppLayout({ children, user }: AppLayoutProps): ReactElement {
  const { t } = useTranslation('nav');
  const { user: authUser } = useAuth();
  const { isSignedIn: isClerkSignedIn } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();
  useWebSocket();

  // Register browser push notifications for operator users
  const isOperator = !!authUser;
  usePushNotifications(isOperator);

  const location = useLocation();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const effectiveRole = authUser?.role ?? (isClerkSignedIn ? 'user' : null);
  const isCustomer = effectiveRole === 'user';

  // ── Onboarding (customers only) ──────────────────────────────────────────────
  const { data: dashboardData, isLoading: dashboardLoading } = useDashboardData();
  // Treat loading as "has data" to avoid a welcome popup flash for returning users
  const hasData =
    !isCustomer ||
    dashboardLoading ||
    (dashboardData?.kpis ?? []).some((kpi) => kpi.value > 0);
  const isDashboard = location.pathname === ROUTES.DASHBOARD;
  const { showWelcome, runTour, dismissWelcome, completeTour } =
    useOnboarding(isCustomer, hasData, isDashboard);

  const navItems: SidebarItem[] = (() => {
    switch (effectiveRole) {
      case 'superadmin': return SUPERADMIN_NAV;
      case 'admin': return ADMIN_NAV;
      case 'staff': return STAFF_NAV;
      default: return CUSTOMER_NAV;
    }
  })();

  const footerItems: SidebarItem[] = isCustomer ? CUSTOMER_FOOTER : OPERATOR_FOOTER;

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
        footerItems={footerItems}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      <div
        className={cn(
          'min-h-screen flex flex-col transition-all',
          'lg:pl-28'
        )}
      >
        <Topbar
          user={effectiveUser}
          onOpenMobile={() => setIsMobileSidebarOpen(true)}
        />
        <main className="flex-1 px-6 py-6 lg:px-10 lg:py-8">{children}</main>
      </div>

      {/* Customer onboarding */}
      {showWelcome && (
        <WelcomePopup
          displayName={effectiveUser.displayName}
          onDismiss={dismissWelcome}
        />
      )}
      <OnboardingTour run={runTour} onComplete={completeTour} />
    </div>
  );
}
