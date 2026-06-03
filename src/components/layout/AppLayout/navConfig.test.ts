import { describe, expect, it } from 'vitest';
import {
  ADMIN_NAV,
  CUSTOMER_FOOTER,
  CUSTOMER_NAV,
  OPERATOR_FOOTER,
  STAFF_NAV,
  SUPERADMIN_NAV,
  getFooterItems,
  getNavItems,
} from './navConfig';
import type { User } from '@/types';

type Role = User['role'];

describe('getNavItems', () => {
  it('returns SUPERADMIN_NAV for superadmin', () => {
    expect(getNavItems('superadmin')).toBe(SUPERADMIN_NAV);
  });

  it('returns ADMIN_NAV for admin', () => {
    expect(getNavItems('admin')).toBe(ADMIN_NAV);
  });

  it('returns STAFF_NAV for staff', () => {
    expect(getNavItems('staff')).toBe(STAFF_NAV);
  });

  it('returns CUSTOMER_NAV for user', () => {
    expect(getNavItems('user')).toBe(CUSTOMER_NAV);
  });

  it('returns CUSTOMER_NAV for supplier (no distinct flow yet)', () => {
    // Suppliers fall through to customer nav today — verify the
    // current behaviour so a future supplier-specific change is a
    // deliberate test update, not a silent drift.
    expect(getNavItems('supplier')).toBe(CUSTOMER_NAV);
  });

  it('returns CUSTOMER_NAV for null / undefined (unauthenticated)', () => {
    expect(getNavItems(null)).toBe(CUSTOMER_NAV);
    expect(getNavItems(undefined)).toBe(CUSTOMER_NAV);
  });

  it('each per-role nav includes a dashboard item', () => {
    // Every authenticated path should land somewhere — catching the
    // case where someone deletes 'dashboard' from one array in a
    // refactor and forgets the others.
    const arrays = [CUSTOMER_NAV, STAFF_NAV, ADMIN_NAV, SUPERADMIN_NAV];
    for (const arr of arrays) {
      expect(arr.some((item) => item.id === 'dashboard')).toBe(true);
    }
  });

  it('customer-only items (deliverySchedule) do NOT leak into operator navs', () => {
    // Spec-shape check: deliverySchedule is a customer-only affordance.
    // If it shows up in any operator array, that's a regression.
    for (const arr of [STAFF_NAV, ADMIN_NAV, SUPERADMIN_NAV]) {
      expect(arr.some((item) => item.id === 'deliverySchedule')).toBe(false);
    }
  });

  it('admin-tier items (clients, team, reports) only appear from admin onwards', () => {
    const adminTierIds = ['clients', 'team', 'reports'];
    for (const id of adminTierIds) {
      expect(CUSTOMER_NAV.some((item) => item.id === id)).toBe(false);
      expect(STAFF_NAV.some((item) => item.id === id)).toBe(false);
      expect(ADMIN_NAV.some((item) => item.id === id)).toBe(true);
      expect(SUPERADMIN_NAV.some((item) => item.id === id)).toBe(true);
    }
  });

  it('every nav item points at a defined ROUTES value (no undefined hrefs)', () => {
    const arrays = [CUSTOMER_NAV, STAFF_NAV, ADMIN_NAV, SUPERADMIN_NAV];
    for (const arr of arrays) {
      for (const item of arr) {
        expect(typeof item.href).toBe('string');
        expect(item.href.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('getFooterItems', () => {
  const OPERATOR_ROLES: Role[] = ['staff', 'admin', 'superadmin'];
  const CLIENT_ROLES: Role[] = ['user', 'supplier'];

  for (const role of OPERATOR_ROLES) {
    it(`returns OPERATOR_FOOTER for ${role}`, () => {
      expect(getFooterItems(role)).toBe(OPERATOR_FOOTER);
    });
  }

  for (const role of CLIENT_ROLES) {
    it(`returns CUSTOMER_FOOTER for ${role}`, () => {
      expect(getFooterItems(role)).toBe(CUSTOMER_FOOTER);
    });
  }

  it('returns CUSTOMER_FOOTER for null (anonymous shouldn\'t see Settings)', () => {
    expect(getFooterItems(null)).toBe(CUSTOMER_FOOTER);
  });

  it('OPERATOR_FOOTER includes Settings; CUSTOMER_FOOTER does not', () => {
    expect(OPERATOR_FOOTER.some((item) => item.id === 'settings')).toBe(true);
    expect(CUSTOMER_FOOTER.some((item) => item.id === 'settings')).toBe(false);
  });
});
