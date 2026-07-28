import { apiGetData, apiPatchData } from '@/lib/apiClient';
import type { ShopInterestRequest, UpdateShopInterestRequestPayload } from '@/types';

export function getShopInterestRequest(
  token: string,
  interestRequestId: string,
): Promise<ShopInterestRequest> {
  return apiGetData<ShopInterestRequest>(
    `/shop/interests/${encodeURIComponent(interestRequestId)}`,
    token,
  );
}

export function updateShopInterestRequest(
  token: string,
  interestRequestId: string,
  payload: UpdateShopInterestRequestPayload,
): Promise<ShopInterestRequest> {
  return apiPatchData<ShopInterestRequest>(
    `/shop/interests/${encodeURIComponent(interestRequestId)}`,
    payload,
    token,
  );
}
