# Spiel: Pilot Pro

**Status:** Umgesetzt
**Slug:** `pilot-pro`

## Zweck

3D-Flugsimulator zum **freien Fliegen** über einer vereinfacht nachgebauten Gegend rund um
Düsseldorf und Köln. Man wählt ein Flugzeug und eine Airline, startet auf der Startbahn in
Düsseldorf und fliegt, wohin man will. Kein Zeitdruck, keine Punkte, kein Absturz.

## Flugzeuge

Vier Typen, die sich **nur im Aussehen** unterscheiden (gleiches Flugverhalten):

| ID     | Name | Aussehen (vereinfachtes 3D-Modell)                              | Länge | Spannweite |
| ------ | ---- | --------------------------------------------------------------- | ----- | ---------- |
| `a320` | A320 | schmaler Rumpf, 2 Triebwerke                                    | 38 m  | 36 m       |
| `a321` | A321 | wie A320, aber längerer Rumpf                                   | 45 m  | 36 m       |
| `a340` | A340 | langer Rumpf, 4 Triebwerke                                      | 75 m  | 64 m       |
| `a380` | A380 | hoher, doppelstöckiger Rumpf (zwei Fensterreihen), 4 Triebwerke | 73 m  | 80 m       |

Die Typbezeichnungen werden nur beschreibend verwendet.

## Airlines und Lackierungen

Echte Airline-Namen, **keine Original-Logos und keine nachgebildeten Logos**. Jede Lackierung
besteht aus weißem Rumpf, dem Airline-Namen in einer neutralen Schrift am Rumpf und einem
Leitwerk in den typischen Farben der Airline mit einem **eigenen, schlichten Symbol**:

| ID                | Name            | Leitwerk (eigene Gestaltung)                                             |
| ----------------- | --------------- | ------------------------------------------------------------------------ |
| `lufthansa`       | Lufthansa       | dunkelblau, gelber Kreis                                                 |
| `emirates`        | Emirates        | rot-grün-weiß-schwarze Streifen                                          |
| `eurowings`       | Eurowings       | bordeauxrot mit türkisem Bogen                                           |
| `condor`          | Condor          | gelb-weiße Querstreifen                                                  |
| `british-airways` | British Airways | dunkelblau mit rot-weißen Wellenstreifen, dunkelblauer Bauch             |
| `la-compagnie`    | La Compagnie    | dunkelblau mit goldener Linie                                            |
| `us-airways`      | US Airways      | dunkelblau mit roten und weißen Streifen (Airline seit 2015 eingestellt) |

Jede Kombination aus Flugzeug und Airline ist möglich (4 × 7 = 28).

## Welt: Düsseldorf/Köln (vereinfacht)

- **Ausschnitt:** ca. 30 km × 50 km, Abstände gegenüber der Wirklichkeit etwa um die Hälfte
  verkürzt, damit die Ziele schnell erreichbar sind. Norden ist oben.
- **Flughafen Düsseldorf (Start):** zwei parallele Bahnen in echter Ausrichtung (ca. 053°/233°),
  Terminal, Tower. Start am Anfang der Bahn, Blick Richtung 233°.
- **Flughafen Köln/Bonn:** eine Landebahn, zum Landen und wieder Starten.
- **Rhein** als breites Band von Süden nach Norden, mit Brücken.
- **Wahrzeichen:** Rheinturm und Medienhafen (Düsseldorf), Kölner Dom (zwei Türme) und
  Hohenzollernbrücke (Köln).
- **Landschaft:** überwiegend flach, im Osten sanfte Hügel; Felder, Wälder, Häuserblocks als
  einfache, sich wiederholende Formen.
- **Himmel:** Tageslicht, einige Wolken.

## Szenen

1. **Auswahl:** Titel „Pilot Pro“, Flugzeugtyp (4 Buttons), Airline (7 Buttons), Vorschau des
   gewählten Flugzeugs (drehend), Button „Abheben!“.
2. **Fliegen:** 3D-Ansicht, Anzeigen (HUD), Touch-Steuerung, Buttons „Kamera“ und „Menü“.

## Flugmodell (vereinfacht, arcade-artig)

Alle Werte in Metern, Sekunden, Grad. Reine Logik in TypeScript, testbar ohne 3D.

