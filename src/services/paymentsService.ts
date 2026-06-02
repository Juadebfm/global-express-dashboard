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
import { apiGetData, apiPatchData, apiPostData } from '@/lib/apiClient';

export function initializePayment(
  token: string,
  payload: InitializePaymentPayload,
  idempotencyKey: string,
): Promise<PaystackInitResponse> {
  // Idempotency-Key is required by the BE — prevents a network failure or
  // double-click from creating two pending Paystack transactions. The hook
  // generates the key per submit click and reuses it across retries.
  return apiPostData<PaystackInitResponse>('/payments/initialize', payload, token, {
    idempotencyKey,
  });
}

export function verifyPayment(token: string, reference: string): Promise<ApiPayment> {
  return apiPostData<ApiPayment>(`/payments/verify/${reference}`, undefined, token);
}

export function getPayments(
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
  return apiGetData<ApiPaymentsResponse['data']>(`${basePath}${qs ? `?${qs}` : ''}`, token);
}

export function getPaymentById(token: string, id: string): Promise<ApiPayment> {
  return apiGetData<ApiPayment>(`/payments/${id}`, token);
}

export function recordOfflinePayment(
  token: string,
  orderId: string,
  payload: RecordOfflinePayload
): Promise<ApiPayment> {
  return apiPostData<ApiPayment>(`/payments/${orderId}/record-offline`, payload, token);
}

// ── Offline receipt flow (presign → submit → superadmin verify) ──────────────

export function presignPaymentReceipt(
  token: string,
  payload: ReceiptPresignPayload,
): Promise<ReceiptPresignResponse> {
  return apiPostData<ReceiptPresignResponse>('/payments/receipts/presign', payload, token);
}

export function submitPaymentReceipt(
  token: string,
  payload: ReceiptSubmitPayload,
): Promise<ApiPayment> {
  return apiPostData<ApiPayment>('/payments/receipts', payload, token);
}

export function verifyPaymentReceipt(
  token: string,
  receiptId: string,
  payload: ReceiptVerifyPayload,
): Promise<ApiPayment> {
  return apiPatchData<ApiPayment>(`/payments/receipts/${receiptId}/verify`, payload, token);
}
