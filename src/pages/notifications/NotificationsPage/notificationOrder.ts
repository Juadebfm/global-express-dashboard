import type { ApiNotification } from '@/types';

/**
 * Staff role notifications are shared rows and therefore have no top-level
 * orderId. The backend includes the reference in metadata for those events.
 */
export function resolveNotificationOrderId(notification: ApiNotification): string | null {
  const metadataOrderId =
    typeof notification.metadata?.orderId === 'string' ? notification.metadata.orderId : null;
  return notification.orderId ?? metadataOrderId;
}

/**
 * A new-order notification is actionable only before staff starts warehouse
 * handling. Other notifications remain historical context, not workflow links.
 */
export function isNewOrderHandlingActionable(
  notificationType: string,
  orderStatus: string | null | undefined,
): boolean {
  return notificationType === 'new_order' && orderStatus === 'PREORDER_SUBMITTED';
}

/**
 * Payment-related notifications ("Payment Receipt Submitted", "Payment
 * Details Ready") link to the Payments page rather than the order workflow —
 * there's no per-order deep link there, just the flat transactions list.
 */
export function isPaymentNotificationActionable(notificationType: string): boolean {
  return notificationType === 'payment_event';
}

/**
 * 'admin_alert' is a shared bucket type reused for several unrelated staff
 * alerts (car-purchase attempts, shop interest requests, etc.), so gate on
 * the metadata shape rather than the type string alone. Returns the interest
 * request id to deep-link to when this specific alert is a shop interest
 * request, null otherwise.
 */
export function resolveShopInterestRequestId(metadata: Record<string, unknown>): string | null {
  const id = metadata.interestRequestId;
  return typeof id === 'string' ? id : null;
}
