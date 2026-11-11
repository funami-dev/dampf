# Spiel: Wichtelhaus

**Status:** Abgenommen
**Slug:** `wichtelhaus`

## Zweck

Ein kleiner **Wichtel** wohnt in einem Haus, das man im Querschnitt sieht (wie ein Puppenhaus). Er
lebt sein eigenes kleines Leben: kocht, schläft, macht Musik, bastelt, liest und spielt mit seinem
Haustier. Man **schaut zu und hilft** – füllt den Vorratsschrank, bringt Geschenke, klopft an und
bittet um etwas. Ein **beruhigendes** Spiel: kurz zwischendurch oder auch lange – es gibt kein Ende, keine Eile und
nichts, was man verpassen oder verlieren kann.

Eigenes Spiel im Genre „lebendiges Puppenhaus“ – ohne Namen, Figuren, Haus oder Aussehen eines
bestimmten bekannten Spiels. 2D-Pixelgrafik (Phaser), läuft auf älteren iPads, keine Bilddateien
(Grafik per Code), **leise Klänge per Web Audio erzeugt** (keine Audiodateien).

## Ruhe-Design (Calm Games und ASMR)

Grundlage sind Erkenntnisse aus der Forschung – mit Vorsicht, denn die Studien sind meist klein.
Das Spiel macht **keine Gesundheitsversprechen**.

- **ASMR:** Häufigste Auslöser sind Flüstern, persönliche Zuwendung, knisternde/klare Geräusche
  und langsame Bewegungen (Barratt & Davis 2015, Umfrage unter ca. 475 Personen). Bei Menschen, die
  ASMR empfinden, sank beim Anschauen die Herzfrequenz um etwa 3 Schläge/Min. (Poerio u. a. 2018,
  PLOS ONE). Umsetzung:
  - **Langsame, sorgfältige Handgriffe** in Nahansicht: Suppe umrühren, Haustier bürsten, Brief
    falten, Buchseiten umblättern, Bleistift spitzen, Pflanzen gießen.
  - **Persönliche Zuwendung:** Der Wichtel schaut ab und zu zum Spieler, winkt, „flüstert“ in
    kleinen, leisen Sprechblasen („Psst … das Igelchen schläft.“).
  - **Klare, sanfte Geräusche:** Rascheln, Klopfen, Bürsten, Knistern – leise und nie plötzlich.
- **Naturklänge:** Vogelgezwitscher und Plätschern halfen in einer Laborstudie, sich nach Stress
  schneller zu erholen als Verkehrslärm (Alvarsson u. a. 2010). Umsetzung: durchs Fenster leiser
  Regen, Vögel am Morgen, Grillen am Abend, Kaminfeuer-Knistern im Wohnzimmer.
- **Langsamer Atem-Rhythmus:** Langsames Atmen mit etwa 6 Atemzügen pro Minute steigert in
  mehreren kleinen Studien die Herzratenvariabilität. Umsetzung:
  - Ruhige Bewegungen (Atmen des Wichtels, Kerzenflackern, Wiegen der Bäume) laufen in Zyklen von
    etwa **10 Sekunden** (≈ 6 pro Minute).
  - Optionaler **Ruhemoment** „Atme mit dem Wichtel“: Er sitzt am Fenster, eine Laterne wird
    5 Sekunden heller (einatmen) und 5 Sekunden dunkler (ausatmen). Nie erzwungen, jederzeit beenden.
- **Cozy-Game-Regeln** (Erfahrungen aus Studien und Spielerbefragungen, Forschung noch dünn):
  kein Zeitdruck, keine Countdowns, keine Punkte, kein Verlieren, keine Pflicht-Aufgaben, keine
  Werbung oder Belohnungs-Druck („komm morgen wieder, sonst …“). Freundliche Rückmeldungen.
- **Bild:** warme, gedämpfte Farben, weiches Licht, keine harten Kontraste, **kein Blinken**
  (nichts schneller als 3 Mal pro Sekunde), weiche Überblendungen (1–2 s). Bei
  `prefers-reduced-motion` werden Bewegungen weiter verlangsamt.
