# Specs – Arbeitsweise

Dieses Repo wird **spec-driven** entwickelt:

1. **Spec schreiben/ändern** (`specs/*.md`) – Ziel, Umfang, nummerierte Akzeptanzkriterien (AK).
2. **Spec abnehmen** – Status von `Entwurf` auf `Abgenommen` setzen.
3. **Tests aus den AK ableiten** – jeder Test referenziert seine AK-ID im Namen (z. B. `PORTAL-AK-03`).
4. **Implementieren**, bis alle Tests grün sind.
5. Änderungen am Verhalten → zuerst die Spec anpassen, dann Tests, dann Code.

## Status-Werte

`Entwurf` → `Abgenommen` → `Umgesetzt` (alle AK durch Tests abgedeckt und grün)

## Index

| Datei                                            | Thema                                       | Status    |
| ------------------------------------------------ | ------------------------------------------- | --------- |
| [000-vision.md](000-vision.md)                   | Vision, Ziele, Nicht-Ziele                  | Umgesetzt |
| [001-repo-und-build.md](001-repo-und-build.md)   | Monorepo, Build, Deployment (Vercel)        | Umgesetzt |
| [002-game-manifest.md](002-game-manifest.md)     | `game.json`-Format & Pflichten eines Spiels | Umgesetzt |
| [003-portal.md](003-portal.md)                   | Startseite / Spieleliste (Astro)            | Umgesetzt |
| [games/snake.md](games/snake.md)                 | Spiel 1: Snake (Referenz-Template)          | Umgesetzt |
| [games/himmelhuepfer.md](games/himmelhuepfer.md) | Spiel 2: Himmelhüpfer (Endlos-Hüpfspiel)    | Umgesetzt |
| [games/semukri-run.md](games/semukri-run.md)     | Spiel 3: SemUkri Run (100-m-Sprint)         | Umgesetzt |
| [games/pilot-pro.md](games/pilot-pro.md)         | Spiel 4: Pilot Pro (3D-Flugsimulator)       | Umgesetzt |
| [games/hilden.md](games/hilden.md)               | Spiel 5: Mein Hilden (3D-Stadt, Berufe)     | Umgesetzt |
| [games/juist-faehre.md](games/juist-faehre.md)   | Spiel 6: Juist-Fähre (3D-Schiffssimulator)  | Umgesetzt |
