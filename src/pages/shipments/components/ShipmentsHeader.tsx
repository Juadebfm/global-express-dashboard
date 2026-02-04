import type { ReactElement } from 'react';
import { Plus, Navigation } from 'lucide-react';
import { Button } from '@/components/ui';

interface ShipmentsHeaderProps {
  title: string;
  subtitle: string;
  onNewShipment?: () => void;
  onTrackShipment?: () => void;
}

export function ShipmentsHeader({
  title,
  subtitle,
  onNewShipment,
  onTrackShipment,
}: ShipmentsHeaderProps): ReactElement {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={onNewShipment}
          className="border-brand-500 text-brand-600 hover:bg-brand-50"
        >
          New Shipment
        </Button>
        <Button
          type="button"
          size="sm"
          leftIcon={<Navigation className="h-4 w-4" />}
          onClick={onTrackShipment}
          className="bg-brand-500 text-white hover:bg-brand-600"
        >
          Track Your Shipment
        </Button>
      </div>
    </div>
  );
}
