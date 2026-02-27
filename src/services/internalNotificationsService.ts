import type { ApiInternalNotification } from '@/types';
import { apiGet, apiPatch } from '@/lib/apiClient';

interface InternalNotificationsResponse {
  success: boolean;
  data: {
    data: ApiInternalNotification[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export async function getInternalNotifications(
  token: string,
  params: { page?: number; limit?: number; unreadOnly?: boolean } = {}
): Promise<InternalNotificationsResponse['data']> {
  const searchParams = new URLSearchParams();
  if (params.page !== undefined) searchParams.set('page', String(params.page));
  if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
  if (params.unreadOnly) searchParams.set('unreadOnly', 'true');
  const qs = searchParams.toString();
  const response = await apiGet<InternalNotificationsResponse>(
    `/internal/notifications${qs ? `?${qs}` : ''}`,
    token
  );
  return response.data;
}

export async function getInternalUnreadCount(token: string): Promise<number> {
  const response = await apiGet<{ success: boolean; data: { count: number } }>(
    '/internal/notifications/unread-count',
    token
  );
  return response.data.count;
}

export async function markAllInternalRead(token: string): Promise<void> {
  await apiPatch('/internal/notifications/read-all', undefined, token);
}

export async function markInternalRead(token: string, id: string): Promise<void> {
  await apiPatch(`/internal/notifications/${id}/read`, undefined, token);
}
