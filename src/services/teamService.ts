import type { ApiTeamResponse } from '@/types';
import { apiGetData, apiPatch, apiPost } from '@/lib/apiClient';

export interface CreateTeamMemberPayload {
  email: string;
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

export function getTeam(
  token: string,
  params: { role?: string; isActive?: boolean; page?: number; limit?: number } = {}
): Promise<ApiTeamResponse['data']> {
  const searchParams = new URLSearchParams();
  if (params.role) searchParams.set('role', params.role);
  if (params.isActive !== undefined) searchParams.set('isActive', String(params.isActive));
  if (params.page !== undefined) searchParams.set('page', String(params.page));
  searchParams.set('limit', String(params.limit ?? 100));
  const qs = searchParams.toString();
  return apiGetData<ApiTeamResponse['data']>(`/team${qs ? `?${qs}` : ''}`, token);
}

export async function approveTeamMember(
  token: string,
  id: string
): Promise<void> {
  await apiPatch(`/team/${id}/approve`, undefined, token);
}
