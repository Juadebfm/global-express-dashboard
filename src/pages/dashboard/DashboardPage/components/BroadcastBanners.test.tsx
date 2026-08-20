import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/hooks', () => ({
  useNotifications: vi.fn(),
}));

import { useNotifications } from '@/hooks';
import type { ApiNotification } from '@/types';
import { BroadcastBanners } from './BroadcastBanners';

const deleteOne = vi.fn();

function makeBroadcast(overrides: Partial<ApiNotification> = {}): ApiNotification {
  return {
    id: 'broadcast-1',
    type: 'system_announcement',
    title: 'Older announcement',
    message: 'Older message',
    body: 'Older message',
    metadata: {},
    isRead: false,
    isSaved: false,
    isBroadcast: true,
    createdAt: '2026-08-20T08:00:00.000Z',
    updatedAt: '2026-08-20T08:00:00.000Z',
    ...overrides,
  };
}

function renderBanners(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <BroadcastBanners />
    </MemoryRouter>,
  );
}

function notificationState(notifications: ApiNotification[]): ReturnType<typeof useNotifications> {
  return {
    notifications,
    total: notifications.length,
    isLoading: false,
    error: null,
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    toggleSave: vi.fn(),
    deleteOne,
    deleteBulk: vi.fn(),
    refresh: vi.fn(),
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('BroadcastBanners', () => {
  it('shows only the newest unread broadcast and reveals the next one after dismissal', () => {
    const older = makeBroadcast();
    const newer = makeBroadcast({
      id: 'broadcast-2',
      title: 'Newest announcement',
      body: 'Newest message',
      message: 'Newest message',
      createdAt: '2026-08-20T09:00:00.000Z',
    });

    vi.mocked(useNotifications).mockReturnValue(notificationState([older, newer]));

    const view = renderBanners();

    expect(view.getByText('Newest announcement')).toBeInTheDocument();
    expect(view.queryByText('Older announcement')).not.toBeInTheDocument();

    fireEvent.click(view.getByRole('button', { name: 'Dismiss announcement' }));
    expect(deleteOne).toHaveBeenCalledWith('broadcast-2');

    vi.mocked(useNotifications).mockReturnValue(notificationState([older]));
    view.rerender(
      <MemoryRouter>
        <BroadcastBanners />
      </MemoryRouter>,
    );

    expect(view.getByText('Older announcement')).toBeInTheDocument();
  });
});
