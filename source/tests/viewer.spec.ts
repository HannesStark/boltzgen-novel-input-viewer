import { test, expect } from '@playwright/test';

test('loads target overlay, qualification labels, navigation, and deep link', async ({ page }) => {
  await page.goto('?record=9x86_A&view=overlay');
  await expect(page.locator('#target-heading')).toContainText('9x86_A');
  await expect(page.locator('#status-badge')).toContainText('FINAL PANEL');
  await expect(page.locator('.viewer')).toBeVisible();
  await expect(page.locator('#metrics')).toContainText('Measured TM-score');
  await expect(page.locator('#scene-audit')).toContainText('Mol* audit', { timeout: 90000 });
  await page.screenshot({ path: 'test-results/desktop-overlay.png', fullPage: true });
  await page.locator('#prev').click();
  await expect(page.locator('#position')).toContainText('12 / 13');
  await page.goBack();
  await expect(page.locator('#target-heading')).toContainText('9x86_A');
});

test('keeps rejected candidate explicit and reloadable', async ({ page }) => {
  await page.goto('?record=8bux_A&view=overlay');
  await expect(page.locator('#status-badge')).toContainText('REJECTED');
  await expect(page.locator('#selection-reason')).toContainText('Failed measured prediction gate');
  await expect(page.locator('#metrics')).toContainText('0.283');
  await page.screenshot({ path: 'test-results/rejected-target.png', fullPage: true });
});

test('mobile layout has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('?record=8qzo_B&view=predicted');
  await expect(page.locator('#target-heading')).toContainText('8qzo_B');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
  await page.screenshot({ path: 'test-results/mobile-predicted.png', fullPage: true });
});

test('shows final audited figures and downloadable summaries', async ({page})=>{
  await page.goto('?record=9x86_A&view=overlay');
  await expect(page.locator('#production-note')).toContainText('Verified production');
  await expect(page.locator('.comparison-figure')).toHaveCount(4);
  await expect(page.locator('.result-summary')).toContainText('0.0482');
  const figure=page.locator('.comparison-figure').first();
  await figure.scrollIntoViewIfNeeded();
  await expect.poll(()=>figure.locator('img').evaluate((e:HTMLImageElement)=>e.complete&&e.naturalWidth>0)).toBe(true);
  await figure.screenshot({path:'test-results/final-six-score-figure.png'});
  for(const link of await page.locator('.result-downloads a,.comparison-figure a').all()){
    const url=await link.getAttribute('href');
    expect((await page.request.get(url!)).ok()).toBe(true);
  }
});

test('reports unavailable coordinates visibly',async({page})=>{
  await page.route('**/data/structures/9x86_A.predicted.aligned.cif.gz',route=>route.fulfill({status:404,body:'missing'}));
  await page.goto('?record=9x86_A&view=overlay');
  await expect(page.locator('#viewer-status')).toHaveClass(/error/);
  await expect(page.locator('#viewer-status')).toBeVisible();
});
