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
import { apiGet, apiGetData, apiPost, apiPostData } from '@/lib/apiClient';

export function getClients(
  token: string,
  params: { page?: number; limit?: number; isActive?: boolean } = {}
): Promise<ApiClientsResponse['data']> {
  const searchParams = new URLSearchParams();
  if (params.page !== undefined) searchParams.set('page', String(params.page));
  // Default stays at 100 (BE max) pending ClientsPage pagination AND a
  // search-on-type autocomplete for the new-shipment customer picker.
  // Lowering this to 20 right now would silently truncate both surfaces.
  // BulkOrdersPage already overrides to 50 with its own follow-up note.
  searchParams.set('limit', String(params.limit ?? 100));
  if (params.isActive !== undefined) searchParams.set('isActive', String(params.isActive));
  const qs = searchParams.toString();
  return apiGetData<ApiClientsResponse['data']>(
    `/admin/clients${qs ? `?${qs}` : ''}`,
    token,
  );
}

export function getClientById(token: string, id: string): Promise<ApiClient> {
  return apiGetData<ApiClient>(`/admin/clients/${id}`, token);
}

export function getClientOrders(
  token: string,
  id: string,
  params: { page?: number; limit?: number } = {}
): Promise<unknown> {
  const searchParams = new URLSearchParams();
  if (params.page !== undefined) searchParams.set('page', String(params.page));
  if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();
  // Raw payload — caller handles defensive shape extraction.
  return apiGet(`/admin/clients/${id}/orders${qs ? `?${qs}` : ''}`, token);
}

export function createClient(
  token: string,
  payload: CreateClientPayload
): Promise<ApiClient> {
  return apiPostData<ApiClient>('/admin/clients', payload, token);
}

export async function sendClientInvite(token: string, id: string): Promise<void> {
  await apiPost(`/admin/clients/${id}/send-invite`, undefined, token);
}

// ── Admin client workbench ──────────────────────────────────────────────────

export function getClientWorkbench(
  token: string,
  id: string,
): Promise<ClientWorkbenchData<ApiSupplier, ApiOrder>> {
  return apiGetData<ClientWorkbenchData<ApiSupplier, ApiOrder>>(
    `/admin/clients/${id}/workbench`,
    token,
  );
}

export function getClientSuppliers(
  token: string,
  id: string,
  params: SupplierListParams = {},
): Promise<PaginatedSuppliers> {
  const search = new URLSearchParams();
  if (params.page !== undefined) search.set('page', String(params.page));
  if (params.limit !== undefined) search.set('limit', String(params.limit));
  if (params.isActive !== undefined) search.set('isActive', String(params.isActive));
  const qs = search.toString();
  return apiGetData<PaginatedSuppliers>(
    `/admin/clients/${id}/suppliers${qs ? `?${qs}` : ''}`,
    token,
  );
}

export function addClientSupplier(
  token: string,
  id: string,
  payload: AddSupplierPayload,
): Promise<AddSupplierResult> {
  return apiPostData<AddSupplierResult>(
    `/admin/clients/${id}/suppliers`,
    payload,
    token,
  );
}

export function createClientGoodsIntake(
  token: string,
  id: string,
  payload: CreateGoodsIntakePayload,
): Promise<ApiOrder> {
  return apiPostData<ApiOrder>(`/admin/clients/${id}/goods-intake`, payload, token);
}
