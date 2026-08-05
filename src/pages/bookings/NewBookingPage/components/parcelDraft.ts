import type { CustomerDeclaredParcelInput } from '@/types';

export interface ParcelDraft {
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  weightKg: string;
}

export const EMPTY_PARCEL: ParcelDraft = {
  lengthCm: '',
  widthCm: '',
  heightCm: '',
  weightKg: '',
};

export const PARCEL_FIELDS: { key: keyof ParcelDraft; label: string; unit: string }[] = [
  { key: 'lengthCm', label: 'Length', unit: 'cm' },
  { key: 'widthCm', label: 'Width', unit: 'cm' },
  { key: 'heightCm', label: 'Height', unit: 'cm' },
  { key: 'weightKg', label: 'Weight', unit: 'kg' },
];

/** A parcel counts only when at least one measurement is filled in. */
export function hasAnyMeasurement(parcel: ParcelDraft): boolean {
  return PARCEL_FIELDS.some((field) => parcel[field.key].trim() !== '');
}

/**
 * Drops empty rows and converts the rest to the numbers the API expects.
 * Returns undefined when nothing was entered, so the field can be omitted
 * from the request entirely rather than sent as an empty list.
 */
export function toParcelPayload(
  parcels: ParcelDraft[],
): CustomerDeclaredParcelInput[] | undefined {
  const filled = parcels.filter(hasAnyMeasurement).map((parcel) => {
    const entry: Record<string, number> = {};
    for (const field of PARCEL_FIELDS) {
      const raw = parcel[field.key].trim();
      if (!raw) continue;
      const value = Number(raw);
      if (Number.isFinite(value) && value > 0) entry[field.key] = value;
    }
    return entry;
  });

  const usable = filled.filter((entry) => Object.keys(entry).length > 0);
  return usable.length > 0 ? usable : undefined;
}

/** Every filled measurement must be a number above zero. */
export function findInvalidMeasurement(parcels: ParcelDraft[]): string | null {
  for (const [index, parcel] of parcels.entries()) {
    for (const field of PARCEL_FIELDS) {
      const raw = parcel[field.key].trim();
      if (!raw) continue;
      const value = Number(raw);
      if (!Number.isFinite(value) || value <= 0) {
        return `Parcel ${index + 1}: ${field.label.toLowerCase()} must be a number greater than zero.`;
      }
    }
  }
  return null;
}

