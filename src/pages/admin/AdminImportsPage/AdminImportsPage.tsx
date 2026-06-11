import { useMemo, useRef, useState, type DragEvent, type ReactElement } from 'react';
import { AlertTriangle, CheckCircle2, FileUp, XCircle } from 'lucide-react';
import { AppShell } from '@/pages/shared';
import { Button } from '@/components/ui';
import { useDashboardData, useImportUsersSuppliers, validateImportFile } from '@/hooks';
import type { AdminImportResult } from '@/types';

const ACCEPTED_EXTENSIONS = '.csv';

export default function AdminImportsPage(): ReactElement {
  const { data, isLoading, error } = useDashboardData();
  const importMutation = useImportUsersSuppliers();

  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [preview, setPreview] = useState<AdminImportResult | null>(null);
  const [committed, setCommitted] = useState<AdminImportResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (next: File | null): void => {
    setFile(next);
    setFileError(null);
    setPreview(null);
    setCommitted(null);
    if (next) {
      const validation = validateImportFile(next);
      if (validation) {
        setFileError(validation.message);
        setFile(null);
      }
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragging(false);
    const dropped = event.dataTransfer.files[0] ?? null;
    handleFile(dropped);
  };

  const runDryRun = async (): Promise<void> => {
    if (!file) return;
    try {
      const result = await importMutation.mutate({ file, dryRun: true });
      setPreview(result);
      setCommitted(null);
    } catch {
      /* feedback in hook */
    }
  };

  const runImport = async (): Promise<void> => {
    if (!file) return;
    try {
      const result = await importMutation.mutate({ file, dryRun: false });
      setCommitted(result);
      setPreview(null);
    } catch {
      /* feedback in hook */
    }
  };

  const reset = (): void => {
    setFile(null);
    setFileError(null);
    setPreview(null);
    setCommitted(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const displayResult = committed ?? preview;

  return (
    <AppShell
      data={data}
      isLoading={isLoading}
      error={error}
      loadingLabel="Loading admin imports..."
    >
      <div className="space-y-6">
        <div className="rounded-3xl border border-gray-200 bg-white p-6">
          <h1 className="text-2xl font-semibold text-gray-900">Bulk import</h1>
          <p className="mt-1 text-sm text-gray-500">
            Upload a users + suppliers CSV. Always preview with a dry run before committing.
          </p>
        </div>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">Source file</h2>
          <p className="mt-1 text-xs text-gray-500">CSV only · max 5 MB.</p>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`mt-4 rounded-2xl border-2 border-dashed p-8 text-center transition ${
              dragging ? 'border-brand-500 bg-brand-50' : 'border-gray-200 bg-gray-50'
            }`}
          >
            <FileUp className="mx-auto h-10 w-10 text-gray-400" />
            <p className="mt-3 text-sm text-gray-700">
              Drag a CSV file here, or{' '}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="font-semibold text-brand-700 hover:underline"
              >
                browse
              </button>
              .
            </p>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            {file && (
              <p className="mt-3 text-xs text-gray-500">
                Selected: <span className="font-mono">{file.name}</span> (
                {(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
            {fileError && (
              <p className="mt-2 text-xs font-semibold text-rose-700">{fileError}</p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void runDryRun()}
              isLoading={importMutation.isPending && !committed}
              disabled={!file || importMutation.isPending}
            >
              Run dry run
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => void runImport()}
              isLoading={importMutation.isPending && !!preview}
              disabled={!file || !preview || importMutation.isPending}
              title={!preview ? 'Run a dry run first' : undefined}
            >
              Confirm import
            </Button>
            {(file || preview || committed) && (
              <button
                type="button"
                onClick={reset}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                Start over
              </button>
            )}
          </div>
        </section>

        {displayResult && (
          <ImportResultPanel result={displayResult} isCommitted={!!committed} />
        )}
      </div>
    </AppShell>
  );
}

interface ImportResultPanelProps {
  result: AdminImportResult;
  isCommitted: boolean;
}

function ImportResultPanel({ result, isCommitted }: ImportResultPanelProps): ReactElement {
  const errorRows = useMemo(
    () => result.results.filter((r) => r.action === 'error'),
    [result.results],
  );

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-900">
          {isCommitted ? 'Import complete' : 'Dry run preview'}
        </h2>
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
            isCommitted ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          }`}
        >
          {isCommitted ? 'Committed' : 'Preview only'}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
        <Stat label="Total rows" value={result.summary.totalRows} />
        <Stat label="Created" value={result.summary.created} tone="success" />
        <Stat label="Updated" value={result.summary.updated} tone="info" />
        <Stat label="Skipped" value={result.summary.skipped} tone="muted" />
        <Stat label="Errors" value={result.summary.errors} tone="error" />
      </div>

      {errorRows.length > 0 && (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold text-rose-700">
            <AlertTriangle className="h-4 w-4" /> {errorRows.length} row(s) had errors
          </p>
          <ul className="mt-2 space-y-1 text-xs text-rose-700">
            {errorRows.slice(0, 10).map((row) => (
              <li key={row.rowNumber}>
                Row {row.rowNumber} ({row.email || '—'}): {row.message || 'Unknown error'}
              </li>
            ))}
            {errorRows.length > 10 && (
              <li className="italic">…and {errorRows.length - 10} more.</li>
            )}
          </ul>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200">
        <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2">Row</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Message</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {result.results.slice(0, 100).map((row) => (
              <tr key={row.rowNumber}>
                <td className="px-3 py-2 font-mono text-gray-600">{row.rowNumber}</td>
                <td className="px-3 py-2 text-gray-800">{row.email || '—'}</td>
                <td className="px-3 py-2 text-gray-500">{row.role || '—'}</td>
                <td className="px-3 py-2">
                  <ActionBadge action={row.action} />
                </td>
                <td className="px-3 py-2 text-gray-500">{row.message || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {result.results.length > 100 && (
          <p className="bg-gray-50 px-3 py-2 text-[11px] text-gray-500">
            Showing first 100 of {result.results.length} rows.
          </p>
        )}
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'success' | 'info' | 'muted' | 'error';
}): ReactElement {
  const toneClass: Record<typeof tone, string> = {
    default: 'bg-gray-50 text-gray-700',
    success: 'bg-emerald-50 text-emerald-700',
    info: 'bg-blue-50 text-blue-700',
    muted: 'bg-gray-50 text-gray-500',
    error: 'bg-rose-50 text-rose-700',
  };
  return (
    <div className={`rounded-xl px-3 py-3 ${toneClass[tone]}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function ActionBadge({ action }: { action: AdminImportResult['results'][number]['action'] }): ReactElement {
  if (action === 'create') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
        <CheckCircle2 className="h-3 w-3" /> Create
      </span>
    );
  }
  if (action === 'update') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
        Update
      </span>
    );
  }
  if (action === 'skip') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
        Skip
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
      <XCircle className="h-3 w-3" /> Error
    </span>
  );
}
