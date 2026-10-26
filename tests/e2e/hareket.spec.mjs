// The explainer animations: with reduced motion every one lands on its last frame at once.
import { test, expect } from './yardim.mjs';

test.use({ reducedMotion: 'reduce' });

for (const [yol, sec] of [['/', '#proc'], ['/nasil/', '#proc'], ['/vakalar/', '.anl-vaka'], ['/fikirler/', '.anl-fikir'], ['/hikaye/', '.anl-hikaye']]){
  test(`hareketi azalt → son kare: ${yol}`, async ({ page }) => {
    await page.goto(yol);
    await expect(page.locator(sec)).toHaveClass(/\bend\b/);
  });
}
