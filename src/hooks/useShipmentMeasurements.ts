import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FEEDBACK_MESSAGES } from '@/constants';
import { useFeedbackStore } from '@/store';
import {
  getShipmentMeasurements,
  recordShipmentMeasurement,
} from '@/services/shipmentsService';
import type { ShipmentMeasurement, ShipmentMeasurementPayload } from '@/types';
import { useAuthToken } from './useAuthToken';

const measurementsKey = (shipmentId: string | undefined): readonly unknown[] =>
  ['shipments', shipmentId ?? '', 'measurements'] as const;

export function useShipmentMeasurements(shipmentId: string | undefined): {
  data: ShipmentMeasurement[] | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  const query = useQuery<ShipmentMeasurement[]>({
    queryKey: measurementsKey(shipmentId),
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      if (!shipmentId) throw new Error('Missing shipment id');
      return getShipmentMeasurements(token, shipmentId);
    },
    enabled: !!shipmentId,
    staleTime: 30_000,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: () =>
      queryClient.invalidateQueries({ queryKey: measurementsKey(shipmentId) }),
  };
}

export function useRecordShipmentMeasurement(shipmentId: string | undefined): {
  mutate: (payload: ShipmentMeasurementPayload) => Promise<ShipmentMeasurement>;
  isPending: boolean;
  error: Error | null;
} {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);

  const m = useMutation<ShipmentMeasurement, Error, ShipmentMeasurementPayload>({
    mutationFn: async (payload) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      if (!shipmentId) throw new Error('Missing shipment id');
      return recordShipmentMeasurement(token, shipmentId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: measurementsKey(shipmentId) });
      pushMessage({
        tone: 'success',
        message: FEEDBACK_MESSAGES.shipments.measurementSuccess,
      });
    },
    onError: (err) => {
      pushMessage({
        tone: 'error',
        message: err.message || FEEDBACK_MESSAGES.shipments.measurementError,
      });
    },
  });

  return {
    mutate: (payload) => m.mutateAsync(payload),
    isPending: m.isPending,
    error: m.error,
  };
}
