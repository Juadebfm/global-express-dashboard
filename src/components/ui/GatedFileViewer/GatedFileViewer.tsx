import type { ReactElement, ReactNode } from 'react';
import { AlertTriangle, Loader2, ShieldOff } from 'lucide-react';
import { useFileScanStatus } from '@/hooks';
import { SAFE_FILE_SCAN_STATUSES } from '@/types';
import { cn } from '@/utils';
import { FileScanPill } from '../FileScanPill';

interface GatedFileViewerProps {
  /**
   * R2 storage key for the file. When null/undefined the viewer renders the
   * `unavailable` placeholder — useful when the parent hasn't resolved a
   * key yet but wants to reserve the layout slot.
   */
  r2Key: string | null | undefined;
  /**
   * Renders the actual file UI (img / iframe / download link) only when the
   * scan verdict is `clean` or `skipped`. Receives no args because the
   * parent already knows what it wants to render — the wrapper just
   * controls visibility.
   */
  children: ReactNode;
  /**
   * Override the default placeholder for a `pending` scan. Defaults to a
   * skeleton box that says "Scanning…".
   */
  pendingFallback?: ReactNode;
  /** Skip the gate entirely (e.g. in tests). Defaults to false. */
  bypass?: boolean;
  className?: string;
}

/**
 * Wraps every staff-side file viewer (payment receipts, claim proofs,
 * invoice attachments, package images). Calls `useFileScanStatus(r2Key)`
 * and only renders `children` when the BE verdict says it's safe.
 *
 * Render contract by status:
 *  - `pending` → spinner + auto-refresh, never the file
 *  - `clean`   → render `children`, no decoration
 *  - `skipped` → render `children` + small amber caveat pill
 *  - `malicious` → red warning, never the file (file is also gone from R2)
 *  - `error`   → red "scan failed" placeholder, never the file
 */
export function GatedFileViewer({
  r2Key,
  children,
  pendingFallback,
  bypass = false,
  className,
}: GatedFileViewerProps): ReactElement {
  const query = useFileScanStatus(r2Key, { enabled: !bypass });

  if (bypass) return <>{children}</>;

  if (!r2Key) {
    return (
      <FilePlaceholder
        tone="muted"
        icon={<AlertTriangle className="h-5 w-5" />}
        title="File unavailable"
        body="No storage key set for this file."
        className={className}
      />
    );
  }

  if (query.isLoading || (!query.data && !query.error)) {
    return (
      <>
        {pendingFallback ?? (
          <FilePlaceholder
            tone="muted"
            icon={<Loader2 className="h-5 w-5 animate-spin" />}
            title="Checking scan status"
            body="Verifying with the file-scan service…"
            className={className}
          />
        )}
      </>
    );
  }

  if (query.error) {
    return (
      <FilePlaceholder
        tone="danger"
        icon={<AlertTriangle className="h-5 w-5" />}
        title="Couldn't verify scan"
        body={query.error.message || 'The scan service did not respond.'}
        className={className}
      />
    );
  }

  const status = query.data!.status;

  if (status === 'pending') {
    return (
      <>
        {pendingFallback ?? (
          <FilePlaceholder
            tone="warning"
            icon={<Loader2 className="h-5 w-5 animate-spin" />}
            title="Scan in progress"
            body="This file is being scanned. We'll refresh once the verdict lands."
            className={className}
          />
        )}
      </>
    );
  }

  if (status === 'malicious') {
    return (
      <FilePlaceholder
        tone="danger"
        icon={<ShieldOff className="h-5 w-5" />}
        title="File flagged"
        body="VirusTotal flagged this file. It has been removed from storage and cannot be viewed."
        className={className}
      />
    );
  }

  if (status === 'error') {
    return (
      <FilePlaceholder
        tone="danger"
        icon={<AlertTriangle className="h-5 w-5" />}
        title="Scan failed"
        body="The scan service couldn't process this file. Treat as untrusted; admin can retry from the backend."
        className={className}
      />
    );
  }

  // `clean` or `skipped` — render the file. `skipped` gets a small caveat
  // pill above the content so staff knows it wasn't VT-verified.
  return (
    <div className={cn('space-y-2', className)}>
      {!SAFE_FILE_SCAN_STATUSES.includes(status) ? null : status === 'skipped' ? (
        <FileScanPill status="skipped" />
      ) : null}
      {children}
    </div>
  );
}

interface PlaceholderProps {
  tone: 'muted' | 'warning' | 'danger';
  icon: ReactElement;
  title: string;
  body: string;
  className?: string;
}

const TONE_STYLES: Record<PlaceholderProps['tone'], string> = {
  muted: 'border-gray-200 bg-gray-50 text-gray-600',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  danger: 'border-red-200 bg-red-50 text-red-700',
};

function FilePlaceholder({
  tone,
  icon,
  title,
  body,
  className,
}: PlaceholderProps): ReactElement {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm',
        TONE_STYLES[tone],
        className,
      )}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5">{body}</p>
      </div>
    </div>
  );
}
