import { apiGet, apiPatch, apiPost } from '@/lib/apiClient';
import type {
  AddSupplierPayload,
  AddSupplierResult,
  ApiSupplier,
  ApiSupplierUpdateRequest,
  PaginatedSuppliers,
  PaginatedSupplierUpdateRequests,
  SupplierListParams,
  SupplierUpdateRequestListParams,
  SupplierUpdateRequestPayload,
  SupplierValidationDecisionPayload,
} from '@/types';

interface Envelope<T> {
  success: boolean;
  data: T;
}

function buildSupplierQuery(params: SupplierListParams = {}): string {
  const search = new URLSearchParams();
  if (params.page !== undefined) search.set('page', String(params.page));
  if (params.limit !== undefined) search.set('limit', String(params.limit));
  if (params.isActive !== undefined) search.set('isActive', String(params.isActive));
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

function buildUpdateRequestQuery(
  params: SupplierUpdateRequestListParams = {},
): string {
  const search = new URLSearchParams();
  if (params.page !== undefined) search.set('page', String(params.page));
  if (params.limit !== undefined) search.set('limit', String(params.limit));
  if (params.status) search.set('status', params.status);
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

// ── Customer-facing supplier address book ────────────────────────────────────

export async function getMySuppliers(
  token: string,
  params: SupplierListParams = {},
): Promise<PaginatedSuppliers> {
  const response = await apiGet<Envelope<PaginatedSuppliers>>(
    `/users/me/suppliers${buildSupplierQuery(params)}`,
    token,
  );
  return response.data;
}

export async function addMySupplier(
  token: string,
  payload: AddSupplierPayload,
): Promise<AddSupplierResult> {
  const response = await apiPost<Envelope<AddSupplierResult>>(
    '/users/me/suppliers',
    payload,
    token,
  );
  return response.data;
}

export async function requestSupplierUpdate(
  token: string,
  supplierId: string,
  payload: SupplierUpdateRequestPayload,
): Promise<ApiSupplierUpdateRequest> {
  const response = await apiPost<Envelope<ApiSupplierUpdateRequest>>(
    `/users/me/suppliers/${supplierId}/update-request`,
    payload,
    token,
  );
  return response.data;
}

export async function getMySupplierUpdateRequests(
  token: string,
  params: SupplierUpdateRequestListParams = {},
): Promise<PaginatedSupplierUpdateRequests> {
  const response = await apiGet<Envelope<PaginatedSupplierUpdateRequests>>(
    `/users/me/suppliers/update-requests${buildUpdateRequestQuery(params)}`,
    token,
  );
  return response.data;
}

export async function getMySupplierValidationRequests(
  token: string,
  params: SupplierUpdateRequestListParams = {},
): Promise<PaginatedSupplierUpdateRequests> {
  const response = await apiGet<Envelope<PaginatedSupplierUpdateRequests>>(
    `/users/me/suppliers/validation-requests${buildUpdateRequestQuery(params)}`,
    token,
  );
  return response.data;
}

export async function decideSupplierValidationRequest(
  token: string,
  id: string,
  payload: SupplierValidationDecisionPayload,
): Promise<ApiSupplierUpdateRequest> {
  const response = await apiPatch<Envelope<ApiSupplierUpdateRequest>>(
    `/users/me/suppliers/validation-requests/${id}`,
    payload,
    token,
  );
  return response.data;
}

// ── Admin-scoped supplier list ───────────────────────────────────────────────

export async function getAllSuppliers(
  token: string,
  params: SupplierListParams = {},
): Promise<PaginatedSuppliers> {
  const response = await apiGet<Envelope<PaginatedSuppliers>>(
    `/users/suppliers${buildSupplierQuery(params)}`,
    token,
  );
  return response.data;
}

// Re-export the supplier shape so callers can import from a single module.
export type { ApiSupplier };
