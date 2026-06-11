import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bookmark, Info, RotateCcw, Trash2, X } from 'lucide-react';
import {
  useDashboardData,
  useNotifications,
  useSearch,
} from '@/hooks';
import type { ApiNotification } from '@/types';
import { AppShell } from '@/pages/shared';
import { TableRowsSkeleton } from '@/components/ui';
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
  notifType: string;
  orderId: string | null;
  metadata: Record<string, unknown>;
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

const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const TRACKING_RE = /\bGEX-[A-Z0-9-]+\b/g;

function stripUuids(text: string): string {
  return text
    .replace(/\s+for (order|shipment|payment)\s+[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '')
    .replace(UUID_RE, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,!?])/g, '$1')
    .trim();
}

function extractTrackingNumbers(text: string): string[] {
  return Array.from(new Set(text.match(TRACKING_RE) ?? []));
}

const TYPE_LABELS: Record<string, string> = {
  order_status_update: 'Order Update',
  payment_event: 'Payment',
  payment_received: 'Payment',
  payment_failed: 'Payment',
  system_announcement: 'Announcement',
  admin_alert: 'Admin Alert',
  new_customer: 'New Customer',
  new_order: 'New Order',
  new_staff_account: 'New Staff',
  staff_onboarding_complete: 'Onboarding',
};

const TYPE_STYLES: Record<string, string> = {
  order_status_update: 'bg-blue-50 text-blue-700 border-blue-200',
  payment_event: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  payment_received: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  payment_failed: 'bg-red-50 text-red-700 border-red-200',
  system_announcement: 'bg-purple-50 text-purple-700 border-purple-200',
  admin_alert: 'bg-amber-50 text-amber-700 border-amber-200',
  new_customer: 'bg-teal-50 text-teal-700 border-teal-200',
  new_order: 'bg-blue-50 text-blue-700 border-blue-200',
  new_staff_account: 'bg-gray-50 text-gray-700 border-gray-200',
  staff_onboarding_complete: 'bg-gray-50 text-gray-700 border-gray-200',
};

function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type.replace(/_/g, ' ');
}

function typeStyle(type: string): string {
  return TYPE_STYLES[type] ?? 'bg-gray-50 text-gray-700 border-gray-200';
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
    notifType: n.type,
    orderId: n.orderId ?? null,
    metadata: n.metadata ?? {},
  };
}

function NotificationDetailModal({
  item,
  onClose,
  onDelete,
  t,
}: {
  item: NotificationItem;
  onClose: () => void;
  onDelete: () => void;
  t: (key: string) => string;
}): ReactElement {
  const cleanBody = stripUuids(item.description);
  const trackingNumbers = extractTrackingNumbers(item.description);
  const metaTracking = typeof item.metadata.trackingNumber === 'string'
    ? item.metadata.trackingNumber
    : null;
  const allTracking = Array.from(new Set([
    ...(metaTracking ? [metaTracking] : []),
    ...trackingNumbers,
  ]));

  const metaFields: { label: string; value: string }[] = [];
  if (typeof item.metadata.amount === 'number' || typeof item.metadata.amount === 'string') {
    metaFields.push({ label: 'Amount', value: String(item.metadata.amount) });
  }
  if (typeof item.metadata.currency === 'string') {
    metaFields.push({ label: 'Currency', value: item.metadata.currency });
  }
  if (typeof item.metadata.customerName === 'string') {
    metaFields.push({ label: 'Customer', value: item.metadata.customerName });
  }
  if (typeof item.metadata.email === 'string') {
    metaFields.push({ label: 'Email', value: item.metadata.email });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Type chip + date */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', typeStyle(item.notifType))}>
            {typeLabel(item.notifType)}
          </span>
          {item.saved && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
              {t('badges.saved')}
            </span>
          )}
          <span className="ml-auto text-xs text-gray-400">{item.dateTime}</span>
        </div>

        {/* Title */}
        <h2 className="mt-3 text-lg font-semibold text-gray-900">{item.title}</h2>

        {/* Tracking numbers */}
        {allTracking.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {allTracking.map((tn) => (
              <span
                key={tn}
                className="inline-flex items-center rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-semibold tracking-tight text-brand-700 ring-1 ring-brand-200"
              >
                {tn}
              </span>
            ))}
          </div>
        )}

        {/* Structured metadata fields */}
        {metaFields.length > 0 && (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {metaFields.map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-gray-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
                <p className="mt-0.5 text-sm font-medium text-gray-800">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Body text — UUIDs stripped */}
        <div className="mt-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-600">
          {cleanBody || item.description}
        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
          >
            <Trash2 className="h-4 w-4" />
            {t('bulkBar.delete')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}

function CustomerNotificationsView(): ReactElement {
  const { t } = useTranslation('notifications');
  const { data, isLoading, error } = useDashboardData();
  const { query } = useSearch();
  const {
    notifications: apiNotifications,
    isLoading: notifLoading,
    error: notifError,
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
  const allSelected = filteredItems.length > 0 && filteredItems.every((item) => selectedIds.has(item.id));
  const someSelected = hasSelection && !allSelected;

  const toggleSelection = (id: string): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (): void => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((item) => item.id)));
    }
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
      isLoading={isLoading}
      error={error}
      requireData={false}
      loadingLabel={t('loadingLabel')}
    >
      {notifError && (
        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {notifError}
        </div>
      )}

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

        {notifLoading && filteredItems.length === 0 ? (
          <div className="p-4">
            <TableRowsSkeleton columns={3} rows={6} ariaLabel={t('loadingLabel')} />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-semibold text-gray-700">{t('empty.title')}</p>
            <p className="mt-2 text-sm text-gray-500">{t('empty.subtitle')}</p>
          </div>
        ) : (
          <div className={cn('divide-y divide-gray-200', hasSelection && 'pb-24')}>
            {/* Select-all row */}
            <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50/60 px-6 py-2.5">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = someSelected; }}
                onChange={handleSelectAll}
                className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                aria-label="Select all notifications"
              />
              <span className="text-xs font-medium text-gray-500">
                {allSelected
                  ? `All ${filteredItems.length} selected — click to deselect`
                  : someSelected
                    ? `${selectedIds.size} of ${filteredItems.length} selected`
                    : `Select all`}
              </span>
            </div>

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
        <NotificationDetailModal
          item={activeNotification}
          onClose={() => setActiveNotification(null)}
          onDelete={() => {
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
          t={t}
        />
      )}
    </AppShell>
  );
}

// ── Main export — picks the right view based on user role ───────────────────

export function NotificationsPage(): ReactElement {
  return <CustomerNotificationsView />;
}
