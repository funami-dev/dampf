import { expect, test, type Page } from "@playwright/test";
import { expectNoErrors, isMobile, trackErrors } from "./helpers.ts";

/** Spec: specs/games/wichtelhaus.md (WH-AK-07..12) */
interface WhState {
  screen: string;
  name: string | null;
  pet: string | null;
  needs: Record<string, number> | null;
  food: number;
  activity: string | null;
  friendship: number;
  letters: number;
  unread: number;
  volume: number;
  muted: boolean;
  bubble: string;
  lantern: number | null;
  calmSeconds: number | null;
  sprites: number;
}
interface Hooks {
  state(): WhState;
  advance(s: number): void;
  setNeeds(n: Record<string, number>): void;
}
declare global {
  interface Window {
    __dampf?: unknown;
  }
}
const state = (page: Page) => page.evaluate(() => (window.__dampf as Hooks).state());

async function open(page: Page) {
  await page.goto("/games/wichtelhaus/?e2e");
  await expect.poll(() => page.evaluate(() => !!window.__dampf), { timeout: 60_000 }).toBe(true);
}
const hit = (page: Page, l: ReturnType<Page["getByRole"]>) =>
  isMobile(page) ? l.tap() : l.click();
/** Knopf drücken; auf kleinen Bildschirmen liegen die Aktionen im Menü (WH-AK-14) */
async function press(page: Page, name: string | RegExp) {
  const b = page.getByRole("button", { name }).first();
  const menu = page.getByRole("button", { name: "Menü" });
  if (!(await b.isVisible()) && (await menu.isVisible())) await hit(page, menu);
  await hit(page, b);
}

async function moveIn(page: Page, name = "Pip") {
  await page.getByLabel("Name des Wichtels").fill(name);
  await press(page, "Igel");
  await press(page, "Einziehen!");
  await expect.poll(async () => (await state(page)).screen).toBe("house");
}

test("WH-AK-07: Einzug, Einkaufen, Neuladen behält alles", async ({ page }) => {
  const errors = trackErrors(page);
  await open(page);
  await expect(page.getByRole("dialog", { name: "Wer zieht ein?" })).toBeVisible();
  await moveIn(page);
  expect(await state(page)).toMatchObject({ name: "Pip", pet: "igel" });
  await expect.poll(async () => (await state(page)).bubble).toMatch(/Hallo! Ich bin Pip\./);
  const before = (await state(page)).food;
  await press(page, "🧺 Einkaufen");
  await press(page, "🍰 Kuchen");
  await press(page, "🍲 Suppe");
  expect((await state(page)).food).toBe(before + 2);
  await press(page, "Schließen");
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!window.__dampf), { timeout: 60_000 }).toBe(true);
  expect(await state(page)).toMatchObject({ name: "Pip", pet: "igel", screen: "house" });
  expect((await state(page)).food).toBeGreaterThanOrEqual(before + 1);
  await expectNoErrors(errors);
});

test("WH-AK-08: Anklopfen bekommt eine Antwort; Brief lesen", async ({ page }) => {
  const errors = trackErrors(page);
  await open(page);
  await moveIn(page);
  await page.evaluate(() =>
    (window.__dampf as Hooks).setNeeds({ hunger: 90, energy: 90, fun: 60, clean: 90 }),
  );
  await press(page, "🚪 Anklopfen");
  await press(page, "🎵 Spiel etwas vor!");
  await expect.poll(async () => (await state(page)).bubble).toMatch(/spiele dir etwas vor|Jetzt/);
  // einen Spieltag später liegt ein Brief da
  await page.evaluate(() => (window.__dampf as Hooks).advance(400));
  await expect.poll(async () => (await state(page)).unread).toBeGreaterThan(0);
  await press(page, /Briefe/);
  await expect(
    page
      .getByRole("dialog", { name: "Briefe" })
      .getByText(/Hallo!/)
      .first(),
  ).toBeVisible();
  expect((await state(page)).unread).toBe(0);
  await expectNoErrors(errors);
});

