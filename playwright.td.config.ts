import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

// Secrets come from a local .env file (never committed), or from the CI secret store.
if (existsSync('.env')) process.loadEnvFile('.env');
if (!process.env.PSP_SECRET_KEY) {
  throw new Error('PSP_SECRET_KEY is missing: copy .env.example to .env and fill it in (see td/README-TD.md).');
}

// Configuration of the iframe workshop: a local shop (port 3100) and a local PSP (port 3101).
export default defineConfig({
  testDir: './tests-td',
  fullyParallel: true,
  reporter: [['html', { open: 'never', outputFolder: 'playwright-report-td' }], ['list']],
  use: {
    baseURL: 'http://localhost:3100',
    // Traces record the values typed with fill(): keep them only for failures, and protect them in CI.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // Playwright starts the local servers before the tests and stops them after.
  webServer: {
    command: 'node td/server.js',
    url: 'http://localhost:3101/card-widget.html',
    reuseExistingServer: true,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
