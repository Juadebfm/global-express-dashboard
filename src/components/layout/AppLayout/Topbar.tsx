import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Bell, ChevronDown, LogOut, Menu, Moon, Search, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/clerk-react';
import type { DashboardUser } from '@/types';
import type { Language } from '@/store/language/language.types';
import { useAuth, useLanguage, useNotificationCount, useInternalNotificationCount, useSearch, useTheme } from '@/hooks';
import { ROUTES } from '@/constants';
import { FlagIcon } from '@/components/ui';

interface TopbarProps {
  searchPlaceholder: string;
  user: DashboardUser;
  onOpenMobile: () => void;
}

const LANGUAGE_OPTIONS: { code: Language; flagCode: 'us' | 'kr'; label: string }[] = [
  { code: 'en', flagCode: 'us', label: 'English' },
  { code: 'ko', flagCode: 'kr', label: '한국어' },
];

export function Topbar({
  searchPlaceholder,
  user,
  onOpenMobile,
}: TopbarProps): ReactElement {
  const { t } = useTranslation('nav');
  const { query, setQuery } = useSearch();
  const { mode, toggle } = useTheme();
  const { language, setLanguage } = useLanguage();
  const isDark = mode === 'dark';

  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();

  const isAdminOrAbove = authUser?.role === 'admin' || authUser?.role === 'superadmin';
  const customerCount = useNotificationCount();
  const { data: internalCount } = useInternalNotificationCount(isAdminOrAbove);
  const notificationsCount = isAdminOrAbove ? (internalCount ?? 0) : customerCount;
  const { isSignedIn: isClerkSignedIn, signOut } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isLangOpen, setIsLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDropdownOpen && !isLangOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (isDropdownOpen && !dropdownRef.current?.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (isLangOpen && !langRef.current?.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isDropdownOpen, isLangOpen]);

  const effectiveRole = authUser?.role ?? (isClerkSignedIn ? 'user' : null);
  const roleLabel = effectiveRole ? t(`common:roles.${effectiveRole}`, effectiveRole) : null;

  const memberSinceDate: Date | null = authUser?.createdAt
    ? new Date(authUser.createdAt)
    : (clerkUser?.createdAt ?? null);

  const memberSince = memberSinceDate
    ? new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(memberSinceDate)
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

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--gx-glass-border)] bg-[var(--gx-glass-bg)] backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-4 py-3 lg:px-8">
        <div className="flex items-center gap-3 flex-1">
          <button
            type="button"
            onClick={onOpenMobile}
            className="flex items-center justify-center rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 lg:hidden"
            aria-label={t('topbar.openMenuAriaLabel')}
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
            aria-label={isDark ? t('topbar.switchToLightTheme') : t('topbar.switchToDarkTheme')}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => navigate(ROUTES.NOTIFICATIONS)}
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[var(--gx-control-bg)] text-gray-600 transition hover:bg-[var(--gx-control-bg-hover)] hover:text-gray-800"
            aria-label={t('topbar.notificationsAriaLabel')}
          >
            <Bell className="h-4 w-4" />
            {notificationsCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                {notificationsCount}
              </span>
            )}
          </button>

          {/* Language dropdown */}
          <div ref={langRef} className="relative">
            <button
              type="button"
              onClick={() => setIsLangOpen((prev) => !prev)}
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[var(--gx-control-bg)] text-gray-600 transition hover:bg-[var(--gx-control-bg-hover)] hover:text-gray-800"
              aria-label={t('topbar.languageAriaLabel')}
              aria-expanded={isLangOpen}
              aria-haspopup="true"
            >
              <FlagIcon code={LANGUAGE_OPTIONS.find((opt) => opt.code === language)?.flagCode ?? 'us'} size="md" />
            </button>

            {isLangOpen && (
              <div className="absolute right-0 top-full mt-2 w-40 rounded-xl border border-gray-200 bg-white shadow-xl z-50 py-1">
                {LANGUAGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => {
                      setLanguage(opt.code);
                      setIsLangOpen(false);
                    }}
                    className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-sm transition hover:bg-gray-50 ${
                      language === opt.code ? 'font-semibold text-brand-600 bg-brand-50' : 'text-gray-700'
                    }`}
                  >
                    <FlagIcon code={opt.flagCode} size="sm" />
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Avatar dropdown */}
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1.5 rounded-xl p-1 transition hover:bg-gray-100"
              aria-label={t('topbar.accountMenuAriaLabel')}
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
            >
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                className="h-9 w-9 rounded-full object-cover"
                onError={(event) => {
                  (event.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
              <ChevronDown
                className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-gray-200 bg-white shadow-xl z-50">
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
