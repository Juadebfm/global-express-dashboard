import type {
  ApiNotificationsResponse,
  ApiUnreadCountResponse,
} from '@/types';
import { apiGet, apiPatch } from '@/lib/apiClient';

export async function getNotifications(
  token: string,
  page = 1,
  limit = 50
): Promise<ApiNotificationsResponse['data']> {
  const response = await apiGet<ApiNotificationsResponse>(
    `/notifications?page=${page}&limit=${limit}`,
    token
  );
  return response.data;
}

export async function getUnreadCount(token: string): Promise<number> {
  const response = await apiGet<ApiUnreadCountResponse>(
    '/notifications/unread-count',
    token
  );
  return response.data.count;
}

export async function markNotificationRead(id: string, token: string): Promise<void> {
  await apiPatch(`/notifications/${id}/read`, undefined, token);
}

export async function toggleNotificationSave(id: string, token: string): Promise<void> {
  await apiPatch(`/notifications/${id}/save`, undefined, token);
}
