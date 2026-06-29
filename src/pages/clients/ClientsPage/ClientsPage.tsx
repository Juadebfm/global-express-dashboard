import { type ReactElement, type ChangeEvent, type FormEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ChevronDown,
  Edit2,
  Eye,
  Search,
  Trash2,
  UserCheck,
  Users,
  Wallet,
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Package,
  Banknote,
} from 'lucide-react';
import { AppShell } from '@/pages/shared';
import { useCan, useAuthToken, useActivateClient, useClients, useDashboardData, useSearch, useUpdateClient } from '@/hooks';
import { ApiError } from '@/lib/apiClient';
import { deleteUser } from '@/services';
import i18n from '@/i18n/i18n';
import type { ApiClient, UpdateClientPayload } from '@/types';
import { cn } from '@/utils';
import { Button, CopyButton, Input, Pagination } from '@/components/ui';

type ClientStatus = 'active' | 'inactive';

const statusStyles: Record<ClientStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  inactive: 'bg-rose-50 text-rose-700',
};

const noAccountBadgeStyle = 'bg-amber-50 text-amber-700';

const nairaFormatter = new Intl.NumberFormat('en-NG');
const formatNaira = (amount: number): string => `₦${nairaFormatter.format(amount)}`;

const formatDate = (iso: string | null, locale: string = 'en-US'): string => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
};

