import type {
  ApiClient,
  ApiClientsResponse,
  ApiOrder,
  ApiSupplier,
  ClientWorkbenchData,
  CreateClientPayload,
  CreateGoodsIntakePayload,
  AddSupplierPayload,
  AddSupplierResult,
  PaginatedSuppliers,
  SupplierListParams,
} from '@/types';
import { apiGet, apiPost } from '@/lib/apiClient';

interface Envelope<T> {
  success: boolean;
  data: T;
}

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

// ── Admin client workbench ──────────────────────────────────────────────────

export async function getClientWorkbench(
  token: string,
  id: string,
): Promise<ClientWorkbenchData<ApiSupplier, ApiOrder>> {
  const response = await apiGet<Envelope<ClientWorkbenchData<ApiSupplier, ApiOrder>>>(
    `/admin/clients/${id}/workbench`,
    token,
  );
  return response.data;
}

export async function getClientSuppliers(
  token: string,
  id: string,
  params: SupplierListParams = {},
): Promise<PaginatedSuppliers> {
  const search = new URLSearchParams();
  if (params.page !== undefined) search.set('page', String(params.page));
  if (params.limit !== undefined) search.set('limit', String(params.limit));
  if (params.isActive !== undefined) search.set('isActive', String(params.isActive));
  const qs = search.toString();
  const response = await apiGet<Envelope<PaginatedSuppliers>>(
    `/admin/clients/${id}/suppliers${qs ? `?${qs}` : ''}`,
    token,
  );
  return response.data;
}

export async function addClientSupplier(
  token: string,
  id: string,
  payload: AddSupplierPayload,
): Promise<AddSupplierResult> {
  const response = await apiPost<Envelope<AddSupplierResult>>(
    `/admin/clients/${id}/suppliers`,
    payload,
    token,
  );
  return response.data;
}

export async function createClientGoodsIntake(
  token: string,
  id: string,
  payload: CreateGoodsIntakePayload,
): Promise<ApiOrder> {
  const response = await apiPost<Envelope<ApiOrder>>(
    `/admin/clients/${id}/goods-intake`,
    payload,
    token,
  );
  return response.data;
}
