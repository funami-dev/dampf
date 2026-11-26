import { expect, test, type Page } from "@playwright/test";
import { expectNoErrors, isMobile, trackErrors } from "./helpers.ts";
import { hintFlip } from "../games/knobel-insel/src/logic/flip.ts";
import { JUG_LEVELS, jugShortest } from "../games/knobel-insel/src/logic/jugs.ts";
import { frogBest, type Pad } from "../games/knobel-insel/src/logic/frogs.ts";

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
  chapter: Record<string, unknown> | null;
}
type Pt = { x: number; y: number };
interface Hooks {
  state(): KiState;
  pegPoint(i: number): Pt;
  actorPoint(id: string): Pt | null;
  speed(k: number): void;
  chapterPoint(what: string): Pt | null;
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

// --- Version 1.1: Keks-Waage, Käse-Labyrinth, Pfannkuchen wenden, Brücke bei Nacht (KI-AK-17) ---
const chap = async (page: Page) => (await state(page)).chapter!;
const cp = async (page: Page, what: string) =>
  (await page.evaluate((w) => (window.__dampf as Hooks).chapterPoint(w), what))!;
/** beim ersten Mal kommt die Computer-Karte, danach das Ergebnis */
async function finishCard(page: Page, text: RegExp) {
  await expect(page.getByRole("dialog", { name: "So denkt ein Computer" })).toContainText(text, {
    timeout: 10_000,
  });
  await press(page, "Weiter", true);
  await expect(page.getByRole("dialog", { name: "Geschafft" })).toBeVisible();
}

test("KI-AK-17: Keks-Waage – wiegen und den Keks finden", async ({ page }) => {
  const errors = trackErrors(page);
  await open(page);
  await press(page, "Keks-Waage Level 1: 3 🍪");
  await press(page, "Los!", true);
  await tapAt(page, await cp(page, "keks:0"));
  await tapAt(page, await cp(page, "links"));
  await tapAt(page, await cp(page, "keks:1"));
  await tapAt(page, await cp(page, "rechts"));
  expect(await chap(page)).toMatchObject({ left: [0], right: [1] });
  await press(page, "⚖️ Wiegen");
  expect((await chap(page)).weighings).toBe(1);
  const k = (await chap(page)).found as number;
  expect(k).not.toBeNull();
  await press(page, "🤔 Das ist er!");
  await tapAt(page, await cp(page, `keks:${k}`));
  await finishCard(page, /Teile und herrsche/);
  expect((await state(page)).stars.w1).toBe(3);
  await expectNoErrors(errors);
});

test("KI-AK-17: Käse-Labyrinth – Weg malen, Welle zeigen, Maus läuft zum Käse", async ({
  page,
}) => {
  test.skip(isMobile(page), "nur Desktop");
  const errors = trackErrors(page);
  await open(page);
  await press(page, "Käse-Labyrinth Level 1: klein");
  await press(page, "Los!", true);
  await press(page, "🌊 Zeig, wie der Computer sucht");
  await expect.poll(async () => (await chap(page)).wave as number).toBeGreaterThan(3);
  const best = (await chap(page)).best as [number, number][];
  const pts = [];
  for (const [x, y] of best) pts.push(await cp(page, `${x},${y}`));
  await page.mouse.move(pts[0]!.x, pts[0]!.y);
  await page.mouse.down();
  for (const q of pts.slice(1)) await page.mouse.move(q.x, q.y, { steps: 3 });
  await page.mouse.up();
  expect((await chap(page)).path).toBe((await chap(page)).min);
  await press(page, "🐭 Los!");
  await finishCard(page, /Breitensuche/);
  expect((await state(page)).stars.l1).toBe(3);
  await expectNoErrors(errors);
});

test("KI-AK-17: Pfannkuchen wenden – Stapel sortieren", async ({ page }) => {
  test.skip(isMobile(page), "nur Desktop");
  const errors = trackErrors(page);
  await open(page);
  await press(page, "Pfannkuchen wenden Level 1: 4 🥞");
  await press(page, "Los!", true);
  for (let k = 0; k < 10 && !(await chap(page)).done; k++) {
    const stack = (await chap(page)).stack as number[];
    const i = hintFlip(stack);
    if (i === null) break;
    await tapAt(page, await cp(page, String(i)));
    await expect.poll(async () => (await chap(page)).busy).toBe(false);
  }
  await expect.poll(async () => (await chap(page)).done).toBe(true);
  await finishCard(page, /2 Wendungen je Pfannkuchen/);
  expect((await state(page)).stars.p1).toBeGreaterThan(0);
  await expectNoErrors(errors);
});

test("KI-AK-17: Brücke bei Nacht – alle in 8 Minuten hinüber", async ({ page }) => {
  test.setTimeout(90_000);
  const errors = trackErrors(page);
  await open(page);
  await press(page, "Brücke bei Nacht Level 1: 3 Tiere");
  await press(page, "Los!", true);
  await page.waitForTimeout(400);
  for (const group of [["hase", "igel"], ["hase"], ["hase", "kroete"]]) {
    await expect.poll(async () => (await chap(page)).busy).toBe(false);
    await expect.poll(async () => (await chap(page)).settled).toBe(true);
    for (const id of group)
      await expect
        .poll(async () => {
          if (!((await chap(page)).sel as string[]).includes(id))
            await tapAt(page, await cp(page, id));
          return ((await chap(page)).sel as string[]).includes(id);
        })
        .toBe(true);
    await press(page, "🔦 Los!");
    await expect.poll(async () => (await chap(page)).busy).toBe(true);
  }
  await expect.poll(async () => (await chap(page)).done, { timeout: 20_000 }).toBe(true);
  expect((await chap(page)).minutes).toBe(8);
  await finishCard(page, /19 Minuten/);
  expect((await state(page)).stars.b1).toBe(3);
  await expectNoErrors(errors);
});

// --- Version 1.2: Wasserkrüge, Frosch-Hüpfen, Lichter aus, Pinguin-Parade (KI-AK-17) ---
test("KI-AK-17: Wasserkrüge – genau 4 Liter, dann Rätsel-Landkarte", async ({ page }) => {
  const errors = trackErrors(page);
  await open(page);
  await press(page, "Wasserkrüge Level 1: 3+5 L");
  await press(page, "Los!", true);
  for (const a of jugShortest(JUG_LEVELS[0]!)!) {
    if (a.kind === "fill") {
      await tapAt(page, await cp(page, "teich"));
      await tapAt(page, await cp(page, String(a.i)));
    } else if (a.kind === "empty") {
      await tapAt(page, await cp(page, String(a.i)));
      await tapAt(page, await cp(page, "teich"));
    } else {
      await tapAt(page, await cp(page, String(a.i)));
      await tapAt(page, await cp(page, String(a.j)));
    }
  }
  expect((await chap(page)).steps).toBe(6);
  await finishCard(page, /Breitensuche/);
  expect((await state(page)).stars.j1).toBe(3);
  await press(page, "🗺️ Rätsel-Landkarte");
  await expect(page.getByRole("img", { name: /Rätsel-Landkarte mit 16 Lagen/ })).toBeVisible();
  await expectNoErrors(errors);
});

test("KI-AK-17: Frosch-Hüpfen – Seiten tauschen", async ({ page }) => {
  const errors = trackErrors(page);
  await open(page);
  await press(page, "Frosch-Hüpfen Level 1: 1+1");
  await press(page, "Los!", true);
  for (let k = 0; k < 6 && !(await chap(page)).done; k++) {
    const pads = ((await chap(page)).pads as string).split("") as Pad[];
    const i = frogBest(pads).first;
    if (i === null) break;
    await tapAt(page, await cp(page, String(i)));
    await expect.poll(async () => (await chap(page)).busy).toBe(false);
  }
  await expect.poll(async () => (await chap(page)).pads).toBe("B.G");
  await finishCard(page, /n² \+ 2n/);
  expect((await state(page)).stars.q1).toBe(3);
  await expectNoErrors(errors);
});

test("KI-AK-17: Lichter aus – alle Laternen aus", async ({ page }) => {
  const errors = trackErrors(page);
  await open(page);
  await press(page, "Lichter aus Level 1: 3×3");
  await press(page, "Los!", true);
  const sol = (await chap(page)).solution as [number, number][];
  expect(sol).toHaveLength(2);
  for (const [x, y] of sol) await tapAt(page, await cp(page, `${x},${y}`));
  await expect.poll(async () => (await chap(page)).lit).toBe(0);
  await finishCard(page, /Reihenfolge ist egal/);
  expect((await state(page)).stars.x1).toBe(3);
  await expectNoErrors(errors);
});

test("KI-AK-17: Pinguin-Parade – sortieren und Wettrennen", async ({ page }) => {
  const errors = trackErrors(page);
  await open(page);
  await press(page, "Pinguin-Parade Level 1: 5 🐧");
  await press(page, "Los!", true);
  for (let k = 0; k < 10 && !(await chap(page)).done; k++) {
    const o = (await chap(page)).order as number[];
    const i = o.findIndex((v, j) => j < o.length - 1 && v > o[j + 1]!);
    if (i < 0) break;
    await tapAt(page, await cp(page, String(i)));
    await tapAt(page, await cp(page, String(i + 1)));
    await expect.poll(async () => (await chap(page)).busy).toBe(false);
  }
  expect((await chap(page)).swaps).toBe(4);
  await finishCard(page, /Bubblesort/);
  expect((await state(page)).stars.g1).toBe(3);
  await press(page, "🏁 Wettrennen");
  await expect
    .poll(async () => ((await chap(page)).race as { done: boolean }).done, { timeout: 20_000 })
    .toBe(true);
  await expect(page.getByRole("alert")).toContainText("Mischen war nach");
  await expectNoErrors(errors);
});

// --- Version 1.3: Orakel-Uhu, Zaubertrick, Geheimschrift, Schildkröten-Programm (KI-AK-17) ---
test("KI-AK-17: Orakel-Uhu – halbieren, dann rät der Uhu", async ({ page }) => {
  const errors = trackErrors(page);
  await open(page);
  await press(page, "Orakel-Uhu Level 1: 1–10");
  await press(page, "Los!", true);
  for (let k = 0; k < 6 && !(await chap(page)).done; k++) {
    const c = await chap(page);
    const g = Math.floor(((c.lo as number) + (c.hi as number)) / 2);
    await page.getByLabel("Deine Zahl").fill(String(g));
    await press(page, "🦉 Fragen");
  }
  expect((await chap(page)).done).toBe(true);
  expect((await chap(page)).q as number).toBeLessThanOrEqual(4);
  await finishCard(page, /Binäre Suche/);
  expect((await state(page)).stars.u1).toBe(3);
  // umgekehrt: der Uhu errät die 7
  await press(page, "Nochmal");
  await press(page, "Los!", true);
  await press(page, "🔄 Jetzt rät der Uhu");
  for (let k = 0; k < 6; k++) {
    const r = (await chap(page)).rev as { g: number; done: boolean };
    if (r.done) break;
    await press(page, r.g === 7 ? "✅ Richtig!" : r.g < 7 ? "⬆ Höher" : "⬇ Tiefer");
  }
  await expect(page.getByRole("status").filter({ hasText: "Hab ich in" })).toBeVisible();
  await expectNoErrors(errors);
});

test("KI-AK-17: Zaubertrick – Karten verraten die Zahl, dann Lampen", async ({ page }) => {
  const errors = trackErrors(page);
  await open(page);
  await press(page, "Zaubertrick Level 1: 3 Karten");
  // gedachte Zahl 5 = 4 + 1: Karte 1 ja, Karte 2 nein, Karte 3 ja
  for (const yes of [true, false, true]) await press(page, yes ? "Ja, drauf" : "Nein", true);
  await expect(page.getByRole("dialog", { name: "Zaubertrick" })).toContainText("Deine Zahl ist 5");
  await press(page, "Jetzt du!");
  expect((await chap(page)).target).toBe(5);
  await tapAt(page, await cp(page, "lampe:4"));
  await tapAt(page, await cp(page, "lampe:1"));
  expect((await chap(page)).value).toBe(5);
  await press(page, "✨ Fertig");
  await finishCard(page, /Binärzahlen/);
  expect((await state(page)).stars.k1).toBe(3);
  await expectNoErrors(errors);
});

test("KI-AK-17: Geheimschrift – Scheibe drehen und lesen", async ({ page }) => {
  const errors = trackErrors(page);
  await open(page);
  await press(page, "Geheimschrift Level 1: mit Schlüssel");
  await press(page, "Los!", true);
  await expect(page.getByRole("status").filter({ hasText: "Geheimbrief" })).toContainText("KDOOR");
  for (let i = 0; i < 3; i++) await press(page, "Scheibe ▶", true);
  expect((await chap(page)).read).toBe("HALLO FREUND");
  await press(page, "✨ Gelesen!");
  await finishCard(page, /Cäsar-Code/);
  expect((await state(page)).stars.c1).toBe(3);
  await expectNoErrors(errors);
});

test("KI-AK-17: Schildkröten-Programm – mit Schleife zum Salat", async ({ page }) => {
  const errors = trackErrors(page);
  await open(page);
  await press(page, "Schildkröten-Programm Level 1: Geradeaus");
  await press(page, "Los!", true);
  await press(page, "⬆ Vorwärts");
  await press(page, "▶ Start");
  await expect(page.getByRole("alert")).toContainText("Salat ist noch nicht erreicht", {
    timeout: 10_000,
  });
  await press(page, "⌫", true);
  await press(page, "🔁 3×");
  await press(page, "⬆ Vorwärts");
  await press(page, "⬆ Vorwärts");
  expect((await chap(page)).prog).toEqual(["R3", "F", "F"]);
  await press(page, "▶ Start");
  await finishCard(page, /Schleife/);
  expect((await state(page)).stars.t1).toBe(3);
  await expectNoErrors(errors);
});
