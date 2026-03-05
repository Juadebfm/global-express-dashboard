import type { ReactElement } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ChevronDown,
  MoreVertical,
  Search,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { AppShell } from '@/pages/shared';
import { useAuth, useClients, useDashboardData, useSearch } from '@/hooks';
import i18n from '@/i18n/i18n';
import type { ApiClient } from '@/types';
import { cn } from '@/utils';
import { CopyButton } from '@/components/ui';

type ClientStatus = 'active' | 'inactive';

const statusStyles: Record<ClientStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  inactive: 'bg-rose-50 text-rose-700',
};

const nairaFormatter = new Intl.NumberFormat('en-NG');
const formatNaira = (amount: number): string => `₦${nairaFormatter.format(amount)}`;

const formatDate = (iso: string | null, locale: string = 'en-US'): string => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getClientName = (client: ApiClient): string =>
  `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim() || client.email;

const buildAddress = (client: ApiClient): string =>
  [
    client.addressStreet,
    client.addressCity,
    client.addressState,
    client.addressPostalCode,
    client.addressCountry,
  ]
    .filter(Boolean)
    .join(', ');

const buildInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '';
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
};

export function ClientsPage(): ReactElement {
  const { t } = useTranslation('clients');
  const dateLocale = i18n.language === 'ko' ? 'ko-KR' : 'en-US';
  const { data, isLoading, error } = useDashboardData();
  const { query, setQuery } = useSearch();
  const { user } = useAuth();
  const { clients: apiClients, isLoading: clientsLoading } = useClients();

  const [activeClient, setActiveClient] = useState<ApiClient | null>(null);
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'all'>('all');
  const [openMenu, setOpenMenu] = useState(false);
  const [openClientMenuId, setOpenClientMenuId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const statusMenuRef = useRef<HTMLDivElement | null>(null);

  const statusLabels: Record<ClientStatus, string> = useMemo(() => ({
    active: t('statusActive'),
    inactive: t('statusInactive'),
  }), [t]);

  useEffect(() => {
    if (!openMenu) return;
    const handleClick = (event: MouseEvent) => {
      if (statusMenuRef.current?.contains(event.target as Node)) return;
      setOpenMenu(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openMenu]);

  useEffect(() => {
    if (!openClientMenuId) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.closest('[data-client-menu]') ||
        target.closest('[data-client-menu-button]')
      ) {
        return;
      }
      setOpenClientMenuId(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openClientMenuId]);

  useEffect(() => {
    if (!actionMessage) return;
    const timeout = window.setTimeout(() => setActionMessage(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [actionMessage]);

  const role = user?.role;
  const hasAccess = role === 'staff' || role === 'admin' || role === 'superadmin';

  const filteredClients = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return apiClients.filter((client) => {
      const matchesSearch =
        !needle ||
        `${getClientName(client)} ${client.email} ${client.phone} ${client.businessName ?? ''} ${buildAddress(client)}`
          .toLowerCase()
          .includes(needle);
      const clientStatus: ClientStatus = client.isActive ? 'active' : 'inactive';
      const matchesStatus = statusFilter === 'all' || clientStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [apiClients, query, statusFilter]);

  const summaryStats = useMemo(() => {
    const totalClients = apiClients.length;
    const activeClients = apiClients.filter((c) => c.isActive).length;
    const totalRevenue = apiClients.reduce((acc, c) => acc + (parseFloat(c.totalPayments) || 0), 0);
    return { totalClients, activeClients, totalRevenue };
  }, [apiClients]);

  const handleCopyEmail = async (client: ApiClient): Promise<void> => {
    try {
      await navigator.clipboard.writeText(client.email);
      setActionMessage(t('copiedEmail', { email: client.email }));
    } catch {
      setActionMessage(t('copyFailed'));
    }
  };

  if (!hasAccess) {
    return (
      <AppShell
        data={data}
        isLoading={isLoading}
        error={error}
        loadingLabel={t('loadingLabel')}
      >
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
          <p className="text-lg font-semibold text-gray-800">{t('accessRestricted')}</p>
          <p className="mt-2 text-sm text-gray-500">
            {t('accessRestrictedDesc')}
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      data={data}
      isLoading={isLoading || clientsLoading}
      error={error}
      loadingLabel={t('loadingLabel')}
    >
      <div className="space-y-6">
        {activeClient ? (
          // ── Client Detail View ─────────────────────────────────────────────
          <div className="space-y-6">
            <button
              type="button"
              onClick={() => setActiveClient(null)}
              className="inline-flex items-center gap-2 text-xl font-semibold text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
              {t('viewClients')}
            </button>

            <div className="rounded-3xl border border-gray-200 bg-white p-6">
              <p className="text-sm font-semibold text-gray-700">{t('customerInfo')}</p>
              <div className="mt-4 flex flex-wrap items-start gap-6">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-2xl font-semibold text-brand-600">
                  {buildInitials(getClientName(activeClient))}
                </div>
                <div className="grid gap-4 text-sm text-gray-500 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400">{t('nameLabel')}</p>
                    <p className="text-base font-semibold text-gray-900">{getClientName(activeClient)}</p>
                  </div>
                  {activeClient.businessName && (
                    <div>
                      <p className="text-xs font-semibold uppercase text-gray-400">{t('businessLabel')}</p>
                      <p className="text-base font-semibold text-gray-900">{activeClient.businessName}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400">{t('emailLabel')}</p>
                    <p className="inline-flex items-center gap-1.5 text-base font-semibold text-gray-900">
                      {activeClient.email}
                      <CopyButton value={activeClient.email} />
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400">{t('phoneLabel')}</p>
                    <p className="text-base font-semibold text-gray-900">{activeClient.phone}</p>
                  </div>
                  {activeClient.whatsappNumber && (
                    <div>
                      <p className="text-xs font-semibold uppercase text-gray-400">{t('whatsappLabel')}</p>
                      <p className="text-base font-semibold text-gray-900">{activeClient.whatsappNumber}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400">{t('memberSinceLabel')}</p>
                    <p className="text-base font-semibold text-gray-900">{formatDate(activeClient.createdAt, dateLocale)}</p>
                  </div>
                  {buildAddress(activeClient) && (
                    <div className="sm:col-span-2 lg:col-span-3">
                      <p className="text-xs font-semibold uppercase text-gray-400">{t('addressLabel')}</p>
                      <p className="text-base font-semibold text-gray-900">{buildAddress(activeClient)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">{t('orderList')}</h2>
              </div>
              <div className="px-6 py-6">
                <div className="overflow-hidden rounded-2xl border border-gray-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-6 py-4">{t('trackingNumber')}</th>
                        <th className="px-6 py-4">{t('status')}</th>
                        <th className="px-6 py-4">{t('amount')}</th>
                        <th className="px-6 py-4">{t('date')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {(activeClient.orders ?? []).length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-6 py-8 text-center text-sm text-gray-400"
                          >
                            {t('noOrders')}
                          </td>
                        </tr>
                      ) : (
                        (activeClient.orders ?? []).map((order) => (
                          <tr key={order.id} className="transition hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium text-gray-800">
                              <span className="inline-flex items-center gap-1.5">
                                {order.trackingNumber}
                                <CopyButton value={order.trackingNumber} />
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold capitalize text-gray-700">
                                {order.status.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-700">
                              {formatNaira(order.amount)}
                            </td>
                            <td className="px-6 py-4 text-gray-500">
                              {formatDate(order.createdAt, dateLocale)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // ── Client List View ───────────────────────────────────────────────
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{t('totalClients')}</p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">
                      {summaryStats.totalClients}
                    </p>
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
                    <p className="mt-2 text-2xl font-semibold text-gray-900">
                      {summaryStats.activeClients}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {summaryStats.totalClients > 0
                        ? t('ofTotal', { percent: ((summaryStats.activeClients / summaryStats.totalClients) * 100).toFixed(1) })
                        : '—'}
                    </p>
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
                    <p className="mt-2 text-2xl font-semibold text-gray-900">
                      {formatNaira(summaryStats.totalRevenue)}
                    </p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <Wallet className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-gray-900">{t('clientsList')}</h2>
                <p className="text-sm text-gray-500">
                  {t('clientsListDesc')}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <div className="relative w-full max-w-xs">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
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
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 text-gray-400 transition',
                        openMenu && 'rotate-180'
                      )}
                    />
                  </button>
                  {openMenu && (
                    <div className="absolute z-20 mt-2 w-44 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
                      {(
                        [
                          { value: 'all', label: t('statusAll') },
                          { value: 'active', label: t('statusActive') },
                          { value: 'inactive', label: t('statusInactive') },
                        ] as Array<{ value: ClientStatus | 'all'; label: string }>
                      ).map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setStatusFilter(option.value);
                            setOpenMenu(false);
                          }}
                          className={cn(
                            'w-full rounded-lg px-3 py-2 text-left text-sm transition',
                            statusFilter === option.value
                              ? 'bg-brand-50 font-semibold text-brand-600'
                              : 'text-gray-600 hover:bg-gray-50'
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

            <div>
              <h3 className="text-xl font-semibold text-gray-900">{t('clientDirectory')}</h3>
              {actionMessage && (
                <div className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {actionMessage}
                </div>
              )}
              <div className="mt-4 overflow-hidden rounded-3xl border border-gray-200 bg-white">
                <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-6 py-4">{t('customer')}</th>
                      <th className="px-6 py-4">{t('emailLabel')}</th>
                      <th className="px-6 py-4">{t('businessLabel')}</th>
                      <th className="px-6 py-4">{t('addressLabel')}</th>
                      <th className="px-6 py-4">{t('status')}</th>
                      <th className="px-6 py-4">{t('memberSinceLabel')}</th>
                      <th className="px-6 py-4">{t('orders')}</th>
                      <th className="px-6 py-4">{t('totalPayments')}</th>
                      <th className="px-6 py-4">{t('lastOrder')}</th>
                      <th className="px-6 py-4 text-right">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredClients.map((client) => {
                      const clientStatus: ClientStatus = client.isActive ? 'active' : 'inactive';
                      const address = buildAddress(client);
                      return (
                        <tr
                          key={client.id}
                          className="cursor-pointer transition hover:bg-gray-50"
                          onClick={() => setActiveClient(client)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-600">
                                {buildInitials(getClientName(client))}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900">{getClientName(client)}</p>
                                <p className="text-xs text-gray-500">{client.phone}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className="inline-flex items-center gap-1.5 text-gray-700"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="max-w-[160px] truncate">{client.email}</span>
                              <CopyButton value={client.email} />
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {client.businessName || <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {address
                              ? <span className="max-w-[220px] block truncate" title={address}>{address}</span>
                              : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={cn(
                                'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
                                statusStyles[clientStatus]
                              )}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              {statusLabels[clientStatus]}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {formatDate(client.createdAt, dateLocale)}
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-semibold text-gray-800">
                              {client.totalOrders}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {formatNaira(parseFloat(client.totalPayments) || 0)}
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {formatDate(client.lastOrderAt, dateLocale)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="relative inline-flex" data-client-menu>
                              <button
                                type="button"
                                data-client-menu-button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setOpenClientMenuId((prev) =>
                                    prev === client.id ? null : client.id
                                  );
                                }}
                                className="text-gray-400 hover:text-gray-600"
                                aria-label={t('more')}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                              {openClientMenuId === client.id && (
                                <div className="absolute right-0 top-6 z-20 w-44 rounded-xl border border-gray-200 bg-white p-1 text-left shadow-lg">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setActiveClient(client);
                                      setOpenClientMenuId(null);
                                    }}
                                    className="w-full rounded-lg px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
                                  >
                                    {t('viewDetails')}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void handleCopyEmail(client);
                                      setOpenClientMenuId(null);
                                    }}
                                    className="w-full rounded-lg px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
                                  >
                                    {t('copyEmail')}
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>

                {filteredClients.length === 0 && (
                  <div className="p-6 text-center text-sm text-gray-500">
                    {apiClients.length === 0
                      ? t('noClientsFound')
                      : t('noClientsMatch')}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
