import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FEEDBACK_MESSAGES } from '@/constants';
import { getDisplayErrorMessage } from '@/lib/feedback';
import { useWebSocketStore } from '@/store';
import type { SupportTicket, SupportMessage } from '@/types';
import { getSupportTicketById } from '@/services';
import { useAuthToken } from './useAuthToken';

interface UseSupportTicketDetailState {
  ticket: SupportTicket | null;
  messages: SupportMessage[];
  isLoading: boolean;
  error: string | null;
}

export function useSupportTicketDetail(ticketId: string | undefined): UseSupportTicketDetailState {
  const getToken = useAuthToken();
  const send = useWebSocketStore((s) => s.send);

  const { data, isLoading, error } = useQuery({
    queryKey: ['support', 'ticket', ticketId],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getSupportTicketById(ticketId!, token);
    },
    enabled: !!ticketId,
  });

  // Join / leave the WS room for real-time message delivery
  useEffect(() => {
    if (!ticketId) return;
    send({ type: 'support:join', ticketId });
    return () => {
      send({ type: 'support:leave', ticketId });
    };
  }, [ticketId, send]);

  const errorMessage = error
    ? getDisplayErrorMessage(error, FEEDBACK_MESSAGES.support.ticketDetailLoadError)
    : null;

  return {
    ticket: data?.ticket ?? null,
    messages: data?.messages ?? [],
    isLoading,
    error: errorMessage,
  };
}
