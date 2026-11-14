import { expect, test, type Page } from "@playwright/test";
import { expectNoErrors, isMobile, trackErrors } from "./helpers.ts";

/** Spec: specs/games/kabelsalat.md (KS-AK-06..10) */
interface KsState {
  screen: string;
  mode: string;
  mission: number | null;
  solved: boolean;
  stars: Record<number, number>;
  parts: { id: number; kind: string; x: number; y: number; rot: number; on: boolean }[];
  wires: number;
  lamps: string[];
  short: boolean;
  view: { bench: boolean; plan: boolean };
  schematic: number;
  paused: boolean;
  volume: number;
  pending: boolean;
}
type Pt = { x: number; y: number };
interface Hooks {
  state(): KsState;
  pin(part: number, pin: number): Pt | null;
  at(x: number, y: number): Pt;
}
declare global {
  interface Window {
    __dampf?: unknown;
  }
}
const state = (page: Page) => page.evaluate(() => (window.__dampf as Hooks).state());
const at = (page: Page, x: number, y: number) =>
  page.evaluate(([x, y]) => (window.__dampf as Hooks).at(x!, y!), [x, y]);
const pin = async (page: Page, part: number, i: number) =>
  (await page.evaluate(([p, i]) => (window.__dampf as Hooks).pin(p!, i!), [part, i]))!;

async function open(page: Page) {
  await page.goto("/games/kabelsalat/?e2e");
  await expect.poll(() => page.evaluate(() => !!window.__dampf), { timeout: 60_000 }).toBe(true);
}
const tapAt = (page: Page, p: Pt) =>
  isMobile(page) ? page.touchscreen.tap(p.x, p.y) : page.mouse.click(p.x, p.y);
/** Teil aus der Kiste antippen, dann die Stelle der Werkbank antippen */
async function place(page: Page, name: RegExp, x: number, y: number) {
  const b = page.getByRole("button", { name });
  if (isMobile(page)) await b.tap();
  else await b.click();
  await tapAt(page, await at(page, x, y));
  return (await state(page)).parts.at(-1)!;
}
/** Kabel: Punkt antippen, zweiten Punkt antippen */
async function tapWire(page: Page, a: [number, number], b: [number, number]) {
  await tapAt(page, await pin(page, ...a));
  await expect.poll(async () => (await state(page)).pending).toBe(true);
  await tapAt(page, await pin(page, ...b));
}
/** Kabel durch Ziehen (Maus) */
async function dragWire(page: Page, a: [number, number], b: [number, number]) {
  const p = await pin(page, ...a);
  const q = await pin(page, ...b);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(q.x, q.y, { steps: 6 });
  await page.mouse.up();
}

test("KS-AK-06: Mission 1 und 2 auf dem Desktop, Schalter und Schaltplan", async ({ page }) => {
  test.skip(isMobile(page), "nur Desktop");
  const errors = trackErrors(page);
  await open(page);
  await expect(page.getByRole("dialog", { name: "Mission" })).toContainText("Licht an!");
  await page.getByRole("button", { name: "Los!" }).click();
  // Batterie aus der Kiste ziehen, Lämpchen antippen und setzen
  const box = (await page.getByRole("button", { name: /^Batterie/ }).boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + 15);
  await page.mouse.down();
  const target = await at(page, 160, 300);
  await page.mouse.move(target.x, target.y, { steps: 8 });
  await page.mouse.up();
  const bat = (await state(page)).parts[0]!;
  expect(bat.kind).toBe("batterie");
  const lamp = await place(page, /^Lämpchen/, 420, 160);
  await dragWire(page, [bat.id, 0], [lamp.id, 0]);
  await dragWire(page, [lamp.id, 1], [bat.id, 1]);
  await expect.poll(async () => (await state(page)).lamps).toEqual(["hell"]);
  await expect(page.getByRole("dialog", { name: "Geschafft" })).toBeVisible();
  const s1 = await state(page);
  expect(s1.view).toEqual({ bench: true, plan: true });
  expect(s1.schematic).toBe(2);
  expect(s1.stars[1]).toBe(2);
  await page.getByRole("button", { name: "Nächste Mission" }).click();
  await page.getByRole("button", { name: "Los!" }).click();
  const b2 = await place(page, /^Batterie/, 140, 300);
  const l2 = await place(page, /^Lämpchen/, 400, 120);
  const sw = await place(page, /^Schalter/, 640, 300);
  await dragWire(page, [b2.id, 0], [l2.id, 0]);
  await dragWire(page, [l2.id, 1], [sw.id, 0]);
  await dragWire(page, [sw.id, 1], [b2.id, 1]);
  expect((await state(page)).lamps).toEqual(["aus"]);
  await page.getByRole("button", { name: "▶ Ausprobieren" }).click();
  const swPt = await at(page, sw.x, sw.y);
  await page.mouse.click(swPt.x, swPt.y);
  await expect.poll(async () => (await state(page)).lamps).toEqual(["hell"]);
  await expect.poll(async () => (await state(page)).solved).toBe(true);
  await page.getByRole("button", { name: "Weiterbauen" }).click();
  await page.mouse.click(swPt.x, swPt.y);
  await expect.poll(async () => (await state(page)).lamps).toEqual(["aus"]);
  await expectNoErrors(errors);
});

