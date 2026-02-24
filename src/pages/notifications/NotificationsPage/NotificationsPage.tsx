import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { Bookmark, Info, RotateCcw, Trash2 } from 'lucide-react';
import { useDashboardData, useNotifications, useSearch } from '@/hooks';
import type { ApiNotification } from '@/types';
import { AppShell } from '@/pages/shared';
import { cn } from '@/utils';

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

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (isToday) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  return (
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ', ' +
    date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  );
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return (
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' - ' +
    date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  );
}

function mapApiNotification(n: ApiNotification): NotificationItem {
  const truncated = n.message.length > 80 ? n.message.slice(0, 80) + '…' : n.message;
  return {
    id: n.id,
    title: n.title,
    subtitle: truncated,
    description: n.message,
    time: formatTime(n.createdAt),
    dateTime: formatDateTime(n.createdAt),
    unread: !n.isRead,
    saved: n.isSaved,
  };
}

export function NotificationsPage(): ReactElement {
  const { data, isLoading, error } = useDashboardData();
  const { query } = useSearch();
  const {
    notifications: apiNotifications,
    isLoading: notifLoading,
    markRead,
    toggleSave,
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
    [apiNotifications, itemOverrides]
  );

  const visibleItems = useMemo(
    () => items.filter((item) => !deletedIds.has(item.id)),
    [items, deletedIds]
  );

  const filteredItems = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return visibleItems;
    return visibleItems.filter((item) =>
      `${item.title} ${item.subtitle} ${item.description}`.toLowerCase().includes(value)
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
        next[id] = {
          ...next[id],
          saved: shouldSave,
        };
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
        next[id] = {
          ...next[id],
          unread: false,
        };
      });
      return next;
    });
  };

  const handleDelete = (): void => {
    if (!hasSelection) return;
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
        [item.id]: {
          ...prev[item.id],
          unread: false,
        },
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
          item.unread ? 'hover:bg-rose-100/70' : 'hover:bg-gray-50'
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
                  New
                </span>
              )}
              {item.saved && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                  Saved
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
      loadingLabel="Loading notifications..."
    >
      <div className="rounded-3xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 px-6 py-5">
          <h1 className="text-xl font-semibold text-gray-900">Notification</h1>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:border-gray-300 hover:text-gray-800"
            >
              <RotateCcw className="h-4 w-4" />
              Refresh
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
                    : 'cursor-not-allowed text-gray-300'
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
                    : 'cursor-not-allowed text-gray-300'
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
                    : 'cursor-not-allowed text-gray-300'
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
            <p className="text-sm font-semibold text-gray-700">No notifications found</p>
            <p className="mt-2 text-sm text-gray-500">
              Try adjusting your search to see more updates.
            </p>
          </div>
        ) : (
          <div className={cn('divide-y divide-gray-200', hasSelection && 'pb-24')}>
            {newItems.length > 0 && (
              <div className="bg-gray-50/70 px-6 py-2 text-xs font-semibold uppercase text-gray-500">
                New
              </div>
            )}
            {newItems.map((item) => renderNotificationRow(item))}
            {oldItems.length > 0 && (
              <div className="bg-gray-50/70 px-6 py-2 text-xs font-semibold uppercase text-gray-500">
                Earlier
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
                  {selectedIds.size} selected
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                >
                  Clear selection
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveSelected}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:border-gray-300 hover:text-gray-800"
                >
                  <Bookmark className="h-4 w-4" />
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleMarkRead}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:border-gray-300 hover:text-gray-800"
                >
                  <Info className="h-4 w-4" />
                  Mark read
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-3 py-2 text-xs font-semibold text-white hover:bg-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
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
                  Saved
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
                Delete
              </button>
              <button
                type="button"
                onClick={() => setActiveNotification(null)}
                className="rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
