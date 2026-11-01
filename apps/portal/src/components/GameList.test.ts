import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import type { GameManifest } from "@dampf/game-kit";
import GameList from "./GameList.astro";

const game: GameManifest = {
  slug: "snake",
  title: "Snake",
  description: "Beschreibung",
  thumbnail: "thumbnail.png",
  controls: { keyboard: true, touch: false },
  status: "published",
  addedAt: "2026-11-01",
};

describe("GameList", () => {
  it("PORTAL-AK-05: zeigt ohne Spiele einen Hinweis", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(GameList, { props: { games: [] } });
    expect(html).toContain('data-testid="empty"');
    expect(html).not.toContain('data-testid="games"');
  });

  it("PORTAL-AK-02/03: Karte mit Link, Bild (alt = Titel) und Steuerung", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(GameList, { props: { games: [game] } });
    expect(html).toContain('href="/games/snake/"');
    expect(html).toContain('src="/games/snake/thumbnail.png"');
    expect(html).toContain('alt="Snake"');
    expect(html).toContain("Tastatur");
    expect(html).not.toContain("Touch");
  });
});
