import { useState, type ReactElement } from 'react';
import { AlertTriangle, Check, Copy, Download } from 'lucide-react';
import { Button } from '@/components/ui';

interface RecoveryCodesPanelProps {
  codes: string[];
  warning: string;
  onAcknowledged: () => void;
  acknowledgeLabel?: string;
}

/**
 * Shown after MFA enrollment or recovery-codes regeneration.
 * Codes are returned by the backend ONCE — the user MUST acknowledge they've
 * saved them (download or copy) before they can continue.
 */
export function RecoveryCodesPanel({
  codes,
  warning,
  onAcknowledged,
  acknowledgeLabel = 'Continue',
}: RecoveryCodesPanelProps): ReactElement {
  const [savedAcknowledged, setSavedAcknowledged] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(codes.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard denied — user can still use the download fallback
    }
  };

  const handleDownload = (): void => {
    const blob = new Blob([codes.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `globalexpress-recovery-codes-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <p>{warning}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4 font-mono text-sm">
        {codes.map((code, i) => (
          <div
            key={code}
            className="rounded bg-white px-3 py-2 text-gray-800"
            aria-label={`Recovery code ${i + 1} of ${codes.length}`}
          >
            {code}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          variant="secondary"
          onClick={handleCopy}
          leftIcon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          className="flex-1"
        >
          {copied ? 'Copied' : 'Copy all'}
        </Button>
        <Button
          variant="secondary"
          onClick={handleDownload}
          leftIcon={<Download className="h-4 w-4" />}
          className="flex-1"
        >
          Download .txt
        </Button>
      </div>

      <label className="flex items-start gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={savedAcknowledged}
          onChange={(e) => setSavedAcknowledged(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
        />
        <span>
          I have saved these recovery codes somewhere safe. I understand they
          cannot be retrieved later.
        </span>
      </label>

      <Button
        variant="primary"
        disabled={!savedAcknowledged}
        onClick={onAcknowledged}
        className="w-full"
      >
        {acknowledgeLabel}
      </Button>
    </div>
  );
}
