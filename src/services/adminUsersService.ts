import type { AdminUserListParams, UpdateUserPayload, ChangeUserRolePayload } from '@/types';
import type { User } from '@/types';
import { apiDelete, apiGetData, apiPatch, apiPatchData } from '@/lib/apiClient';

export interface UsersListData {
  data: User[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function getUsers(
  token: string,
  params: AdminUserListParams = {}
): Promise<UsersListData> {
  const searchParams = new URLSearchParams();
  if (params.page !== undefined) searchParams.set('page', String(params.page));
  if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
  if (params.role) searchParams.set('role', params.role);
  if (params.isActive !== undefined) searchParams.set('isActive', String(params.isActive));
  const qs = searchParams.toString();
  return apiGetData<UsersListData>(`/users${qs ? `?${qs}` : ''}`, token);
}

export function getUserById(token: string, id: string): Promise<User> {
  return apiGetData<User>(`/users/${id}`, token);
}

export function updateUser(
  token: string,
  id: string,
  payload: UpdateUserPayload
): Promise<User> {
  return apiPatchData<User>(`/users/${id}`, payload, token);
}

export async function changeUserRole(
  token: string,
  id: string,
  payload: ChangeUserRolePayload
): Promise<void> {
  await apiPatch(`/users/${id}/role`, payload, token);
}

export async function deleteUser(token: string, id: string): Promise<void> {
  await apiDelete(`/users/${id}`, token);
}

export function updateClientLoginPermission(
  token: string,
  id: string,
  canProvisionClientLogin: boolean
): Promise<User> {
  return apiPatchData<User>(
    `/users/${id}/client-login-permission`,
    { canProvisionClientLogin },
    token,
  );
}

export function updateShipmentBatchPermission(
  token: string,
  id: string,
  canManageShipmentBatches: boolean
): Promise<User> {
  return apiPatchData<User>(
    `/users/${id}/shipment-batch-permission`,
    { canManageShipmentBatches },
    token,
  );
}