const getClientName = (client: ApiClient): string =>
  client.displayName || `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim() || client.email || client.id;

const buildAddress = (client: ApiClient): string =>
  [client.addressStreet, client.addressCity, client.addressState, client.addressPostalCode, client.addressCountry]
    .filter(Boolean)
    .join(', ');

const buildInitials = (name: string): string => {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '';
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
};

// ── Client detail modal ───────────────────────────────────────────────────────

interface DetailFieldProps { label: string; value: ReactElement | string | null }
function DetailField({ label, value }: DetailFieldProps): ReactElement | null {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}

interface ClientModalProps {
  client: ApiClient;
  dateLocale: string;
  statusLabels: Record<ClientStatus, string>;
  onClose: () => void;
  onEdit: () => void;
  onActivate: (client: ApiClient) => Promise<void>;
  isActivating: boolean;
  activateError: { id: string; message: string } | null;
}

function ClientModal({ client, dateLocale, statusLabels, onClose, onEdit, onActivate, isActivating, activateError }: ClientModalProps): ReactElement {
  const { t } = useTranslation('clients');
  const name = getClientName(client);
  const address = buildAddress(client);
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle — mobile only */}
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-gray-200 sm:hidden" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-lg font-semibold text-brand-600 sm:h-14 sm:w-14 sm:text-xl">
              {buildInitials(name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-gray-900">{name}</p>
              <p className="truncate text-sm text-gray-500">{client.email || <span className="italic text-gray-400">No email</span>}</p>
              <span
                className={cn(
                  'mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                  client.isActive ? statusStyles.active : noAccountBadgeStyle,
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {client.isActive ? statusLabels.active : 'No account'}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Update
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* No-account banner */}
        {!client.isActive && (
          <div className="mx-4 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:mx-6">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-amber-800">
                  No online account — this customer cannot log in to the portal.
                </p>
                {client.email ? (
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <p className="text-xs text-amber-700">Send them an invite to create their account.</p>
                    <button
                      type="button"
                      disabled={isActivating}
                      onClick={() => { void onActivate(client); }}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                    >
                      {isActivating ? 'Sending…' : 'Send invite'}
                    </button>
                    {activateError?.id === client.id && (
                      <p className="text-xs text-red-700">{activateError.message}</p>
                    )}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-amber-700">
                    Add an email address before you can send an invite.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="space-y-5 px-4 py-4 sm:px-6 sm:py-5">
          {/* Shipping mark — prominent */}
          {client.shippingMark && (
            <div className="flex items-center justify-between rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
                  {t('shippingMark')}
                </p>
                <p className="mt-0.5 max-w-[260px] truncate font-mono text-lg font-bold tracking-widest text-brand-700" title={client.shippingMark}>
                  {client.shippingMark}
                </p>
              </div>
              <CopyButton value={client.shippingMark} />
            </div>
          )}

          {/* Contact */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Contact
            </p>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <Mail className="h-4 w-4 shrink-0 text-gray-400" />
                <span className="min-w-0 flex-1 truncate">{client.email ?? <span className="italic text-gray-400">No email on file</span>}</span>
                {client.email && <CopyButton value={client.email} />}
              </div>
              {client.phone && (
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <Phone className="h-4 w-4 shrink-0 text-gray-400" />
                  <span>{client.phone}</span>
                </div>
              )}
              {client.whatsappNumber && (
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <Phone className="h-4 w-4 shrink-0 text-gray-400" />
                  <span>{client.whatsappNumber}</span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                    WhatsApp
                  </span>
                </div>
              )}
              {address && (
                <div className="flex items-start gap-3 text-sm text-gray-700">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                  <span>{address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Account stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
              <Package className="mx-auto h-4 w-4 text-gray-400" />
              <p className="mt-1 text-lg font-semibold text-gray-900">{client.orderCount}</p>
              <p className="text-xs text-gray-500">{t('orders')}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
              <Banknote className="mx-auto h-4 w-4 text-gray-400" />
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {formatNaira(parseFloat(client.totalSpent) || 0)}
              </p>
              <p className="text-xs text-gray-500">{t('totalPayments')}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
              <Calendar className="mx-auto h-4 w-4 text-gray-400" />
              <p className="mt-1 text-xs font-semibold text-gray-900">
                {formatDate(client.lastOrderDate, dateLocale)}
              </p>
              <p className="text-xs text-gray-500">{t('lastOrder')}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
              <Users className="mx-auto h-4 w-4 text-gray-400" />
              <p className="mt-1 text-xs font-semibold text-gray-900">
                {formatDate(client.createdAt, dateLocale)}
              </p>
              <p className="text-xs text-gray-500">{t('memberSinceLabel')}</p>
            </div>
          </div>

          {/* Business */}
          {client.businessName && (
            <DetailField label={t('businessLabel')} value={client.businessName} />
          )}

          {/* Recent orders */}
          {(client.orders ?? []).length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                {t('orderList')}
              </p>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full min-w-[480px] text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">{t('trackingNumber')}</th>
                      <th className="px-4 py-2.5 font-semibold">{t('status')}</th>
                      <th className="px-4 py-2.5 font-semibold">{t('amount')}</th>
                      <th className="px-4 py-2.5 font-semibold">{t('date')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(client.orders ?? []).map((order) => (
                      <tr key={order.id} className="bg-white">
                        <td className="px-4 py-2.5 font-medium text-gray-800">
                          <span className="inline-flex items-center gap-1">
                            {order.trackingNumber}
                            <CopyButton value={order.trackingNumber} />
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold capitalize text-gray-700">
                            {order.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-700">{formatNaira(order.amount)}</td>
                        <td className="px-4 py-2.5 text-gray-500">{formatDate(order.createdAt, dateLocale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Edit client modal ─────────────────────────────────────────────────────────

interface EditClientFormShape {
  firstName: string;
  lastName: string;
  businessName: string;
  email: string;
  phone: string;
  whatsappNumber: string;
  shippingMark: string;
  addressCity: string;
}

interface EditClientModalProps {
  client: ApiClient;
  isPending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: UpdateClientPayload) => Promise<void>;
}

function EditClientModal({ client, isPending, error, onClose, onSubmit }: EditClientModalProps): ReactElement {
  const [form, setForm] = useState<EditClientFormShape>({
    firstName: client.firstName ?? '',
    lastName: client.lastName ?? '',
    businessName: client.businessName ?? '',
    email: client.email ?? '',
    phone: client.phone ?? '',
    whatsappNumber: client.whatsappNumber ?? '',
    shippingMark: client.shippingMark ?? '',
    addressCity: client.addressCity ?? '',
  });
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setLocalError(null);

    const payload: UpdateClientPayload = {};
    const trim = (v: string): string => v.trim();

    if (trim(form.firstName)) payload.firstName = trim(form.firstName);
    if (trim(form.lastName)) payload.lastName = trim(form.lastName);
    if (trim(form.businessName)) payload.businessName = trim(form.businessName);
    if (trim(form.email)) payload.email = trim(form.email);
    if (trim(form.phone)) payload.phone = trim(form.phone);
    if (trim(form.whatsappNumber)) payload.whatsappNumber = trim(form.whatsappNumber);
    if (trim(form.shippingMark)) {
      const mark = trim(form.shippingMark);
      if (mark.length > 100) {
        setLocalError('Shipping mark must be 100 characters or fewer.');
        return;
      }
      payload.shippingMark = mark;
    }
    if (trim(form.addressCity)) payload.addressCity = trim(form.addressCity);

    if (Object.keys(payload).length === 0) {
      setLocalError('Please update at least one field.');
      return;
    }

    try {
      await onSubmit(payload);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to update client.');
    }
  };

  const displayError = localError ?? error;
  const name = getClientName(client);

  const set = (key: keyof EditClientFormShape) =>
    (e: ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [key]: e.target.value }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90dvh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle — mobile only */}
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-gray-200 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Update customer</h2>
            <p className="text-sm text-gray-500">{name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={(e) => { void handleSubmit(e); }} className="px-4 py-5 sm:px-6">
          <p className="mb-4 text-sm text-gray-500">
            All fields are optional — only filled fields will be updated.
          </p>

          {displayError && (
            <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{displayError}</p>
          )}

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="First name" value={form.firstName} onChange={set('firstName')} />
              <Input label="Last name" value={form.lastName} onChange={set('lastName')} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Email" type="email" value={form.email} onChange={set('email')} placeholder="client@example.com" />
              <Input label="Phone" type="tel" value={form.phone} onChange={set('phone')} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="WhatsApp number" type="tel" value={form.whatsappNumber} onChange={set('whatsappNumber')} />
              <Input label="City" value={form.addressCity} onChange={set('addressCity')} />
            </div>
            <Input label="Business name" value={form.businessName} onChange={set('businessName')} />
            <div>
              <Input
                label="Shipping mark"
                value={form.shippingMark}
                onChange={set('shippingMark')}
                placeholder="e.g. BeautyByDaz"
              />
              <p className="mt-1 text-xs text-gray-500">1–100 characters, any format.</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <Button type="submit" variant="primary" isLoading={isPending}>
              Save changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ClientsPage(): ReactElement {
  const { t } = useTranslation('clients');
  const dateLocale = i18n.language === 'ko' ? 'ko-KR' : 'en-US';
  const { data, isLoading, error } = useDashboardData();
  const { query, setQuery } = useSearch();
  const hasAccess = useCan('clients.view');
  const canDeleteClient = useCan('app.superadmin');
  const getAuthToken = useAuthToken();
  const queryClient = useQueryClient();

  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const setPage = (next: number): void => {
    setSearchParams(
      (prev) => {
        const updated = new URLSearchParams(prev);
        if (next <= 1) updated.delete('page');
        else updated.set('page', String(next));
        return updated;
      },
      { replace: true },
    );
  };

  const { clients: apiClients, pagination, isLoading: clientsLoading } = useClients({ page });
  const activateClient = useActivateClient();

  const [activeClient, setActiveClient] = useState<ApiClient | null>(null);
  const [editTarget, setEditTarget] = useState<ApiClient | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiClient | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'all'>('all');
  const [openMenu, setOpenMenu] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [activateError, setActivateError] = useState<{ id: string; message: string } | null>(null);

  const updateClient = useUpdateClient(editTarget?.id);

  const statusMenuRef = useRef<HTMLDivElement | null>(null);

  const statusLabels: Record<ClientStatus, string> = useMemo(() => ({
    active: t('statusActive'),
    inactive: t('statusInactive'),
  }), [t]);

  useEffect(() => {
    if (!openMenu) return;
    const handleClick = (e: MouseEvent): void => {
      if (statusMenuRef.current?.contains(e.target as Node)) return;
      setOpenMenu(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openMenu]);

  useEffect(() => {
    if (!actionMessage) return;
    const timeout = window.setTimeout(() => setActionMessage(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [actionMessage]);

  const filteredClients = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return apiClients.filter((client) => {
      const matchesSearch =
        !needle ||
        `${getClientName(client)} ${client.email} ${client.phone} ${client.businessName ?? ''} ${client.shippingMark ?? ''} ${buildAddress(client)}`
          .toLowerCase()
          .includes(needle);
      const clientStatus: ClientStatus = client.isActive ? 'active' : 'inactive';
      return matchesSearch && (statusFilter === 'all' || clientStatus === statusFilter);
    });
  }, [apiClients, query, statusFilter]);

  const summaryStats = useMemo(() => {
    const activeClients = apiClients.filter((c) => c.isActive).length;
    const totalRevenue = apiClients.reduce((acc, c) => acc + (parseFloat(c.totalSpent) || 0), 0);
    return { totalClients: pagination.total, activeClients, totalRevenue };
  }, [apiClients, pagination.total]);

  const handleActivate = async (client: ApiClient): Promise<void> => {
    setActivateError(null);
    try {
      await activateClient.mutateAsync(client.id);
      setActionMessage(`${getClientName(client)} has been activated.`);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 422 || err.status === 409)) {
        setActivateError({ id: client.id, message: err.message });
      } else {
        setActivateError({ id: client.id, message: 'Failed to activate client. Please try again.' });
      }
    }
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      await deleteUser(token, deleteTarget.id);
      await queryClient.invalidateQueries({ queryKey: ['clients'] });
      setActionMessage(t('deleteSuccess', { name: getClientName(deleteTarget) }));
      setDeleteTarget(null);
      setActiveClient(null);
    } catch {
      setActionMessage(t('deleteFailed'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleUpdateSubmit = async (payload: UpdateClientPayload): Promise<void> => {
    setEditError(null);
    await updateClient.mutateAsync(payload);
    setEditTarget(null);
  };

  if (!hasAccess) {
    return (
      <AppShell data={data} isLoading={isLoading} error={error} loadingLabel={t('loadingLabel')}>
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
          <p className="text-lg font-semibold text-gray-800">{t('accessRestricted')}</p>
          <p className="mt-2 text-sm text-gray-500">{t('accessRestrictedDesc')}</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell data={data} isLoading={isLoading || clientsLoading} error={error} loadingLabel={t('loadingLabel')}>
      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          onClick={() => !deleteLoading && setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200 sm:hidden" />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-base font-semibold text-gray-900">{t('deleteConfirmTitle')}</p>
                <p className="text-sm text-gray-500">{getClientName(deleteTarget)}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-600">{t('deleteConfirmBody')}</p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => { void handleConfirmDelete(); }}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {deleteLoading ? t('deleting') : t('deleteConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail view modal */}
      {activeClient && (
        <ClientModal
          client={activeClient}
          dateLocale={dateLocale}
          statusLabels={statusLabels}
          onClose={() => setActiveClient(null)}
          onEdit={() => { const c = activeClient; setActiveClient(null); setEditTarget(c); }}
          onActivate={handleActivate}
          isActivating={activateClient.isPending}
          activateError={activateError}
        />
      )}

      {/* Edit modal */}
      {editTarget && (
        <EditClientModal
          client={editTarget}
          isPending={updateClient.isPending}
          error={editError}
          onClose={() => { setEditTarget(null); setEditError(null); }}
          onSubmit={handleUpdateSubmit}
        />
      )}

      <div className="space-y-6">
        {/* KPI cards */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('totalClients')}</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">{summaryStats.totalClients}</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Users className="h-4 w-4" />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('activeClients')}</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">{summaryStats.activeClients}</p>
                <p className="mt-1 text-xs text-gray-500">this page</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                <UserCheck className="h-4 w-4" />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('totalRevenue')}</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">{formatNaira(summaryStats.totalRevenue)}</p>
                <p className="mt-1 text-xs text-gray-500">this page</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-3xl border border-gray-200 bg-white p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-gray-900">{t('clientsList')}</h2>
              <p className="text-sm text-gray-500">{t('clientsListDesc')}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-800 outline-none transition focus:border-brand-500"
              />
            </div>
            <div className="relative" ref={statusMenuRef}>
              <button
                type="button"
                onClick={() => setOpenMenu((prev) => !prev)}
                className="inline-flex w-40 items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 shadow-sm transition hover:border-gray-300"
              >
                {statusFilter === 'all' ? t('statusAll') : statusLabels[statusFilter]}
                <ChevronDown className={cn('h-4 w-4 text-gray-400 transition', openMenu && 'rotate-180')} />
              </button>
              {openMenu && (
                <div className="absolute z-20 mt-2 w-44 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
                  {([
                    { value: 'all', label: t('statusAll') },
                    { value: 'active', label: t('statusActive') },
                    { value: 'inactive', label: t('statusInactive') },
                  ] as Array<{ value: ClientStatus | 'all'; label: string }>).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => { setStatusFilter(option.value); setOpenMenu(false); }}
                      className={cn(
                        'w-full rounded-lg px-3 py-2 text-left text-sm transition',
                        statusFilter === option.value
                          ? 'bg-brand-50 font-semibold text-brand-600'
                          : 'text-gray-600 hover:bg-gray-50',
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div>
          <h3 className="text-xl font-semibold text-gray-900">{t('clientDirectory')}</h3>
          {actionMessage && (
            <div className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {actionMessage}
            </div>
          )}
          <div className="mt-4 rounded-3xl border border-gray-200 bg-white">
            {/* Mobile: card list */}
            <div className="divide-y divide-gray-100 md:hidden">
              {filteredClients.map((client) => {
                const name = getClientName(client);
                return (
                  <div
                    key={client.id}
                    onClick={() => setActiveClient(client)}
                    className="cursor-pointer px-4 py-4 hover:bg-gray-50 active:bg-gray-100"
                  >
                    {/* Primary row: avatar + name + status */}
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-600">
                        {buildInitials(name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">{name}</p>
                        <p className="truncate text-xs text-gray-500">{client.email ?? 'No email on file'}</p>
                      </div>
                      <span
                        className={cn(
                          'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          client.isActive ? statusStyles.active : noAccountBadgeStyle,
                        )}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {client.isActive ? statusLabels.active : 'No account'}
                      </span>
                    </div>

                    {/* Detail grid */}
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{t('phoneLabel')}</p>
                        <p className="text-xs text-gray-700">{client.phone ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{t('businessLabel')}</p>
                        <p className="truncate text-xs text-gray-700">{client.businessName ?? '—'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{t('shippingMark')}</p>
                        {client.shippingMark ? (
                          <span
                            className="inline-flex items-center gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="font-mono text-xs font-semibold tracking-wide text-brand-600 truncate">
                              {client.shippingMark}
                            </span>
                            <CopyButton value={client.shippingMark} />
                          </span>
                        ) : (
                          <p className="text-xs text-gray-400">—</p>
                        )}
                      </div>
                    </div>

                    {/* Action row */}
                    <div
                      className="mt-3 flex items-center justify-end gap-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        title="Update client"
                        onClick={(e) => { e.stopPropagation(); setEditTarget(client); }}
                        className="text-gray-400 transition hover:text-brand-600"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="View details"
                        onClick={(e) => { e.stopPropagation(); setActiveClient(client); }}
                        className="text-gray-400 transition hover:text-brand-600"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {canDeleteClient && (
                        <button
                          type="button"
                          title="Delete client"
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(client); }}
                          className="text-gray-400 transition hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredClients.length === 0 && (
                <div className="p-6 text-center text-sm text-gray-500">
                  {apiClients.length === 0 ? t('noClientsFound') : t('noClientsMatch')}
                </div>
              )}
            </div>

            {/* Desktop: table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="whitespace-nowrap border-r border-gray-200 px-6 py-4">{t('customer')}</th>
                    <th className="whitespace-nowrap border-r border-gray-200 px-6 py-4">{t('phoneLabel')}</th>
                    <th className="whitespace-nowrap border-r border-gray-200 px-6 py-4">{t('shippingMark')}</th>
                    <th className="whitespace-nowrap border-r border-gray-200 px-6 py-4">{t('emailLabel')}</th>
                    <th className="whitespace-nowrap border-r border-gray-200 px-6 py-4">{t('businessLabel')}</th>
                    <th className="whitespace-nowrap border-r border-gray-200 px-6 py-4">{t('status')}</th>
                    <th className="whitespace-nowrap px-6 py-4 text-right">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredClients.map((client) => (
                    <tr
                      key={client.id}
                      className="cursor-pointer transition hover:bg-gray-50"
                      onClick={() => setActiveClient(client)}
                    >
                      {/* Name + initials */}
                      <td className="whitespace-nowrap border-r border-gray-100 px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-600">
                            {buildInitials(getClientName(client))}
                          </div>
                          <p className="font-semibold text-gray-900">{getClientName(client)}</p>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="whitespace-nowrap border-r border-gray-100 px-6 py-4 text-gray-600">
                        {client.phone || <span className="text-gray-300">—</span>}
                      </td>

                      {/* Shipping mark */}
                      <td className="whitespace-nowrap border-r border-gray-100 px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        {client.shippingMark ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="font-mono text-xs font-semibold tracking-wide text-brand-600">
                              {client.shippingMark}
                            </span>
                            <CopyButton value={client.shippingMark} />
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Email */}
                      <td className="whitespace-nowrap border-r border-gray-100 px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <span className="inline-flex items-center gap-1.5 text-gray-700">
                          {client.email ?? <span className="italic text-gray-400">—</span>}
                          {client.email && <CopyButton value={client.email} />}
                        </span>
                      </td>

                      {/* Business */}
                      <td className="whitespace-nowrap border-r border-gray-100 px-6 py-4 text-gray-600">
                        {client.businessName || <span className="text-gray-300">—</span>}
                      </td>

                      {/* Status */}
                      <td className="whitespace-nowrap border-r border-gray-100 px-6 py-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
                            client.isActive ? statusStyles.active : noAccountBadgeStyle,
                          )}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {client.isActive ? statusLabels.active : 'No account'}
                        </span>
                        {activateError?.id === client.id && (
                          <p className="mt-1 text-xs text-red-600">{activateError.message}</p>
                        )}
                      </td>

                      {/* Actions — 3 icons */}
                      <td className="whitespace-nowrap px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-4">
                          <button
                            type="button"
                            title="Update client"
                            onClick={(e) => { e.stopPropagation(); setEditTarget(client); }}
                            className="text-gray-400 transition hover:text-brand-600"
                          >
                            <Edit2 className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            title="View details"
                            onClick={(e) => { e.stopPropagation(); setActiveClient(client); }}
                            className="text-gray-400 transition hover:text-brand-600"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          {canDeleteClient && (
                            <button
                              type="button"
                              title="Delete client"
                              onClick={(e) => { e.stopPropagation(); setDeleteTarget(client); }}
                              className="text-gray-400 transition hover:text-rose-600"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredClients.length === 0 && (
                <div className="p-6 text-center text-sm text-gray-500">
                  {apiClients.length === 0 ? t('noClientsFound') : t('noClientsMatch')}
                </div>
              )}
            </div>
          </div>

          {pagination.totalPages > 1 && (
            <div className="mt-3">
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                labels={{
                  pageOf: (p, tp) => t('pagination.pageOf', { page: p, totalPages: tp }),
                  totalLabel: (count) => t('pagination.total', { count }),
                  prev: t('pagination.prev'),
                  next: t('pagination.next'),
                }}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      </div>

    </AppShell>
  );
}
