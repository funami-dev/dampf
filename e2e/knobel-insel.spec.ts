import { expect, test, type Page } from "@playwright/test";
import { expectNoErrors, isMobile, trackErrors } from "./helpers.ts";

/** Spec: specs/games/knobel-insel.md (KI-AK-05..08) */
interface KiState {
  view: string;
  screen: string;
  paused: boolean;
  stars: Record<string, number>;
  cards: string[];
  hanoi: {
    n: number;
    pegs: number[][];
    moves: number;
    sel: number;
    done: boolean;
    busy: boolean;
    helper: boolean;
    zeitlupe: boolean;
    steps: number;
  };
  river: {
    level: string;
    side: Record<string, number>;
    boat: number;
    inBoat: string[];
    crossings: number;
    busy: boolean;
    done: boolean;
    hint: string[];
  };
  volume: number;
}
type Pt = { x: number; y: number };
interface Hooks {
  state(): KiState;
  pegPoint(i: number): Pt;
  actorPoint(id: string): Pt | null;
  speed(k: number): void;
}
declare global {
  interface Window {
    __dampf?: unknown;
  }
}
const state = (page: Page) => page.evaluate(() => (window.__dampf as Hooks).state());

async function open(page: Page, stars: Record<string, number> = {}) {
  if (Object.keys(stars).length)
    await page.addInitScript((s) => {
      if (localStorage.getItem("dampf.knobel-insel.v1")) return;
      localStorage.setItem(
        "dampf.knobel-insel.v1",
        JSON.stringify({ v: 1, stars: s, cards: [], volume: 0.3, muted: false }),
      );
    }, stars);
  await page.goto("/games/knobel-insel/?e2e");
  await expect.poll(() => page.evaluate(() => !!window.__dampf), { timeout: 60_000 }).toBe(true);
  await page.evaluate(() => (window.__dampf as Hooks).speed(4));
}
const tapAt = (page: Page, p: Pt) =>
  isMobile(page) ? page.touchscreen.tap(p.x, p.y) : page.mouse.click(p.x, p.y);
const press = (page: Page, name: string | RegExp, exact = false) => {
  const b = page.getByRole("button", { name, exact }).first();
  return isMobile(page) ? b.tap() : b.click();
};
async function peg(page: Page, from: number, to: number) {
  const a = await page.evaluate((i) => (window.__dampf as Hooks).pegPoint(i), from);
  const b = await page.evaluate((i) => (window.__dampf as Hooks).pegPoint(i), to);
  await tapAt(page, a);
  await tapAt(page, b);
  await expect.poll(async () => (await state(page)).hanoi.busy).toBe(false);
}
async function ride(page: Page, ids: string[]) {
  await expect.poll(async () => (await state(page)).river.busy).toBe(false);
  await page.waitForTimeout(250);
  for (const id of ids) {
    await expect
      .poll(async () => {
        const p = await page.evaluate((i) => (window.__dampf as Hooks).actorPoint(i), id);
        await tapAt(page, p!);
        return (await state(page)).river.inBoat.includes(id);
      })
      .toBe(true);
  }
  await press(page, "⛵ Los!");
  await expect.poll(async () => (await state(page)).river.busy).toBe(true);
  await expect.poll(async () => (await state(page)).river.busy, { timeout: 15_000 }).toBe(false);
}

test("KI-AK-05: Pfannkuchen-Turm – Autsch, Lösung in 7 Zügen, Zeitlupe, Pause", async ({
  page,
}) => {
  test.skip(isMobile(page), "nur Desktop");
  const errors = trackErrors(page);
  await open(page);
  expect((await state(page)).volume).toBeCloseTo(0.3);
  await press(page, "Pfannkuchen-Turm Level 1: 3 Pfannkuchen");
  await press(page, "Los!", true);
  await peg(page, 0, 2);
  // groß auf klein: Autsch, nichts ändert sich
  await peg(page, 0, 2);
  await expect(page.getByRole("alert")).toContainText("Autsch");
  expect((await state(page)).hanoi).toMatchObject({ pegs: [[3, 2], [], [1]], moves: 1 });
  for (const [a, b] of [
    [0, 1],
    [2, 1],
    [0, 2],
    [1, 0],
    [1, 2],
    [0, 2],
  ] as const)
    await peg(page, a, b);
  await expect.poll(async () => (await state(page)).hanoi.done).toBe(true);
  expect((await state(page)).hanoi.moves).toBe(7);
  // beim ersten Mal die Erklärkarte, dann das Ergebnis
  await expect(page.getByRole("dialog", { name: "So denkt ein Computer" })).toBeVisible();
  await expect(page.getByText("585 Milliarden Jahre")).toBeVisible();
  await press(page, "Weiter", true);
  await expect(page.getByRole("dialog", { name: "Geschafft" })).toContainText("7 Züge");
  expect((await state(page)).stars.h3).toBe(3);
  await press(page, "Nochmal");
  await press(page, "Los!", true);
  await press(page, "▶ Zeig's mir");
  await expect.poll(async () => (await state(page)).hanoi.steps).toBeGreaterThan(0);
  await expect(page.getByRole("list", { name: "Aufgaben der Zeitlupe" })).toContainText(
    "Bewege den Turm aus 3",
  );
  await press(page, "⏹ Anhalten");
  expect((await state(page)).hanoi).toMatchObject({ zeitlupe: false, moves: 0 });
  // Fokusverlust pausiert
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect.poll(async () => (await state(page)).screen).toBe("Pause");
  await press(page, "Weiterspielen");
  await expectNoErrors(errors);
});

