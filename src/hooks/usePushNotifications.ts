import { useEffect, useRef } from 'react';
import { getVapidPublicKey, subscribePush } from '@/services/pushService';

const TOKEN_KEY = 'globalxpress_token';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Registers the service worker and subscribes to browser push notifications.
 * Only runs once per mount for authenticated operator users.
 */
export function usePushNotifications(enabled: boolean): void {
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!enabled || subscribedRef.current) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    subscribedRef.current = true;

    (async () => {
      try {
        // Register service worker
        const registration = await navigator.serviceWorker.register('/sw.js');

        // Check if already subscribed
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) return;

        // Request permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        // Get VAPID key and subscribe
        const vapidPublicKey = await getVapidPublicKey(token);
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
        });

        // Send subscription to backend
        await subscribePush(token, subscription.toJSON());
      } catch {
        // Push notification setup failed silently — not critical
        subscribedRef.current = false;
      }
    })();
  }, [enabled]);
}
