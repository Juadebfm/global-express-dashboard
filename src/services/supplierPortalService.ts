import { apiGet, apiGetData, apiPost, apiPostData } from '@/lib/apiClient';
import type {
  Declaration,
  DeclarationListParams,
  NewDeclarationPayload,
  SupplierPortalUser,
} from '@/types/supplierPortal.types';

interface SupplierLoginResponse {
  success: boolean;
  data: {
    user: { id: string; email: string; firstName: string; lastName: string; role: string };
    tokens: { accessToken: string };
  };
}

export async function supplierLogin(
  email: string,
  password: string,
): Promise<{ accessToken: string; role: string }> {
  const res = await apiPost<SupplierLoginResponse>('/supplier/auth/login', {
    email,
    password,
  });
  return {
    accessToken: res.data.tokens.accessToken,
    role: res.data.user.role,
  };
}

export function getSupplierMe(token: string): Promise<SupplierPortalUser> {
  return apiGetData<SupplierPortalUser>('/users/me', token);
}

export function getDeclarations(
  token: string,
  params: DeclarationListParams = {},
): Promise<Declaration[]> {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return apiGetData<Declaration[]>(
    `/supplier/declarations${qs ? `?${qs}` : ''}`,
    token,
  );
}

export function getDeclaration(token: string, id: string): Promise<Declaration> {
  return apiGetData<Declaration>(`/supplier/declarations/${id}`, token);
}

export function createDeclaration(
  token: string,
  body: NewDeclarationPayload,
): Promise<Declaration> {
  return apiPostData<Declaration>('/supplier/declarations', body, token);
}

interface OrderTrackingInfo {
  trackingNumber?: string;
  id: string;
}

export function getOrderTrackingNumber(
  token: string,
  orderId: string,
): Promise<OrderTrackingInfo> {
  return apiGet<{ success: boolean; data: OrderTrackingInfo }>(
    `/orders/${orderId}`,
    token,
  ).then((r) => r.data);
}