- **Schub:** 0–100 %. Zielgeschwindigkeit = Schub × 240 m/s; die Geschwindigkeit nähert sich
  ihr mit 5 %/s an. Steigen kostet, Sinken bringt Geschwindigkeit (± 9,8 · sin(Nickwinkel)).
- **Am Boden:** Rollen in Blickrichtung, Bremse (Taste/Button) bremst mit 6 m/s². Lenken am
  Boden über Querruder-Eingabe (max. 10°/s). Abheben erst ab 75 m/s, wenn die Nase hochgezogen
  wird.
- **In der Luft:** Nicken bis ± 25°, Rollen bis ± 45°, mit 15°/s bzw. 40°/s. Lässt man los, kehrt
  das Flugzeug langsam in den Geradeausflug zurück (Rollen und Nicken gehen gegen 0).
- **Kurven:** Drehrate = g · tan(Rollwinkel) / Geschwindigkeit.
- **Strömungsabriss:** unter 60 m/s in der Luft senkt sich die Nase automatisch, bis wieder
  genug Fahrt da ist. Anzeige „Zu langsam!“.
- **Höhe:** maximal 12 000 m.
- **Unzerstörbar:** Berührt das Flugzeug außerhalb einer Landebahn den Boden oder das Wasser,
  wird es auf die Oberfläche gesetzt, waagerecht ausgerichtet und stark abgebremst. Es geht
  nichts kaputt; man kann (auch von dort) wieder Gas geben.
- **Landen:** Auf einer Landebahn aufsetzen = weich ausrollen. Keine Bewertung.
- **Weltgrenze:** Am Rand des Ausschnitts dreht das Flugzeug automatisch um 180° zurück
  (Meldung „Ende des Gebiets“).

## Steuerung

| Aktion           | Tastatur               | Touch                                  |
| ---------------- | ---------------------- | -------------------------------------- |
| Nase hoch/runter | ↓ / ↑ oder S / W       | Joystick links (oben/unten)            |
| Rollen / Kurve   | ← / → oder A / D       | Joystick links (links/rechts)          |
| Schub            | Bild↑/Bild↓ oder + / − | Schubhebel rechts (senkrechter Regler) |
| Bremse           | B (halten)             | Button „Bremse“                        |
| Kamera wechseln  | C                      | Button „Kamera“                        |
| Menü             | Esc                    | Button „Menü“                          |

Nase hoch = Joystick nach unten ziehen (wie im Flugzeug). Alle Bedienelemente liegen im
sicheren Bereich (MANIFEST-AK-08), der Joystick ist mindestens 120 px groß.

## Kamera

- **Verfolgersicht** (Start): hinter und etwas über dem Flugzeug, folgt weich.
- **Cockpitsicht:** Blick nach vorn aus der Flugzeugnase, Horizont neigt sich mit.
- Wechsel per Taste C oder Button „Kamera“.

## Anzeigen (HUD)

Geschwindigkeit (Knoten), Höhe (Fuß), Kurs (Grad), Schub (%), Steig-/Sinkrate. Dazu eine kleine
Karte mit Position, Flughäfen, Rhein und Wahrzeichen.

### Live-Karte aus OpenStreetMap (Feedback `fb_z06qblul`)

- Die kleine Karte zeigt echte **OpenStreetMap-Kacheln**, das Flugzeug immer in der Mitte, Norden
  oben, roter Pfeil = Kurs; sie folgt laufend dem Flug.
- **Umrechnung Spiel → echte Koordinaten:** linear je Achse so, dass die Flughäfen Düsseldorf
  (51,2895° N, 6,7668° O) und Köln/Bonn (50,8659° N, 7,1427° O) genau an ihrer echten Stelle
  liegen; dazwischen ist die Position nur ungefähr (die Spielwelt ist vereinfacht).
- **Große Karte:** Antippen/Klicken öffnet eine große Karte mit „+“, „−“ (Zoom 8–14) und
  „Schließen“; währenddessen ist der Flug pausiert.
- **Namensnennung** „© OpenStreetMap-Mitwirkende“ (Link auf openstreetmap.org/copyright) ist auf
  der kleinen und der großen Karte sichtbar.
- **Sparsam laden** (Nutzungsregeln von OpenStreetMap): Kacheln nur bei Bedarf, Zwischenspeicher
  im Browser, höchstens 4 gleichzeitig; Kachel-Adresse `https://tile.openstreetmap.org/{z}/{x}/{y}.png`.
