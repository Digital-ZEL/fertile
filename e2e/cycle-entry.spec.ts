import { test, expect } from '@playwright/test';

/**
 * Cycle Entry Flow Tests
 * Tests the user flow for entering cycle information
 */

test.describe('Cycle Entry Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cycle');
  });

  test('can see cycle entry form', async ({ page }) => {
    // Form elements should be visible
    await expect(page.getByRole('heading', { name: /Log New Cycle/i })).toBeVisible();
    await expect(page.getByLabel(/First Day of Period/i)).toBeVisible();
    await expect(page.getByLabel(/Cycle Length/i)).toBeVisible();
    await expect(page.getByLabel(/Period Length/i)).toBeVisible();
    await expect(page.getByLabel(/Notes/i)).toBeVisible();
  });

  test('cycle length slider shows current value', async ({ page }) => {
    // Default should show 28 days
    await expect(page.getByText(/28 days/i)).toBeVisible();
    
    // Slider should be interactive
    const slider = page.getByRole('slider', { name: /Cycle Length/i });
    await expect(slider).toBeVisible();
    await expect(slider).toHaveValue('28');
  });

  test('period length slider shows current value', async ({ page }) => {
    // Default should show 5 days
    await expect(page.getByText(/5 days/i)).toBeVisible();
    
    // Slider should be interactive
    const slider = page.getByRole('slider', { name: /Period Length/i });
    await expect(slider).toBeVisible();
    await expect(slider).toHaveValue('5');
  });

  test('can enter a new cycle', async ({ page }) => {
    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    // Fill in the date
    await page.getByLabel(/First Day of Period/i).fill(dateStr);
    
    // Adjust cycle length to 30
    const cycleLengthSlider = page.getByRole('slider', { name: /Cycle Length/i });
    await cycleLengthSlider.fill('30');
    
    // Adjust period length to 4
    const periodLengthSlider = page.getByRole('slider', { name: /Period Length/i });
    await periodLengthSlider.fill('4');
    
    // Add a note
    await page.getByLabel(/Notes/i).fill('E2E test cycle entry');
    
    // Submit the form
    await page.getByRole('button', { name: /Save Cycle/i }).click();
    
    // Should see success message
    await expect(page.getByText(/Cycle saved!/i)).toBeVisible();
  });

  test('saved cycle appears in history', async ({ page }) => {
    // First, save a cycle
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    await page.getByLabel(/First Day of Period/i).fill(dateStr);
    await page.getByLabel(/Notes/i).fill('Test cycle for history');
    await page.getByRole('button', { name: /Save Cycle/i }).click();
    
    // Wait for success
    await expect(page.getByText(/Cycle saved!/i)).toBeVisible();
    
    // Check history section
    await expect(page.getByRole('heading', { name: /Cycle History/i })).toBeVisible();
    
    // Should show the logged cycle with day count
    await expect(page.getByText(/28-day cycle/i)).toBeVisible();
  });

  test('can navigate back to dashboard', async ({ page }) => {
    await page.getByRole('link', { name: /Back to Dashboard/i }).click();
    await expect(page).toHaveURL('/dashboard');
  });

  test('date picker does not allow future dates', async ({ page }) => {
    const dateInput = page.getByLabel(/First Day of Period/i);
    
    // Check that max attribute is set
    const maxDate = await dateInput.getAttribute('max');
    expect(maxDate).toBeTruthy();
    
    const today = new Date().toISOString().split('T')[0];
    expect(maxDate).toBe(today);
  });
});

test.describe('Cycle Entry Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('form is usable on mobile', async ({ page }) => {
    await page.goto('/cycle');
    
    // All form elements should be visible and usable
    await expect(page.getByRole('heading', { name: /Log New Cycle/i })).toBeVisible();
    await expect(page.getByLabel(/First Day of Period/i)).toBeVisible();
    
    // Sliders should be tappable
    const cycleLengthSlider = page.getByRole('slider', { name: /Cycle Length/i });
    await expect(cycleLengthSlider).toBeVisible();
    
    // Save button should be fully visible
    const saveButton = page.getByRole('button', { name: /Save Cycle/i });
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toBeInViewport();
  });
});
