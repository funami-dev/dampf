# 001 – Repo-Struktur, Build & Deployment

**Status:** Abgenommen

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
- **BUILD-AK-10** Der Vercel-Build führt vor dem Bauen `npm run lint` und `npm test` aus. Schlägt
  einer davon fehl, schlägt das Deployment fehl (Quality Gate ohne separates CI).

## CI-Entscheidung

Kein GitHub-Actions-CI im MVP. Lint und Unit-Tests laufen im Vercel-Build (BUILD-AK-10).
Die E2E-Tests (Playwright) laufen lokal mit `npm run test:e2e`. GitHub Actions kann später
nachgerüstet werden.

## Vercel-Einrichtung (einmalig, manuell)

Es gibt noch kein Vercel-Projekt. Einrichtung, sobald der erste baubare Stand auf `master` liegt:

1. Auf vercel.com mit GitHub anmelden → **Add New… → Project**.
2. Repository `funami-dev/dampf` importieren (ggf. die Vercel-GitHub-App für das Repo freigeben).
3. **Framework Preset:** „Other“. Build-Command, Output-Verzeichnis und Install-Command kommen
  aus `vercel.json` und müssen nicht im UI gesetzt werden.
4. **Root Directory:** leer lassen (Repo-Root). **Node.js-Version:** 22.x (Project Settings → General).
5. **Deploy** klicken. Die Seite ist danach unter `<projektname>.vercel.app` erreichbar.
6. **Production Branch:** `master` (Settings → Git). Alle anderen Branches erzeugen Preview-Deployments.
7. Optional: eigene Domain unter Settings → Domains hinzufügen.
