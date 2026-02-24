import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
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

      ws.onmessage = () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      };

      ws.onclose = (event) => {
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
      wsRef.current?.close();
    };
  }, [isClerkSignedIn, !!user]); // eslint-disable-line react-hooks/exhaustive-deps
}
