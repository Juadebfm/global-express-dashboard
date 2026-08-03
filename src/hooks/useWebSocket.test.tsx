import type { ReactElement, ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MY_PERMISSIONS_KEY } from './usePermissions';
import { useWebSocket } from './useWebSocket';

const TOKEN_KEY = 'globalxpress_token';
const refreshUser = vi.fn<() => Promise<null>>();

vi.mock('./useAuth', () => ({
  useAuth: () => ({
    user: { id: 'staff-1', role: 'admin', mustChangePassword: false },
    refreshUser,
  }),
}));

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ isSignedIn: false, getToken: vi.fn() }),
}));

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  readonly OPEN = 1;
  readyState = 1;
  onmessage: ((event: MessageEvent) => void | Promise<void>) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string, protocols: string[]) {
    void url;
    void protocols;
    MockWebSocket.instances.push(this);
  }

  close(): void {
    this.readyState = 3;
    this.onclose?.({ code: 1000 } as CloseEvent);
  }
}

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  MockWebSocket.instances = [];
  refreshUser.mockReset();
  refreshUser.mockResolvedValue(null);
  sessionStorage.setItem(TOKEN_KEY, 'internal-token');
  vi.stubGlobal('WebSocket', MockWebSocket);
});

afterEach(() => {
  sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('useWebSocket access updates', () => {
  it('refreshes the account and permission matrix when access changes', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidatePermissions = vi.spyOn(client, 'invalidateQueries');

    renderHook(() => useWebSocket(), { wrapper: wrapperFor(client) });

    await waitFor(() => expect(MockWebSocket.instances).toHaveLength(1));
    const socket = MockWebSocket.instances[0];

    await act(async () => {
      await socket.onmessage?.({
        data: JSON.stringify({
          type: 'access:updated',
          data: { reason: 'capability_changed' },
        }),
      } as MessageEvent);
    });

    expect(refreshUser).toHaveBeenCalledTimes(1);
    expect(invalidatePermissions).toHaveBeenCalledWith({ queryKey: MY_PERMISSIONS_KEY });
  });
});