test("KI-AK-06: Fluss – falsche Fahrt wird zurückgenommen, Lösung, Rätsel-Landkarte", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors = trackErrors(page);
  await open(page);
  await press(page, "Über den Fluss Level 1: Fuchs, Gans und Korn");
  await press(page, "Los!", true);
  // Bäuerin nimmt den Fuchs mit → Gans und Korn allein
  await ride(page, ["baeuerin", "fuchs"]);
  await expect(page.getByRole("alert")).toContainText("Gans pickt");
  await expect
    .poll(async () => (await state(page)).river.side, { timeout: 15_000 })
    .toEqual({ baeuerin: 0, fuchs: 0, gans: 0, korn: 0 });
  expect((await state(page)).river.crossings).toBe(0);
  for (const ids of [
    ["baeuerin", "gans"],
    ["baeuerin"],
    ["baeuerin", "fuchs"],
    ["baeuerin", "gans"],
    ["baeuerin", "korn"],
    ["baeuerin"],
    ["baeuerin", "gans"],
  ])
    await ride(page, ids);
  await expect.poll(async () => (await state(page)).river.done).toBe(true);
  expect((await state(page)).river.crossings).toBe(7);
  await expect(page.getByRole("dialog", { name: "Geschafft" })).toBeVisible({ timeout: 10_000 });
  expect((await state(page)).stars.f1).toBe(3);
  await press(page, "🗺️ Rätsel-Landkarte");
  await expect(page.getByRole("img", { name: /Rätsel-Landkarte mit \d+ Lagen/ })).toBeVisible();
  await press(page, "Weiter", true);
  await expect(page.getByRole("dialog", { name: "So denkt ein Computer" })).toContainText(
    "Breitensuche",
  );
  await press(page, "Weiter", true);
  await expect.poll(async () => (await state(page)).view).toBe("map");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(0);
  await expectNoErrors(errors);
});

test("KI-AK-07: Helfer-Maus bis zum Ziel, Tipp bei Hasen und Füchsen", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = trackErrors(page);
  await open(page, { h3: 3, f1: 3 });
  await press(page, "Pfannkuchen-Turm Level 2: 4 Pfannkuchen");
  await press(page, "Los!", true);
  await press(page, "🐭 Helfer-Modus");
  expect((await state(page)).hanoi.helper).toBe(true);
  for (let round = 0; round < 4; round++) {
    await press(page, "🐭 Maus, trag den kleinen Turm weg!");
    await expect.poll(async () => (await state(page)).hanoi.busy, { timeout: 20_000 }).toBe(false);
    const s = (await state(page)).hanoi;
    // der größte, der noch nicht rechts liegt, liegt jetzt oben
    let k = 4;
    for (let i = 0; i < s.pegs[2]!.length && s.pegs[2]![i] === 4 - i; i++) k = 4 - i - 1;
    const from = s.pegs.findIndex((p) => p.at(-1) === k);
    await peg(page, from, 2);
  }
  await expect.poll(async () => (await state(page)).hanoi.done).toBe(true);
  expect((await state(page)).hanoi.moves).toBe(15);
  await page.goto("/games/knobel-insel/?e2e");
  await expect.poll(() => page.evaluate(() => !!window.__dampf)).toBe(true);
  await press(page, "Über den Fluss Level 2: Hasen und Füchse");
  await press(page, "Los!", true);
  await press(page, "💡 Tipp");
  await expect.poll(async () => (await state(page)).river.hint.length).toBeGreaterThan(0);
  await expect(page.getByRole("alert")).toContainText("Tipp");
  await expectNoErrors(errors);
});
