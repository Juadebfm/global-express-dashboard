import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clearEscalation } from '@/services';
import { useFeedbackStore } from '@/store';

const TOKEN_KEY = 'globalxpress_token';

export function useClearEscalation() {
  const queryClient = useQueryClient();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);

  return useMutation({
    mutationFn: (orderId: string) => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      return clearEscalation(token, orderId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['order'] });
      pushMessage({ tone: 'info', message: 'Escalation flag cleared — order remains on hold for staff.' });
    },
    onError: () => {
      pushMessage({ tone: 'error', message: 'Could not clear the flag — please try again.' });
    },
  });
}
