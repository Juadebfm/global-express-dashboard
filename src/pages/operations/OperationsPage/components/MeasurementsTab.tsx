import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Clock, Edit2, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/utils';
import type { MeasurementCheckpoint, ShipmentMeasurement } from '@/types';

// ── Constants ─────────────────────────────────────────────────────────────────

const CHECKPOINTS: Array<{ key: MeasurementCheckpoint; label: string }> = [
  { key: 'SK_WAREHOUSE', label: 'South Korea Warehouse' },
  { key: 'AIRPORT', label: 'Airport' },
  { key: 'NIGERIA_OFFICE', label: 'Nigeria Office' },
];

const inputCls =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 transition';

// ── Delta badge ───────────────────────────────────────────────────────────────
// `useShipmentMeasurements` (the live endpoint) doesn't return a precomputed
// delta-from-baseline the way the old, unused `useMeasurements` did — compute
// it client-side against the SK_WAREHOUSE reading instead.

function DeltaBadge({ value, unit }: { value: number; unit: string }): ReactElement {
  const isPositive = value > 0;
  const isZero = value === 0;
  const magnitude = Math.abs(value);
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
      isZero ? 'bg-gray-100 text-gray-500'
        : isPositive ? 'bg-amber-100 text-amber-700'
          : 'bg-emerald-100 text-emerald-700',
    )}>
      {isPositive ? '+' : isZero ? '' : '-'}{magnitude.toFixed(magnitude < 0.01 ? 6 : 3)} {unit}
    </span>
  );
}

// ── Record form (inline) ──────────────────────────────────────────────────────

