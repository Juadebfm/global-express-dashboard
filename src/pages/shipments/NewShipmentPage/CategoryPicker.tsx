import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Pencil } from 'lucide-react';
import { cn } from '@/utils';
import { SHIPMENT_CONTENT_CATEGORIES } from './types';

interface CategoryPickerProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

/**
 * "What's inside?" picker for BasicsStep. Quick-pick chips for the most
 * common cargo categories + an inline freeform input so the user can type
 * anything custom (e.g. "industrial bearings"). The chip set is suggestive,
 * not exhaustive — selecting a chip writes its value into `packageDescription`
 * verbatim, and the freeform input lets the user override it.
 */
export function CategoryPicker({ value, onChange, error }: CategoryPickerProps): ReactElement {
  const { t } = useTranslation('shipments');
  const trimmed = value.trim();
  const matchedCategory = SHIPMENT_CONTENT_CATEGORIES.find((c) => c.value === trimmed);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
        <Box className="h-4 w-4" />
        {t('newShipment.basics.whatsInsideLabel')}
      </div>

      <div className="flex flex-wrap gap-2">
        {SHIPMENT_CONTENT_CATEGORIES.map((cat) => {
          const isSelected = matchedCategory?.value === cat.value;
          return (
            <button
              key={cat.value}
              type="button"
              onClick={() => onChange(cat.value)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition',
                isSelected
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
              )}
            >
              {t(cat.labelKey)}
            </button>
          );
        })}
      </div>

      <div className="relative">
        <Pencil className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('newShipment.basics.whatsInsidePlaceholder')}
          className={cn(
            'w-full rounded-xl border bg-white py-3 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 transition focus:outline-none focus:ring-2',
            error
              ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
              : 'border-gray-200 focus:border-brand-400 focus:ring-brand-100',
          )}
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
