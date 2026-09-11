import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { D2dOrderIntakePayload, D2dOrderSubmission } from '@/types';
import { submitD2dOrderIntake } from '@/services';
import { useAuthToken } from './useAuthToken';

/** Creates a normal D2D pre-order via the backend's legacy intake URL. */
export function useD2dOrderIntake() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation<D2dOrderSubmission, Error, D2dOrderIntakePayload>({
    mutationFn: async (payload) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return submitD2dOrderIntake(token, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['shipments'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
