import { expect, test, type Page } from "@playwright/test";
import { expectNoErrors, isMobile, trackErrors } from "./helpers.ts";

interface KaItem {
  uid: string;
  name: string;
  facing: "toward" | "away";
  scanned: boolean;
  place: string;
}
interface KaState {
  screen: string;
  phase: string;
  customer: number;
  items: KaItem[];
  receipt: string[];
  total: number;
  totalText: string;
  canTotal: boolean;
  sumVisible: boolean;
  stats: { customers: number; items: number; revenue: number };
  selected: string | null;
  beltOffset: number;
}
interface Hooks {
  state(): KaState;
  screenPos(uid: string): [number, number] | null;
  scannerPos(): [number, number];
}

declare global {
  interface Window {
    __dampf?: unknown;
  }
}

const state = (page: Page) => page.evaluate(() => (window.__dampf as Hooks).state());

async function open(page: Page) {
  await page.goto("/games/kasse/?e2e");
  await expect.poll(() => page.evaluate(() => !!window.__dampf), { timeout: 60_000 }).toBe(true);
  await page.getByRole("button", { name: "Kasse öffnen" }).click();
  await expect.poll(async () => (await state(page)).screen).toBe("play");
}

/** Ware greifen und über den Scanner ziehen (Maus oder Touch). */
async function dragItem(page: Page, uid: string, touch: boolean) {
  const [x0, y0] = (await page.evaluate((u) => (window.__dampf as Hooks).screenPos(u), uid))!;
  const [x1, y1] = await page.evaluate(() => (window.__dampf as Hooks).scannerPos());
  if (touch) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: x0, y: y0 }],
    });
    for (let i = 1; i <= 8; i++) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: x0 + ((x1 - x0) * i) / 8, y: y0 + ((y1 - y0) * i) / 8 }],
      });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await cdp.detach();
  } else {
    await page.mouse.move(x0, y0);
    await page.mouse.down();
    await page.mouse.move(x1, y1, { steps: 8 });
    await page.mouse.up();
  }
}

/** Vorderste Ware auf dem Band über den Scanner ziehen. */
async function dragFrontItem(page: Page, touch: boolean) {
  const s = await state(page);
  const it = s.items.find((i) => !i.scanned && i.place === "belt");
  if (it) await dragItem(page, it.uid, touch);
  return it ?? null;
}

/** Alle Waren des Kunden scannen; zeigt der Barcode weg, wird gedreht. */
async function scanAll(page: Page, touch: boolean) {
  let turned = false;
  const deadline = Date.now() + 120_000;
  while (!(await state(page)).canTotal) {
    expect(Date.now()).toBeLessThan(deadline);
    const it = await dragFrontItem(page, touch);
    if (!it) {
      await page.waitForTimeout(300);
      continue;
    }
    const s = await state(page);
    const now = s.items.find((i) => i.uid === s.selected);
    if (now && !now.scanned) {
      // KA-AK-03: Barcode zeigt weg → kein Eintrag
      expect(now.facing).toBe("away");
      expect(s.receipt.length).toBe(s.items.filter((i) => i.scanned).length);
      if (touch) await page.getByRole("button", { name: "Drehen" }).tap();
      else await page.keyboard.press("r");
      await expect
        .poll(async () => (await state(page)).items.find((i) => i.uid === now.uid)!.facing)
        .toBe("toward");
      turned = true;
    }
  }
  return turned;
}

test("KA-AK-09: Desktop – Waren mit der Maus scannen, Summe, nächster Kunde", async ({ page }) => {
  test.skip(isMobile(page), "nur Desktop");
  test.setTimeout(240_000);
  const errors = trackErrors(page);
  await open(page);
  const first = await state(page);
  expect(first.customer).toBe(1);
  expect(first.sumVisible).toBe(false);

  await scanAll(page, false);
  const s = await state(page);
  expect(s.items.every((i) => i.scanned)).toBe(true);
  expect(s.receipt.length).toBe(s.items.length);
  expect(s.totalText).toMatch(/^\d+,\d\d €$/);
  await expect(page.getByRole("button", { name: "Summe", exact: true })).toBeVisible();

  // KA-AK-05: noch einmal darüberziehen berechnet nicht doppelt
  const total = s.total;
  await dragItem(page, s.items[0]!.uid, false);
  expect((await state(page)).total).toBe(total);
  expect((await state(page)).receipt.length).toBe(s.items.length);
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await state(page)).customer, { timeout: 30_000 }).toBe(2);
  const next = await state(page);
  expect(next.stats.customers).toBe(1);
  expect(next.stats.items).toBe(s.items.length);
  expect(next.stats.revenue).toBe(total);
  expect(next.receipt).toEqual([]);

  // KA-AK-08: Feierabend zeigt die Statistik
  await page.getByRole("button", { name: "Feierabend" }).click();
  await expect.poll(async () => (await state(page)).screen).toBe("summary");
  await expect(page.locator('[data-s="customers"]')).toHaveText("1");
  await expect(page.locator('[data-s="items"]')).toHaveText(String(s.items.length));
  await expectNoErrors(errors);
});

test("KA-AK-10: Mobile – Touch-Ziehen, Drehen, Summe, Feierabend", async ({ page }) => {
  test.skip(!isMobile(page), "nur Mobile");
  test.setTimeout(240_000);
  const errors = trackErrors(page);
  await open(page);
  const vp = page.viewportSize()!;
  const inside = async (name: string) => {
    const el = page.getByRole("button", { name, exact: true });
    await expect(el).toBeVisible();
    const b = (await el.boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.y).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(vp.width + 0.5);
    expect(b.y + b.height).toBeLessThanOrEqual(vp.height + 0.5);
  };
  await inside("Drehen");
  await inside("Feierabend");

  // Drehen per Button dreht die vorderste Ware
  await expect
    .poll(async () => (await state(page)).items.some((i) => i.place === "belt"))
    .toBe(true);
  const before = await state(page);
  await page.getByRole("button", { name: "Drehen" }).tap();
  const after = await state(page);
  const changed = after.items.find(
    (i) => i.facing !== before.items.find((b) => b.uid === i.uid)!.facing,
  );
  expect(changed).toBeTruthy();

  await scanAll(page, true);
  await inside("Summe");
  await page.getByRole("button", { name: "Summe", exact: true }).tap();
  await expect.poll(async () => (await state(page)).customer, { timeout: 30_000 }).toBe(2);
  await page.getByRole("button", { name: "Feierabend" }).tap();
  await expect.poll(async () => (await state(page)).screen).toBe("summary");
  await expectNoErrors(errors);
});

test("KA-AK-11: Fokusverlust pausiert, das Band steht still", async ({ page }) => {
  test.setTimeout(90_000);
  await open(page);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect.poll(async () => (await state(page)).screen).toBe("paused");
  const b = (await state(page)).beltOffset;
  await page.waitForTimeout(600);
  expect((await state(page)).beltOffset).toBe(b);
  await page.getByRole("button", { name: "Weiter kassieren" }).click();
  await expect.poll(async () => (await state(page)).screen).toBe("play");
  await expect.poll(async () => (await state(page)).beltOffset).toBeGreaterThan(b);
});
