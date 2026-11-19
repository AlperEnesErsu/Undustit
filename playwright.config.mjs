// End-to-end checks for the static site, in local mode (tests/e2e/yardim.mjs swaps ayar.js), so they never
// touch the live database. Run: npm test (installs nothing global; `npx playwright install chromium` once).
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  // reduced motion: flows are checked without scroll reveals in the way (hareket.spec checks the motion's last frames).
  // A Turkish browser: the site picks its language from the browser when the address names none (sayfalar.spec
  // checks an English one), and the flows below read Turkish.
  use: { baseURL: 'http://127.0.0.1:4455', trace: 'retain-on-failure', reducedMotion: 'reduce', locale: 'tr-TR' },
  webServer: { command: 'node tests/sunucu.mjs 4455', url: 'http://127.0.0.1:4455/', reuseExistingServer: !process.env.CI },
  projects: [
    { name: 'masaustu', use: { ...devices['Desktop Chrome'], locale: 'tr-TR', viewport: { width: 1280, height: 900 } } },
    { name: 'telefon', use: { ...devices['Pixel 5'], locale: 'tr-TR' } }
  ]
});
