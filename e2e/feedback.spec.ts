import { expect, test, type Page, type Route } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { loadManifests } from "../packages/game-kit/src/node.ts";
import { FEEDBACK_ADMIN_TOKEN_E2E, RELAY_PORT } from "../playwright.config.ts";
import { isMobile } from "./helpers.ts";

/** Spec 004: Feedback-Knopf und -Formular in allen Spielen und auf der Startseite */
const games = loadManifests(fileURLToPath(new URL("../games/", import.meta.url)));
/** Diese Adresse steht im Build (.env.production); Tests leiten sie immer um. */
const PROD_URL = "https://dampf.dw-a6b.workers.dev/feedback";
const LOCAL = `http://localhost:${RELAY_PORT}`;
const local = !process.env.DAMPF_URL;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

type Sent = Record<string, unknown> & { device: Record<string, unknown> };

/** Fängt Feedback-Anfragen ab; ohne Handler wird mit 201 geantwortet (nichts geht nach Production) */
async function intercept(page: Page, handler?: (route: Route) => Promise<void>) {
  const sent: Sent[] = [];
  await page.route(PROD_URL, async (route) => {
    const req = route.request();
    if (req.method() === "POST") sent.push(JSON.parse(req.postData() ?? "{}") as Sent);
    if (handler) return handler(route);
    return route.fulfill({
      status: req.method() === "POST" ? 201 : 204,
      headers: { ...CORS, "Content-Type": "application/json" },
      body: req.method() === "POST" ? '{"id":"fb_test0000"}' : "",
    });
  });
  return sent;
}

/** Leitet an den lokalen Server weiter, mit eigenem Absender je Test (Rate-Limit) */
const toLocalServer = (sender: string) => async (route: Route) => {
  const req = route.request();
  const res = await route.fetch({
    url: `${LOCAL}/feedback`,
    headers: { ...req.headers(), "x-forwarded-for": sender },
  });
  await route.fulfill({ response: res });
};

