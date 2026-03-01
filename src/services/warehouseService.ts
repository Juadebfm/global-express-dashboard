import type { WarehouseVerifyPayload } from '@/types';
import { apiPatch } from '@/lib/apiClient';

export async function verifyOrder(
  token: string,
  orderId: string,
  payload: WarehouseVerifyPayload
): Promise<void> {
  await apiPatch(`/orders/${orderId}/verify`, payload, token);
}
