import { apiGet, apiPost } from '@/lib/apiClient';

interface VapidKeyResponse {
  success: boolean;
  data: { publicKey: string };
}

export async function getVapidPublicKey(token: string): Promise<string> {
  const res = await apiGet<VapidKeyResponse>('/internal/push/vapid-key', token);
  return res.data.publicKey;
}

export async function subscribePush(
  token: string,
  subscription: PushSubscriptionJSON,
): Promise<void> {
  await apiPost('/internal/push/subscribe', subscription, token);
}
