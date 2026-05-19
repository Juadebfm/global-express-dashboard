// Phase 5 — Bulk users+suppliers CSV import.
// Mirrors POST /api/v1/admin/imports/users-suppliers.

export type AdminImportRowAction = 'create' | 'update' | 'skip' | 'error';

export interface AdminImportRowResult {
  rowNumber: number;
  role: string;
  email: string;
  action: AdminImportRowAction;
  message?: string;
}

export interface AdminImportSummary {
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
}

export interface AdminImportResult {
  dryRun: boolean;
  summary: AdminImportSummary;
  results: AdminImportRowResult[];
}
