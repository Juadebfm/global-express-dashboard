import { useState, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Phone, Plus, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { AppShell } from '@/pages/shared';
import { Button, Input } from '@/components/ui';
import {
  useAddMySupplier,
  useDashboardData,
  useDecideSupplierValidationRequest,
  useMySupplierUpdateRequests,
  useMySupplierValidationRequests,
  useMySuppliers,
  useRequestSupplierUpdate,
} from '@/hooks';
import {
  addSupplierSchema,
  supplierUpdateRequestSchema,
  type AddSupplierFormData,
  type SupplierUpdateRequestFormData,
} from '@/components/forms';
import type {
  AddSupplierPayload,
  ApiSupplier,
  SupplierUpdateRequestPayload,
} from '@/types';

type Tab = 'suppliers' | 'outgoing' | 'incoming';

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'suppliers', label: 'My suppliers' },
  { id: 'outgoing', label: 'My update requests' },
  { id: 'incoming', label: 'Awaiting my approval' },
];

function fullName(s: ApiSupplier): string {
  return (
    s.displayName ||
    [s.firstName, s.lastName].filter(Boolean).join(' ').trim() ||
    s.businessName ||
    s.email
  );
}

function statusBadge(status: string): string {
  const styles: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700',
    accepted: 'bg-emerald-50 text-emerald-700',
    rejected: 'bg-rose-50 text-rose-700',
  };
  return styles[status] ?? 'bg-gray-100 text-gray-700';
}

function pickFilled(values: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(values)) {
    if (typeof v === 'string' && v.trim().length > 0) {
      out[k] = v.trim();
    }
  }
  return out;
}

export function SuppliersPage(): ReactElement {
  const { data: dashboard, isLoading: dashboardLoading, error: dashboardError } =
    useDashboardData();
  const [tab, setTab] = useState<Tab>('suppliers');
  const [showAdd, setShowAdd] = useState(false);
  const [updateSupplier, setUpdateSupplier] = useState<ApiSupplier | null>(null);

  const { data: suppliers, isLoading: suppliersLoading } = useMySuppliers({ limit: 50 });
  const { data: outgoing, isLoading: outgoingLoading } = useMySupplierUpdateRequests({
    limit: 50,
  });
  const { data: incoming, isLoading: incomingLoading } = useMySupplierValidationRequests({
    limit: 50,
  });

  const addSupplier = useAddMySupplier();
  const requestUpdate = useRequestSupplierUpdate();
  const decide = useDecideSupplierValidationRequest();

  return (
    <AppShell
      data={dashboard}
      isLoading={dashboardLoading}
      error={dashboardError}
      loadingLabel="Loading suppliers..."
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Supplier address book</h1>
            <p className="mt-1 text-sm text-gray-500">
              Saved suppliers you can attach to a new shipment, and the update requests they review.
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add supplier
          </Button>
        </div>

        <div className="flex flex-wrap gap-1 rounded-2xl border border-gray-200 bg-white p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 min-w-[140px] rounded-xl px-3 py-2 text-sm font-semibold transition ${
                tab === t.id
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'suppliers' && (
          <SuppliersList
            suppliers={suppliers?.data ?? []}
            isLoading={suppliersLoading}
            onRequestUpdate={(s) => setUpdateSupplier(s)}
          />
        )}

        {tab === 'outgoing' && (
          <UpdateRequestList
            isLoading={outgoingLoading}
            requests={outgoing?.data ?? []}
            emptyLabel="You haven't proposed any updates yet."
            showActions={false}
            onDecide={() => undefined}
            isDeciding={false}
          />
        )}

        {tab === 'incoming' && (
          <UpdateRequestList
            isLoading={incomingLoading}
            requests={incoming?.data ?? []}
            emptyLabel="Nothing waiting on you right now."
            showActions
            onDecide={(id, isTrue) => decide.mutate({ id, payload: { isTrue } })}
            isDeciding={decide.isPending}
          />
        )}
      </div>

      {showAdd && (
        <AddSupplierModal
          isPending={addSupplier.isPending}
          onClose={() => setShowAdd(false)}
          onSubmit={async (payload) => {
            await addSupplier.mutate(payload);
            setShowAdd(false);
          }}
        />
      )}

      {updateSupplier && (
        <UpdateSupplierModal
          supplier={updateSupplier}
          isPending={requestUpdate.isPending}
          onClose={() => setUpdateSupplier(null)}
          onSubmit={async (payload) => {
            await requestUpdate.mutate({ supplierId: updateSupplier.id, payload });
            setUpdateSupplier(null);
          }}
        />
      )}
    </AppShell>
  );
}

interface SuppliersListProps {
  suppliers: ApiSupplier[];
  isLoading: boolean;
  onRequestUpdate: (supplier: ApiSupplier) => void;
}

