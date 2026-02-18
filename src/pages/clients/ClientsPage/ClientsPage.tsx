import type { ReactElement } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  Copy,
  DollarSign,
  MoreVertical,
  Pencil,
  Search,
  Share2,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import { AppShell } from '@/pages/shared';
import { useAuth, useDashboardData, useSearch } from '@/hooks';
import { cn } from '@/utils';

interface Client {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  type: ClientType;
  status: ClientStatus;
  priority: ClientPriority;
  orders: number;
  avgOrderValue: number;
  revenue: number;
  satisfaction: number;
  lastOrder: string;
}

type ClientStatus = 'active' | 'inactive';
type ClientType = 'enterprise' | 'smb' | 'startup';
type ClientPriority = 'high' | 'medium' | 'low';

type OrderStatus = 'processing' | 'transit' | 'delivered' | 'cancelled';
type OrderPriority = 'high' | 'medium' | 'low';
type PaymentStatus = 'paid' | 'pending' | 'refunded';

type OrderTab = 'all' | OrderStatus;

interface ClientOrder {
  id: string;
  items: string[];
  status: OrderStatus;
  orderDate: string;
  deliveryDate: string;
  priority: OrderPriority;
  totalValue: number;
  payment: PaymentStatus;
}

const clients: Client[] = [
  {
    id: 'client-1',
    name: 'StartupXYZ',
    contactName: 'Emily Rodriguez',
    email: 'emily.rodriguez@startupxyz.com',
    phone: '+1 (555) 123-4567',
    type: 'enterprise',
    status: 'active',
    priority: 'high',
    orders: 298,
    avgOrderValue: 13758,
    revenue: 3200000,
    satisfaction: 4.5,
    lastOrder: 'Feb. 19, 2026',
  },
  {
    id: 'client-2',
    name: 'Olivia Rhye',
    contactName: 'Olivia Rhye',
    email: 'olivia.rhye@smblogistics.com',
    phone: '+1 (555) 442-9812',
    type: 'smb',
    status: 'inactive',
    priority: 'medium',
    orders: 214,
    avgOrderValue: 9830,
    revenue: 2450000,
    satisfaction: 4.2,
    lastOrder: 'Feb. 18, 2026',
  },
  {
    id: 'client-3',
    name: 'Northwind Labs',
    contactName: 'Marcus Lee',
    email: 'marcus.lee@northwindlabs.com',
    phone: '+1 (555) 661-7788',
    type: 'enterprise',
    status: 'active',
    priority: 'high',
    orders: 321,
    avgOrderValue: 15220,
    revenue: 2700000,
    satisfaction: 4.7,
    lastOrder: 'Feb. 19, 2026',
  },
  {
    id: 'client-4',
    name: 'Bluewave Retail',
    contactName: 'Chinedu Okoro',
    email: 'chinedu.okoro@bluewave.com',
    phone: '+1 (555) 209-3344',
    type: 'smb',
    status: 'active',
    priority: 'medium',
    orders: 187,
    avgOrderValue: 10950,
    revenue: 1800000,
    satisfaction: 4.3,
    lastOrder: 'Feb. 18, 2026',
  },
  {
    id: 'client-5',
    name: 'Crestline Health',
    contactName: 'Aisha Balogun',
    email: 'aisha.balogun@crestline.com',
    phone: '+1 (555) 778-6690',
    type: 'enterprise',
    status: 'active',
    priority: 'high',
    orders: 402,
    avgOrderValue: 19240,
    revenue: 3100000,
    satisfaction: 4.8,
    lastOrder: 'Feb. 19, 2026',
  },
  {
    id: 'client-6',
    name: 'Nimbus Freight',
    contactName: 'Tomasz Novak',
    email: 'tomasz.novak@nimbus.com',
    phone: '+1 (555) 909-1122',
    type: 'startup',
    status: 'inactive',
    priority: 'low',
    orders: 88,
    avgOrderValue: 6580,
    revenue: 640000,
    satisfaction: 3.9,
    lastOrder: 'Feb. 16, 2026',
  },
  {
    id: 'client-7',
    name: 'Pinnacle Trading',
    contactName: 'Sarah Chen',
    email: 'sarah.chen@pinnacle.com',
    phone: '+1 (555) 556-4422',
    type: 'enterprise',
    status: 'active',
    priority: 'high',
    orders: 355,
    avgOrderValue: 14120,
    revenue: 2250000,
    satisfaction: 4.6,
    lastOrder: 'Feb. 17, 2026',
  },
  {
    id: 'client-8',
    name: 'Solstice Goods',
    contactName: 'Imani Okafor',
    email: 'imani.okafor@solstice.com',
    phone: '+1 (555) 101-6677',
    type: 'smb',
    status: 'active',
    priority: 'low',
    orders: 124,
    avgOrderValue: 7120,
    revenue: 890000,
    satisfaction: 4.1,
    lastOrder: 'Feb. 15, 2026',
  },
  {
    id: 'client-9',
    name: 'Atlas Manufacturing',
    contactName: 'James Ojo',
    email: 'james.ojo@atlas.com',
    phone: '+1 (555) 314-7720',
    type: 'enterprise',
    status: 'inactive',
    priority: 'medium',
    orders: 165,
    avgOrderValue: 12450,
    revenue: 1570000,
    satisfaction: 4.0,
    lastOrder: 'Feb. 13, 2026',
  },
  {
    id: 'client-10',
    name: 'Lumen Supply',
    contactName: 'Grace Adeyemi',
    email: 'grace.adeyemi@lumen.com',
    phone: '+1 (555) 231-9088',
    type: 'startup',
    status: 'active',
    priority: 'medium',
    orders: 74,
    avgOrderValue: 5930,
    revenue: 420000,
    satisfaction: 4.4,
    lastOrder: 'Feb. 12, 2026',
  },
];

