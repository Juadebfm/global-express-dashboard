import type { ReactElement } from 'react';
import { useState } from 'react';
import { Loader2, Pencil, Plane, Ship } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { formatDate } from '@/utils';
import type { Batch, DispatchBatchCarrierInfoPayload } from '@/types';

/** `datetime-local` gives "2026-08-04T14:20"; the backend wants full ISO. */
function toIso(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** ISO from the backend back into the shape a `datetime-local` input accepts. */
function toLocalInput(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function displayDate(value: string | null): string {
  if (!value) return '—';
  return formatDate(value, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface FieldSpec {
  key: keyof DispatchBatchCarrierInfoPayload;
  label: string;
  type: 'text' | 'datetime' | 'number';
}

function fieldsForMode(isSea: boolean): FieldSpec[] {
  const identity: FieldSpec[] = isSea
    ? [
        { key: 'carrierName', label: 'Shipping line', type: 'text' },
        { key: 'vesselName', label: 'Vessel name', type: 'text' },
        { key: 'voyageOrFlightNumber', label: 'Voyage number', type: 'text' },
        { key: 'oceanTrackingNumber', label: 'Ocean tracking number', type: 'text' },
        { key: 'billOfLadingNumber', label: 'Bill of lading', type: 'text' },
      ]
    : [
        { key: 'carrierName', label: 'Airline', type: 'text' },
        { key: 'voyageOrFlightNumber', label: 'Flight number', type: 'text' },
        { key: 'airlineTrackingNumber', label: 'MAWB number', type: 'text' },
        { key: 'd2dTrackingNumber', label: 'Door-to-door tracking number', type: 'text' },
      ];

  return [
    ...identity,
    { key: 'estimatedDepartureAt', label: 'Departure (estimated)', type: 'datetime' },
    { key: 'estimatedArrivalAt', label: 'Arrival (estimated)', type: 'datetime' },
    { key: 'actualDepartureAt', label: 'Departure (actual)', type: 'datetime' },
    { key: 'actualArrivalAt', label: 'Arrival (actual)', type: 'datetime' },
    { key: 'actualGrossWeightKg', label: 'Actual gross weight (kg)', type: 'number' },
    { key: 'notes', label: 'Notes', type: 'text' },
  ];
}

/**
 * `GET /batches/:batchId` does not return the actual departure/arrival or the
 * actual gross weight, so those three cannot be shown once saved. They stay
 * editable because the backend accepts them.
 */
const WRITE_ONLY_FIELDS = new Set<keyof DispatchBatchCarrierInfoPayload>([
  'actualDepartureAt',
  'actualArrivalAt',
  'actualGrossWeightKg',
]);

function readValue(batch: Batch, key: keyof DispatchBatchCarrierInfoPayload): string | null {
  if (WRITE_ONLY_FIELDS.has(key)) return null;
  const value = (batch as unknown as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : null;
}

interface BatchCarrierPanelProps {
  batch: Batch;
  canManage: boolean;
  isSaving: boolean;
  onSave: (payload: DispatchBatchCarrierInfoPayload) => Promise<void>;
}

export function BatchCarrierPanel({
  batch,
  canManage,
  isSaving,
  onSave,
}: BatchCarrierPanelProps): ReactElement {
  const isSea = batch.transportMode === 'sea';
  const fields = fieldsForMode(isSea);

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const startEditing = (): void => {
    const initial: Record<string, string> = {};
    for (const field of fields) {
      const stored = readValue(batch, field.key);
      initial[field.key] =
        field.type === 'datetime' ? toLocalInput(stored) : (stored ?? '');
    }
    setDraft(initial);
    setError(null);
    setIsEditing(true);
  };

  const handleSave = async (): Promise<void> => {
    const payload: DispatchBatchCarrierInfoPayload = {};

    for (const field of fields) {
      const raw = (draft[field.key] ?? '').trim();
      if (!raw) continue;

      if (field.type === 'datetime') {
        const iso = toIso(raw);
        if (!iso) {
          setError(`${field.label} is not a valid date and time.`);
          return;
        }
        (payload as Record<string, unknown>)[field.key] = iso;
      } else if (field.type === 'number') {
        const parsed = Number(raw);
        if (!Number.isFinite(parsed) || parsed <= 0) {
          setError(`${field.label} must be a number greater than zero.`);
          return;
        }
        (payload as Record<string, unknown>)[field.key] = parsed;
      } else {
        (payload as Record<string, unknown>)[field.key] = raw;
      }
    }

    if (Object.keys(payload).length === 0) {
      setError('Fill in at least one field before saving.');
      return;
    }

    setError(null);
    try {
      await onSave(payload);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save. Please try again.');
    }
  };

  return (
    <Card className="p-0">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          {isSea ? (
            <Ship className="h-4 w-4 text-gray-400" />
          ) : (
            <Plane className="h-4 w-4 text-gray-400" />
          )}
          <h2 className="font-semibold text-gray-900">Carrier &amp; routing</h2>
        </div>
        {canManage && !isEditing && (
          <Button variant="secondary" size="sm" onClick={startEditing}>
            <Pencil className="mr-1.5 h-4 w-4" />
            Edit
          </Button>
        )}
      </div>

      <div className="border-t border-gray-100 px-5 py-4">
        {isEditing ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((field) => (
                <div key={field.key}>
                  <label
                    htmlFor={`carrier-${field.key}`}
                    className="block text-xs font-medium uppercase tracking-wide text-gray-400"
                  >
                    {field.label}
                  </label>
                  <input
                    id={`carrier-${field.key}`}
                    type={
                      field.type === 'datetime'
                        ? 'datetime-local'
                        : field.type === 'number'
                          ? 'number'
                          : 'text'
                    }
                    step={field.type === 'number' ? '0.001' : undefined}
                    min={field.type === 'number' ? '0' : undefined}
                    value={draft[field.key] ?? ''}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </div>
              ))}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2">
              <Button size="sm" onClick={() => void handleSave()} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save details
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsEditing(false);
                  setError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {fields
              .filter((field) => !WRITE_ONLY_FIELDS.has(field.key))
              .map((field) => {
                const stored = readValue(batch, field.key);
                return (
                  <div key={field.key}>
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      {field.label}
                    </dt>
                    <dd className="mt-0.5 text-sm text-gray-800">
                      {field.type === 'datetime'
                        ? displayDate(stored)
                        : (stored ?? '—')}
                    </dd>
                  </div>
                );
              })}
          </dl>
        )}
      </div>
    </Card>
  );
}
