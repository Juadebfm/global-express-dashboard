import type { ApiTeamResponse } from '@/types';
import { apiGet, apiPatch, apiPost } from '@/lib/apiClient';

export interface CreateTeamMemberPayload {
  email: string;
  password: string;
  role: string;
  firstName: string;
  lastName: string;
}

export async function createTeamMember(
  token: string,
  payload: CreateTeamMemberPayload
): Promise<void> {
  await apiPost('/internal/users', payload, token);
}

export async function getTeam(
  token: string,
  params: { role?: string; isActive?: boolean; page?: number; limit?: number } = {}
): Promise<ApiTeamResponse['data']> {
  const searchParams = new URLSearchParams();
  if (params.role) searchParams.set('role', params.role);
  if (params.isActive !== undefined) searchParams.set('isActive', String(params.isActive));
  if (params.page !== undefined) searchParams.set('page', String(params.page));
  searchParams.set('limit', String(params.limit ?? 100));
  const qs = searchParams.toString();
  const response = await apiGet<ApiTeamResponse>(
    `/team${qs ? `?${qs}` : ''}`,
    token
  );
  return response.data;
}

export async function approveTeamMember(
  token: string,
  id: string
): Promise<void> {
  await apiPatch(`/team/${id}/approve`, undefined, token);
}
