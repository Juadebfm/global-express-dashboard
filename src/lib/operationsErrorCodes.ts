import { ApiError } from '@/lib/apiClient';

/**
 * Stable machine codes the backend attaches to operations failures. Their
 * values never change once shipped, so switching on them is safe in a way that
 * matching the English sentence is not — `detail` is written for humans and
 * can be reworded or translated at any time.
 */
export const OPERATIONS_ERROR_CODES = [
  'TRANSPORT_MODE_REQUIRED',
  'NO_PARCELS_SUBMITTED',
  'PARCEL_MEASUREMENTS_INCOMPLETE',
  'ARRIVAL_DATE_BEFORE_ORDER',
  'ARRIVAL_DATE_IN_FUTURE',
  'PARCEL_QUANTITY_INVALID',
  'GOODS_PHOTO_REQUIRED',
  'PACKAGING_TYPE_UNKNOWN',
  'OVERRIDE_REASON_REQUIRED',
  'BILLING_SUPPLIER_REQUIRED',
  'FINAL_CHARGE_INVALID',
  'ORDER_ALREADY_IN_BATCH',
  'ORDER_NOT_VERIFIED_FOR_BATCH',
] as const;

export type OperationsErrorCode = (typeof OPERATIONS_ERROR_CODES)[number];

const CODE_SET = new Set<string>(OPERATIONS_ERROR_CODES);

/** Reads the machine code off a failure, or null if it carries none. */
export function getOperationsErrorCode(error: unknown): OperationsErrorCode | null {
  if (!(error instanceof ApiError)) return null;
  const code = error.problem?.code;
  return typeof code === 'string' && CODE_SET.has(code)
    ? (code as OperationsErrorCode)
    : null;
}

export function isOperationsErrorCode(
  error: unknown,
  code: OperationsErrorCode,
): boolean {
  return getOperationsErrorCode(error) === code;
}

/**
 * Parcel numbers the backend attached to a measurement failure. Numbered from
 * 1, matching how staff see the list.
 */
export function getAffectedParcels(error: unknown): number[] {
  if (!(error instanceof ApiError)) return [];
  const parcels = error.problem?.parcels;
  if (!Array.isArray(parcels)) return [];
  return parcels.filter((n): n is number => typeof n === 'number');
}

function listParcels(numbers: number[]): string {
  if (numbers.length === 1) return `parcel ${numbers[0]}`;
  const last = numbers[numbers.length - 1];
  return `parcels ${numbers.slice(0, -1).join(', ')} and ${last}`;
}

/**
 * Our own wording for a known code, so the copy can be translated and reworded
 * without the backend's sentence leaking through.
 *
 * Returns null for an unrecognised code — the caller falls back to the
 * backend's `detail`, which is the documented fallback.
 */
export function describeOperationsError(error: unknown): string | null {
  const code = getOperationsErrorCode(error);
  if (!code) return null;

  const parcels = getAffectedParcels(error);

  switch (code) {
    case 'TRANSPORT_MODE_REQUIRED':
      return 'Choose whether this goes by air or by sea before saving.';
    case 'NO_PARCELS_SUBMITTED':
      return 'Add at least one parcel before saving.';
    case 'PARCEL_MEASUREMENTS_INCOMPLETE':
      return parcels.length > 0
        ? `Enter the weight and all three sizes for ${listParcels(parcels)}.`
        : 'Enter the weight and all three sizes for every parcel.';
    case 'ARRIVAL_DATE_BEFORE_ORDER':
      return 'The arrival date cannot be before the order was placed.';
    case 'ARRIVAL_DATE_IN_FUTURE':
      return 'The arrival date cannot be in the future.';
    case 'PARCEL_QUANTITY_INVALID':
      return parcels.length > 0
        ? `Enter a whole number of items, at least one, for ${listParcels(parcels)}.`
        : 'Enter a whole number of items, at least one, for every parcel.';
    case 'GOODS_PHOTO_REQUIRED':
      return 'Add a photo of the goods before saving.';
    case 'PACKAGING_TYPE_UNKNOWN':
      return 'That packaging type is not one we recognise. Pick one from the list.';
    case 'OVERRIDE_REASON_REQUIRED':
      return 'Write a short reason for overriding the calculated price.';
    case 'BILLING_SUPPLIER_REQUIRED':
      return 'Choose which supplier is being billed for this shipment.';
    case 'FINAL_CHARGE_INVALID':
      return 'The final charge must be a number greater than zero.';
    case 'ORDER_ALREADY_IN_BATCH':
      return 'This order is already in a batch.';
    case 'ORDER_NOT_VERIFIED_FOR_BATCH':
      return 'This order has to be verified and priced before it can join a batch.';
  }
}