- **Klang:** standardmäßig **leise** (30 %), Lautstärke-Regler und Stummschalter (gespeichert), Hinweis
  „Am schönsten mit Kopfhörern“. Keine Musik mit Schlagzeug/Beat; wenn Musik, dann langsame,
  leise Melodien des Wichtels im Musikzimmer.
- **Beschäftigung ohne Stress** für längere Besuche: kleine Ruhe-Tätigkeiten zum Antippen und
  Halten – Haustier bürsten, Pflanzen gießen, Bücher ins Regal sortieren, Fenster putzen –, jeweils
  mit sanftem Geräusch und ohne Bewertung.

## Der Wichtel

- **Beim ersten Start:** Name (max. 12 Zeichen), Mützenfarbe (6 Farben) und Haustier (Katze,
  Igel oder kleiner Drache). Danach immer derselbe Wichtel (gespeichert im Browser).
- **Charakter:** zufällig eine von vier Vorlieben – musikalisch, bastelt gern, liest gern,
  Langschläfer. Die Vorliebe macht die passende Tätigkeit etwas häufiger und glücklicher.
- **Bedürfnisse** (0–100, Anzeige als kleine Symbole mit Balken): 🍲 Hunger, 💤 Müdigkeit,
  😊 Spaß, 🧼 Sauberkeit. Sie sinken langsam; der Wichtel kümmert sich **selbst** darum, wenn er
  kann (geht essen, schlafen, baden, spielen).
- **Kein Bestrafen, kein Sterben:** Ist der Vorratsschrank leer und er hungrig, ist er nur
  traurig, sitzt am Tisch und sagt in einer Sprechblase „Ich habe Hunger …“.

## Das Haus (Querschnitt, 2 Etagen + Dachboden)

| Raum         | Was der Wichtel dort tut                             |
| ------------ | ---------------------------------------------------- |
| Küche        | kochen, essen (braucht Vorräte)                      |
| Bad          | baden, Zähne putzen                                  |
| Wohnzimmer   | lesen, mit dem Haustier spielen, Briefe schreiben    |
| Musikzimmer  | Flöte oder Klavier spielen (kleine Noten fliegen)    |
| Werkstatt    | basteln (fertige Bastelei steht danach im Regal)     |
| Schlafzimmer | schlafen                                             |
| Dachboden    | anfangs verschlossen, wird später frei (siehe unten) |

- **Hochformat** (Feedback `fb_4d0tejx6`): Ist der Spielbereich höher als breit, stehen nur 2 Räume
  pro Etage – dieselben 6 Räume auf **3 Etagen** plus Dachboden (unten Küche und Wohnzimmer, Mitte
  Werkstatt und Bad, oben Musikzimmer und Schlafzimmer). Im Querformat bleiben es 3 Räume auf
  2 Etagen. Das Haus füllt die Breite aus und steht unten auf der Wiese; das **Dach ist flach**
  genug, dass oben nicht viel leerer Himmel bleibt (Feedback `fb_96pg9w7f`).
- **Musikzimmer:** ein großes Klavier mit Tasten und Hocker; spielt der Wichtel, sitzt er davor
  und kleine Noten steigen auf.
- Er läuft sichtbar durch die Räume und nutzt die Treppe; das Haustier folgt ihm oder schläft.
- **Tag und Nacht** im Spiel: ein Spieltag dauert 6 Minuten; nachts ist das Haus dunkel, Fenster
  leuchten, der Wichtel schläft meist.
- **Fenster nach draußen:** Himmel, Bäume, Wetter (Sonne, Wolken, ab und zu Regen).

## Grafik (Feedback `fb_81lnbuac`)

- **Feinere Pixel-Art:** Ein Bildpunkt ist eine Haus-Einheit (ein Raum ist 120 bzw. 150 × 110
  Punkte groß), statt grober Blöcke. Pixel bleiben scharf (kein Weichzeichnen), es bleibt klar
  Pixel-Art, nur weniger grob.
