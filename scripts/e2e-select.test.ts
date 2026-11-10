import { describe, expect, it } from "vitest";
import { selectE2E } from "./e2e-select.ts";

const slugs = ["waldlager", "snake", "pilot-pro"];

describe("BUILD-AK-15: Auswahl der E2E-Tests", () => {
  it("nur ein Spiel → dessen Tests (+ Smoke)", () => {
    expect(
      selectE2E(["games/waldlager/src/main.ts", "games/waldlager/game.json"], slugs),
    ).toMatchObject({ full: false, specs: ["e2e/portal.spec.ts", "e2e/waldlager.spec.ts"] });
    expect(selectE2E(["games/waldlager/src/main.ts"], slugs).specs).toEqual([
      "e2e/waldlager.spec.ts",
    ]);
    expect(
      selectE2E(["games/snake/src/x.ts", "e2e/pilot-pro.spec.ts", "specs/games/snake.md"], slugs)
        .specs,
    ).toEqual(["e2e/pilot-pro.spec.ts", "e2e/snake.spec.ts"]);
  });
  it("nur Doku → nur Smoke", () => {
    expect(selectE2E(["specs/003-portal.md", "CLAUDE.md"], slugs)).toMatchObject({
      full: false,
      specs: [],
    });
    expect(selectE2E([], slugs)).toMatchObject({ full: false, specs: [] });
  });
  it("gemeinsamer Code oder Unbekanntes → alles", () => {
    for (const f of [
      "packages/game-kit/src/shell.ts",
      "apps/portal/src/pages/index.astro",
      "services/relay/src/feedback.ts",
      "scripts/serve.ts",
      "playwright.config.ts",
      "package.json",
      "package-lock.json",
      "e2e/helpers.ts",
      "e2e/portal.spec.ts",
      "e2e/feedback.spec.ts",
      "games/neues-spiel/game.json",
      ".env.production",
      "vercel.json",
    ])
      expect(selectE2E(["games/snake/src/x.ts", f], slugs).full, f).toBe(true);
  });
});
