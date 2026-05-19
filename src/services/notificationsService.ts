import type { ApiNotificationsResponse } from '@/types';
import { apiDelete, apiGetData, apiPatch, apiPost } from '@/lib/apiClient';

export function getNotifications(
  token: string,
  page = 1,
  limit = 50
): Promise<ApiNotificationsResponse['data']> {
  return apiGetData<ApiNotificationsResponse['data']>(
    `/notifications?page=${page}&limit=${limit}`,
    token
  );
}

export async function getUnreadCount(token: string): Promise<number> {
  const data = await apiGetData<{ count: number }>('/notifications/unread-count', token);
  return data.count;
}

export async function markNotificationRead(id: string, token: string): Promise<void> {
  await apiPatch(`/notifications/${id}/read`, undefined, token);
}

export async function markAllNotificationsRead(token: string): Promise<void> {
  await apiPatch('/notifications/read-all', undefined, token);
}

export async function toggleNotificationSave(id: string, token: string): Promise<void> {
  await apiPatch(`/notifications/${id}/save`, undefined, token);
}

export async function deleteNotification(id: string, token: string): Promise<void> {
  await apiDelete(`/notifications/${id}`, token);
}

export async function deleteNotificationsBulk(ids: string[], token: string): Promise<void> {
  await apiDelete('/notifications', token, { ids });
}

export async function sendBroadcast(
  token: string,
  payload: { type: string; title: string; subtitle?: string; body?: string; metadata?: Record<string, unknown> }
): Promise<void> {
  await apiPost('/notifications/broadcast', payload, token);
}