const clientOrders: ClientOrder[] = [
  {
    id: 'ORD-2024-001',
    items: ['Electronics Package (x2)', 'Accessories (x1)'],
    status: 'processing',
    orderDate: 'Feb. 19, 2026',
    deliveryDate: 'Feb. 19, 2026',
    priority: 'high',
    totalValue: 2799.97,
    payment: 'paid',
  },
  {
    id: 'ORD-2024-002',
    items: ['Electronics Package (x2)', 'Accessories (x1)'],
    status: 'transit',
    orderDate: 'Feb. 19, 2026',
    deliveryDate: 'Feb. 19, 2026',
    priority: 'medium',
    totalValue: 2799.97,
    payment: 'paid',
  },
  {
    id: 'ORD-2024-003',
    items: ['Electronics Package (x2)', 'Accessories (x1)'],
    status: 'delivered',
    orderDate: 'Feb. 19, 2026',
    deliveryDate: 'Feb. 19, 2026',
    priority: 'low',
    totalValue: 2799.97,
    payment: 'paid',
  },
  {
    id: 'ORD-2024-004',
    items: ['Electronics Package (x2)', 'Accessories (x1)'],
    status: 'cancelled',
    orderDate: 'Feb. 19, 2026',
    deliveryDate: 'Feb. 19, 2026',
    priority: 'low',
    totalValue: 2799.97,
    payment: 'pending',
  },
  {
    id: 'ORD-2024-005',
    items: ['Electronics Package (x2)', 'Accessories (x1)'],
    status: 'processing',
    orderDate: 'Feb. 19, 2026',
    deliveryDate: 'Feb. 19, 2026',
    priority: 'high',
    totalValue: 2799.97,
    payment: 'paid',
  },
  {
    id: 'ORD-2024-006',
    items: ['Electronics Package (x2)', 'Accessories (x1)'],
    status: 'delivered',
    orderDate: 'Feb. 19, 2026',
    deliveryDate: 'Feb. 19, 2026',
    priority: 'medium',
    totalValue: 2799.97,
    payment: 'pending',
  },
  {
    id: 'ORD-2024-007',
    items: ['Electronics Package (x2)', 'Accessories (x1)'],
    status: 'processing',
    orderDate: 'Feb. 19, 2026',
    deliveryDate: 'Feb. 19, 2026',
    priority: 'medium',
    totalValue: 2799.97,
    payment: 'paid',
  },
  {
    id: 'ORD-2024-008',
    items: ['Electronics Package (x2)', 'Accessories (x1)'],
    status: 'cancelled',
    orderDate: 'Feb. 19, 2026',
    deliveryDate: 'Feb. 19, 2026',
    priority: 'low',
    totalValue: 2799.97,
    payment: 'refunded',
  },
  {
    id: 'ORD-2024-009',
    items: ['Electronics Package (x2)', 'Accessories (x1)'],
    status: 'delivered',
    orderDate: 'Feb. 19, 2026',
    deliveryDate: 'Feb. 19, 2026',
    priority: 'medium',
    totalValue: 2799.97,
    payment: 'paid',
  },
];

