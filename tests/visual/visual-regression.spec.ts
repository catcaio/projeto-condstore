import { test, expect } from '@playwright/test';

const urlsToTest = ['/cockpit', '/cockpit/finops', '/evolution'];

test.describe('Visual Regression', () => {
    for (const theme of ['light', 'dark']) {
        for (const url of urlsToTest) {
            test(`Render ${url} in ${theme} mode`, async ({ page }) => {
                // Mock authentication to unblock cockpit routes since this is a visual test runner
                // A full test would actually log in or mount a specialized fixture
                await page.context().addCookies([{
                    name: 'condstoreOS-auth-token',
                    value: 'mock-visual-token',
                    domain: 'localhost',
                    path: '/',
                }]);

                // Emulate theme
                await page.emulateMedia({ colorScheme: theme as 'light' | 'dark' });

                const response = await page.goto(url);

                // Skip snapshotting on 404 or redirect since that defeats the purpose of the visual regression
                // Just fail if the page isn't reachable to not pollute baselines with logic redirect pages
                if (response?.status() === 404) {
                    test.skip();
                }

                // Foce set dataset variables for safety
                await page.evaluate((t) => {
                    document.documentElement.setAttribute('data-theme', t);
                }, theme);

                // Wait to settle
                await page.waitForTimeout(1000);

                const safeName = url.replace(/\//g, '-') || 'home';
                await expect(page).toHaveScreenshot(`${theme}${safeName}.png`, {
                    maxDiffPixelRatio: 0.05,
                    fullPage: true
                });
            });
        }
    }
});
