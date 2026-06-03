import type { ReactElement, ReactNode } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/clerk-react';
import type { DashboardUser } from '@/types';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { getFooterItems, getNavItems } from './navConfig';
import { WelcomePopup, OnboardingTour, useOnboarding } from '@/components/onboarding';
import { cn } from '@/utils';
import { useAuth, useDashboardData, usePushNotifications, useWebSocket } from '@/hooks';
import { ROUTES } from '@/constants';

interface AppLayoutProps {
  children: ReactNode;
  user: DashboardUser;
}

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

  const navItems = getNavItems(effectiveRole);
  const footerItems = getFooterItems(effectiveRole);

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
