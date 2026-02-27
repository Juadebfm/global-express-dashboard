import type { PresignPayload, PresignResponse, ConfirmPayload, OrderImage } from '@/types';
import { apiPost, apiGet, apiDelete } from '@/lib/apiClient';

export async function presignUpload(
  token: string,
  payload: PresignPayload
): Promise<PresignResponse> {
  const response = await apiPost<{ success: boolean; data: PresignResponse }>(
    '/uploads/presign',
    payload,
    token
  );
  return response.data;
}

export async function confirmUpload(
  token: string,
  payload: ConfirmPayload
): Promise<void> {
  await apiPost('/uploads/confirm', payload, token);
}

export async function getOrderImages(
  token: string,
  orderId: string
): Promise<OrderImage[]> {
  const response = await apiGet<{ success: boolean; data: OrderImage[] }>(
    `/uploads/orders/${orderId}/images`,
    token
  );
  return response.data;
}

export async function deleteImage(
  token: string,
  imageId: string
): Promise<void> {
  await apiDelete(`/uploads/images/${imageId}`, token);
}
