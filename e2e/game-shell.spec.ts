import { expect, test } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { loadManifests } from "../packages/game-kit/src/node.ts";

const games = loadManifests(fileURLToPath(new URL("../games/", import.meta.url)));
const INSET = 40;

test.describe("Spiel-Rahmen", () => {
  for (const game of games) {
    test(`MANIFEST-AK-08: ${game.slug} hält den sicheren Bereich frei`, async ({ page }) => {
      // env(safe-area-inset-*) lässt sich in Chromium nicht setzen; der Rahmen liest die Werte
      // über CSS-Variablen mit env() als Standard, die wir hier simulieren.
      await page.addInitScript((inset) => {
        document.addEventListener("DOMContentLoaded", () => {
          document.documentElement.style.setProperty("--dampf-safe-top", `${inset}px`);
          document.documentElement.style.setProperty("--dampf-safe-bottom", `${inset}px`);
        });
      }, INSET);
      await page.goto(`/games/${game.slug}/`);
      const canvas = page.locator("#game > canvas").first();
      await expect(canvas).toBeVisible();
      // das Spiel passt sich nach dem Laden an die Größe an – unter Last etwas später
      const vh = page.viewportSize()!.height;
      await expect
        .poll(async () => {
          const box = (await canvas.boundingBox())!;
          return box.y + box.height;
        })
        .toBeLessThanOrEqual(vh - INSET + 0.5);
      const back = (await page.getByRole("link", { name: /Alle Spiele/ }).boundingBox())!;
      expect(back.y).toBeGreaterThanOrEqual(INSET - 0.5);
    });
  }
});

test.describe("Kein Zoom", () => {
  for (const game of games) {
    test(`MANIFEST-AK-09: ${game.slug} – kein Doppeltipp- und Gesten-Zoom`, async ({ page }) => {
      await page.goto(`/games/${game.slug}/`);
      await expect(page.locator("#game > canvas").first()).toBeVisible();
      const r = await page.evaluate(() => {
        const ev = new Event("gesturestart", { cancelable: true });
        document.dispatchEvent(ev);
        return {
          html: getComputedStyle(document.documentElement).touchAction,
          body: getComputedStyle(document.body).touchAction,
          gesture: ev.defaultPrevented,
        };
      });
      expect(r.body).toBe("manipulation");
      expect(r.html).toBe("manipulation");
      expect(r.gesture).toBe(true);
    });
  }

  test("MANIFEST-AK-09: Doppeltipp auf einen Button – kein Zoom, aber beide Klicks kommen an", async ({
    page,
  }) => {
    test.skip((page.viewportSize()?.width ?? 1000) >= 600, "nur Mobile (Touch)");
    await page.goto("/games/waldlager/?e2e&relay=");
    await page.getByRole("button", { name: "Los geht's" }).tap();
    const btn = page.getByRole("button", { name: "Essen" });
    await expect(btn).toBeVisible();
    await page.evaluate(() => {
      const w = window as unknown as { clicks: number; ends: { t: number; p: boolean }[] };
      w.clicks = 0;
      w.ends = [];
      document.querySelector('[data-b="eat"]')!.addEventListener("click", () => (w.clicks += 1));
      window.addEventListener("touchend", (e) =>
        w.ends.push({ t: e.timeStamp, p: e.defaultPrevented }),
      );
    });
    const b = (await btn.boundingBox())!;
    const pt = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    const cdp = await page.context().newCDPSession(page);
    type W = { clicks: number; ends: { t: number; p: boolean }[] };
    // Unter Last können zwei simulierte Tipps weiter als 350 ms auseinanderliegen; dann zählt es
    // nicht als Doppeltipp. Deshalb bis zu 8 Versuche, bis ein echter Doppeltipp gelingt.
    let checked = false;
    for (let attempt = 0; attempt < 8 && !checked; attempt++) {
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        const w = window as unknown as W;
        w.clicks = 0;
        w.ends = [];
      });
      // alle vier Ereignisse ohne Warten dazwischen abschicken (kommen in Reihenfolge an),
      // damit die beiden Tipps auch unter Last dicht beieinander liegen
      const touch = (type: "touchStart" | "touchEnd") =>
        cdp.send("Input.dispatchTouchEvent", {
          type,
          touchPoints: type === "touchStart" ? [pt] : [],
        });
      await Promise.all([
        touch("touchStart"),
        touch("touchEnd"),
        touch("touchStart"),
        touch("touchEnd"),
      ]);
      await expect.poll(() => page.evaluate(() => (window as unknown as W).clicks)).toBe(2);
      const ends = await page.evaluate(() => (window as unknown as W).ends);
      expect(ends).toHaveLength(2);
      if (ends[1]!.t - ends[0]!.t >= 300) continue;
      expect(ends.map((e) => e.p)).toEqual([false, true]);
      checked = true;
    }
    expect(checked).toBe(true);
  });

  test("MANIFEST-AK-09: die Startseite bleibt zoombar", async ({ page }) => {
    await page.goto("/");
    const r = await page.evaluate(() => {
      const ev = new Event("gesturestart", { cancelable: true });
      document.dispatchEvent(ev);
      return { body: getComputedStyle(document.body).touchAction, gesture: ev.defaultPrevented };
    });
    expect(r.body).toBe("auto");
    expect(r.gesture).toBe(false);
  });
});

test.describe("Version im Spiel", () => {
  for (const game of games) {
    test(`MANIFEST-AK-11: ${game.slug} zeigt die Version in der oberen Leiste`, async ({
      page,
    }) => {
      await page.goto(`/games/${game.slug}/?relay=`);
      await expect(page.locator(".dampf-bar")).toContainText(`v${game.version}`);
    });
  }
});
