import { expect, test, type Page } from "@playwright/test";
import { expectNoErrors, isMobile, trackErrors } from "./helpers.ts";
import { BOOK_KEY } from "../games/waldlager/src/logic/tierbuch.ts";
import { SPECIES } from "../games/waldlager/src/logic/species.ts";

interface WlState {
  screen: string;
  total: number;
  phase: string;
  dark: number;
  me: {
    name: string;
    color: string;
    x: number;
    y: number;
    needs: { hunger: number; rest: number; fitness: number };
    wood: number;
    berries: number;
    apples: number;
    mushrooms: number;
    cans: number;
    tent: { x: number; y: number } | null;
    radio: boolean;
    landing: number;
    home: { x: number; y: number };
  };
  action: string | null;
  fires: { burning: boolean }[];
  stumps: number;
  animals: number;
  building: boolean;
  mode: string;
  roomCode: string | null;
  players: { id: string; name: string; x: number; y: number }[];
  stumpList: number[];
  seed: number;
  book: string[];
  plane: { x: number; y: number; cells: [number, number][] };
  debris: { x: number; y: number }[];
  bridges: number[];
  size: number;
  trail: number;
}
interface Hooks {
  state(): WlState;
  teleport(x: number, y: number, fx?: number, fy?: number): void;
  setTime(t: number): void;
  setNeeds(n: Partial<WlState["me"]["needs"]>): void;
  nearestTree(): [number, number, number, number] | null;
  nearestBush(): [number, number] | null;
  buildSpot(): [number, number, number, number] | null;
  nearestAnimal(): [number, number, string] | null;
  riverSpot(): [number, number, number, number] | null;
  cell(x: number, y: number): { terrain: number; free: boolean; tree: number };
  finishLanding(): void;
  markTrail(x: number, y: number): void;
  hutSpot(): [number, number, number, number] | null;
  appleSpot(): [number, number, number, number] | null;
}

declare global {
  interface Window {
    __dampf?: unknown;
  }
}

const hooks = <R>(page: Page, fn: (h: Hooks) => R) =>
  page.evaluate(`(${fn.toString()})(window.__dampf)`) as Promise<R>;
const state = (page: Page) => hooks(page, (h) => h.state());

/** relay: Adresse des Raum-Servers; leer = nur Einzelspieler (WL-AK-16) */
async function open(page: Page, relay = "") {
  await page.goto(`/games/waldlager/?e2e&relay=${encodeURIComponent(relay)}`);
  await expect.poll(() => page.evaluate(() => !!window.__dampf), { timeout: 60_000 }).toBe(true);
}

/** Warten, bis die Fallschirm-Landung vorbei ist */
async function landed(page: Page) {
  // Laufen mehrere Testfenster parallel, verliert ein Fenster den Fokus und das Spiel pausiert
  // (WL-AK-17) – dann steht auch die Landung. Weiterspielen; dauert es zu lange, Test-Hilfe.
  const t0 = Date.now();
  await expect
    .poll(
      async () => {
        const s = await state(page);
        if (s.screen === "paused")
          await page.getByRole("button", { name: "Weiterspielen" }).click();
        if (s.me.landing > 0 && Date.now() - t0 > 8_000)
          await page.evaluate(() => (window.__dampf as Hooks).finishLanding());
        return s.me.landing;
      },
      { timeout: 30_000 },
    )
    .toBe(0);
}

async function chopTree(page: Page) {
  const t = await hooks(page, (h) => h.nearestTree());
  expect(t).not.toBeNull();
  const [tx, ty, sx, sy] = t!;
  await page.evaluate(
    ([tx, ty, sx, sy]) =>
      (window.__dampf as Hooks).teleport(sx! + 0.5, sy! + 0.5, tx! - sx!, ty! - sy!),
    [tx, ty, sx, sy],
  );
  await expect.poll(async () => (await state(page)).action).toBe("chop");
  const before = (await state(page)).me.wood;
  for (let i = 0; i < 4; i++) await page.keyboard.press("e");
  await expect.poll(async () => (await state(page)).me.wood).toBe(before + 3);
}

