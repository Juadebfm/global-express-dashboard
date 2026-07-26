import type { SourcingSupplier } from '@/types';
import type { NewBookingFormValues } from './schema';

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
