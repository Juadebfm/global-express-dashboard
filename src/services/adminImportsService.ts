import type { AdminImportResult } from '@/types';
import { apiPostMultipartData } from '@/lib/apiClient';

// Phase 5 — POST /api/v1/admin/imports/users-suppliers.
// Multipart upload (CSV) with a `dryRun` query flag.

export interface ImportUsersSuppliersInput {
  file: File;
  dryRun?: boolean;
}

export function importUsersSuppliers(
  token: string,
  { file, dryRun = false }: ImportUsersSuppliersInput,
): Promise<AdminImportResult> {
  const formData = new FormData();
  formData.set('file', file);
  const qs = dryRun ? '?dryRun=true' : '';
  return apiPostMultipartData<AdminImportResult>(
    `/admin/imports/users-suppliers${qs}`,
    formData,
    token,
  );
}
