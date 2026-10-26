// End-to-end checks for the static site, in local mode (tests/e2e/yardim.mjs swaps ayar.js), so they never
// touch the live database. Run: npm test (installs nothing global; `npx playwright install chromium` once).
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  // reduced motion: flows are checked without scroll reveals in the way (hareket.spec checks the motion's last frames)
  use: { baseURL: 'http://127.0.0.1:4455', trace: 'retain-on-failure', reducedMotion: 'reduce' },
  webServer: { command: 'node tests/sunucu.mjs 4455', url: 'http://127.0.0.1:4455/', reuseExistingServer: !process.env.CI },
  projects: [
    { name: 'masaustu', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'telefon', use: { ...devices['Pixel 5'] } }
  ]
});
