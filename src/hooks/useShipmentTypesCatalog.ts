import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FEEDBACK_MESSAGES } from '@/constants';
import { STALE_TIME } from '@/lib/queryDefaults';
import { useFeedbackStore } from '@/store';
import {
  getShipmentTypesCatalog,
  updateShipmentTypesCatalog,
} from '@/services';
import type {
  ShipmentTypesCatalogResult,
  ShipmentTypesUpdatePayload,
  ShipmentTypesUpdateResult,
} from '@/types';

const TOKEN_KEY = 'globalxpress_token';

function getToken(): string {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) throw new Error('Not authenticated');
  return token;
}

export function useShipmentTypesCatalog(): {
  data: ShipmentTypesCatalogResult | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const query = useQuery<ShipmentTypesCatalogResult>({
    queryKey: ['settings', 'shipment-types'],
    queryFn: () => getShipmentTypesCatalog(getToken()),
    staleTime: STALE_TIME.SLOW_MOVING,
  });
  return { data: query.data, isLoading: query.isLoading, error: query.error };
}

export function useUpdateShipmentTypesCatalog(): {
  mutate: (payload: ShipmentTypesUpdatePayload) => Promise<ShipmentTypesUpdateResult>;
  isPending: boolean;
  error: Error | null;
} {
  const queryClient = useQueryClient();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);

  const m = useMutation<ShipmentTypesUpdateResult, Error, ShipmentTypesUpdatePayload>({
    mutationFn: (payload) => updateShipmentTypesCatalog(getToken(), payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings', 'shipment-types'] });
      void queryClient.invalidateQueries({ queryKey: ['public', 'shipment-types'] });
      pushMessage({
        tone: 'success',
        message: FEEDBACK_MESSAGES.settings.shipmentTypesUpdateSuccess,
      });
    },
    onError: (err) => {
      pushMessage({
        tone: 'error',
        message: err.message || FEEDBACK_MESSAGES.settings.shipmentTypesUpdateError,
      });
    },
  });

  return {
    mutate: (payload) => m.mutateAsync(payload),
    isPending: m.isPending,
    error: m.error,
  };
}
