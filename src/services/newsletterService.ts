import type { NewsletterSubscribersResult } from '@/types';
import { apiGetData, apiGetBlob, apiPatch, apiDelete } from '@/lib/apiClient';

export function listSubscribers(
  token: string,
  params: { page?: number; limit?: number; activeOnly?: boolean } = {},
): Promise<NewsletterSubscribersResult> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.activeOnly !== undefined) qs.set('activeOnly', String(params.activeOnly));
  return apiGetData<NewsletterSubscribersResult>(`/newsletter/subscribers?${qs.toString()}`, token);
}

export function deactivateSubscriber(id: string, token: string): Promise<void> {
  return apiPatch<void>(`/newsletter/subscribers/${id}/deactivate`, undefined, token);
}

export function deleteSubscriber(id: string, token: string): Promise<void> {
  return apiDelete<void>(`/newsletter/subscribers/${id}`, token);
}

export async function downloadSubscribersCsv(token: string): Promise<void> {
  const { blob } = await apiGetBlob('/newsletter/subscribers/export', token);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'newsletter-subscribers.csv';
  a.click();
  URL.revokeObjectURL(url);
}
