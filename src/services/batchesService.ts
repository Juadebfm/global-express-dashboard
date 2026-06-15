import {
  apiGetData,
  apiPostData,
  apiPatchData,
  apiDeleteData,
} from '@/lib/apiClient';
import type {
  Batch,
  BatchListResult,
  BatchRosterResult,
  BatchStatusLabel,
  BatchAddOrderPayload,
  BatchAddOrderResult,
  BatchUpdateStatusPayload,
  BatchUpdateStatusResult,
  BatchCloseResult,
} from '@/types';

export interface AvailableOrder {
  orderId: string;
  trackingNumber: string;
  shipmentType: string;
  weight: string;
  description: string | null;
  customerId: string;
  customerName: string;
  customerLastName: string;
  shippingMark: string;
}

export interface BatchListParams {
  status?: 'open' | 'closed';
  transportMode?: 'air' | 'sea';
  page?: number;
  limit?: number;
}

export function getBatches(
  token: string,
  params: BatchListParams = {},
): Promise<BatchListResult> {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.transportMode) qs.set('transportMode', params.transportMode);
  if (params.page !== undefined) qs.set('page', String(params.page));
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  const query = qs.toString();
  return apiGetData<BatchListResult>(`/batches${query ? `?${query}` : ''}`, token);
}

export function getBatch(token: string, batchId: string): Promise<Batch> {
  return apiGetData<Batch>(`/batches/${batchId}`, token);
}

export function getBatchRoster(token: string, batchId: string): Promise<BatchRosterResult> {
  return apiGetData<BatchRosterResult>(`/batches/${batchId}/roster`, token);
}

export function addOrderToBatch(
  token: string,
  batchId: string,
  payload: BatchAddOrderPayload,
): Promise<BatchAddOrderResult> {
  return apiPostData<BatchAddOrderResult>(`/batches/${batchId}/orders`, payload, token);
}

export function removeOrderFromBatch(
  token: string,
  batchId: string,
  orderId: string,
): Promise<void> {
  return apiDeleteData<void>(`/batches/${batchId}/orders/${orderId}`, token);
}

export function updateBatchStatus(
  token: string,
  batchId: string,
  payload: BatchUpdateStatusPayload,
): Promise<BatchUpdateStatusResult> {
  return apiPatchData<BatchUpdateStatusResult>(`/batches/${batchId}/status`, payload, token);
}

export function closeBatch(token: string, batchId: string): Promise<BatchCloseResult> {
  return apiPostData<BatchCloseResult>(`/batches/${batchId}/close`, undefined, token);
}

export function getBatchStatusLabels(token: string): Promise<BatchStatusLabel[]> {
  return apiGetData<BatchStatusLabel[]>('/batches/status-labels', token);
}

export function getAvailableOrdersForBatch(
  token: string,
  batchId: string,
): Promise<AvailableOrder[]> {
  return apiGetData<AvailableOrder[]>(`/batches/${batchId}/available-orders`, token);
}
