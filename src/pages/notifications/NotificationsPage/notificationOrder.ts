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
