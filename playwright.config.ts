import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/visual',
    fullyParallel: true,
    retries: 0,
    workers: 1,
    reporter: 'html',
    use: {
        baseURL: 'http://localhost:3001',
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
