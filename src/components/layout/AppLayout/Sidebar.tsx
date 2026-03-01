import type { ReactElement } from 'react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Truck,
  Boxes,
  Users,
  ClipboardList,
  Bell,
  UsersRound,
  Settings,
  LifeBuoy,
  LogOut,
  CalendarDays,
} from 'lucide-react';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import type { DashboardUser, SidebarItem } from '@/types';
import { cn } from '@/utils';
import { useAuth } from '@/hooks';
import { ROUTES } from '@/constants';

interface SidebarProps {
  items: SidebarItem[];
  footerItems: SidebarItem[];
  user: DashboardUser;
  roleLabel?: string | null;
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleCollapse: () => void;
}

const iconMap: Record<string, ReactElement> = {
  dashboard: <LayoutDashboard className="h-5 w-5" />,
  truck: <Truck className="h-5 w-5" />,
  boxes: <Boxes className="h-5 w-5" />,
  users: <Users className="h-5 w-5" />,
  clipboard: <ClipboardList className="h-5 w-5" />,
  bell: <Bell className="h-5 w-5" />,
  team: <UsersRound className="h-5 w-5" />,
  settings: <Settings className="h-5 w-5" />,
  help: <LifeBuoy className="h-5 w-5" />,
  calendar: <CalendarDays className="h-5 w-5" />,
};

export function Sidebar({
  items,
  footerItems,
  user,
  roleLabel,
  isCollapsed,
  isMobileOpen,
  onCloseMobile,
  onToggleCollapse,
}: SidebarProps): ReactElement {
  const { t } = useTranslation('nav');
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { isSignedIn: isClerkSignedIn, signOut } = useClerkAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const showLabels = !isCollapsed || isMobileOpen;
  const logoSrc = showLabels ? '/images/mainlogo.svg' : '/images/favicon.svg';

  const isActive = (href: string): boolean =>
    location.pathname === href || location.pathname.startsWith(`${href}/`);

  const handleLogout = async (): Promise<void> => {
    if (isClerkSignedIn) {
      await logout();
      await signOut({ redirectUrl: ROUTES.SIGN_IN });
    } else {
      await logout();
      navigate(ROUTES.LOGIN);
    }
  };

  const renderItem = (item: SidebarItem): ReactElement => {
    const active = isActive(item.href);
    const icon = iconMap[item.icon] ?? <LayoutDashboard className="h-5 w-5" />;
    const label = t(`items.${item.id}`, item.id);

    return (
      <Link
        key={item.id}
        to={item.href}
        onClick={onCloseMobile}
        className={cn(
          'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
          showLabels ? '' : 'justify-center px-3',
          active
            ? 'bg-brand-500 text-white'
            : 'text-gray-200 hover:bg-white/10 hover:text-white'
        )}
      >
        {icon}
        {showLabels && <span>{label}</span>}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onCloseMobile}
          aria-label="Close sidebar"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-[var(--gx-sidebar)] text-white transition-all',
          'lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
          isCollapsed && !isMobileOpen ? 'w-20' : 'w-72'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'relative flex flex-col px-4 py-5',
            showLabels ? '' : 'items-center px-3'
          )}
        >
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              'flex items-center gap-3 text-left',
              showLabels ? '' : 'justify-center w-full'
            )}
            aria-label={isCollapsed ? t('sidebar.expandAriaLabel') : t('sidebar.collapseAriaLabel')}
          >
            <img
              src={logoSrc}
              alt="GlobalXpress"
              className={cn(showLabels ? 'h-8' : 'h-9')}
            />
          </button>
          {showLabels && roleLabel && (
            <span className="mt-2 self-start text-[10px] font-semibold uppercase tracking-wider text-white/50">
              {t('rolePanel', { role: roleLabel })}
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className={cn('flex-1 px-3', showLabels ? '' : 'px-2')}>
          <div className="space-y-2">{items.map(renderItem)}</div>
        </nav>

        {/* Footer */}
        <div className={cn('px-3 pb-6', showLabels ? '' : 'px-2')}>
          <div className="mb-6 space-y-2">{footerItems.map(renderItem)}</div>

          <div
            className={cn(
              'flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3',
              showLabels ? '' : 'flex-col px-2'
            )}
          >
            <img
              src={user.avatarUrl}
              alt={user.displayName}
              className="h-10 w-10 rounded-full object-cover"
              onError={(event) => {
                (event.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
            {showLabels && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{user.displayName}</p>
                <p className="text-xs text-white/60 truncate">{user.email}</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className={cn(
                'rounded-lg p-2 text-red-400 transition hover:text-red-300 hover:bg-white/10',
                showLabels ? 'ml-auto' : 'self-center'
              )}
              aria-label={t('sidebar.signOutAriaLabel')}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Logout confirmation modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <LogOut className="h-5 w-5 text-red-500" />
              </div>
            </div>
            <h3 className="text-center text-base font-semibold text-gray-900">{t('signOutModal.title')}</h3>
            <p className="mt-2 text-center text-sm text-gray-500">
              {t('signOutModal.message')}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                {t('signOutModal.cancel')}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-medium text-white transition hover:bg-red-600"
              >
                {t('signOutModal.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
