import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { assertUniqueSlugs, loadManifests } from "./node.ts";
import type { GameManifest } from "./manifest.ts";

function gamesDir(games: Record<string, object | string>, thumbs = true) {
  const root = mkdtempSync(join(tmpdir(), "dampf-games-"));
  for (const [dir, manifest] of Object.entries(games)) {
    mkdirSync(join(root, dir, "public"), { recursive: true });
    writeFileSync(
      join(root, dir, "game.json"),
      typeof manifest === "string" ? manifest : JSON.stringify(manifest),
    );
    if (thumbs) writeFileSync(join(root, dir, "public", "thumbnail.png"), "");
  }
  return root;
}

const manifest = (slug: string, title = slug) => ({
  slug,
  title,
  description: "Beschreibung",
  thumbnail: "thumbnail.png",
  controls: { keyboard: true, touch: false },
  status: "published",
  addedAt: "2026-11-01",
  version: "1.0.0",
  changelog: [{ version: "1.0.0", date: "2026-11-01", items: ["Erste Version"] }],
});

describe("loadManifests", () => {
  it("PORTAL-AK-08: liest jedes Spiel unter games/ ohne zentrale Liste", () => {
    const dir = gamesDir({ snake: manifest("snake"), pong: manifest("pong") });
    expect(
      loadManifests(dir)
        .map((g) => g.slug)
        .sort(),
    ).toEqual(["pong", "snake"]);
  });

  it("ignoriert Ordner ohne game.json", () => {
    const dir = gamesDir({ snake: manifest("snake") });
    mkdirSync(join(dir, "kein-spiel"));
    expect(loadManifests(dir)).toHaveLength(1);
  });

  it("MANIFEST-AK-03: slug ungleich Ordnername wird abgelehnt", () => {
    const dir = gamesDir({ snake: manifest("schlange") });
    expect(() => loadManifests(dir)).toThrowError(/snake[\\/]game\.json.*slug/s);
  });

  it("MANIFEST-AK-04: fehlendes Thumbnail wird abgelehnt", () => {
    const dir = gamesDir({ snake: manifest("snake") }, false);
    expect(() => loadManifests(dir)).toThrowError(/snake[\\/]game\.json.*thumbnail/s);
  });

  it("BUILD-AK-04: kaputtes JSON nennt die Datei", () => {
    const dir = gamesDir({ snake: "{ nicht json" });
    expect(() => loadManifests(dir)).toThrowError(/snake[\\/]game\.json/);
  });

  it("BUILD-AK-05: doppelte Slugs werden abgelehnt", () => {
    const a = manifest("snake") as GameManifest;
    expect(() => assertUniqueSlugs([a, { ...a }])).toThrowError(/snake/);
    expect(() => assertUniqueSlugs([a, { ...a, slug: "pong" }])).not.toThrow();
  });
});
