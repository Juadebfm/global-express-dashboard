import type { ReactElement } from 'react';
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
  CalendarDays,
  Wallet,
  Package,
  ChartColumnIncreasing,
} from 'lucide-react';
import type { SidebarItem } from '@/types';
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

  const isActive = (href: string): boolean =>
    location.pathname === href || location.pathname.startsWith(`${href}/`);

  const renderItem = (item: SidebarItem): ReactElement => {
    const active = isActive(item.href);
    const icon = iconMap[item.icon] ?? <LayoutDashboard className="h-5 w-5" />;
    const label = t(`items.${item.id}`, item.id);

    return (
      <Link
        key={item.id}
        to={item.href}
        onClick={onCloseMobile}
        data-tour={`nav-${item.id}`}
        className={cn(
          'group relative flex min-h-24 flex-col items-center justify-center gap-1.5 border-b border-gray-100 px-2 py-3 text-center text-sm font-medium transition-colors',
          active
            ? 'bg-[#FFF7F2] text-brand-500'
            : 'text-gray-700 hover:bg-gray-50'
        )}
      >
        {active && (
          <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-brand-500" />
        )}
        <span className={cn(active ? 'text-brand-500' : 'text-gray-500 group-hover:text-gray-700')}>
          {icon}
        </span>
        <span className={cn('leading-tight', active ? 'text-brand-500' : 'text-gray-700')}>
          {label}
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
          'fixed inset-y-0 left-0 z-50 flex w-28 flex-col border-r border-gray-200 bg-white text-gray-800 transition-transform',
          'lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto">
          <div>{items.map(renderItem)}</div>
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-200">
          {footerItems.map(renderItem)}
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="group relative flex min-h-24 w-full flex-col items-center justify-center gap-1.5 px-2 py-3 text-center text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Users className="h-5 w-5 text-gray-500 group-hover:text-gray-700" />
            <span>{t('items.profile', 'Profile')}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
