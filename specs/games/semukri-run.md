# Spiel: SemUkri Run

**Status:** Umgesetzt
**Slug:** `semukri-run`

## Zweck

100-m-Sprint im Stil klassischer Leichtathletik-Spiele: Durch **abwechselndes Tippen** (links,
rechts, links, …) wird die Figur schneller. Ziel ist die beste Zeit. Persönliche Bestzeit und eine
Rekordliste (Top 10) werden auf dem Gerät gespeichert. Der eigene bisher beste Lauf läuft als
„Geist“ auf der Nachbarbahn mit.

## Name und Figuren

Name und Figuren beziehen sich auf SemUkri. Die Verwendung hat der Repo-Inhaber am 2026-11-01
ausdrücklich freigegeben. Alle Grafiken sind **eigene Pixel-Interpretationen**; es werden keine
SemUkri-Grafiken, Fotos oder Logos übernommen.

| ID        | Name    | Aussehen (Pixel-Sprite)                                          |
| --------- | ------- | ---------------------------------------------------------------- |
| `ukri`    | Ukri    | blonde, verwuschelte Haare, blauer Hoodie, blaue Shorts, Sneaker |
| `semlaki` | Semlaki | dunkle Haare, goldene Krone, roter Anzug mit schwarzer Fliege    |
| `billy`   | Billy   | kurze braune Haare, grünes T-Shirt, blaue Hose                   |

Die Figuren unterscheiden sich **nur im Aussehen**.

## Szenen

1. **Start:** Titel „SemUkri Run“, Figurenauswahl (drei Figuren nebeneinander, gewählte
   hervorgehoben), persönliche Bestzeit, Buttons „Los!“ und „Rekorde“.
   Tastatur: ←/→ wählt, Leertaste/Enter startet.
2. **Rennen:** Seitenansicht einer Laufbahn. Countdown „Auf die Plätze“ (1 s) → „Fertig“
   (1 s) → „Los!“. Anzeige: Zeit, Distanz, Tempo-Balken, Abstand zum Geist (z. B. „-0,32 s“).
3. **Ziel:** Zeit, ggf. „Neue Bestzeit!“. Schafft die Zeit es in die Top 10: Namenseingabe.
   Buttons „Nochmal“, „Rekorde“, „Figur wechseln“.
4. **Rekorde:** Top 10 mit Platz, Name, Zeit, Figur. Button „Zurück“.

## Spielregeln

- **Strecke:** 100 m, eine Bahn für die Spielfigur, eine Nachbarbahn für den Geist.
- **Start:** Zeit läuft ab „Los!“. Eingaben vor „Los!“ werden ignoriert (kein Fehlstart).
- **Tempo:** Jede **gültige** Eingabe erhöht das Tempo um 1,0 m/s, höchstens 12 m/s.
  Gültig ist eine Eingabe, wenn sie auf der anderen Seite als die vorherige liegt (die erste
  Eingabe ist immer gültig). Zweimal dieselbe Seite bringt nichts.
- **Bremsen:** Ohne Eingaben sinkt das Tempo exponentiell (dv/dt = −1,0/s · v). Wer gleichmäßig
  f-mal pro Sekunde abwechselnd tippt, läuft dadurch etwa f m/s.
- **Ziel:** Die Zeit wird beim Überqueren der 100-m-Linie genau bestimmt (zwischen zwei
  Rechenschritten interpoliert) und auf Hundertstel abgeschnitten angezeigt, z. B. „12,34 s“.
- **Fokusverlust** (Tab-Wechsel) während des Rennens bricht den Lauf ab; er zählt nicht.
- **Stehenbleiben:** Unter 0,2 m/s steht die Figur still. Wer nach 60 s nicht im Ziel ist,
  dessen Lauf wird abgebrochen.

## Bestzeit, Geist und Rekorde

- **Persönliche Bestzeit:** schnellste gültige Zeit auf diesem Gerät, mit Figur und dem
  aufgezeichneten Lauf (Geist).
- **Geist:** Position alle 50 ms aufgezeichnet. Im nächsten Rennen läuft der Geist der Bestzeit
  halb durchsichtig auf der Nachbarbahn, Position zwischen den Messpunkten interpoliert. Ohne
  Bestzeit gibt es keinen Geist.
- **Rekordliste:** Top 10, aufsteigend nach Zeit; bei gleicher Zeit steht der ältere Eintrag
  vorne. Jeder Eintrag: Name, Zeit, Figur, Datum.
