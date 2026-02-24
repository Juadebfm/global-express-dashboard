import { useQuery } from '@tanstack/react-query';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import type { TeamMember, TeamPermissions, TeamRole, ApiTeamMember } from '@/types';
import { getTeam } from '@/services';
import { useAuth } from './useAuth';

const TOKEN_KEY = 'globalxpress_token';

function mapPermissions(member: ApiTeamMember): TeamPermissions {
  const perms = member.permissions;
  const makeAdmin =
    member.role === 'admin' ||
    member.role === 'superadmin' ||
    perms.includes('Manage Team');
  const canTransfer = perms.includes('Manage Orders') || makeAdmin;
  const viewOnly =
    perms.includes('View Reports') && !makeAdmin && !perms.includes('Manage Orders');
  return { makeAdmin, canTransfer, viewOnly };
}

function mapApiTeamMember(m: ApiTeamMember): TeamMember {
  return {
    id: m.id,
    fullName: m.name,
    email: m.email,
    role: m.role as TeamRole,
    permissions: mapPermissions(m),
    approvalStatus: m.isActive ? 'approved' : 'pending',
  };
}

interface TeamState {
  members: TeamMember[];
  isLoading: boolean;
  error: string | null;
}

export function useTeam(): TeamState {
  const { user } = useAuth();
  const { isSignedIn: isClerkSignedIn, getToken } = useClerkAuth();

  const isCustomer = isClerkSignedIn && !user;
  const role = user?.role;
  const enabled = !!role && (role === 'admin' || role === 'superadmin');

  const { data, isLoading, error } = useQuery({
    queryKey: ['team'],
    queryFn: async () => {
      const token = isCustomer ? await getToken() : localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      const members = await getTeam(token);
      return members.map(mapApiTeamMember);
    },
    enabled,
  });

  const message =
    error instanceof Error ? error.message : error ? 'Failed to load team' : null;

  return {
    members: data ?? [],
    isLoading,
    error: message,
  };
}
