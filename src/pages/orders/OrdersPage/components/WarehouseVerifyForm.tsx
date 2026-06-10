import type { FormEvent, ReactElement } from 'react';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui';
import { formatCurrency } from '@/utils';
import type { OrderView } from '../types';
import { mapPackageForm, parsePositive, parsePositiveInt, toIso } from '../types';

interface WarehouseVerifyFormProps {
  view: OrderView;
  canApproveOverride: boolean;
  isPending: boolean;
  onSubmit: (payload: {
    transportMode: 'air' | 'sea';
    departureDate?: string;
    packages: ReturnType<typeof mapPackageForm>[];
    manualFinalChargeUsd?: number;
    manualAdjustmentReason?: string;
  }) => Promise<{ finalChargeUsd: number }>;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactElement;
}): ReactElement {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  'w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500';

export function WarehouseVerifyForm({
  view,
  canApproveOverride,
  isPending,
  onSubmit,
}: WarehouseVerifyFormProps): ReactElement {
  const defaultMode = (view.transportMode || view.shipmentType) === 'sea' ? 'sea' : 'air';

  const [transportMode, setTransportMode] = useState<'air' | 'sea'>(defaultMode);
  const [departureDate, setDepartureDate] = useState('');
  const [packageCount, setPackageCount] = useState('1');
  const [lengthCm, setLengthCm] = useState('');
  const [widthCm, setWidthCm] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [restricted, setRestricted] = useState<'none' | 'flag'>('none');
  const [flagNote, setFlagNote] = useState('');
  const [manualCharge, setManualCharge] = useState('');
  const [manualReason, setManualReason] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const volumetricKg = useMemo(() => {
    const l = parsePositive(lengthCm);
    const w = parsePositive(widthCm);
    const h = parsePositive(heightCm);
    if (!l || !w || !h) return null;
    return (l * w * h) / 5000;
  }, [lengthCm, widthCm, heightCm]);

  const cbm = useMemo(() => {
    const l = parsePositive(lengthCm);
    const w = parsePositive(widthCm);
    const h = parsePositive(heightCm);
    if (!l || !w || !h) return null;
    return (l * w * h) / 1000000;
  }, [lengthCm, widthCm, heightCm]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setNotice(null);
    setError(null);

    if (restricted === 'flag' && !canApproveOverride && !flagNote.trim()) {
      setError('Add a note describing why this item is flagged.');
      return;
    }

    const manualFinalChargeUsd = manualCharge.trim() ? parsePositive(manualCharge) : undefined;
    if (manualFinalChargeUsd !== undefined && !manualReason.trim()) {
      setError('A reason is required when overriding the charge.');
      return;
    }

    const pkg = mapPackageForm({
      id: 1,
      description: '',
      itemType: '',
      quantity: packageCount,
      lengthCm,
      widthCm,
      heightCm,
      weightKg,
      cbm: cbm != null ? String(cbm) : '',
      specialPackagingType: '',
      isRestricted: restricted === 'flag',
      restrictedReason: restricted === 'flag' ? (flagNote.trim() || 'Flagged for review') : '',
      restrictedOverrideApproved: false,
      restrictedOverrideReason: '',
    });

    try {
      const result = await onSubmit({
        transportMode,
        departureDate: toIso(departureDate),
        packages: [pkg],
        manualFinalChargeUsd,
        manualAdjustmentReason: manualReason.trim() || undefined,
      });
      setNotice(`Verified. Final charge: ${formatCurrency(result.finalChargeUsd, 'USD')}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed. Please try again.');
    }
  };

  const qty = parsePositiveInt(packageCount);

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => void handleSubmit(e)}
    >
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Warehouse verification</h3>
          <span
            className={
              notice
                ? 'rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700'
                : 'rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700'
            }
          >
            {notice ? 'Verified' : 'Pending'}
          </span>
        </div>

        {/* Transport mode + departure */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Transport mode">
            <select
              value={transportMode}
              onChange={(e) => setTransportMode(e.target.value as 'air' | 'sea')}
              className={inputCls}
            >
              <option value="air">Air freight</option>
              <option value="sea">Sea freight</option>
            </select>
          </Field>
          <Field label="Departure date">
            <input
              type="datetime-local"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        {/* Dimensions */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Field label="Length (cm)">
            <input
              type="number"
              min="0"
              step="0.1"
              value={lengthCm}
              onChange={(e) => setLengthCm(e.target.value)}
              placeholder="0"
              className={inputCls}
            />
          </Field>
          <Field label="Width (cm)">
            <input
              type="number"
              min="0"
              step="0.1"
              value={widthCm}
              onChange={(e) => setWidthCm(e.target.value)}
              placeholder="0"
              className={inputCls}
            />
          </Field>
          <Field label="Height (cm)">
            <input
              type="number"
              min="0"
              step="0.1"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              placeholder="0"
              className={inputCls}
            />
          </Field>
        </div>

        {/* Weight + volumetric + package count */}
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Field label="Actual weight (kg)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="0.00"
              className={inputCls}
            />
          </Field>
          <Field label="Volumetric weight (kg)">
            <input
              readOnly
              value={volumetricKg != null ? volumetricKg.toFixed(2) : '—'}
              className={`${inputCls} cursor-default bg-gray-50 text-gray-500`}
            />
          </Field>
          <Field label="Package count">
            <input
              type="number"
              min="1"
              step="1"
              value={packageCount}
              onChange={(e) => setPackageCount(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        {qty != null && qty > 1 && (
          <p className="mt-1.5 text-xs text-gray-400">
            Dimensions and weight apply to each of the {qty} packages.
          </p>
        )}

        {/* Restricted goods */}
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Restricted goods
          </p>
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-700">
              <input
                type="radio"
                name="restricted"
                value="none"
                checked={restricted === 'none'}
                onChange={() => setRestricted('none')}
                className="h-4 w-4 accent-brand-500"
              />
              No restricted items
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-700">
              <input
                type="radio"
                name="restricted"
                value="flag"
                checked={restricted === 'flag'}
                onChange={() => setRestricted('flag')}
                className="h-4 w-4 accent-brand-500"
              />
              Flag for review
            </label>
          </div>
          {restricted === 'flag' && (
            <textarea
              value={flagNote}
              onChange={(e) => setFlagNote(e.target.value)}
              placeholder="Describe the restricted item…"
              rows={2}
              className={`${inputCls} mt-2 resize-none`}
            />
          )}
        </div>

        {/* Manual charge override (admin only) */}
        {canApproveOverride && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Override charge (USD)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={manualCharge}
                onChange={(e) => setManualCharge(e.target.value)}
                placeholder="Leave blank for auto"
                className={inputCls}
              />
            </Field>
            <Field label="Override reason">
              <input
                type="text"
                value={manualReason}
                onChange={(e) => setManualReason(e.target.value)}
                placeholder="Required if overriding"
                className={inputCls}
              />
            </Field>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" isLoading={isPending}>
          Mark verified
        </Button>
        <Button type="button" variant="secondary" disabled={isPending}>
          Save draft
        </Button>
      </div>

      {notice && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {notice}
        </p>
      )}
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
