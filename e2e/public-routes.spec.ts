import { expect, test } from '@playwright/test';

test.describe('Public Route Smoke Tests', () => {
  test('home page renders key entry links', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('img', { name: /globalxpress/i }).first()).toBeVisible();
    await expect(page.locator('a[href="/sign-in"]')).toHaveCount(1);
    await expect(page.locator('a[href="/login"]')).toHaveCount(1);
  });

  test('login page renders auth form controls', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('track page renders search form and validates empty state', async ({ page }) => {
    await page.goto('/track', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/track$/);
    const trackingInput = page.locator('input[type="text"]');
    const submitButton = page.locator('button[type="submit"]');

    await expect(trackingInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeDisabled();

    await trackingInput.fill('GX123456789');
    await expect(submitButton).toBeEnabled();
  });
});
