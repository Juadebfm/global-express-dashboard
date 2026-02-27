import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FEEDBACK_MESSAGES } from '@/constants';
import { useFeedbackStore } from '@/store';
import { updateTicketStatus } from '@/services';
import type { SupportTicketStatus } from '@/types';
import { useAuthToken } from './useAuthToken';

interface UseUpdateTicketStatusOptions {
  ticketId: string;
}

export function useUpdateTicketStatus({ ticketId }: UseUpdateTicketStatusOptions) {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);

  return useMutation({
    mutationFn: async (status: SupportTicketStatus) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return updateTicketStatus(ticketId, { status }, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support', 'ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] });
      pushMessage({
        tone: 'success',
        message: FEEDBACK_MESSAGES.support.statusUpdateSuccess,
      });
    },
    onError: () => {
      pushMessage({
        tone: 'error',
        message: FEEDBACK_MESSAGES.support.statusUpdateError,
      });
    },
  });
}
