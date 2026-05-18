import type {
  InitializePaymentPayload,
  PaystackInitResponse,
  ApiPayment,
  ApiPaymentsResponse,
  RecordOfflinePayload,
  ReceiptPresignPayload,
  ReceiptPresignResponse,
  ReceiptSubmitPayload,
  ReceiptVerifyPayload,
} from '@/types';
import { apiGet, apiPatch, apiPost } from '@/lib/apiClient';

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

// ── Offline receipt flow (presign → submit → superadmin verify) ──────────────

export async function presignPaymentReceipt(
  token: string,
  payload: ReceiptPresignPayload,
): Promise<ReceiptPresignResponse> {
  const response = await apiPost<{ success: boolean; data: ReceiptPresignResponse }>(
    '/payments/receipts/presign',
    payload,
    token,
  );
  return response.data;
}

export async function submitPaymentReceipt(
  token: string,
  payload: ReceiptSubmitPayload,
): Promise<ApiPayment> {
  const response = await apiPost<{ success: boolean; data: ApiPayment }>(
    '/payments/receipts',
    payload,
    token,
  );
  return response.data;
}

export async function verifyPaymentReceipt(
  token: string,
  receiptId: string,
  payload: ReceiptVerifyPayload,
): Promise<ApiPayment> {
  const response = await apiPatch<{ success: boolean; data: ApiPayment }>(
    `/payments/receipts/${receiptId}/verify`,
    payload,
    token,
  );
  return response.data;
}
