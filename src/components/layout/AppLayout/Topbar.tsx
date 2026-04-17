import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Bell, ChevronDown, LogOut, Menu, ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/clerk-react';
import type { DashboardUser } from '@/types';
import { useAuth, useNotificationCount } from '@/hooks';
import { ROUTES } from '@/constants';

interface TopbarProps {
  user: DashboardUser;
  onOpenMobile: () => void;
}

export function Topbar({
  user,
  onOpenMobile,
}: TopbarProps): ReactElement {
  const { t } = useTranslation('nav');
  const location = useLocation();
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();

  const notificationsCount = useNotificationCount();
  const { isSignedIn: isClerkSignedIn, signOut } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (isDropdownOpen && !dropdownRef.current?.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isDropdownOpen]);

  const effectiveRole = authUser?.role ?? (isClerkSignedIn ? 'user' : null);
  const roleLabel = effectiveRole ? t(`common:roles.${effectiveRole}`, effectiveRole) : null;

  const memberSinceDate: Date | null = authUser?.createdAt
    ? new Date(authUser.createdAt)
    : (clerkUser?.createdAt ?? null);

  const memberSince = memberSinceDate
    ? new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(memberSinceDate)
    : null;

  const handleLogout = async (): Promise<void> => {
    setIsDropdownOpen(false);
    if (isClerkSignedIn) {
      await logout();
      await signOut({ redirectUrl: ROUTES.SIGN_IN });
    } else {
      await logout();
      navigate(ROUTES.LOGIN);
    }
  };

  const isDashboardLikeRoute = location.pathname === ROUTES.DASHBOARD || location.pathname === ROUTES.ADMIN_DASHBOARD;

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-3 py-4 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobile}
            className="flex items-center justify-center rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 lg:hidden"
            aria-label={t('topbar.openMenuAriaLabel')}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center justify-center">
          <img src="/images/mainlogo.svg" alt="GlobalXpress" className="h-10 w-auto" />
        </div>

        <div className="flex items-center justify-end gap-3">
          {!isDashboardLikeRoute && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-sm font-medium text-brand-500 transition hover:text-brand-600"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t('common:actions.back', 'Back')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate(ROUTES.NOTIFICATIONS)}
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label={t('topbar.notificationsAriaLabel')}
          >
            <Bell className="h-4 w-4" />
            {notificationsCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                {notificationsCount}
              </span>
            )}
          </button>

          {/* Avatar dropdown */}
          <div ref={dropdownRef} className="relative" data-tour="user-profile">
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-xl p-1 transition hover:bg-gray-100"
              aria-label={t('topbar.accountMenuAriaLabel')}
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
            >
              <span className="hidden text-sm font-medium text-gray-600 lg:inline">
                {user.displayName}
              </span>
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                className="h-10 w-10 rounded-full border-2 border-brand-500 object-cover"
                onError={(event) => {
                  (event.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
              <ChevronDown
                className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-gray-200 bg-white shadow-xl">
                {/* User identity */}
                <div className="flex items-center gap-3 border-b border-gray-100 p-4">
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName}
                    className="h-11 w-11 rounded-full object-cover"
                    onError={(event) => {
                      (event.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{user.displayName}</p>
                    <p className="truncate text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>

                {/* Meta info */}
                <div className="space-y-3 p-4">
                  {roleLabel && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{t('topbar.roleLabel')}</span>
                      <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                        {roleLabel}
                      </span>
                    </div>
                  )}
                  {memberSince && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{t('topbar.memberSince')}</span>
                      <span className="text-xs font-medium text-gray-700">{memberSince}</span>
                    </div>
                  )}
                </div>

                {/* Logout */}
                <div className="border-t border-gray-100 p-2">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-500 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <LogOut className="h-4 w-4" />
                    {t('topbar.signOut')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
