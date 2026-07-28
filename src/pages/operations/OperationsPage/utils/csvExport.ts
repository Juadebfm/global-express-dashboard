/**
 * Small, dependency-free CSV export helpers — promoted out of ShipmentsPage
 * (where this logic originated, customer-facing Copy/Download buttons) so
 * the Operations browse pane can reuse the exact same behavior for staff.
 * Scope is deliberately "currently visible rows," not a full server-side
 * export — matches the semantics this already had on Shipments.
 */

export function escapeCsv(value: string | number): string {
  const text = String(value);
  if (/["\n,]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function exportDate(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export function buildCsv<T>(
  rows: T[],
  headers: string[],
  rowValues: (row: T) => (string | number)[],
): string {
  const lines = rows.map((row) => rowValues(row).map(escapeCsv).join(','));
  return [headers.join(','), ...lines].join('\n');
}

export async function copyCsvToClipboard(csv: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(csv);
    return true;
  } catch {
    return false;
  }
}

export function downloadCsv(csv: string, filenamePrefix: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}
