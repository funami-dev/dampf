import { expect, test, type Page } from "@playwright/test";
import { expectNoErrors, isMobile, trackErrors } from "./helpers.ts";

interface SRState {
  phase: string;
  t: number;
  pos: number;
  speed: number;
  finishTime: number | null;
  ghostPos: number | null;
  character: string;
}

const KEY = "dampf.semukri-run.v1";
const call = <T>(page: Page, expr: string) =>
  page.evaluate((e) => new Function(`return window.__dampf.${e}`)() as T, expr);
const scene = (page: Page) => call<string>(page, "scene()");
const state = (page: Page) => call<SRState | null>(page, "state()");
const texts = (page: Page) => call<string[]>(page, "texts()");
const point = (page: Page, name: string) =>
  call<{ x: number; y: number } | null>(page, `point(${JSON.stringify(name)})`);

async function open(page: Page) {
  await page.goto("/games/semukri-run/?e2e");
  await expect.poll(() => page.evaluate(() => !!window.__dampf)).toBe(true);
  await expect.poll(() => scene(page)).toBe("start");
}

async function press(page: Page, name: string) {
  const p = await point(page, name);
  expect(p, `Objekt ${name} nicht gefunden`).not.toBeNull();
  if (isMobile(page)) await page.touchscreen.tap(p!.x, p!.y);
  else await page.mouse.click(p!.x, p!.y);
}

/** Läuft abwechselnd links/rechts bis ins Ziel. */
async function sprint(page: Page) {
  await expect.poll(async () => (await state(page))?.phase).toBe("running");
  const mobile = isMobile(page);
  const L = mobile ? await point(page, "tap-left") : null;
  const R = mobile ? await point(page, "tap-right") : null;
  // Gleichmäßig tippen, bis das Ziel erreicht ist (unabhängig davon, wie schnell der Browser ist)
  const deadline = Date.now() + 60_000;
  for (let i = 0; Date.now() < deadline; i++) {
    if (i % 10 === 0 && (await state(page))?.phase !== "running") break;
    const left = i % 2 === 0;
    if (mobile) {
      const q = left ? L! : R!;
      await page.touchscreen.tap(q.x, q.y);
    } else await page.keyboard.press(left ? "ArrowLeft" : "ArrowRight");
    await page.waitForTimeout(25);
  }
  await expect.poll(() => scene(page), { timeout: 10_000 }).toBe("finish");
}

declare global {
  interface Window {
    __dampf?: unknown;
  }
}

test("SR-AK-12: Desktop – Rennen, Rekord, Neuladen, Geist", async ({ page }) => {
  test.skip(isMobile(page), "nur Desktop");
  const errors = trackErrors(page);
  await open(page);
  expect(await texts(page)).toContain("Noch keine Bestzeit");

  // Figur per Tastatur wählen: Ukri → Semlaki → Billy (jeden Schritt abwarten)
  const character = () => call<string>(page, "character()");
  await page.keyboard.press("ArrowRight");
  await expect.poll(character).toBe("semlaki");
  await page.keyboard.press("ArrowRight");
  await expect.poll(character).toBe("billy");
  await page.keyboard.press("Enter");
  await expect.poll(() => scene(page)).toBe("race");
  expect((await state(page))?.character).toBe("billy");

  // SR-AK-04 (E2E): Tippen im Countdown bewirkt nichts
  expect((await state(page))?.phase).toBe("countdown");
  for (let i = 0; i < 6; i++) await page.keyboard.press(i % 2 ? "ArrowRight" : "ArrowLeft");
  await expect.poll(async () => (await state(page))?.phase).toBe("running");
  expect((await state(page))?.pos).toBe(0);
  expect((await state(page))?.ghostPos).toBeNull();

  await sprint(page);
  const t = await texts(page);
  expect(t.some((s) => /^\d+,\d\d s$/.test(s))).toBe(true);
  expect(t).toContain("Neue Bestzeit!");

  const input = page.getByRole("textbox", { name: "Name für die Rekordliste" });
  await expect(input).toBeVisible();
  await input.fill("  Tester  ");
  await input.press("Enter");
  await expect(input).toBeHidden();
  await expect.poll(() => texts(page)).toContain("Gespeichert: Platz 1");

  await press(page, "records");
  await expect.poll(() => scene(page)).toBe("records");
  expect(await texts(page)).toContain("Tester");

  // Nach Neuladen noch da
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!window.__dampf)).toBe(true);
  await expect.poll(() => scene(page)).toBe("start");
  expect((await texts(page)).some((s) => s.startsWith("Bestzeit: "))).toBe(true);
  await press(page, "records");
  await expect.poll(() => texts(page)).toContain("Tester");
  await press(page, "back");
  await expect.poll(() => scene(page)).toBe("start");

  // Zweites Rennen: der Geist läuft mit
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await state(page))?.phase).toBe("running");
  // Der Geist läuft los (unter Last kann das erste Bild etwas dauern)
  await expect.poll(async () => (await state(page))?.ghostPos ?? 0).toBeGreaterThan(0);
  await expectNoErrors(errors);
});

test("SR-AK-13: Mobile – L/R sichtbar, Tippen bringt ins Ziel", async ({ page }) => {
  test.skip(!isMobile(page), "nur Mobile");
  const errors = trackErrors(page);
  await open(page);
  await press(page, "start");
  await expect.poll(() => scene(page)).toBe("race");

  const vp = page.viewportSize()!;
  const box = (await page.locator("canvas").boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(vp.height + 0.5);
  const scale = box.width / 360;
  for (const side of ["tap-left", "tap-right"]) {
    const p = (await point(page, side))!;
    expect(p.x - 80 * scale).toBeGreaterThanOrEqual(box.x - 0.5);
    expect(p.x + 80 * scale).toBeLessThanOrEqual(box.x + box.width + 0.5);
    expect(p.y + 75 * scale).toBeLessThanOrEqual(vp.height + 0.5);
  }

  await sprint(page);
  expect((await texts(page)).some((s) => /^\d+,\d\d s$/.test(s))).toBe(true);
  await expectNoErrors(errors);
});

test("SR-AK-14: Fokusverlust bricht den Lauf ab, nichts wird gespeichert", async ({ page }) => {
  await open(page);
  await press(page, "start");
  await expect.poll(async () => (await state(page))?.phase).toBe("running");
  await page.keyboard.press("ArrowLeft");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect.poll(() => scene(page)).toBe("finish");
  expect((await texts(page)).join(" ")).toContain("abgebrochen");
  expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBeNull();
});

test("SR-AK-09: gesperrter Speicher – Hinweis, kein Absturz", async ({ page }) => {
  test.skip(isMobile(page), "einmal reicht");
  const errors = trackErrors(page);
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("gesperrt", "SecurityError");
      },
    });
  });
  await open(page);
  expect((await texts(page)).join(" ")).toContain("nicht gespeichert");
  await page.keyboard.press("Enter");
  await sprint(page);
  expect((await texts(page)).some((s) => /^\d+,\d\d s$/.test(s))).toBe(true);
  await expectNoErrors(errors);
});
