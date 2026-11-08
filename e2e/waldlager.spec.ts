import { expect, test, type Page } from "@playwright/test";
import { expectNoErrors, isMobile, trackErrors } from "./helpers.ts";

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
    tent: { x: number; y: number } | null;
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
}
interface Hooks {
  state(): WlState;
  teleport(x: number, y: number, fx?: number, fy?: number): void;
  setTime(t: number): void;
  setNeeds(n: Partial<WlState["me"]["needs"]>): void;
  nearestTree(): [number, number, number, number] | null;
  nearestBush(): [number, number] | null;
  buildSpot(): [number, number, number, number] | null;
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
  await page.getByLabel("Dein Name").fill("Mia");
  await page.getByRole("button", { name: "Farbe #e74c3c" }).click();
  await page.getByRole("button", { name: "Los geht's" }).click();
  await expect.poll(async () => (await state(page)).screen).toBe("play");
  const s0 = await state(page);
  expect(s0.me.name).toBe("Mia");
  expect(s0.me.color).toBe("#e74c3c");
  expect(s0.animals).toBeGreaterThan(10);

  // Laufen mit der Tastatur
  await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(600);
  await page.keyboard.up("ArrowDown");
  const s1 = await state(page);
  expect(Math.hypot(s1.me.x - s0.me.x, s1.me.y - s0.me.y)).toBeGreaterThan(0.3);

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
  // Joystick bewegt die Figur
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
  expect(Math.hypot(s1.me.x - s0.me.x, s1.me.y - s0.me.y)).toBeGreaterThan(0.3);

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

test("WL-AK-15: zwei Browser – Welt öffnen, beitreten, gemeinsam hacken, Gastgeber geht", async ({
  page,
  browser,
}) => {
  test.skip(isMobile(page), "nur Desktop");
  test.skip(!!process.env.DAMPF_URL, "braucht den lokalen Raum-Server");
  test.setTimeout(180_000);
  const relay = "ws://localhost:8787";
  const errors = trackErrors(page);
  await open(page, relay);
  await page.getByLabel("Dein Name").fill("Mia");
  await page.getByRole("button", { name: "Los geht's" }).click();
  await page.getByRole("button", { name: "Menü" }).click();
  await page.getByRole("button", { name: "Welt öffnen" }).click();
  await expect
    .poll(async () => (await state(page)).roomCode, { timeout: 30_000 })
    .toMatch(/^[A-Z]{4}$/);
  const code = (await state(page)).roomCode!;
  await expect(page.getByText(`Raum ${code}`)).toBeVisible();

  const ctx2 = await browser.newContext();
  const guest = await ctx2.newPage();
  const errors2 = trackErrors(guest);
  await open(guest, relay);
  await guest.getByLabel("Dein Name").fill("Ben");
  await guest.getByRole("button", { name: "Farbe #f1c40f" }).click();
  await guest.getByRole("button", { name: "Einer Welt beitreten" }).click();
  await guest.getByLabel("Raum-Code").fill(code.toLowerCase());
  await guest.getByRole("button", { name: "Beitreten" }).click();
  await expect.poll(async () => (await state(guest)).mode, { timeout: 30_000 }).toBe("guest");
  // Beide sehen sich
  await expect.poll(async () => (await state(page)).players.length, { timeout: 30_000 }).toBe(2);
  await expect.poll(async () => (await state(guest)).players.length, { timeout: 30_000 }).toBe(2);
  expect((await state(page)).players.map((p) => p.name).sort()).toEqual(["Ben", "Mia"]);
  expect((await state(guest)).seed).toBe((await state(page)).seed);

  // Gastgeber fällt einen Baum → beim Gast ist er ein Stumpf
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
  await expect.poll(async () => (await state(page)).stumpList.length, { timeout: 15_000 }).toBe(2);

  // Gastgeber geht → Hinweis beim Gast
  await page.close();
  await expect(guest.getByRole("alert")).toContainText("Der Gastgeber hat die Welt verlassen", {
    timeout: 15_000,
  });
  await expect.poll(async () => (await state(guest)).mode).toBe("solo");
  await expectNoErrors(errors);
  await expectNoErrors(errors2);
  await ctx2.close();
});