test("WL-AK-13: Desktop – hacken, Feuer und Zelt bauen, Beeren essen, Nacht", async ({ page }) => {
  test.skip(isMobile(page), "nur Desktop");
  test.setTimeout(180_000);
  const errors = trackErrors(page);
  await open(page);
  // WL-AK-16: ohne Server keine Online-Knöpfe
  await expect(page.getByRole("button", { name: /beitreten/i })).toHaveCount(0);
  await expect(page.getByText("Offene Welten")).toHaveCount(0);
  await page.getByLabel("Dein Name").fill("Mia");
  await page.getByRole("button", { name: "Farbe #e74c3c" }).click();
  await page.getByRole("button", { name: "Los geht's" }).click();
  await expect.poll(async () => (await state(page)).screen).toBe("play");
  await landed(page);
  const s0 = await state(page);
  expect(s0.me.name).toBe("Mia");
  expect(s0.me.color).toBe("#e74c3c");
  expect(s0.animals).toBeGreaterThan(10);

  // Laufen mit der Tastatur (der Landeplatz ist zufällig: steht in einer Richtung ein Baum,
  // die nächste Richtung probieren)
  let moved = 0;
  for (const key of ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"]) {
    const a = (await state(page)).me;
    await page.keyboard.down(key);
    await page.waitForTimeout(600);
    await page.keyboard.up(key);
    const b = (await state(page)).me;
    moved = Math.hypot(b.x - a.x, b.y - a.y);
    if (moved > 0.3) break;
  }
  expect(moved).toBeGreaterThan(0.3);

  // Holz hacken: vier Bäume → 12 Holz
  for (let k = 0; k < 4; k++) {
    await hooks(page, (h) => h.setNeeds({ fitness: 100 }));
    await chopTree(page);
  }
  expect((await state(page)).stumps).toBe(4);

  // Feuer bauen (B, 2)
  const spot = (await hooks(page, (h) => h.buildSpot()))!;
  await page.evaluate(
    (s) => (window.__dampf as Hooks).teleport(s[0]! + 0.5, s[1]! + 0.5, 1, 0),
    spot,
  );
  await page.keyboard.press("b");
  await expect.poll(async () => (await state(page)).building).toBe(true);
  await page.keyboard.press("2");
  await expect.poll(async () => (await state(page)).fires.length).toBe(1);
  expect((await state(page)).fires[0]!.burning).toBe(true);
  expect((await state(page)).me.wood).toBe(9);

  // Zelt bauen über den Button
  const spot2 = (await hooks(page, (h) => h.buildSpot()))!;
  await page.evaluate(
    (s) => (window.__dampf as Hooks).teleport(s[0]! + 0.5, s[1]! + 0.5, 1, 0),
    spot2,
  );
  await page.getByRole("button", { name: "Bauen" }).click();
  await page.getByRole("button", { name: /^Zelt/ }).click();
  await expect.poll(async () => (await state(page)).me.tent).not.toBeNull();
  expect((await state(page)).me.wood).toBe(1);

  // Beeren pflücken und essen
  const bush = (await hooks(page, (h) => h.nearestBush()))!;
  await page.evaluate((b) => (window.__dampf as Hooks).teleport(b[0]! + 0.5, b[1]! + 0.5), bush);
  await expect.poll(async () => (await state(page)).action).toBe("pick");
  await page.keyboard.press("e");
  await expect.poll(async () => (await state(page)).me.berries).toBe(4);
  await hooks(page, (h) => h.setNeeds({ hunger: 50 }));
  await page.keyboard.press("q");
  await expect.poll(async () => Math.round((await state(page)).me.needs.hunger)).toBe(62);
  expect((await state(page)).me.berries).toBe(3);

  // Zeit bis zur Nacht vorspulen
  await hooks(page, (h) => h.setTime(480));
  await expect.poll(async () => (await state(page)).phase).toBe("nacht");
  await expect.poll(async () => (await state(page)).dark).toBeGreaterThan(0.7);

  // WL-AK-10: Neuladen → Weiterspielen mit gleichem Stand
  await page.keyboard.press("Escape");
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!window.__dampf), { timeout: 60_000 }).toBe(true);
  await page.getByRole("button", { name: "Weiterspielen" }).click();
  const s2 = await state(page);
  expect(s2.me.name).toBe("Mia");
  expect(s2.me.berries).toBe(3);
  expect(s2.me.tent).not.toBeNull();
  expect(s2.stumps).toBe(4);
  await expectNoErrors(errors);
});

