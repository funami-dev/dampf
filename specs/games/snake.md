# Spiel: Snake

**Status:** Entwurf
**Slug:** `snake`

## Zweck

Klassisches Snake. Dient gleichzeitig als **Referenz-Template** für weitere Spiele
(Projektstruktur, Manifest, Szenen, Touch-Steuerung, Tests).

## Spielregeln

- Spielfeld: Raster 20 × 20 Zellen, quadratisch, skaliert auf den verfügbaren Platz.
- Start: Schlange mit Länge 3 in der Mitte, Richtung rechts, ein Futterstück an zufälliger
  freier Position.
- Die Schlange bewegt sich in festen Ticks (Start: 8 Felder/s).
- Futter fressen: Länge +1, Punkte +1, neues Futter auf freier Zelle; alle 5 Punkte
  +1 Feld/s Tempo (max. 15 Felder/s).
- Game Over bei Kollision mit Wand oder eigenem Körper.
- Eine 180°-Umkehr (z. B. rechts → links) ist nicht möglich und wird ignoriert.
- Mehrere Eingaben innerhalb eines Ticks werden gepuffert (max. 2), damit schnelle
  Richtungswechsel nicht verloren gehen.

## Szenen

1. **Start:** Titel, „Tippen oder Leertaste zum Starten“, Steuerungshinweis.
2. **Spiel:** Spielfeld + Punktestand. Pause per `P`/`Esc` oder Pause-Button (Touch).
   Pausiert automatisch, wenn der Tab den Fokus verliert.
3. **Game Over:** Punktestand, „Nochmal“ (Tippen / Leertaste).

## Steuerung

| Eingabe | Aktion |
|---|---|
| Pfeiltasten / WASD | Richtung |
| Swipe (≥ 30 px) | Richtung (Touch) |
| Leertaste / Tippen | Starten / Nochmal |
| P / Esc / Pause-Button | Pause |

## Architektur

- **Spiellogik als reines TypeScript** (`src/logic/`), ohne Phaser-Abhängigkeit:
  `createGame(seed)`, `step(state)`, `turn(state, dir)` → deterministisch, mit seedbarem
  Zufall testbar.
- Phaser-Szenen (`src/scenes/`) übernehmen nur Darstellung, Input und Timing.

## Akzeptanzkriterien

- **SNAKE-AK-01** Neuer Zustand: Länge 3, Richtung rechts, Futter nicht auf der Schlange.
- **SNAKE-AK-02** `step` bewegt die Schlange um genau eine Zelle in Laufrichtung.
- **SNAKE-AK-03** Futter fressen erhöht Länge und Punkte um 1 und platziert neues Futter auf
  einer freien Zelle.
- **SNAKE-AK-04** Wand-Kollision → Game Over.
- **SNAKE-AK-05** Selbst-Kollision → Game Over (Bewegung in die gerade frei werdende
  Schwanzzelle ist **keine** Kollision).
- **SNAKE-AK-06** 180°-Umkehr wird ignoriert; zwei schnelle Eingaben im selben Tick
  (z. B. hoch, dann links) werden nacheinander ausgeführt.
- **SNAKE-AK-07** Tempo steigt alle 5 Punkte um 1 Feld/s bis max. 15.
- **SNAKE-AK-08** (E2E Desktop) Leertaste startet das Spiel, Pfeiltasten steuern, Game Over
  zeigt Punktestand, Leertaste startet neu.
- **SNAKE-AK-09** (E2E Mobile 375×667, Touch) Tippen startet, Swipe ändert die Richtung, das
  Spielfeld ist vollständig sichtbar ohne Scrollen.
- **SNAKE-AK-10** Verlust des Tab-Fokus pausiert das Spiel.

## Offene Fragen

- Wände tödlich (wie spezifiziert) oder „Wrap-around“ durch den Rand?
- Sound-Effekte im MVP? (Wenn ja: stumm schaltbar, standardmäßig an/aus?)
