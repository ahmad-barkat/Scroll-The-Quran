import { expect, test, type Page } from '@playwright/test';

const READER_LOAD_TIMEOUT = 30_000;

async function openRoute(page: Page, route: string) {
  await page.goto(`/#/${route}`);
}

async function waitForReader(page: Page) {
  await expect(page.getByTestId('next-ayah')).toBeVisible({ timeout: READER_LOAD_TIMEOUT });
}

// The hash changes before React commits the new ayah, and goNext/goPrev read their
// position from that commit, so wait for the rendered title between keypresses.
async function expectAyah(page: Page, surah: number, ayah: number) {
  const ref = `${surah}:${ayah}`;
  await expect(page).toHaveTitle(new RegExp(ref));
  await expect(page).toHaveURL(new RegExp(`/read/${surah}/${ayah}$`));
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
});

test('keyboard navigation moves through ayahs', async ({ page }) => {
  await openRoute(page, 'read/2/255');
  await waitForReader(page);
  await expectAyah(page, 2, 255);

  await page.keyboard.press('ArrowDown');
  await expectAyah(page, 2, 256);

  await page.keyboard.press('k');
  await expectAyah(page, 2, 255);

  await page.keyboard.press('j');
  await expectAyah(page, 2, 256);

  await page.getByTestId('prev-ayah').click();
  await expectAyah(page, 2, 255);
});

test('bookmarks survive a reload and appear on the saved page', async ({ page }) => {
  await openRoute(page, 'read/18/10');
  await waitForReader(page);

  const bookmark = page.getByTestId('bookmark-toggle');
  await expect(bookmark).toHaveAttribute('aria-pressed', 'false');
  await bookmark.click();
  await expect(bookmark).toHaveAttribute('aria-pressed', 'true');

  await page.reload();
  await waitForReader(page);
  await expect(page.getByTestId('bookmark-toggle')).toHaveAttribute('aria-pressed', 'true');

  await openRoute(page, 'saved');
  const cards = page.locator('.verse-card');
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText('Al-Kahf · 18:10');

  await openRoute(page, 'read/18/10');
  await waitForReader(page);
  await page.getByTestId('bookmark-toggle').click();
  await expect(page.getByTestId('bookmark-toggle')).toHaveAttribute('aria-pressed', 'false');

  await openRoute(page, 'saved');
  await expect(page.locator('.verse-card')).toHaveCount(0);
});

test('search resolves a reference straight to the ayah', async ({ page }) => {
  await openRoute(page, 'search');
  const box = page.getByRole('searchbox', { name: 'Search the Quran' });
  await expect(box).toBeVisible();
  await box.fill('2:255');

  const count = page.locator('.results-count');
  await expect(count).toContainText('1 ayah', { timeout: READER_LOAD_TIMEOUT });

  const card = page.locator('.verse-card-main').first();
  await expect(card).toContainText('Al-Baqarah · 2:255');
  await card.click();

  await expect(page).toHaveURL(/\/read\/2\/255$/);
  await waitForReader(page);
});

test('the share button renders a canvas card', async ({ page }) => {
  await openRoute(page, 'read/112/1');
  await waitForReader(page);

  await page.getByTestId('share-button').click();
  const card = page.locator('.share-preview img');
  await expect(card).toBeVisible({ timeout: READER_LOAD_TIMEOUT });

  const dimensions = await card.evaluate((element) => {
    const image = element as HTMLImageElement;
    return { width: image.naturalWidth, height: image.naturalHeight };
  });
  expect(dimensions.width).toBe(1080);
  expect(dimensions.height).toBeGreaterThanOrEqual(1350);
  expect(dimensions.height).toBeLessThanOrEqual(2160);

  await expect(page.locator('.share-note')).toContainText('1080');
  await expect(page.getByRole('dialog')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.locator('.share-preview')).toHaveCount(0);
});

test('the reader dialog traps and returns focus', async ({ page }) => {
  await openRoute(page, 'read/2/255');
  await waitForReader(page);

  const settings = page.getByTestId('settings-button');
  // Keyboard activation keeps focus on the trigger; a pointer tap deliberately blurs it.
  await settings.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await expect
    .poll(() => page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null))
    .toBe(true);

  for (let step = 0; step < 40; step += 1) {
    await page.keyboard.press('Tab');
  }
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null))
    .toBe(true);

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(settings).toBeFocused();
});
