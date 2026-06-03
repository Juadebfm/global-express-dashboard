import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import type {
  TeamMember,
  TeamPermissions,
  TeamRole,
  ApiTeamMember,
  ApiTeamResponse,
} from '@/types';
import { getTeam, approveTeamMember, createTeamMember } from '@/services';
import type { CreateTeamMemberPayload } from '@/services';
import { STALE_TIME } from '@/lib/queryDefaults';
import { can } from '@/lib/permissions';
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
  pagination: ApiTeamResponse['data']['pagination'];
  isLoading: boolean;
  error: string | null;
  approveMember: (id: string) => void;
  inviteMember: (payload: CreateTeamMemberPayload) => Promise<void>;
  isInviting: boolean;
}

interface UseTeamParams {
  page?: number;
  limit?: number;
}

const DEFAULT_TEAM_PAGE_SIZE = 20;

export function useTeam(params: UseTeamParams = {}): TeamState {
  const page = params.page ?? 1;
  const limit = params.limit ?? DEFAULT_TEAM_PAGE_SIZE;
  const { user } = useAuth();
  const { isSignedIn: isClerkSignedIn, getToken } = useClerkAuth();
  const queryClient = useQueryClient();

  const isCustomer = isClerkSignedIn && !user;
  const enabled = can(user?.role, 'team.view');

  const getToken_ = async (): Promise<string | null> => {
    if (isCustomer) return getToken();
    return localStorage.getItem(TOKEN_KEY);
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['team', page, limit],
    queryFn: async () => {
      const token = await getToken_();
      if (!token) throw new Error('Not authenticated');
      return getTeam(token, { page, limit });
    },
    enabled,
    staleTime: STALE_TIME.REAL_TIME,
  });

  // Fall back to the requested params so Pagination has stable numbers
  // while the first request is in flight.
  const pagination = data?.pagination ?? { total: 0, page, limit, totalPages: 1 };
  const members = (data?.data ?? []).map(mapApiTeamMember);

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
    members,
    pagination,
    isLoading,
    error: message,
    approveMember: (id: string) => approveMutation.mutate(id),
    inviteMember: (payload: CreateTeamMemberPayload) => inviteMutation.mutateAsync(payload),
    isInviting: inviteMutation.isPending,
  };
}
