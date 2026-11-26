# Spiel: Knobel-Insel

**Status:** Abgenommen
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

## Tippen auf dem Handy (Version 1.4.1, Feedback `fb_rdbvwezt`)

Rückmeldung: Das Antippen ist auf dem Handy unzuverlässig, die Flächen sind zu klein.

- **Große Tippflächen:** Jedes antippbare Ding (Pfannkuchen-Teller, Figuren, Kekse, Waagschalen,
  Krüge, Teich, Frösche, Laternen, Pinguine, Lampen, Inseln, Blumen, Bahnstücke, Felder) reagiert in
  einem Bereich von mindestens **44 × 44 Bildschirmpunkten** um seine Mitte – auch wenn das Bild
  kleiner ist. Liegen zwei Dinge nah beieinander, gewinnt das, dessen Mitte am nächsten liegt.
- **Kein Wackeln mehr durch den Browser:** Auf der Spielfläche scrollt und zoomt der Browser nicht
  mit (`touch-action: none`), damit Ziehen (Labyrinth-Weg malen) und Tippen nicht abbrechen. Ein
  abgebrochener Zeiger (`pointercancel`) setzt nichts kaputt.
- **Kein Doppel-Tipp:** Ein Tipp löst genau eine Aktion aus (keine zusätzliche Maus-Nachahmung des
  Browsers). Mehrere Finger gleichzeitig werden ignoriert, nur der erste zählt.
- **Sichtbare Rückmeldung:** An der Stelle des Tipps erscheint kurz ein weicher Kreis (0,3 s), so
  sieht man, dass der Tipp ankam.

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

## Weitere Kapitel (Versionen 1.1 bis 1.4, Wunsch im Chat: „alle“)

Für alle Kapitel gilt wie bisher: süße 16-Bit-Pixelgrafik per Code, kein Zeitlimit, kein
Verlieren, Fehler werden freundlich gezeigt und lassen sich zurücknehmen; je Kapitel 3 Level
(leicht → knifflig), Sterne nach der Profi-Zahl (3 = bestmöglich, 2 = bis zum Anderthalbfachen,
sonst 1), „↺ Neu“, „💡 Tipp“ und am Ende eine Karte **„🤖 So denkt ein Computer“**. Level werden je
Kapitel der Reihe nach frei; das erste Level jedes Kapitels ist sofort offen.

**Insel-Karte mit Gegenden:** Die Insel wächst mit. Die Kapitel sind in vier Gegenden sortiert, je
mit eigener Farbe und eigenem Ort auf der Karte: **🔍 Suchen & Sortieren** (Küchenhütte, Markt),
**🧭 Wege & Netze** (Wald, Hügel), **🧩 Logik & Zustände** (Fluss, Teich) und **🔐 Codes & Muster**
(Leuchtturm). Unter der Karte eine Liste der Gegenden zum Aufklappen; jede zeigt ihre Kapitel mit
Leveln und Sternen. Pfannkuchen-Turm und Über den Fluss gehören zu „Logik & Zustände“.

### Version 1.1

**K3 · 🍪 Keks-Waage** (Suchen & Sortieren; Teile und herrsche)
Die Koch-Maus hat Kekse gebacken, einer ist aus Versehen mit doppelt Schokolade – etwas
schwerer. Kekse auf die linke oder rechte Waagschale ziehen (oder antippen und Schale antippen),
„⚖️ Wiegen“ lässt die Balkenwaage langsam kippen. Am Ende tippt man auf den Keks, den man für den
schweren hält. Level: 3 Kekse (1 Wiegung), 9 Kekse (2 Wiegungen), 12 Kekse, schwerer **oder**
leichter (3 Wiegungen). Die Profi-Zahl ist die Zahl der Wiegungen; wer richtig rät, aber mehr
wiegt, bekommt weniger Sterne; falsch geraten → „Fast! Wieg noch einmal.“ (kein Verlieren). Der
schwere Keks wird zufällig gewählt, die Prüfung ist ehrlich: Das Spiel hält sich nicht fest,
sondern antwortet so, dass immer noch alle Kekse möglich sind, die zu den bisherigen Wiegungen
passen (gemein-ehrlicher „Gegenspieler“) – dann zählt nur gutes Denken. Tipp: „Teile in drei
Gruppen!“ **Computer-Karte:** Teile und herrsche; jede Wiegung hat 3 Ausgänge, darum reichen 2
Wiegungen für 9 Kekse (3 × 3).

