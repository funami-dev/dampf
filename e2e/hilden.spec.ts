import { expect, test, type Page } from "@playwright/test";
import { expectNoErrors, isMobile, trackErrors } from "./helpers.ts";

interface HiState {
  x: number;
  z: number;
  inside: boolean;
  house: number | null;
  stars: Record<string, number>;
  task: {
    job: string;
    index: number;
    steps: number;
    target: [number, number];
    kind: string;
  } | null;
  action: string | null;
  paused: boolean;
  overlay: string | null;
  houses: { id: number; door: [number, number] }[];
  jobBoard: [number, number];
}

const state = (page: Page) => page.evaluate(() => (window.__dampf as { state(): HiState }).state());
const teleport = (page: Page, [x, z]: [number, number]) =>
  page.evaluate(
    ([x, z]) => (window.__dampf as { teleport(x: number, z: number): void }).teleport(x, z),
    [x, z],
  );

async function open(page: Page) {
  await page.goto("/games/hilden/?e2e");
  await expect.poll(() => page.evaluate(() => !!window.__dampf), { timeout: 60_000 }).toBe(true);
}

declare global {
  interface Window {
    __dampf?: unknown;
  }
}

test("HI-AK-10: Haus wählen, betreten, verlassen, Postboten-Aufgabe, Speichern", async ({
  page,
}) => {
  test.skip(isMobile(page), "nur Desktop");
  test.setTimeout(240_000);
  const errors = trackErrors(page);
  await open(page);
  const s0 = await state(page);
  expect(s0.house).toBeNull();
  expect(s0.houses).toHaveLength(3);

  // Laufen per Tastatur
  await page.keyboard.down("KeyW");
  await expect
    .poll(async () => Math.hypot((await state(page)).x - s0.x, (await state(page)).z - s0.z))
    .toBeGreaterThan(1);
  await page.keyboard.up("KeyW");

  // Haus 2 wählen und betreten
  await teleport(page, s0.houses[1]!.door);
  await expect.poll(async () => (await state(page)).action).toBe("Haus 2 wählen");
  await page.keyboard.press("e");
  await expect.poll(async () => (await state(page)).house).toBe(2);
  await expect.poll(async () => (await state(page)).action).toBe("Reingehen");
  await page.keyboard.press("e");
  await expect.poll(async () => (await state(page)).inside).toBe(true);
  await expect.poll(async () => (await state(page)).action).toBe("Rausgehen");
  await page.keyboard.press("e");
  await expect.poll(async () => (await state(page)).inside).toBe(false);
  const out = await state(page);
  expect(Math.hypot(out.x - s0.houses[1]!.door[0], out.z - s0.houses[1]!.door[1])).toBeLessThan(1);

  // Postbote
  await teleport(page, s0.jobBoard);
  await expect.poll(async () => (await state(page)).action).toBe("Jobbrett");
  await page.keyboard.press("e");
  await expect.poll(async () => (await state(page)).overlay).toBe("Jobbrett");
  await page.getByRole("button", { name: /^Postbote/ }).click();
  await expect.poll(async () => (await state(page)).task?.job).toBe("post");
  for (let i = 0; i < 4; i++) {
    const t = (await state(page)).task!;
    expect(t.index).toBe(i);
    await teleport(page, t.target);
    await expect.poll(async () => (await state(page)).action).toBe("Benutzen");
    await page.keyboard.press("e");
    await expect.poll(async () => (await state(page)).task?.index ?? 4).toBe(i + 1);
  }
  await expect.poll(async () => (await state(page)).stars.post).toBe(1);
  expect((await state(page)).task).toBeNull();

  // Karte öffnen und schließen
  await page.keyboard.press("m");
  await expect.poll(async () => (await state(page)).overlay).toBe("Karte");
  await page.keyboard.press("Escape");
  await expect.poll(async () => (await state(page)).overlay).toBeNull();

  // Speicherung übersteht Neuladen; Start vor der eigenen Haustür
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!window.__dampf), { timeout: 60_000 }).toBe(true);
  const s1 = await state(page);
  expect(s1.house).toBe(2);
  expect(s1.stars.post).toBe(1);
  expect([s1.x, s1.z]).toEqual(s0.houses[1]!.door);
  await expectNoErrors(errors);
});

test("HI-AK-11: Mobile – Bedienelemente sichtbar, Joystick bewegt Matti", async ({ page }) => {
  test.skip(!isMobile(page), "nur Mobile");
  test.setTimeout(120_000);
  const errors = trackErrors(page);
  await open(page);
  const vp = page.viewportSize()!;
  const stick = page.getByRole("slider", { name: "Laufen" });
  for (const el of [
    stick,
    page.getByRole("button", { name: "Karte" }),
    page.getByRole("button", { name: "Menü" }),
  ]) {
    await expect(el).toBeVisible();
    const b = (await el.boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.y + b.height).toBeLessThanOrEqual(vp.height + 0.5);
    expect(b.x + b.width).toBeLessThanOrEqual(vp.width + 0.5);
  }

  const s0 = await state(page);
  const b = (await stick.boundingBox())!;
  const cdp = await page.context().newCDPSession(page);
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: cx, y: cy }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: cx, y: cy - 40 }],
  });
  await expect
    .poll(async () => Math.hypot((await state(page)).x - s0.x, (await state(page)).z - s0.z))
    .toBeGreaterThan(1);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

  // „Benutzen“ erscheint am Jobbrett, liegt im Bild und öffnet es
  await teleport(page, s0.jobBoard);
  const use = page.getByRole("button", { name: "Jobbrett" });
  await expect(use).toBeVisible();
  const ub = (await use.boundingBox())!;
  expect(ub.y + ub.height).toBeLessThanOrEqual(vp.height + 0.5);
  await use.tap();
  await expect.poll(async () => (await state(page)).overlay).toBe("Jobbrett");
  await expectNoErrors(errors);
});

test("HI-AK-12: Fokusverlust pausiert", async ({ page }) => {
  test.setTimeout(90_000);
  await open(page);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect.poll(async () => (await state(page)).paused).toBe(true);
  await page.getByRole("button", { name: "Weiterspielen" }).click();
  await expect.poll(async () => (await state(page)).paused).toBe(false);
});
