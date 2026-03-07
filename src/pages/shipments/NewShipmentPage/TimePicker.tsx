import type { ReactElement } from 'react';
import { useCallback, useRef, useState } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/utils';

function formatTime12(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const period = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${String(h).padStart(2, '0')}:${mStr} ${period}`;
}

interface TimePickerProps {
  label: string;
  value: string;
  onChange: (time: string) => void;
}

export function TimePicker({ label, value, onChange }: TimePickerProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [openAbove, setOpenAbove] = useState(false);

  const [hStr, mStr] = value.split(':');
  const hour24 = parseInt(hStr, 10);
  const minute = parseInt(mStr, 10);
  const isPM = hour24 >= 12;
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setOpenAbove(window.innerHeight - rect.bottom < 320);
      }
      return !prev;
    });
  }, []);

  const setHour = (h12: number): void => {
    const h24 = isPM ? (h12 === 12 ? 12 : h12 + 12) : h12 === 12 ? 0 : h12;
    onChange(`${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
  };

  const setMinute = (m: number): void => {
    onChange(`${String(hour24).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  };

  const togglePeriod = (): void => {
    const newH24 = isPM ? hour24 - 12 : hour24 + 12;
    onChange(`${String(newH24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
  };

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <div className="relative">
      <span className="text-xs font-semibold uppercase text-gray-500">{label}</span>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className="mt-2 flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-700 hover:border-brand-400"
      >
        <span className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-400" />
          {formatTime12(value)}
        </span>
        <Clock className="h-4 w-4 text-gray-400" />
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute left-0 right-0 z-10 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg',
            openAbove ? 'bottom-full mb-2' : 'top-full mt-2',
          )}
        >
          <div className="flex gap-3">
            <div className="flex-1">
              <p className="mb-2 text-center text-[10px] font-semibold uppercase text-gray-400">Hour</p>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-100 p-1">
                {hours.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHour(h)}
                    className={cn(
                      'flex w-full items-center justify-center rounded-lg py-1.5 text-sm',
                      h === hour12 ? 'bg-brand-500 font-semibold text-white' : 'text-gray-600 hover:bg-gray-50',
                    )}
                  >
                    {String(h).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1">
              <p className="mb-2 text-center text-[10px] font-semibold uppercase text-gray-400">Min</p>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-100 p-1">
                {minutes.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMinute(m)}
                    className={cn(
                      'flex w-full items-center justify-center rounded-lg py-1.5 text-sm',
                      m === minute ? 'bg-brand-500 font-semibold text-white' : 'text-gray-600 hover:bg-gray-50',
                    )}
                  >
                    {String(m).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 pt-6">
              <button
                type="button"
                onClick={() => { if (isPM) togglePeriod(); }}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-semibold',
                  !isPM ? 'bg-brand-500 text-white' : 'text-gray-500 hover:bg-gray-50',
                )}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => { if (!isPM) togglePeriod(); }}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-semibold',
                  isPM ? 'bg-brand-500 text-white' : 'text-gray-500 hover:bg-gray-50',
                )}
              >
                PM
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="mt-3 w-full rounded-xl bg-brand-500 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
