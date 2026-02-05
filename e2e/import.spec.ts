import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * CSV Import Flow Tests
 * Tests the user flow for importing Fertility Friend CSV data
 */

test.describe('Import Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/import');
  });

  test('shows upload zone initially', async ({ page }) => {
    await expect(page.getByText(/Drag & drop your CSV file here/i)).toBeVisible();
    await expect(page.getByText(/or click to browse/i)).toBeVisible();
    await expect(page.getByText(/Supports Fertility Friend CSV exports/i)).toBeVisible();
  });

  test('shows help instructions', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /How to Export from Fertility Friend/i })).toBeVisible();
    await expect(page.getByText(/Open the Fertility Friend app/i)).toBeVisible();
    await expect(page.getByText(/Settings/i)).toBeVisible();
    await expect(page.getByText(/CSV Export/i)).toBeVisible();
  });

  test('can upload a valid CSV file', async ({ page }) => {
    // Set up file chooser
    const fileChooserPromise = page.waitForEvent('filechooser');
    
    // Click the upload zone
    await page.getByText(/Drag & drop your CSV file here/i).click();
    
    // Select the file
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, 'fixtures/sample-ff-export.csv'));
    
    // Should show preview
    await expect(page.getByText(/sample-ff-export.csv/i)).toBeVisible();
    await expect(page.getByText(/days of data found/i)).toBeVisible();
    
    // Preview table should be visible
    await expect(page.getByRole('heading', { name: /Preview/i })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('shows preview table with correct columns', async ({ page }) => {
    // Upload file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText(/Drag & drop your CSV file here/i).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, 'fixtures/sample-ff-export.csv'));
    
    // Wait for preview
    await expect(page.getByRole('heading', { name: /Preview/i })).toBeVisible();
    
    // Check for expected columns
    await expect(page.getByRole('columnheader', { name: /Date/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Temp/i })).toBeVisible();
  });

  test('can import data after preview', async ({ page }) => {
    // Upload file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText(/Drag & drop your CSV file here/i).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, 'fixtures/sample-ff-export.csv'));
    
    // Wait for preview
    await expect(page.getByText(/days of data found/i)).toBeVisible();
    
    // Click import button
    await page.getByRole('button', { name: /Import.*Days of Data/i }).click();
    
    // Wait for success state
    await expect(page.getByText(/Import Complete!/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Successfully imported/i)).toBeVisible();
  });

  test('shows success state with navigation options', async ({ page }) => {
    // Upload and import
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText(/Drag & drop your CSV file here/i).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, 'fixtures/sample-ff-export.csv'));
    
    await page.getByRole('button', { name: /Import.*Days of Data/i }).click();
    
    // Wait for success
    await expect(page.getByText(/Import Complete!/i)).toBeVisible({ timeout: 10000 });
    
    // Navigation options should be visible
    await expect(page.getByRole('link', { name: /View Dashboard/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Import More/i })).toBeVisible();
  });

  test('can navigate to dashboard after import', async ({ page }) => {
    // Upload and import
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText(/Drag & drop your CSV file here/i).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, 'fixtures/sample-ff-export.csv'));
    
    await page.getByRole('button', { name: /Import.*Days of Data/i }).click();
    
    // Wait for success
    await expect(page.getByText(/Import Complete!/i)).toBeVisible({ timeout: 10000 });
    
    // Navigate to dashboard
    await page.getByRole('link', { name: /View Dashboard/i }).click();
    await expect(page).toHaveURL('/dashboard');
  });

  test('can change file in preview state', async ({ page }) => {
    // Upload first file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText(/Drag & drop your CSV file here/i).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, 'fixtures/sample-ff-export.csv'));
    
    // Wait for preview
    await expect(page.getByText(/sample-ff-export.csv/i)).toBeVisible();
    
    // Click change file
    await page.getByRole('button', { name: /Change file/i }).click();
    
    // Should go back to upload state
    await expect(page.getByText(/Drag & drop your CSV file here/i)).toBeVisible();
  });

  test('can cancel import and go back', async ({ page }) => {
    // Upload file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText(/Drag & drop your CSV file here/i).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, 'fixtures/sample-ff-export.csv'));
    
    // Wait for preview
    await expect(page.getByText(/days of data found/i)).toBeVisible();
    
    // Click cancel
    await page.getByRole('button', { name: /Cancel/i }).click();
    
    // Should go back to upload state
    await expect(page.getByText(/Drag & drop your CSV file here/i)).toBeVisible();
  });
});

test.describe('Import Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('upload zone is tappable on mobile', async ({ page }) => {
    await page.goto('/import');
    
    // Upload zone should be visible and have enough tap target
    const uploadZone = page.getByText(/Drag & drop your CSV file here/i);
    await expect(uploadZone).toBeVisible();
    await expect(uploadZone).toBeInViewport();
  });

  test('preview table scrolls horizontally on mobile', async ({ page }) => {
    await page.goto('/import');
    
    // Upload file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText(/Drag & drop your CSV file here/i).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, 'fixtures/sample-ff-export.csv'));
    
    // Preview should be visible
    await expect(page.getByRole('heading', { name: /Preview/i })).toBeVisible();
    
    // Table container should exist with overflow
    const tableContainer = page.locator('.overflow-x-auto').first();
    await expect(tableContainer).toBeVisible();
  });
});
