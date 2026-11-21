// Seam 2: Main in a real browser. Captures the story's fixed points as attachments and asserts
// what the visitor gets at each (no pixel baselines: the field twinkles and drifts).
import { expect, test, type Page } from '@playwright/test';

const settle = (page: Page, ms = 1200) => page.waitForTimeout(ms); // GSAP scrub + label transitions

async function shot(page: Page, name: string) {
  await test.info().attach(name, { body: await page.screenshot(), contentType: 'image/png' });
}

/** Scroll so the galaxy spacer's top has passed the viewport top by u viewport heights. */
async function scrollToU(page: Page, u: number) {
  await page.evaluate((u) => {
    const top = document.querySelector('.converge')!.getBoundingClientRect().top + scrollY;
    scrollTo(0, top + u * innerHeight);
  }, u);
  await settle(page);
}

async function scrollToBottom(page: Page) {
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await settle(page, 2000);
}

const labelsShown = (page: Page) => page.locator('.chrome').evaluate((el) => el.classList.contains('in'));
const opacity = (page: Page, sel: string) => page.locator(sel).evaluate((el) => Number(getComputedStyle(el).opacity));

function failOnPageErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return () => expect(errors, 'page errors').toEqual([]);
}

async function heroSettled(page: Page) {
  await page.goto('/');
  await page.locator('.field[data-stars-revealed="true"]').waitFor({ timeout: 60_000 });
  await settle(page, 800);
  await expect.poll(() => opacity(page, '.type')).toBe(1); // name fades in over .5s
}

test.describe('desktop', () => {
  test.use({ viewport: { width: 1200, height: 750 } });

  test('scroll story end to end', async ({ page }) => {
    const noErrors = failOnPageErrors(page);
    await heroSettled(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Noppadol Chinonn, Full-Stack Software Engineer');
    await shot(page, 'hero settled');

    await page.evaluate(() => scrollTo(0, document.querySelector('.hero')!.clientHeight / 2));
    await settle(page);
    await shot(page, 'hero half-out');

    await scrollToU(page, 0.3);
    expect(await labelsShown(page)).toBe(false);
    await shot(page, 'mid-convergence');

    await scrollToU(page, 1.3);
    expect(await labelsShown(page)).toBe(true);
    await shot(page, 'galaxy formed with labels');

    await page.mouse.move(600, 375);
    await page.mouse.move(640, 400, { steps: 10 });
    await settle(page, 300);
    await shot(page, 'hover 1');
    await settle(page, 600);
    await shot(page, 'hover 2');
    await page.mouse.move(0, 0);

    await page.locator('#about').scrollIntoViewIfNeeded();
    await scrollToU(page, 3.2);
    expect(await labelsShown(page)).toBe(false);
    expect(await opacity(page, '.backdrop canvas')).toBeCloseTo(0.4, 2);
    await shot(page, 'about');

    for (const id of ['#my-stack', '#experience']) {
      await page.locator(id).evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await settle(page);
      await shot(page, id.slice(1));
    }

    await scrollToBottom(page);
    for (const row of await page.locator('#education .school, #education .category').all()) {
      expect(Number(await row.evaluate((el) => getComputedStyle(el).opacity))).toBeCloseTo(1, 2);
    }
    await shot(page, 'education at page end');

    await page.evaluate(() => scrollTo(0, 0));
    await settle(page);
    expect(await labelsShown(page)).toBe(false);
    await shot(page, 'back at top');
    noErrors();
  });
});

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('short run', async ({ page }) => {
    const noErrors = failOnPageErrors(page);
    await page.goto('/');
    await page.locator('.field[data-ready="true"]').waitFor({ timeout: 60_000 });
    await settle(page, 4000);
    await shot(page, 'phone hero');
    await scrollToU(page, 1.3);
    expect(await labelsShown(page)).toBe(true);
    await shot(page, 'phone galaxy');
    await scrollToBottom(page);
    await shot(page, 'phone education');
    noErrors();
  });
});

test('WebGL fallback keeps all content visible', async ({ page }) => {
  const noErrors = failOnPageErrors(page);
  await page.setViewportSize({ width: 1200, height: 750 });
  await page.goto('/?still');
  await expect(page.locator('.scene')).toHaveAttribute('data-still', 'true');
  await expect(page.locator('.backdrop')).toHaveAttribute('data-static', 'true');
  await expect.poll(() => opacity(page, '.type')).toBe(1); // name fades in over .5s
  await expect(page.locator('.title')).toHaveText('NoppadolChinonn');
  await shot(page, 'fallback hero');
  await scrollToBottom(page);
  await expect(page.locator('#education h3').last()).toBeVisible();
  await shot(page, 'fallback education');
  noErrors();
});

test('reduced motion: galaxy follows scroll only, reveals shown without transitions', async ({ page }) => {
  const noErrors = failOnPageErrors(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1200, height: 750 });
  await page.goto('/');
  await expect(page.locator('.scene')).toHaveAttribute('data-still', 'true');
  await scrollToU(page, 1.3);
  await expect(page.locator('.backdrop')).not.toHaveAttribute('data-static', 'true');
  expect(await labelsShown(page)).toBe(true);
  await shot(page, 'reduced motion galaxy');
  await scrollToU(page, 3.2);
  expect(await opacity(page, '#about .word >> nth=-1')).toBe(1);
  noErrors();
});

test('no WebGL: plain dark field, all content visible', async ({ page }) => {
  const noErrors = failOnPageErrors(page);
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      return /webgl/.test(type) ? null : (get as Function).call(this, type, ...rest);
    } as typeof get;
  });
  await page.setViewportSize({ width: 1200, height: 750 });
  await page.goto('/');
  await expect(page.locator('.scene')).toHaveAttribute('data-still', 'true');
  await expect(page.locator('.backdrop')).toHaveAttribute('data-static', 'true');
  await expect.poll(() => opacity(page, '.type')).toBe(1);
  await scrollToBottom(page);
  await expect(page.locator('#education h3').last()).toBeVisible();
  noErrors();
});
