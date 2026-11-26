import { describe, expect, it } from "vitest";
import {
  compareVersions,
  formatDate,
  newsDateTime,
  listedGames,
  newGames,
  newsEntries,
  parseManifest,
  type GameManifest,
} from "./manifest.ts";

const valid = {
  slug: "snake",
  title: "Snake",
  description: "Friss, wachse, beiß dich nicht selbst.",
  thumbnail: "thumbnail.png",
  controls: { keyboard: true, touch: true },
  status: "published",
  addedAt: "2026-11-01",
  version: "1.0.0",
  changelog: [{ version: "1.0.0", date: "2026-11-08", items: ["Erste Version"] }],
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

  it("PORTAL-AK-04: bei gleichem Datum nach order, dann title", () => {
    const games = [
      game({ slug: "c", title: "Zebra" }),
      game({ slug: "b", title: "Ameise" }),
      game({ slug: "a", title: "Mond", order: 1 }),
      game({ slug: "d", title: "Ähre", order: 5 }),
    ];
    expect(listedGames(games).map((g) => g.title)).toEqual(["Mond", "Ähre", "Ameise", "Zebra"]);
  });

  it("PORTAL-AK-04: das neueste Spiel zuerst; „Neu“ für die 3 neuesten bis 30 Tage", () => {
    const games = [
      game({ slug: "alt", title: "Alt", addedAt: "2026-10-01", order: 1 }),
      game({ slug: "mitte", title: "Mitte", addedAt: "2026-11-10" }),
      game({ slug: "neu", title: "Neu", addedAt: "2026-11-26", order: 99 }),
      game({ slug: "neu2", title: "Neu zwei", addedAt: "2026-11-20" }),
    ];
    const list = listedGames(games);
    expect(list.map((g) => g.slug)).toEqual(["neu", "neu2", "mitte", "alt"]);
    expect([...newGames(list, "2026-11-27")]).toEqual(["neu", "neu2", "mitte"]);
    // nach 30 Tagen nicht mehr neu
    expect([...newGames(list, "2026-12-15")]).toEqual(["neu", "neu2"]);
    expect([...newGames(list, "2027-02-01")]).toEqual([]);
  });
});

describe("MANIFEST-AK-10: Version und Änderungsprotokoll", () => {
  const file = "games/snake/game.json";
  const entry = (version: string, date: string, items = ["Neu"]) => ({ version, date, items });
  it("gültige Versionen und Protokolle werden akzeptiert", () => {
    const m = parseManifest(
      {
        ...valid,
        version: "1.2.0",
        changelog: [
          entry("1.2.0", "2026-11-10"),
          entry("1.1.3", "2026-11-10"),
          entry("1.0.0", "2026-11-01"),
        ],
      },
      file,
    );
    expect(m.version).toBe("1.2.0");
    expect(compareVersions("1.10.0", "1.9.9")).toBeGreaterThan(0);
    expect(compareVersions("2.0.0", "2.0.0")).toBe(0);
  });

  it.each([
    ["kein SemVer", { version: "1.0" }, "version"],
    ["mit v", { version: "v1.0.0" }, "version"],
    ["führende Null", { version: "01.0.0", changelog: [entry("01.0.0", "2026-11-08")] }, "version"],
    ["fehlende Version", { version: undefined }, "version"],
    ["leeres Protokoll", { changelog: [] }, "changelog"],
    ["fehlendes Protokoll", { changelog: undefined }, "changelog"],
    ["oberster Eintrag passt nicht", { version: "1.1.0" }, "changelog.0.version"],
    [
      "Versionen nicht absteigend",
      { version: "1.0.0", changelog: [entry("1.0.0", "2026-11-09"), entry("1.1.0", "2026-11-08")] },
      "changelog.1.version",
    ],
    [
      "doppelte Version",
      { version: "1.0.0", changelog: [entry("1.0.0", "2026-11-09"), entry("1.0.0", "2026-11-08")] },
      "changelog.1.version",
    ],
    [
      "Daten nicht absteigend",
      { version: "1.1.0", changelog: [entry("1.1.0", "2026-11-02"), entry("1.0.0", "2026-11-08")] },
      "changelog.1.date",
    ],
    ["Datum vor addedAt", { changelog: [entry("1.0.0", "2026-10-01")] }, "changelog.0.date"],
    ["keine Punkte", { changelog: [entry("1.0.0", "2026-11-08", [])] }, "changelog.0.items"],
    [
      "kaputte Uhrzeit",
      { changelog: [{ ...entry("1.0.0", "2026-11-08"), time: "25:00" }] },
      "changelog.0.time",
    ],
    [
      "zu viele Punkte",
      { changelog: [entry("1.0.0", "2026-11-08", Array(7).fill("x"))] },
      "changelog.0.items",
    ],
    [
      "zu langer Punkt",
      { changelog: [entry("1.0.0", "2026-11-08", ["x".repeat(121)])] },
      "changelog.0.items.0",
    ],
  ])("%s wird abgelehnt (Feld + Datei)", (_, patch, field) => {
    expect(() => parseManifest({ ...valid, ...patch }, file)).toThrowError(
      new RegExp(`${file}.*${field.replace(/\./g, "\\.")}`, "s"),
    );
  });
});