test("WL-AK-14: Mobile – Joystick, Aktion, Essen, Bauen, Menü", async ({ page }) => {
  test.skip(!isMobile(page), "nur Mobile");
  test.setTimeout(120_000);
  const errors = trackErrors(page);
  await open(page);
  await page.getByRole("button", { name: "Los geht's" }).tap();
  await expect.poll(async () => (await state(page)).screen).toBe("play");
  await landed(page);
  const vp = page.viewportSize()!;
  const stick = page.getByRole("slider", { name: "Laufen" });
  for (const el of [
    stick,
    page.getByRole("button", { name: "Aktion" }),
    page.getByRole("button", { name: "Essen" }),
    page.getByRole("button", { name: "Bauen" }),
    page.getByRole("button", { name: "Menü" }),
  ]) {
    await expect(el).toBeVisible();
    const b = (await el.boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.y).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(vp.width + 0.5);
    expect(b.y + b.height).toBeLessThanOrEqual(vp.height + 0.5);
  }
  // Joystick bewegt die Figur (auf eine freie Fläche stellen)
  const free0 = (await hooks(page, (h) => h.buildSpot()))!;
  await page.evaluate((f) => (window.__dampf as Hooks).teleport(f[0]! + 0.5, f[1]! + 0.5), free0);
  const s0 = await state(page);
  const b = (await stick.boundingBox())!;
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: cx, y: cy }],
  });
  for (let i = 1; i <= 5; i++)
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: cx, y: cy + i * 8 }],
    });
  await page.waitForTimeout(800);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  const s1 = await state(page);
  expect(Math.hypot(s1.me.x - s0.me.x, s1.me.y - s0.me.y)).toBeGreaterThan(0.15);

  // Aktion per Button (Holz hacken)
  const t = (await hooks(page, (h) => h.nearestTree()))!;
  await page.evaluate(
    (t) =>
      (window.__dampf as Hooks).teleport(t[2]! + 0.5, t[3]! + 0.5, t[0]! - t[2]!, t[1]! - t[3]!),
    t,
  );
  await expect(page.getByRole("button", { name: "Aktion" })).toHaveText("Holz hacken");
  for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Aktion" }).tap();
  await expect.poll(async () => (await state(page)).me.wood).toBe(3);
  await page.getByRole("button", { name: "Essen" }).tap();
  await page.getByRole("button", { name: "Bauen" }).tap();
  await expect(page.getByRole("button", { name: /^Lagerfeuer/ })).toBeVisible();
  await page.getByRole("button", { name: "✕" }).tap();
  await page.getByRole("button", { name: "Menü" }).tap();
  await expect(page.getByRole("button", { name: "Weiterspielen" })).toBeVisible();
  await expectNoErrors(errors);
});

test("WL-AK-17: Fokusverlust pausiert, allein hält die Zeit an", async ({ page }) => {
  test.setTimeout(90_000);
  await open(page);
  await page.getByRole("button", { name: "Los geht's" }).click();
  await expect.poll(async () => (await state(page)).screen).toBe("play");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect.poll(async () => (await state(page)).screen).toBe("paused");
  const t = (await state(page)).total;
  await page.waitForTimeout(600);
  expect((await state(page)).total).toBe(t);
  await page.getByRole("button", { name: "Weiterspielen" }).click();
  await expect.poll(async () => (await state(page)).total).toBeGreaterThan(t);
});

