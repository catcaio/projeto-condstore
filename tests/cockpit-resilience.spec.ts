import { test, expect } from '@playwright/test';

test.describe('Shield 6: Cockpit Dashboard Partial Failure Resilience', () => {
  test('Should render intact components and show error banner when funnel API fails', async ({ page }) => {
    // 1. Intercept actual backend calls and simulate a partial failure
    await page.route('**/api/cockpit/metrics*', async (route) => {
      const url = route.request().url();
      
      // Simulate Funnel breakdown (500 Internal Error)
      if (url.includes('/funnel')) {
        await route.fulfill({ status: 500, body: 'Internal Server Error' });
      } 
      // Simulate successful Freight response
      else if (url.includes('/freight')) {
        await route.fulfill({ 
          status: 200, 
          contentType: 'application/json',
          body: JSON.stringify({ total_simulations_7d: 999 })
        });
      } 
      // Simulate successful Metrics response
      else {
        await route.fulfill({ 
          status: 200, 
          contentType: 'application/json',
          body: JSON.stringify({ mensagensHoje: 1234 })
        });
      }
    });

    // 2. Navigate to Cockpit Dashboard
    await page.goto('/cockpit');

    // 3. Assert partial failure banner exists showing exactly which block failed
    const errorBanner = page.locator('text=Aviso: falha parcial ao carregar funil');
    await expect(errorBanner).toBeVisible({ timeout: 10000 });

    // 4. Assert successful blocks continue to render safely
    const messagesMetric = page.locator('text=1,234');
    await expect(messagesMetric).toBeVisible();

    const freightMetric = page.locator('text=999');
    await expect(freightMetric).toBeVisible();

    // 5. Assert broken block gracefully falls back
    const funnelUnavailable = page.locator('text=Dados do funil temporariamente indisponíveis');
    await expect(funnelUnavailable).toBeVisible();
  });
});
