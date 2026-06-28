import React, { useState, type ReactElement } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, ArrowLeft, Copy, Check, Package, Pencil, Plus, Users, X } from 'lucide-react';
import { AppShell } from '@/pages/shared';
import { Button, Input } from '@/components/ui';
import { ROUTES } from '@/constants';
import {
  useActivateClient,
  useAddClientSupplier,
  useClientWorkbench,
  useCreateClientGoodsIntake,
  useDashboardData,
  useUpdateClient,
} from '@/hooks';
import {
  addSupplierSchema,
  type AddSupplierFormData,
} from '@/components/forms';
import type {
  AddSupplierPayload,
  ApiOrder,
  ApiSupplier,
  CreateGoodsIntakePayload,
  GoodsIntakeShipmentType,
  UpdateClientPayload,
} from '@/types';

function pickFilled(values: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(values)) {
    if (typeof v === 'string' && v.trim().length > 0) {
      out[k] = v.trim();
    }
  }
  return out;
}

function supplierName(s: ApiSupplier): string {
  return (
    s.displayName ||
    [s.firstName, s.lastName].filter(Boolean).join(' ').trim() ||
    s.businessName ||
    s.email
  );
}

export function ClientWorkbenchPage(): ReactElement {
  const { id: clientId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: dashboard, isLoading: dashboardLoading, error: dashboardError } =
    useDashboardData();
  const { data, isLoading, error } = useClientWorkbench(clientId);
  const addSupplier = useAddClientSupplier(clientId);
  const createIntake = useCreateClientGoodsIntake(clientId);
  const updateClient = useUpdateClient(clientId);
  const activateClient = useActivateClient();

  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [showIntake, setShowIntake] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [activateError, setActivateError] = useState<string | null>(null);

  const handleActivate = async (): Promise<void> => {
    if (!clientId) return;
    setActivateError(null);
    try {
      await activateClient.mutateAsync(clientId);
    } catch (err) {
      setActivateError(err instanceof Error ? err.message : 'Failed to activate client.');
    }
  };

  return (
    <AppShell
      data={dashboard}
      isLoading={dashboardLoading}
      error={dashboardError}
      loadingLabel="Loading client workbench..."
    >
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => navigate(ROUTES.CLIENTS)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 transition hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to clients
        </button>

        {/* Dormant state card — only shown when client is inactive */}
        {data?.client.isActive === false && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-amber-800">Dormant account</p>
                <p className="mt-0.5 text-xs text-amber-700">
                  This client has no portal access.
                </p>

                {/* Shipping mark — prominent */}
                {data.client.shippingMark && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                      Shipping mark
                    </p>
                    <ShippingMarkDisplay value={data.client.shippingMark} />
                  </div>
                )}

                {/* Email / activate */}
                <div className="mt-3">
                  {!data.client.email ? (
                    <p className="text-xs text-amber-700">
                      No email on file —{' '}
                      <button
                        type="button"
                        onClick={() => setShowEdit(true)}
                        className="font-semibold underline underline-offset-2 hover:text-amber-900"
                      >
                        add an email address
                      </button>{' '}
                      before activating.
                    </p>
                  ) : (
                    <Button
                      type="button"
                      variant="primary"
                      isLoading={activateClient.isPending}
                      onClick={() => { void handleActivate(); }}
                      className="mt-1"
                    >
                      Activate client
                    </Button>
                  )}
                </div>

                {activateError && (
                  <p className="mt-2 text-xs text-red-700">{activateError}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
            Loading workbench...
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            {error.message}
          </div>
        )}

        {data && (
          <>
            <div className="rounded-3xl border border-gray-200 bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl font-semibold text-gray-900">
                    {data.client.businessName ||
                      `${data.client.firstName ?? ''} ${data.client.lastName ?? ''}`.trim() ||
                      data.client.email}
                  </h1>
                  <p className="mt-1 text-sm text-gray-500">
                    {data.client.email || <span className="italic text-gray-400">No email</span>}
                    {data.client.phone ? ` · ${data.client.phone}` : ''}
                  </p>
                  {/* Shipping mark pill */}
                  {data.client.shippingMark && (
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-brand-100 bg-brand-50 px-3 py-1">
                      <span className="text-xs text-brand-500">Shipping mark:</span>
                      <span className="max-w-[180px] truncate font-mono text-xs font-semibold tracking-wide text-brand-700" title={data.client.shippingMark}>
                        {data.client.shippingMark}
                      </span>
                      <ShippingMarkCopyButton value={data.client.shippingMark} />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      data.client.isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {data.client.isActive ? 'Active' : 'Dormant'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowEdit(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                </div>
              </div>
              <div className="mt-4 grid gap-4 text-sm text-gray-600 sm:grid-cols-2 lg:grid-cols-3">
                <Stat label="Total orders" value={String(data.client.orderCount)} />
                <Stat
                  label="Total payments"
                  value={`₦${Number(data.client.totalSpent || '0').toLocaleString()}`}
                />
                <Stat
                  label="Last order"
                  value={
                    data.client.lastOrderDate
                      ? new Date(data.client.lastOrderDate).toLocaleDateString()
                      : '—'
                  }
                />
              </div>
            </div>

            <SuppliersSection
              suppliers={data.suppliers}
              total={data.suppliersPagination.total}
              onAdd={() => setShowAddSupplier(true)}
              onCreateIntake={() => setShowIntake(true)}
            />

            <RecentOrdersSection orders={data.recentOrders} />
          </>
        )}
      </div>

      {showEdit && data && (
        <EditClientModal
          client={data.client}
          isPending={updateClient.isPending}
          onClose={() => setShowEdit(false)}
          onSubmit={async (payload) => {
            await updateClient.mutateAsync(payload);
            setShowEdit(false);
          }}
        />
      )}

      {showAddSupplier && (
        <AddSupplierModal
          isPending={addSupplier.isPending}
          onClose={() => setShowAddSupplier(false)}
          onSubmit={async (payload) => {
            await addSupplier.mutate(payload);
            setShowAddSupplier(false);
          }}
        />
      )}

      {showIntake && (
        <GoodsIntakeModal
          isPending={createIntake.isPending}
          onClose={() => setShowIntake(false)}
          onSubmit={async (payload) => {
            await createIntake.mutate(payload);
            setShowIntake(false);
          }}
        />
      )}
    </AppShell>
  );
}

// ── Shipping mark helpers ─────────────────────────────────────────────────────

function ShippingMarkCopyButton({ value }: { value: string }): ReactElement {
  const [copied, setCopied] = useState(false);
  const handleCopy = (): void => {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-brand-400 transition hover:text-brand-600"
      aria-label="Copy shipping mark"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function ShippingMarkDisplay({ value }: { value: string }): ReactElement {
  const [copied, setCopied] = useState(false);
  const handleCopy = (): void => {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="mt-1 flex items-center gap-2">
      <span className="max-w-[220px] truncate font-mono text-base font-bold tracking-widest text-amber-800" title={value}>
        {value}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        className="text-amber-500 transition hover:text-amber-700"
        aria-label="Copy shipping mark"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
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
  client: {
    firstName: string;
    lastName: string;
    businessName?: string;
    email: string;
    phone: string;
    whatsappNumber?: string;
    shippingMark: string | null;
    addressCity?: string;
  };
  isPending: boolean;
  onClose: () => void;
  onSubmit: (payload: UpdateClientPayload) => Promise<void>;
}

function EditClientModal({ client, isPending, onClose, onSubmit }: EditClientModalProps): ReactElement {
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setErrorMsg(null);

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
      if (mark.length < 1 || mark.length > 100) {
        setErrorMsg('Shipping mark must be between 1 and 100 characters.');
        return;
      }
      payload.shippingMark = mark;
    }
    if (trim(form.addressCity)) payload.addressCity = trim(form.addressCity);

    if (Object.keys(payload).length === 0) {
      setErrorMsg('Please fill in at least one field to update.');
      return;
    }

    try {
      await onSubmit(payload);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update client.');
    }
  };

  const field = (
    label: string,
    key: keyof EditClientFormShape,
    type: 'text' | 'email' | 'tel' = 'text',
    placeholder?: string,
  ): ReactElement => (
    <Input
      label={label}
      type={type}
      placeholder={placeholder}
      value={form[key]}
      onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
    />
  );

  return (
    <Modal title="Edit client details" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-500">
          All fields are optional — only filled fields will be updated.
        </p>

        {errorMsg && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMsg}</p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {field('First name', 'firstName')}
          {field('Last name', 'lastName')}
        </div>
        {field('Business name', 'businessName')}
        {field('Email', 'email', 'email', 'client@example.com')}
        {field('Phone', 'phone', 'tel')}
        {field('WhatsApp number', 'whatsappNumber', 'tel')}
        {field('Shipping mark', 'shippingMark', 'text', 'e.g. BeautyByDaz')}
        <p className="text-xs text-gray-500">1–100 characters, any format.</p>
        {field('City', 'addressCity')}

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            Cancel
          </button>
          <Button type="submit" variant="primary" isLoading={isPending}>
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Suppliers section ─────────────────────────────────────────────────────────

interface SuppliersSectionProps {
  suppliers: ApiSupplier[];
  total: number;
  onAdd: () => void;
  onCreateIntake: () => void;
}

function SuppliersSection({
  suppliers,
  total,
  onAdd,
  onCreateIntake,
}: SuppliersSectionProps): ReactElement {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Suppliers</h2>
            <p className="text-sm text-gray-500">{total} linked supplier{total === 1 ? '' : 's'}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onCreateIntake}
            className="inline-flex items-center gap-2"
          >
            <Package className="h-4 w-4" />
            Goods intake
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={onAdd}
            className="inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add supplier
          </Button>
        </div>
      </div>

      {suppliers.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
          No suppliers linked to this client yet.
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {suppliers.map((s) => (
            <div key={s.id} className="rounded-2xl border border-gray-200 p-4">
              <p className="text-sm font-semibold text-gray-900">{supplierName(s)}</p>
              <p className="mt-0.5 text-xs text-gray-500">{s.email}</p>
              {s.phone && <p className="text-xs text-gray-500">{s.phone}</p>}
              {typeof s.shipmentUsageCount === 'number' && (
                <p className="mt-2 text-xs text-gray-400">
                  {s.shipmentUsageCount} shipment{s.shipmentUsageCount === 1 ? '' : 's'}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface RecentOrdersSectionProps {
  orders: ApiOrder[];
}

function RecentOrdersSection({ orders }: RecentOrdersSectionProps): ReactElement {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-900">Recent orders</h2>
      {orders.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
          No recent orders.
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full min-w-[400px] text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Tracking #</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white text-gray-700">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3 font-medium">{o.trackingNumber}</td>
                  <td className="px-4 py-3">{o.statusLabel || o.statusV2}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {o.isPreorder ? 'Booking' : 'Standard'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: number | string;
}

function NumberField({
  label,
  value,
  onChange,
  min,
  step,
}: NumberFieldProps): ReactElement {
  return (
    <div className="w-full">
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        step={step}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="ui-input-field w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-gray-900">{value}</p>
    </div>
  );
}

interface AddSupplierModalProps {
  isPending: boolean;
  onClose: () => void;
  onSubmit: (payload: AddSupplierPayload) => Promise<void>;
}

function AddSupplierModal({
  isPending,
  onClose,
  onSubmit,
}: AddSupplierModalProps): ReactElement {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddSupplierFormData>({
    resolver: zodResolver(addSupplierSchema),
    defaultValues: {
      supplierId: '',
      email: '',
      firstName: '',
      lastName: '',
      businessName: '',
      phone: '',
    },
  });

  return (
    <Modal title="Add supplier to client" onClose={onClose}>
      <form
        onSubmit={handleSubmit(async (values) => {
          const payload = pickFilled(values) as AddSupplierPayload;
          await onSubmit(payload);
        })}
        className="space-y-4"
      >
        <p className="text-sm text-gray-500">
          Link an existing supplier by id, or invite a new supplier by email.
        </p>
        <Input
          label="Existing supplier id (optional)"
          placeholder="UUID"
          error={errors.supplierId?.message}
          {...register('supplierId')}
        />
        <Input
          label="Email"
          type="email"
          placeholder="supplier@example.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="First name"
            error={errors.firstName?.message}
            {...register('firstName')}
          />
          <Input
            label="Last name"
            error={errors.lastName?.message}
            {...register('lastName')}
          />
        </div>
        <Input
          label="Business name"
          error={errors.businessName?.message}
          {...register('businessName')}
        />
        <Input label="Phone" error={errors.phone?.message} {...register('phone')} />
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            Cancel
          </button>
          <Button type="submit" variant="primary" isLoading={isPending}>
            Add supplier
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Goods intake (minimal staff-facing form) ─────────────────────────────────

interface GoodsIntakeFormShape {
  description: string;
  shipmentType: GoodsIntakeShipmentType | '';
  quantity: number;
  weightKg: number;
  itemType: string;
}

interface GoodsIntakeModalProps {
  isPending: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateGoodsIntakePayload) => Promise<void>;
}

function GoodsIntakeModal({
  isPending,
  onClose,
  onSubmit,
}: GoodsIntakeModalProps): ReactElement {
  const [form, setForm] = useState<GoodsIntakeFormShape>({
    description: '',
    shipmentType: '',
    quantity: 1,
    weightKg: 0,
    itemType: '',
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setErrorMsg(null);
    if (form.quantity < 1) {
      setErrorMsg('Quantity must be at least 1');
      return;
    }
    const payload: CreateGoodsIntakePayload = {
      shipmentType: form.shipmentType || undefined,
      description: form.description || undefined,
      packages: [
        {
          quantity: form.quantity,
          weightKg: form.weightKg || undefined,
          itemType: form.itemType || undefined,
          description: form.description || undefined,
        },
      ],
    };
    await onSubmit(payload);
  };

  return (
    <Modal title="Record goods intake" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-500">
          Create an order on behalf of this client. Add full package detail before submitting.
        </p>

        {errorMsg && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMsg}</p>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="shipmentType">
            Shipment type
          </label>
          <select
            id="shipmentType"
            value={form.shipmentType}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                shipmentType: e.target.value as GoodsIntakeShipmentType | '',
              }))
            }
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">— select —</option>
            <option value="air">Air</option>
            <option value="ocean">Ocean</option>
            <option value="d2d">Door-to-door</option>
          </select>
        </div>

        <Input
          label="Description"
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
        />

        <Input
          label="Item type"
          value={form.itemType}
          onChange={(e) => setForm((p) => ({ ...p, itemType: e.target.value }))}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField
            label="Quantity"
            min={1}
            value={form.quantity}
            onChange={(n) => setForm((p) => ({ ...p, quantity: n }))}
          />
          <NumberField
            label="Weight (kg)"
            min={0}
            step="0.01"
            value={form.weightKg}
            onChange={(n) => setForm((p) => ({ ...p, weightKg: n }))}
          />
        </div>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            Cancel
          </button>
          <Button type="submit" variant="primary" isLoading={isPending}>
            Record intake
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function Modal({ title, onClose, children }: ModalProps): ReactElement {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
