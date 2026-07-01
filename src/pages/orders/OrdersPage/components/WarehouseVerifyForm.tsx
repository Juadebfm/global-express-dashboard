import type { FormEvent, ReactElement } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Info, AlertTriangle, Plus, X, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui';
import { formatCurrency } from '@/utils';
import { cn } from '@/utils';
import { usePublicCalculatorRates } from '@/hooks';
import type { PublicCalculatorRates } from '@/types';
import type { GoodsBreakdownItem } from '@/services';
import type { OrderView } from '../types';
import { mapPackageForm, parsePositive, parsePositiveInt, toIso } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PackageRow {
  id: number;
  description: string;
  quantity: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  weightKg: string;
  cbm: string;
  arrivalAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function emptyRow(id: number): PackageRow {
  return { id, description: '', quantity: '1', lengthCm: '', widthCm: '', heightCm: '', weightKg: '', cbm: '', arrivalAt: '' };
}

function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function rowFromBreakdown(item: GoodsBreakdownItem, id: number): PackageRow {
  return {
    id,
    description: item.description,
    quantity: String(item.quantity > 0 ? item.quantity : 1),
    weightKg: item.weightKg > 0 ? String(item.weightKg) : '',
    cbm: item.cbm > 0 ? String(item.cbm) : '',
    lengthCm: item.dimensionsCm?.length ? String(item.dimensionsCm.length) : '',
    widthCm: item.dimensionsCm?.width ? String(item.dimensionsCm.width) : '',
    heightCm: item.dimensionsCm?.height ? String(item.dimensionsCm.height) : '',
    arrivalAt: isoToDatetimeLocal(item.arrivalAt),
  };
}

function rowVolKg(row: PackageRow): number | null {
  const l = parsePositive(row.lengthCm);
  const w = parsePositive(row.widthCm);
  const h = parsePositive(row.heightCm);
  if (!l || !w || !h) return null;
  return (l * w * h) / 5000;
}

function rowCbmFromDims(row: PackageRow): number | null {
  const l = parsePositive(row.lengthCm);
  const w = parsePositive(row.widthCm);
  const h = parsePositive(row.heightCm);
  if (!l || !w || !h) return null;
  return (l * w * h) / 1_000_000;
}

function computeTotalCharge(
  rates: PublicCalculatorRates,
  mode: 'air' | 'sea',
  rows: PackageRow[],
  isD2D: boolean,
): number | null {
  if (isD2D || mode === 'sea') {
    const totalCbm = rows.reduce((sum, row) => {
      const cbm = isD2D
        ? (parsePositive(row.cbm) ?? 0)
        : (rowCbmFromDims(row) ?? 0);
      const qty = parsePositiveInt(row.quantity) ?? 1;
      return sum + cbm * qty;
    }, 0);
    if (totalCbm <= 0) return null;
    return totalCbm * rates.sea.flatRateUsdPerCbm;
  }
  const totalKg = rows.reduce((sum, row) => {
    const actual = parsePositive(row.weightKg) ?? 0;
    const vol = rowVolKg(row) ?? 0;
    const qty = parsePositiveInt(row.quantity) ?? 1;
    return sum + Math.max(actual, vol) * qty;
  }, 0);
  if (totalKg <= 0) return null;
  const tier =
    rates.air.tiers.find((t) => totalKg >= t.minKg && totalKg <= t.maxKg) ??
    rates.air.tiers.at(-1);
  if (!tier) return null;
  return totalKg * tier.rateUsdPerKg;
}

// ── Sub-components ────────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 transition';

function SectionLabel({ children }: { children: React.ReactNode }): ReactElement {
  return (
    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
      {children}
    </p>
  );
}

function UnitInput({
  value,
  onChange,
  unit,
  readOnly = false,
  error = false,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { unit: string; readOnly?: boolean; error?: boolean }): ReactElement {
  return (
    <div className={cn(
      'flex items-center overflow-hidden rounded-xl border focus-within:border-brand-500 transition',
      error ? 'border-red-400' : 'border-gray-200',
    )}>
      <input
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        className={cn(
          'flex-1 min-w-0 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none',
          readOnly && 'cursor-default bg-gray-50 text-gray-500',
        )}
        {...rest}
      />
      <span className="shrink-0 border-l border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-medium text-gray-400">
        {unit}
      </span>
    </div>
  );
}

// ── Package row card ──────────────────────────────────────────────────────────

// datetime-local inputs expect "YYYY-MM-DDTHH:MM" in local time
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function PackageRowCard({
  row,
  index,
  canRemove,
  isD2D,
  showErrors,
  minDatetime,
  onUpdate,
  onRemove,
}: {
  row: PackageRow;
  index: number;
  canRemove: boolean;
  isD2D: boolean;
  showErrors: boolean;
  minDatetime: string;
  onUpdate: (updates: Partial<PackageRow>) => void;
  onRemove: () => void;
}): ReactElement {
  const hasWeight = (parsePositive(row.weightKg) ?? 0) > 0;
  const hasCbm = (parsePositive(row.cbm) ?? 0) > 0;
  const weightError = showErrors && isD2D && !hasWeight;
  const cbmError = showErrors && isD2D && !hasCbm;

  const volKg = rowVolKg(row);
  const actualKg = parsePositive(row.weightKg);
  const chargeableKg = volKg != null || actualKg != null
    ? Math.max(actualKg ?? 0, volKg ?? 0)
    : null;
  const usingVol = chargeableKg != null && (volKg ?? 0) > (actualKg ?? 0);

  const hasError = showErrors && isD2D && (!hasWeight || !hasCbm);

  return (
    <div className={cn(
      'overflow-hidden rounded-xl border bg-white shadow-sm',
      hasError ? 'border-red-300' : 'border-gray-200',
    )}>
      {/* Card header */}
      <div className={cn(
        'flex items-center justify-between border-b px-4 py-2.5',
        hasError ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50',
      )}>
        <div className="flex items-center gap-2">
          <span className={cn(
            'flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold',
            hasError ? 'bg-red-200 text-red-700' : 'bg-gray-200 text-gray-700',
          )}>
            {index + 1}
          </span>
          <span className={cn(
            'text-sm font-semibold',
            hasError ? 'text-red-700' : 'text-gray-700',
          )}>
            Package {index + 1}
          </span>
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="flex h-6 w-6 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Card body */}
      <div className="p-4">

      {isD2D ? (
        /* D2D: weight + CBM + qty — stack to 2-col on mobile, 3-col on sm+ */
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div>
            <SectionLabel>Weight <span className="text-red-400">*</span></SectionLabel>
            <UnitInput
              type="number" min="0" step="0.01" placeholder="0.00" unit="kg"
              value={row.weightKg}
              onChange={(e) => onUpdate({ weightKg: e.target.value })}
              error={weightError}
            />
            {weightError && <p className="mt-1 text-xs text-red-500">Required</p>}
          </div>
          <div>
            <SectionLabel>CBM <span className="text-red-400">*</span></SectionLabel>
            <UnitInput
              type="number" min="0" step="0.000001" placeholder="0.000000" unit="m³"
              value={row.cbm}
              onChange={(e) => onUpdate({ cbm: e.target.value })}
              error={cbmError}
            />
            {cbmError && <p className="mt-1 text-xs text-red-500">Required</p>}
          </div>
          <div className="col-span-2 sm:col-span-1">
            <SectionLabel>Qty</SectionLabel>
            <UnitInput type="number" min="1" step="1" placeholder="1" unit="×"
              value={row.quantity} onChange={(e) => onUpdate({ quantity: e.target.value })} />
          </div>
        </div>
      ) : (
        /* Air / Sea: L×W×H + weight + qty — stack on mobile, 5-col on sm+ */
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
          <div className="sm:col-span-3">
            <SectionLabel>L × W × H (cm)</SectionLabel>
            <div className="grid grid-cols-3 gap-1.5">
              <UnitInput type="number" min="0" step="0.1" placeholder="L" unit="cm"
                value={row.lengthCm} onChange={(e) => onUpdate({ lengthCm: e.target.value })} />
              <UnitInput type="number" min="0" step="0.1" placeholder="W" unit="cm"
                value={row.widthCm} onChange={(e) => onUpdate({ widthCm: e.target.value })} />
              <UnitInput type="number" min="0" step="0.1" placeholder="H" unit="cm"
                value={row.heightCm} onChange={(e) => onUpdate({ heightCm: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:contents">
            <div>
              <SectionLabel>Weight</SectionLabel>
              <UnitInput type="number" min="0" step="0.01" placeholder="0.00" unit="kg"
                value={row.weightKg} onChange={(e) => onUpdate({ weightKg: e.target.value })} />
            </div>
            <div>
              <SectionLabel>Qty</SectionLabel>
              <UnitInput type="number" min="1" step="1" placeholder="1" unit="×"
                value={row.quantity} onChange={(e) => onUpdate({ quantity: e.target.value })} />
            </div>
          </div>
        </div>
      )}

      {/* Description */}
      <div className="mt-2.5">
        <input
          type="text"
          placeholder="Description (optional)"
          value={row.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          className={cn(inputCls, 'text-xs')}
        />
      </div>

      {/* Arrival datetime */}
      <div className="mt-2.5">
        <SectionLabel>Date arrived at warehouse</SectionLabel>
        <input
          type="datetime-local"
          value={row.arrivalAt}
          min={minDatetime}
          max={toDatetimeLocal(new Date().toISOString())}
          onChange={(e) => onUpdate({ arrivalAt: e.target.value })}
          className={inputCls}
        />
        {!row.arrivalAt && (
          <p className="mt-1 text-xs text-gray-400">Leave blank to default to today</p>
        )}
      </div>

      {/* Computed info — air/sea only */}
      {!isD2D && chargeableKg != null && (
        <p className="mt-2 text-xs text-gray-400">
          Volumetric: {(volKg ?? 0).toFixed(1)} kg
          {' · '}Chargeable: <span className="font-medium text-gray-600">{chargeableKg.toFixed(2)} kg</span>
          {usingVol ? ' (vol)' : ' (actual)'}
        </p>
      )}
      </div>{/* end card body */}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface WarehouseVerifyFormProps {
  view: OrderView;
  isD2D: boolean;
  imageCount: number;
  canApproveOverride: boolean;
  isPending: boolean;
  mode?: 'first-verify' | 're-verify';
  initialPackages?: GoodsBreakdownItem[];
  /** When provided, the form element gets this id and internal action buttons are hidden. The caller renders its own submit trigger with `form={formId}`. */
  formId?: string;
  onSwitchToImages: () => void;
  onSubmit: (payload: {
    transportMode: 'air' | 'sea';
    departureDate?: string;
    packages: ReturnType<typeof mapPackageForm>[];
    manualFinalChargeUsd?: number;
    manualAdjustmentReason?: string;
  }) => Promise<{ finalChargeUsd: number }>;
}

export function WarehouseVerifyForm({
  view,
  isD2D,
  imageCount,
  canApproveOverride,
  isPending,
  mode = 'first-verify',
  initialPackages = [],
  formId,
  onSwitchToImages,
  onSubmit,
}: WarehouseVerifyFormProps): ReactElement {
  const isReVerify = mode === 're-verify';
  const defaultMode = (view.transportMode || view.shipmentType) === 'sea' ? 'sea' : 'air';
  const draftKey = `gx_verify_draft_${view.id}`;

  // Restore draft on mount (only for first-verify; re-verify prefills from existing data)
  const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  const restoredDraft = useMemo(() => {
    if (isReVerify) return null;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { rows: PackageRow[]; transportMode: 'air' | 'sea'; nextId: number; savedAt?: number };
      if (parsed.savedAt && Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
        localStorage.removeItem(draftKey);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitting = useRef(false);

  const [transportMode, setTransportMode] = useState<'air' | 'sea'>(
    restoredDraft?.transportMode ?? defaultMode,
  );
  const [rows, setRows] = useState<PackageRow[]>(() => {
    if (restoredDraft) return restoredDraft.rows;
    return initialPackages.length > 0
      ? initialPackages.map((pkg, i) => rowFromBreakdown(pkg, i + 1))
      : [emptyRow(1)];
  });
  const [nextId, setNextId] = useState(restoredDraft?.nextId ?? initialPackages.length + 2);

  // Save draft to localStorage on every change (debounced 400ms)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (isReVerify) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ rows, transportMode, nextId, savedAt: Date.now() }));
      } catch { /* quota exceeded — silently skip */ }
    }, 400);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [rows, transportMode, nextId, draftKey, isReVerify]);
  const [restricted, setRestricted] = useState<'none' | 'flag'>('none');
  const [flagNote, setFlagNote] = useState('');
  const [manualCharge, setManualCharge] = useState('');
  const [manualReason, setManualReason] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRowErrors, setShowRowErrors] = useState(false);

  const { data: rates } = usePublicCalculatorRates();

  const systemCharge = useMemo(
    () => (rates ? computeTotalCharge(rates, transportMode, rows, isD2D) : null),
    [rates, transportMode, rows, isD2D],
  );

  const totalKgSummary = useMemo(() => rows.reduce((sum, row) => {
    const actual = parsePositive(row.weightKg) ?? 0;
    const vol = rowVolKg(row) ?? 0;
    const qty = parsePositiveInt(row.quantity) ?? 1;
    return sum + Math.max(actual, vol) * qty;
  }, 0), [rows]);

  const totalCbmSummary = useMemo(() => rows.reduce((sum, row) => {
    const cbm = isD2D
      ? (parsePositive(row.cbm) ?? 0)
      : (rowCbmFromDims(row) ?? 0);
    const qty = parsePositiveInt(row.quantity) ?? 1;
    return sum + cbm * qty;
  }, 0), [rows, isD2D]);

  // D2D gates
  const missingMeasurements = isD2D && rows.some(
    (r) => !(parsePositive(r.weightKg) ?? 0) || !(parsePositive(r.cbm) ?? 0),
  );
  const missingImages = isD2D && imageCount === 0;
  const d2dBlocked = missingMeasurements || missingImages;

  // "Add another package" is disabled until the last row has its required fields
  const lastRow = rows[rows.length - 1];
  const lastRowComplete = lastRow
    ? isD2D
      ? (parsePositive(lastRow.weightKg) ?? 0) > 0 && (parsePositive(lastRow.cbm) ?? 0) > 0
      : (parsePositive(lastRow.weightKg) ?? 0) > 0
    : true;

  const addRow = (): void => {
    if (!lastRowComplete) return;
    setRows((prev) => [...prev, emptyRow(nextId)]);
    setNextId((n) => n + 1);
  };

  const removeRow = (id: number): void => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRow = (id: number, updates: Partial<PackageRow>): void => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setNotice(null);
    setError(null);

    if (isD2D && missingMeasurements) {
      setShowRowErrors(true);
      setError('Every package must have both weight and CBM for D2D orders.');
      return;
    }

    if (isD2D && missingImages) {
      setError('Upload at least one goods image before verifying a D2D order.');
      return;
    }

    if (restricted === 'flag' && !canApproveOverride && !flagNote.trim()) {
      setError('Add a note describing why this item is flagged.');
      return;
    }

    const manualFinalChargeUsd = manualCharge.trim() ? parsePositive(manualCharge) : undefined;
    if (manualFinalChargeUsd !== undefined && !manualReason.trim()) {
      setError('A reason is required when overriding the charge.');
      return;
    }

    const packages = rows.map((row) => ({
      ...mapPackageForm({
        id: row.id,
        description: row.description,
        itemType: '',
        quantity: row.quantity,
        lengthCm: row.lengthCm,
        widthCm: row.widthCm,
        heightCm: row.heightCm,
        weightKg: row.weightKg,
        cbm: row.cbm,
        specialPackagingType: '',
        isRestricted: restricted === 'flag',
        restrictedReason: restricted === 'flag' ? (flagNote.trim() || 'Flagged for review') : '',
        restrictedOverrideApproved: false,
        restrictedOverrideReason: '',
      }),
      arrivalAt: toIso(row.arrivalAt),
    }));

    try {
      const result = await onSubmit({
        transportMode,
        departureDate: undefined,
        packages,
        manualFinalChargeUsd,
        manualAdjustmentReason: manualReason.trim() || undefined,
      });
      // Clear saved draft on success
      try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
      if (isReVerify && view.finalChargeUsd != null) {
        setNotice(
          `Packages updated. Charge revised from ${formatCurrency(view.finalChargeUsd, 'USD')} → ${formatCurrency(result.finalChargeUsd, 'USD')}.`,
        );
      } else {
        setNotice(`Verified. Final charge: ${formatCurrency(result.finalChargeUsd, 'USD')}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed. Please try again.');
      submitting.current = false;
    }
  };

  return (
    <form id={formId} className="space-y-0" onSubmit={(e) => void handleSubmit(e)}>
      <div className="p-5 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900">
                {isReVerify ? 'Update package list' : 'Verify packages'}
              </h3>
              {!isReVerify && restoredDraft && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                  Draft restored
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-gray-500">
              {isReVerify
                ? 'Pre-filled with existing packages. Add new rows below and submit all together.'
                : isD2D
                  ? 'D2D order — weight and CBM are required for every package. At least one goods image must be uploaded.'
                  : "Record actual measurements for each package. The order can't advance until this is confirmed."}
            </p>
          </div>
          {!isReVerify && (
            <span className={cn(
              'shrink-0 rounded-full px-3 py-1 text-xs font-semibold',
              notice ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
            )}>
              {notice ? 'Verified' : 'Pending'}
            </span>
          )}
        </div>

        {/* D2D: missing images gate */}
        {isD2D && missingImages && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-red-700">No goods images uploaded</p>
              <p className="mt-0.5 text-xs text-red-600">
                D2D orders require at least one image before verification.{' '}
                <button
                  type="button"
                  onClick={onSwitchToImages}
                  className="font-semibold underline hover:no-underline"
                >
                  Upload images →
                </button>
              </p>
            </div>
          </div>
        )}

        {/* Re-verify warning */}
        {isReVerify && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold">Re-verifying will recalculate the final charge.</p>
              <p className="mt-0.5">
                All previous packages will be replaced with what you submit below.
                {view.finalChargeUsd != null && (
                  <> Current charge: <span className="font-semibold">{formatCurrency(view.finalChargeUsd, 'USD')}</span>.</>
                )}
                {' '}If the customer has already paid, their payment status will be reviewed automatically.
              </p>
            </div>
          </div>
        )}

        {/* Transport + departure */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <SectionLabel>Transport mode</SectionLabel>
            {isD2D ? (
              <>
                <select
                  value={transportMode}
                  onChange={(e) => setTransportMode(e.target.value as 'air' | 'sea')}
                  className={inputCls}
                >
                  <option value="air">Air freight</option>
                  <option value="sea">Sea freight</option>
                </select>
                <p className="mt-1 text-xs text-gray-400">Sets the dispatch batch — pricing is always CBM-based for D2D.</p>
              </>
            ) : (
              <div className={cn(inputCls, 'flex items-center gap-2 bg-gray-50 text-gray-500 cursor-not-allowed select-none')}>
                {transportMode === 'sea' ? 'Sea freight' : 'Air freight'}
                <span className="ml-auto text-xs text-gray-400">Set at booking</span>
              </div>
            )}
          </div>
          <div>
            <SectionLabel>Departure date</SectionLabel>
            <div className={cn(inputCls, 'flex items-center gap-2 bg-gray-50 text-gray-500 cursor-not-allowed select-none')}>
              <span className="flex-1 text-gray-400">—</span>
              <span className="ml-auto text-xs text-gray-400">Set at dispatch</span>
            </div>
          </div>
        </div>

        {/* Package rows */}
        <div className="space-y-3">
          <SectionLabel>
            Packages ({rows.length})
            {isD2D && <span className="ml-2 text-red-400">Weight + CBM required per package</span>}
          </SectionLabel>
          {rows.map((row, i) => (
            <PackageRowCard
              key={row.id}
              row={row}
              index={i}
              canRemove={rows.length > 1}
              isD2D={isD2D}
              showErrors={showRowErrors}
              minDatetime={toDatetimeLocal(view.createdAt)}
              onUpdate={(u) => updateRow(row.id, u)}
              onRemove={() => removeRow(row.id)}
            />
          ))}
          <button
            type="button"
            onClick={addRow}
            disabled={!lastRowComplete}
            title={!lastRowComplete ? (isD2D ? 'Fill weight and CBM before adding another package' : 'Fill weight before adding another package') : undefined}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-300 disabled:hover:bg-transparent disabled:hover:text-gray-500"
          >
            <Plus className="h-4 w-4" />
            Add another package
          </button>
        </div>

        {/* Restricted goods */}
        <div>
          <SectionLabel>Restricted goods check</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRestricted('none')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition',
                restricted === 'none'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
              )}
            >
              {restricted === 'none' && <CheckCircle2 className="h-4 w-4" />}
              No restricted items
            </button>
            <button
              type="button"
              onClick={() => setRestricted('flag')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition',
                restricted === 'flag'
                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
              )}
            >
              Flag for review
            </button>
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

        {/* System charge summary */}
        {canApproveOverride && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  System calculated charge
                  {isD2D && <span className="ml-1 normal-case font-normal">(CBM-based)</span>}
                </p>
                {systemCharge != null ? (
                  <p className="mt-0.5 text-xl font-semibold text-gray-900">
                    {formatCurrency(systemCharge, 'USD')}
                  </p>
                ) : (
                  <p className="mt-0.5 text-sm text-gray-400">
                    Enter {isD2D ? 'CBM values' : 'measurements'} above to see estimate
                  </p>
                )}
                {systemCharge != null && totalCbmSummary > 0 && (isD2D || transportMode === 'sea') && (
                  <p className="mt-0.5 text-xs text-gray-400">
                    {rows.length} package{rows.length > 1 ? 's' : ''} · {totalCbmSummary.toFixed(4)} CBM total
                  </p>
                )}
                {systemCharge != null && transportMode === 'air' && !isD2D && totalKgSummary > 0 && (
                  <p className="mt-0.5 text-xs text-gray-400">
                    {rows.length} package{rows.length > 1 ? 's' : ''} · {totalKgSummary.toFixed(2)} kg total chargeable
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Info className="h-3.5 w-3.5 shrink-0" />
                Auto-applied if no override
              </div>
            </div>
          </div>
        )}

        {/* Manual override */}
        {canApproveOverride && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <SectionLabel>Override charge (USD)</SectionLabel>
              <input
                type="number"
                min="0"
                step="0.01"
                value={manualCharge}
                onChange={(e) => setManualCharge(e.target.value)}
                placeholder="Leave blank to use calculated"
                className={inputCls}
              />
            </div>
            <div>
              <SectionLabel>Override reason</SectionLabel>
              <input
                type="text"
                value={manualReason}
                onChange={(e) => setManualReason(e.target.value)}
                placeholder="Required if overriding"
                className={cn(
                  inputCls,
                  manualCharge.trim() && !manualReason.trim() && 'border-amber-400 focus:border-amber-500',
                )}
              />
            </div>
          </div>
        )}

        {/* Feedback */}
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
      </div>

      {/* Actions — hidden when managed by an external shell (formId provided) */}
      <div className={formId ? 'hidden' : 'flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-4'}>
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            variant="primary"
            isLoading={isPending}
            disabled={isPending || d2dBlocked}
            leftIcon={!isPending ? <CheckCircle2 className="h-4 w-4" /> : undefined}
          >
            {isReVerify ? 'Update packages & reprice' : 'Mark verified'}
          </Button>
          {!isReVerify && (
            <Button type="button" variant="secondary" disabled={isPending}>
              Save draft
            </Button>
          )}
        </div>
        {!isReVerify && (
          <p className="text-xs text-gray-400">
            {d2dBlocked
              ? isD2D && missingImages
                ? 'Upload goods images to enable verification.'
                : 'Fill in weight and CBM for all packages.'
              : 'Verifying enables "Advance to In transit".'}
          </p>
        )}
      </div>
    </form>
  );
}
