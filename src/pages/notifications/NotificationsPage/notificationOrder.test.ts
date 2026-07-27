import { describe, expect, it } from 'vitest';
import type { ApiNotification } from '@/types';
import { isNewOrderHandlingActionable, resolveNotificationOrderId } from './notificationOrder';

function notification(overrides: Partial<ApiNotification> = {}): ApiNotification {
  return {
    id: 'notification-1',
    type: 'new_order',
    title: 'New order',
    message: 'A new order was submitted.',
    body: undefined,
    subtitle: undefined,
    orderId: null,
    metadata: {},
    createdAt: '2026-07-27T00:00:00.000Z',
    updatedAt: '2026-07-27T00:00:00.000Z',
    isRead: false,
    isSaved: false,
    ...overrides,
  };
}

describe('resolveNotificationOrderId', () => {
  it('uses the role notification metadata orderId when the shared row has none', () => {
    expect(resolveNotificationOrderId(notification({ metadata: { orderId: 'order-from-metadata' } }))).toBe(
      'order-from-metadata',
    );
  });

  it('prefers the explicit orderId when one is available', () => {
    expect(
      resolveNotificationOrderId(
        notification({ orderId: 'order-on-row', metadata: { orderId: 'order-from-metadata' } }),
      ),
    ).toBe('order-on-row');
  });
});

describe('isNewOrderHandlingActionable', () => {
  it('keeps the action available only while a new order is still unregistered', () => {
    expect(isNewOrderHandlingActionable('new_order', 'PREORDER_SUBMITTED')).toBe(true);
    expect(isNewOrderHandlingActionable('new_order', 'AWAITING_WAREHOUSE_RECEIPT')).toBe(false);
    expect(isNewOrderHandlingActionable('order_status_update', 'PREORDER_SUBMITTED')).toBe(false);
  });
});
