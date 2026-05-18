import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FEEDBACK_MESSAGES } from '@/constants';
import { useFeedbackStore } from '@/store';
import { recordShipmentIntake } from '@/services/shipmentsService';
import type { ShipmentIntakePayload, ShipmentIntakeResult } from '@/types';
import { useAuthToken } from './useAuthToken';

export function useRecordShipmentIntake(): {
  mutate: (payload: ShipmentIntakePayload) => Promise<ShipmentIntakeResult>;
  isPending: boolean;
  error: Error | null;
} {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);

  const m = useMutation<ShipmentIntakeResult, Error, ShipmentIntakePayload>({
    mutationFn: async (payload) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return recordShipmentIntake(token, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      pushMessage({
        tone: 'success',
        message: FEEDBACK_MESSAGES.shipments.intakeSuccess,
      });
    },
    onError: (err) => {
      pushMessage({
        tone: 'error',
        message: err.message || FEEDBACK_MESSAGES.shipments.intakeError,
      });
    },
  });

  return {
    mutate: (payload) => m.mutateAsync(payload),
    isPending: m.isPending,
    error: m.error,
  };
}