test("WL-AK-15: zwei Browser – Welt ist offen, Liste im Hauptmenü, beitreten, Gastgeber geht", async ({
  page,
  browser,
}) => {
  test.skip(isMobile(page), "nur Desktop");
  test.skip(!!process.env.DAMPF_URL, "braucht den lokalen Raum-Server");
  test.setTimeout(180_000);
  const relay = "ws://localhost:8787";
  // eindeutige Namen, falls mehrere Testläufe denselben Raum-Server nutzen
  const id = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  const host = `Mia${id}`;
  const gast = `Ben${id}`;
  const errors = trackErrors(page);
  await open(page, relay);
  await expect(page.getByText("Dein Name ist für alle sichtbar")).toBeVisible();
  await page.getByLabel("Dein Name").fill(host);
  await page.getByRole("button", { name: "Los geht's" }).click();
  // Ohne Zutun offen
  await expect
    .poll(async () => (await state(page)).roomCode, { timeout: 30_000 })
    .toMatch(/^[A-Z]{4}$/);
  await expect(page.getByText("Online · 1")).toBeVisible();

  const ctx2 = await browser.newContext();
  const guest = await ctx2.newPage();
  const errors2 = trackErrors(guest);
  await open(guest, relay);
  await guest.getByLabel("Dein Name").fill(gast);
  await guest.getByRole("button", { name: "Farbe #f1c40f" }).click();
  const lobby = guest.getByRole("region", { name: "Offene Welten" });
  await expect(lobby.getByText(`${host}s Welt`)).toBeVisible({ timeout: 20_000 });
  await expect(lobby.getByText(`${host} · 1 / 6`)).toBeVisible();
  await lobby.getByRole("button", { name: `${host}s Welt beitreten` }).click();
  await expect.poll(async () => (await state(guest)).mode, { timeout: 30_000 }).toBe("guest");
  // Beide sehen sich
  await expect.poll(async () => (await state(page)).players.length, { timeout: 30_000 }).toBe(2);
  await expect.poll(async () => (await state(guest)).players.length, { timeout: 30_000 }).toBe(2);
  expect((await state(guest)).seed).toBe((await state(page)).seed);
  await expect(page.getByText("Online · 2")).toBeVisible();

  // Liste zeigt jetzt beide Namen (dritter Browser im Hauptmenü)
  const ctx3 = await browser.newContext();
  const third = await ctx3.newPage();
  await open(third, relay);
  const lobby3 = third.getByRole("region", { name: "Offene Welten" });
  await expect(lobby3.getByText(`${host}, ${gast} · 2 / 6`)).toBeVisible({ timeout: 20_000 });

  // Gastgeber fällt einen Baum → beim Gast ist er ein Stumpf
  await page.bringToFront();
  if (await page.getByRole("button", { name: "Weiterspielen" }).isVisible())
    await page.getByRole("button", { name: "Weiterspielen" }).click();
  await landed(page);
  await landed(guest);
  // Gast in die Nähe des Gastgebers holen (große Insel)
  const hp = (await state(page)).me;
  await guest.evaluate((p) => (window.__dampf as Hooks).teleport(p.x + 3, p.y + 3), hp);
  await hooks(page, (h) => h.setNeeds({ fitness: 100 }));
  await chopTree(page);
  const stump = (await state(page)).stumpList[0]!;
  await expect
    .poll(async () => (await state(guest)).stumpList, { timeout: 15_000 })
    .toContain(stump);

  // Gast hackt selbst: Holz kommt vom Gastgeber zurück
  const t = (await hooks(guest, (h) => h.nearestTree()))!;
  await guest.evaluate(
    (t) =>
      (window.__dampf as Hooks).teleport(t[2]! + 0.5, t[3]! + 0.5, t[0]! - t[2]!, t[1]! - t[3]!),
    t,
  );
  await guest.waitForTimeout(400);
  for (let i = 0; i < 4; i++) {
    await guest.keyboard.press("e");
    await guest.waitForTimeout(150);
  }
  await expect.poll(async () => (await state(guest)).me.wood, { timeout: 15_000 }).toBe(3);

  // Gastgeber geht → Hinweis beim Gast, Welt verschwindet aus der Liste
  await page.close();
  await expect(guest.getByRole("alert")).toContainText("Der Gastgeber hat die Welt verlassen", {
    timeout: 15_000,
  });
  await expect.poll(async () => (await state(guest)).mode).toBe("solo");
  await expect(lobby3.getByText(`${host}s Welt`)).toHaveCount(0, { timeout: 20_000 });
  await expectNoErrors(errors);
  await expectNoErrors(errors2);
  await ctx2.close();
  await ctx3.close();
});

test("WL-AK-22: Tier entdecken – Meldung und Tierbuch", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = trackErrors(page);
  await open(page);
  await page.getByRole("button", { name: "Los geht's" }).click();
  await expect.poll(async () => (await state(page)).screen).toBe("play");
  // erst landen: sonst überschreibt „Gelandet!“ die Meldung „Neu entdeckt“
  await landed(page);
  await hooks(page, (h) => h.setTime(100));
  const before = (await state(page)).book.length;
  const a = (await hooks(page, (h) => h.nearestAnimal()))!;
  expect(a).not.toBeNull();
  await page.evaluate((a) => (window.__dampf as Hooks).teleport(a[0] + 1.5, a[1]), a);
  // Unter Last kann ein paralleles Testfenster den Fokus nehmen (Spiel pausiert); dann weiter-
  // spielen und die Figur erneut neben das Tier setzen (es kann inzwischen weitergelaufen sein).
  await expect
    .poll(
      async () => {
        const s = await state(page);
        if (s.book.includes(a[2])) return s.book;
        if (s.screen === "paused")
          await page.getByRole("button", { name: "Weiterspielen" }).click();
        const b = await hooks(page, (h) => h.nearestAnimal());
        if (b && b[2] === a[2])
          await page.evaluate((b) => (window.__dampf as Hooks).teleport(b[0] + 1.5, b[1]), b);
        return s.book;
      },
      { timeout: 15_000 },
    )
    .toContain(a[2]);
  await expect(page.getByText(/^(Neu entdeckt: .+!|✨ Ein Einhorn! ✨)$/)).toBeVisible();
  expect((await state(page)).book.length).toBeGreaterThan(before);

  // Tierbuch über das Menü (das Menü hält das Spiel an; erst dann zählen, denn bis dahin kann
  // die Figur schon das nächste Tier entdeckt haben)
  const mobile = isMobile(page);
  const tap = (n: string) =>
    mobile
      ? page.getByRole("button", { name: n }).tap()
      : page.getByRole("button", { name: n }).click();
  await tap("Menü");
  const count = (await state(page)).book.length;
  await tap("Tierbuch");
  await expect(page.getByText(`${count} / 32 entdeckt`)).toBeVisible();
  await expect(page.getByText("???").first()).toBeVisible();
  const entry = page.locator(".wl-animal:not(.unseen)").first();
  await expect(entry).toBeVisible();
  await tap("Zurück");

  // Neuladen: Tierbuch bleibt
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!window.__dampf), { timeout: 60_000 }).toBe(true);
  expect((await state(page)).book).toContain(a[2]);
  await page.getByRole("button", { name: "Tierbuch" }).click();
  await expect(page.getByText(`${count} / 32 entdeckt`)).toBeVisible();
  await expectNoErrors(errors);
});

