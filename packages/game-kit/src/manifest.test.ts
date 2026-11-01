import { describe, expect, it } from "vitest";
import { listedGames, parseManifest, type GameManifest } from "./manifest.ts";

const valid = {
  slug: "snake",
  title: "Snake",
  description: "Friss, wachse, beiß dich nicht selbst.",
  thumbnail: "thumbnail.png",
  controls: { keyboard: true, touch: true },
  status: "published",
  addedAt: "2026-11-01",
};

const game = (over: Partial<GameManifest>): GameManifest => ({
  ...(valid as GameManifest),
  ...over,
});

describe("Manifest-Schema", () => {
  it("MANIFEST-AK-01: gültiges Manifest wird akzeptiert", () => {
    expect(parseManifest(valid, "games/snake/game.json")).toMatchObject(valid);
    expect(parseManifest({ ...valid, order: 3 }, "x").order).toBe(3);
  });

  it.each([
    ["fehlender Titel", { title: undefined }, "title"],
    ["falscher Typ", { controls: "ja" }, "controls"],
    ["zu langer Titel", { title: "x".repeat(41) }, "title"],
    ["zu lange Beschreibung", { description: "x".repeat(161) }, "description"],
    ["ungültiger Slug", { slug: "Snake Game" }, "slug"],
    ["ungültiger Status", { status: "beta" }, "status"],
    ["ungültiges Datum", { addedAt: "1.11.2026" }, "addedAt"],
  ])("MANIFEST-AK-02: %s wird abgelehnt und Feld + Datei genannt", (_, patch, field) => {
    const file = "games/snake/game.json";
    expect(() => parseManifest({ ...valid, ...patch }, file)).toThrowError(
      new RegExp(`${file}.*${field}`, "s"),
    );
  });

  it("MANIFEST-AK-05: controls mit beiden Werten false wird abgelehnt", () => {
    expect(() =>
      parseManifest({ ...valid, controls: { keyboard: false, touch: false } }, "f.json"),
    ).toThrowError(/f\.json.*controls/s);
  });
});

describe("Liste der Startseite", () => {
  it("MANIFEST-AK-06 / PORTAL-AK-01: nur veröffentlichte Spiele werden gelistet", () => {
    const games = [game({ slug: "a" }), game({ slug: "b", status: "draft" })];
    expect(listedGames(games).map((g) => g.slug)).toEqual(["a"]);
  });

  it("PORTAL-AK-04: Sortierung nach order, dann title", () => {
    const games = [
      game({ slug: "c", title: "Zebra" }),
      game({ slug: "b", title: "Ameise" }),
      game({ slug: "a", title: "Mond", order: 1 }),
      game({ slug: "d", title: "Ähre", order: 5 }),
    ];
    expect(listedGames(games).map((g) => g.title)).toEqual(["Mond", "Ähre", "Ameise", "Zebra"]);
  });
});
