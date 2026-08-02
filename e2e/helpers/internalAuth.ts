import type { Page } from '@playwright/test';

// Browser E2E tests run against the local Vite app and intercept its API
// traffic. Keep this aligned with the environment Vite receives in CI.
export const API = process.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

export type InternalRole = 'staff' | 'admin' | 'superadmin';

export interface InternalTestUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: InternalRole;
  isActive: boolean;
  mustChangePassword: boolean;
  mustCompleteProfile: boolean;
  createdAt: string;
  updatedAt: string;
}

export const ADMIN_USER: InternalTestUser = {
  id: 'test-admin-id',
  email: 'admin@test.com',
  firstName: 'Test',
  lastName: 'Admin',
  role: 'admin',
  isActive: true,
  mustChangePassword: false,
  mustCompleteProfile: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const SUPERADMIN_USER: InternalTestUser = {
  ...ADMIN_USER,
  id: 'test-superadmin-id',
  email: 'superadmin@test.com',
  role: 'superadmin',
};

const CAPABILITY_DEFINITIONS = [
  ['catalogue.manage', 'staff'],
  ['local_delivery.manage', 'staff'],
  ['client_login.provision', 'staff'],
  ['batches.manage', 'admin'],
  ['batches.finalise', 'admin'],
  ['operations.escalation.resolve', 'admin'],
  ['reports.operational.view', 'admin'],
  ['audit_logs.view', 'admin'],
  ['payments.verify', 'admin'],
  ['finance.reports.view', 'admin'],
  ['bank_accounts.manage', 'admin'],
  ['fx_rates.manage', 'admin'],
  ['pricing.rules.manage', 'admin'],
  ['warehouses.manage', 'admin'],
  ['business_settings.manage', 'admin'],
  ['restricted_items.override', 'admin'],
  ['broadcasts.manage', 'admin'],
  ['newsletter.manage', 'admin'],
  ['leads.manage', 'admin'],
] as const;

export type TestCapability = (typeof CAPABILITY_DEFINITIONS)[number][0];

function ok(data: unknown) {
  return { success: true, data };
}

function matrixFor(user: InternalTestUser, grantedCapabilities: readonly TestCapability[]) {
  const granted = new Set(grantedCapabilities);
  return {
    userId: user.id,
    role: user.role,
    isActive: user.isActive,
    capabilities: CAPABILITY_DEFINITIONS.map(([key, minimumRole]) => ({
      key,
      name: key,
      minimumRole,
      description: '',
      includes: [],
      eligible: minimumRole === 'staff' || user.role !== 'staff',
      granted: user.role === 'superadmin' || granted.has(key),
    })),
  };
}

interface SetupInternalAuthOptions {
  user?: InternalTestUser;
  grantedCapabilities?: readonly TestCapability[];
}

/**
 * Reproduces the internal-browser session contract exactly enough for mocked
 * E2E tests: token in sessionStorage, /auth/me at boot, then /permissions/me.
 */
export async function setupInternalAuth(
  page: Page,
  { user = ADMIN_USER, grantedCapabilities = [] }: SetupInternalAuthOptions = {},
): Promise<void> {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('globalxpress_token', 'e2e-test-token');
  });

  await page.route(`${API}/auth/me`, (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(ok(user)) }),
  );
  await page.route(`${API}/permissions/me`, (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(ok(matrixFor(user, grantedCapabilities))),
    }),
  );

  // Silence global requests unrelated to a focused E2E scenario.
  await page.route(`${API}/notifications/unread-count`, (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(ok({ count: 0 })) }),
  );
  await page.route(`${API}/support/tickets**`, (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(ok({ data: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } })),
    }),
  );
  await page.route(`${API}/shipments**`, (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(ok({ data: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } })),
    }),
  );
  await page.route(`${API}/dashboard**`, (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(ok(null)) }),
  );
}
