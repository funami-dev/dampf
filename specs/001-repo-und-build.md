# 001 – Repo-Struktur, Build & Deployment

**Status:** Entwurf

## Struktur

```
/
├─ package.json          # npm workspaces: apps/*, games/*, packages/*
├─ vercel.json
├─ scripts/
│  └─ assemble.ts        # fügt Portal + Spiele zu /dist zusammen, validiert Manifeste
├─ apps/
│  └─ portal/            # Astro-Startseite
├─ games/
│  └─ snake/             # je Spiel ein eigenes Vite+Phaser-Paket
│     ├─ game.json
│     ├─ index.html
│     ├─ public/thumbnail.png
│     └─ src/
├─ packages/
│  └─ game-kit/          # geteilter Code (Manifest-Schema, Zurück-Button, Touch-Helfer)
├─ specs/
└─ e2e/                  # Playwright-Tests gegen den gebauten /dist
```

## Build-Ablauf

1. `npm run build` im Root:
   1. baut jedes Spiel unter `games/*` mit Vite und `base: "/games/<slug>/"`,
   2. baut das Portal (Astro, liest dabei alle `games/*/game.json`),
   3. `scripts/assemble.ts` kopiert alles nach:
      ```
      dist/
      ├─ index.html            # Portal
      ├─ games/<slug>/index.html …
      ```
2. Vercel: `buildCommand: npm run build`, `outputDirectory: dist`, kein Framework-Preset nötig.

## Akzeptanzkriterien

- **BUILD-AK-01** `npm ci && npm run build` läuft auf einer frischen Kopie mit Node 22 ohne Fehler durch.
- **BUILD-AK-02** Nach dem Build existiert `dist/index.html` und für jedes veröffentlichte Spiel
  `dist/games/<slug>/index.html`.
- **BUILD-AK-03** Alle Asset-Pfade eines Spiels funktionieren unter `/games/<slug>/`
  (keine 404 beim Laden im E2E-Test).
- **BUILD-AK-04** Ein ungültiges `game.json` (siehe 002) bricht den Build mit einer
  verständlichen Fehlermeldung ab, die Datei und Feld nennt.
- **BUILD-AK-05** Zwei Spiele mit gleichem `slug` brechen den Build ab.
- **BUILD-AK-06** `npm run dev` startet das Portal lokal; `npm run dev -w games/<slug>` startet
  ein einzelnes Spiel lokal.
- **BUILD-AK-07** `npm test` führt alle Vitest-Tests aus; `npm run test:e2e` baut und führt
  Playwright gegen `dist/` aus (Desktop- und Mobile-Viewport).
- **BUILD-AK-08** `npm run lint` (ESLint + Prettier-Check + `tsc --noEmit`) läuft fehlerfrei.
- **BUILD-AK-09** Jeder Push/PR wird von Vercel als Preview deployed; `master` geht auf Production.

## Offene Fragen

- CI zusätzlich über GitHub Actions (Tests vor dem Deploy), oder reicht Vercel-Build + lokale Tests?
- Vercel-Projekt: existiert schon eins / welche Domain?
