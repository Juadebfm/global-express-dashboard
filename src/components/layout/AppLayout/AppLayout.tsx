import type { ReactElement, ReactNode } from 'react';
import { useState } from 'react';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/clerk-react';
import type { DashboardUi, DashboardUser } from '@/types';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { cn } from '@/utils';
import { useAuth } from '@/hooks';

interface AppLayoutProps {
  children: ReactNode;
  ui: DashboardUi;
  user: DashboardUser;
}

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

  // Determine the effective role: custom auth takes precedence, Clerk users are 'user'
  const effectiveRole = authUser?.role ?? (isClerkSignedIn ? 'user' : null);
  const isSuperAdmin = effectiveRole === 'superadmin';
  const isAdmin = effectiveRole === 'admin';
  const canManageTeam = isSuperAdmin || isAdmin;

  const filteredItems = effectiveRole
    ? ui.sidebar.items.filter((item) => {
        if (item.id === 'team' || item.id === 'users') {
          return canManageTeam;
        }
        if (item.id === 'clients') {
          return isSuperAdmin;
        }
        return true;
      })
    : ui.sidebar.items;

  // Build effective display user from whichever auth is active
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

  const handleToggleCollapse = (): void => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  const handleOpenMobile = (): void => {
    setIsMobileSidebarOpen(true);
  };

  const handleCloseMobile = (): void => {
    setIsMobileSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        items={filteredItems}
        footerItems={ui.sidebar.footer.items}
        user={effectiveUser}
        isCollapsed={isSidebarCollapsed}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={handleCloseMobile}
        onToggleCollapse={handleToggleCollapse}
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
          onOpenMobile={handleOpenMobile}
        />
        <main className="flex-1 px-6 py-6 lg:px-10 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
