import type { ApiClientsResponse, ApiClient, CreateClientPayload } from '@/types';
import { apiGet, apiPost } from '@/lib/apiClient';

export async function getClients(
  token: string,
  params: { page?: number; limit?: number; isActive?: boolean } = {}
): Promise<ApiClientsResponse['data']> {
  const searchParams = new URLSearchParams();
  if (params.page !== undefined) searchParams.set('page', String(params.page));
  searchParams.set('limit', String(params.limit ?? 100));
  if (params.isActive !== undefined) searchParams.set('isActive', String(params.isActive));
  const qs = searchParams.toString();
  const response = await apiGet<ApiClientsResponse>(
    `/admin/clients${qs ? `?${qs}` : ''}`,
    token
  );
  return response.data;
}

export async function getClientById(
  token: string,
  id: string
): Promise<ApiClient> {
  const response = await apiGet<{ success: boolean; data: ApiClient }>(
    `/admin/clients/${id}`,
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
  return apiGet(`/admin/clients/${id}/orders${qs ? `?${qs}` : ''}`, token);
}

export async function createClient(
  token: string,
  payload: CreateClientPayload
): Promise<ApiClient> {
  const response = await apiPost<{ success: boolean; data: ApiClient }>(
    '/admin/clients',
    payload,
    token
  );
  return response.data;
}

export async function sendClientInvite(
  token: string,
  id: string
): Promise<void> {
  await apiPost(`/admin/clients/${id}/send-invite`, undefined, token);
}