test("WL-AK-27: Fallschirm, Flugzeug, Funkgerät", async ({ page }) => {
  test.setTimeout(120_000);
  // Alle Tiere schon im Tierbuch: sonst überschreibt „Neu entdeckt: …“ die geprüften Meldungen
  await page.addInitScript(
    ([key, seen]) => localStorage.setItem(key as string, JSON.stringify({ v: 1, seen })),
    [BOOK_KEY, SPECIES.map((s) => s.id)] as const,
  );
  const errors = trackErrors(page);
  await open(page);
  const mobile = isMobile(page);
  const press = (n: string) =>
    mobile
      ? page.getByRole("button", { name: n }).tap()
      : page.getByRole("button", { name: n }).click();
  await page.getByLabel("Dein Name").fill("Lea");
  await press("Los geht's");
  await expect.poll(async () => (await state(page)).screen).toBe("play");
  const s0 = await state(page);
  expect(s0.size).toBe(256);
  expect(s0.me.landing).toBeGreaterThan(0);
  // Während der Landung keine Bewegung
  const x0 = s0.me.x;
  if (!mobile) {
    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(400);
    await page.keyboard.up("ArrowRight");
    expect((await state(page)).me.x).toBe(x0);
  }
  await landed(page);
  await expect(page.getByText(/^Gelandet!/)).toBeVisible();
  const s1 = await state(page);
  expect(Math.hypot(s1.me.home.x - s1.plane.x, s1.me.home.y - s1.plane.y)).toBeGreaterThanOrEqual(
    58,
  );
  // Ohne Funkgerät kein Funk
  await expect(page.getByRole("button", { name: /Funk/ })).toBeHidden();
  // Test-Hilfe: zum Flugzeug
  const [cx, cy] = s1.plane.cells[0]!;
  await page.evaluate(([x, y]) => (window.__dampf as Hooks).teleport(x! - 1.5, y! + 0.5), [cx, cy]);
  await expect.poll(async () => (await state(page)).me.radio).toBe(true);
  await expect(page.getByText("📻 Du hast im Flugzeug ein Funkgerät gefunden!")).toBeVisible();
  const funk = page.getByRole("button", { name: /Funk/ });
  await expect(funk).toBeVisible();
  const vp = page.viewportSize()!;
  const b = (await funk.boundingBox())!;
  expect(b.x + b.width).toBeLessThanOrEqual(vp.width + 0.5);
  expect(b.y + b.height).toBeLessThanOrEqual(vp.height + 0.5);
  await press("📻 Funk");
  const me = (await state(page)).me;
  await expect(page.getByRole("list", { name: "Spieler" })).toContainText(
    `Lea · X ${Math.floor(me.x)} · Y ${Math.floor(me.y)}`,
  );
  await expect(page.getByLabel("Inselkarte")).toBeVisible();
  await press("Zurück");
  // Funkgerät bleibt nach Neuladen
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!window.__dampf), { timeout: 60_000 }).toBe(true);
  await press("Weiterspielen");
  expect((await state(page)).me.radio).toBe(true);
  await expectNoErrors(errors);
});

