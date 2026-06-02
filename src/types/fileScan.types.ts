// Per the BE handover (PR E in BACKEND_INTEGRATION.md), every uploaded file
// is AV-scanned via VirusTotal. The FE must check the scan verdict before
// exposing a file in any staff UI.

export type FileScanStatus =
  /** Scan in progress — do not show file; poll until terminal. */
  | 'pending'
  /** VT confirmed safe. Show the file normally. */
  | 'clean'
  /** Flagged + auto-removed from R2. Show a red warning, never the file. */
  | 'malicious'
  /** Scan failed (VT down, hash unknown errored out). Treat as untrusted. */
  | 'error'
  /** VT didn't recognise the hash (common on legit but unique files).
   *  Render the file with an amber caveat pill. */
  | 'skipped';

export interface FileScanStatusResult {
  r2Key: string;
  status: FileScanStatus;
  /** ISO 8601 — null while status === 'pending'. */
  scannedAt: string | null;
}

/** Terminal statuses don't need to be re-polled. */
export const TERMINAL_FILE_SCAN_STATUSES: readonly FileScanStatus[] = [
  'clean',
  'malicious',
  'error',
  'skipped',
];

/** Statuses where the FE may render the file (with optional caveat). */
export const SAFE_FILE_SCAN_STATUSES: readonly FileScanStatus[] = ['clean', 'skipped'];
