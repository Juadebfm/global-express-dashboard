import type { ReactElement } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, X } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import {
  shipmentIntakeSchema,
  type ShipmentIntakeFormData,
} from '@/components/forms';
import type { ShipmentIntakePayload } from '@/types';

interface ShipmentIntakeModalProps {
  isPending: boolean;
  onClose: () => void;
  onSubmit: (payload: ShipmentIntakePayload) => Promise<void>;
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
  const out: ShipmentIntakePayload['goods'][number] = { supplierId: line.supplierId };
  if (typeof line.description === 'string' && line.description.trim()) {
    out.description = line.description.trim();
  }
  if (typeof line.itemType === 'string' && line.itemType.trim()) {
    out.itemType = line.itemType.trim();
  }
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
  if (typeof line.requiresExtraTruckMovement === 'boolean') {
    out.requiresExtraTruckMovement = line.requiresExtraTruckMovement;
  }
  return out;
}

export function ShipmentIntakeModal({
  isPending,
  onClose,
  onSubmit,
}: ShipmentIntakeModalProps): ReactElement {
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ShipmentIntakeFormData>({
    resolver: zodResolver(shipmentIntakeSchema),
    defaultValues: {
      customerId: '',
      mode: 'air',
      shipmentPayer: 'USER',
      billingSupplierId: '',
      goods: [{ supplierId: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'goods' });
  // eslint-disable-next-line react-hooks/incompatible-library -- RHF watch is safe here
  const shipmentPayer = watch('shipmentPayer');

  return (
    <ModalShell title="Record warehouse intake" onClose={onClose}>
      <form
        onSubmit={handleSubmit(async (values) => {
          const payload: ShipmentIntakePayload = {
            customerId: values.customerId,
            mode: values.mode,
            goods: values.goods.map(cleanLine),
          };
          if (
            values.shipmentType === 'air' ||
            values.shipmentType === 'ocean' ||
            values.shipmentType === 'd2d'
          ) {
            payload.shipmentType = values.shipmentType;
          }
          if (values.shipmentPayer) payload.shipmentPayer = values.shipmentPayer;
          if (
            typeof values.billingSupplierId === 'string' &&
            values.billingSupplierId.trim()
          ) {
            payload.billingSupplierId = values.billingSupplierId.trim();
          }
          await onSubmit(payload);
        })}
        className="space-y-4"
      >
        <p className="text-sm text-gray-500">
          Appends new goods to the customer&apos;s open shipment for this mode + batch, or creates one.
        </p>

        <Input
          label="Customer id"
          placeholder="UUID"
          error={errors.customerId?.message}
          {...register('customerId')}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="mode">
              Transport mode
            </label>
            <select
              id="mode"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              {...register('mode')}
            >
              <option value="air">Air</option>
              <option value="sea">Sea</option>
            </select>
            {errors.mode?.message && (
              <p className="mt-1 text-sm text-red-600">{errors.mode.message}</p>
            )}
          </div>
          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-gray-700"
              htmlFor="shipmentType"
            >
              Shipment type (optional)
            </label>
            <select
              id="shipmentType"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              {...register('shipmentType')}
            >
              <option value="">—</option>
              <option value="air">Air</option>
              <option value="ocean">Ocean</option>
              <option value="d2d">D2D</option>
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="payer">
              Payer
            </label>
            <select
              id="payer"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              {...register('shipmentPayer')}
            >
              <option value="USER">Customer (USER)</option>
              <option value="SUPPLIER">Supplier</option>
            </select>
          </div>
          <Input
            label="Billing supplier id"
            placeholder="UUID (required if payer is SUPPLIER)"
            disabled={shipmentPayer !== 'SUPPLIER'}
            error={errors.billingSupplierId?.message}
            {...register('billingSupplierId')}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">Goods lines</p>
            <button
              type="button"
              onClick={() => append({ supplierId: '' })}
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
                <Input
                  label="Supplier id"
                  placeholder="UUID"
                  error={errors.goods?.[index]?.supplierId?.message}
                  {...register(`goods.${index}.supplierId` as const)}
                />
                <Input
                  label="Item type"
                  error={errors.goods?.[index]?.itemType?.message}
                  {...register(`goods.${index}.itemType` as const)}
                />
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
                  label="Item cost (USD)"
                  type="number"
                  step="0.01"
                  error={errors.goods?.[index]?.itemCostUsd?.message}
                  {...register(`goods.${index}.itemCostUsd` as const)}
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

