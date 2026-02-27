import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useWebSocketStore, useFeedbackStore } from '@/store';
import { mapSupportMessage } from '@/services';
import { FEEDBACK_MESSAGES } from '@/constants';
import type { SupportMessage, SupportTicket } from '@/types';
import { useAuth } from './useAuth';

const TOKEN_KEY = 'globalxpress_token';

function buildWsUrl(token: string): string {
  const base = (import.meta.env.VITE_API_BASE_URL as string) ?? '';
  const wsBase = base
    .replace('/api/v1', '')
    .replace(/^https:\/\//, 'wss://')
    .replace(/^http:\/\//, 'ws://');
  return `${wsBase}/ws?token=${token}`;
}

export function useWebSocket(): void {
  const { user } = useAuth();
  const { isSignedIn: isClerkSignedIn, getToken } = useClerkAuth();
  const queryClient = useQueryClient();
  const setWs = useWebSocketStore((s) => s.setWs);
  const pushMessage = useFeedbackStore((s) => s.pushMessage);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let isMounted = true;

    const connect = async (): Promise<void> => {
      const token =
        isClerkSignedIn && !user
          ? await getToken()
          : localStorage.getItem(TOKEN_KEY);

      if (!token || !isMounted) return;

      const ws = new WebSocket(buildWsUrl(token));
      wsRef.current = ws;
      setWs(ws);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as {
            type?: string;
            ticketId?: string;
            message?: unknown;
            ticket?: unknown;
          };

          switch (data.type) {
            case 'support:message': {
              const ticketId = data.ticketId;
              if (ticketId && data.message) {
                // Append message directly to ticket detail cache for instant display
                const mapped = mapSupportMessage(
                  data.message as Parameters<typeof mapSupportMessage>[0],
                );
                queryClient.setQueryData<{
                  ticket: SupportTicket;
                  messages: SupportMessage[];
                }>(['support', 'ticket', ticketId], (old) => {
                  if (!old) return old;
                  const exists = old.messages.some((m) => m.id === mapped.id);
                  if (exists) return old;
                  return { ...old, messages: [...old.messages, mapped] };
                });
              }
              // Also refresh the ticket list (updates "last message" preview)
              queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] });
              break;
            }

            case 'support:new_ticket': {
              queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] });
              // Only show toast for staff/admin
              const isOperator = user && user.role !== 'user';
              if (isOperator) {
                pushMessage({
                  tone: 'info',
                  message: FEEDBACK_MESSAGES.support.newTicketToast,
                });
              }
              break;
            }

            default: {
              // Existing behavior — notification refresh
              queryClient.invalidateQueries({ queryKey: ['notifications'] });
              break;
            }
          }
        } catch {
          // Non-JSON message or parsing failure — fall back to notification refresh
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      };

      ws.onclose = (event) => {
        setWs(null);
        if (event.code === 4001) return;
        if (!isMounted) return;
        setTimeout(() => {
          if (isMounted) void connect();
        }, 3000);
      };
    };

    if (isClerkSignedIn || !!user) {
      void connect();
    }

    return () => {
      isMounted = false;
      setWs(null);
      wsRef.current?.close();
    };
  }, [isClerkSignedIn, !!user]); // eslint-disable-line react-hooks/exhaustive-deps
}