test("WL-AK-30: Brücke bauen, über den Fluss laufen, Trümmer ansehen", async ({ page }) => {
  test.skip(isMobile(page), "nur Desktop");
  test.setTimeout(180_000);
  // volles Tierbuch: sonst kann „Neu entdeckt“ die Trümmer-Meldung überdecken
  await page.addInitScript(
    ([key, seen]) => localStorage.setItem(key as string, JSON.stringify({ v: 1, seen })),
    [BOOK_KEY, SPECIES.map((s) => s.id)] as const,
  );
  const errors = trackErrors(page);
  await open(page);
  await page.getByRole("button", { name: "Los geht's" }).click();
  await landed(page);
  // Holz für bis zu vier Brückenstücke (Flüsse sind 2–4 Felder breit)
  for (let k = 0; k < 4; k++) {
    await hooks(page, (h) => h.setNeeds({ fitness: 100 }));
    await chopTree(page);
  }
  expect((await state(page)).me.wood).toBeGreaterThanOrEqual(12);
  const spot = (await hooks(page, (h) => h.riverSpot()))!;
  expect(spot).not.toBeNull();
  const [sx, sy, fx, fy] = spot;
  await page.evaluate(
    (s) => (window.__dampf as Hooks).teleport(s[0]! + 0.5, s[1]! + 0.5, s[2], s[3]),
    spot,
  );
  await page.keyboard.press("b");
  // Stück für Stück bauen, bis vor der Figur kein Flusswasser mehr ist
  let built = 0;
  for (let k = 0; k < 4; k++) {
    const before = (await state(page)).bridges.length;
    await page.keyboard.press("3");
    await page.waitForTimeout(100);
    if ((await state(page)).bridges.length === before) break;
    built++;
    await page.evaluate(
      ([x, y, fx, fy]) => (window.__dampf as Hooks).teleport(x! + 0.5, y! + 0.5, fx, fy),
      [sx + fx * built, sy + fy * built, fx, fy],
    );
  }
  expect(built).toBeGreaterThanOrEqual(1);
  expect((await state(page)).bridges.length).toBe(built);
  await page.keyboard.press("Escape");
  // über die Brücke ans andere Ufer laufen: Kachelrichtung → Bildschirm-Tasten
  const keys =
    fx === 1
      ? ["ArrowRight", "ArrowDown"]
      : fx === -1
        ? ["ArrowLeft", "ArrowUp"]
        : fy === 1
          ? ["ArrowLeft", "ArrowDown"]
          : ["ArrowRight", "ArrowUp"];
  let last = -Infinity;
  const along = async () => {
    const s = await state(page);
    const d = (s.me.x - (sx + 0.5)) * fx + (s.me.y - (sy + 0.5)) * fy;
    // paralleles Testfenster hat den Fokus genommen → Spiel pausiert: weiterspielen, Tasten neu drücken
    if (s.screen === "paused") {
      await page.getByRole("button", { name: "Weiterspielen" }).click();
      for (const k of keys) await page.keyboard.down(k);
    } else if (d <= last) {
      // keine Bewegung seit der letzten Abfrage (z. B. eine Taste ging beim Fokuswechsel verloren):
      // zurück auf die Brückenmitte und beide Tasten neu drücken
      for (const k of keys) await page.keyboard.up(k);
      await page.evaluate(
        ([x, y, fx, fy]) => (window.__dampf as Hooks).teleport(x! + 0.5, y! + 0.5, fx, fy),
        [sx + fx * Math.max(1, Math.round(d)), sy + fy * Math.max(1, Math.round(d)), fx, fy],
      );
      for (const k of keys) await page.keyboard.down(k);
    }
    last = d;
    return d;
  };
  for (const k of keys) await page.keyboard.down(k);
  // laufen, bis man jenseits der Brücke steht (langsame Rechner brauchen länger)
  await expect.poll(along, { timeout: 15_000 }).toBeGreaterThan(built + 0.4);
  for (const k of keys) await page.keyboard.up(k);

  // Trümmerteil ansehen
  const d = (await state(page)).debris[0]!;
  await page.evaluate((d) => (window.__dampf as Hooks).teleport(d.x + 0.5, d.y + 0.5), d);
  await expect.poll(async () => (await state(page)).action).toBe("inspect");
  await page.keyboard.press("e");
  await expect(
    page.getByText(
      /^Ein Stück Flugzeug! Die Spur führt nach .+ – (ganz nah|nicht mehr weit|noch weit weg)\.$/,
    ),
  ).toBeVisible();
  await expectNoErrors(errors);
});

