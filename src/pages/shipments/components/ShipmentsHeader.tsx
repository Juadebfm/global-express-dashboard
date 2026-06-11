import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigation } from 'lucide-react';
import { Button } from '@/components/ui';

interface ShipmentsHeaderProps {
  title: string;
  subtitle: string;
  onTrackShipment?: () => void;
}

export function ShipmentsHeader({
  title,
  subtitle,
  onTrackShipment,
}: ShipmentsHeaderProps): ReactElement {
  const { t } = useTranslation('shipments');
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="lg"
          leftIcon={<Navigation className="h-5 w-5" />}
          onClick={onTrackShipment}
          className="bg-brand-500 text-white hover:bg-brand-600"
        >
          {t('header.trackShipment')}
        </Button>
      </div>
    </div>
  );
}
