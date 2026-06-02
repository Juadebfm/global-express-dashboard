import { apiGetData } from '@/lib/apiClient';
import type { FileScanStatusResult } from '@/types';

/**
 * GET /api/v1/internal/file-scans/status?r2Key=<key>
 *
 * Staff-only endpoint returning the VirusTotal scan verdict for an
 * uploaded file. See `<GatedFileViewer>` / `useFileScanStatus` for the
 * UI integration — the FE must check this before exposing any
 * user-uploaded file (payment receipts, gallery claim proofs, invoice
 * attachments, package images).
 */
export function getFileScanStatus(
  token: string,
  r2Key: string,
): Promise<FileScanStatusResult> {
  const path = `/internal/file-scans/status?r2Key=${encodeURIComponent(r2Key)}`;
  return apiGetData<FileScanStatusResult>(path, token);
}
