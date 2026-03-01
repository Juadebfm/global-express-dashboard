import type { ReactElement } from 'react';
import { useEffect, useRef } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/utils';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps): ReactElement | null {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !isLoading) onCancel();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  const isDanger = tone === 'danger';

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current && !isLoading) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start gap-4">
          {isDanger && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
          )}
          <div>
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            <p className="mt-1 text-sm text-gray-500">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className={cn(
              'rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50',
              isLoading && 'cursor-not-allowed opacity-60',
            )}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition',
              isDanger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-brand-500 hover:bg-brand-600',
              isLoading && 'cursor-not-allowed opacity-60',
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