test("KS-AK-07: Mobile – antippen, Kabel, drehen, entfernen, Ansicht wechseln", async ({
  page,
}) => {
  test.skip(!isMobile(page), "nur Mobile");
  const errors = trackErrors(page);
  await open(page);
  await page.getByRole("button", { name: "Los!" }).tap();
  const bat = await place(page, /^Batterie/, 120, 200);
  const lamp = await place(page, /^Lämpchen/, 300, 400);
  expect((await state(page)).parts).toHaveLength(2);
  await tapWire(page, [bat.id, 0], [lamp.id, 0]);
  await expect.poll(async () => (await state(page)).wires).toBe(1);
  // Lämpchen auswählen, drehen, entfernen (das Kabel geht mit)
  await tapAt(page, await at(page, lamp.x, lamp.y));
  await page.getByRole("button", { name: "↻ Drehen" }).tap();
  await expect.poll(async () => (await state(page)).parts[1]!.rot).toBe(1);
  await page.getByRole("button", { name: "🗑 Weg" }).tap();
  await expect.poll(async () => (await state(page)).parts).toHaveLength(1);
  expect((await state(page)).wires).toBe(0);
  // Werkbank ↔ Schaltplan
  expect((await state(page)).view).toEqual({ bench: true, plan: false });
  await page.getByRole("button", { name: "📐 Schaltplan" }).tap();
  await expect.poll(async () => (await state(page)).view).toEqual({ bench: false, plan: true });
  await page.getByRole("button", { name: "🔧 Werkbank" }).tap();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(0);
  await expectNoErrors(errors);
});

test("KS-AK-08: Kurzschluss wird erklärt, ohne Fehler", async ({ page }) => {
  const errors = trackErrors(page);
  await open(page);
  const go = page.getByRole("button", { name: "Los!" });
  if (isMobile(page)) await go.tap();
  else await go.click();
  const bat = await place(page, /^Batterie/, 140, 200);
  // Kabel von + direkt nach − am selben Teil
  await tapWire(page, [bat.id, 0], [bat.id, 1]);
  await expect.poll(async () => (await state(page)).short).toBe(true);
  await expect(page.getByRole("alert")).toContainText("Kurzschluss");
  await expectNoErrors(errors);
});

test("KS-AK-09/10: Freibau bleibt nach Neuladen, ruhig und leise", async ({ page }) => {
  const errors = trackErrors(page);
  // Mission 1 schon geschafft: Start im Menü, Freibau wählen
  await page.addInitScript(() => {
    if (localStorage.getItem("dampf.kabelsalat.v1")) return;
    localStorage.setItem(
      "dampf.kabelsalat.v1",
      JSON.stringify({
        v: 1,
        stars: { 1: 2 },
        builds: {},
        free: { parts: [], wires: [], next: 1 },
        seen: [],
      }),
    );
  });
  await open(page);
  await expect(page.getByRole("dialog", { name: "Menü" })).toBeVisible();
  const tap = (n: string | RegExp) =>
    isMobile(page)
      ? page.getByRole("button", { name: n }).first().tap()
      : page.getByRole("button", { name: n }).first().click();
  await tap("🛠️ Freibau");
  const bat = await place(page, /^Batterie/, 140, 200);
  const lamp = await place(page, /^Lämpchen/, 340, 200);
  await tapWire(page, [bat.id, 0], [lamp.id, 0]);
  await tapWire(page, [lamp.id, 1], [bat.id, 1]);
  await expect.poll(async () => (await state(page)).lamps).toEqual(["hell"]);
  const s = await state(page);
  expect(s.volume).toBeCloseTo(0.3);
  // Fokusverlust hält die Lichtpunkte an
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  expect((await state(page)).paused).toBe(true);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!window.__dampf)).toBe(true);
  await tap("🛠️ Freibau");
  await expect.poll(async () => (await state(page)).parts).toHaveLength(2);
  expect((await state(page)).wires).toBe(2);
  expect((await state(page)).lamps).toEqual(["hell"]);
  await expectNoErrors(errors);
});
