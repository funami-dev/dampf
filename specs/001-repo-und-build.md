# 001 – Repo-Struktur, Build & Deployment

**Status:** Entwurf (Änderung: Browser-Unterstützung, BUILD-AK-11 bis 14)

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

## Browser-Unterstützung

Ziel sind auch **ältere iPads und iPhones**. Mindestens **iOS/iPadOS 15** (Safari 15), das läuft
z. B. noch auf iPad Air 2, iPad mini 4 und iPad 5. Generation.

- **Build-Ziel:** Alle Spiele werden mit dem Vite-Ziel `es2020`/`safari15` gebaut, damit neue
  JavaScript-Syntax (z. B. `static { … }`-Blöcke in Three.js) in ältere Syntax übersetzt wird.
  Vorher galt das Vite-Standardziel (Safari 16.4); auf älteren Geräten blieb die Seite weiß.
- **Fehlende Funktionen:** `Array/String/TypedArray.prototype.at` (erst ab Safari 15.4) wird
  im `game-kit` nachgerüstet, falls es fehlt.
- **Zu alte Geräte:** Kann ein Gerät ein Spiel nicht ausführen (kein WebGL 2 bei 3D-Spielen,
  zu alter Browser), erscheint statt einer weißen Seite ein Hinweis auf Deutsch:
  „Dein Gerät ist leider zu alt für dieses Spiel. Es braucht mindestens iOS 15 bzw. einen
  aktuellen Browser.“ – mit dem Zurück-Button zur Startseite. Die Prüfung läuft als kleines
  klassisches Skript vor dem eigentlichen Spiel, damit sie auch auf sehr alten Geräten greift.

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
- **BUILD-AK-11** Jedes gebaute Spiel-Bundle in `dist/games/*/assets/*.js` lässt sich als
  ES2020 parsen (keine neuere Syntax).
- **BUILD-AK-12** Fehlt `.at()`, rüstet das `game-kit` es für Arrays, Strings und TypedArrays nach
  (gleiches Verhalten inkl. negativer Indizes).
- **BUILD-AK-13** (E2E) Ist WebGL 2 nicht verfügbar, zeigen die 3D-Spiele (Pilot Pro, Mein Hilden,
  Juist-Fähre, Kassen-Held) den Hinweis „zu alt“ und den Zurück-Button statt einer weißen Seite;
  es gibt keinen unbehandelten Fehler.
- **BUILD-AK-14** (E2E) Auf aktuellen Browsern erscheint der Hinweis nicht.

## CI-Entscheidung

Kein GitHub-Actions-CI im MVP. Lint und Unit-Tests laufen im Vercel-Build (BUILD-AK-10).
Die E2E-Tests (Playwright) laufen lokal mit `npm run test:e2e`. GitHub Actions kann später
nachgerüstet werden.

## Vercel-Einrichtung (einmalig, manuell)

Das Vercel-Projekt ist eingerichtet (Node.js 24.x). Zum Nachvollziehen bzw. für ein neues Projekt:

1. Auf vercel.com mit GitHub anmelden → **Add New… → Project**.
2. Repository `funami-dev/dampf` importieren (ggf. die Vercel-GitHub-App für das Repo freigeben).
3. **Framework Preset:** „Other“. Build-Command, Output-Verzeichnis und Install-Command kommen
   aus `vercel.json` und müssen nicht im UI gesetzt werden.
4. **Root Directory:** leer lassen (Repo-Root). **Node.js-Version:** 24.x (Project Settings → Build and Deployment).
5. **Deploy** klicken. Die Seite ist danach unter `<projektname>.vercel.app` erreichbar.
6. **Production Branch:** `master` (Settings → Git). Alle anderen Branches erzeugen Preview-Deployments.
7. Optional: eigene Domain unter Settings → Domains hinzufügen.
