import type { ReactElement } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import type { DashboardUser, SidebarItem } from '@/types';
import { cn } from '@/utils';
import { useAuth } from '@/hooks';

interface SidebarProps {
  items: SidebarItem[];
  footerItems: SidebarItem[];
  user: DashboardUser;
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
};

export function Sidebar({
  items,
  footerItems,
  user,
  isCollapsed,
  isMobileOpen,
  onCloseMobile,
  onToggleCollapse,
}: SidebarProps): ReactElement {
  const location = useLocation();
  const { logout } = useAuth();
  const showLabels = !isCollapsed || isMobileOpen;

  const isActive = (href: string): boolean =>
    location.pathname === href || location.pathname.startsWith(`${href}/`);

  const renderItem = (item: SidebarItem): ReactElement => {
    const active = isActive(item.href);
    const icon = iconMap[item.icon] ?? <LayoutDashboard className="h-5 w-5" />;

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
        {showLabels && <span>{item.label}</span>}
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
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-[#1F1F1F] text-white transition-all',
          'lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
          isCollapsed && !isMobileOpen ? 'w-20' : 'w-72'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'relative flex items-center justify-between px-4 py-5',
            showLabels ? '' : 'px-3'
          )}
        >
          <div className={cn('flex items-center gap-3', showLabels ? '' : 'justify-center w-full')}>
            <img
              src="/images/mainlogo.svg"
              alt="GlobalXpress"
              className={cn('h-8', showLabels ? '' : 'h-7')}
            />
            {showLabels && (
              <span className="text-xs text-white/60">International Freight Agent</span>
            )}
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              'hidden lg:flex items-center justify-center rounded-lg bg-white/10 p-2 text-white hover:bg-white/20',
              isCollapsed && 'absolute right-3'
            )}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
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
              onClick={logout}
              className="ml-auto rounded-lg p-2 text-white/70 hover:text-white hover:bg-white/10"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