- **Name:** 1–10 Zeichen, Leerzeichen am Rand werden entfernt. Eingabe über ein echtes
  Textfeld (damit die Handy-Tastatur erscheint); vorbelegt mit dem zuletzt verwendeten Namen.
- **Speicherung:** `localStorage` unter `dampf.semukri-run.v1`. Fehlende oder kaputte Daten
  führen zu einem leeren Zustand, nie zu einem Absturz. Ist Speichern nicht möglich (z. B.
  privater Modus), läuft das Spiel trotzdem; ein Hinweis erklärt, dass Rekorde nicht gespeichert
  werden.

## Steuerung

| Eingabe                           | Aktion              |
| --------------------------------- | ------------------- |
| ← / → oder A / D (abwechselnd)    | laufen              |
| Buttons „L“ und „R“ unten (Touch) | laufen              |
| Leertaste / Enter                 | starten, bestätigen |

Die Buttons „L“ und „R“ sind groß (je fast die halbe Breite) und liegen über dem sicheren
Bereich (MANIFEST-AK-08). Mehrfinger-Tippen wird unterstützt.

## Grafik

- **Stil:** Retro-Pixel passend zum Portal; Schrift „Press Start 2P“.
- **Figuren:** Pixel-Sprites 24 × 32 Pixel, dreifach vergrößert, mit Animationen: stehen,
  laufen (4 Bilder, Bildrate passend zum Tempo), jubeln im Ziel.
- **Szene:** rote Tartanbahn mit weißen Linien, Start- und Ziellinie, Tribüne mit
  Pixel-Publikum im Hintergrund (Parallaxe), Meter-Markierungen alle 10 m.
- Kein Sound im MVP.

## Architektur

Spiellogik als reines TypeScript (`src/logic/`), deterministisch mit festem Zeitschritt:
`createRace()`, `press(state, side)`, `step(state, dt)`; Geist und Rekorde als eigene, reine
Module (`ghost.ts`, `records.ts`) mit einer austauschbaren Speicher-Schnittstelle.

## Akzeptanzkriterien

- **SR-AK-01** Gültige Eingabe (Seitenwechsel) erhöht das Tempo um 1 m/s, höchstens 12 m/s;
  dieselbe Seite zweimal hat keine Wirkung.
- **SR-AK-02** Ohne Eingabe sinkt das Tempo exponentiell mit 1,0/s.
- **SR-AK-03** 8 Eingaben/s abwechselnd ergeben in der 5. Sekunde ein Durchschnittstempo von
  8 ± 0,5 m/s (das Tempo pendelt zwischen den Eingaben).
- **SR-AK-04** Eingaben vor „Los!“ werden ignoriert; die Zeit startet bei „Los!“.
- **SR-AK-05** Die Zielzeit wird interpoliert und stimmt bei konstantem Tempo auf 0,01 s.
- **SR-AK-06** Geist: Aufzeichnung alle 50 ms; Wiedergabe interpoliert zwischen Messpunkten
  und steht nach dem Ziel bei 100 m.
- **SR-AK-07** Rekordliste: richtige Einsortierung, höchstens 10 Einträge, Gleichstand nach
  Datum, `qualifies(time)` stimmt.
- **SR-AK-08** Bestzeit (mit Geist) wird nur bei einer schnelleren Zeit ersetzt.
- **SR-AK-09** Kaputte oder fehlende Speicherdaten ergeben einen leeren Zustand; nicht
  verfügbarer Speicher führt nicht zum Absturz.
- **SR-AK-10** Namen werden getrimmt und auf 1–10 Zeichen begrenzt.
- **SR-AK-11** Lauf ohne Zieleinlauf nach 60 s wird abgebrochen.
- **SR-AK-12** (E2E Desktop) Figur wählen, Countdown, mit ←/→ ins Ziel, Zeit wird angezeigt,
  Name eingeben, Eintrag steht in den Rekorden und ist nach Neuladen der Seite noch da; im
  nächsten Rennen läuft der Geist mit.
- **SR-AK-13** (E2E Mobile 375×667) Buttons „L“ und „R“ vollständig sichtbar; Tippen bringt
  die Figur ins Ziel.
- **SR-AK-14** Fokusverlust während des Rennens bricht den Lauf ab; es wird nichts gespeichert.
- **SR-AK-15** Jeder Tastendruck zählt genau einmal: Auch wenn Phaser ein Tasten-Ereignis doppelt
  meldet, springt die Figurenwahl nur um eine Figur weiter und im Rennen zählt es nur einmal.

## Nicht-Ziele (MVP)

- Keine Online-Bestenliste, keine Computer-Gegner, kein Fehlstart, keine weiteren Strecken,
  kein Sound.
