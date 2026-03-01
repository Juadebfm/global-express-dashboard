import type { ReactElement } from 'react';
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/utils';

interface CopyButtonProps {
  value: string;
  className?: string;
}

export function CopyButton({ value, className }: CopyButtonProps): ReactElement {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback ignored — clipboard access may be blocked
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        'inline-flex items-center justify-center rounded p-0.5 text-gray-400 transition-colors hover:text-gray-600',
        copied && 'text-green-500 hover:text-green-500',
        className,
      )}
      aria-label={copied ? 'Copied' : 'Copy'}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}
