import { expect, test, type Page } from "@playwright/test";
import { expectNoErrors, isMobile, trackErrors } from "./helpers.ts";

interface PPState {
  x: number;
  y: number;
  speed: number;
  heading: number;
  onGround: boolean;
  throttle: number;
  camera: string;
  aircraft: string;
  airline: string;
  modelAirline: string;
  modelAircraft: string;
  throttleInput: number;
  pitchInput: number;
  paused: boolean;
}

const AIRCRAFT = ["A320", "A321", "A340", "A380"];
const AIRLINES = [
  "Lufthansa",
  "Emirates",
  "Eurowings",
  "Condor",
  "British Airways",
  "La Compagnie",
  "US Airways",
];

const screen = (page: Page) =>
  page.evaluate(() => (window.__dampf as { screen(): string }).screen());
const state = (page: Page) => page.evaluate(() => (window.__dampf as { state(): PPState }).state());

async function open(page: Page) {
  await page.goto("/games/pilot-pro/?e2e");
  await expect.poll(() => page.evaluate(() => !!window.__dampf), { timeout: 30_000 }).toBe(true);
  await expect.poll(() => screen(page)).toBe("menu");
}

/** Echte Touch-Wischgeste (CDP) von (x0,y0) nach (x1,y1); hält am Ende `holdMs`. */
async function drag(page: Page, x0: number, y0: number, x1: number, y1: number, holdMs = 0) {
  const cdp = await page.context().newCDPSession(page);
  const t = (type: string, x?: number, y?: number) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: x === undefined ? [] : [{ x, y: y! }],
    });
  await t("touchStart", x0, y0);
  for (let i = 1; i <= 8; i++)
    await t("touchMove", x0 + ((x1 - x0) * i) / 8, y0 + ((y1 - y0) * i) / 8);
  if (holdMs) await page.waitForTimeout(holdMs);
  return () => t("touchEnd");
}

declare global {
  interface Window {
    __dampf?: unknown;
  }
}

/** Kleines Ersatz-Kachelbild (grau, 1×1 px) – Tests laden nie echte OpenStreetMap-Kacheln */
const TILE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN89+7dfwAJYwPZo3OEXQAAAABJRU5ErkJggg==",
  "base64",
);
type Tiles = { urls: string[]; active: number; maxActive: number; fail: boolean };
async function stubTiles(page: Page, fail = false): Promise<Tiles> {
  const t: Tiles = { urls: [], active: 0, maxActive: 0, fail };
  await page.route("https://tile.openstreetmap.org/**", async (route) => {
    t.urls.push(route.request().url());
    t.active++;
    t.maxActive = Math.max(t.maxActive, t.active);
    await new Promise((r) => setTimeout(r, 30));
    t.active--;
    if (t.fail) return route.abort("internetdisconnected");
    return route.fulfill({ status: 200, contentType: "image/png", body: TILE_PNG });
  });
  return t;
}
// alle Pilot-Pro-Tests: Kacheln nie von den echten Servern holen
test.beforeEach(async ({ page }) => {
  await stubTiles(page);
});

test.describe("Katalog im Browser", () => {
  // Kleines Fenster: das Software-Rendering im Testcontainer ist sonst sehr langsam.
  test.use({ viewport: { width: 420, height: 720 } });

  test("PP-AK-01: alle 28 Kombinationen bauen ein Modell mit Airline-Namen", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "einmal reicht");
    test.setTimeout(300_000);
    const errors = trackErrors(page);
    await open(page);
    for (const a of AIRCRAFT) {
      await page
        .getByRole("group", { name: "Flugzeug" })
        .getByRole("button", { name: a, exact: true })
        .click();
      for (const l of AIRLINES) {
        await page
          .getByRole("group", { name: "Airline" })
          .getByRole("button", { name: l, exact: true })
          .click();
        const s = await state(page);
        expect([s.modelAircraft, s.modelAirline]).toEqual([a, l]);
      }
    }
    await expectNoErrors(errors);
  });
});

