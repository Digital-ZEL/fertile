import { test, expect } from '@playwright/test';

/**
 * Smoke Tests - Basic page load and navigation
 * These run in CI to ensure the app is functional
 */

test.describe('Smoke Tests', () => {
  test('homepage loads and displays hero', async ({ page }) => {
    await page.goto('/');
    
    // Check hero content
    await expect(page.getByRole('heading', { name: /One Unified/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Fertile Window/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Get Started/i })).toBeVisible();
  });

  test('homepage has "How It Works" section', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.getByRole('heading', { name: /How It Works/i })).toBeVisible();
    await expect(page.getByText(/Input Predictions/i)).toBeVisible();
    await expect(page.getByText(/Smart Reconciliation/i)).toBeVisible();
    await expect(page.getByText(/Confidence Scores/i)).toBeVisible();
  });

  test('can navigate from homepage to dashboard', async ({ page }) => {
    await page.goto('/');
    
    await page.getByRole('link', { name: /Get Started/i }).click();
    await expect(page).toHaveURL('/dashboard');
    
    // Dashboard should load
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 10000 });
  });

  test('dashboard loads', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should show empty state or predictions
    await expect(
      page.getByText(/No predictions yet|Unified Fertile Window/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test('import page loads', async ({ page }) => {
    await page.goto('/import');
    
    await expect(page.getByRole('heading', { name: /Import Data/i })).toBeVisible();
    await expect(page.getByText(/Drag & drop your CSV file here/i)).toBeVisible();
  });

  test('cycle page loads', async ({ page }) => {
    await page.goto('/cycle');
    
    await expect(page.getByRole('heading', { name: /Cycle Tracking/i })).toBeVisible();
    await expect(page.getByLabel(/First Day of Period/i)).toBeVisible();
  });

  test('compare page loads', async ({ page }) => {
    await page.goto('/compare');
    
    // Should show empty state or comparison
    await expect(
      page.getByText(/No predictions to compare|Compare Predictions/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test('observe page loads', async ({ page }) => {
    await page.goto('/observe');
    
    // Page should load without errors
    await expect(page.locator('body')).toBeVisible();
  });

  test('settings page loads', async ({ page }) => {
    await page.goto('/settings');
    
    // Page should load without errors
    await expect(page.locator('body')).toBeVisible();
  });

  test('all main navigation links work', async ({ page }) => {
    await page.goto('/');
    
    // Test Get Started -> Dashboard
    await page.getByRole('link', { name: /Get Started/i }).click();
    await expect(page).toHaveURL('/dashboard');
    
    // Navigate to import from dashboard
    const importLink = page.getByRole('link', { name: /Import Predictions|Add Another Source/i });
    if (await importLink.isVisible()) {
      await importLink.first().click();
      await expect(page).toHaveURL('/import');
    }
  });
});

test.describe('Mobile Smoke Tests', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('homepage is responsive', async ({ page }) => {
    await page.goto('/');
    
    // Hero should be visible on mobile
    await expect(page.getByRole('heading', { name: /One Unified/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Get Started/i })).toBeVisible();
  });

  test('dashboard is responsive', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should show mobile section tabs
    await expect(page.locator('body')).toBeVisible();
    
    // Check for mobile tabs or content
    const mobileContent = page.getByText(/overview|calendar|sources/i).first();
    await expect(mobileContent).toBeVisible({ timeout: 10000 });
  });

  test('import page is responsive', async ({ page }) => {
    await page.goto('/import');
    
    await expect(page.getByRole('heading', { name: /Import Data/i })).toBeVisible();
    // Upload zone should be visible and tappable
    await expect(page.getByText(/Drag & drop your CSV file here/i)).toBeVisible();
  });
});
