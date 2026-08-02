import { expect, test } from '@playwright/test';

const launchGateEnabled = (process.env.VITE_LAUNCH_GATE_ENABLED ?? 'false').toLowerCase() === 'true';

test.describe('Public Route Smoke Tests', () => {
  test('home page redirects an unauthenticated visitor to customer sign-in when launch gate is disabled', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('img', { name: /globalxpress/i }).first()).toBeVisible();

    if (launchGateEnabled) {
      await expect(page.getByRole('heading', { name: /final security checks in progress/i })).toBeVisible();
      await expect(page.getByText(/launch target: saturday, april 18, 2026 at 00:00 utc/i)).toBeVisible();
      return;
    }

    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('login page renders the internal sign-in form when launch gate is disabled', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/login$/);

    if (launchGateEnabled) {
      await expect(page.getByRole('heading', { name: /final security checks in progress/i })).toBeVisible();
      await expect(page.locator('input[type="email"]')).toHaveCount(0);
      return;
    }

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('track page renders tracking controls when launch gate is disabled', async ({ page }) => {
    await page.goto('/track', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/track$/);

    if (launchGateEnabled) {
      await expect(page.getByRole('heading', { name: /final security checks in progress/i })).toBeVisible();
      await expect(page.getByText(/global pre-launch access/i)).toBeVisible();
      return;
    }

    const trackingInput = page.locator('input[type="text"]');
    const submitButton = page.locator('button[type="submit"]');

    await expect(trackingInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeDisabled();
  });
});
