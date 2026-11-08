# 000 – Vision

**Status:** Umgesetzt

## Idee

**Dampf** ist eine Webseite, die eine Sammlung kleiner Browsergames präsentiert. Alle Spiele leben
im selben Repository. Die Startseite listet die Spiele auf; ein Klick startet das Spiel als
eigenständige Vollbild-Seite.

## Ziele

- **Ein Repo, viele Spiele:** Ein neues Spiel hinzuzufügen heißt: Ordner unter `games/` anlegen
  (aus dem Snake-Template), `game.json` ausfüllen – es erscheint automatisch auf der Startseite.
- **Statisch & schnell:** Komplett statischer Build, gehostet auf Vercel, kein Backend.
  Ausnahme: ein kleiner WebSocket-Raum-Server auf Cloudflare Workers für Mehrspieler-Spiele
  (zuerst Waldlager). Er leitet nur Nachrichten weiter, ohne Konten und ohne gespeicherte Daten.
  Portal und Spiele bleiben statisch und funktionieren auch ohne ihn.
- **Mobile-first spielbar:** Portal und Spiele funktionieren auf Smartphone (Touch) und Desktop
  (Tastatur/Maus).
- **Spec-driven:** Verhalten ist in `specs/` beschrieben und durch Tests abgesichert.

## Tech-Stack (Entscheidungen)

| Bereich | Wahl                                                              |
| ------- | ----------------------------------------------------------------- |
| Sprache | TypeScript                                                        |
| Spiele  | Phaser 4 + Vite (3D-Spiele: Three.js + Vite, z. B. Pilot Pro)     |
| Portal  | Astro (statischer Output)                                         |
| Repo    | npm Workspaces                                                    |
| Tests   | Vitest (Logik, Manifest), Playwright (E2E, inkl. Mobile-Viewport) |
| Hosting | Vercel (ein Projekt, statisches `dist/`)                          |

## Nicht-Ziele (MVP)

- Keine Benutzerkonten, keine Online-Highscores, kein eigenes Backend außer dem
  Raum-Server für Mehrspieler (siehe oben).
- Keine Tags/Filter/Suche auf der Startseite (kommt ggf. später).
- Keine plattformweiten Highscores. Einzelne Spiele dürfen lokal (im Browser) Bestzeiten und
  Rekorde speichern, wenn ihre Spec das festlegt (z. B. SemUkri Run).
- Kein Einbetten der Spiele in einen Portal-Rahmen (Spiele laufen als Vollbild-Seite).

## Branding & Sprache

- **Name:** „Dampf“, ein augenzwinkernder Bezug auf Steam (Dampf = Steam).
- **Stil:** Retro-Arcade mit Pixel-Optik, angelehnt an die Stimmung von Steam: dunkles Blau-Grau,
  helle Akzente in Cyan/Blau, Dampfwolken als Motiv. Logo und Farben sind **eigene** Entwürfe.
  Es werden keine Steam- oder Valve-Logos, -Schriften oder -Markennamen verwendet.
  Der Pixel-Stil gilt für das Portal; einzelne Spiele dürfen einen eigenen Stil haben
  (z. B. Himmelhüpfer im Cartoon-Stil), wenn ihre Spec das festlegt.
- **Sprache:** nur Deutsch (`<html lang="de">`). Alle Texte in Portal und Spielen sind deutsch.
