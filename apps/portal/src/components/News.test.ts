import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import News from "./News.astro";

describe("News", () => {
  it("PORTAL-AK-11: Datum, verlinkter Titel, Version und Punkte", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(News, {
      props: {
        news: [
          {
            slug: "waldlager",
            title: "Waldlager",
            version: "1.1.0",
            date: "2026-11-09",
            items: ["Brücken bauen", "Trümmerspur"],
          },
        ],
      },
    });
    expect(html).toContain("Neuigkeiten");
    expect(html).toContain("9. November 2026");
    expect(html).toContain('href="/games/waldlager/"');
    expect(html).toContain("v1.1.0");
    expect(html).toMatch(/<li[^>]*>Brücken bauen<\/li>/);
    expect(html).toMatch(/<li[^>]*>Trümmerspur<\/li>/);
  });

  it("ohne Einträge entfällt der Bereich", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(News, { props: { news: [] } });
    expect(html).not.toContain("Neuigkeiten");
  });
});
