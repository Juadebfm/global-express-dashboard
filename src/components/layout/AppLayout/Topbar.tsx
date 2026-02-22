import type { ReactElement } from 'react';
import { Bell, Globe, Menu, Moon, Search, Sun } from 'lucide-react';
import type { DashboardUser } from '@/types';
import { useSearch, useTheme } from '@/hooks';

interface TopbarProps {
  searchPlaceholder: string;
  notificationsCount: number;
  user: DashboardUser;
  onOpenMobile: () => void;
}

export function Topbar({
  searchPlaceholder,
  notificationsCount,
  user,
  onOpenMobile,
}: TopbarProps): ReactElement {
  const { query, setQuery } = useSearch();
  const { mode, toggle } = useTheme();
  const isDark = mode === 'dark';

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--gx-glass-border)] bg-[var(--gx-glass-bg)] backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-4 py-3 lg:px-8">
        <div className="flex items-center gap-3 flex-1">
          <button
            type="button"
            onClick={onOpenMobile}
            className="flex items-center justify-center rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:bg-white"
              aria-label="Search"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[var(--gx-control-bg)] text-gray-600 transition hover:bg-[var(--gx-control-bg-hover)] hover:text-gray-800"
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[var(--gx-control-bg)] text-gray-600 transition hover:bg-[var(--gx-control-bg-hover)] hover:text-gray-800"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {notificationsCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                {notificationsCount}
              </span>
            )}
          </button>
          <button
            type="button"
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[var(--gx-control-bg)] text-gray-600 transition hover:bg-[var(--gx-control-bg-hover)] hover:text-gray-800"
            aria-label="Language"
          >
            <Globe className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <img
              src={user.avatarUrl}
              alt={user.displayName}
              className="h-9 w-9 rounded-full object-cover"
              onError={(event) => {
                (event.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