function SuppliersList({
  suppliers,
  isLoading,
  onRequestUpdate,
}: SuppliersListProps): ReactElement {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
        Loading suppliers...
      </div>
    );
  }
  if (suppliers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
        <p className="text-base font-semibold text-gray-700">No suppliers yet</p>
        <p className="mt-1 text-sm text-gray-500">
          Add suppliers here to attach them to shipments faster.
        </p>
      </div>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {suppliers.map((s) => (
        <div key={s.id} className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-gray-900">{fullName(s)}</p>
              {s.businessName && (
                <p className="text-sm text-gray-500">{s.businessName}</p>
              )}
            </div>
            {s.source && (
              <span className="rounded-full bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700">
                {s.source.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          <div className="mt-3 space-y-1.5 text-sm text-gray-600">
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-400" /> {s.email}
            </p>
            {s.phone && (
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400" /> {s.phone}
              </p>
            )}
            {typeof s.shipmentUsageCount === 'number' && (
              <p className="text-xs text-gray-400">
                Used on {s.shipmentUsageCount} shipment{s.shipmentUsageCount === 1 ? '' : 's'}
              </p>
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => onRequestUpdate(s)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Propose update
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

interface UpdateRequestListProps {
  requests: Array<{
    id: string;
    status: string;
    note?: string | null;
    proposedFirstName?: string | null;
    proposedLastName?: string | null;
    proposedBusinessName?: string | null;
    proposedPhone?: string | null;
    proposedEmail?: string | null;
    createdAt: string;
    supplier?: { displayName: string; email: string } | undefined;
  }>;
  isLoading: boolean;
  emptyLabel: string;
  showActions: boolean;
  onDecide: (id: string, isTrue: boolean) => void;
  isDeciding: boolean;
}

function UpdateRequestList({
  requests,
  isLoading,
  emptyLabel,
  showActions,
  onDecide,
  isDeciding,
}: UpdateRequestListProps): ReactElement {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
        Loading...
      </div>
    );
  }
  if (requests.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
        {emptyLabel}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {requests.map((r) => {
        const proposed = [
          r.proposedFirstName && `First name: ${r.proposedFirstName}`,
          r.proposedLastName && `Last name: ${r.proposedLastName}`,
          r.proposedBusinessName && `Business: ${r.proposedBusinessName}`,
          r.proposedPhone && `Phone: ${r.proposedPhone}`,
          r.proposedEmail && `Email: ${r.proposedEmail}`,
        ].filter(Boolean) as string[];
        return (
          <div key={r.id} className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                {r.supplier && (
                  <p className="text-sm font-semibold text-gray-900">
                    {r.supplier.displayName}{' '}
                    <span className="text-gray-400">· {r.supplier.email}</span>
                  </p>
                )}
                <p className="text-xs text-gray-400">
                  Submitted {new Date(r.createdAt).toLocaleString()}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusBadge(
                  r.status,
                )}`}
              >
                {r.status}
              </span>
            </div>
            {proposed.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-700">
                {proposed.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
            {r.note && (
              <p className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-600">
                {r.note}
              </p>
            )}
            {showActions && r.status === 'pending' && (
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => onDecide(r.id, true)}
                  disabled={isDeciding}
                  className="inline-flex items-center gap-1.5"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Accept
                </Button>
                <button
                  type="button"
                  onClick={() => onDecide(r.id, false)}
                  disabled={isDeciding}
                  className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        );
      })}
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
    <Modal title="Add supplier" onClose={onClose}>
      <form
        onSubmit={handleSubmit(async (values) => {
          const payload = pickFilled(values) as AddSupplierPayload;
          await onSubmit(payload);
        })}
        className="space-y-4"
      >
        <p className="text-sm text-gray-500">
          Link an existing supplier by id, or invite a new one by email.
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
        <Input
          label="Phone"
          error={errors.phone?.message}
          {...register('phone')}
        />
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

interface UpdateSupplierModalProps {
  supplier: ApiSupplier;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (payload: SupplierUpdateRequestPayload) => Promise<void>;
}

function UpdateSupplierModal({
  supplier,
  isPending,
  onClose,
  onSubmit,
}: UpdateSupplierModalProps): ReactElement {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SupplierUpdateRequestFormData>({
    resolver: zodResolver(supplierUpdateRequestSchema),
    defaultValues: {
      firstName: supplier.firstName ?? '',
      lastName: supplier.lastName ?? '',
      businessName: supplier.businessName ?? '',
      phone: supplier.phone ?? '',
      email: supplier.email,
      note: '',
    },
  });

  return (
    <Modal title={`Propose update for ${fullName(supplier)}`} onClose={onClose}>
      <form
        onSubmit={handleSubmit(async (values) => {
          const payload = pickFilled(values) as SupplierUpdateRequestPayload;
          await onSubmit(payload);
        })}
        className="space-y-4"
      >
        <p className="text-sm text-gray-500">
          The supplier will review and approve any changes before they take effect.
        </p>
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
        <Input
          label="Email"
          type="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="note">
            Note (optional)
          </label>
          <textarea
            id="note"
            rows={3}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Explain why this change is needed."
            {...register('note')}
          />
          {errors.note?.message && (
            <p className="mt-1 text-sm text-red-600">{errors.note.message}</p>
          )}
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
            Send request
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