test("WL-AK-32: Eigene Farbe über den Farbwähler", async ({ page }) => {
  const errors = trackErrors(page);
  await open(page);
  const pick = page.getByLabel("Eigene Farbe");
  await pick.fill("#00ff7f");
  await expect(page.locator(".wl-color-pick")).toHaveClass(/\bon\b/);
  await expect(page.locator('.wl-color[aria-pressed="true"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Los geht's" }).click();
  await expect.poll(async () => (await state(page)).screen).toBe("play");
  expect((await state(page)).me.color).toBe("#00ff7f");

  await page.reload();
  await expect.poll(() => page.evaluate(() => !!window.__dampf), { timeout: 60_000 }).toBe(true);
  expect((await state(page)).me.color).toBe("#00ff7f");
  await expect(page.locator(".wl-color-pick")).toHaveClass(/\bon\b/);
  await expectNoErrors(errors);
});

test("WL-AK-33: Tierbuch-Suche", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = trackErrors(page);
  await open(page);
  await page.getByRole("button", { name: "Los geht's" }).click();
  await expect.poll(async () => (await state(page)).screen).toBe("play");
  await landed(page);
  await hooks(page, (h) => h.setTime(100));
  const a = (await hooks(page, (h) => h.nearestAnimal()))!;
  expect(a).not.toBeNull();
  await page.evaluate((a) => (window.__dampf as Hooks).teleport(a[0] + 1.5, a[1]), a);
  await expect.poll(async () => (await state(page)).book).toContain(a[2]);
  const book = (await state(page)).book;
  const sp = SPECIES.find((s) => s.id === a[2])!;
  const others = SPECIES.filter((s) => !book.includes(s.id));

  const mobile = isMobile(page);
  const tap = (n: string) =>
    mobile
      ? page.getByRole("button", { name: n }).tap()
      : page.getByRole("button", { name: n }).click();
  await tap("Menü");
  await tap("Tierbuch");
  const search = page.getByLabel("Tier suchen");
  const visible = page.locator(".wl-animal:visible");
  await expect(visible).toHaveCount(32);

  // Teil des Namens, anders geschrieben → nur passende entdeckte Tiere, keine „???“
  const part = sp.name.slice(0, Math.min(3, sp.name.length)).toUpperCase();
  await search.fill(part);
  await expect(visible.first()).toBeVisible();
  await expect(page.locator(".wl-animal.unseen:visible")).toHaveCount(0);
  await expect(visible.filter({ hasText: sp.name })).toHaveCount(1);
  const n = book.filter((id) =>
    SPECIES.find((s) => s.id === id)!
      .name.toLowerCase()
      .includes(part.toLowerCase()),
  ).length;
  await expect(visible).toHaveCount(n);

  // Tippen löst keine Spieltasten aus (Tierbuch bleibt offen, Spiel bleibt im Menü)
  await search.fill("");
  await search.pressSequentially("tweq");
  await expect(page.getByLabel("Tier suchen")).toBeVisible();
  expect((await state(page)).screen).not.toBe("play");

  // unpassender Text → Hinweis; ein unentdecktes Tier lässt sich nicht finden
  await search.fill("xyzxyz");
  await expect(page.getByText("Kein entdecktes Tier heißt so.")).toBeVisible();
  await expect(visible).toHaveCount(0);
  if (others.length) {
    await search.fill(others[0]!.name);
    await expect(page.locator(".wl-animal.unseen:visible")).toHaveCount(0);
  }

  // leer → wieder alle
  await search.fill("");
  await expect(visible).toHaveCount(32);
  await expect(page.getByText("Kein entdecktes Tier heißt so.")).toBeHidden();
  await tap("Zurück");
  await expectNoErrors(errors);
});

test("WL-AK-36: Tierbuch zeigt, wer gerade unterwegs ist", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = trackErrors(page);
  await open(page);
  await page.getByRole("button", { name: "Los geht's" }).click();
  await expect.poll(async () => (await state(page)).screen).toBe("play");
  await landed(page);
  const day = SPECIES.find((s) => s.time === "tag" && s.id !== "hai" && s.id !== "einhorn")!;
  const night = SPECIES.find((s) => s.time === "nacht")!;
  const mobile = isMobile(page);
  const tap = (n: string) =>
    mobile
      ? page.getByRole("button", { name: n }).tap()
      : page.getByRole("button", { name: n }).click();
  const check = async (t: number, dayText: string, nightText: string) => {
    await page.evaluate((t) => (window.__dampf as Hooks).setTime(t), t);
    await tap("Menü");
    await tap("Tierbuch");
    await expect(page.locator(`.wl-animal[data-id="${day.id}"] .wl-active`)).toHaveText(dayText);
    await expect(page.locator(`.wl-animal[data-id="${night.id}"] .wl-active`)).toHaveText(
      nightText,
    );
    await tap("Zurück");
    await tap("Weiterspielen");
    await expect.poll(async () => (await state(page)).screen).toBe("play");
  };
  await check(100, "🟢 Jetzt unterwegs", "💤 Schläft gerade");
  await check(500, "💤 Schläft gerade", "🟢 Jetzt unterwegs");
  await expectNoErrors(errors);
});

