import type { ApiTeamResponse } from '@/types';
import { apiGetData, apiPatch, apiPost } from '@/lib/apiClient';

export interface CreateTeamMemberPayload {
  email: string;
  phone: string;
  role: 'staff' | 'admin' | 'superadmin';
  firstName: string;
  lastName: string;
  position?: string;
}

export async function createTeamMember(
  token: string,
  payload: CreateTeamMemberPayload
): Promise<void> {
  await apiPost('/internal/users', payload, token);
}

// Canonical list of position strings staff have used so far — not a fixed
// enum, not validated server-side. Grows automatically whenever someone
// picks "Others" and types a new title; this is just what populates the
// dropdown, never a source of truth for validation.
export function getPositions(token: string): Promise<string[]> {
  return apiGetData<string[]>('/internal/positions', token);
}

export function getTeam(
  token: string,
  params: { q?: string; role?: string; isActive?: boolean; page?: number; limit?: number } = {}
): Promise<ApiTeamResponse['data']> {
  const searchParams = new URLSearchParams();
  if (params.q?.trim()) searchParams.set('q', params.q.trim());
  if (params.role) searchParams.set('role', params.role);
  if (params.isActive !== undefined) searchParams.set('isActive', String(params.isActive));
  if (params.page !== undefined) searchParams.set('page', String(params.page));
  // Default matches the BE + the rest of the FE (ShipmentsPage etc).
  // TeamPage paginates explicitly so the headline + Prev/Next stay
  // honest about the full result set.
  searchParams.set('limit', String(params.limit ?? 20));
  const qs = searchParams.toString();
  return apiGetData<ApiTeamResponse['data']>(`/team${qs ? `?${qs}` : ''}`, token);
}

export async function approveTeamMember(
  token: string,
  id: string
): Promise<void> {
  await apiPatch(`/team/${id}/approve`, undefined, token);
}
