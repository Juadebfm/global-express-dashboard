import type { ReactElement } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Plus, Search, Trash2, UserPlus, X } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import {
  shipmentIntakeSchema,
  type ShipmentIntakeFormData,
} from '@/components/forms';
import { useAuthToken, useItemTypes } from '@/hooks';
import { getAllSuppliers, createDormantClient } from '@/services';
import { ApiError } from '@/lib/apiClient';
import type { ApiSupplier, CreateDormantClientPayload, ShipmentIntakePayload } from '@/types';
import { cn } from '@/utils';

// ── Supplier combobox ─────────────────────────────────────────────────────────

interface SupplierComboboxProps {
  value: string;
  onChange: (id: string) => void;
  error?: string;
}

function SupplierCombobox({ value, onChange, error }: SupplierComboboxProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const getAuthToken = useAuthToken();

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers-billing'],
    queryFn: async () => {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      return getAllSuppliers(token, { isActive: true, limit: 100 });
    },
    staleTime: 60_000,
  });

  const suppliers = useMemo<ApiSupplier[]>(() => data?.data ?? [], [data]);
  const selected = suppliers.find((s) => s.id === value) ?? null;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return suppliers;
    return suppliers.filter((s) =>
      `${s.displayName} ${s.email} ${s.businessName ?? ''}`.toLowerCase().includes(needle),
    );
  }, [suppliers, query]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent): void => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'flex w-full items-center justify-between rounded-lg border bg-white px-4 py-2.5 text-left text-sm transition',
          error ? 'border-red-400' : 'border-gray-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500',
        )}
      >
        {selected ? (
          <span className="min-w-0 flex-1 truncate text-gray-900">{selected.displayName}</span>
        ) : (
          <span className="flex-1 text-gray-400">Select supplier…</span>
        )}
        {selected ? (
          <X
            className="ml-2 h-4 w-4 shrink-0 text-gray-400 hover:text-gray-600"
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
          />
        ) : (
          <ChevronDown className={cn('ml-2 h-4 w-4 shrink-0 text-gray-400 transition', open && 'rotate-180')} />
        )}
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 px-3 py-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search suppliers…"
                className="w-full rounded-lg bg-gray-50 py-1.5 pl-7 pr-3 text-sm text-gray-800 outline-none placeholder:text-gray-400"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {isLoading && <p className="px-4 py-3 text-sm text-gray-400">Loading…</p>}
            {!isLoading && filtered.length === 0 && (
              <p className="px-4 py-3 text-sm text-gray-400">No suppliers found</p>
            )}
            {filtered.map((supplier) => (
              <button
                key={supplier.id}
                type="button"
                onClick={() => { onChange(supplier.id); setOpen(false); setQuery(''); }}
                className={cn(
                  'w-full px-4 py-2.5 text-left text-sm transition hover:bg-gray-50',
                  supplier.id === value && 'bg-brand-50',
                )}
              >
                <p className="font-medium text-gray-900">{supplier.displayName}</p>
                <p className="text-xs text-gray-400">{supplier.email}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

// ── Dormant customer inline form ──────────────────────────────────────────────

interface DormantFormValues {
  firstName: string;
  lastName: string;
  phone: string;
  shippingMark: string;
  whatsappNumber: string;
  email: string;
  addressCity: string;
}

interface DormantCustomerSectionProps {
  searchedMark: string;
  isSubmitting: boolean;
  onCreateAndContinue: (data: CreateDormantClientPayload) => Promise<void>;
  onCancel: () => void;
}

function DormantCustomerSection({
  searchedMark,
  isSubmitting,
  onCreateAndContinue,
  onCancel,
}: DormantCustomerSectionProps): ReactElement {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<DormantFormValues>({
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      shippingMark: searchedMark,
      whatsappNumber: '',
      email: '',
      addressCity: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const trimmed = (s: string): string => s.trim();
    const firstName = trimmed(values.firstName);
    const lastName = trimmed(values.lastName);

    if (!firstName && !lastName) {
      setError('firstName', { message: 'At least one of first name or last name is required' });
      return;
    }

    const payload: CreateDormantClientPayload = {
      phone: trimmed(values.phone),
      shippingMark: trimmed(values.shippingMark),
    };
    if (firstName) payload.firstName = firstName;
    if (lastName) payload.lastName = lastName;
    if (trimmed(values.whatsappNumber)) payload.whatsappNumber = trimmed(values.whatsappNumber);
    if (trimmed(values.email)) payload.email = trimmed(values.email);
    if (trimmed(values.addressCity)) payload.addressCity = trimmed(values.addressCity);

    await onCreateAndContinue(payload);
  });

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="mb-4 flex items-center gap-2">
        <UserPlus className="h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-sm font-semibold text-amber-800">
          Customer not found for shipping mark &ldquo;{searchedMark}&rdquo;
        </p>
      </div>
      <p className="mb-4 text-xs text-amber-700">
        Fill in the customer&apos;s details to create a dormant account and continue with the intake.
      </p>

      <form onSubmit={(e) => { void onSubmit(e); }} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              First name <span className="text-gray-400">(optional)</span>
            </label>
            <input
              className={cn(
                'w-full rounded-lg border bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500',
                errors.firstName ? 'border-red-400' : 'border-gray-300',
              )}
              placeholder="e.g. John"
              {...register('firstName')}
            />
            {errors.firstName?.message && (
              <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Last name <span className="text-gray-400">(optional)</span>
            </label>
            <input
              className={cn(
                'w-full rounded-lg border bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500',
                errors.lastName ? 'border-red-400' : 'border-gray-300',
              )}
              placeholder="e.g. Doe"
              {...register('lastName')}
            />
            {errors.lastName?.message && (
              <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        <Input
          label="Phone (required)"
          placeholder="e.g. +234 801 234 5678"
          error={errors.phone?.message}
          {...register('phone', { required: 'Phone number is required' })}
        />

        <Input
          label="Shipping mark (required)"
          placeholder="e.g. juadeb"
          error={errors.shippingMark?.message}
          {...register('shippingMark', { required: 'Shipping mark is required' })}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              WhatsApp <span className="text-gray-400">(optional)</span>
            </label>
            <input
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. +234 801 234 5678"
              {...register('whatsappNumber')}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Email <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="email"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. john@example.com"
              {...register('email', {
                validate: (v) => {
                  if (!v.trim()) return true;
                  return /^[^\r\n\t@]+@[^\r\n\t@]+\.[^\r\n\t@]+$/.test(v.trim()) || 'Enter a valid email address';
                },
              })}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            City <span className="text-gray-400">(optional)</span>
          </label>
          <input
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="e.g. Lagos"
            {...register('addressCity')}
          />
        </div>

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Create &amp; Continue
          </Button>
        </div>
      </form>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

interface ShipmentIntakeModalProps {
  isPending: boolean;
  onClose: () => void;
  onSubmit: (payload: ShipmentIntakePayload) => Promise<void>;
  initialShippingMark?: string;
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function cleanLine(
  line: ShipmentIntakeFormData['goods'][number],
): ShipmentIntakePayload['goods'][number] {
  const out: ShipmentIntakePayload['goods'][number] = {};
  if (typeof line.itemType === 'string' && line.itemType.trim()) out.itemType = line.itemType.trim();
  if (typeof line.description === 'string' && line.description.trim()) out.description = line.description.trim();
  const quantity = parseNumber(line.quantity);
  if (quantity !== undefined) out.quantity = quantity;
  const lengthCm = parseNumber(line.lengthCm);
  if (lengthCm !== undefined) out.lengthCm = lengthCm;
  const widthCm = parseNumber(line.widthCm);
  if (widthCm !== undefined) out.widthCm = widthCm;
  const heightCm = parseNumber(line.heightCm);
  if (heightCm !== undefined) out.heightCm = heightCm;
  const weightKg = parseNumber(line.weightKg);
  if (weightKg !== undefined) out.weightKg = weightKg;
  const cbm = parseNumber(line.cbm);
  if (cbm !== undefined) out.cbm = cbm;
  const itemCostUsd = parseNumber(line.itemCostUsd);
  if (itemCostUsd !== undefined) out.itemCostUsd = itemCostUsd;
  if (line.requiresExtraTruckMovement === true) out.requiresExtraTruckMovement = true;
  if (typeof line.arrivalAt === 'string' && line.arrivalAt.trim()) out.arrivalAt = line.arrivalAt.trim();
  if (typeof line.specialPackagingType === 'string' && line.specialPackagingType.trim()) out.specialPackagingType = line.specialPackagingType.trim();
  return out;
}

export function ShipmentIntakeModal({
  isPending,
  onClose,
  onSubmit,
  initialShippingMark,
}: ShipmentIntakeModalProps): ReactElement {
  const getAuthToken = useAuthToken();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ShipmentIntakeFormData>({
    resolver: zodResolver(shipmentIntakeSchema),
    defaultValues: {
      shippingMark: initialShippingMark ?? '',
      serviceType: undefined,
      internationalLeg: '',
      shipmentPayer: 'USER',
      billingSupplierId: '',
      goods: [{}],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'goods' });
  const serviceType = watch('serviceType');
  const shipmentPayer = watch('shipmentPayer');
  const isD2D = serviceType === 'd2d';
  const { items: itemTypeOptions } = useItemTypes();

  // Customer-not-found inline state
  const [customerNotFound, setCustomerNotFound] = useState(false);
  const [searchedMark, setSearchedMark] = useState('');
  const [dormantPending, setDormantPending] = useState(false);
  // Retain the intake payload so we can replay it after dormant creation
  const pendingPayloadRef = useRef<ShipmentIntakePayload | null>(null);

  const buildPayload = (values: ShipmentIntakeFormData): ShipmentIntakePayload => {
    const mode: 'air' | 'sea' =
      values.serviceType === 'ocean'
        ? 'sea'
        : values.serviceType === 'd2d'
          ? (values.internationalLeg as 'air' | 'sea')
          : 'air';

    const payload: ShipmentIntakePayload = {
      shippingMark: values.shippingMark.trim().toLowerCase(),
      mode,
      shipmentType: values.serviceType,
      goods: values.goods.map(cleanLine),
    };
    if (values.shipmentPayer) payload.shipmentPayer = values.shipmentPayer;
    if (
      typeof values.billingSupplierId === 'string' &&
      values.billingSupplierId.trim()
    ) {
      payload.billingSupplierId = values.billingSupplierId.trim();
    }
    return payload;
  };

  const handleCreateAndContinue = async (dormantPayload: CreateDormantClientPayload): Promise<void> => {
    setDormantPending(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      const newClient = await createDormantClient(token, dormantPayload);

      // Re-submit intake with the new customerId
      const intakePayload = pendingPayloadRef.current;
      if (!intakePayload) throw new Error('Intake payload lost');
      try {
        await onSubmit({ ...intakePayload, customerId: newClient.id });
        // onSubmit closes the modal on success via parent
      } catch (intakeErr) {
        // Client was created but intake failed. Surface a specific message so staff
        // know the customer exists and can retry from the Clients page.
        const reason = intakeErr instanceof Error ? intakeErr.message : 'Unknown error';
        throw new Error(
          `Customer account was created, but intake failed: ${reason}. Find them in the Clients list to retry.`,
        );
      }
    } finally {
      setDormantPending(false);
    }
  };

  return (
    <ModalShell title="Record warehouse intake" onClose={onClose}>
      <form
        onSubmit={handleSubmit(async (values) => {
          const payload = buildPayload(values);
          try {
            await onSubmit(payload);
          } catch (err) {
            // 404 = shipping mark not found — expand inline dormant form
            if (err instanceof ApiError && err.status === 404) {
              pendingPayloadRef.current = payload;
              setSearchedMark(values.shippingMark.trim().toLowerCase());
              setCustomerNotFound(true);
              return;
            }
            // All other errors propagate normally (parent already shows toast)
            throw err;
          }
        })}
        className="space-y-4"
      >
        <p className="text-sm text-gray-500">
          Appends new goods to the customer&apos;s open shipment for this mode + batch, or creates one.
        </p>

        <Input
          label="Shipping mark"
          placeholder="e.g. juadeb"
          error={errors.shippingMark?.message}
          {...register('shippingMark')}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="serviceType">
              Service type
            </label>
            <select
              id="serviceType"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              {...register('serviceType', {
                onChange: () => setValue('internationalLeg', ''),
              })}
            >
              <option value="">— select —</option>
              <option value="air">Air Freight</option>
              <option value="ocean">Sea Freight</option>
              <option value="d2d">Door to Door</option>
            </select>
            {errors.serviceType?.message && (
              <p className="mt-1 text-sm text-red-600">{errors.serviceType.message}</p>
            )}
          </div>

          {isD2D && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="internationalLeg">
                International leg
              </label>
              <select
                id="internationalLeg"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                {...register('internationalLeg')}
              >
                <option value="">— select —</option>
                <option value="air">By Air</option>
                <option value="sea">By Sea</option>
              </select>
              {errors.internationalLeg?.message && (
                <p className="mt-1 text-sm text-red-600">{errors.internationalLeg.message}</p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="payer">
              Who pays?
            </label>
            <select
              id="payer"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              {...register('shipmentPayer', {
                onChange: () => setValue('billingSupplierId', ''),
              })}
            >
              <option value="USER">Customer</option>
              <option value="SUPPLIER">Supplier</option>
            </select>
          </div>

          {shipmentPayer === 'SUPPLIER' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Select supplier
              </label>
              <SupplierCombobox
                value={watch('billingSupplierId') ?? ''}
                onChange={(id) => setValue('billingSupplierId', id, { shouldValidate: true })}
                error={errors.billingSupplierId?.message}
              />
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">Goods lines</p>
            <button
              type="button"
              onClick={() => append({})}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
            >
              <Plus className="h-3.5 w-3.5" /> Add line
            </button>
          </div>
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Line {index + 1}
                </p>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:underline"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                )}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Item type
                  </label>
                  <select
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    {...register(`goods.${index}.itemType` as const)}
                  >
                    <option value="">— select —</option>
                    {itemTypeOptions.map((opt) => (
                      <option key={opt.key} value={opt.key}>{opt.label}</option>
                    ))}
                  </select>
                  {errors.goods?.[index]?.itemType?.message && (
                    <p className="mt-1 text-sm text-red-600">{errors.goods[index].itemType.message}</p>
                  )}
                </div>
                <Input
                  label="Quantity"
                  type="number"
                  step="1"
                  error={errors.goods?.[index]?.quantity?.message}
                  {...register(`goods.${index}.quantity` as const)}
                />
                <Input
                  label="Weight (kg)"
                  type="number"
                  step="0.01"
                  error={errors.goods?.[index]?.weightKg?.message}
                  {...register(`goods.${index}.weightKg` as const)}
                />
                <Input
                  label="CBM"
                  type="number"
                  step="0.001"
                  error={errors.goods?.[index]?.cbm?.message}
                  {...register(`goods.${index}.cbm` as const)}
                />
                <Input
                  label="Length (cm)"
                  type="number"
                  step="0.1"
                  error={errors.goods?.[index]?.lengthCm?.message}
                  {...register(`goods.${index}.lengthCm` as const)}
                />
                <Input
                  label="Width (cm)"
                  type="number"
                  step="0.1"
                  error={errors.goods?.[index]?.widthCm?.message}
                  {...register(`goods.${index}.widthCm` as const)}
                />
                <Input
                  label="Height (cm)"
                  type="number"
                  step="0.1"
                  error={errors.goods?.[index]?.heightCm?.message}
                  {...register(`goods.${index}.heightCm` as const)}
                />
                <Input
                  label="Item cost (USD)"
                  type="number"
                  step="0.01"
                  error={errors.goods?.[index]?.itemCostUsd?.message}
                  {...register(`goods.${index}.itemCostUsd` as const)}
                />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Arrival date</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    {...register(`goods.${index}.arrivalAt` as const)}
                  />
                  {errors.goods?.[index]?.arrivalAt?.message && (
                    <p className="mt-1 text-sm text-red-600">{errors.goods[index].arrivalAt.message}</p>
                  )}
                </div>
                <Input
                  label="Special packaging"
                  placeholder="e.g. fragile, oversized"
                  error={errors.goods?.[index]?.specialPackagingType?.message}
                  {...register(`goods.${index}.specialPackagingType` as const)}
                />
              </div>
              <div className="mt-3">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Description
                </label>
                <input
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  {...register(`goods.${index}.description` as const)}
                />
              </div>
              <label className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-gray-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  {...register(`goods.${index}.requiresExtraTruckMovement` as const)}
                />
                Requires extra truck movement after Lagos arrival
              </label>
            </div>
          ))}
          {errors.goods?.message && (
            <p className="text-sm text-red-600">{errors.goods.message}</p>
          )}
        </div>

        {/* Customer-not-found inline section */}
        {customerNotFound && (
          <DormantCustomerSection
            searchedMark={searchedMark}
            isSubmitting={dormantPending}
            onCreateAndContinue={handleCreateAndContinue}
            onCancel={() => {
              setCustomerNotFound(false);
              setSearchedMark('');
              pendingPayloadRef.current = null;
            }}
          />
        )}

        {!customerNotFound && (
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
        )}
      </form>
    </ModalShell>
  );
}

interface ModalShellProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function ModalShell({ title, onClose, children }: ModalShellProps): ReactElement {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
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
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