async function openForm(page: Page) {
  await page.getByRole("button", { name: "Feedback geben" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

const uid = () => Math.random().toString(36).slice(2, 10);

test.describe("Feedback in Spielen", () => {
  for (const game of games) {
    test(`FEEDBACK-AK-13: ${game.slug} – Knopf in der Leiste öffnet das Formular`, async ({
      page,
    }) => {
      await intercept(page);
      await page.goto(`/games/${game.slug}/`);
      const bar = page.locator("header.dampf-bar");
      await expect(bar.getByRole("button", { name: "Feedback geben" })).toBeVisible();
      const dialog = await openForm(page);
      await expect(
        dialog.getByRole("heading", { name: `Sag uns deine Meinung zu ${game.title}!` }),
      ).toBeVisible();
      await expect(dialog.getByText("Schreib bitte keinen Namen")).toBeVisible();
      await expect(dialog.getByText("Wir speichern nur deinen Text")).toBeVisible();
      await expect(dialog.getByLabel("Deine Nachricht")).toBeFocused();
      await expect(dialog.getByText("0 / 500")).toBeVisible();
      await dialog.getByRole("button", { name: "Abbrechen" }).click();
      await expect(dialog).toBeHidden();
    });

    test(`FEEDBACK-AK-18: ${game.slug} – Knopf und Formular passen aufs Handy`, async ({
      page,
    }) => {
      test.skip(!isMobile(page), "nur Mobile");
      await intercept(page);
      await page.goto(`/games/${game.slug}/`);
      const vw = page.viewportSize()!.width;
      const vh = page.viewportSize()!.height;
      const btn = page.getByRole("button", { name: "Feedback geben" });
      const b = (await btn.boundingBox())!;
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(vw);
      const dialog = await openForm(page);
      const d = (await dialog.boundingBox())!;
      expect(d.x).toBeGreaterThanOrEqual(0);
      expect(d.x + d.width).toBeLessThanOrEqual(vw);
      expect(d.y + d.height).toBeLessThanOrEqual(vh);
      for (const name of ["Abschicken", "Abbrechen"]) {
        const box = (await dialog.getByRole("button", { name }).boundingBox())!;
        expect(box.y + box.height).toBeLessThanOrEqual(vh);
      }
      const scroll = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(scroll).toBeLessThanOrEqual(0);
      await dialog.getByLabel("Deine Nachricht").fill("Auf dem Handy getippt");
      await dialog.getByRole("button", { name: "Abschicken" }).tap();
      await expect(page.getByText("Danke! Deine Nachricht ist angekommen. 🎉")).toBeVisible();
    });
  }

  test("FEEDBACK-AK-14: Abschicken landet beim lokalen Server", async ({ page, request }) => {
    test.skip(!local, "braucht den lokalen Server");
    const game = games.find((g) => g.slug === "waldlager")!;
    const text = `E2E-Test ${uid()}: Bitte bunte Zelte`;
    const sent = await intercept(page, toLocalServer(`e2e-${uid()}`));
    await page.goto(`/games/${game.slug}/`);
    const dialog = await openForm(page);
    await dialog.getByLabel("Deine Nachricht").fill(text);
    await expect(dialog.getByText(`${text.length} / 500`)).toBeVisible();
    await dialog.getByRole("button", { name: "Abschicken" }).click();
    await expect(dialog.getByText("Danke! Deine Nachricht ist angekommen. 🎉")).toBeVisible();
    // schließt nach 3 Sekunden von selbst
    await expect(dialog).toBeHidden({ timeout: 6000 });

    expect(sent).toHaveLength(1);
    const body = sent[0]!;
    expect(body).toMatchObject({ game: "waldlager", gameVersion: game.version, text });
    expect(Object.keys(body.device).sort()).toEqual([
      "browser",
      "mobile",
      "os",
      "touch",
      "viewport",
    ]);
    expect(String(body.device.viewport)).toMatch(/^\d+00x\d+00$|^0x\d+00$|^\d+00x0$/);

    const res = await request.get(`${LOCAL}/feedback?game=waldlager&status=neu&limit=200`, {
      headers: { Authorization: `Bearer ${FEEDBACK_ADMIN_TOKEN_E2E}` },
    });
    expect(res.status()).toBe(200);
    const list = (await res.json()) as { text: string; gameVersion: string; status: string }[];
    expect(list.find((e) => e.text === text)).toMatchObject({
      gameVersion: game.version,
      status: "neu",
    });
  });

  test("FEEDBACK-AK-15: zu kurz geht nicht, mehr als 500 Zeichen auch nicht", async ({ page }) => {
    const sent = await intercept(page);
    await page.goto("/games/snake/");
    const dialog = await openForm(page);
    const box = dialog.getByLabel("Deine Nachricht");
    await box.fill("  ab ");
    await dialog.getByRole("button", { name: "Abschicken" }).click();
    await expect(dialog.getByText("Schreib noch ein bisschen mehr.")).toBeVisible();
    expect(sent).toHaveLength(0);
    await box.fill("x".repeat(600));
    expect((await box.inputValue()).length).toBe(500);
    await expect(dialog.getByText("500 / 500")).toBeVisible();
  });

  test("FEEDBACK-AK-16: Fehler und zu viele Nachrichten", async ({ page }) => {
    let mode: "down" | "429" = "down";
    await intercept(page, (route) =>
      mode === "down"
        ? route.abort("internetdisconnected")
        : route.fulfill({
            status: route.request().method() === "POST" ? 429 : 204,
            headers: CORS,
            body: route.request().method() === "POST" ? '{"error":"rate-limit"}' : "",
          }),
    );
    await page.goto("/games/kasse/");
    const dialog = await openForm(page);
    const box = dialog.getByLabel("Deine Nachricht");
    await box.fill("Der Scanner piept nicht");
    await dialog.getByRole("button", { name: "Abschicken" }).click();
    await expect(
      dialog.getByText("Das hat gerade nicht geklappt. Versuch es später noch mal."),
    ).toBeVisible();
    await expect(box).toHaveValue("Der Scanner piept nicht");
    mode = "429";
    await dialog.getByRole("button", { name: "Abschicken" }).click();
    await expect(dialog.getByText("Du hast schon viel geschrieben")).toBeVisible();
    await expect(box).toHaveValue("Der Scanner piept nicht");
  });

  test("FEEDBACK-AK-17: Tasten gehen nicht ans Spiel, Spiel bekommt blur, Esc schließt", async ({
    page,
  }) => {
    test.skip(isMobile(page), "nur Desktop (Tastatur)");
    await intercept(page);
    await page.goto("/games/snake/");
    await expect(page.locator("#game > canvas").first()).toBeVisible();
    await page.evaluate(() => {
      const w = window as unknown as { keys: number; blurs: number; focuses: number };
      w.keys = 0;
      w.blurs = 0;
      w.focuses = 0;
      window.addEventListener("keydown", () => (w.keys += 1));
      window.addEventListener("blur", () => (w.blurs += 1));
      window.addEventListener("focus", () => (w.focuses += 1));
    });
    const dialog = await openForm(page);
    const box = dialog.getByLabel("Deine Nachricht");
    await box.pressSequentially("wasd ");
    await expect(box).toHaveValue("wasd ");
    type W = { keys: number; blurs: number; focuses: number };
    expect(await page.evaluate(() => (window as unknown as W).keys)).toBe(0);
    expect(await page.evaluate(() => (window as unknown as W).blurs)).toBeGreaterThanOrEqual(1);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    expect(await page.evaluate(() => (window as unknown as W).focuses)).toBeGreaterThanOrEqual(1);
    // danach kommen Tasten wieder an
    await page.keyboard.press("ArrowUp");
    expect(await page.evaluate(() => (window as unknown as W).keys)).toBe(1);
  });
});

test.describe("Feedback auf der Startseite", () => {
  test("FEEDBACK-AK-20: Knopf im Kopf sendet game = portal ohne Version", async ({ page }) => {
    const sent = await intercept(page);
    await page.goto("/");
    const btn = page.locator("header").getByRole("button", { name: "Feedback geben" });
    await expect(btn).toBeVisible();
    const dialog = await openForm(page);
    await expect(
      dialog.getByRole("heading", { name: "Sag uns deine Meinung zu Dampf!" }),
    ).toBeVisible();
    await dialog.getByLabel("Deine Nachricht").fill("Mehr Spiele mit Tieren bitte");
    await dialog.getByRole("button", { name: "Abschicken" }).click();
    await expect(dialog.getByText("Danke! Deine Nachricht ist angekommen. 🎉")).toBeVisible();
    await dialog.getByRole("button", { name: "OK" }).click();
    await expect(dialog).toBeHidden();
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      game: "portal",
      gameVersion: null,
      text: "Mehr Spiele mit Tieren bitte",
    });
    if (isMobile(page)) {
      const scroll = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(scroll).toBeLessThanOrEqual(0);
    }
  });

  test.describe("ohne JavaScript", () => {
    test.use({ javaScriptEnabled: false });
    test("FEEDBACK-AK-20: kein Knopf, Liste trotzdem da", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("[data-testid=games] > li").first()).toBeVisible();
      await expect(page.getByRole("button", { name: "Feedback geben" })).toHaveCount(0);
    });
  });
});
