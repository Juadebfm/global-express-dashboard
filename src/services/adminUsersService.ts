import type { AdminUserListParams, UpdateUserPayload, ChangeUserRolePayload } from '@/types';
import type { User } from '@/types';
import { apiGet, apiPatch, apiDelete } from '@/lib/apiClient';

interface UsersResponse {
  success: boolean;
  data: {
    data: User[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export async function getUsers(
  token: string,
  params: AdminUserListParams = {}
): Promise<UsersResponse['data']> {
  const searchParams = new URLSearchParams();
  if (params.page !== undefined) searchParams.set('page', String(params.page));
  if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
  if (params.role) searchParams.set('role', params.role);
  if (params.isActive !== undefined) searchParams.set('isActive', String(params.isActive));
  const qs = searchParams.toString();
  const response = await apiGet<UsersResponse>(
    `/users${qs ? `?${qs}` : ''}`,
    token
  );
  return response.data;
}

export async function getUserById(
  token: string,
  id: string
): Promise<User> {
  const response = await apiGet<{ success: boolean; data: User }>(
    `/users/${id}`,
    token
  );
  return response.data;
}

export async function updateUser(
  token: string,
  id: string,
  payload: UpdateUserPayload
): Promise<User> {
  const response = await apiPatch<{ success: boolean; data: User }>(
    `/users/${id}`,
    payload,
    token
  );
  return response.data;
}

export async function changeUserRole(
  token: string,
  id: string,
  payload: ChangeUserRolePayload
): Promise<void> {
  await apiPatch(`/users/${id}/role`, payload, token);
}

export async function deleteUser(
  token: string,
  id: string
): Promise<void> {
  await apiDelete(`/users/${id}`, token);
}
