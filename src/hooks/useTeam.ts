import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import type { TeamMember, TeamPermissions, TeamRole, ApiTeamMember } from '@/types';
import { getTeam, approveTeamMember, createTeamMember } from '@/services';
import type { CreateTeamMemberPayload } from '@/services';
import { useAuth } from './useAuth';

const TOKEN_KEY = 'globalxpress_token';

function derivePermissions(member: ApiTeamMember): TeamPermissions {
  const makeAdmin = member.role === 'admin' || member.role === 'superadmin';
  return {
    makeAdmin,
    canTransfer: makeAdmin,
    viewOnly: !makeAdmin,
  };
}

function mapApiTeamMember(m: ApiTeamMember): TeamMember {
  const displayName = m.displayName || `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() || m.email;
  return {
    id: m.id,
    fullName: displayName,
    email: m.email,
    role: m.role as TeamRole,
    permissions: derivePermissions(m),
    approvalStatus: m.isActive ? 'approved' : 'pending',
  };
}

interface TeamState {
  members: TeamMember[];
  isLoading: boolean;
  error: string | null;
  approveMember: (id: string) => void;
  inviteMember: (payload: CreateTeamMemberPayload) => Promise<void>;
  isInviting: boolean;
}

export function useTeam(): TeamState {
  const { user } = useAuth();
  const { isSignedIn: isClerkSignedIn, getToken } = useClerkAuth();
  const queryClient = useQueryClient();

  const isCustomer = isClerkSignedIn && !user;
  const role = user?.role;
  const enabled = !!role && (role === 'admin' || role === 'superadmin');

  const getToken_ = async (): Promise<string | null> => {
    if (isCustomer) return getToken();
    return localStorage.getItem(TOKEN_KEY);
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['team'],
    queryFn: async () => {
      const token = await getToken_();
      if (!token) throw new Error('Not authenticated');
      const result = await getTeam(token);
      return result.data.map(mapApiTeamMember);
    },
    enabled,
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken_();
      if (!token) throw new Error('Not authenticated');
      return approveTeamMember(token, id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['team'] });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (payload: CreateTeamMemberPayload) => {
      const token = await getToken_();
      if (!token) throw new Error('Not authenticated');
      return createTeamMember(token, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['team'] });
    },
  });

  const message =
    error instanceof Error ? error.message : error ? 'Failed to load team' : null;

  return {
    members: data ?? [],
    isLoading,
    error: message,
    approveMember: (id: string) => approveMutation.mutate(id),
    inviteMember: (payload: CreateTeamMemberPayload) => inviteMutation.mutateAsync(payload),
    isInviting: inviteMutation.isPending,
  };
}
