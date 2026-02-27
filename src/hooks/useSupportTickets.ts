import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { FEEDBACK_MESSAGES } from '@/constants';
import { getDisplayErrorMessage } from '@/lib/feedback';
import { useFeedbackStore } from '@/store';
import type { CreateSupportTicketPayload, SupportTicket, SupportTicketListParams } from '@/types';
import { createSupportTicket, getSupportTickets } from '@/services';
import { useAuth } from './useAuth';
import { useAuthToken } from './useAuthToken';

interface UseSupportTicketsState {
  tickets: SupportTicket[];
  isLoading: boolean;
  error: string | null;
  createError: string | null;
  isCreating: boolean;
  createTicket: (payload: CreateSupportTicketPayload) => Promise<SupportTicket>;
  refresh: () => void;
}

export function useSupportTickets(params?: SupportTicketListParams): UseSupportTicketsState {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isSignedIn: isClerkSignedIn } = useClerkAuth();
  const getToken = useAuthToken();
  const pushMessage = useFeedbackStore((state) => state.pushMessage);

  const enabled = isClerkSignedIn || !!user;

  const { data, isLoading, error } = useQuery({
    queryKey: ['support', 'tickets', params ?? 'me'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getSupportTickets(token, params);
    },
    enabled,
  });

  const createTicketMutation = useMutation({
    mutationFn: async (payload: CreateSupportTicketPayload) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return createSupportTicket(payload, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] });
      pushMessage({
        tone: 'success',
        message: FEEDBACK_MESSAGES.support.ticketCreateSuccess,
      });
    },
    onError: (mutationError) => {
      pushMessage({
        tone: 'error',
        message: getDisplayErrorMessage(
          mutationError,
          FEEDBACK_MESSAGES.support.ticketCreateError
        ),
      });
    },
  });

  const errorMessage = error
    ? getDisplayErrorMessage(error, FEEDBACK_MESSAGES.support.ticketsLoadError)
    : null;
  const createErrorMessage =
    createTicketMutation.error
      ? getDisplayErrorMessage(
          createTicketMutation.error,
          FEEDBACK_MESSAGES.support.ticketCreateError
        )
      : null;

  return {
    tickets: data ?? [],
    isLoading,
    error: errorMessage,
    createError: createErrorMessage,
    isCreating: createTicketMutation.isPending,
    createTicket: createTicketMutation.mutateAsync,
    refresh: () => queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] }),
  };
}