**K4 · 🐭 Käse-Labyrinth** (Wege & Netze; Breitensuche)
Iso-Pixel-Heckenlabyrinth. Man malt mit dem Finger (oder Pfeiltasten) einen Weg für die Maus zum
Käse; „🐭 Los!“ lässt sie laufen. Level: 7×7, 11×11 und 15×15 mit mehreren Wegen. Profi-Zahl = Länge
des kürzesten Wegs. „🌊 Zeig, wie der Computer sucht“: Von der Maus breitet sich eine farbige
Welle Feld für Feld aus (Schritt 1, 2, 3 … als Zahlen), bis sie den Käse erreicht, dann leuchtet der
kürzeste Weg rückwärts auf. **Computer-Karte:** Breitensuche – wie Wasser, das sich in alle
Richtungen gleichzeitig ausbreitet.

**K5 · 🥞 Pfannkuchen wenden** (Suchen & Sortieren; Sortieren mit einer Bewegung)
Ein unordentlicher Stapel des Koch-Bären soll nach Größe sortiert werden (groß unten). Einzige
Bewegung: Pfannenwender unter einen Pfannkuchen schieben (antippen) – alles darüber wird
umgedreht (schöne Wende-Animation). Level: 4, 6 und 8 Pfannkuchen, fester Startstapel je Level.
Profi-Zahl = kürzeste Wendezahl (per Breitensuche berechnet). Tipp: „Hol den größten nach oben,
dann wende ihn nach unten.“ **Computer-Karte:** Mit dieser Regel braucht man höchstens etwa
2 Wendungen je Pfannkuchen; die beste Zahl zu finden ist sogar für Computer schwer.

**K6 · 🔦 Brücke bei Nacht** (Logik & Zustände; Optimieren)
Iso-Nachtszene mit Mond, Glühwürmchen und einer wackeligen Hängebrücke. Hase (1 Min.), Igel
(2 Min.), Schildkröte (5 Min.) und Schnecke (10 Min.) müssen hinüber; höchstens zwei gleichzeitig,
und nur mit der einen Laterne. Zu zweit geht man im Tempo des Langsameren. Uhr zählt die Minuten.
Level: 3 Tiere (Ziel 8 Min.), 4 Tiere (Ziel 17 Min.), 5 Tiere mit Eule (Ziel 26 Min. – je nach
Zeiten, per Suche berechnet). Bedienung wie beim Fluss (Tiere zur Laterne tippen, „🔦 Los!“,
„↩ Zurück“). Über dem Ziel geht's weiter, nur weniger Sterne. **Computer-Karte:** Der
naheliegende Weg (der Schnellste begleitet jeden) ist nicht der beste; Computer probieren
geschickt alle Möglichkeiten.

### Version 1.2

**K7 · 💧 Wasserkrüge** (Logik & Zustände)
Am Teich: zwei (später drei) Krüge ohne Striche. Aktionen: füllen am Teich, ausgießen,
umschütten bis voll/leer. Ziel: genau x Liter für die Blumen. Level: 3 L + 5 L → 4 L; 4 L + 9 L →
6 L; 3 L + 5 L + 8 L, 8 L voll → zweimal 4 L. Profi-Zahl per Breitensuche; Rätsel-Landkarte wie
beim Fluss. **Computer-Karte:** Zustände durchsuchen.

**K8 · 🐸 Frosch-Hüpfen** (Logik & Zustände; Muster)
Seerosen in einer Reihe, links grüne, rechts braune Frösche, eine Seerose frei. Frösche hüpfen nur
vorwärts: auf die freie Nachbar-Seerose oder über genau einen Frosch. Ziel: Seiten tauschen.
Level: 1+1, 2+2, 3+3 (und 4+4 als Bonus). Profi-Zahl n² + 2n; steckt man fest, quakt ein Frosch
„Huch, festgehüpft!“ und „↩ Zurück“ hilft. **Computer-Karte:** Das Muster der Züge (1, 2, 3 … mal
abwechselnd) und warum es n² + 2n sind.

**K9 · 💡 Lichter aus** (Logik & Zustände)
Laternen im Iso-Dorf in einem Raster; Antippen schaltet die Laterne und ihre vier Nachbarn um.
Alle sollen aus sein. Level: 3×3, 4×4, 5×5 mit festen, lösbaren Startbildern. Profi-Zahl =
kleinste Zahl von Tipps (berechnet). **Computer-Karte:** Reihenfolge ist egal, zweimal tippen hebt
sich auf; „Licht jagen“ Reihe für Reihe.

