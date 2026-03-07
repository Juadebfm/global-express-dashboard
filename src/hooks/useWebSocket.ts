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
      const token = isClerkSignedIn && !user
        ? await getToken()
        : localStorage.getItem(TOKEN_KEY);

      if (!token || !isMounted) return;

      const ws = new WebSocket(buildWsUrl(token));
      wsRef.current = ws;
      setWs(ws);

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data as string) as {
            type?: string;
            data?: Record<string, unknown>;
            ticketId?: string;
            message?: unknown;
            title?: string;
            body?: string;
          };

          const payload =
            parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data)
              ? parsed.data
              : parsed;

          const ticketId = String(payload.ticketId ?? parsed.ticketId ?? '');
          const message = payload.message ?? parsed.message;
          const title = String(payload.title ?? parsed.title ?? '');
          const body = String(payload.body ?? parsed.body ?? '');

          switch (parsed.type) {
            case 'support:message': {
              if (ticketId && message) {
                const mapped = mapSupportMessage(
                  message as Parameters<typeof mapSupportMessage>[0],
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
              void queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] });
              break;
            }

            case 'support:new_ticket': {
              void queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] });
              const isOperator = user && user.role !== 'user';
              if (isOperator) {
                pushMessage({
                  tone: 'info',
                  message: FEEDBACK_MESSAGES.support.newTicketToast,
                });
              }
              break;
            }

            case 'order_status_updated': {
              void queryClient.invalidateQueries({ queryKey: ['orders'] });
              void queryClient.invalidateQueries({ queryKey: ['order'] });
              void queryClient.invalidateQueries({ queryKey: ['shipments'] });
              void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
              break;
            }

            case 'notification:new':
            case 'notification:broadcast': {
              void queryClient.invalidateQueries({ queryKey: ['notifications'] });
              if (title || body) {
                pushMessage({
                  tone: 'info',
                  title: title || undefined,
                  message: body,
                });
              }
              break;
            }

            case 'notification': {
              if (title || body) {
                pushMessage({
                  tone: 'info',
                  title: title || undefined,
                  message: body,
                });
              }
              break;
            }

            default: {
              break;
            }
          }
        } catch {
          // Ignore malformed/non-JSON websocket payloads.
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
