import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';

const logout = vi.fn();
const navigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

vi.mock('@/hooks', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/hooks');
  return {
    ...actual,
    useAuth: () => ({ user: { role: 'admin', email: 'staff@example.com' }, logout }),
    useCurrentUserAvatar: () => ({ data: null }),
    useCan: () => true,
    useCapability: () => true,
    usePermissions: () => ({ isLoading: false, has: () => true }),
    useNotificationCount: () => ({ data: 0 }),
    useOpenSupportTicketCount: () => ({ data: 0 }),
    useUndeliveredOrderCount: () => ({ data: 0 }),
    usePendingPaymentsCount: () => ({ data: 0 }),
  };
});

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ isSignedIn: false, signOut: vi.fn() }),
  useUser: () => ({ user: null }),
}));

function renderSidebar() {
  return render(
    <MemoryRouter>
      <Sidebar items={[]} footerItems={[]} isMobileOpen={false} onCloseMobile={vi.fn()} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  logout.mockReset();
  navigate.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('Sidebar sign out', () => {
  // Signing out is a network round trip. Without a busy state the control sits
  // there looking idle and clickable while the request runs.
  it('shows it is working and disables the control', async () => {
    let finishLogout: (() => void) | undefined;
    logout.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishLogout = resolve;
        }),
    );

    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: /Sign out/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Signing out/i })).toBeDisabled();
    });

    finishLogout?.();
    await waitFor(() => expect(navigate).toHaveBeenCalled());
  });

  it('does not fire a second logout on a repeat click', async () => {
    logout.mockImplementation(() => new Promise<void>(() => {}));

    renderSidebar();
    const button = screen.getByRole('button', { name: /Sign out/i });
    fireEvent.click(button);

    const busy = await screen.findByRole('button', { name: /Signing out/i });
    fireEvent.click(busy);
    fireEvent.click(busy);

    expect(logout).toHaveBeenCalledTimes(1);
  });
});
