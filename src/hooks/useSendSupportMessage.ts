import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FEEDBACK_MESSAGES } from '@/constants';
import { useFeedbackStore } from '@/store';
import { sendSupportMessage } from '@/services';
import type { SupportMessage, SupportTicket } from '@/types';
import { useAuthToken } from './useAuthToken';

interface UseSendSupportMessageOptions {
  ticketId: string;
}

export function useSendSupportMessage({ ticketId }: UseSendSupportMessageOptions) {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);

  return useMutation({
    mutationFn: async (payload: { body: string; isInternal?: boolean }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return sendSupportMessage(ticketId, payload, token);
    },
    onSuccess: (newMessage: SupportMessage) => {
      queryClient.setQueryData(
        ['support', 'ticket', ticketId],
        (old: { ticket: SupportTicket; messages: SupportMessage[] } | undefined) =>
          old ? { ...old, messages: [...old.messages, newMessage] } : old,
      );
    },
    onError: (err) => {
      const is422 = err instanceof Error && err.message.includes('invalid');
      pushMessage({
        tone: 'error',
        message: is422
          ? FEEDBACK_MESSAGES.support.ticketClosedError
          : FEEDBACK_MESSAGES.support.messageSendError,
      });
    },
  });
}