const statusLabels: Record<ClientStatus, string> = {
  active: 'Active',
  inactive: 'In-Active',
};

const statusStyles: Record<ClientStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  inactive: 'bg-rose-50 text-rose-700',
};

const typeLabels: Record<ClientType, string> = {
  enterprise: 'Enterprise',
  smb: 'SMB',
  startup: 'Startup',
};

const priorityLabels: Record<ClientPriority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const priorityStyles: Record<ClientPriority, string> = {
  high: 'bg-rose-50 text-rose-600',
  medium: 'bg-amber-50 text-amber-600',
  low: 'bg-emerald-50 text-emerald-600',
};

const orderStatusLabels: Record<OrderStatus, string> = {
  processing: 'Processing',
  transit: 'In-Transit',
  delivered: 'Delivered',
  cancelled: 'Canceled',
};

const orderStatusStyles: Record<OrderStatus, string> = {
  processing: 'bg-blue-600 text-white',
  transit: 'bg-amber-500 text-white',
  delivered: 'bg-emerald-600 text-white',
  cancelled: 'bg-rose-600 text-white',
};

const paymentStyles: Record<PaymentStatus, string> = {
  paid: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  refunded: 'bg-gray-200 text-gray-600',
};

const orderTabs: Array<{ id: OrderTab; label: string }> = [
  { id: 'all', label: 'All Order' },
  { id: 'processing', label: 'Processing' },
  { id: 'transit', label: 'Transit' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled' },
];

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const buildInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '';
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
};

