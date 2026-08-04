import type { ReactElement, ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MY_PERMISSIONS_KEY } from './usePermissions';
import { trackingKey } from './useTrackShipment';
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

describe('useWebSocket batch movement', () => {
  // The event carries only an id. The new stage must always come from a
  // refetch, never from the socket message.
  it('refetches the batch movement endpoints on batch:movement_updated', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(client, 'invalidateQueries');

    renderHook(() => useWebSocket(), { wrapper: wrapperFor(client) });

    await waitFor(() => expect(MockWebSocket.instances).toHaveLength(1));
    const socket = MockWebSocket.instances[0];

    await act(async () => {
      await socket.onmessage?.({
        data: JSON.stringify({
          type: 'batch:movement_updated',
          data: { batchId: 'batch-1' },
        }),
      } as MessageEvent);
    });

    // Covers both /status and /history, which share this key prefix.
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['shipments', 'batches', 'batch-1'],
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['batches', 'roster', 'batch-1'],
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['batches', 'list'] });
  });

  it('ignores the event when it carries no batch id', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(client, 'invalidateQueries');

    renderHook(() => useWebSocket(), { wrapper: wrapperFor(client) });

    await waitFor(() => expect(MockWebSocket.instances).toHaveLength(1));
    const socket = MockWebSocket.instances[0];

    await act(async () => {
      await socket.onmessage?.({
        data: JSON.stringify({ type: 'batch:movement_updated', data: {} }),
      } as MessageEvent);
    });

    expect(invalidate).not.toHaveBeenCalledWith({
      queryKey: ['shipments', 'batches', ''],
    });
  });

  it('refreshes a customer tracking page named by a batch notification', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(client, 'invalidateQueries');

    renderHook(() => useWebSocket(), { wrapper: wrapperFor(client) });

    await waitFor(() => expect(MockWebSocket.instances).toHaveLength(1));
    const socket = MockWebSocket.instances[0];

    await act(async () => {
      await socket.onmessage?.({
        data: JSON.stringify({
          type: 'notification:new',
          data: {
            title: 'Your shipment moved',
            body: 'Your goods are on their way.',
            metadata: { customerBatchTrackingNumber: '20260804-A1B2' },
          },
        }),
      } as MessageEvent);
    });

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: trackingKey('20260804-A1B2'),
    });
  });
});
