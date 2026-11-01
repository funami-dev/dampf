# Dampf

Eine Sammlung kleiner Retro-Browsergames (Phaser 4) mit einer Startseite (Astro), die alle Spiele
auflistet. Gehostet auf Vercel.

Das Projekt wird **spec-driven** entwickelt: erst die Spec in [`specs/`](specs/README.md), dann
Tests aus den Akzeptanzkriterien, dann Code.

## Voraussetzungen

Node.js 22.23 oder neuer (siehe `.nvmrc`).

```sh
npm install
npx playwright install chromium   # einmalig, für die E2E-Tests
```

## Befehle

| Befehl                       | Zweck                                              |
| ---------------------------- | -------------------------------------------------- |
| `npm run dev`                | Startseite lokal entwickeln (Astro-Dev-Server)     |
| `npm run dev -w games/snake` | Ein einzelnes Spiel lokal entwickeln (Vite)        |
| `npm run build`              | Alles bauen und unter `dist/` zusammenführen       |
| `npm run preview`            | `dist/` lokal ausliefern (wie auf Vercel)          |
| `npm test`                   | Unit-Tests (Vitest)                                |
| `npm run test:e2e`           | Bauen + E2E-Tests (Playwright, Desktop und Mobile) |
| `npm run lint`               | ESLint, Prettier-Check und Typecheck               |

Im Astro-Dev-Server funktionieren die Links zu den Spielen nicht, weil die Spiele separat
gebaut werden. Für die komplette Seite `npm run build && npm run preview` verwenden.

## Aufbau

```
apps/portal/         Startseite (Astro, statisch)
games/<slug>/        je Spiel ein Vite + Phaser 4 Paket mit game.json
packages/game-kit/   Manifest-Schema, Spiel-Rahmen mit Zurück-Button, Swipe-Erkennung
scripts/             Build: validieren → Spiele bauen → Portal bauen → dist/ zusammenführen
e2e/                 Playwright-Tests gegen dist/
specs/               Specs mit Akzeptanzkriterien
```

## Ein neues Spiel hinzufügen

1. Spec unter `specs/games/<slug>.md` schreiben und abnehmen.
2. `games/snake` nach `games/<slug>` kopieren, in `package.json` den Namen, in `vite.config.ts`
   `base: "/games/<slug>/"` und in `game.json` alle Felder anpassen
   (Format: [`specs/002-game-manifest.md`](specs/002-game-manifest.md)).
3. `public/thumbnail.png` (16:9, mindestens 640×360) ablegen.
4. `npm install`, dann `npm run build`. Das Spiel erscheint automatisch auf der Startseite.

## Deployment

Vercel baut mit `vercel.json`: `npm run lint && npm test && npm run build`, Ausgabe `dist/`.
Schlagen Lint oder Tests fehl, wird nicht deployt. Einrichtung des Vercel-Projekts: siehe
[`specs/001-repo-und-build.md`](specs/001-repo-und-build.md#vercel-einrichtung-einmalig-manuell).