test("WL-AK-37: Regenbogenspur wird gezeichnet, auch nachts", async ({ page }) => {
  const errors = trackErrors(page);
  await open(page);
  await page.getByRole("button", { name: "Los geht's" }).click();
  await landed(page);
  await page.evaluate(() => {
    const h = window.__dampf as Hooks;
    const me = h.state().me;
    for (let k = 1; k <= 5; k++) h.markTrail(Math.floor(me.x) + k, Math.floor(me.y));
  });
  expect((await state(page)).trail).toBeGreaterThanOrEqual(5);
  await page.waitForTimeout(300);
  await hooks(page, (h) => h.setTime(500));
  await page.waitForTimeout(300);
  expect((await state(page)).trail).toBeGreaterThanOrEqual(5);
  await expectNoErrors(errors);
});

test("WL-AK-43: Hütte, Kiste, Apfelbaum und Ess-Auswahl", async ({ page }) => {
  test.setTimeout(120_000);
  // volles Tierbuch: sonst kann „Neu entdeckt“ die Meldungen überdecken
  await page.addInitScript(
    ([key, seen]) => localStorage.setItem(key as string, JSON.stringify({ v: 1, seen })),
    [BOOK_KEY, SPECIES.map((s) => s.id)] as const,
  );
  const errors = trackErrors(page);
  await open(page);
  const mobile = isMobile(page);
  const tap = (name: string | RegExp) =>
    mobile
      ? page.getByRole("button", { name }).first().tap()
      : page.getByRole("button", { name }).first().click();
  await tap("Los geht's");
  await landed(page);
  const go = async (spot: [number, number, number, number]) => {
    const [tx, ty, sx, sy] = spot;
    await page.evaluate(
      ([tx, ty, sx, sy]) =>
        (window.__dampf as Hooks).teleport(sx! + 0.5, sy! + 0.5, tx! - sx!, ty! - sy!),
      [tx, ty, sx, sy],
    );
  };
  const act = async () => {
    if (mobile) await tap("Aktion");
    else await page.keyboard.press("e");
  };
  const resumeIfPaused = async () => {
    if ((await state(page)).screen === "paused") await tap("Weiterspielen");
  };

  // Hütte: Meldung und Kiste
  const hut = (await hooks(page, (h) => h.hutSpot()))!;
  expect(hut).not.toBeNull();
  await go(hut);
  await expect(page.getByText(/^Eine verlassene Hütte!/)).toBeVisible();
  await expect.poll(async () => (await resumeIfPaused(), (await state(page)).action)).toBe("open");
  await act();
  await expect.poll(async () => (await state(page)).me.cans).toBe(2);
  await expect(page.getByText("🥫 2")).toBeVisible();

  // Apfelbaum schütteln
  const apple = (await hooks(page, (h) => h.appleSpot()))!;
  expect(apple).not.toBeNull();
  await go(apple);
  await expect.poll(async () => (await resumeIfPaused(), (await state(page)).action)).toBe("shake");
  await act();
  await expect.poll(async () => (await state(page)).me.apples).toBe(2);

  // Essen: mehrere Sorten → Auswahl-Leiste
  await hooks(page, (h) => h.setNeeds({ hunger: 40 }));
  if (mobile) await tap("Essen");
  else await page.keyboard.press("q");
  const bar = page.getByRole("group", { name: "Was möchtest du essen?" });
  await expect(bar).toBeVisible();
  await expect(bar.getByRole("button", { name: "Dose essen (2)" })).toBeVisible();
  const h0 = (await state(page)).me.needs.hunger;
  if (mobile) await bar.getByRole("button", { name: "Apfel essen (2)" }).tap();
  else await bar.getByRole("button", { name: "Apfel essen (2)" }).click();
  await expect.poll(async () => (await state(page)).me.apples).toBe(1);
  expect((await state(page)).me.needs.hunger).toBeGreaterThan(h0 + 15);
  await expect(bar).toBeHidden();
  await expectNoErrors(errors);
});
