import { apiGetData, apiPostData, apiPatchData } from '@/lib/apiClient';
import type {
  InternalDeclaration,
  InternalDeclarationListItem,
  InternalDeclarationListParams,
  InternalOrderSummary,
  RejectDeclarationPayload,
  LinkCustomerPayload,
} from '@/types/internalDeclarations.types';

function qs(params: InternalDeclarationListParams): string {
  const q = new URLSearchParams();
  if (params.status) q.set('status', params.status);
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  const s = q.toString();
  return s ? `?${s}` : '';
}

export function getInternalDeclarations(
  token: string,
  params: InternalDeclarationListParams = {},
): Promise<InternalDeclarationListItem[]> {
  return apiGetData<InternalDeclarationListItem[]>(
    `/internal/supplier-declarations${qs(params)}`,
    token,
  );
}

export function getInternalDeclaration(
  token: string,
  id: string,
): Promise<InternalDeclaration> {
  return apiGetData<InternalDeclaration>(
    `/internal/supplier-declarations/${id}`,
    token,
  );
}

export function acceptDeclaration(token: string, id: string): Promise<InternalDeclaration> {
  return apiPostData<InternalDeclaration>(
    `/internal/supplier-declarations/${id}/accept`,
    undefined,
    token,
  );
}

export function rejectDeclaration(
  token: string,
  id: string,
  payload: RejectDeclarationPayload,
): Promise<InternalDeclaration> {
  return apiPostData<InternalDeclaration>(
    `/internal/supplier-declarations/${id}/reject`,
    payload,
    token,
  );
}

export function linkCustomer(
  token: string,
  id: string,
  payload: LinkCustomerPayload,
): Promise<InternalDeclaration> {
  return apiPatchData<InternalDeclaration>(
    `/internal/supplier-declarations/${id}/link-customer`,
    payload,
    token,
  );
}

export function getInternalOrder(token: string, orderId: string): Promise<InternalOrderSummary> {
  return apiGetData<InternalOrderSummary>(`/orders/${orderId}`, token);
}
