// Thursday: the countdown, the live window and the calendar file, with the browser clock fixed.
import { test, expect } from './yardim.mjs';

test('pazartesi 09:00 UTC: sonraki yayın perşembe 20:00, takvim 17:00Z', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-26T09:00:00Z'));
  await page.goto('/persembe/');
  await expect(page.locator('#kalan')).toHaveText('3g 8s 00dk');
  const ics = decodeURIComponent((await page.locator('#eylem a[download]').getAttribute('href')).split(',')[1]);
  expect(ics).toContain('DTSTART:20261029T170000Z');
  expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=TH');
});

test('perşembe 20:30 İstanbul: sayfa ve hap "canlı"', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-29T17:30:00Z'));
  await page.goto('/persembe/');
  await expect(page.locator('#sayac')).toHaveClass(/on/);
  await page.goto('/');
  await expect(page.locator('#thu')).toHaveClass(/on/);
  await expect(page.locator('#thu')).toHaveAttribute('href', 'persembe/');
});
