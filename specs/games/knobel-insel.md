# Spiel: Knobel-Insel

**Status:** Entwurf
**Slug:** `knobel-insel`

## Zweck

Berühmte **Algorithmus-Rätsel** zum Anfassen, für Kinder ab etwa 10 Jahren. Jedes Rätsel ist ein
**Kapitel** auf einer kleinen Insel-Karte. Man knobelt selbst, bekommt freundliche Hilfen und sieht
am Ende auf einer Karte **„So denkt ein Computer“**, welcher Trick dahintersteckt (Rekursion,
Durchprobieren aller Möglichkeiten). Kein Zeitlimit, kein Verlieren: Ein falscher Zug wird lustig
gezeigt und zurückgenommen.

Süße, kindliche **16-Bit-Pixelgrafik**, alles per Code gezeichnet (keine Bilddateien), leise
Klänge per Web Audio. 2D mit Phaser, läuft auf älteren iPads und Handys. Eigene Figuren und eigenes
Aussehen – die Rätsel selbst sind alte, freie Denkaufgaben.

## Insel-Karte (Startbildschirm)

- Eine kleine Pixel-Insel mit zwei Orten: **🥞 Pfannkuchen-Turm** (Küchenhütte) und **⛵ Über den
  Fluss** (Fluss mit Steg). Antippen öffnet das Kapitel mit seinen Leveln.
- Jedes Level zeigt seine Sterne (0–3). Level werden der Reihe nach frei; das erste Level jedes
  Kapitels ist sofort offen.
- Fortschritt und Klang werden gespeichert (`dampf.knobel-insel.v1`).

## Kapitel 1: Pfannkuchen-Turm (Türme von Hanoi)

**Geschichte:** Der Koch-Bär hat einen Pfannkuchen-Turm gebacken und muss ihn auf den Teller ganz
rechts bringen. Es gibt drei Teller. Man darf immer nur den **obersten** Pfannkuchen bewegen, und
ein **großer Pfannkuchen darf nie auf einem kleineren liegen** – „sonst matscht er ihn platt!“.

- **Level:** 3, 4, 5, 6 und 7 Pfannkuchen.
- **Bedienen:** Pfannkuchen antippen und dann einen Teller antippen, oder ihn auf einen Teller
  ziehen. Der gewählte Pfannkuchen hebt sich leicht an.
- **Falscher Zug:** Der kleine Pfannkuchen quietscht „Autsch!“, der große wackelt und fliegt
  zurück. Nichts zählt als Zug.
- **Zähler:** „Züge: 9 · Profi-Zahl: 7“ (die Profi-Zahl ist die kleinste mögliche Zahl,
  2ⁿ − 1). **Sterne:** 3 bei genau der Profi-Zahl, 2 bis zum Anderthalbfachen, sonst 1.
- **Pfannkuchen-Gesichter:** kleine Augen, die blinzeln (ruhig, höchstens alle paar Sekunden); am
  Ziel jubeln alle, es regnet Sirup-Tropfen und Streusel.
- **💡 Muster-Tipp:** schaltet einen sanften Schein um den kleinsten Pfannkuchen ein, wenn er dran
  ist (er bewegt sich bei jedem zweiten Zug, immer in dieselbe Kreisrichtung). Dazu der Satz:
  „Der Kleinste ist jeden zweiten Zug dran – immer im Kreis!“
- **🐭 Helfer-Modus** (ab Level 4 wählbar): Man bewegt **nur den größten Pfannkuchen**. Den
  kleineren Turm darüber trägt die Helfer-Maus: Knopf „🐭 Maus, trag den kleinen Turm weg!“ – sie
  legt ihn in Ruhe (ein Zug pro 0,4 s) auf den freien Teller. So lernt man den Trick: „Um 5 zu
  bewegen, bewege erst 4 weg.“
