import type {
  CreateBulkOrderPayload,
  ApiBulkOrder,
  ApiBulkOrdersResponse,
  BulkOrderItem,
} from '@/types';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/apiClient';

function normalizeShipmentType(type: 'air' | 'sea' | 'ocean'): 'air' | 'sea' {
  return type === 'ocean' ? 'sea' : type;
}

export async function createBulkOrder(
  token: string,
  payload: CreateBulkOrderPayload
): Promise<ApiBulkOrder> {
  const normalizedPayload: CreateBulkOrderPayload = {
    ...payload,
    shipmentType: normalizeShipmentType(payload.shipmentType),
  };
  const response = await apiPost<{ success: boolean; data: ApiBulkOrder }>(
    '/bulk-orders',
    normalizedPayload,
    token
  );
  return response.data;
}

export async function getBulkOrders(
  token: string,
  params: { page?: number; limit?: number } = {}
): Promise<ApiBulkOrdersResponse['data']> {
  const searchParams = new URLSearchParams();
  if (params.page !== undefined) searchParams.set('page', String(params.page));
  if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();
  const response = await apiGet<ApiBulkOrdersResponse>(
    `/bulk-orders${qs ? `?${qs}` : ''}`,
    token
  );
  return response.data;
}

export async function getBulkOrderById(
  token: string,
  id: string
): Promise<ApiBulkOrder> {
  const response = await apiGet<{ success: boolean; data: ApiBulkOrder }>(
    `/bulk-orders/${id}`,
    token
  );
  return response.data;
}

export async function updateBulkOrderStatus(
  token: string,
  id: string,
  statusV2: string
): Promise<void> {
  await apiPatch(`/bulk-orders/${id}/status`, { statusV2 }, token);
}

export async function addBulkOrderItem(
  token: string,
  id: string,
  item: BulkOrderItem
): Promise<void> {
  await apiPost(`/bulk-orders/${id}/items`, item, token);
}

export async function removeBulkOrderItem(
  token: string,
  id: string,
  itemId: string
): Promise<void> {
  await apiDelete(`/bulk-orders/${id}/items/${itemId}`, token);
}

export async function deleteBulkOrder(
  token: string,
  id: string
): Promise<void> {
  await apiDelete(`/bulk-orders/${id}`, token);
}
