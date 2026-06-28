import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FEEDBACK_MESSAGES } from '@/constants';
import { useFeedbackStore } from '@/store';
import { buildErrorFeedback } from '@/lib/feedback';
import { ApiError } from '@/lib/apiClient';
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
    onError: (err, variables) => {
      // 404 = customer not found — the modal handles this inline by expanding
      // the dormant-client creation form. Suppress the generic error toast so
      // the user isn't hit with two error surfaces at once.
      if (err instanceof ApiError && err.status === 404) return;

      // buildErrorFeedback decides whether to surface the Retry button
      // (only 5xx). The retry re-fires with the exact same variables so
      // the user doesn't lose their work to a transient BE blip.
      pushMessage(
        buildErrorFeedback({
          err,
          fallbackMessage: FEEDBACK_MESSAGES.shipments.intakeError,
          retry: () => {
            void m.mutateAsync(variables);
          },
        }),
      );
    },
  });

  return {
    mutate: (payload) => m.mutateAsync(payload),
    isPending: m.isPending,
    error: m.error,
  };
}