- **Räume:** je Raum eine eigene Tapete mit leisem Muster, Holzdielen mit Maserung, Fußleiste.
  Fenster mit Rahmen, Sprossen und Gardinen; durchs Glas sieht man den Himmel (Tag, Abend, Nacht).
- **Möbel** mit Licht und Schatten (hellere Kanten oben, dunklere unten) und kleinen Details
  (Herdplatten, Buchrücken, Bettdecke mit Muster, Klaviertasten …).
- **Wichtel** mit Augen, Nase, Bart, Armen und Schuhen, Mütze in seiner Farbe; zwei Laufbilder.
  **Haustiere** (Katze, Igel, Drache) ebenso feiner gezeichnet.
- Nachts wird alles sanft gedimmt; ruhige Bewegungen wie bisher (Ruhe-Design gilt weiter).
- Alles per Code gezeichnet, keine Bilddateien. Bilder werden einmal erzeugt und nur verschoben,
  damit es auch auf älteren Handys ruhig läuft.

## Zuschauen und helfen

- **Vorratsschrank füllen:** Knopf „Einkaufen“ → Auswahl (Brot, Gemüse, Obst, Kuchen, Suppe);
  höchstens 10 Vorräte. Kuchen macht besonders glücklich, aber satt macht Suppe am meisten.
- **Geschenk bringen** (einmal pro Spieltag): Buch, Ball, Bastelholz, Blume. Geschenke stehen im
  Haus und werden benutzt.
- **Anklopfen / Bitten:** Knöpfe mit Bildern – „Spiel etwas vor!“, „Bastel etwas!“, „Lies vor!“,
  „Geh schlafen!“, „Spiel mit {Haustier}!“. Er macht es, wenn er Lust hat (abhängig von Bedürfnissen
  und Laune); sonst antwortet er freundlich, z. B. „Jetzt nicht, ich bin so müde …“.
- **Sprechblasen:** Er erzählt kurz, was er tut oder denkt („Mmh, Suppe!“, „Wo ist mein Ball?“).

## Briefe und Fortschritt

- **Briefe:** Etwa einmal pro Spieltag schreibt er einen kurzen Brief (Briefkasten-Symbol blinkt):
  „Danke für den Kuchen! Heute habe ich ein Lied gelernt.“ Gelesene Briefe landen in einer Mappe.
- **Freundschaft:** Kümmert man sich, steigt ein Herz-Wert. Bei bestimmten Stufen: Dachboden geht
  auf (mit Teleskop: nachts Sterne gucken), neue Möbel/Farben, ein zweites Haustier-Spielzeug.
- **Zeit ohne dich:** Kommt man nach einer Pause wieder, ist die Spielzeit höchstens **einen
  Spieltag** weitergelaufen (nicht mehr): Er hat etwas gebastelt oder geschrieben, Bedürfnisse
  sind gesunken, aber nie unter 20 %. „Schön, dass du wieder da bist!“

## Steuerung

- Maus/Touch: Knöpfe unten („Einkaufen“, „Geschenk“, „Anklopfen“, „Ruhemoment“, „Briefe“, 🔈),
  **auf kleinen Bildschirmen** (bis 600 px breit oder bis 450 px hoch) stattdessen ein runder **Menü-Knopf ☰ unten
  rechts**; er öffnet die fünf Aktionen als kleine Liste darüber, ein ungelesener Brief zeigt sich
  als Punkt am Menü-Knopf. Esc, ein Tipp daneben oder eine gewählte Aktion schließt die Liste
  (Feedback `fb_96pg9w7f`).
  Antippen eines Raums zoomt sanft hinein (nur Ansicht); Ruhe-Tätigkeiten durch Antippen und Halten.
- Tastatur: 1–4 für die Knöpfe, Esc schließt Menüs. Pause bei Fokusverlust. Kein Doppeltipp-Zoom.

## Später (nicht im ersten Schritt)

- **Besuche** anderer Wichtel über den Dampf-Server (wie Waldlager).
- Melodien selbst zusammenklicken; Jahreszeiten; Garten.

