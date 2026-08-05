import type { ReactElement } from 'react';
import { Plus, Ruler, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { EMPTY_PARCEL, PARCEL_FIELDS, type ParcelDraft } from './parcelDraft';

interface ParcelMeasurementsProps {
  parcels: ParcelDraft[];
  onChange: (parcels: ParcelDraft[]) => void;
  error?: string | null;
}

/**
 * Optional advance measurements. Our warehouse still weighs and measures
 * everything on arrival and only those numbers set the price — these help
 * staff plan, so the copy says so rather than implying a binding quote.
 */
export function ParcelMeasurements({
  parcels,
  onChange,
  error,
}: ParcelMeasurementsProps): ReactElement {
  const update = (index: number, key: keyof ParcelDraft, value: string): void => {
    onChange(parcels.map((parcel, i) => (i === index ? { ...parcel, [key]: value } : parcel)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <Ruler className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
        <div>
          <p className="text-sm font-medium text-gray-700">Parcel sizes (optional)</p>
          <p className="mt-0.5 text-xs text-gray-500">
            Tell us roughly what is coming so our team can plan. We weigh and measure
            everything when it reaches our Korea warehouse, and those numbers set the
            final price.
          </p>
        </div>
      </div>

      {parcels.map((parcel, index) => (
        <div key={index} className="rounded-xl border border-gray-200 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500">Parcel {index + 1}</p>
            {parcels.length > 1 && (
              <button
                type="button"
                onClick={() => onChange(parcels.filter((_, i) => i !== index))}
                className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label={`Remove parcel ${index + 1}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PARCEL_FIELDS.map((field) => (
              <div key={field.key}>
                <label
                  htmlFor={`parcel-${index}-${field.key}`}
                  className="block text-[11px] font-medium uppercase tracking-wide text-gray-400"
                >
                  {field.label} ({field.unit})
                </label>
                <input
                  id={`parcel-${index}-${field.key}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={parcel[field.key]}
                  onChange={(e) => update(index, field.key, e.target.value)}
                  placeholder="—"
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-900 placeholder:text-gray-300 hover:border-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => onChange([...parcels, { ...EMPTY_PARCEL }])}
      >
        <Plus className="mr-1.5 h-4 w-4" />
        Add another parcel
      </Button>
    </div>
  );
}
