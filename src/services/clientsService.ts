import type { ApiClientsResponse } from '@/types';
import { apiGet } from '@/lib/apiClient';

export async function getClients(
  token: string,
  aggregate = false
): Promise<ApiClientsResponse['data']> {
  const response = await apiGet<ApiClientsResponse>(
    `/admin/clients?limit=100&aggregate=${aggregate}`,
    token
  );
  return response.data;
}