## Akzeptanzkriterien

**Logik (Vitest)**

- **WH-AK-01** Neuer Wichtel: Name (Standard „Wichtel“), Mützenfarbe, Haustier, eine Vorliebe;
  Bedürfnisse starten bei 80 %, gespeichert unter `dampf.wichtelhaus.v1`; kaputte Daten → neuer
  Wichtel ohne Absturz.
- **WH-AK-02** Bedürfnisse sinken mit der Zeit und bleiben zwischen 0 und 100; der Wichtel wählt
  bei niedrigem Wert die passende Tätigkeit selbst (Hunger → Küche, wenn Vorräte da sind; Müdigkeit
  → Schlafzimmer usw.); ohne Vorräte wird er traurig statt satt.
- **WH-AK-03** Einkaufen legt Vorräte an (max. 10); Essen verbraucht einen Vorrat und füllt Hunger
  je Sorte unterschiedlich.
- **WH-AK-04** Geschenk geht einmal pro Spieltag; Bitten werden je nach Laune angenommen oder
  freundlich abgelehnt (immer mit Antwort).
- **WH-AK-05** Abwesenheit: Beim Laden läuft höchstens ein Spieltag nach; Bedürfnisse fallen dabei
  nicht unter 20 %.
- **WH-AK-06** Briefe: etwa einer pro Spieltag, passend zu dem, was passiert ist; Freundschaft
  steigt durchs Kümmern und schaltet den Dachboden frei.

**Im Browser (Playwright)**

- **WH-AK-07** (E2E Desktop) Erster Start: Name, Mütze, Haustier wählen → Haus erscheint, der
  Wichtel läuft; Einkaufen füllt den Schrank; Neuladen behält alles.
- **WH-AK-08** (E2E) Anklopfen → „Spiel etwas vor!“ → Sprechblase mit Antwort; Brief lesen.
- **WH-AK-09** (E2E Mobile 375×667) Haus und Knöpfe sichtbar und bedienbar, kein Querscrollen.
- **WH-AK-13** (Vitest) Hausplan: Querformat 3 Räume × 2 Etagen, Hochformat 2 Räume × 3 Etagen;
  jeder der 6 Räume hat genau einen Platz, keine zwei Räume teilen sich einen; der Dachboden liegt
  über der obersten Etage; das Dach ist höchstens 75 % einer Etage hoch.
- **WH-AK-14** (E2E Mobile) Menü-Knopf: Die Knopfreihe ist versteckt, ☰ öffnet die Aktionen,
  „Einkaufen“ darüber funktioniert, die Liste schließt danach; am Desktop gibt es keinen Menü-Knopf.
- **WH-AK-15** (Vitest) Möbelplan: Jedes Möbelstück liegt in beiden Hausplänen (120 und 150
  Punkte breite Räume) ganz im Raum und überdeckt das Fenster nicht; der Wichtel ist höchstens
  44 Punkte hoch, alle Laufbilder sind gleich groß.
- **WH-AK-16** (E2E) Das Haus zeigt die neuen Bilder (Räume, Möbel, Wichtel, Haustier) ohne Fehler
  auf Desktop und Mobile.
- **WH-AK-10** Fokusverlust pausiert; Spiel erscheint im Portal mit Version 1.0.0.
- **WH-AK-11** Ruhe-Regeln (Vitest + E2E): keine Zeitlimits, kein Verlieren, keine Punkte; alle
  Leerlauf-Animationen haben Zyklen ≥ 4 s (Atmen/Laterne 10 s); nichts blinkt schneller als 3 Hz;
  Lautstärke startet bei 30 %, Stummschalten und Lautstärke bleiben nach Neuladen; bei
  `prefers-reduced-motion` laufen Animationen langsamer.
- **WH-AK-12** (E2E) Ruhemoment: Laterne wird 5 s heller und 5 s dunkler; „Fertig“ beendet ihn
  jederzeit. Ruhe-Tätigkeit „Haustier bürsten“ per Halten löst eine sanfte Animation aus.
