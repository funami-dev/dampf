# Spiel: Himmelhüpfer

**Status:** Entwurf
**Slug:** `himmelhuepfer`

## Zweck

Endlos-Hüpfspiel nach oben: Die gewählte Figur springt automatisch von Plattform zu Plattform,
man lenkt nur nach links und rechts. Ziel ist, so hoch wie möglich zu kommen. Inspiriert vom
Spiel auf semukri.de, aber mit eigenen Figuren und eigenen Grafiken (keine Übernahme von
SemUkri-Grafiken, -Namen oder -Logos).

## Figuren

Drei Figuren, die sich **nur im Aussehen** unterscheiden (gleiche Physik):

| ID         | Name     | Aussehen                                                                  |
| ---------- | -------- | ------------------------------------------------------------------------- |
| `mauli`    | Mauli    | Maulwurf: dunkelgraues Fell, rosa Nase und Pfoten, kleine Brille optional |
| `schweini` | Schweini | Schwein: rosa, Ringelschwanz, Schlappohren                                |
| `matti`    | Matti    | Kind, 9 Jahre, lange blonde Haare, blauer Hoodie, blaue Shorts, Sneaker   |

## Szenen

1. **Figurenauswahl:** Überschrift „Figur wählen“, drei Karten nebeneinander (Name + Figur).
   Die gewählte Karte ist hervorgehoben (Rahmen + Haken). Hinweis: „Tippe deine Lieblingsfigur
   und spring so hoch du kannst!“ und ein Button „Los!“.
   Tastatur: ←/→ wählt, Leertaste/Enter startet.
2. **Spiel:** Figur, Plattformen, Sterne, Hintergrund. Anzeige oben: Höhe in Metern (links),
   gesammelte Sterne (Mitte), Pause-Button (rechts).
3. **Game Over:** „Abgestürzt!“, erreichte Höhe, gesammelte Sterne, Buttons „Nochmal“ (gleiche
   Figur) und „Figur wechseln“. Tastatur: Leertaste = Nochmal.

## Spielregeln

Alle Werte in Welt-Einheiten (WE). Sichtbereich: 400 WE breit, 700 WE hoch (Hochformat).

- **Springen:** Landet die Figur **fallend** auf einer Plattform, springt sie automatisch ab
  (Absprunggeschwindigkeit 900 WE/s, Schwerkraft 1500 WE/s² → max. Sprunghöhe 270 WE).
  Von unten fliegt sie durch Plattformen hindurch.
- **Lenken:** links/rechts mit 300 WE/s. Wer seitlich hinausläuft, kommt auf der anderen Seite
  wieder herein (Wrap-around).
- **Kamera:** folgt der Figur nur nach oben, nie nach unten.
- **Höhe:** höchster erreichter Punkt, 100 WE = 1 m, angezeigt in ganzen Metern.
- **Plattformen:** werden oberhalb des Sichtbereichs endlos erzeugt und unterhalb entfernt.
  Der senkrechte Abstand zweier aufeinanderfolgender Plattformen ist **immer erreichbar**
  (höchstens 200 WE, also unter der max. Sprunghöhe).
- **Schwierigkeit:** Mit der Höhe wachsen die Abstände (Start 60–110 WE, ab 50 m 140–200 WE)
  und die Plattformen werden schmaler (Start 90 WE, ab 50 m 60 WE).
- **Sterne:** schweben über manchen Plattformen (ca. jede 6.). Berühren = einsammeln
  (+1 Stern). Sterne zählen getrennt von der Höhe.
- **Game Over:** Fällt die Figur unter den unteren Rand des Sichtbereichs.
- **Start:** Die Figur steht auf einer breiten Startplattform am unteren Rand und springt sofort.
- **Pause:** P/Esc oder Pause-Button. Pausiert automatisch bei Fokusverlust.

## Steuerung

| Eingabe                                | Aktion         |
| -------------------------------------- | -------------- |
| ← / → oder A / D                       | lenken         |
| linke / rechte Bildschirmhälfte halten | lenken (Touch) |
| beide Hälften gleichzeitig             | geradeaus      |
| P / Esc / Pause-Button                 | Pause          |