**K10 · 🐧 Pinguin-Parade** (Suchen & Sortieren)
Pinguine auf einer Eisscholle sollen sich nach Größe aufstellen; man darf nur zwei Nachbarn
tauschen. Level: 5, 7, 9 Pinguine. Profi-Zahl = Zahl der Fehlstände (wenigste Nachbar-Tausche).
Danach „Wettrennen“: Bubblesort gegen ein schnelleres Verfahren (Einsortieren bzw. Mischen) bei
20 Pinguinen, als Animation mit Zähler. **Computer-Karte:** Verschiedene Sortierverfahren sind
verschieden schnell.

### Version 1.3

**K11 · 🦉 Orakel-Uhu** (Suchen & Sortieren; binäre Suche)
Der Uhu denkt sich eine Zahl (1–10, 1–100, 1–1000) und sagt „höher“ / „tiefer“. Eingabe per
Zahlenstrahl mit Schieber und Tastatur. Profi-Zahl 4, 7, 10 Fragen. Umgekehrt: Der Uhu errät deine
Zahl in höchstens 7 Fragen und denkt laut („Ich nehme die Mitte …“). **Computer-Karte:** Halbieren.

**K12 · 🃏 Zaubertrick mit Karten** (Codes & Muster; Binärzahlen)
Fünf Zauberkarten mit Zahlen 1–31. Man denkt sich eine Zahl und sagt bei jeder Karte „Ja, drauf“
oder „Nein“; der Zauber-Waschbär nennt die Zahl. Danach darf man den Trick selbst entdecken: Die
ersten Zahlen der Karten (1, 2, 4, 8, 16) werden addiert. Level: 3 Karten (1–7), 4 (1–15), 5
(1–31). Mitmach-Teil: selbst eine Zahl als Lämpchen-Reihe (an/aus) zeigen. **Computer-Karte:**
Binärzahlen – so speichert ein Computer alles.

**K13 · 🦉 Geheimschrift der Eule** (Codes & Muster)
Die Eule schickt kurze, freundliche Briefe in Geheimschrift (Verschiebung um k Buchstaben,
Drehscheibe zum Drehen). Level: Schlüssel steht dabei; Schlüssel unbekannt, aber ein Wort ist
verraten; Schlüssel finden mit Buchstaben-Häufigkeit (Balken, E ist am häufigsten). Man kann
selbst eine Nachricht verschlüsseln. **Computer-Karte:** Cäsar-Code und warum er leicht zu knacken
ist.

**K14 · 🐢 Schildkröten-Programm** (Codes & Muster; Schleifen)
Iso-Garten mit Raster. Aus Befehls-Kärtchen (⬆ vorwärts, ↻ rechts drehen, ↺ links drehen,
„🔁 n-mal wiederholen“) baut man ein Programm per Antippen/Ziehen; „▶ Start“ lässt die
Schildkröte laufen, der aktuelle Befehl leuchtet. Ziel: Salatblatt erreichen, ohne in Teiche zu
laufen. Level: 6, 8, 10 Felder weit; Profi-Zahl = wenigste Kärtchen (Wiederholen spart Kärtchen).
**Computer-Karte:** Programme sind Befehlsfolgen, Schleifen sparen Arbeit.

### Version 1.4

**K15 · 🌉 Brücken-Spaziergang** (Wege & Netze; Eulerwege)
Inseln und Brücken auf der Iso-Karte; man zieht mit dem Finger einen Weg, jede Brücke darf nur
einmal genutzt werden (benutzte Brücken werden bunt). Level: lösbar, lösbar nur mit dem richtigen
Start, unmöglich – dann fragt das Spiel: „Geht das überhaupt?“ mit Antwort „Nein, weil …“.
**Computer-Karte:** Zähle die Brücken je Insel: Mehr als zwei Inseln mit ungerader Zahl → unmöglich.

**K16 · 🐝 Bienen-Lieferdienst** (Wege & Netze; Rundreise)
Eine Biene startet am Stock, besucht alle Blumen und fliegt zurück. Man tippt die Blumen der Reihe
nach an; die Flugstrecke wird gezählt. Level: 4, 6, 8 Blumen; Profi-Zahl = kürzeste Rundreise
(alle Reihenfolgen durchprobiert). Danach Vergleich mit „immer zur nächsten Blume“ (gierig).
**Computer-Karte:** Bei vielen Blumen gibt es riesig viele Reihenfolgen – auch Computer brauchen
Tricks.