- **▶ Zeig's mir (Zeitlupe):** spielt die beste Lösung langsam vor. Daneben steht eine kleine
  **Aufgaben-Liste**, die sich einrückt wie Schachteln: „Bewege 3 nach rechts → Bewege 2 in die
  Mitte → Bewege 1 nach rechts …“. Das ist **Rekursion** zum Zuschauen. Anhalten jederzeit;
  danach beginnt das Level neu (Zeitlupe gibt keine Sterne).
- **So denkt ein Computer:** Nach dem ersten geschafften Level eine Karte: Der Trick ruft sich
  selbst mit einem kleineren Turm auf (Rekursion); jeder Pfannkuchen mehr verdoppelt die Züge
  (+1). Fun Fact: Die Legende vom Turm mit **64 goldenen Scheiben** – mit einem Zug pro Sekunde
  bräuchte man etwa **585 Milliarden Jahre**.

**Grafik:** gemütliche Pixel-Küche (Fliesen, Herd, Fenster), drei Teller auf dem Tisch, der
Koch-Bär mit Mütze daneben (schaut zu, freut sich, staunt). Pfannkuchen goldbraun mit Butterstück
und Sirup, je Größe etwas andere Farbe, damit man sie gut unterscheidet.

## Kapitel 2: Über den Fluss (Iso-Pixelwelt)

**Welt:** eine wunderschöne **isometrische 16-Bit-Pixel-Landschaft**: ein Fluss mit sanft
glitzerndem Wasser quer durchs Bild, zwei grüne Ufer mit Blumen, Büschen und je einem Holzsteg,
ein kleines Ruderboot. Im Hintergrund schwimmen Enten, Schilf wiegt sich (ruhig, Zyklen ≥ 4 s).
Figuren stehen am Ufer, steigen sichtbar ins Boot, das Boot gleitet in etwa 1,5 s hinüber.

**Bedienen:** Eine Figur am Ufer des Bootes antippen = einsteigen (wenn Platz ist); im Boot
antippen = aussteigen. „⛵ Los!“ fährt hinüber. Dazu „↩ Zurück“ (beliebig oft), „💡 Tipp“ und
„↺ Neu“. Zähler: „Fahrten: 5 · Profi-Zahl: 7“; Sterne wie bei Kapitel 1.

**Wenn eine Regel verletzt wird** (nach dem Anlegen): Eine kurze, kindgerechte Szene ohne
Gewalt – z. B. der Fuchs jagt los und die Gans flattert erschrocken mit Federn auf, oder die Gans
pickt am Korn –, dazu ein Satz („Oh nein! Fuchs und Gans allein – das geht nicht gut.“). Dann wird
die Fahrt **automatisch zurückgenommen**. Kein Verlieren.

**Level (alle in Version 1):**

1. **Fuchs, Gans und Korn:** Bäuerin + Fuchs + Gans + Sack Korn. Ins Boot passen die Bäuerin und
   **ein** Passagier; nur die Bäuerin rudert. Ohne die Bäuerin darf der Fuchs nicht mit der Gans
   und die Gans nicht mit dem Korn allein bleiben. (Kürzeste Lösung: 7 Fahrten.)
2. **Hasen und Füchse:** 3 Hasen und 3 Füchse, das Boot hat **2 Plätze**, jedes Tier kann rudern
   (mindestens eins muss drin sein). Auf keiner Seite dürfen mehr Füchse als Hasen sein, wenn dort
   Hasen sind – das Boot am Ufer zählt zu diesem Ufer. (Kürzeste Lösung: 11 Fahrten.)
3. **Biber-Familie:** 2 große Biber und 2 kleine Biber. Das Boot trägt **einen großen Biber oder
   bis zu zwei kleine** (ein großer belegt beide Plätze). Alle können rudern. (Kürzeste Lösung:
   9 Fahrten.)

**💡 Tipp:** Das Spiel sucht vom aktuellen Stand aus den kürzesten Weg zum Ziel und zeigt den
nächsten Schritt (betroffene Figuren leuchten sanft, Hinweis-Satz).

