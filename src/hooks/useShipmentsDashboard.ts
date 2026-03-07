import { useQuery } from '@tanstack/react-query';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import type { ShipmentsDashboardData } from '@/types';
import { getShipmentsDashboard } from '@/services';
import type { InternalShipmentsQueryParams } from '@/services/shipmentsService';
import { useAuth } from './useAuth';

const TOKEN_KEY = 'globalxpress_token';

interface ShipmentsDashboardState {
  data: ShipmentsDashboardData | null;
  isLoading: boolean;
  error: string | null;
}

export function useShipmentsDashboard(
  params: InternalShipmentsQueryParams = {}
): ShipmentsDashboardState {
  const { user } = useAuth();
  const { isSignedIn: isClerkSignedIn, getToken } = useClerkAuth();

  const isCustomer = isClerkSignedIn && !user;
  const enabled = isClerkSignedIn || !!user;

  const { data, isLoading, error } = useQuery({
    queryKey: ['shipments', 'dashboard', isCustomer ? 'customer' : 'internal', params],
    queryFn: async (): Promise<ShipmentsDashboardData> => {
      const token = isCustomer
        ? await getToken()
        : localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      return getShipmentsDashboard(token, isCustomer, params);
    },
    enabled,
  });

  const message =
    error instanceof Error ? error.message : error ? 'Failed to load shipments' : null;

  return {
    data: data ?? null,
    isLoading,
    error: message,
  };
}
