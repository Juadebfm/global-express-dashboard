import { apiGetData, apiPatchData, apiPostData } from '@/lib/apiClient';
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

export function getMySuppliers(
  token: string,
  params: SupplierListParams = {},
): Promise<PaginatedSuppliers> {
  return apiGetData<PaginatedSuppliers>(
    `/users/me/suppliers${buildSupplierQuery(params)}`,
    token,
  );
}

export function addMySupplier(
  token: string,
  payload: AddSupplierPayload,
): Promise<AddSupplierResult> {
  return apiPostData<AddSupplierResult>('/users/me/suppliers', payload, token);
}

export function requestSupplierUpdate(
  token: string,
  supplierId: string,
  payload: SupplierUpdateRequestPayload,
): Promise<ApiSupplierUpdateRequest> {
  return apiPostData<ApiSupplierUpdateRequest>(
    `/users/me/suppliers/${supplierId}/update-request`,
    payload,
    token,
  );
}

export function getMySupplierUpdateRequests(
  token: string,
  params: SupplierUpdateRequestListParams = {},
): Promise<PaginatedSupplierUpdateRequests> {
  return apiGetData<PaginatedSupplierUpdateRequests>(
    `/users/me/suppliers/update-requests${buildUpdateRequestQuery(params)}`,
    token,
  );
}

export function getMySupplierValidationRequests(
  token: string,
  params: SupplierUpdateRequestListParams = {},
): Promise<PaginatedSupplierUpdateRequests> {
  return apiGetData<PaginatedSupplierUpdateRequests>(
    `/users/me/suppliers/validation-requests${buildUpdateRequestQuery(params)}`,
    token,
  );
}

export function decideSupplierValidationRequest(
  token: string,
  id: string,
  payload: SupplierValidationDecisionPayload,
): Promise<ApiSupplierUpdateRequest> {
  return apiPatchData<ApiSupplierUpdateRequest>(
    `/users/me/suppliers/validation-requests/${id}`,
    payload,
    token,
  );
}

// ── Admin-scoped supplier list ───────────────────────────────────────────────

export function getAllSuppliers(
  token: string,
  params: SupplierListParams = {},
): Promise<PaginatedSuppliers> {
  return apiGetData<PaginatedSuppliers>(
    `/users/suppliers${buildSupplierQuery(params)}`,
    token,
  );
}

// Re-export the supplier shape so callers can import from a single module.
export type { ApiSupplier };
