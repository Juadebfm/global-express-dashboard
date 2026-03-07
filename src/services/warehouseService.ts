import type { WarehouseVerifyPayload } from '@/types';
import { apiPost } from '@/lib/apiClient';

export async function verifyOrder(
  token: string,
  orderId: string,
  payload: WarehouseVerifyPayload
): Promise<void> {
  await apiPost(`/orders/${orderId}/warehouse-verify`, payload, token);
}
