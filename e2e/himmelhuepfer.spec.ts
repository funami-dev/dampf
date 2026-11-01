import { expect, test, type Page } from "@playwright/test";
import { expectNoErrors, isMobile, trackErrors } from "./helpers.ts";

interface HHState {
  x: number;
  y: number;
  facing: "left" | "right";
  heightMeters: number;
  starCount: number;
  alive: boolean;
  paused: boolean;
  character: string;
}

const call = <T>(page: Page, expr: string) =>
  page.evaluate((e) => new Function(`return window.__dampf.${e}`)() as T, expr);
const scene = (page: Page) => call<string>(page, "scene()");
const state = (page: Page) => call<HHState | null>(page, "state()");
const texts = (page: Page) => call<string[]>(page, "texts()");

async function open(page: Page) {
  await page.goto("/games/himmelhuepfer/?e2e");
  await expect.poll(() => page.evaluate(() => !!window.__dampf)).toBe(true);
  await expect.poll(() => scene(page)).toBe("select");
}

/** Klickt/tippt ein benanntes Objekt im Canvas an. */
async function press(page: Page, name: string) {
  const p = await call<{ x: number; y: number } | null>(page, `point(${JSON.stringify(name)})`);
  expect(p, `Objekt ${name} nicht gefunden`).not.toBeNull();
  if (isMobile(page)) await page.touchscreen.tap(p!.x, p!.y);
  else await page.mouse.click(p!.x, p!.y);
}

/** Hält einen Finger auf der linken bzw. rechten Hälfte des Spielfelds (CDP-Touch). */
async function hold(page: Page, side: "left" | "right", ms: number) {
  const box = (await page.locator("canvas").boundingBox())!;
  const x = box.x + box.width * (side === "left" ? 0.2 : 0.8);
  const y = box.y + box.height * 0.6;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await page.waitForTimeout(ms);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

declare global {
  interface Window {
    __dampf?: unknown;
  }
}

test("HH-AK-10: Figurenauswahl per Tippen/Klicken", async ({ page }) => {
  const errors = trackErrors(page);
  await open(page);
  const t = await texts(page);
  for (const name of ["Mauli", "Schweini", "Matti", "Figur wählen"]) expect(t).toContain(name);

  await press(page, "card-mauli");
  await press(page, "start");
  await expect.poll(() => scene(page)).toBe("play");
  expect((await state(page))?.character).toBe("mauli");
  await expectNoErrors(errors);
});

test("HH-AK-10: Figurenauswahl per Tastatur", async ({ page }) => {
  test.skip(isMobile(page), "nur Desktop");
  await open(page);
  // Standard ist Matti (ganz rechts) → einmal links = Schweini.
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Enter");
  await expect.poll(() => scene(page)).toBe("play");
  expect((await state(page))?.character).toBe("schweini");
});

test("HH-AK-11: Desktop – lenken, Game Over, Nochmal, Figur wechseln", async ({ page }) => {
  test.skip(isMobile(page), "nur Desktop");
  const errors = trackErrors(page);
  await open(page);
  await page.keyboard.press("Space");
  await expect.poll(() => scene(page)).toBe("play");

  await page.keyboard.down("ArrowLeft");
  await expect.poll(async () => (await state(page))?.facing).toBe("left");
  await page.keyboard.up("ArrowLeft");
  await page.keyboard.down("ArrowRight");
  await expect.poll(async () => (await state(page))?.facing).toBe("right");
  await page.keyboard.up("ArrowRight");

  await call(page, "fall()");
  await expect.poll(() => scene(page), { timeout: 10_000 }).toBe("gameover");
  const t = await texts(page);
  expect(t).toContain("Abgestürzt!");
  expect(t.some((s) => /^Höhe: \d+ m$/.test(s))).toBe(true);
  expect(t.some((s) => /^Sterne: \d+$/.test(s))).toBe(true);

  await page.keyboard.press("Space");
  await expect.poll(() => scene(page)).toBe("play");
  expect((await state(page))?.alive).toBe(true);

  await call(page, "fall()");
  await expect.poll(() => scene(page), { timeout: 10_000 }).toBe("gameover");
  await press(page, "change");
  await expect.poll(() => scene(page)).toBe("select");
  await expectNoErrors(errors);
});

test("HH-AK-12: Mobile – Bildschirmhälften lenken, alles sichtbar", async ({ page }) => {
  test.skip(!isMobile(page), "nur Mobile");
  const errors = trackErrors(page);
  await open(page);
  const vp = page.viewportSize()!;
  const box = (await page.locator("canvas").boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(vp.height + 0.5);
  expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 0.5);

  await press(page, "start");
  await expect.poll(() => scene(page)).toBe("play");

  const x0 = (await state(page))!.x;
  await hold(page, "left", 250);
  const left = (await state(page))!;
  expect(left.facing).toBe("left");
  expect(left.x).toBeLessThan(x0);

  await hold(page, "right", 250);
  expect((await state(page))!.facing).toBe("right");

  await call(page, "fall()");
  await expect.poll(() => scene(page), { timeout: 10_000 }).toBe("gameover");
  for (const name of ["again", "change"]) {
    const p = (await call<{ x: number; y: number }>(page, `point("${name}")`))!;
    expect(p.y).toBeLessThan(vp.height);
  }
  await press(page, "again");
  await expect.poll(() => scene(page)).toBe("play");
  await expectNoErrors(errors);
});

test("HH-AK-13: Fokusverlust pausiert, P setzt fort", async ({ page }) => {
  await open(page);
  await press(page, "start");
  await expect.poll(() => scene(page)).toBe("play");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  expect((await state(page))?.paused).toBe(true);
  const y = (await state(page))!.y;
  await page.waitForTimeout(300);
  expect((await state(page))!.y).toBe(y);
  await page.keyboard.press("p");
  expect((await state(page))?.paused).toBe(false);
});
