import { expect, test, type Page } from "@playwright/test";
import { expectNoErrors, isMobile, trackErrors } from "./helpers.ts";

const dampf = <T>(page: Page, fn: string) =>
  page.evaluate((f) => new Function(`return window.__dampf.${f}`)() as T, fn);
const scene = (page: Page) => dampf<string>(page, "scene()");
const state = (page: Page) =>
  dampf<{ dir: string; paused: boolean; alive: boolean; score: number } | null>(page, "state()");

async function open(page: Page) {
  await page.goto("/games/snake/?e2e");
  await expect.poll(() => page.evaluate(() => !!window.__dampf)).toBe(true);
  await expect.poll(() => scene(page)).toBe("start");
}

/** Wischgeste per echten Touch-Events (Chromium/CDP). */
async function swipe(page: Page, dx: number, dy: number) {
  const box = (await page.locator("canvas").boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const cdp = await page.context().newCDPSession(page);
  const touch = (type: string, px: number, py: number) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: type === "touchEnd" ? [] : [{ x: px, y: py }],
    });
  await touch("touchStart", x, y);
  for (let i = 1; i <= 5; i++) await touch("touchMove", x + (dx * i) / 5, y + (dy * i) / 5);
  await touch("touchEnd", x + dx, y + dy);
}

declare global {
  interface Window {
    __dampf?: unknown;
  }
}

test("SNAKE-AK-08: Desktop – starten, steuern, Game Over, neu starten", async ({ page }) => {
  test.skip(isMobile(page), "nur Desktop");
  const errors = trackErrors(page);
  await open(page);

  await page.keyboard.press("Space");
  await expect.poll(() => scene(page)).toBe("play");
  expect((await state(page))?.dir).toBe("right");

  // Schlange stark verlängern und dann in sich selbst steuern: hoch, links, runter, rechts.
  // Egal wie viele Schritte zwischen den Tasten vergehen (langsame Rechner): spätestens beim
  // Rechtsabbiegen oder beim Herunterlaufen trifft die Schlange ihren eigenen Körper.
  await dampf(page, "grow(20)");
  await page.keyboard.press("ArrowUp");
  await expect.poll(async () => (await state(page))?.dir).toBe("up");
  await page.keyboard.press("ArrowLeft");
  await expect.poll(async () => (await state(page))?.dir).toBe("left");
  await page.keyboard.press("ArrowDown");
  await expect
    .poll(async () => ((await scene(page)) === "gameover" ? "down" : (await state(page))?.dir))
    .toBe("down");
  if ((await scene(page)) !== "gameover") await page.keyboard.press("ArrowRight");

  await expect.poll(() => scene(page)).toBe("gameover");
  const texts = await dampf<string[]>(page, "texts()");
  expect(texts).toContain("GAME OVER");
  expect(texts.some((t) => /^Punkte: \d+$/.test(t))).toBe(true);

  await page.keyboard.press("Space");
  await expect.poll(() => scene(page)).toBe("play");
  expect((await state(page))?.alive).toBe(true);
  await expectNoErrors(errors);
});

test("SNAKE-AK-09: Mobile – Tippen startet, Wischen lenkt, Feld komplett sichtbar", async ({
  page,
}) => {
  test.skip(!isMobile(page), "nur Mobile");
  const errors = trackErrors(page);
  await open(page);

  const box = (await page.locator("canvas").boundingBox())!;
  const vp = page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 0.5);
  expect(box.y + box.height).toBeLessThanOrEqual(vp.height + 0.5);
  const scroll = await page.evaluate(() => ({
    x: document.documentElement.scrollWidth - innerWidth,
    y: document.documentElement.scrollHeight - innerHeight,
  }));
  expect(scroll.x).toBeLessThanOrEqual(0);
  expect(scroll.y).toBeLessThanOrEqual(0);

  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await expect.poll(() => scene(page)).toBe("play");

  await swipe(page, 0, -80);
  await expect.poll(async () => (await state(page))?.dir).toBe("up");
  await swipe(page, -80, 0);
  await expect.poll(async () => (await state(page))?.dir).toBe("left");
  await expectNoErrors(errors);
});

test("SNAKE-AK-10: Fokusverlust pausiert, P setzt fort", async ({ page }) => {
  await open(page);
  await page.keyboard.press("Space");
  if (isMobile(page)) {
    const box = (await page.locator("canvas").boundingBox())!;
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  }
  await expect.poll(() => scene(page)).toBe("play");

  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  expect((await state(page))?.paused).toBe(true);
  expect(await dampf<string[]>(page, "texts()")).toContainEqual(expect.stringContaining("PAUSE"));

  await page.keyboard.press("p");
  expect((await state(page))?.paused).toBe(false);
});
