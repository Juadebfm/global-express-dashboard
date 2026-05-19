import type { PresignPayload, PresignResponse, ConfirmPayload, OrderImage } from '@/types';
import { apiDelete, apiGetData, apiPost, apiPostData } from '@/lib/apiClient';

export function presignUpload(
  token: string,
  payload: PresignPayload
): Promise<PresignResponse> {
  return apiPostData<PresignResponse>('/uploads/presign', payload, token);
}

export async function confirmUpload(
  token: string,
  payload: ConfirmPayload
): Promise<void> {
  await apiPost('/uploads/confirm', payload, token);
}

export function getOrderImages(
  token: string,
  orderId: string
): Promise<OrderImage[]> {
  return apiGetData<OrderImage[]>(`/uploads/orders/${orderId}/images`, token);
}

export async function deleteImage(
  token: string,
  imageId: string
): Promise<void> {
  await apiDelete(`/uploads/images/${imageId}`, token);
}
