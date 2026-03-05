import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bookmark, CheckCheck, Info, RotateCcw, Trash2 } from 'lucide-react';
import {
  useAuth,
  useDashboardData,
  useInternalNotifications,
  useNotifications,
  useSearch,
} from '@/hooks';
import type { ApiInternalNotification, ApiNotification } from '@/types';
import { AppShell } from '@/pages/shared';
import { cn } from '@/utils';
import i18n from '@/i18n/i18n';

interface NotificationItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  time: string;
  dateTime: string;
  unread: boolean;
  saved: boolean;
}

function getLocale(): string {
  return i18n.language === 'ko' ? 'ko-KR' : 'en-US';
}

function formatTime(iso: string): string {
  const locale = getLocale();
  const date = new Date(iso);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (isToday) {
    return date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
  }
  return (
    date.toLocaleDateString(locale, { month: 'short', day: 'numeric' }) +
    ', ' +
    date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
  );
}

function formatDateTime(iso: string): string {
  const locale = getLocale();
  const date = new Date(iso);
  return (
    date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' - ' +
    date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
  );
}

function mapApiNotification(n: ApiNotification): NotificationItem {
  const content = n.body ?? n.message;
  const truncated = content.length > 80 ? content.slice(0, 80) + '…' : content;
  return {
    id: n.id,
    title: n.title,
    subtitle: n.subtitle ?? truncated,
    description: content,
    time: formatTime(n.createdAt),
    dateTime: formatDateTime(n.createdAt),
    unread: !n.isRead,
    saved: n.isSaved,
  };
}

function mapInternalNotification(n: ApiInternalNotification): NotificationItem {
  const truncated = n.body.length > 80 ? n.body.slice(0, 80) + '…' : n.body;
  return {
    id: n.id,
    title: n.title,
    subtitle: truncated,
    description: n.body,
    time: formatTime(n.createdAt),
    dateTime: formatDateTime(n.createdAt),
    unread: n.readAt === null,
    saved: false,
  };
}

// ── Operator (internal) notifications view ──────────────────────────────────