export function ClientsPage(): ReactElement {
  const { data, isLoading, error } = useDashboardData();
  const { query, setQuery } = useSearch();
  const { user } = useAuth();
  const [activeClient, setActiveClient] = useState<Client | null>(null);
  const [clientList, setClientList] = useState<Client[]>(clients);
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<ClientPriority | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ClientType | 'all'>('all');
  const [activeOrderTab, setActiveOrderTab] = useState<OrderTab>('all');
  const [openMenu, setOpenMenu] = useState<'status' | 'priority' | 'type' | null>(null);
  const [openClientMenuId, setOpenClientMenuId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Client | null>(null);

  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  const priorityMenuRef = useRef<HTMLDivElement | null>(null);
  const typeMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openMenu) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      const refMap = {
        status: statusMenuRef,
        priority: priorityMenuRef,
        type: typeMenuRef,
      } as const;
      const currentRef = refMap[openMenu];
      if (currentRef.current && currentRef.current.contains(target)) return;
      setOpenMenu(null);
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
  const hasAccess = role === 'superadmin';

  const filteredClients = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return clientList.filter((client) => {
      const matchesSearch =
        !needle ||
        `${client.name} ${client.contactName} ${client.email} ${client.phone}`
          .toLowerCase()
          .includes(needle);

      const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
      const matchesPriority =
        priorityFilter === 'all' || client.priority === priorityFilter;
      const matchesType = typeFilter === 'all' || client.type === typeFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesType;
    });
  }, [clientList, query, statusFilter, priorityFilter, typeFilter]);

  const summaryStats = useMemo(() => {
    const totalClients = clientList.length;
    const activeClients = clientList.filter((client) => client.status === 'active').length;
    const totalRevenue = clientList.reduce((acc, client) => acc + client.revenue, 0);
    const avgSatisfaction =
      clientList.reduce((acc, client) => acc + client.satisfaction, 0) / totalClients;

    return {
      totalClients,
      activeClients,
      totalRevenue,
      avgSatisfaction,
    };
  }, [clientList]);

  const selectedOrders = useMemo(() => {
    const orders = clientOrders;
    if (activeOrderTab === 'all') return orders;
    return orders.filter((order) => order.status === activeOrderTab);
  }, [activeOrderTab]);

  const handleCopyEmail = async (client: Client): Promise<void> => {
    try {
      await navigator.clipboard.writeText(client.email);
      setActionMessage(`Copied ${client.email}.`);
    } catch {
      setActionMessage('Copy failed.');
    }
  };

  const handleSuspendClient = (client: Client): void => {
    if (client.status === 'inactive') return;
    setClientList((prev) =>
      prev.map((item) =>
        item.id === client.id ? { ...item, status: 'inactive' } : item
      )
    );
    setActiveClient((prev) =>
      prev?.id === client.id ? { ...prev, status: 'inactive' } : prev
    );
    setActionMessage(`${client.name} has been suspended.`);
  };

  const handleDeleteClient = (client: Client): void => {
    setClientList((prev) => prev.filter((item) => item.id !== client.id));
    setActiveClient(null);
    setActionMessage(`${client.name} has been deleted.`);
  };

  if (!hasAccess) {
    return (
      <AppShell
        data={data}
        isLoading={isLoading}
        error={error}
        loadingLabel="Loading clients..."
      >
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
          <p className="text-lg font-semibold text-gray-800">Access restricted</p>
          <p className="mt-2 text-sm text-gray-500">
            Client management is available to Super Admin accounts only.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell data={data} isLoading={isLoading} error={error} loadingLabel="Loading clients...">
      <div className="space-y-6">
        {activeClient ? (
          <div className="space-y-6">
            <button
              type="button"
              onClick={() => setActiveClient(null)}
              className="inline-flex items-center gap-2 text-xl font-semibold text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
              View Clients
            </button>

            <div className="rounded-3xl border border-gray-200 bg-white p-6">
              <p className="text-sm font-semibold text-gray-700">Customer Information</p>
              <div className="mt-4 flex flex-wrap items-center gap-6">
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-brand-50 text-2xl font-semibold text-brand-600">
                  {buildInitials(activeClient.contactName)}
                </div>
                <div className="grid gap-3 text-sm text-gray-500 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400">Name</p>
                    <p className="text-base font-semibold text-gray-900">
                      {activeClient.contactName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400">Phone Number</p>
                    <p className="text-base font-semibold text-gray-900">
                      {activeClient.phone}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400">Email</p>
                    <p className="text-base font-semibold text-gray-900">
                      {activeClient.email}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 px-6 pt-6">
                <div className="flex flex-wrap items-center gap-6">
                  {orderTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveOrderTab(tab.id)}
                      className={cn(
                        'relative pb-3 text-sm font-semibold transition',
                        activeOrderTab === tab.id
                          ? 'text-brand-600'
                          : 'text-gray-500 hover:text-gray-700'
                      )}
                    >
                      {tab.label}
                      {activeOrderTab === tab.id && (
                        <span className="absolute -bottom-0.5 left-0 h-0.5 w-full rounded-full bg-brand-500" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 pb-3">
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50"
                    aria-label="Copy"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50"
                    aria-label="Share"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50"
                    aria-label="Delete"
                    onClick={() => setPendingDelete(activeClient)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50"
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="px-6 py-6">
                <h2 className="text-lg font-semibold text-gray-900">Order List</h2>
                <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-6 py-4">ID</th>
                        <th className="px-6 py-4">Items</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Priority</th>
                        <th className="px-6 py-4">Total Value</th>
                        <th className="px-6 py-4">Payment</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {selectedOrders.map((order) => (
                        <tr key={order.id} className="transition hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-gray-800">{order.id}</td>
                          <td className="px-6 py-4 text-xs text-gray-500">
                            {order.items.map((item) => (
                              <p key={item}>{item}</p>
                            ))}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={cn(
                                'inline-flex rounded-full px-3 py-1 text-xs font-semibold text-white',
                                orderStatusStyles[order.status]
                              )}
                            >
                              {orderStatusLabels[order.status]}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={cn(
                                'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
                                priorityStyles[order.priority]
                              )}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              {priorityLabels[order.priority]}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-700">
                            {currencyFormatter.format(order.totalValue)}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={cn(
                                'inline-flex rounded-full px-3 py-1 text-xs font-semibold',
                                paymentStyles[order.payment]
                              )}
                            >
                              {order.payment.charAt(0).toUpperCase() + order.payment.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              className="text-gray-400 hover:text-gray-600"
                              aria-label="More"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Clients</p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">
                      {summaryStats.totalClients}
                    </p>
                    <p className="mt-1 text-xs text-emerald-600">+12% from last month</p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Users className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Active Clients</p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">
                      {summaryStats.activeClients}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {((summaryStats.activeClients / summaryStats.totalClients) * 100).toFixed(1)}% of total
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
                    <p className="text-sm text-gray-500">Total Revenue</p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">
                      {currencyFormatter.format(summaryStats.totalRevenue)}
                    </p>
                    <p className="mt-1 text-xs text-emerald-600">+8.2% from last month</p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <DollarSign className="h-4 w-4" />
                  </div>
                </div>
              </div>

            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-gray-900">Clients List</h2>
                <p className="text-sm text-gray-500">
                  Manage your client relationships and track performance
                </p>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <div className="relative w-full max-w-xs">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by name, customer ..."
                    className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-800 outline-none transition focus:border-brand-500"
                  />
                </div>
                <div className="relative" ref={statusMenuRef}>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenMenu((prev) => (prev === 'status' ? null : 'status'))
                    }
                    className="inline-flex w-40 items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 shadow-sm transition hover:border-gray-300"
                  >
                    {statusFilter === 'all' ? 'All Status' : statusLabels[statusFilter]}
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 text-gray-400 transition',
                        openMenu === 'status' && 'rotate-180'
                      )}
                    />
                  </button>
                  {openMenu === 'status' && (
                    <div className="absolute z-20 mt-2 w-44 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
                      {(
                        [
                          { value: 'all', label: 'All Status' },
                          { value: 'active', label: 'Active' },
                          { value: 'inactive', label: 'In-Active' },
                        ] as Array<{ value: ClientStatus | 'all'; label: string }>
                      ).map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setStatusFilter(option.value);
                            setOpenMenu(null);
                          }}
                          className={cn(
                            'w-full rounded-lg px-3 py-2 text-left text-sm transition',
                            statusFilter === option.value
                              ? 'bg-brand-50 text-brand-600 font-semibold'
                              : 'text-gray-600 hover:bg-gray-50'
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative" ref={priorityMenuRef}>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenMenu((prev) => (prev === 'priority' ? null : 'priority'))
                    }
                    className="inline-flex w-40 items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 shadow-sm transition hover:border-gray-300"
                  >
                    {priorityFilter === 'all'
                      ? 'All Priorities'
                      : priorityLabels[priorityFilter]}
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 text-gray-400 transition',
                        openMenu === 'priority' && 'rotate-180'
                      )}
                    />
                  </button>
                  {openMenu === 'priority' && (
                    <div className="absolute z-20 mt-2 w-44 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
                      {(
                        [
                          { value: 'all', label: 'All Priorities' },
                          { value: 'high', label: 'High' },
                          { value: 'medium', label: 'Medium' },
                          { value: 'low', label: 'Low' },
                        ] as Array<{ value: ClientPriority | 'all'; label: string }>
                      ).map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setPriorityFilter(option.value);
                            setOpenMenu(null);
                          }}
                          className={cn(
                            'w-full rounded-lg px-3 py-2 text-left text-sm transition',
                            priorityFilter === option.value
                              ? 'bg-brand-50 text-brand-600 font-semibold'
                              : 'text-gray-600 hover:bg-gray-50'
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative" ref={typeMenuRef}>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenMenu((prev) => (prev === 'type' ? null : 'type'))
                    }
                    className="inline-flex w-40 items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 shadow-sm transition hover:border-gray-300"
                  >
                    {typeFilter === 'all' ? 'All Type' : typeLabels[typeFilter]}
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 text-gray-400 transition',
                        openMenu === 'type' && 'rotate-180'
                      )}
                    />
                  </button>
                  {openMenu === 'type' && (
                    <div className="absolute z-20 mt-2 w-44 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
                      {(
                        [
                          { value: 'all', label: 'All Type' },
                          { value: 'enterprise', label: 'Enterprise' },
                          { value: 'smb', label: 'SMB' },
                          { value: 'startup', label: 'Startup' },
                        ] as Array<{ value: ClientType | 'all'; label: string }>
                      ).map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setTypeFilter(option.value);
                            setOpenMenu(null);
                          }}
                          className={cn(
                            'w-full rounded-lg px-3 py-2 text-left text-sm transition',
                            typeFilter === option.value
                              ? 'bg-brand-50 text-brand-600 font-semibold'
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
              <h3 className="text-xl font-semibold text-gray-900">Client Directory</h3>
              {actionMessage && (
                <div className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {actionMessage}
                </div>
              )}
              <div className="mt-4 overflow-hidden rounded-3xl border border-gray-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Orders</th>
                      <th className="px-6 py-4">Revenue</th>
                      <th className="px-6 py-4">Last Order</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredClients.map((client) => (
                      <tr
                        key={client.id}
                        className="cursor-pointer transition hover:bg-gray-50"
                        onClick={() => setActiveClient(client)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-600">
                              {buildInitials(client.contactName)}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{client.name}</p>
                              <p className="text-xs text-gray-500">{client.phone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {typeLabels[client.type]}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={cn(
                              'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
                              statusStyles[client.status]
                            )}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {statusLabels[client.status]}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-800">{client.orders}</p>
                          <p className="text-xs text-gray-400">
                            {currencyFormatter.format(client.avgOrderValue)} avg
                          </p>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {currencyFormatter.format(client.revenue)}
                        </td>
                        <td className="px-6 py-4 text-gray-600">{client.lastOrder}</td>
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
                              aria-label="More"
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
                                  View Details
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleCopyEmail(client);
                                    setOpenClientMenuId(null);
                                  }}
                                  className="w-full rounded-lg px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
                                >
                                  Copy Email
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleSuspendClient(client);
                                    setOpenClientMenuId(null);
                                  }}
                                  disabled={client.status === 'inactive'}
                                  className={cn(
                                    'w-full rounded-lg px-3 py-2 text-sm transition',
                                    client.status === 'inactive'
                                      ? 'cursor-not-allowed text-gray-300'
                                      : 'text-rose-600 hover:bg-rose-50'
                                  )}
                                >
                                  Suspend
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredClients.length === 0 && (
                  <div className="p-6 text-center text-sm text-gray-500">
                    No clients match your filters.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-gray-900">Delete client</h2>
            <p className="mt-3 text-sm text-gray-600">
              Are you sure you want to delete {pendingDelete.name}? This action cannot
              be undone.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDeleteClient(pendingDelete);
                  setPendingDelete(null);
                }}
                className="rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
