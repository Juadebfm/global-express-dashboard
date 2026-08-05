import type { SourcingSupplier } from '@/types';
import type { NewBookingFormValues } from './schema';

/**
 * Builds the key/value pair for an optional text field, or nothing at all.
 *
 * Optional strings on the API are typed `z.string().email().optional()` and
 * similar, so a blank one must be *absent* rather than empty — an empty string
 * fails the format check and the whole request comes back 400.
 *
 * Spread the result: `...optionalText('recipientEmail', value)`.
 */
export function optionalText<K extends string>(
  key: K,
  value: string | null | undefined,
): Record<K, string> | Record<string, never> {
  const trimmed = value?.trim();
  return trimmed ? ({ [key]: trimmed } as Record<K, string>) : {};
}

export function buildSourcingSupplier(values: Pick<
  NewBookingFormValues,
  | 'hasSourcingSupplier'
  | 'sourcingSupplierType'
  | 'sourcingSupplierId'
  | 'sourcingSupplierName'
  | 'sourcingSupplierPhone'
  | 'sourcingSupplierEmail'
>): SourcingSupplier | undefined {
  if (!values.hasSourcingSupplier) return undefined;
  if (values.sourcingSupplierType === 'directory') {
    return { supplierId: values.sourcingSupplierId };
  }
  return {
    name: values.sourcingSupplierName,
    phone: values.sourcingSupplierPhone || undefined,
    email: values.sourcingSupplierEmail || undefined,
  };
}