test("WH-AK-09: Mobile – Haus und Knöpfe sichtbar, kein Querscrollen", async ({ page }) => {
  test.skip(!isMobile(page), "nur Mobile");
  await open(page);
  await moveIn(page);
  const vw = page.viewportSize()!.width;
  const vh = page.viewportSize()!.height;
  await page.getByRole("button", { name: "Menü" }).tap();
  for (const name of ["🧺 Einkaufen", "🎁 Geschenk", "🚪 Anklopfen", "🕯️ Ruhe", /Briefe/]) {
    const b = (await page.getByRole("button", { name }).first().boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(vw);
    expect(b.y + b.height).toBeLessThanOrEqual(vh);
  }
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(0);
  await expect(page.locator("canvas").first()).toBeVisible();
});

test("WH-AK-14: Menü-Knopf auf dem Handy, Knopfreihe am Desktop", async ({ page }) => {
  const errors = trackErrors(page);
  await open(page);
  await moveIn(page);
  const menu = page.getByRole("button", { name: "Menü" });
  const shop = page.getByRole("button", { name: "🧺 Einkaufen" });
  if (!isMobile(page)) {
    await expect(menu).toBeHidden();
    await expect(shop).toBeVisible();
    return;
  }
  await expect(shop).toBeHidden();
  await expect(menu).toBeVisible();
  const vw = page.viewportSize()!.width;
  const vh = page.viewportSize()!.height;
  const m = (await menu.boundingBox())!;
  expect(m.x + m.width).toBeGreaterThan(vw * 0.7);
  expect(m.y + m.height).toBeGreaterThan(vh * 0.8);
  await menu.tap();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  const before = (await state(page)).food;
  await shop.tap();
  await expect(shop).toBeHidden();
  await press(page, "🍰 Kuchen");
  expect((await state(page)).food).toBe(before + 1);
  await press(page, "Schließen");
  // Tipp daneben schließt das Menü
  await menu.tap();
  await expect(shop).toBeVisible();
  await page.mouse.click(vw * 0.3, vh * 0.5);
  await expect(shop).toBeHidden();
  await expectNoErrors(errors);
});

test("WH-AK-16: feinere Bilder für Räume, Möbel, Wichtel und Haustier", async ({ page }) => {
  const errors = trackErrors(page);
  await open(page);
  await moveIn(page);
  // 6 Räume, 16 Möbel, Wichtel und Haustier
  await expect.poll(async () => (await state(page)).sprites).toBeGreaterThanOrEqual(24);
  await expect(page.locator("canvas").first()).toBeVisible();
  await expectNoErrors(errors);
});

test("WH-AK-10: Fokusverlust pausiert", async ({ page }) => {
  await open(page);
  await moveIn(page);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect.poll(async () => (await state(page)).screen).toBe("paused");
  await press(page, "Weiterspielen");
  await expect.poll(async () => (await state(page)).screen).toBe("house");
});

test("WH-AK-11: Lautstärke startet bei 30 %, Stumm bleibt nach Neuladen", async ({ page }) => {
  await open(page);
  await moveIn(page);
  expect((await state(page)).volume).toBeCloseTo(0.3);
  await press(page, "Klang");
  await expect(page.getByText("🎧 Am schönsten mit Kopfhörern.")).toBeVisible();
  await page.getByLabel("Stumm").check();
  expect((await state(page)).muted).toBe(true);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!window.__dampf), { timeout: 60_000 }).toBe(true);
  expect((await state(page)).muted).toBe(true);
});

test("WH-AK-12: Ruhemoment – Laterne heller und dunkler; Bürsten per Halten", async ({ page }) => {
  test.setTimeout(60_000);
  await open(page);
  await moveIn(page);
  await press(page, "🕯️ Ruhe");
  await press(page, /Ruhemoment/);
  const dlg = page.getByRole("dialog", { name: "Ruhemoment" });
  await expect(dlg).toBeVisible();
  await expect(dlg.getByText("Einatmen")).toBeVisible();
  const l0 = (await state(page)).lantern!;
  await expect
    .poll(async () => (await state(page)).lantern!, { timeout: 6000 })
    .toBeGreaterThan(l0 + 0.3);
  await expect(dlg.getByText("Ausatmen")).toBeVisible({ timeout: 7000 });
  await press(page, "Fertig");
  await expect(dlg).toBeHidden();
  // Haustier bürsten: Knopf 3 s halten
  await press(page, "🕯️ Ruhe");
  const brush = page.getByRole("button", { name: /Haustier bürsten/ });
  const box = (await brush.boundingBox())!;
  const f0 = (await state(page)).friendship;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect
    .poll(async () => (await state(page)).friendship, { timeout: 6000 })
    .toBeGreaterThan(f0);
  await page.mouse.up();
  await expect.poll(async () => (await state(page)).bubble).toMatch(/das mag es/);
});