test("PP-AK-11: Desktop – abheben, Kamera wechseln, Menü", async ({ page }) => {
  test.skip(isMobile(page), "nur Desktop");
  test.setTimeout(180_000);
  const errors = trackErrors(page);
  await open(page);
  await page.getByRole("button", { name: "Abheben!" }).click();
  await expect.poll(() => screen(page)).toBe("flight");

  const s0 = await state(page);
  expect(s0.onGround).toBe(true);
  expect(s0.speed).toBe(0);
  expect(Math.round(s0.heading)).toBe(233);

  await page.keyboard.down("PageUp");
  await expect
    .poll(async () => (await state(page)).throttle, { timeout: 30_000 })
    .toBeGreaterThanOrEqual(1);
  await page.keyboard.up("PageUp");
  await expect.poll(async () => (await state(page)).speed, { timeout: 90_000 }).toBeGreaterThan(80);

  await page.keyboard.down("ArrowDown");
  await expect.poll(async () => (await state(page)).y, { timeout: 60_000 }).toBeGreaterThan(10);
  await page.keyboard.up("ArrowDown");
  expect((await state(page)).onGround).toBe(false);

  await page.keyboard.press("c");
  expect((await state(page)).camera).toBe("cockpit");
  await page.keyboard.press("c");
  expect((await state(page)).camera).toBe("chase");

  await page.keyboard.press("Escape");
  await expect.poll(() => screen(page)).toBe("menu");
  await expect(page.getByRole("button", { name: "Abheben!" })).toBeVisible();
  await expectNoErrors(errors);
});

test("PP-AK-12: Mobile – Bedienelemente sichtbar und bedienbar", async ({ page }) => {
  test.skip(!isMobile(page), "nur Mobile");
  test.setTimeout(120_000);
  const errors = trackErrors(page);
  await open(page);
  await page.getByRole("button", { name: "Abheben!" }).tap();
  await expect.poll(() => screen(page)).toBe("flight");

  const vp = page.viewportSize()!;
  const controls = [
    page.getByRole("slider", { name: "Steuerknüppel" }),
    page.getByRole("slider", { name: "Schubhebel" }),
    page.getByRole("button", { name: "Kamera" }),
    page.getByRole("button", { name: "Bremse" }),
    page.getByRole("button", { name: "Menü" }),
  ];
  for (const c of controls) {
    await expect(c).toBeVisible();
    const b = (await c.boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.y).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(vp.width + 0.5);
    expect(b.y + b.height).toBeLessThanOrEqual(vp.height + 0.5);
  }
  const stick = (await controls[0]!.boundingBox())!;
  expect(stick.width).toBeGreaterThanOrEqual(120);

  // Schubhebel ganz nach oben schieben
  const thr = (await controls[1]!.boundingBox())!;
  const end = await drag(
    page,
    thr.x + thr.width / 2,
    thr.y + thr.height - 8,
    thr.x + thr.width / 2,
    thr.y + 2,
  );
  await end();
  await expect.poll(async () => (await state(page)).throttleInput).toBeGreaterThan(0.9);
  const v0 = (await state(page)).speed;
  await expect
    .poll(async () => (await state(page)).speed, { timeout: 30_000 })
    .toBeGreaterThan(v0 + 5);

  // Joystick nach unten ziehen = Nase hoch
  const cx = stick.x + stick.width / 2;
  const cy = stick.y + stick.height / 2;
  const release = await drag(page, cx, cy, cx, cy + stick.height / 2, 300);
  expect((await state(page)).pitchInput).toBeGreaterThan(0.8);
  await release();
  await expect.poll(async () => (await state(page)).pitchInput).toBe(0);

  await controls[2]!.tap();
  expect((await state(page)).camera).toBe("cockpit");
  await expectNoErrors(errors);
});

test("PP-AK-13: Fokusverlust pausiert den Flug", async ({ page }) => {
  test.setTimeout(90_000);
  await open(page);
  await page.getByRole("button", { name: "Abheben!" }).click();
  await expect.poll(() => screen(page)).toBe("flight");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect.poll(() => screen(page)).toBe("paused");
  const x = (await state(page)).x;
  await page.waitForTimeout(500);
  expect((await state(page)).x).toBe(x);
  await page.getByRole("button", { name: /Weiterfliegen/ }).click();
  await expect.poll(() => screen(page)).toBe("flight");
});

