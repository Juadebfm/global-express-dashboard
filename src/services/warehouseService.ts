import type { WarehouseVerifyPayload, WarehouseVerifyResult } from '@/types';
import { apiPost } from '@/lib/apiClient';

export async function verifyOrder(
  token: string,
  orderId: string,
  payload: WarehouseVerifyPayload
): Promise<WarehouseVerifyResult> {
  // Backend may return either the bare WarehouseVerifyResult or { success, data }
  // wrapped. Keep the dual-shape handling here rather than committing to the
  // *Data helper.
  const response = await apiPost<{ success?: boolean; data?: WarehouseVerifyResult } | WarehouseVerifyResult>(
    `/orders/${orderId}/warehouse-verify`,
    payload,
    token
  );

  if (response && typeof response === 'object' && 'data' in response && response.data) {
    return response.data;
  }

  return response as WarehouseVerifyResult;
}
