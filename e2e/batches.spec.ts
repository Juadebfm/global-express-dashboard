import { expect, test } from '@playwright/test';
import { API, ADMIN_USER, setupInternalAuth } from './helpers/internalAuth';

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_BATCHES = [
  {
    id: 'batch-air-001',
    masterTrackingNumber: 'GEX-MASTER-AIR-20260613-A1B2C3',
    transportMode: 'air',
    transportLabel: 'Air Freight',
    status: 'open',
    statusLabel: 'Accepting goods',
    customerCount: 4,
    orderCount: 11,
    totalWeightKg: '143.500',
  },
  {
    id: 'batch-sea-001',
    masterTrackingNumber: 'GEX-MASTER-SEA-20260613-D4E5F6',
    transportMode: 'sea',
    transportLabel: 'Ocean Freight',
    status: 'closed',
    statusLabel: 'Sealed',
    customerCount: 2,
    orderCount: 5,
    totalWeightKg: '820.000',
  },
];

const MOCK_ROSTER = {
  batch: {
    id: 'batch-air-001',
    masterTrackingNumber: 'GEX-MASTER-AIR-20260613-A1B2C3',
    transportMode: 'air',
    transportLabel: 'Air Freight',
    status: 'open',
    statusLabel: 'Accepting goods',
    carrierName: null,
    airlineTrackingNumber: null,
    oceanTrackingNumber: null,
    d2dTrackingNumber: null,
    voyageOrFlightNumber: null,
    estimatedDepartureAt: null,
    estimatedArrivalAt: null,
    closedAt: null,
    notes: null,
    createdAt: '2026-06-13T08:00:00.000Z',
    updatedAt: '2026-06-13T08:00:00.000Z',
  },
  customers: [
    {
      slotId: 'slot-1',
      customerId: 'cust-1',
      customerName: 'Adaobi Nwachukwu',
      shippingMark: 'GE-AN-X7K4',
      batchTrackingNumber: 'GEX-20260601-AB12CD34',
      orderCount: 1,
      totalWeightKg: '4.500',
      allVerified: true,
      orders: [
        {
          id: 'order-1',
          trackingNumber: 'GEX-20260601-AB12CD34',
          status: 'WAREHOUSE_VERIFIED_PRICED',
          statusLabel: 'Verified and priced',
          description: 'Electronics',
          weightKg: '4.500',
          shipmentType: 'air',
          shipmentTypeLabel: 'Air freight',
          declaredValueUsd: '320.00',
          createdAt: '2026-06-01T10:00:00.000Z',
        },
      ],
    },
    {
      slotId: 'slot-2',
      customerId: 'cust-2',
      customerName: 'Emeka Okafor',
      shippingMark: 'GE-EO-M3P9',
      batchTrackingNumber: 'GEX-20260601-CD34EF56',
      orderCount: 1,
      totalWeightKg: '9.700',
      allVerified: false,
      orders: [
        {
          id: 'order-2',
          trackingNumber: 'GEX-20260601-CD34EF56',
          status: 'WAREHOUSE_RECEIVED',
          statusLabel: 'Received at warehouse',
          description: 'Clothing',
          weightKg: '9.700',
          shipmentType: 'air',
          shipmentTypeLabel: 'Air freight',
          declaredValueUsd: '150.00',
          createdAt: '2026-06-02T09:00:00.000Z',
        },
      ],
    },
  ],
  summary: {
    totalCustomers: 2,
    totalOrders: 2,
    totalWeightKg: '14.200',
    unverifiedOrders: 1,
    canClose: false,
    shipmentTypeBreakdown: { air: 2 },
    goodsTypeBreakdown: { air: 2 },
  },
};

