import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/utils';
import i18n from '@/i18n/i18n';

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatDateLabel = (value: Date | null): string => {
  if (!value) return 'Select date';
  const locale = i18n.language === 'ko' ? 'ko-KR' : 'en-US';
  return value.toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' });
};

const buildCalendarDays = (
  year: number,
  month: number,
): Array<{ date: Date; day: number; isCurrentMonth: boolean }> => {
  const firstDay = new Date(Date.UTC(year, month, 1));
  const startDay = firstDay.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const daysInPrevMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: Array<{ date: Date; day: number; isCurrentMonth: boolean }> = [];

  for (let i = 0; i < 42; i += 1) {
    const dayIndex = i - startDay + 1;
    if (dayIndex <= 0) {
      const day = daysInPrevMonth + dayIndex;
      cells.push({ date: new Date(Date.UTC(year, month - 1, day)), day, isCurrentMonth: false });
    } else if (dayIndex > daysInMonth) {
      const day = dayIndex - daysInMonth;
      cells.push({ date: new Date(Date.UTC(year, month + 1, day)), day, isCurrentMonth: false });
    } else {
      cells.push({ date: new Date(Date.UTC(year, month, dayIndex)), day: dayIndex, isCurrentMonth: true });
    }
  }

  return cells;
};

interface DatePickerProps {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
}

export function DatePicker({ label, value, onChange }: DatePickerProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'calendar' | 'year'>('calendar');
  const [openAbove, setOpenAbove] = useState(false);
  const [month, setMonth] = useState(() => (value ? value.getUTCMonth() : 2));
  const [year, setYear] = useState(() => (value ? value.getUTCFullYear() : 2026));
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setOpenAbove(spaceBelow < 400);
      }
      return !prev;
    });
  }, []);

  useEffect(() => {
    if (!value) return;
    setMonth(value.getUTCMonth());
    setYear(value.getUTCFullYear());
  }, [value]);

  const monthLabel = useMemo(() => {
    const date = new Date(Date.UTC(year, month, 1));
    const locale = i18n.language === 'ko' ? 'ko-KR' : 'en-US';
    return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  }, [month, year]);

  const days = useMemo(() => buildCalendarDays(year, month), [month, year]);

  return (
    <div className="relative">
      <span className="text-xs font-semibold uppercase text-gray-500">{label}</span>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className="mt-2 flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-700 hover:border-brand-400"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {formatDateLabel(value)}
        </span>
        <Calendar className="h-4 w-4 text-gray-400" />
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute left-0 right-0 z-10 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg',
            openAbove ? 'bottom-full mb-2' : 'top-full mt-2',
          )}
        >
          {view === 'calendar' ? (
            <>
              <div className="flex items-center justify-between text-sm font-semibold text-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    if (month === 0) { setMonth(11); setYear((prev) => prev - 1); }
                    else { setMonth((prev) => prev - 1); }
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-brand-400 hover:text-brand-500"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setView('year')} className="text-brand-600">
                  {monthLabel}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (month === 11) { setMonth(0); setYear((prev) => prev + 1); }
                    else { setMonth((prev) => prev + 1); }
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-brand-400 hover:text-brand-500"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-7 gap-2 text-[11px] font-semibold uppercase text-gray-400">
                {daysOfWeek.map((day) => (
                  <span key={day} className="text-center">{day}</span>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-7 gap-2 text-sm">
                {days.map((item) => {
                  const isSelected =
                    value &&
                    item.date.getUTCFullYear() === value.getUTCFullYear() &&
                    item.date.getUTCMonth() === value.getUTCMonth() &&
                    item.date.getUTCDate() === value.getUTCDate();

                  return (
                    <button
                      key={`${item.date.toISOString()}-${item.day}`}
                      type="button"
                      onClick={() => { onChange(item.date); setIsOpen(false); setView('calendar'); }}
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-full',
                        item.isCurrentMonth ? 'text-gray-700 hover:bg-brand-50' : 'text-gray-300',
                        isSelected && 'bg-brand-500 text-white hover:bg-brand-500',
                      )}
                    >
                      {item.day}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="py-6 text-center">
              <p className="text-sm font-semibold text-gray-500">Select Year</p>
              <div className="mt-6 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setYear((prev) => prev - 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-brand-400 hover:text-brand-500"
                  aria-label="Previous year"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setView('calendar')}
                  className="rounded-2xl bg-gray-50 px-6 py-2 text-2xl font-semibold text-gray-800"
                >
                  {year}
                </button>
                <button
                  type="button"
                  onClick={() => setYear((prev) => prev + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-brand-400 hover:text-brand-500"
                  aria-label="Next year"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
