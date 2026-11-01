# 000 – Vision

**Status:** Entwurf

## Idee

`dampf` ist eine Webseite, die eine Sammlung kleiner Browsergames präsentiert. Alle Spiele leben
im selben Repository. Die Startseite listet die Spiele auf; ein Klick startet das Spiel als
eigenständige Vollbild-Seite.

## Ziele

- **Ein Repo, viele Spiele:** Ein neues Spiel hinzuzufügen heißt: Ordner unter `games/` anlegen
  (aus dem Snake-Template), `game.json` ausfüllen – es erscheint automatisch auf der Startseite.
- **Statisch & schnell:** Komplett statischer Build, gehostet auf Vercel, kein Backend.
- **Mobile-first spielbar:** Portal und Spiele funktionieren auf Smartphone (Touch) und Desktop
  (Tastatur/Maus).
- **Spec-driven:** Verhalten ist in `specs/` beschrieben und durch Tests abgesichert.

## Tech-Stack (Entscheidungen)

| Bereich | Wahl |
|---|---|
| Sprache | TypeScript |
| Spiele | Phaser 4 + Vite |
| Portal | Astro (statischer Output) |
| Repo | npm Workspaces |
| Tests | Vitest (Logik, Manifest), Playwright (E2E, inkl. Mobile-Viewport) |
| Hosting | Vercel (ein Projekt, statisches `dist/`) |

## Nicht-Ziele (MVP)

- Keine Benutzerkonten, kein Backend, keine Online-Highscores.
- Keine Tags/Filter/Suche auf der Startseite (kommt ggf. später).
- Keine lokalen Highscores (kommt ggf. später).
- Kein Einbetten der Spiele in einen Portal-Rahmen (Spiele laufen als Vollbild-Seite).

## Offene Fragen

- Name/Branding: Bleibt es bei „dampf“? Gibt es ein Farbschema/Logo-Idee?
- Sprache der Seite: nur Deutsch, oder DE/EN?
