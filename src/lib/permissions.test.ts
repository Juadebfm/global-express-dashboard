import { describe, expect, it } from 'vitest';
import { can, type Action } from './permissions';
import type { User } from '@/types';

type Role = User['role'];

const ALL_ROLES: Role[] = ['user', 'supplier', 'staff', 'admin', 'superadmin'];

// Expected truth table. Keep this hand-written rather than re-using the
// policy map — duplicate spec on purpose. If the policy drifts from
// intent, the test fails loudly instead of silently rubber-stamping it.
const EXPECTED: Record<Action, Role[]> = {
  // App scopes
  'app.operator': ['staff', 'admin', 'superadmin'],
  'app.admin': ['admin', 'superadmin'],
  'app.superadmin': ['superadmin'],

  // Orders
  'orders.deleteImage': ['admin', 'superadmin'],
  'orders.approveOverride': ['superadmin'],
  'orders.delete': ['admin', 'superadmin'],
  'orders.updateStatus': ['staff', 'admin', 'superadmin'],
  'orders.warehouseVerify': ['staff', 'admin', 'superadmin'],
  'orders.escalate': ['staff', 'admin', 'superadmin'],
  'orders.clearEscalation': ['superadmin'],

  // Shipments
  'shipments.viewDetail': ['staff', 'admin', 'superadmin'],
  'shipments.intake': ['admin', 'superadmin'],
  'shipments.batchManage': ['staff', 'admin', 'superadmin'],
  'shipments.batchApprove': ['superadmin'],

  // Clients / suppliers
  'clients.view': ['staff', 'admin', 'superadmin'],
  'clients.invite': ['staff', 'admin', 'superadmin'],

  // Team
  'team.view': ['admin', 'superadmin'],
  'team.invite': ['admin', 'superadmin'],
  'team.approve': ['superadmin'],
  'team.changeRole': ['admin', 'superadmin'],

  // Settings
  'settings.viewFx': ['staff', 'admin', 'superadmin'],
  'settings.editFx': ['superadmin'],
  'settings.editPricing': ['superadmin'],
  'settings.editShipmentTypes': ['superadmin'],
  'settings.editRestrictedGoods': ['admin', 'superadmin'],
  'settings.editPackaging': ['superadmin'],
};

describe('can() — full role × action truth table', () => {
  for (const action of Object.keys(EXPECTED) as Action[]) {
    const allowed = EXPECTED[action];
    for (const role of ALL_ROLES) {
      const shouldPass = allowed.includes(role);
      it(`${shouldPass ? 'allows' : 'denies'} ${role} for ${action}`, () => {
        expect(can(role, action)).toBe(shouldPass);
      });
    }
  }
});

describe('can() — defensive defaults', () => {
  it('denies every action when role is null', () => {
    for (const action of Object.keys(EXPECTED) as Action[]) {
      expect(can(null, action)).toBe(false);
    }
  });

  it('denies every action when role is undefined', () => {
    for (const action of Object.keys(EXPECTED) as Action[]) {
      expect(can(undefined, action)).toBe(false);
    }
  });
});