function InternalNotificationsView(): ReactElement {
  const { t } = useTranslation('notifications');
  const { query } = useSearch();
  const {
    notifications: apiNotifications,
    isLoading: notifLoading,
    markRead,
    markAllRead,
  } = useInternalNotifications({ limit: 50 });
  const { data, isLoading, error } = useDashboardData();

  const [activeNotification, setActiveNotification] = useState<NotificationItem | null>(null);
  const [readOverrides, setReadOverrides] = useState<Set<string>>(new Set());

  const items = useMemo(
    () =>
      apiNotifications.map(mapInternalNotification).map((item) => ({
        ...item,
        unread: readOverrides.has(item.id) ? false : item.unread,
      })),
    [apiNotifications, readOverrides],
  );

  const filteredItems = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return items;
    return items.filter((item) =>
      `${item.title} ${item.subtitle} ${item.description}`.toLowerCase().includes(value),
    );
  }, [items, query]);

  const newItems = filteredItems.filter((item) => item.unread);
  const oldItems = filteredItems.filter((item) => !item.unread);

  const handleMarkAllRead = (): void => {
    markAllRead();
    setReadOverrides(new Set(items.map((i) => i.id)));
  };

  const openNotification = (item: NotificationItem): void => {
    if (item.unread) {
      markRead(item.id);
      setReadOverrides((prev) => new Set(prev).add(item.id));
    }
    setActiveNotification({ ...item, unread: false });
  };

  const renderRow = (item: NotificationItem): ReactElement => (
    <div
      key={item.id}
      onClick={() => openNotification(item)}
      className={cn(
        'flex cursor-pointer items-start justify-between gap-4 px-6 py-4 transition',
        item.unread ? 'bg-rose-50' : 'bg-white',
        item.unread ? 'hover:bg-rose-100/70' : 'hover:bg-gray-50',
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'mt-1.5 h-2 w-2 shrink-0 rounded-full',
            item.unread ? 'bg-brand-500' : 'bg-transparent',
          )}
        />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-gray-800">{item.title}</p>
            {item.unread && (
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-600">
                {t('badges.new')}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">{item.subtitle}</p>
        </div>
      </div>
      <span className="text-xs font-medium text-gray-500">{item.time}</span>
    </div>
  );

  return (
    <AppShell
      data={data}
      isLoading={isLoading || notifLoading}
      error={error}
      loadingLabel={t('loadingLabel')}
    >
      <div className="rounded-3xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 px-6 py-5">
          <h1 className="text-xl font-semibold text-gray-900">{t('pageTitle')}</h1>
          <div className="flex flex-wrap items-center gap-2">
            {newItems.length > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:border-gray-300 hover:text-gray-800"
              >
                <CheckCheck className="h-4 w-4" />
                {t('markAllRead')}
              </button>
            )}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-semibold text-gray-700">{t('empty.title')}</p>
            <p className="mt-2 text-sm text-gray-500">{t('empty.subtitle')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {newItems.length > 0 && (
              <div className="bg-gray-50/70 px-6 py-2 text-xs font-semibold uppercase text-gray-500">
                {t('sections.new')}
              </div>
            )}
            {newItems.map((item) => renderRow(item))}
            {oldItems.length > 0 && (
              <div className="bg-gray-50/70 px-6 py-2 text-xs font-semibold uppercase text-gray-500">
                {t('sections.earlier')}
              </div>
            )}
            {oldItems.map((item) => renderRow(item))}
          </div>
        )}
      </div>

      {activeNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white p-7 shadow-xl">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-gray-900">
                {activeNotification.title}
              </h2>
              <p className="text-sm text-gray-600">{activeNotification.subtitle}</p>
              <p className="text-xs font-medium text-gray-500">{activeNotification.dateTime}</p>
            </div>

            <div className="mt-6 rounded-2xl bg-gray-50 px-4 py-4 text-sm text-gray-600">
              {activeNotification.description}
            </div>

            <div className="mt-8 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setActiveNotification(null)}
                className="rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-200"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

// ── Customer notifications view ─────────────────────────────────────────────

function CustomerNotificationsView(): ReactElement {
  const { t } = useTranslation('notifications');
  const { data, isLoading, error } = useDashboardData();
  const { query } = useSearch();
  const {
    notifications: apiNotifications,
    isLoading: notifLoading,
    markRead,
    toggleSave,
    deleteOne,
    deleteBulk,
    refresh,
  } = useNotifications();

  const [itemOverrides, setItemOverrides] = useState<
    Record<string, Partial<Pick<NotificationItem, 'saved' | 'unread'>>>
  >({});
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeNotification, setActiveNotification] = useState<NotificationItem | null>(null);

  const items = useMemo(
    () =>
      apiNotifications.map(mapApiNotification).map((item) => ({
        ...item,
        ...itemOverrides[item.id],
      })),
    [apiNotifications, itemOverrides],
  );

  const visibleItems = useMemo(
    () => items.filter((item) => !deletedIds.has(item.id)),
    [items, deletedIds],
  );

  const filteredItems = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return visibleItems;
    return visibleItems.filter((item) =>
      `${item.title} ${item.subtitle} ${item.description}`.toLowerCase().includes(value),
    );
  }, [visibleItems, query]);

  const newItems = filteredItems.filter((item) => item.unread);
  const oldItems = filteredItems.filter((item) => !item.unread);
  const hasSelection = selectedIds.size > 0;

  const toggleSelection = (id: string): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSaveSelected = (): void => {
    if (!hasSelection) return;
    const shouldSave = items.some((item) => selectedIds.has(item.id) && !item.saved);
    selectedIds.forEach((id) => toggleSave(id));
    setItemOverrides((prev) => {
      const next = { ...prev };
      selectedIds.forEach((id) => {
        next[id] = { ...next[id], saved: shouldSave };
      });
      return next;
    });
  };

  const handleMarkRead = (): void => {
    if (!hasSelection) return;
    selectedIds.forEach((id) => markRead(id));
    setItemOverrides((prev) => {
      const next = { ...prev };
      selectedIds.forEach((id) => {
        next[id] = { ...next[id], unread: false };
      });
      return next;
    });
  };

  const handleDelete = (): void => {
    if (!hasSelection) return;
    const ids = Array.from(selectedIds);
    deleteBulk(ids);
    setDeletedIds((prev) => {
      const next = new Set(prev);
      selectedIds.forEach((id) => next.add(id));
      return next;
    });
    setSelectedIds(new Set());
  };

  const handleRefresh = (): void => {
    refresh();
    setItemOverrides({});
    setDeletedIds(new Set());
    setSelectedIds(new Set());
    setActiveNotification(null);
  };

  const openNotification = (item: NotificationItem): void => {
    if (item.unread) {
      markRead(item.id);
      setItemOverrides((prev) => ({
        ...prev,
        [item.id]: { ...prev[item.id], unread: false },
      }));
    }
    setActiveNotification({ ...item, unread: false });
  };

  const renderNotificationRow = (item: NotificationItem): ReactElement => {
    const isSelected = selectedIds.has(item.id);
    return (
      <div
        key={item.id}
        onClick={() => openNotification(item)}
        className={cn(
          'flex cursor-pointer items-start justify-between gap-4 px-6 py-4 transition',
          item.unread ? 'bg-rose-50' : 'bg-white',
          item.unread ? 'hover:bg-rose-100/70' : 'hover:bg-gray-50',
        )}
      >
        <div className="flex items-start gap-4">
          <input
            type="checkbox"
            checked={isSelected}
            onClick={(event) => event.stopPropagation()}
            onChange={() => toggleSelection(item.id)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            aria-label={`Select ${item.title}`}
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-gray-800">{item.title}</p>
              {item.unread && (
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-600">
                  {t('badges.new')}
                </span>
              )}
              {item.saved && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                  {t('badges.saved')}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">{item.subtitle}</p>
          </div>
        </div>
        <span className="text-xs font-medium text-gray-500">{item.time}</span>
      </div>
    );
  };

  return (
    <AppShell
      data={data}
      isLoading={isLoading || notifLoading}
      error={error}
      loadingLabel={t('loadingLabel')}
    >
      <div className="rounded-3xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 px-6 py-5">
          <h1 className="text-xl font-semibold text-gray-900">{t('pageTitle')}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:border-gray-300 hover:text-gray-800"
            >
              <RotateCcw className="h-4 w-4" />
              {t('refresh')}
            </button>
            <div className="inline-flex overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <button
                type="button"
                onClick={handleSaveSelected}
                disabled={!hasSelection}
                className={cn(
                  'flex h-10 w-11 items-center justify-center transition',
                  hasSelection
                    ? 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                    : 'cursor-not-allowed text-gray-300',
                )}
                aria-label="Save selected"
              >
                <Bookmark className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleMarkRead}
                disabled={!hasSelection}
                className={cn(
                  'flex h-10 w-11 items-center justify-center border-l border-gray-200 transition',
                  hasSelection
                    ? 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                    : 'cursor-not-allowed text-gray-300',
                )}
                aria-label="Mark selected as read"
              >
                <Info className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!hasSelection}
                className={cn(
                  'flex h-10 w-11 items-center justify-center border-l border-gray-200 transition',
                  hasSelection
                    ? 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                    : 'cursor-not-allowed text-gray-300',
                )}
                aria-label="Delete selected"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-semibold text-gray-700">{t('empty.title')}</p>
            <p className="mt-2 text-sm text-gray-500">{t('empty.subtitle')}</p>
          </div>
        ) : (
          <div className={cn('divide-y divide-gray-200', hasSelection && 'pb-24')}>
            {newItems.length > 0 && (
              <div className="bg-gray-50/70 px-6 py-2 text-xs font-semibold uppercase text-gray-500">
                {t('sections.new')}
              </div>
            )}
            {newItems.map((item) => renderNotificationRow(item))}
            {oldItems.length > 0 && (
              <div className="bg-gray-50/70 px-6 py-2 text-xs font-semibold uppercase text-gray-500">
                {t('sections.earlier')}
              </div>
            )}
            {oldItems.map((item) => renderNotificationRow(item))}
          </div>
        )}

        {hasSelection && (
          <div className="sticky bottom-4 z-10 mt-4 px-6 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-lg">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-800">
                  {t('bulkBar.selected', { count: selectedIds.size })}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                >
                  {t('bulkBar.clearSelection')}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveSelected}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:border-gray-300 hover:text-gray-800"
                >
                  <Bookmark className="h-4 w-4" />
                  {t('bulkBar.save')}
                </button>
                <button
                  type="button"
                  onClick={handleMarkRead}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:border-gray-300 hover:text-gray-800"
                >
                  <Info className="h-4 w-4" />
                  {t('bulkBar.markRead')}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-3 py-2 text-xs font-semibold text-white hover:bg-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                  {t('bulkBar.delete')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {activeNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white p-7 shadow-xl">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-gray-900">
                  {activeNotification.title}
                </h2>
                <p className="text-sm text-gray-600">{activeNotification.subtitle}</p>
                <p className="text-xs font-medium text-gray-500">
                  {activeNotification.dateTime}
                </p>
              </div>
              {activeNotification.saved && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                  {t('badges.saved')}
                </span>
              )}
            </div>

            <div className="mt-6 rounded-2xl bg-gray-50 px-4 py-4 text-sm text-gray-600">
              {activeNotification.description}
            </div>

            <div className="mt-8 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  deleteOne(activeNotification.id);
                  setDeletedIds((prev) => {
                    const next = new Set(prev);
                    next.add(activeNotification.id);
                    return next;
                  });
                  setSelectedIds((prev) => {
                    const next = new Set(prev);
                    next.delete(activeNotification.id);
                    return next;
                  });
                  setActiveNotification(null);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-600"
              >
                <Trash2 className="h-4 w-4" />
                {t('bulkBar.delete')}
              </button>
              <button
                type="button"
                onClick={() => setActiveNotification(null)}
                className="rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-200"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

// ── Main export — picks the right view based on user role ───────────────────

export function NotificationsPage(): ReactElement {
  const { user } = useAuth();
  const isOperator = !!user;

  if (isOperator) return <InternalNotificationsView />;
  return <CustomerNotificationsView />;
}
