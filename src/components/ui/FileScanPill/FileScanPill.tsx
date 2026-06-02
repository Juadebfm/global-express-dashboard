import type { ReactElement } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, ShieldOff } from 'lucide-react';
import type { FileScanStatus } from '@/types';
import { cn } from '@/utils';

interface FileScanPillProps {
  status: FileScanStatus;
  /** When true, the pill is muted (e.g. inside a list where one is enough). */
  compact?: boolean;
  className?: string;
}

interface PillStyle {
  label: string;
  hover: string;
  wrapper: string;
  icon: ReactElement;
}

const STYLES: Record<FileScanStatus, PillStyle> = {
  pending: {
    label: 'Scanning',
    hover: 'Scan in progress — file is not visible yet. Auto-refreshes every 10s.',
    wrapper: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  clean: {
    label: 'Scanned safe',
    hover: 'VirusTotal confirmed this file is clean.',
    wrapper: 'bg-green-50 text-green-800 border-green-200',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  malicious: {
    label: 'Flagged',
    hover: 'VirusTotal flagged this file. It has been removed from storage.',
    wrapper: 'bg-red-50 text-red-700 border-red-200',
    icon: <ShieldOff className="h-3 w-3" />,
  },
  error: {
    label: 'Scan failed',
    hover: 'The scan service returned an error — treat as untrusted until retried.',
    wrapper: 'bg-red-50 text-red-700 border-red-200',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  skipped: {
    label: 'Not scanned',
    hover:
      'VirusTotal did not recognise the hash — common for legit but unique files. Open with caution.',
    wrapper: 'bg-gray-50 text-gray-600 border-gray-200',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
};

/**
 * Small inline status pill next to filenames in staff lists. Renders a coloured
 * chip with an icon + short label and a hover tooltip that explains the
 * verdict. Pair with `<GatedFileViewer>` for the actual file-rendering gate.
 */
export function FileScanPill({
  status,
  compact = false,
  className,
}: FileScanPillProps): ReactElement {
  const style = STYLES[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border text-xs font-medium',
        compact ? 'px-1.5 py-0.5' : 'px-2 py-0.5',
        style.wrapper,
        className,
      )}
      title={style.hover}
      aria-label={`File scan status: ${style.label}`}
    >
      {style.icon}
      {!compact && <span>{style.label}</span>}
    </span>
  );
}
