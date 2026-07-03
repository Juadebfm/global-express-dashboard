import type { ReactElement } from 'react';
import { useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, ShieldAlert } from 'lucide-react';
import { cn } from '@/utils';

type ConfirmTone = 'danger' | 'warning' | 'info' | 'success' | 'default';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const TONE_CONFIG: Record<ConfirmTone, {
  icon: ReactElement | null;
  iconWrap: string;
  confirmBtn: string;
}> = {
  danger: {
    icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
    iconWrap: 'bg-red-50',
    confirmBtn: 'bg-red-600 hover:bg-red-700 text-white',
  },
  warning: {
    icon: <ShieldAlert className="h-5 w-5 text-amber-600" />,
    iconWrap: 'bg-amber-50',
    confirmBtn: 'bg-brand-500 hover:bg-brand-600 text-white',
  },
  info: {
    icon: <Info className="h-5 w-5 text-sky-600" />,
    iconWrap: 'bg-sky-50',
    confirmBtn: 'bg-gray-900 hover:bg-gray-700 text-white',
  },
  success: {
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
    iconWrap: 'bg-emerald-50',
    confirmBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  },
  default: {
    icon: null,
    iconWrap: '',
    confirmBtn: 'bg-brand-500 hover:bg-brand-600 text-white',
  },
};

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Go back',
  tone = 'default',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps): ReactElement | null {
  const overlayRef = useRef<HTMLDivElement>(null);
  const config = TONE_CONFIG[tone];

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !isLoading) onCancel();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current && !isLoading) onCancel();
      }}
    >
      <div className="w-full max-w-[440px] overflow-hidden rounded-[20px] border border-gray-200 bg-white shadow-[0_12px_32px_rgba(0,0,0,0.14),0_4px_8px_rgba(0,0,0,0.06)]">
        {/* Body */}
        <div className="flex items-start gap-3.5 px-7 pt-7 pb-5">
          {config.icon && (
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]', config.iconWrap)}>
              {config.icon}
            </div>
          )}
          <div className={cn('min-w-0 flex-1', config.icon && 'pt-0.5')}>
            <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-gray-900">
              {title}
            </h3>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-gray-500">{message}</p>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-7 h-px bg-gray-100" />

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-7 py-4">
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="rounded-[8px] border border-gray-200 bg-white px-4 py-2 text-[13.5px] font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={cn(
              'inline-flex items-center gap-2 rounded-[8px] px-4 py-2 text-[13.5px] font-medium transition disabled:cursor-not-allowed disabled:opacity-60',
              config.confirmBtn,
            )}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