- **Ohne Internet** (Kacheln laden nicht): die gezeichnete Karte (Rhein, Flughäfen, Wahrzeichen)
  bleibt sichtbar, kein Fehler, das Spiel läuft weiter.
- **Datenschutz-Hinweis** im Auswahl-Menü: „Die Karte kommt von OpenStreetMap – dabei sieht
  deren Server deine Internet-Adresse.“

## Technik

- **Ausnahme vom Tech-Stack:** 3D mit **Three.js** statt Phaser (Phaser ist 2D).
- Flugmodell, Welt-Daten (Positionen, Höhen) und Lackierungen als reines TypeScript,
  deterministisch testbar (`src/logic/`).
- Alle Modelle und Texturen werden per Code erzeugt (Low-Poly), keine Bilddateien von Dritten.
- Ziel: flüssig (≥ 30 fps) auf aktuellen Handys.

## Akzeptanzkriterien

- **PP-AK-01** Alle 4 Flugzeuge und 7 Airlines sind wählbar; jede der 28 Kombinationen
  erzeugt ein Modell mit dem Airline-Namen am Rumpf.
- **PP-AK-02** Lackierungs-Daten: jede Airline hat Name, Farben und ein eigenes Symbol; es
  werden keine Bilddateien verwendet.
- **PP-AK-03** Start: Flugzeug steht auf der Düsseldorfer Bahn, Kurs ≈ 233°, Geschwindigkeit 0.
- **PP-AK-04** Schub erhöht die Geschwindigkeit bis zur Zielgeschwindigkeit; Bremse verringert
  sie am Boden mit 6 m/s².
- **PP-AK-05** Unter 75 m/s hebt das Flugzeug nicht ab, darüber mit hochgezogener Nase schon.
- **PP-AK-06** Nick- und Rollwinkel sind begrenzt (± 25° / ± 45°) und kehren ohne Eingabe
  gegen 0 zurück.
- **PP-AK-07** Kurvenflug: Drehrate entspricht g · tan(Rollwinkel) / v.
- **PP-AK-08** Unter 60 m/s in der Luft senkt sich die Nase (Strömungsabriss).
- **PP-AK-09** Boden- oder Wasserberührung außerhalb einer Bahn: Flugzeug bleibt heil, steht
  auf der Oberfläche, waagerecht, langsam.
- **PP-AK-10** Die Höhe überschreitet nie 12 000 m; am Rand des Gebiets dreht das Flugzeug um.
- **PP-AK-11** (E2E Desktop) Auswahl → „Abheben!“ → mit Schub und Nase hoch abheben (Höhe > 0),
  Kamera wechseln mit C, Menü mit Esc.
- **PP-AK-12** (E2E Mobile 375×667) Joystick, Schubhebel, Kamera- und Bremse-Button sind
  vollständig sichtbar und bedienbar; Schubhebel erhöht die Geschwindigkeit.
- **PP-AK-13** Fokusverlust pausiert den Flug.
- **PP-AK-14** Umrechnung: Die Spielpositionen der beiden Flughäfen ergeben genau deren echte
  Koordinaten (±0,0001°); Kachel-Rechnung (Web-Mercator) stimmt für bekannte Punkte.
- **PP-AK-15** (E2E) Im Flug lädt die kleine Karte Kacheln von `tile.openstreetmap.org` rund um
  die Position und zeigt „© OpenStreetMap-Mitwirkende“; höchstens 4 Kacheln laden gleichzeitig.
  (Tests liefern Ersatzbilder, es geht nichts an die echten Server.)
- **PP-AK-16** (E2E) Antippen der Karte öffnet die große Karte, der Flug pausiert; „+“/„−“
  ändern den Zoom; „Schließen“ geht zurück.
- **PP-AK-17** (E2E) Schlagen die Kacheln fehl, bleibt die gezeichnete Karte sichtbar, ohne
  Seitenfehler; das Auswahl-Menü zeigt den Datenschutz-Hinweis.

## Nicht-Ziele (MVP)

- Keine Missionen, Punkte oder Landebewertung, kein Wetter, keine Nacht, kein Sound, keine
  Satellitenbilder, keine Original-Logos, kein Handy-Neigen.
