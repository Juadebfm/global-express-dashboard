import type {
  ApiNotificationsResponse,
  BroadcastAudience,
  BroadcastImageConfirmResponse,
  BroadcastImageContentType,
  BroadcastImagePresignResponse,
} from '@/types';
import { apiDelete, apiGetData, apiPatch, apiPost, apiPostData } from '@/lib/apiClient';

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
  payload: {
    type: string;
    title: string;
    subtitle?: string;
    body?: string;
    audience: BroadcastAudience;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await apiPost('/notifications/broadcast', payload, token);
}

export function presignBroadcastImage(
  token: string,
  payload: { contentType: BroadcastImageContentType; originalFileName: string },
): Promise<BroadcastImagePresignResponse> {
  return apiPostData<BroadcastImagePresignResponse>(
    '/notifications/broadcast-images/presign',
    payload,
    token,
  );
}

export function confirmBroadcastImage(
  token: string,
  r2Key: string,
): Promise<BroadcastImageConfirmResponse> {
  return apiPostData<BroadcastImageConfirmResponse>(
    '/notifications/broadcast-images/confirm',
    { r2Key },
    token,
  );
}

export async function uploadBroadcastImageFile(uploadUrl: string, file: File): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!response.ok) {
    throw new Error('Unable to upload the banner image. Please try again.');
  }
}
