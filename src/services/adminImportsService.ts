import type { AdminImportResult } from '@/types';
import { apiPostMultipart } from '@/lib/apiClient';

// Phase 5 — POST /api/v1/admin/imports/users-suppliers.
// Multipart upload (CSV) with a `dryRun` query flag.

interface Envelope<T> {
  success: boolean;
  data: T;
}

export interface ImportUsersSuppliersInput {
  file: File;
  dryRun?: boolean;
}

export async function importUsersSuppliers(
  token: string,
  { file, dryRun = false }: ImportUsersSuppliersInput,
): Promise<AdminImportResult> {
  const formData = new FormData();
  formData.set('file', file);
  const qs = dryRun ? '?dryRun=true' : '';
  const response = await apiPostMultipart<Envelope<AdminImportResult>>(
    `/admin/imports/users-suppliers${qs}`,
    formData,
    token,
  );
  return response.data;
}