Es gibt keine Steuer-Buttons am unteren Rand. Alle Bedienelemente (Pause, Game-Over-Buttons)
liegen innerhalb des sicheren Bereichs und werden nicht von der Safari-Leiste verdeckt
(siehe MANIFEST-AK-08).

## Grafik

- **Stil:** Cartoon wie im Original: weiche Formen, kräftige Konturen, helle Farben.
- **Hintergrund:** Himmelverlauf hellblau, Wolken, unten Stadt-Silhouette und grüne Hügel.
  Wolken und Stadt bewegen sich langsamer als die Kamera (Parallaxe).
- **Plattformen:** Grasnarbe oben, Erde unten.
- **Stern:** gelb mit freundlichem Gesicht.
- **Assets:** SVG-Dateien unter `public/assets/` mit festen Namen und Maßen, damit sie später
  durch bessere Illustrationen ersetzt werden können, ohne Code zu ändern:

  | Datei                                                      | Maße (px) |
  | ---------------------------------------------------------- | --------- |
  | `figur-mauli.svg`, `figur-schweini.svg`, `figur-matti.svg` | 96 × 128  |
  | `plattform.svg`                                            | 180 × 40  |
  | `stern.svg`                                                | 64 × 64   |
  | `wolke.svg`                                                | 240 × 120 |
  | `stadt.svg`                                                | 800 × 300 |
  | `huegel.svg`                                               | 800 × 200 |

- **Animation:** Figur schaut in Laufrichtung (gespiegelt), staucht sich kurz beim Absprung.
- Kein Sound im MVP.

## Architektur

Wie bei Snake: Spiellogik als reines TypeScript (`src/logic/`), deterministisch mit Seed und
festem Zeitschritt: `createGame(seed)`, `step(state, input, dt)` mit
`input = { left: boolean, right: boolean }`. Phaser übernimmt nur Darstellung, Eingabe, Timing.

## Akzeptanzkriterien

- **HH-AK-01** Neues Spiel: Figur steht auf der Startplattform und springt im ersten Schritt ab;
  Höhe 0 m, 0 Sterne.
- **HH-AK-02** Fallend auf einer Plattform landen löst einen Sprung mit 900 WE/s aus; steigend
  durch eine Plattform hindurch hat keinen Effekt.
- **HH-AK-03** Lenken bewegt mit 300 WE/s; links + rechts gleichzeitig = keine Bewegung.
- **HH-AK-04** Seitlicher Wrap-around in beide Richtungen.
- **HH-AK-05** Die Kamera bewegt sich nur nach oben.
- **HH-AK-06** Für 100 Seeds und die ersten 200 m gilt: Jeder Plattformabstand ist ≤ 200 WE.
- **HH-AK-07** Abstände und Plattformbreiten entwickeln sich mit der Höhe wie spezifiziert.
- **HH-AK-08** Stern berühren erhöht den Zähler um 1 und entfernt den Stern.
- **HH-AK-09** Fällt die Figur unter den Sichtbereich → Game Over; Höhe zählt den höchsten Punkt.
- **HH-AK-10** (E2E) Figurenauswahl: alle drei Figuren sichtbar, Auswahl per Tippen und per
  Tastatur, gewählte Figur wird im Spiel verwendet.
- **HH-AK-11** (E2E Desktop) Pfeiltasten lenken, Game Over zeigt Höhe und Sterne, Leertaste
  startet neu, „Figur wechseln“ führt zur Auswahl.
- **HH-AK-12** (E2E Mobile 375×667) Halten der linken/rechten Hälfte lenkt; Spielfeld und alle
  Buttons vollständig sichtbar ohne Scrollen.
- **HH-AK-13** Fokusverlust pausiert das Spiel.

## Nicht-Ziele (MVP)

- Kein gespeicherter Bestwert, keine Sprungfedern, keine beweglichen oder zerbrechenden
  Plattformen, keine Gegner, kein Kippen-Steuern, kein Sound.
