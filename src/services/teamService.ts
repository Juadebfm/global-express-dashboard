import type { ApiTeamResponse } from '@/types';
import { apiGet } from '@/lib/apiClient';

export async function getTeam(token: string): Promise<ApiTeamResponse['data']> {
  const response = await apiGet<ApiTeamResponse>('/team', token);
  return response.data;
}
