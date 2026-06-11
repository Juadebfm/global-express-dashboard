import type { ReactElement } from 'react';
import { useState } from 'react';
import { CheckCircle2, Clock, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/utils';
import type { Measurement, MeasurementCheckpoint } from '@/services/measurementsService';

// ── Constants ─────────────────────────────────────────────────────────────────

const CHECKPOINTS: Array<{ key: MeasurementCheckpoint; label: string }> = [
  { key: 'SK_WAREHOUSE', label: 'South Korea Warehouse' },
  { key: 'AIRPORT', label: 'Airport' },
  { key: 'NIGERIA_OFFICE', label: 'Nigeria Office' },
];

const inputCls =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 transition';

// ── Delta badge ───────────────────────────────────────────────────────────────

function DeltaBadge({ value, unit }: { value: string; unit: string }): ReactElement {
  const num = parseFloat(value);
  const isPositive = num > 0;
  const isZero = num === 0;
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
      isZero ? 'bg-gray-100 text-gray-500'
        : isPositive ? 'bg-amber-100 text-amber-700'
          : 'bg-emerald-100 text-emerald-700',
    )}>
      {isPositive ? '+' : ''}{num > 0 ? num.toFixed(num < 0.01 ? 6 : 3) : Math.abs(num).toFixed(Math.abs(num) < 0.01 ? 6 : 3)}{isZero ? '' : isPositive ? '' : ''} {unit}
    </span>
  );
}

// ── Record form (inline) ──────────────────────────────────────────────────────

function RecordForm({
  checkpoint,
  existing,
  orderId,
  isPending,
  onSubmit,
  onCancel,
}: {
  checkpoint: MeasurementCheckpoint;
  existing?: Measurement;
  orderId: string;
  isPending: boolean;
  onSubmit: (orderId: string, data: { checkpoint: MeasurementCheckpoint; measuredWeightKg: number; measuredCbm: number; notes?: string }) => void;
  onCancel: () => void;
}): ReactElement {
  const [weightKg, setWeightKg] = useState(existing?.measuredWeightKg ?? '');
  const [cbm, setCbm] = useState(existing?.measuredCbm ?? '');
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
    onSubmit(orderId, { checkpoint, measuredWeightKg: w, measuredCbm: c, notes: notes.trim() || undefined });
  };

  return (
    <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Weight (kg) *</p>
          <input
            type="number" min="0" step="0.001" placeholder="0.000"
            value={weightKg} onChange={(e) => setWeightKg(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">CBM (m³) *</p>
          <input
            type="number" min="0" step="0.000001" placeholder="0.000000"
            value={cbm} onChange={(e) => setCbm(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Notes (optional)</p>
        <textarea
          rows={2} placeholder="Any notes about this measurement…"
          value={notes} onChange={(e) => setNotes(e.target.value)}
          className={`${inputCls} resize-none`}
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
  isBaseline,
  orderId,
  canRecord,
  isPending,
  onRecord,
}: {
  checkpoint: MeasurementCheckpoint;
  label: string;
  measurement?: Measurement;
  isBaseline: boolean;
  orderId: string;
  canRecord: boolean;
  isPending: boolean;
  onRecord: (orderId: string, data: { checkpoint: MeasurementCheckpoint; measuredWeightKg: number; measuredCbm: number; notes?: string }) => void;
}): ReactElement {
  const [editing, setEditing] = useState(false);
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
        </div>
        {canRecord && (
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-900"
          >
            {editing ? (
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
            {!isBaseline && measurement.deltaFromSkWeightKg !== null && measurement.deltaFromSkCbm !== null && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">vs baseline</span>
                <DeltaBadge value={measurement.deltaFromSkWeightKg} unit="kg" />
                <DeltaBadge value={measurement.deltaFromSkCbm} unit="m³" />
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400">{fmtDate(measurement.measuredAt)}</p>
          {measurement.notes && (
            <p className="text-xs text-gray-600 italic">{measurement.notes}</p>
          )}
        </div>
      )}

      {/* Not yet recorded */}
      {!recorded && !editing && (
        <p className="mt-2 text-xs text-gray-400">Not yet recorded.</p>
      )}

      {/* Inline record / edit form */}
      {editing && (
        <RecordForm
          checkpoint={checkpoint}
          existing={measurement}
          orderId={orderId}
          isPending={isPending}
          onSubmit={(id, data) => {
            onRecord(id, data);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface MeasurementsTabProps {
  orderId: string;
  measurements: Measurement[];
  isLoading: boolean;
  canRecord: boolean;
  isPending: boolean;
  onRecord: (orderId: string, data: { checkpoint: MeasurementCheckpoint; measuredWeightKg: number; measuredCbm: number; notes?: string }) => void;
}

export function MeasurementsTab({
  orderId,
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

  return (
    <div className="p-5 space-y-3">
      <div>
        <h3 className="text-base font-semibold text-gray-900">Measurement checkpoints</h3>
        <p className="mt-0.5 text-sm text-gray-500">
          Record weights and CBM at each stage. The Korea warehouse reading is the baseline — deltas are calculated from it.
        </p>
      </div>
      {CHECKPOINTS.map((cp) => (
        <CheckpointCard
          key={cp.key}
          checkpoint={cp.key}
          label={cp.label}
          measurement={byCheckpoint[cp.key]}
          isBaseline={cp.key === 'SK_WAREHOUSE'}
          orderId={orderId}
          canRecord={canRecord}
          isPending={isPending}
          onRecord={onRecord}
        />
      ))}
    </div>
  );
}
