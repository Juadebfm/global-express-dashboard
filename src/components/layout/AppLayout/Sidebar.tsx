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
  const logoSrc = showLabels ? '/images/mainlogo.svg' : '/images/favicon.svg';

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
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              'flex items-center gap-3 text-left',
              showLabels ? '' : 'justify-center w-full'
            )}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <img
              src={logoSrc}
              alt="GlobalXpress"
              className={cn(showLabels ? 'h-8' : 'h-9')}
            />
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
              className={cn(
                'rounded-lg p-2 text-red-500 hover:text-red-600 hover:bg-white/10',
                showLabels ? 'ml-auto' : 'self-center'
              )}
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