**K17 · 🚇 Murmelbahn-Netz** (Wege & Netze; minimaler Spannbaum)
Dörfer auf Hügeln; mögliche Murmelbahn-Stücke haben Holz-Kosten. Antippen baut ein Stück; alle
Dörfer sollen verbunden sein, mit möglichst wenig Holz. Level: 5, 7, 9 Dörfer. Profi-Zahl =
minimaler Spannbaum. „Zeig's mir“: immer das billigste Stück, das keinen Kreis schließt
(Kruskal), Schritt für Schritt. **Computer-Karte:** Gierig sein ist hier einmal genau richtig.

## Später

- Weitere Ideen nach Wunsch (z. B. Sudoku für Kinder, Wegfindung mit Gewichten).

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
  **Weitere Kapitel (Vitest je Kapitel, E2E je Version)**

- **KI-AK-09** Gemeinsam: Insel-Karte zeigt die vier Gegenden mit ihren Kapiteln; jedes Kapitel hat
  3 Level, die der Reihe nach frei werden; Speichern/Laden der neuen Sterne; jede Computer-Karte
  lässt sich nach dem ersten geschafften Level wieder öffnen.
- **KI-AK-10** Keks-Waage: Ergebnis einer Wiegung richtig; der ehrliche Gegenspieler lässt nach
  jeder Antwort nur Kekse übrig, die dazu passen; mit der besten Strategie reichen 1/2/3 Wiegungen,
  mit weniger ist der Keks nicht sicher zu finden.
- **KI-AK-11** Käse-Labyrinth: Labyrinthe haben einen Weg zum Käse; die Welle zeigt die richtigen
  Abstände; gemalte Wege nur über freie Nachbarfelder; Profi-Zahl = kürzester Weg.
- **KI-AK-12** Pfannkuchen wenden: Wenden dreht genau den oberen Teil; Startstapel sind lösbar;
  Profi-Zahl per Breitensuche; die Tipp-Regel löst jeden Stapel.
- **KI-AK-13** Brücke bei Nacht: Regeln (höchstens zwei, Laterne, Tempo des Langsameren);
  kürzeste Zeiten 8/17 und das berechnete Ziel für Level 3.
- **KI-AK-14** Wasserkrüge, Frosch-Hüpfen, Lichter aus, Pinguin-Parade: Regeln, lösbare Level,
  Profi-Zahlen (Breitensuche, n² + 2n, Fehlstände), Sortier-Wettrennen zählt richtig.
- **KI-AK-15** Orakel-Uhu, Zaubertrick, Geheimschrift, Schildkröten-Programm: Halbieren findet
  jede Zahl in der Profi-Zahl; Karten ergeben jede Zahl eindeutig; Ver- und Entschlüsseln sind
  umkehrbar, Häufigkeiten richtig; Programme laufen Schritt für Schritt, Schleifen werden richtig
  ausgeführt, Teiche stoppen die Schildkröte.
- **KI-AK-16** Brücken-Spaziergang, Bienen, Murmelbahn: Eulerweg-Prüfung (gerade/ungerade),
  kürzeste Rundreise durch Durchprobieren, minimaler Spannbaum (Kruskal) und Verbundenheit.
- **KI-AK-17** (E2E je Version) Jedes neue Kapitel: erstes Level durch Bedienen lösen (Desktop),
  ein Kapitel davon auch auf dem Handy; Computer-Karte erscheint; keine Fehler; kein Querscrollen.
- **KI-AK-18** (Vitest) Tippflächen: Die gemeinsame Treffer-Hilfe wählt bei mehreren Kandidaten
  den nächstgelegenen und trifft noch in 22 Bildschirmpunkten Abstand zur Mitte (bei jedem
  Maßstab), nicht aber weiter weg. (E2E Mobile) Die Spielfläche hat `touch-action: none`; ein Tipp
  18 Bildschirmpunkte neben einem Keks bzw. einer Figur wählt sie trotzdem; Labyrinth-Weg malen mit
  Touch-Zeigerereignissen funktioniert; ein Tipp löst genau eine Aktion aus.
- **KI-AK-08** Ruhig: keine Zeitlimits, nichts blinkt schneller als 2 Hz, Klang startet bei 30 %,
  Fokusverlust pausiert.