interface MapState {
  mode: "tiles" | "drawn";
  loaded: number;
  failed: number;
  maxLoading: number;
  bigOpen: boolean;
  bigZoom: number;
}
const mapState = (page: Page) => page.evaluate(() => (window.__dampf as { map(): MapState }).map());

test("PP-AK-15: Live-Karte lädt Kacheln rund um die Position, mit Namensnennung", async ({
  page,
}) => {
  const errors = trackErrors(page);
  await page.unrouteAll();
  const tiles = await stubTiles(page);
  await open(page);
  await expect(
    page.getByText(
      "Die Karte kommt von OpenStreetMap – dabei sieht deren Server deine Internet-Adresse.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Abheben!" }).click();
  await expect.poll(() => screen(page)).toBe("flight");
  await expect.poll(async () => (await mapState(page)).mode).toBe("tiles");
  // Düsseldorf liegt bei Zoom 11 in Kachel 1062/682
  expect(tiles.urls.some((u) => /\/11\/106[12]\/68[23]\.png$/.test(u))).toBe(true);
  expect(tiles.urls.every((u) => u.startsWith("https://tile.openstreetmap.org/11/"))).toBe(true);
  expect(tiles.maxActive).toBeLessThanOrEqual(4);
  expect((await mapState(page)).maxLoading).toBeLessThanOrEqual(4);
  const credit = page.getByRole("link", { name: "© OpenStreetMap-Mitwirkende" }).first();
  await expect(credit).toBeVisible();
  await expect(credit).toHaveAttribute("href", "https://www.openstreetmap.org/copyright");
  await expectNoErrors(errors);
});

test("PP-AK-16: große Karte – pausiert, zoomt, schließt", async ({ page }) => {
  const errors = trackErrors(page);
  await open(page);
  await page.getByRole("button", { name: "Abheben!" }).click();
  await expect.poll(() => screen(page)).toBe("flight");
  const tap = (l: ReturnType<Page["getByRole"]>) => (isMobile(page) ? l.tap() : l.click());
  await tap(page.getByRole("button", { name: "Karte" }));
  const dlg = page.getByRole("dialog", { name: "Große Karte" });
  await expect(dlg).toBeVisible();
  await expect.poll(async () => (await mapState(page)).bigOpen).toBe(true);
  expect((await state(page)).paused).toBe(true);
  await expect(dlg.getByRole("link", { name: "© OpenStreetMap-Mitwirkende" })).toBeVisible();
  const z = (await mapState(page)).bigZoom;
  await tap(dlg.getByRole("button", { name: "Näher heran" }));
  expect((await mapState(page)).bigZoom).toBe(z + 1);
  await tap(dlg.getByRole("button", { name: "Weiter weg" }));
  await tap(dlg.getByRole("button", { name: "Weiter weg" }));
  expect((await mapState(page)).bigZoom).toBe(z - 1);
  await tap(dlg.getByRole("button", { name: "Schließen" }));
  await expect(dlg).toBeHidden();
  await expect.poll(async () => (await state(page)).paused).toBe(false);
  expect(await screen(page)).toBe("flight");
  await expectNoErrors(errors);
});

test("PP-AK-17: ohne Kacheln bleibt die gezeichnete Karte", async ({ page }) => {
  test.skip(isMobile(page), "einmal reicht");
  const pageErrors: string[] = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
  await page.unrouteAll();
  const tiles = await stubTiles(page, true);
  await open(page);
  await page.getByRole("button", { name: "Abheben!" }).click();
  await expect.poll(() => screen(page)).toBe("flight");
  await expect.poll(async () => (await mapState(page)).failed).toBeGreaterThan(0);
  expect((await mapState(page)).mode).toBe("drawn");
  expect(tiles.urls.length).toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: "Karte" })).toBeVisible();
  expect(pageErrors).toEqual([]);
});
