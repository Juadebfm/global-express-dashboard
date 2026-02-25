import type { HTMLAttributes, ReactElement } from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/utils';

type AlertTone = 'success' | 'error' | 'info' | 'warning';

interface AlertBannerProps extends HTMLAttributes<HTMLDivElement> {
  tone: AlertTone;
  message: string;
  title?: string;
  onClose?: () => void;
}

const toneStyles: Record<
  AlertTone,
  { wrapper: string; icon: ReactElement }
> = {
  success: {
    wrapper: 'border-green-200 bg-green-50 text-green-800',
    icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  },
  error: {
    wrapper: 'border-red-200 bg-red-50 text-red-700',
    icon: <AlertCircle className="h-4 w-4 text-red-600" />,
  },
  info: {
    wrapper: 'border-blue-200 bg-blue-50 text-blue-800',
    icon: <Info className="h-4 w-4 text-blue-600" />,
  },
  warning: {
    wrapper: 'border-amber-200 bg-amber-50 text-amber-800',
    icon: <TriangleAlert className="h-4 w-4 text-amber-600" />,
  },
};

export function AlertBanner({
  tone,
  message,
  title,
  onClose,
  className,
  ...props
}: AlertBannerProps): ReactElement {
  const style = toneStyles[tone];

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-sm',
        style.wrapper,
        className
      )}
      role={tone === 'error' ? 'alert' : 'status'}
      {...props}
    >
      <span className="mt-0.5 shrink-0">{style.icon}</span>
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        <p className={title ? 'mt-0.5' : ''}>{message}</p>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded p-0.5 transition hover:bg-black/5"
          aria-label="Dismiss message"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
