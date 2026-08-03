import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';

vi.mock('@/hooks', async () => {
  const actual = await vi.importActual<typeof import('@/hooks')>('@/hooks');
  return {
    ...actual,
    useTeam: vi.fn(),
    useUserPermissions: vi.fn(),
    useSetUserCapability: vi.fn(),
  };
});

const pushMessage = vi.fn(() => 'toast-1');
const dismissMessage = vi.fn();
vi.mock('@/store/feedback/feedback.store', () => ({
  useFeedbackStore: (selector: (state: { pushMessage: typeof pushMessage; dismissMessage: typeof dismissMessage }) => unknown) =>
    selector({ pushMessage, dismissMessage }),
}));

import '@/i18n/i18n';
import { useSetUserCapability, useTeam, useUserPermissions } from '@/hooks';
import { TeamAccessPanel } from './TeamAccessPanel';
import type { Capability, PermissionsMatrix, TeamMember } from '@/types';

const MEMBER: TeamMember = {
  id: 'member-1',
  fullName: 'Lawal Ayobami',
  email: 'lawal@example.com',
  role: 'staff',
  position: 'Local logistics',
  permissions: { makeAdmin: false, canTransfer: false, viewOnly: true },
  approvalStatus: 'approved',
};

const CAPABILITY: Capability = {
  key: 'local_delivery.manage',
  name: 'Manage local delivery',
  minimumRole: 'staff',
  description: 'Manage local deliveries.',
  includes: [],
  eligible: true,
  granted: false,
};

const MATRIX: PermissionsMatrix = {
  userId: MEMBER.id,
  role: 'staff',
  isActive: true,
  capabilities: [CAPABILITY],
};

const mutateAsync = vi.fn(() => Promise.resolve(MATRIX));

function programHooks(): void {
  vi.mocked(useTeam).mockReturnValue({
    members: [MEMBER],
    pagination: { page: 1, limit: 20, total: 21, totalPages: 2 },
    isLoading: false,
    error: null,
    approveMember: vi.fn(),
    inviteMember: vi.fn(),
    isInviting: false,
  });
  vi.mocked(useUserPermissions).mockReturnValue({
    data: MATRIX,
    isLoading: false,
    error: null,
  } as ReturnType<typeof useUserPermissions>);
  vi.mocked(useSetUserCapability).mockReturnValue({
    mutateAsync,
    isPending: false,
  } as unknown as ReturnType<typeof useSetUserCapability>);
}

beforeEach(() => {
  programHooks();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('TeamAccessPanel', () => {
  it('uses its own server-side query and resets to the first page when searching', () => {
    const { getByPlaceholderText } = render(<TeamAccessPanel onEditMember={() => {}} />);

    fireEvent.change(getByPlaceholderText('Search name or email'), { target: { value: 'lawal' } });

    expect(vi.mocked(useTeam).mock.calls.at(-1)?.[0]).toEqual({
      q: 'lawal',
      page: 1,
      limit: 20,
    });
  });

  it('selects a person, saves a toggle immediately, and replaces its prior toast on the next action', async () => {
    const { getByText, getByRole } = render(<TeamAccessPanel onEditMember={() => {}} />);

    fireEvent.click(getByText('Lawal Ayobami'));
    fireEvent.click(getByRole('switch', { name: 'Grant Manage local delivery' }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        userId: MEMBER.id,
        capability: CAPABILITY.key,
        enabled: true,
      });
    });
    expect(pushMessage).toHaveBeenCalledWith(
      expect.objectContaining({ tone: 'success', durationMs: 5000 }),
    );

    fireEvent.click(getByRole('switch', { name: 'Grant Manage local delivery' }));
    await waitFor(() => expect(dismissMessage).toHaveBeenCalledWith('toast-1'));
  });

  it('clears the current selection before loading another access-list page', () => {
    const { getByLabelText, getByText } = render(<TeamAccessPanel onEditMember={() => {}} />);

    fireEvent.click(getByText('Lawal Ayobami'));
    fireEvent.click(getByLabelText('Next'));

    expect(vi.mocked(useTeam).mock.calls.at(-1)?.[0]).toEqual({
      q: undefined,
      page: 2,
      limit: 20,
    });
    expect(useUserPermissions).toHaveBeenLastCalledWith(null);
  });

  it('opens the existing role-change flow for the selected person', () => {
    const onEditMember = vi.fn();
    const { getByText } = render(<TeamAccessPanel onEditMember={onEditMember} />);

    fireEvent.click(getByText('Lawal Ayobami'));
    fireEvent.click(getByText('Change role'));

    expect(onEditMember).toHaveBeenCalledWith(MEMBER);
  });
});