describe("PORTAL-AK-11: Neuigkeiten", () => {
  const g = (
    slug: string,
    order: number,
    changelog: GameManifest["changelog"],
    status = "published",
  ) =>
    ({
      ...(valid as GameManifest),
      slug,
      title: slug.toUpperCase(),
      order,
      status: status as GameManifest["status"],
      version: changelog[0]!.version,
      changelog,
    }) as GameManifest;
  it("neueste zuerst, bei gleichem Datum nach Spiel-Reihenfolge, ohne Entwürfe, höchstens 10", () => {
    const games = [
      g("b", 2, [
        { version: "1.1.0", date: "2026-11-09", items: ["B neu"] },
        { version: "1.0.0", date: "2026-11-01", items: ["B alt"] },
      ]),
      g("a", 1, [{ version: "1.0.0", date: "2026-11-09", items: ["A"] }]),
      g("d", 0, [{ version: "2.0.0", date: "2026-12-01", items: ["Entwurf"] }], "draft"),
    ];
    const news = newsEntries(games);
    expect(news.map((n) => `${n.slug}@${n.version}`)).toEqual(["a@1.0.0", "b@1.1.0", "b@1.0.0"]);
    expect(news[0]).toEqual({
      slug: "a",
      title: "A",
      version: "1.0.0",
      date: "2026-11-09",
      items: ["A"],
    });
    const many = Array.from({ length: 15 }, (_, i) =>
      g(`s${i}`, i, [{ version: "1.0.0", date: "2026-11-08", items: ["x"] }]),
    );
    expect(newsEntries(many)).toHaveLength(10);
  });
  it("Datum auf Deutsch", () => {
    expect(formatDate("2026-11-08")).toBe("8. November 2026");
    expect(formatDate("2027-03-01")).toBe("1. März 2027");
  });
  it("minutengenau: gleicher Tag nach Uhrzeit, neueste zuerst (Feedback fb_nnwyqq7p)", () => {
    const games = [
      g("a", 1, [{ version: "1.0.0", date: "2026-11-10", time: "08:01", items: ["früh"] }]),
      g("b", 2, [
        { version: "1.1.0", date: "2026-11-10", time: "12:52", items: ["mittag"] },
        { version: "1.0.0", date: "2026-11-09", time: "23:21", items: ["gestern"] },
      ]),
    ];
    expect(newsEntries(games).map((n) => n.items[0])).toEqual(["mittag", "früh", "gestern"]);
    expect(formatDate("2026-11-10", "12:52")).toBe("10. November 2026, 12:52 Uhr");
    expect(newsDateTime({ date: "2026-11-10", time: "08:01" })).toBe("2026-11-10T08:01");
    expect(newsDateTime({ date: "2026-11-10" })).toBe("2026-11-10");
  });
});
