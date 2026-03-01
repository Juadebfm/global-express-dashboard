import type { ApiClientsResponse, ApiClient, CreateClientPayload } from '@/types';
import { apiGet, apiPost } from '@/lib/apiClient';

export async function getClients(
  token: string,
  params: { page?: number; limit?: number; isActive?: boolean } = {}
): Promise<ApiClientsResponse['data']> {
  const searchParams = new URLSearchParams();
  searchParams.set('role', 'user');
  if (params.page !== undefined) searchParams.set('page', String(params.page));
  searchParams.set('limit', String(params.limit ?? 100));
  if (params.isActive !== undefined) searchParams.set('isActive', String(params.isActive));
  const qs = searchParams.toString();
  const response = await apiGet<ApiClientsResponse>(
    `/users?${qs}`,
    token
  );
  return response.data;
}

export async function getClientById(
  token: string,
  id: string
): Promise<ApiClient> {
  const response = await apiGet<{ success: boolean; data: ApiClient }>(
    `/users/${id}`,
    token
  );
  return response.data;
}

export async function getClientOrders(
  token: string,
  id: string,
  params: { page?: number; limit?: number } = {}
): Promise<unknown> {
  const searchParams = new URLSearchParams();
  if (params.page !== undefined) searchParams.set('page', String(params.page));
  if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();
  return apiGet(`/users/${id}/orders${qs ? `?${qs}` : ''}`, token);
}

export async function createClient(
  token: string,
  payload: CreateClientPayload
): Promise<ApiClient> {
  const response = await apiPost<{ success: boolean; data: ApiClient }>(
    '/users',
    payload,
    token
  );
  return response.data;
}

export async function sendClientInvite(
  token: string,
  id: string
): Promise<void> {
  await apiPost(`/users/${id}/send-invite`, undefined, token);
}
