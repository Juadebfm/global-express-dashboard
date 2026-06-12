import type { ReactElement } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Bell,
  Boxes,
  CalendarDays,
  ChartColumnIncreasing,
  ClipboardList,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Package,
  Settings,
  Shield,
  Truck,
  Users,
  UsersRound,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/clerk-react';
import type { SidebarItem } from '@/types';
import { useAuth, useNotificationCount, useOpenSupportTicketCount, useUndeliveredOrderCount } from '@/hooks';
import { ROUTES } from '@/constants';
import { cn } from '@/utils';

interface SidebarProps {
  items: SidebarItem[];
  footerItems: SidebarItem[];
  isMobileOpen: boolean;
  onCloseMobile: () => void;
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
  wallet: <Wallet className="h-5 w-5" />,
  package: <Package className="h-5 w-5" />,
  chart: <ChartColumnIncreasing className="h-5 w-5" />,
  shield: <Shield className="h-5 w-5" />,
};

export function Sidebar({
  items,
  footerItems,
  isMobileOpen,
  onCloseMobile,
}: SidebarProps): ReactElement {
  const { t } = useTranslation('nav');
  const location = useLocation();
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();
  const { isSignedIn: isClerkSignedIn, signOut } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();
  const notificationsCount = useNotificationCount();
  const openSupportCount = useOpenSupportTicketCount();
  const undeliveredOrderCount = useUndeliveredOrderCount();
  const isOperator = !!authUser && authUser.role !== undefined;

  const isDashboardLikeRoute =
    location.pathname === ROUTES.DASHBOARD || location.pathname === ROUTES.ADMIN_DASHBOARD;

  // Derive display info for mobile user header
  const displayName = authUser
    ? (authUser.firstName && authUser.lastName
        ? `${authUser.firstName} ${authUser.lastName}`
        : authUser.email)
    : (clerkUser?.fullName ?? clerkUser?.firstName ?? clerkUser?.emailAddresses[0]?.emailAddress ?? 'User');
  const email = authUser?.email ?? clerkUser?.emailAddresses[0]?.emailAddress ?? '';
  const avatarUrl = isClerkSignedIn ? (clerkUser?.imageUrl || '/images/favicon.svg') : '/images/favicon.svg';

  const handleLogout = async (): Promise<void> => {
    onCloseMobile();
    if (isClerkSignedIn) {
      await logout();
      await signOut({ redirectUrl: ROUTES.SIGN_IN });
    } else {
      await logout();
      navigate(ROUTES.LOGIN);
    }
  };

  const isActive = (href: string): boolean =>
    location.pathname === href || location.pathname.startsWith(`${href}/`);

  const renderItem = (item: SidebarItem): ReactElement => {
    const active = isActive(item.href);
    const icon = iconMap[item.icon] ?? <LayoutDashboard className="h-5 w-5" />;
    const label = t(`items.${item.id}`, item.id);
    const showSupportBadge = item.id === 'support' && isOperator && openSupportCount > 0;
    const showOrdersBadge = item.id === 'orders' && isOperator && undeliveredOrderCount > 0;

    return (
      <Link
        key={item.id}
        to={item.href}
        onClick={onCloseMobile}
        data-tour={`nav-${item.id}`}
        className={cn(
          'group relative flex border-b border-gray-100 text-sm font-medium transition-colors',
          // Mobile: horizontal icon + label
          'items-center gap-3 px-4 py-3.5',
          // Desktop: stacked vertical icon + label — no min-h so all items fit without scrolling
          'lg:flex-col lg:items-center lg:justify-center lg:gap-1 lg:px-2 lg:py-3 lg:text-center',
          active ? 'bg-[#FFF7F2] text-brand-500' : 'text-gray-700 hover:bg-gray-50',
        )}
      >
        {active && (
          <span className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full bg-brand-500 lg:top-2 lg:bottom-2" />
        )}
        <span className={cn('relative', active ? 'text-brand-500' : 'text-gray-500 group-hover:text-gray-700')}>
          {icon}
          {showSupportBadge && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-semibold text-white leading-none">
              {openSupportCount > 99 ? '99+' : openSupportCount}
            </span>
          )}
          {showOrdersBadge && !showSupportBadge && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-semibold text-white leading-none">
              {undeliveredOrderCount > 99 ? '99+' : undeliveredOrderCount}
            </span>
          )}
        </span>
        <span className={cn('leading-tight lg:text-xs', active ? 'text-brand-500' : 'text-gray-700')}>
          {label}
          {showSupportBadge && (
            <span className="ml-2 inline-flex items-center rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-semibold text-white lg:hidden">
              {openSupportCount > 99 ? '99+' : openSupportCount}
            </span>
          )}
          {showOrdersBadge && !showSupportBadge && (
            <span className="ml-2 inline-flex items-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-semibold text-white lg:hidden">
              {undeliveredOrderCount > 99 ? '99+' : undeliveredOrderCount}
            </span>
          )}
        </span>
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
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-gray-200 bg-white text-gray-800 transition-transform',
          // Mobile wider, desktop narrow
          'w-72 lg:w-28',
          'lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* ── Mobile-only drawer header ── */}
        <div className="flex flex-col border-b border-gray-100 lg:hidden">
          {/* User info + close button in one row */}
          <div className="flex items-center gap-3 px-4 py-4">
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-10 w-10 rounded-full border-2 border-brand-500 object-cover shrink-0"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900">{displayName}</p>
              <p className="truncate text-xs text-gray-400">{email}</p>
            </div>
            <button
              type="button"
              onClick={onCloseMobile}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Back + Notifications row */}
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            {!isDashboardLikeRoute ? (
              <button
                type="button"
                onClick={() => { navigate(-1); onCloseMobile(); }}
                className="flex items-center gap-1.5 text-sm font-medium text-brand-500 hover:text-brand-600 transition"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            ) : <span />}

            <button
              type="button"
              onClick={() => { navigate(ROUTES.NOTIFICATIONS); onCloseMobile(); }}
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {notificationsCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                  {notificationsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto">
          <div>{items.map(renderItem)}</div>
        </nav>

        {/* ── Footer nav items ── */}
        <div className="border-t border-gray-200">
          {footerItems.map(renderItem)}
        </div>

        {/* ── Logout ── */}
        <div className="border-t border-gray-200">
          <button
            type="button"
            onClick={() => void handleLogout()}
            className={cn(
              'group flex w-full border-b border-gray-100 text-sm font-medium transition-colors',
              'items-center gap-3 px-4 py-3.5',
              'lg:flex-col lg:items-center lg:justify-center lg:gap-1 lg:px-2 lg:py-3 lg:text-center',
              'text-red-500 hover:bg-red-50 hover:text-red-600',
            )}
          >
            <LogOut className="h-5 w-5" />
            <span className="leading-tight lg:text-xs">Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
