import type { ReactElement } from 'react';
import { Check, Plane, Ship, Truck } from 'lucide-react';
import { cn } from '@/utils';

export type OrderShipmentType = 'air' | 'sea' | 'd2d';

interface Option {
  value: OrderShipmentType;
  label: string;
  hint: string;
  Icon: typeof Plane;
}

const OPTIONS: Option[] = [
  { value: 'air', label: 'Air freight', hint: 'Arrives in 5–7 days. Our fastest option.', Icon: Plane },
  { value: 'sea', label: 'Ocean freight', hint: 'Arrives in 30–40 days. Our lowest cost.', Icon: Ship },
  { value: 'd2d', label: 'Door-to-door', hint: 'Delivered to the address you give us. Priced individually.', Icon: Truck },
];

interface ShipmentTypeSelectProps {
  value: OrderShipmentType;
  onChange: (value: OrderShipmentType) => void;
}

/**
 * Radio group presented as compact cards.
 *
 * The cards carry only an icon and a label so they stay readable at three
 * across inside a narrow form column. The chosen option's explanation appears
 * beneath the group instead of inside every card — a hover tooltip would be
 * unreachable on touch, and repeating all three descriptions at once crowded
 * the labels into unreadable fragments.
 */
export function ShipmentTypeSelect({ value, onChange }: ShipmentTypeSelectProps): ReactElement {
  const selected = OPTIONS.find((option) => option.value === value);

  return (
    <div>
      <div role="radiogroup" aria-label="Shipment type" className="grid grid-cols-3 gap-2">
        {OPTIONS.map((option) => {
          const isSelected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(option.value)}
              title={option.hint}
              className={cn(
                'relative flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-center transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1',
                isSelected
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-gray-200 bg-white hover:border-gray-400',
              )}
            >
              {isSelected && (
                <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500">
                  <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                </span>
              )}

              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                  isSelected ? 'bg-white text-brand-600' : 'bg-gray-100 text-gray-400',
                )}
              >
                <option.Icon className="h-4 w-4" />
              </span>

              <span
                className={cn(
                  'text-xs font-medium leading-tight sm:text-sm',
                  isSelected ? 'text-brand-900' : 'text-gray-800',
                )}
              >
                {option.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Explains the current choice. aria-live so a screen reader announces the
          change rather than leaving it as silently updated text. */}
      {selected && (
        <p className="mt-2 text-xs text-gray-500" aria-live="polite">
          {selected.hint}
        </p>
      )}
    </div>
  );
}