const MOCK_STATUS_LABELS = [
  { status: 'DISPATCHED_TO_ORIGIN_AIRPORT', label: 'Sent to the airport', description: 'Dispatched.' },
  { status: 'AT_ORIGIN_AIRPORT', label: 'At the airport', description: 'At origin.' },
  { status: 'FLIGHT_DEPARTED', label: 'Flight has departed', description: 'In the air.' },
  { status: 'FLIGHT_LANDED_LAGOS', label: 'Landed in Lagos', description: 'Arrived.' },
  { status: 'CUSTOMS_CLEARED_LAGOS', label: 'Cleared customs in Lagos', description: 'Cleared.' },
  { status: 'READY_FOR_PICKUP', label: 'Ready for pickup at our office', description: 'Ready.' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function ok(data: unknown) {
  return { success: true, data };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Batch Management', () => {
  test.describe('auth protection', () => {
    test('/batches redirects unauthenticated users to /login', async ({ page }) => {
      // No token, no auth mock
      await page.goto('/batches');
      await expect(page).toHaveURL(/\/login/);
    });

    test('/batches/:id redirects unauthenticated users to /login', async ({ page }) => {
      await page.goto('/batches/some-batch-id');
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('BatchesPage', () => {
    test.beforeEach(async ({ page }) => {
      await setupInternalAuth(page);
      await page.route(`${API}/batches/status-labels`, (route) =>
        route.fulfill({ contentType: 'application/json', body: JSON.stringify(ok(MOCK_STATUS_LABELS)) }),
      );
      await page.route(`${API}/batches**`, (route) => {
        const url = new URL(route.request().url());
        // Only intercept the list endpoint (no path segments after /batches)
        if (url.pathname.endsWith('/batches') || url.pathname.includes('/batches?')) {
          return route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify(ok({ batches: MOCK_BATCHES, pagination: { page: 1, limit: 20, total: 2, totalPages: 1 } })),
          });
        }
        return route.continue();
      });
    });

    test('renders the page heading', async ({ page }) => {
      await page.goto('/batches');
      await expect(page.getByRole('heading', { name: 'Batches' })).toBeVisible();
    });

    test('renders status filter tabs', async ({ page }) => {
      await page.goto('/batches');
      // exact: true avoids substring match with "All modes" button
      await expect(page.getByRole('button', { name: 'All', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Open', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Closed', exact: true })).toBeVisible();
    });

    test('renders transport mode filter buttons', async ({ page }) => {
      await page.goto('/batches');
      await expect(page.getByRole('button', { name: /all modes/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /^air$/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /^sea$/i })).toBeVisible();
    });

    test('renders batch cards with tracking numbers', async ({ page }) => {
      await page.goto('/batches');
      const batchTable = page.locator('table:visible');
      await expect(batchTable.getByText('GEX-MASTER-AIR-20260613-A1B2C3')).toBeVisible();
      await expect(batchTable.getByText('GEX-MASTER-SEA-20260613-D4E5F6')).toBeVisible();
    });

    test('renders transport mode badges on batch cards', async ({ page }) => {
      await page.goto('/batches');
      const batchTable = page.locator('table:visible');
      await expect(batchTable.getByText('Air Freight')).toBeVisible();
      await expect(batchTable.getByText('Ocean Freight')).toBeVisible();
    });

    test('renders status labels on batch cards', async ({ page }) => {
      await page.goto('/batches');
      const batchTable = page.locator('table:visible');
      await expect(batchTable.getByText('Accepting goods')).toBeVisible();
      await expect(batchTable.getByText('Sealed')).toBeVisible();
    });

    test('renders customer and order counts on batch cards', async ({ page }) => {
      await page.goto('/batches');
      const batchTable = page.locator('table:visible');
      // First batch: 4 customers, 11 orders
      await expect(batchTable.getByText('4', { exact: true })).toBeVisible();
      await expect(batchTable.getByText('11', { exact: true })).toBeVisible();
    });

    test('explains that batches are created automatically', async ({ page }) => {
      await page.goto('/batches');
      await expect(page.getByText(/batches are created automatically when orders are verified and priced/i)).toBeVisible();
    });

    test('clicking a batch card navigates to detail page', async ({ page }) => {
      // Also mock the roster so the detail page loads
      await page.route(`${API}/batches/batch-air-001/roster`, (route) =>
        route.fulfill({ contentType: 'application/json', body: JSON.stringify(ok(MOCK_ROSTER)) }),
      );
      await page.goto('/batches');
      await page.locator('table:visible').getByText('GEX-MASTER-AIR-20260613-A1B2C3').click();
      await expect(page).toHaveURL(/\/batches\/batch-air-001/);
    });

    test('shows "Batches" as active in sidebar nav', async ({ page }) => {
      await page.goto('/batches');
      // The sidebar renders the nav item with data-tour attribute
      const batchesNav = page.locator('[data-tour="nav-batches"]');
      await expect(batchesNav).toBeVisible();
    });
  });

  test.describe('BatchDetailPage', () => {
    test.beforeEach(async ({ page }) => {
      await setupInternalAuth(page);
      await page.route(`${API}/batches/status-labels`, (route) =>
        route.fulfill({ contentType: 'application/json', body: JSON.stringify(ok(MOCK_STATUS_LABELS)) }),
      );
      await page.route(`${API}/batches/batch-air-001/roster`, (route) =>
        route.fulfill({ contentType: 'application/json', body: JSON.stringify(ok(MOCK_ROSTER)) }),
      );
    });

    test('renders the batch tracking number in the header', async ({ page }) => {
      await page.goto('/batches/batch-air-001');
      await expect(page.getByText('GEX-MASTER-AIR-20260613-A1B2C3')).toBeVisible();
    });

    test('renders transport mode and status badges', async ({ page }) => {
      await page.goto('/batches/batch-air-001');
      await expect(page.getByText('Air Freight')).toBeVisible();
      await expect(page.getByText('Accepting goods')).toBeVisible();
    });

    test('renders summary stats cards', async ({ page }) => {
      await page.goto('/batches/batch-air-001');
      await expect(page.locator('p').filter({ hasText: /^Customers$/ })).toBeVisible();
      await expect(page.locator('p').filter({ hasText: /^Orders$/ })).toBeVisible();
      await expect(page.locator('p').filter({ hasText: /^Total weight$/ })).toBeVisible();
    });

    test('renders unverified warning when unverifiedOrders > 0', async ({ page }) => {
      await page.goto('/batches/batch-air-001');
      await expect(
        page.getByText(/1 order.*still need.*verified and priced.*before this batch can be closed/i),
      ).toBeVisible();
    });

    test('renders customer roster with customer names', async ({ page }) => {
      await page.goto('/batches/batch-air-001');
      const rosterTable = page.locator('table:visible');
      await expect(rosterTable.getByText('Adaobi Nwachukwu')).toBeVisible();
      await expect(rosterTable.getByText('Emeka Okafor')).toBeVisible();
    });

    test('renders batch tracking numbers for each customer (not individual order numbers)', async ({ page }) => {
      await page.goto('/batches/batch-air-001');
      const rosterTable = page.locator('table:visible');
      await expect(rosterTable.getByText('GEX-20260601-AB12CD34')).toBeVisible();
      await expect(rosterTable.getByText('GEX-20260601-CD34EF56')).toBeVisible();
    });

    test('unverified customer slot shows "Unverified" badge', async ({ page }) => {
      await page.goto('/batches/batch-air-001');
      await expect(
        page.locator('table:visible').getByRole('row', { name: /Emeka Okafor/ }).getByText('Unverified orders'),
      ).toBeVisible();
    });

    test('expanding a customer row reveals order details', async ({ page }) => {
      await page.goto('/batches/batch-air-001');
      // Click Adaobi's row to expand
      const rosterTable = page.locator('table:visible');
      await rosterTable.getByText('Adaobi Nwachukwu').click();
      await expect(rosterTable.getByText('Electronics')).toBeVisible();
      // exact: true avoids a substring match with the warning banner which contains
      // "verified and priced" as part of a longer sentence.
      await expect(rosterTable.getByText('Verified', { exact: true })).toBeVisible();
    });

    test('manual batch controls stay hidden for an admin without batches.manage', async ({ page }) => {
      await page.goto('/batches/batch-air-001');
      await expect(page.getByText('Add order manually')).not.toBeVisible();
    });

    test('"Back" link navigates to the batch list', async ({ page }) => {
      // This wildcard is registered AFTER beforeEach's roster mock. Playwright resolves
      // routes LIFO so this runs first. For roster requests we call route.fallback() so
      // the beforeEach handler picks them up; for the list endpoint we return the mock.
      await page.route(`${API}/batches**`, (route) => {
        const url = new URL(route.request().url());
        if (url.pathname.endsWith('/batches')) {
          return route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify(ok({ batches: MOCK_BATCHES, pagination: { page: 1, limit: 20, total: 2, totalPages: 1 } })),
          });
        }
        return route.fallback();
      });
      await page.goto('/batches/batch-air-001');
      await page.getByRole('link', { name: /all batches/i }).click();
      await expect(page).toHaveURL(/\/batches$/);
    });

    test('"Close batch" stays hidden without batches.finalise', async ({ page }) => {
      await page.goto('/batches/batch-air-001');
      await expect(page.getByRole('button', { name: /close batch/i })).not.toBeVisible();
    });
  });

  test.describe('BatchDetailPage (capability grants)', () => {
    test.beforeEach(async ({ page }) => {
      await setupInternalAuth(page, {
        user: ADMIN_USER,
        grantedCapabilities: ['batches.manage', 'batches.finalise'],
      });
      await page.route(`${API}/batches/status-labels`, (route) =>
        route.fulfill({ contentType: 'application/json', body: JSON.stringify(ok(MOCK_STATUS_LABELS)) }),
      );
      await page.route(`${API}/batches/batch-air-001/roster`, (route) =>
        route.fulfill({ contentType: 'application/json', body: JSON.stringify(ok(MOCK_ROSTER)) }),
      );
    });

    test('manual batch controls are visible with batches.manage', async ({ page }) => {
      await page.route(`${API}/batches/batch-air-001/available-orders`, (route) =>
        route.fulfill({ contentType: 'application/json', body: JSON.stringify(ok([])) }),
      );
      await page.goto('/batches/batch-air-001');
      await expect(page.getByText('Add order manually')).toBeVisible();
    });

    test('"Close batch" button is visible with batches.finalise', async ({ page }) => {
      await page.goto('/batches/batch-air-001');
      await expect(page.getByRole('button', { name: /close batch/i })).toBeVisible();
    });

    test('"Close batch" button is disabled when canClose is false', async ({ page }) => {
      // MOCK_ROSTER has canClose: false (unverified orders exist)
      await page.goto('/batches/batch-air-001');
      await expect(page.getByRole('button', { name: /close batch/i })).toBeDisabled();
    });

    test('"Close batch" button is enabled when canClose is true', async ({ page }) => {
      const closableRoster = {
        ...MOCK_ROSTER,
        customers: [{ ...MOCK_ROSTER.customers[0] }],
        summary: { ...MOCK_ROSTER.summary, unverifiedOrders: 0, canClose: true, totalCustomers: 1, totalOrders: 1 },
      };
      await page.route(`${API}/batches/batch-air-001/roster`, (route) =>
        route.fulfill({ contentType: 'application/json', body: JSON.stringify(ok(closableRoster)) }),
      );
      await page.goto('/batches/batch-air-001');
      await expect(page.getByRole('button', { name: /close batch/i })).toBeEnabled();
    });

    test('clicking "Close batch" opens confirmation modal', async ({ page }) => {
      const closableRoster = {
        ...MOCK_ROSTER,
        customers: [{ ...MOCK_ROSTER.customers[0] }],
        summary: { ...MOCK_ROSTER.summary, unverifiedOrders: 0, canClose: true, totalCustomers: 1, totalOrders: 1 },
      };
      await page.route(`${API}/batches/batch-air-001/roster`, (route) =>
        route.fulfill({ contentType: 'application/json', body: JSON.stringify(ok(closableRoster)) }),
      );
      await page.goto('/batches/batch-air-001');
      await page.getByRole('button', { name: /close batch/i }).click();
      await expect(page.getByText('Close this batch?')).toBeVisible();
      await expect(page.getByText(/this cannot be undone/i)).toBeVisible();
    });

    test('cancel in close confirm modal dismisses it', async ({ page }) => {
      const closableRoster = {
        ...MOCK_ROSTER,
        summary: { ...MOCK_ROSTER.summary, unverifiedOrders: 0, canClose: true },
      };
      await page.route(`${API}/batches/batch-air-001/roster`, (route) =>
        route.fulfill({ contentType: 'application/json', body: JSON.stringify(ok(closableRoster)) }),
      );
      await page.goto('/batches/batch-air-001');
      await page.getByRole('button', { name: /close batch/i }).click();
      await expect(page.getByText('Close this batch?')).toBeVisible();
      // "Cancel" is unique on the page when the confirm modal is open — no need to scope.
      await page.getByRole('button', { name: /cancel/i }).click();
      await expect(page.getByText('Close this batch?')).not.toBeVisible();
    });
  });

  test.describe('BatchDetailPage — closed batch', () => {
    const CLOSED_ROSTER = {
      ...MOCK_ROSTER,
      batch: { ...MOCK_ROSTER.batch, status: 'closed', statusLabel: 'Sealed' },
      summary: { ...MOCK_ROSTER.summary, unverifiedOrders: 0, canClose: false },
    };

    test.beforeEach(async ({ page }) => {
      await setupInternalAuth(page, { grantedCapabilities: ['batches.manage'] });
      await page.route(`${API}/batches/status-labels`, (route) =>
        route.fulfill({ contentType: 'application/json', body: JSON.stringify(ok(MOCK_STATUS_LABELS)) }),
      );
      await page.route(`${API}/batches/batch-air-001/roster`, (route) =>
        route.fulfill({ contentType: 'application/json', body: JSON.stringify(ok(CLOSED_ROSTER)) }),
      );
    });

    test('does NOT show "Add order" input for closed batch', async ({ page }) => {
      await page.goto('/batches/batch-air-001');
      await expect(page.getByText('Add order to batch')).not.toBeVisible();
    });

    test('"Update status" button is visible for closed batch', async ({ page }) => {
      await page.goto('/batches/batch-air-001');
      await expect(page.getByRole('button', { name: /update status/i })).toBeVisible();
    });

    test('"Update status" button opens the status modal', async ({ page }) => {
      await page.goto('/batches/batch-air-001');
      await page.getByRole('button', { name: /update status/i }).click();
      const statusModal = page.getByRole('heading', { name: /update batch status/i }).locator('xpath=../..');
      await expect(statusModal).toBeVisible();
      await expect(statusModal.getByRole('combobox')).toBeVisible();
    });

    test('status modal shows transport-mode-relevant statuses', async ({ page }) => {
      await page.goto('/batches/batch-air-001');
      await page.getByRole('button', { name: /update status/i }).click();
      const select = page.getByRole('heading', { name: /update batch status/i }).locator('xpath=../..').getByRole('combobox');
      await expect(select.locator('option', { hasText: 'Sent to the airport' })).toHaveCount(1);
      await expect(select.locator('option', { hasText: 'Flight has departed' })).toHaveCount(1);
    });

    test('"Apply status" button is disabled until a status is selected', async ({ page }) => {
      await page.goto('/batches/batch-air-001');
      await page.getByRole('button', { name: /update status/i }).click();
      await expect(page.getByRole('button', { name: /apply status/i })).toBeDisabled();
    });

    test('selecting a status enables "Apply status" button', async ({ page }) => {
      await page.goto('/batches/batch-air-001');
      await page.getByRole('button', { name: /update status/i }).click();
      await page.getByRole('heading', { name: /update batch status/i }).locator('xpath=../..').getByRole('combobox').selectOption('FLIGHT_DEPARTED');
      await expect(page.getByRole('button', { name: /apply status/i })).toBeEnabled();
    });
  });
});
