import type { ReactElement } from 'react';
import { useState } from 'react';
import { Loader2, Pencil, Plus, Ruler, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui';
import {
  useAddCustomerDeclaredParcels,
  useDeleteCustomerDeclaredParcel,
  useUpdateCustomerDeclaredParcel,
} from '@/hooks';
import { getDisplayErrorMessage } from '@/lib/feedback';
import { ApiError } from '@/lib/apiClient';
import type { CustomerDeclaredParcel, CustomerDeclaredParcelPatch } from '@/types';

const FIELDS: { key: keyof CustomerDeclaredParcelPatch; label: string; unit: string }[] = [
  { key: 'lengthCm', label: 'Length', unit: 'cm' },
  { key: 'widthCm', label: 'Width', unit: 'cm' },
  { key: 'heightCm', label: 'Height', unit: 'cm' },
  { key: 'weightKg', label: 'Weight', unit: 'kg' },
];

type Draft = Record<string, string>;

function draftFrom(parcel: CustomerDeclaredParcel): Draft {
  return {
    lengthCm: parcel.lengthCm ?? '',
    widthCm: parcel.widthCm ?? '',
    heightCm: parcel.heightCm ?? '',
    weightKg: parcel.weightKg ?? '',
  };
}

/**
 * Builds the patch. A cleared field is sent as null so the API removes it; an
 * unchanged field is omitted so it is left alone.
 */
function buildPatch(
  parcel: CustomerDeclaredParcel,
  draft: Draft,
): CustomerDeclaredParcelPatch | { error: string } {
  const patch: CustomerDeclaredParcelPatch = {};

  for (const field of FIELDS) {
    const before = (parcel[field.key as keyof CustomerDeclaredParcel] as string | null) ?? '';
    const after = (draft[field.key] ?? '').trim();
    if (after === before) continue;

    if (!after) {
      patch[field.key] = null;
      continue;
    }
    const value = Number(after);
    if (!Number.isFinite(value) || value <= 0) {
      return { error: `${field.label} must be a number greater than zero.` };
    }
    patch[field.key] = value;
  }

  if (Object.keys(patch).length === 0) return { error: 'Change a measurement before saving.' };
  // The API rejects a patch that would leave the parcel with nothing.
  const remaining = FIELDS.filter((field) => {
    const next = field.key in patch ? patch[field.key] : (draft[field.key] ?? '').trim() || null;
    return next !== null && next !== '';
  });
  if (remaining.length === 0) {
    return { error: 'A parcel must keep at least one measurement.' };
  }
  return patch;
}

interface CustomerParcelsPanelProps {
  orderId: string;
  parcels: CustomerDeclaredParcel[];
  /**
   * Comes straight from the order's `customerDeclaredParcelsEditable`. Never
   * derive it: a customer sees a coarser status taxonomy in which the
   * pre-order and awaiting-receipt stages are the same value, so any local
   * check is wrong in one direction or the other. Always false for staff.
   */
  canEdit: boolean;
}

export function CustomerParcelsPanel({
  orderId,
  parcels,
  canEdit,
}: CustomerParcelsPanelProps): ReactElement | null {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newParcel, setNewParcel] = useState<Draft>({});

  const addParcels = useAddCustomerDeclaredParcels();
  const updateParcel = useUpdateCustomerDeclaredParcel();
  const removeParcel = useDeleteCustomerDeclaredParcel();

  if (parcels.length === 0 && !canEdit) return null;

  /** A closed window is a normal outcome, not a crash. */
  const describeError = (err: unknown): string => {
    if (err instanceof ApiError && err.status === 409) {
      return getDisplayErrorMessage(
        err,
        'These details can no longer be changed because our team has started work.',
      );
    }
    return getDisplayErrorMessage(err, 'Could not save. Please try again.');
  };

  const handleSaveEdit = async (parcel: CustomerDeclaredParcel): Promise<void> => {
    const result = buildPatch(parcel, draft);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    try {
      await updateParcel.mutateAsync({ orderId, parcelId: parcel.id, patch: result });
      setEditingId(null);
      setError(null);
    } catch (err) {
      setError(describeError(err));
    }
  };

  const handleAdd = async (): Promise<void> => {
    const entry: Record<string, number> = {};
    for (const field of FIELDS) {
      const raw = (newParcel[field.key] ?? '').trim();
      if (!raw) continue;
      const value = Number(raw);
      if (!Number.isFinite(value) || value <= 0) {
        setError(`${field.label} must be a number greater than zero.`);
        return;
      }
      entry[field.key] = value;
    }
    if (Object.keys(entry).length === 0) {
      setError('Enter at least one measurement.');
      return;
    }
    try {
      await addParcels.mutateAsync({ orderId, parcels: [entry] });
      setIsAdding(false);
      setNewParcel({});
      setError(null);
    } catch (err) {
      setError(describeError(err));
    }
  };

  const renderFields = (values: Draft, onChange: (key: string, value: string) => void) => (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {FIELDS.map((field) => (
        <div key={field.key}>
          <label className="block text-[11px] font-medium uppercase tracking-wide text-gray-400">
            {field.label} ({field.unit})
          </label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={values[field.key] ?? ''}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder="—"
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      ))}
    </div>
  );

  const handleRemove = async (parcelId: string): Promise<void> => {
    try {
      await removeParcel.mutateAsync({ orderId, parcelId });
      setError(null);
    } catch (err) {
      setError(describeError(err));
    }
  };

  const isBusy = addParcels.isPending || updateParcel.isPending || removeParcel.isPending;

  return (
    <section className="space-y-3">
      <div className="flex items-start gap-2">
        <Ruler className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
        <div>
          <h3 className="text-sm font-semibold text-gray-800">
            {canEdit ? 'Parcel sizes you gave us' : 'Declared parcel sizes'}
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">
            {canEdit
              ? 'We weigh and measure everything on arrival — those numbers set the final price.'
              : 'Advance details recorded at booking. Each line names who supplied it. Warehouse measurements remain the source of price.'}
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {parcels.map((parcel) => (
          <li key={parcel.id} className="rounded-xl border border-gray-200 p-3">
            {editingId === parcel.id ? (
              <div className="space-y-3">
                {renderFields(draft, (key, value) =>
                  setDraft((prev) => ({ ...prev, [key]: value })),
                )}
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => void handleSaveEdit(parcel)} disabled={isBusy}>
                    {isBusy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                    Save
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditingId(null);
                      setError(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                {/* A finished sentence from the backend — printed as-is. */}
                <p className="text-sm text-gray-700">{parcel.staffDescription}</p>
                {canEdit && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(parcel.id);
                        setDraft(draftFrom(parcel));
                        setError(null);
                      }}
                      className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                      aria-label="Edit parcel measurements"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {/* Removing the last parcel is allowed — declaring any is
                        optional, so an empty list is a state already handled. */}
                    <button
                      type="button"
                      onClick={() => void handleRemove(parcel.id)}
                      disabled={isBusy}
                      className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      aria-label="Remove parcel"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {canEdit && isAdding && (
        <div className="space-y-3 rounded-xl border border-gray-200 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500">New parcel</p>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setNewParcel({});
                setError(null);
              }}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Cancel adding a parcel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {renderFields(newParcel, (key, value) =>
            setNewParcel((prev) => ({ ...prev, [key]: value })),
          )}
          <Button size="sm" onClick={() => void handleAdd()} disabled={isBusy}>
            {isBusy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Add parcel
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {canEdit && !isAdding && (
        <Button variant="secondary" size="sm" onClick={() => setIsAdding(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add parcel sizes
        </Button>
      )}
    </section>
  );
}
