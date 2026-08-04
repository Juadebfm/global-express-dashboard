import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useWebSocketStore, useFeedbackStore } from '@/store';
import { mapSupportMessage } from '@/services';
import { FEEDBACK_MESSAGES } from '@/constants';
import type { SupportMessage, SupportTicket } from '@/types';
import { useAuth } from './useAuth';
import { MY_PERMISSIONS_KEY } from './usePermissions';
import { trackingKey } from './useTrackShipment';

const TOKEN_KEY = 'globalxpress_token';

const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

function stripUuids(text: string): string {
  return text
    .replace(/\s+for (order|shipment|payment)\s+[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '')
    .replace(UUID_RE, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,!?])/g, '$1')
    .trim();
}

function buildWsUrl(): string {
  const base = (import.meta.env.VITE_API_BASE_URL as string) ?? '';
  const wsBase = base
    .replace('/api/v1', '')
    .replace(/^https:\/\//, 'wss://')
    .replace(/^http:\/\//, 'ws://');
  return `${wsBase}/ws`;
}

export function useWebSocket(): void {
  const { user, refreshUser } = useAuth();
  const { isSignedIn: isClerkSignedIn, getToken } = useClerkAuth();
  const queryClient = useQueryClient();
  const setWs = useWebSocketStore((s) => s.setWs);
  const pushMessage = useFeedbackStore((s) => s.pushMessage);
  const wsRef = useRef<WebSocket | null>(null);
  const hasUser = !!user;
  const isOperator = !!user && user.role !== 'user';
  const mustChangePassword = user?.mustChangePassword ?? false;

  useEffect(() => {
    let isMounted = true;

    const connect = async (): Promise<void> => {
      const token = isClerkSignedIn && !hasUser
        ? await getToken()
        : sessionStorage.getItem(TOKEN_KEY);

      if (!token || !isMounted) return;

      // Auth via Sec-WebSocket-Protocol subprotocol header — the WebSocket
      // constructor's second arg becomes the subprotocol list. Keeps the JWT
      // out of the URL (and out of proxy/access logs) per backend spec.
      const ws = new WebSocket(buildWsUrl(), ['bearer', token]);
      wsRef.current = ws;
      setWs(ws);

      ws.onmessage = async (event) => {
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

            // Sent to Staff, Admin, and Superadmin sessions after a batch is
            // closed or its movement changes, including hold, cancellation,
            // restricted-item rejection, and an approved override. Like
            // access:updated below, it carries only an id — never read a stage
            // from the message, always refetch the authoritative endpoints.
            case 'batch:movement_updated': {
              const batchId = String(
                (payload as Record<string, unknown>).batchId ?? '',
              );
              if (batchId) {
                // Covers both the movement state and the movement history,
                // which share the ['shipments', 'batches', id] prefix.
                void queryClient.invalidateQueries({
                  queryKey: ['shipments', 'batches', batchId],
                });
                void queryClient.invalidateQueries({ queryKey: ['batches', 'roster', batchId] });
                void queryClient.invalidateQueries({ queryKey: ['batches', 'detail', batchId] });
              }
              // A close creates the next open batch, so the list changes even
              // when the batch that moved is not the one on screen.
              void queryClient.invalidateQueries({ queryKey: ['batches', 'list'] });
              break;
            }

            // A Superadmin may change this user's role or an extra
            // capability while their dashboard is open. The event itself is
            // deliberately only a refresh signal: fetch the account and
            // permission matrix again rather than trusting a value carried in
            // a WebSocket message.
            case 'access:updated': {
              await refreshUser();
              await queryClient.invalidateQueries({ queryKey: MY_PERMISSIONS_KEY });
              break;
            }

            case 'notification:new':
            case 'notification:broadcast': {
              void queryClient.invalidateQueries({ queryKey: ['notifications'] });
              // Customers never receive batch:movement_updated. A batch-related
              // notification names their own customer batch reference instead,
              // so refresh that tracking page if they happen to be on it. Only
              // the customer reference is ever used — never a master reference.
              const metadata = (payload as Record<string, unknown>).metadata;
              const customerBatchTrackingNumber =
                metadata && typeof metadata === 'object' && !Array.isArray(metadata)
                  ? String(
                      (metadata as Record<string, unknown>).customerBatchTrackingNumber ?? '',
                    )
                  : '';
              if (customerBatchTrackingNumber) {
                void queryClient.invalidateQueries({
                  queryKey: trackingKey(customerBatchTrackingNumber),
                });
              }
              if (title || body) {
                pushMessage({
                  tone: 'info',
                  title: title ? stripUuids(title) : undefined,
                  message: stripUuids(body),
                });
              }
              break;
            }

            case 'notification': {
              if (title || body) {
                pushMessage({
                  tone: 'info',
                  title: title ? stripUuids(title) : undefined,
                  message: stripUuids(body),
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

    // An internal user who must replace a temporary password is intentionally
    // limited to the password screen. Do not establish a dashboard connection
    // until the backend clears that requirement.
    const mayConnect = (isClerkSignedIn && !hasUser) || (hasUser && !mustChangePassword);
    if (mayConnect) {
      void connect();
    }

    return () => {
      isMounted = false;
      setWs(null);
      wsRef.current?.close();
    };
  }, [getToken, hasUser, isClerkSignedIn, isOperator, mustChangePassword, pushMessage, queryClient, refreshUser, setWs]);
}
