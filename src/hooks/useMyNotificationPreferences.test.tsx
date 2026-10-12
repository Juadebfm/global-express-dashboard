import type { ReactElement, ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotificationPreferences } from '@/types';
import { useMyNotificationPreferences } from './useMyNotificationPreferences';

const authState: { user: { id: string; role: string } | null } = {
  user: { id: 'internal-1', role: 'staff' },
};
const clerkState = { isSignedIn: false };
const getAuthToken = vi.fn<() => Promise<string | null>>();
const getMyNotificationPreferences = vi.fn<(...args: unknown[]) => Promise<NotificationPreferences>>();
const updateMyNotificationPreferences = vi.fn<(...args: unknown[]) => Promise<NotificationPreferences>>();

vi.mock('./useAuth', () => ({ useAuth: () => authState }));
vi.mock('./useAuthToken', () => ({ useAuthToken: () => getAuthToken }));
vi.mock('@clerk/clerk-react', () => ({ useAuth: () => clerkState }));
vi.mock('@/services', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services')>();
  return {
    ...actual,
    getMyNotificationPreferences: (...args: unknown[]) => getMyNotificationPreferences(...args),
    updateMyNotificationPreferences: (...args: unknown[]) => updateMyNotificationPreferences(...args),
  };
});

function preferences(notifyInternalActivityEmails: boolean): NotificationPreferences {
  return {
    channels: {
      notifyEmailAlerts: false,
      notifySmsAlerts: false,
      notifyInAppAlerts: false,
      consentMarketing: false,
    },
    notifyInternalActivityEmails,
  };
}

function wrapperFor(client: QueryClient) {
  return ({ children }: { children: ReactNode }): ReactElement => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

function makeClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
}

beforeEach(() => {
  authState.user = { id: 'internal-1', role: 'staff' };
  clerkState.isSignedIn = false;
  getAuthToken.mockResolvedValue('internal-bearer-token');
  getMyNotificationPreferences.mockReset();
  updateMyNotificationPreferences.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useMyNotificationPreferences for internal users', () => {
  it.each(['staff', 'admin', 'superadmin'])('loads for %s using the signed-in internal token', async (role) => {
    authState.user = { id: 'internal-1', role };
    getMyNotificationPreferences.mockResolvedValue(preferences(true));

    const client = makeClient();
    const { result } = renderHook(() => useMyNotificationPreferences(), {
      wrapper: wrapperFor(client),
    });

    await waitFor(() => expect(result.current.preferences?.notifyInternalActivityEmails).toBe(true));
    expect(getAuthToken).toHaveBeenCalled();
    expect(getMyNotificationPreferences).toHaveBeenCalledWith('internal-bearer-token', true);
  });

  it('keeps the displayed value until the backend confirms the update', async () => {
    getMyNotificationPreferences.mockResolvedValue(preferences(true));
    let resolveSave: ((value: NotificationPreferences) => void) | undefined;
    updateMyNotificationPreferences.mockImplementation(
      () => new Promise((resolve) => { resolveSave = resolve; }),
    );

    const client = makeClient();
    const { result } = renderHook(() => useMyNotificationPreferences(), {
      wrapper: wrapperFor(client),
    });
    await waitFor(() => expect(result.current.preferences?.notifyInternalActivityEmails).toBe(true));

    let savePromise: Promise<void> | undefined;
    act(() => {
      savePromise = result.current.updateInternalActivityEmails(false);
    });
    await waitFor(() => expect(result.current.isSaving).toBe(true));
    expect(result.current.preferences?.notifyInternalActivityEmails).toBe(true);
    expect(updateMyNotificationPreferences).toHaveBeenCalledWith(
      'internal-bearer-token',
      { notifyInternalActivityEmails: false },
    );

    await act(async () => {
      resolveSave?.(preferences(false));
      await savePromise;
    });
    await waitFor(() => expect(result.current.preferences?.notifyInternalActivityEmails).toBe(false));
  });

  it('keeps the prior value and exposes an error when the backend rejects a save', async () => {
    getMyNotificationPreferences.mockResolvedValue(preferences(true));
    updateMyNotificationPreferences.mockRejectedValue(new Error('You cannot update this setting.'));

    const client = makeClient();
    const { result } = renderHook(() => useMyNotificationPreferences(), {
      wrapper: wrapperFor(client),
    });
    await waitFor(() => expect(result.current.preferences?.notifyInternalActivityEmails).toBe(true));

    await act(async () => {
      await expect(result.current.updateInternalActivityEmails(false)).rejects.toThrow(
        'You cannot update this setting.',
      );
    });

    await waitFor(() => {
      expect(result.current.preferences?.notifyInternalActivityEmails).toBe(true);
      expect(result.current.saveError).toBe('You cannot update this setting.');
    });
  });

  it('does not expose the GEX preference write to customer sessions', async () => {
    authState.user = null;
    clerkState.isSignedIn = true;
    getMyNotificationPreferences.mockResolvedValue(preferences(true));

    const client = makeClient();
    const { result } = renderHook(() => useMyNotificationPreferences(), {
      wrapper: wrapperFor(client),
    });
    await waitFor(() => expect(result.current.preferences).not.toBeNull());

    await act(async () => {
      await expect(result.current.updateInternalActivityEmails(false)).rejects.toThrow(
        'GEX activity email preferences are only available to internal users.',
      );
    });
    expect(updateMyNotificationPreferences).not.toHaveBeenCalled();
  });
});