function RecordForm({
  checkpoint,
  existing,
  isPending,
  onSubmit,
  onCancel,
}: {
  checkpoint: MeasurementCheckpoint;
  existing?: ShipmentMeasurement;
  isPending: boolean;
  onSubmit: (data: { checkpoint: MeasurementCheckpoint; measuredWeightKg: number; measuredCbm: number; notes?: string }) => void;
  onCancel: () => void;
}): ReactElement {
  const [weightKg, setWeightKg] = useState(existing ? String(existing.measuredWeightKg) : '');
  const [cbm, setCbm] = useState(existing ? String(existing.measuredCbm) : '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (): void => {
    const w = parseFloat(weightKg);
    const c = parseFloat(cbm);
    if (!w || w <= 0 || !c || c <= 0) {
      setError('Weight and CBM must both be greater than 0.');
      return;
    }
    setError(null);
    onSubmit({ checkpoint, measuredWeightKg: w, measuredCbm: c, notes: notes.trim() || undefined });
  };

  return (
    <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Weight (kg) *</p>
          <input
            type="number" min="0" step="0.001" placeholder="0.000"
            value={weightKg} onChange={(e) => setWeightKg(e.target.value)}
            disabled={isPending}
            className={cn(inputCls, isPending && 'opacity-50 cursor-not-allowed')}
          />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">CBM (m³) *</p>
          <input
            type="number" min="0" step="0.000001" placeholder="0.000000"
            value={cbm} onChange={(e) => setCbm(e.target.value)}
            disabled={isPending}
            className={cn(inputCls, isPending && 'opacity-50 cursor-not-allowed')}
          />
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Notes (optional)</p>
        <textarea
          rows={2} placeholder="Any notes about this measurement…"
          value={notes} onChange={(e) => setNotes(e.target.value)}
          disabled={isPending}
          className={cn(`${inputCls} resize-none`, isPending && 'opacity-50 cursor-not-allowed')}
        />
      </div>
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="primary" isLoading={isPending} onClick={handleSubmit}>
          {existing ? 'Update' : 'Record'}
        </Button>
        <Button type="button" size="sm" variant="secondary" disabled={isPending} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ── Checkpoint card ───────────────────────────────────────────────────────────

function CheckpointCard({
  checkpoint,
  label,
  measurement,
  deltaFromBaseline,
  isBaseline,
  isAutoFilled,
  canRecord,
  isPending,
  onRecord,
}: {
  checkpoint: MeasurementCheckpoint;
  label: string;
  measurement?: ShipmentMeasurement;
  deltaFromBaseline?: { weightKg: number; cbm: number };
  isBaseline: boolean;
  isAutoFilled: boolean;
  canRecord: boolean;
  isPending: boolean;
  onRecord: (data: { checkpoint: MeasurementCheckpoint; measuredWeightKg: number; measuredCbm: number; notes?: string }) => void;
}): ReactElement {
  // 'idle' | 'editing' | 'submitting' — one state drives both the form
  // visibility and the loading indicator, avoiding two setState calls in the
  // effect below (which the linter flags as cascading-render risk).
  const [editState, setEditState] = useState<'idle' | 'editing' | 'submitting'>('idle');
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && editState === 'submitting') {
      setEditState('idle'); // eslint-disable-line react-hooks/set-state-in-effect
    }
    wasPending.current = isPending;
  }, [isPending, editState]);

  const recorded = !!measurement;

  const fmtDate = (iso: string): string =>
    new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className={cn(
      'rounded-xl border p-4',
      recorded ? 'border-gray-200 bg-white' : 'border-dashed border-gray-300 bg-gray-50/50',
    )}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {recorded ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          ) : (
            <Clock className="h-4 w-4 shrink-0 text-gray-400" />
          )}
          <span className="text-sm font-semibold text-gray-900">{label}</span>
          {isBaseline && (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-600">
              Baseline
            </span>
          )}
          {isAutoFilled && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
              <Lock className="h-2.5 w-2.5" />
              Auto-filled
            </span>
          )}
        </div>
        {canRecord && (
          <button
            type="button"
            onClick={() => setEditState((s) => s === 'idle' ? 'editing' : 'idle')}
            className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-900"
          >
            {editState !== 'idle' ? (
              <><ChevronUp className="h-3.5 w-3.5" /> Cancel</>
            ) : recorded ? (
              <><Edit2 className="h-3.5 w-3.5" /> Edit</>
            ) : (
              <><ChevronDown className="h-3.5 w-3.5" /> Record</>
            )}
          </button>
        )}
      </div>

      {/* Recorded data */}
      {recorded && measurement && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <div>
              <span className="text-xs text-gray-400">Weight</span>
              <p className="text-sm font-semibold text-gray-900">{measurement.measuredWeightKg} kg</p>
            </div>
            <div>
              <span className="text-xs text-gray-400">CBM</span>
              <p className="text-sm font-semibold text-gray-900">{measurement.measuredCbm} m³</p>
            </div>
            {!isBaseline && deltaFromBaseline && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">vs baseline</span>
                <DeltaBadge value={deltaFromBaseline.weightKg} unit="kg" />
                <DeltaBadge value={deltaFromBaseline.cbm} unit="m³" />
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400">{fmtDate(measurement.updatedAt)}</p>
          {measurement.notes && (
            <p className="text-xs text-gray-600 italic">{measurement.notes}</p>
          )}
        </div>
      )}

      {/* Not yet recorded */}
      {!recorded && editState === 'idle' && (
        <p className="mt-2 text-xs text-gray-400">
          {isAutoFilled
            ? 'Filled automatically when the order is received at the warehouse.'
            : 'Not yet recorded.'}
        </p>
      )}

      {/* Inline record / edit form */}
      {editState !== 'idle' && (
        <RecordForm
          checkpoint={checkpoint}
          existing={measurement}
          isPending={editState === 'submitting' && isPending}
          onSubmit={(data) => {
            setEditState('submitting');
            onRecord(data);
          }}
          onCancel={() => {
            if (editState !== 'submitting') setEditState('idle');
          }}
        />
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface MeasurementsTabProps {
  measurements: ShipmentMeasurement[];
  isLoading: boolean;
  canRecord: boolean;
  isPending: boolean;
  onRecord: (data: { checkpoint: MeasurementCheckpoint; measuredWeightKg: number; measuredCbm: number; notes?: string }) => void;
}

export function MeasurementsTab({
  measurements,
  isLoading,
  canRecord,
  isPending,
  onRecord,
}: MeasurementsTabProps): ReactElement {
  if (isLoading) {
    return (
      <div className="p-5">
        <p className="text-sm text-gray-400">Loading measurements…</p>
      </div>
    );
  }

  const byCheckpoint = Object.fromEntries(measurements.map((m) => [m.checkpoint, m]));
  const baseline = byCheckpoint['SK_WAREHOUSE'];

  return (
    <div className="p-5 space-y-3">
      <div>
        <h3 className="text-base font-semibold text-gray-900">Measurement checkpoints</h3>
        <p className="mt-0.5 text-sm text-gray-500">
          Record weights and CBM at each stage. The Korea warehouse reading is the baseline — deltas are calculated from it.
        </p>
      </div>
      {CHECKPOINTS.map((cp) => {
        const isAutoFilled = cp.key === 'SK_WAREHOUSE';
        const measurement = byCheckpoint[cp.key];
        const deltaFromBaseline = !isAutoFilled && measurement && baseline
          ? {
              weightKg: measurement.measuredWeightKg - baseline.measuredWeightKg,
              cbm: measurement.measuredCbm - baseline.measuredCbm,
            }
          : undefined;
        return (
          <CheckpointCard
            key={cp.key}
            checkpoint={cp.key}
            label={cp.label}
            measurement={measurement}
            deltaFromBaseline={deltaFromBaseline}
            isBaseline={isAutoFilled}
            isAutoFilled={isAutoFilled}
            canRecord={canRecord && !isAutoFilled}
            isPending={isPending}
            onRecord={onRecord}
          />
        );
      })}
    </div>
  );
}
