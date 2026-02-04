import { useQuery } from '@tanstack/react-query';
import type { ShipmentsDashboardData } from '@/types';
import { getShipmentsDashboard } from '@/services';

interface ShipmentsDashboardState {
  data: ShipmentsDashboardData | null;
  isLoading: boolean;
  error: string | null;
}

export function useShipmentsDashboard(): ShipmentsDashboardState {
  const { data, isLoading, error } = useQuery({
    queryKey: ['shipments', 'dashboard'],
    queryFn: getShipmentsDashboard,
  });

  const message =
    error instanceof Error ? error.message : error ? 'Failed to load shipments' : null;

  return {
    data: data ?? null,
    isLoading,
    error: message,
  };
}