**Rätsel-Landkarte (nach dem Lösen):** Alle erlaubten Situationen des Levels als kleine Inseln
(Punkte), verbunden durch mögliche Fahrten. Der **eigene Weg** ist bunt eingezeichnet, der
**kürzeste Weg** gestrichelt. Text: „Ein Computer probiert Schritt für Schritt alle Möglichkeiten
aus – zuerst alles, was 1 Fahrt weit weg ist, dann 2 Fahrten … So findet er sicher den kürzesten
Weg (Breitensuche).“

## Bedienung allgemein

- Maus, Touch und Tastatur (Pfeile/Tab zum Wählen, Enter zum Bewegen, Z = Zurück, H = Tipp).
- Menü mit Klang (Lautstärke, startet leise bei 30 %, stumm) und „Zur Insel-Karte“.
- Pause bei Fokusverlust; kein Doppeltipp-Zoom, kein Markieren (MANIFEST-AK-12).
- Nichts blinkt schneller als 2 Hz; keine Zeitlimits.

## Technik

- Reine Logik in TypeScript (Vitest): `logic/hanoi.ts` (Züge, Regeln, Lösung als rekursive
  Zug-Folge mit Aufgaben-Schachteln, Sterne), `logic/river.ts` (allgemeine Fluss-Rätsel: Figuren,
  Plätze/Gewicht, Ruderer, Regeln; Zustände, Fahrten, Breitensuche, Zustandsgraph),
  `logic/save.ts`.
- Grafik und Eingabe in Phaser 4 (wie die anderen Spiele), Test-Schnittstelle mit `?e2e`.

## Später

- Weitere Kapitel: Wiegen mit der Balkenwaage (falsche Münze finden), Wasserkrüge umfüllen,
  Labyrinth mit Breitensuche, Sortieren mit Pfannkuchen-Wenden, Brücken-Spaziergang.

## Akzeptanzkriterien

**Logik (Vitest)**

- **KI-AK-01** Pfannkuchen-Turm: nur oberster Pfannkuchen, nie groß auf klein; Ziel erkannt;
  Profi-Zahl 2ⁿ − 1 für 3–7; die erzeugte Lösung ist gültig und genau so lang; Sterne 3/2/1 nach
  den Grenzen; die Aufgaben-Schachteln der Zeitlupe passen zu den Zügen (Tiefe, Reihenfolge).
- **KI-AK-02** Helfer-Modus: Die Helfer-Züge tragen den Turm über dem größten Pfannkuchen regelgerecht
  auf den freien Teller, in 2ⁿ⁻¹ − 1 Zügen.
- **KI-AK-03** Fluss: Für alle 3 Level werden verbotene Lagen erkannt, Plätze/Gewicht und Ruderer
  geprüft; die Breitensuche findet die kürzesten Lösungen mit 7, 11 und 9 Fahrten; jede Lage im
  Zustandsgraph ist erlaubt; der Tipp führt von jeder erreichbaren Lage zum Ziel; Zurück stellt die
  vorige Lage genau wieder her.
- **KI-AK-04** Speichern: Sterne, Freischalten der Reihe nach und Klang überstehen Neuladen; kaputte
  Daten → Neustart ohne Absturz.

**Im Browser (Playwright)**

- **KI-AK-05** (E2E Desktop) Pfannkuchen-Turm Level 1 mit Klicks in 7 Zügen lösen → 3 Sterne; ein
  falscher Zug zeigt „Autsch!“ und ändert nichts; Zeitlupe startet und lässt sich anhalten.
- **KI-AK-06** (E2E Mobile) Fluss Level 1 durch Antippen lösen; eine falsche Fahrt (Fuchs mit Gans
  allein) zeigt den Hinweis und wird zurückgenommen; danach erscheint die Rätsel-Landkarte.
- **KI-AK-07** (E2E) Helfer-Modus in Level 2 (4 Pfannkuchen) bis zum Ziel; Tipp im Fluss-Level 2
  zeigt einen Schritt; keine Fehler in der Konsole; das Spiel erscheint im Portal mit Version 1.0.0.
- **KI-AK-08** Ruhig: keine Zeitlimits, nichts blinkt schneller als 2 Hz, Klang startet bei 30 %,
  Fokusverlust pausiert.
