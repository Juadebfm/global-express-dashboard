import type {
  InitializePaymentPayload,
  PaystackInitResponse,
  ApiPayment,
  ApiPaymentsResponse,
  RecordOfflinePayload,
} from '@/types';
import { apiGet, apiPost } from '@/lib/apiClient';

export async function initializePayment(
  token: string,
  payload: InitializePaymentPayload
): Promise<PaystackInitResponse> {
  const response = await apiPost<{ success: boolean; data: PaystackInitResponse }>(
    '/payments/initialize',
    payload,
    token
  );
  return response.data;
}

export async function verifyPayment(
  token: string,
  reference: string
): Promise<ApiPayment> {
  const response = await apiPost<{ success: boolean; data: ApiPayment }>(
    `/payments/verify/${reference}`,
    undefined,
    token
  );
  return response.data;
}

export async function getPayments(
  token: string,
  params: { page?: number; limit?: number; userId?: string; status?: string; isCustomer?: boolean } = {}
): Promise<ApiPaymentsResponse['data']> {
  const searchParams = new URLSearchParams();
  if (params.page !== undefined) searchParams.set('page', String(params.page));
  if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
  if (params.userId) searchParams.set('userId', params.userId);
  if (params.status) searchParams.set('status', params.status);
  const qs = searchParams.toString();
  const basePath = params.isCustomer ? '/payments/me' : '/payments';
  const response = await apiGet<ApiPaymentsResponse>(
    `${basePath}${qs ? `?${qs}` : ''}`,
    token
  );
  return response.data;
}

export async function getPaymentById(
  token: string,
  id: string
): Promise<ApiPayment> {
  const response = await apiGet<{ success: boolean; data: ApiPayment }>(
    `/payments/${id}`,
    token
  );
  return response.data;
}

export async function recordOfflinePayment(
  token: string,
  orderId: string,
  payload: RecordOfflinePayload
): Promise<ApiPayment> {
  const response = await apiPost<{ success: boolean; data: ApiPayment }>(
    `/payments/${orderId}/record-offline`,
    payload,
    token
  );
  return response.data;
}
