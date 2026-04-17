import type { ReactElement } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { Clock4, ShieldAlert } from 'lucide-react';

interface ProvisioningGateModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  remainingMs: number;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary: () => void;
  onSecondary: () => void;
}

interface CountdownPart {
  label: string;
  value: string;
}

function toCountdownParts(remainingMs: number): CountdownPart[] {
  const totalSeconds = Math.floor(Math.max(0, remainingMs) / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  return [
    { label: 'Days', value: String(days).padStart(2, '0') },
    { label: 'Hours', value: String(hours).padStart(2, '0') },
    { label: 'Minutes', value: String(minutes).padStart(2, '0') },
    { label: 'Seconds', value: String(seconds).padStart(2, '0') },
  ];
}

export function ProvisioningGateModal({
  isOpen,
  title,
  message,
  remainingMs,
  primaryLabel = 'I understand',
  secondaryLabel = 'Close',
  onPrimary,
  onSecondary,
}: ProvisioningGateModalProps): ReactElement | null {
  const overlayRef = useRef<HTMLDivElement>(null);
  const countdownParts = useMemo(() => toCountdownParts(remainingMs), [remainingMs]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onSecondary();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onSecondary]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
      onClick={(event) => {
        if (event.target === overlayRef.current) {
          onSecondary();
        }
      }}
    >
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_25px_80px_rgba(0,0,0,0.45)]">
        <div className="relative border-b border-gray-200 px-6 py-4 sm:px-8">
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-700">
            <ShieldAlert className="h-3.5 w-3.5" />
            Provisioning Gate
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-gray-900">{title}</h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-600">{message}</p>
        </div>

        <div className="relative px-6 pb-6 pt-5 sm:px-8 sm:pb-8">
          <div className="mb-5 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-gray-500">
            <Clock4 className="h-3.5 w-3.5 text-brand-600" />
            Countdown To Unlock
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {countdownParts.map((part) => (
              <div
                key={part.label}
                className="rounded-2xl border border-gray-200 bg-white/90 px-3 py-4 text-center shadow-sm"
              >
                <p className="font-display text-[30px] font-semibold leading-none text-gray-900 sm:text-[34px]">
                  {part.value}
                </p>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                  {part.label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onSecondary}
              className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              {secondaryLabel}
            </button>
            <button
              type="button"
              onClick={onPrimary}
              className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/30 transition hover:bg-brand-600"
            >
              {primaryLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
