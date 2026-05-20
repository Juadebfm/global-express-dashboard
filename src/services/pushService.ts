import { apiGetData, apiPost } from '@/lib/apiClient';

export async function getVapidPublicKey(token: string): Promise<string> {
  const data = await apiGetData<{ publicKey: string }>('/internal/push/vapid-key', token);
  return data.publicKey;
}

export async function subscribePush(
  token: string,
  subscription: PushSubscriptionJSON,
): Promise<void> {
  await apiPost('/internal/push/subscribe', subscription, token);
}

export async function unsubscribePush(token: string, endpoint: string): Promise<void> {
  await apiPost('/internal/push/unsubscribe', { endpoint }, token);
}
