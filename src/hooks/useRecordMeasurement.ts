import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Measurement } from '@/services/measurementsService';
import { recordMeasurement } from '@/services/measurementsService';
import { useFeedbackStore } from '@/store';
import { useAuthToken } from './useAuthToken';

export function useRecordMeasurement() {
  const getToken = useAuthToken();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      ...payload
    }: Parameters<typeof recordMeasurement>[2] & { orderId: string }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return { orderId, result: await recordMeasurement(token, orderId, payload) };
    },
    onSuccess: ({ orderId, result }) => {
      queryClient.setQueryData<Measurement[]>(
        ['measurements', orderId],
        (old) => {
          if (!old) return [result];
          const idx = old.findIndex((m) => m.checkpoint === result.checkpoint);
          return idx >= 0
            ? old.map((m) => (m.checkpoint === result.checkpoint ? result : m))
            : [...old, result];
        },
      );
      pushMessage({ tone: 'success', message: 'Measurement recorded.' });
    },
    onError: () => {
      pushMessage({ tone: 'error', message: 'Failed to record measurement. Please try again.' });
    },
  });
}
