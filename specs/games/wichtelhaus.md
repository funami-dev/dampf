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

## Das Haus (Querschnitt, 3 Etagen + Dachboden)

| Raum         | Was der Wichtel dort tut                             |
| ------------ | ---------------------------------------------------- |
| Küche        | kochen, essen (braucht Vorräte)                      |
| Bad          | baden, Zähne putzen                                  |
| Wohnzimmer   | lesen, mit dem Haustier spielen, Briefe schreiben    |
| Musikzimmer  | Flöte oder Klavier spielen (kleine Noten fliegen)    |
| Werkstatt    | basteln (fertige Bastelei steht danach im Regal)     |
| Schlafzimmer | schlafen                                             |
| Dachboden    | anfangs verschlossen, wird später frei (siehe unten) |

- **Hausplan mit Treppenhaus** (Version 1.7, Wunsch im Chat; vorher Feedback `fb_4d0tejx6`):
  In der **Mitte des Hauses** läuft ein schmales **Treppenhaus** über alle Etagen. Links und rechts
  davon liegt je ein Raum: **2 Räume pro Etage auf 3 Etagen** plus Dachboden (unten Küche und
  Wohnzimmer, Mitte Werkstatt und Bad, oben Musikzimmer und Schlafzimmer) – im Hoch- und im
  Querformat gleich. Im Querformat stehen links und rechts neben dem Haus Bäume auf der Wiese.
  - Im Treppenhaus führen die Treppen im Zickzack von Etage zu Etage, oben eine Leiter zum
    Dachboden. **In den Räumen gibt es keine Treppen mehr.**
  - Der Wichtel wechselt die Etage immer durchs Treppenhaus und läuft dabei sichtbar die Stufen
    hinauf oder hinunter.
  - Das Haus füllt den Platz aus und steht unten auf der Wiese; das **Dach ist flach** genug, dass
    oben nicht viel leerer Himmel bleibt (Feedback `fb_96pg9w7f`).
- **Licht in jedem Raum** (Version 1.7, Wunsch im Chat): Jeder der 6 Räume hat eine Deckenlampe und
  an der Wand zum Treppenhaus einen kleinen Lichtschalter.
  - **Antippen eines Raums** schaltet sein Licht an oder aus (leiser Klick).
  - Nachts sind Räume ohne Licht dunkel, mit Licht warm erleuchtet; die Lampe hat einen weichen
    Lichtschein. Tagsüber glimmt nur die Lampe.
  - **Der Wichtel schaltet selbst:** Kommt er nachts wach in einen dunklen Raum, macht er Licht an
    („Ich mach mal Licht an.“). Geht er schlafen, macht er das Licht im Schlafzimmer aus („Licht
    aus – gute Nacht!“). Andere Lichter lässt er, wie sie sind.
  - Das Spiel merkt sich, welche Lichter an sind. Der Dachboden hat kein Licht (Sterne gucken).
  - **Fenster leuchten** (Version 1.8): Brennt nachts Licht, ist das Fensterglas warm getönt und
    ein weicher Schein liegt ums Fenster – man sieht von Weitem, wo Licht ist.
  - **Licht im Treppenhaus** (Version 1.8): Im Treppenhaus hängt je Etage eine kleine Wandlampe.
    Nachts geht sie weich an (1 s), sobald der Wichtel ins Treppenhaus kommt, und 4 s nachdem er
    es verlassen hat weich wieder aus. Tagsüber bleibt sie aus.
- **Musikzimmer:** ein großes Klavier mit Tasten und Hocker; spielt der Wichtel, sitzt er davor
  und kleine Noten steigen auf.
- Eine Tätigkeit beginnt erst, wenn er im Raum angekommen ist (der Weg zählt nicht mit).
- Er läuft sichtbar durch die Räume und nutzt das Treppenhaus; das Haustier folgt ihm oder schläft.
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

## Flugzeuge über dem Haus (Version 1.4, Feedback `fb_z3twq7pv`)

Das Wichtelhaus steht am Rand des **Flughafens Düsseldorf**. Über dem Haus zieht der **echte
Flugverkehr** vorbei – live, aber ruhig.

- **Datenquelle:** die offene Flugdaten-Schnittstelle **adsb.lol** (keine Flughafen-Webseite, kein
  Scrapen). Der Dampf-Worker holt die Flugzeuge im Umkreis von 15 km um den Flughafen höchstens
  alle 20 Sekunden für alle Spieler gemeinsam (zwischengespeichert) und gibt nur das Nötige weiter:
  Flugzeugtyp, Art (Sorte), Landung/Start/Überflug, Flugrichtung, Höhe. Keine Kennungen,
  Flugnummern oder Positionen werden weitergegeben. Im Spiel steht klein „Flugdaten: adsb.lol
  (ODbL)“.
- **Betriebsrichtung:** Die Bahnen in Düsseldorf zeigen nach 053° (Osten) und 233° (Westen). Aus den
  Richtungen der startenden und landenden Flugzeuge in Bahnnähe ergibt sich „Westbetrieb“ oder
  „Ostbetrieb“ (Mehrheit). Im Spiel ist links Westen, rechts Osten: Bei **Westbetrieb kommen die
  Flugzeuge von rechts** und fliegen nach links, bei Ostbetrieb umgekehrt. Landende sinken langsam
  über dem Haus, startende steigen.
- **Nachts** (Version 1.7, Wunsch im Chat) sieht man die Flugzeuge als matte, blaugraue Umrisse,
  halb durchsichtig wie vom Mond beschienen, dazu ihre ruhigen Positionslichter (kein Blinken).
  Antippen geht weiter.
- **Pixelgrafik (16-Bit-Stil)** je **Sorte**, jedem Typcode zugeordnet:
  Kurzstrecken-Jet (z. B. A320, B737), langer Kurzstrecken-Jet (A321, B739), Großraumjet (A330,
  A350, B787, B777), Jumbo mit vier Triebwerken (B747, A380, A340), Regionaljet (Embraer, CRJ),
  Propellermaschine (ATR, Dash 8), Kleinflugzeug, Hubschrauber; Unbekanntes als Kurzstrecken-Jet.
- **Ruhig:** höchstens 3 Flugzeuge gleichzeitig, klein und hoch über dem Haus, langsam (ein Überflug
  dauert 20–40 s), leises, gedämpftes Rauschen (folgt der Lautstärke, stumm = stumm). Nachts
  leuchten zusätzlich ruhige Positionslichter (rot links, grün rechts, kein Blinken).
- **Antippen** eines Flugzeugs: kleine Sprechblase, z. B. „Airbus A320 – Landung von Osten“.
- **Fluggesellschaft, Start und Ziel** (Version 1.5, Wunsch im Chat): Wenn bekannt, zeigt die
  Sprechblase auch die Fluggesellschaft und Start- und Zielort mit Land, z. B.
  „Eurowings · Airbus A320 – Landung von Osten · von Palma (Spanien) nach Düsseldorf
  (Deutschland)“. Der Worker leitet die Fluggesellschaft aus dem Kürzel der Flugnummer ab (Liste
  bekannter Gesellschaften) und fragt die Strecke je Flugnummer bei **adsbdb.com** (merkt sie
  sich eine Stunde). Im Spiel steht dann auch „Strecken: adsbdb.com“. Weitergegeben werden nur Name der Gesellschaft und
  Orte (Stadt, Land) – keine Flugnummer. Unbekanntes wird weggelassen.
- **Der Wichtel kommentiert** ab und zu (höchstens alle 2 Minuten) ein Flugzeug, passend zur Sorte:
  „Oh, ein großer Jumbo!“, „Ein Propellerflugzeug – das brummt so gemütlich.“, „Ein Hubschrauber!“
  – nur wenn er wach ist und nichts anderes sagt.
- **Flugzeuge beobachten** (Version 1.6, Feedback `fb_a17in8m7`): Beim Anklopfen gibt es
  „✈️ Schau mal die Flugzeuge!“. Er geht ans Fenster oben (mit freiem Dachboden ans Teleskop) und
  sagt etwas zum echten Flugzeug am Himmel, z. B. „Da! Ein Airbus A320 von Pegasus – der kommt
  aus Kayseri (Türkei)!“ oder bei einem Start „… – der fliegt nach Monastir (Tunesien). Gute
  Reise!“. Ist der Himmel leer: „Gerade ist der Himmel leer … vielleicht kommt gleich eins.“ –
  kommt dann eins, sagt er noch etwas. Nachts: „Nachts sehe ich nur die Umrisse und die Lichter – schön!“.
  Sehr müde (Energie unter 20 %) sagt er freundlich Nein. Macht etwas Spaß (+15 %).
- **Teleskop** (Version 1.9, Vorschlag im Chat angenommen): Ist der Dachboden offen, beobachtet der
  Wichtel die Flugzeuge durchs Teleskop. Dann erscheint oben ein runder **Teleskop-Blick** mit dem
  ersten Flugzeug groß (nachts als Umriss mit Lichtern) und seinem Namen darunter; er schließt
  sich, wenn er fertig ist. Nachts erkennt er durchs Teleskop trotzdem, was es ist: „Durchs
  Teleskop: ein rotes und ein grünes Licht – das ist ein Airbus A320 von Pegasus!“. Tagsüber
  beginnt sein Satz mit „Durchs Teleskop:“. Ohne Dachboden (Fenster) bleibt es wie bisher.
- **Flugzeugbuch** (Version 1.8): Tippt man ein Flugzeug an, kommt seine Sorte ins Flugzeugbuch
  (Knopf ✈️, „Flugzeugbuch“). Ist sie neu, sagt der Wichtel „Neu im Flugzeugbuch: Jumbo!“. Das
  Buch zeigt alle 8 Sorten – Kurzstrecken-Jet, Langer Jet, Großraumjet, Jumbo, Regionaljet,
  Propellerflugzeug, Kleinflugzeug, Hubschrauber – gesehene mit Bild, noch nicht gesehene als
  grauer Umriss mit „?“, dazu „3 von 8 gesehen“. Keine Punkte, kein Druck; gespeichert.
- **Ohne Live-Daten** (keine Verbindung, Störung, Nachtflugverbot) bleibt der Himmel leer; es
  werden keine ausgedachten Flugzeuge gezeigt.

## Zuschauen und helfen

- **Vorratsschrank füllen:** Knopf „Einkaufen“ → Auswahl (Brot, Gemüse, Obst, Kuchen, Suppe);
  höchstens 10 Vorräte. Kuchen macht besonders glücklich, aber satt macht Suppe am meisten.
- **Geschenk bringen** (Feedback `fb_4eg9mcaw`): **19 Geschenke** zur Auswahl – Buch, Ball,
  Bastelholz, Blume, Tasse Kakao, warme Socken, Muschel, Kerze, Malkasten, Flöte, Puzzle, Teddy,
  Schal, Glöckchen, Kekse, Sternkarte, Kreisel, Duftseife, Pflanze. **Jedes Geschenk einmal pro
  Spieltag** (schon geschenkte sind heute ausgegraut). Jedes hat eine kleine Wirkung (z. B. Kakao
  und Kekse gegen Hunger, Duftseife macht sauber, Socken/Teddy/Kerze/Schal geben etwas Energie,
  die anderen machen Spaß). Freundschaft: das erste Geschenk am Tag +2, jedes weitere weniger
  (+2 geteilt durch die Zahl der Geschenke heute). Blume (Vase auf dem Küchentisch), Pflanze
  (Fensterbank im Wohnzimmer) und Teddy (auf dem Bett) stehen danach sichtbar im Haus.
- **Anklopfen / Bitten:** Knöpfe mit Bildern – „Spiel etwas vor!“, „Bastel etwas!“, „Lies vor!“,
  „Geh schlafen!“, „Spiel mit {Haustier}!“, „Geh doch baden!“ (Feedback `fb_571tpi5c`; ist er
  schon ganz sauber: „Ich bin doch ganz sauber!“). Er macht es, wenn er Lust hat (abhängig von Bedürfnissen
  und Laune); sonst antwortet er freundlich, z. B. „Jetzt nicht, ich bin so müde …“.
- **Baden:** Er sitzt sichtbar in der Wanne, ruhige Schaumblasen steigen langsam auf.
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

- **Nur Bilder statt Schrift** (Version 1.7, Feedback `fb_0h1ppn9r`): Die fünf Aktionen sind runde
  Bild-Knöpfe 🧺 🎁 🚪 🕯️ ✉️ (ab 1.8 auch ✈️ Flugzeugbuch) ohne Text (der Name steht als Tooltip und für Vorleseprogramme dabei).
  Der Menü-Knopf unten rechts zeigt **den eigenen Wichtel** mit seiner Mützenfarbe statt ☰.
- **Statusanzeige klein unten links** (Feedback `fb_0h1ppn9r`): Bedürfnisse als kompaktes 2×2-Feld,
  darunter Tag, Freundschaft und 🔈 – oben bleibt der Himmel frei für die Flugzeuge. Die Quelle
  der Flugdaten steht klein oben links.
- Maus/Touch: Knöpfe unten (Einkaufen, Geschenk, Anklopfen, Ruhemoment, Briefe),
  **auf kleinen Bildschirmen** (bis 600 px breit oder bis 450 px hoch) stattdessen ein runder **Menü-Knopf ☰ unten
  rechts**; er öffnet die fünf Aktionen als kleine Liste darüber, ein ungelesener Brief zeigt sich
  als Punkt am Menü-Knopf. Esc, ein Tipp daneben oder eine gewählte Aktion schließt die Liste
  (Feedback `fb_96pg9w7f`).
  Antippen eines Raums schaltet dort das Licht an oder aus; Ruhe-Tätigkeiten durch Antippen und
  Halten.
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
- **WH-AK-04** Jedes der 19 Geschenke geht einmal pro Spieltag, mit eigener Wirkung; die
  Freundschaft steigt mit jedem weiteren Geschenk am selben Tag weniger; Bitten werden je nach Laune angenommen oder
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
- **WH-AK-13** (Vitest) Hausplan: in Hoch- und Querformat 2 Räume × 3 Etagen mit Treppenhaus
  genau in der Mitte des Hauses; jeder der 6 Räume hat genau einen Platz, keine zwei Räume teilen
  sich einen, kein Raum überdeckt das Treppenhaus; der Dachboden liegt über der obersten Etage;
  das Dach ist höchstens 75 % einer Etage hoch.
- **WH-AK-14** (E2E Mobile) Menü-Knopf: Die Knopfreihe ist versteckt, ☰ öffnet die Aktionen,
  „Einkaufen“ darüber funktioniert, die Liste schließt danach; am Desktop gibt es keinen Menü-Knopf.
- **WH-AK-15** (Vitest) Möbelplan: Jedes Möbelstück liegt in beiden Hausplänen (120 und 150
  Punkte breite Räume) ganz im Raum und überdeckt das Fenster nicht; der Wichtel ist höchstens
  44 Punkte hoch, alle Laufbilder sind gleich groß.
- **WH-AK-16** (E2E) Das Haus zeigt die neuen Bilder (Räume, Möbel, Wichtel, Haustier) ohne Fehler
  auf Desktop und Mobile.
- **WH-AK-17** Baden auf Bitte: „Geh doch baden!“ wird angenommen, wenn er nicht ganz sauber ist
  (unter 95 %), sonst „Ich bin doch ganz sauber!“; danach ist er im Bad und hinterher sauber
  (Vitest); im Spiel sitzt er in der Wanne (E2E).
- **WH-AK-18** (Vitest, Worker) Flugdaten aufbereiten: nur Flugzeuge im Umkreis von 15 km und unter
  3 000 m; Landung (sinkend), Start (steigend) oder Überflug; Betriebsrichtung aus den Kursen
  (Mehrheit nahe 233° → Westen, nahe 053° → Osten, sonst unbekannt); Typcodes → Sorte; keine
  Kennungen in der Antwort; kaputte oder leere Daten → leere Liste ohne Fehler.
- **WH-AK-21** (Vitest, Worker) Fluggesellschaft und Strecke: Kürzel bekannter Gesellschaften →
  Name (z. B. EWG → Eurowings, DLH → Lufthansa), unbekannt → keine Angabe; Strecken aus der
  Antwort von adsbdb.com → Start/Ziel mit Stadt und Land, unbekannte Flugnummer → keine Strecke; Flugnummern erscheinen nicht
  in der Antwort; fällt die Routen-Abfrage aus, kommen die Flugzeuge trotzdem (ohne Strecke).
- **WH-AK-22** (E2E) Antippen zeigt Fluggesellschaft und „von … nach …“, wenn bekannt.
- **WH-AK-23** (Vitest) Flugzeuge beobachten: Bitte angenommen (oben bzw. Dachboden), müde → Nein;
  Sätze für Landung mit Herkunft, Start mit Ziel, leeren Himmel und Nacht; danach mehr Spaß.
- **WH-AK-19** (Vitest, Spiel) Flugzeuge am Himmel: höchstens 3; Westbetrieb → von rechts nach
  links, Ostbetrieb → von links nach rechts; jede Sorte hat ein Bild und einen Wichtel-Kommentar;
  Kommentare höchstens alle 2 Minuten; keine Daten → kein Flugzeug.
- **WH-AK-20** (E2E) Mit Testdaten erscheinen Flugzeuge, Antippen zeigt Typ und Landung/Start,
  „Flugdaten: adsb.lol“ ist zu sehen; ohne Daten ist der Himmel leer; keine Fehler.
- **WH-AK-24** (Vitest) Licht: Umschalten an/aus je Raum, nicht für den Dachboden; neuer Wichtel
  ohne Licht; gespeichert und geladen, kaputte Daten → kein Licht. Der Wichtel macht nachts beim
  Ankommen in einem dunklen Raum Licht an (mit Satz), nicht tagsüber und nicht, wenn es schon
  brennt; geht er schlafen, macht er das Schlafzimmerlicht aus.
- **WH-AK-26** (E2E) Die Aktionen zeigen nur Bilder (kein Text im Knopf, Name als Tooltip); der
  Menü-Knopf zeigt ein Wichtel-Bild; die Statusanzeige liegt unten links (untere Bildhälfte, linkes
  Drittel) und ist höchstens 160 Punkte breit.
- **WH-AK-25** (E2E) Nachts einen Raum antippen schaltet sein Licht an, noch einmal antippen aus;
  nach Neuladen ist es so geblieben; der Wichtel läuft durchs Treppenhaus in eine andere Etage;
  nachts sind Flugzeuge zu sehen und antippbar; keine Fehler.
- **WH-AK-27** (Vitest) Treppenhaus-Licht: nachts im Treppenhaus geht es in 1 s an, bleibt nach
  dem Verlassen 4 s an und geht dann in 1 s aus; tagsüber bleibt es aus; Werte zwischen 0 und 1.
- **WH-AK-28** (Vitest) Flugzeugbuch: neue Sorte wird vermerkt (einmal, mit „neu“), bekannte nicht
  noch einmal; unbekannte Sorte wird ignoriert; gespeichert und geladen, kaputte Daten → leer.
  (E2E) Flugzeug antippen → Satz „Neu im Flugzeugbuch: …“; Flugzeugbuch zeigt „1 von 8 gesehen“
  und die Sorte; nach Neuladen bleibt sie.
- **WH-AK-29** (Vitest) Teleskop-Sätze: nachts mit Teleskop Lichter plus Name und Gesellschaft,
  tagsüber mit „Durchs Teleskop:“ davor; ohne Teleskop wie bisher; leerer Himmel wie bisher.
  (E2E) Mit offenem Dachboden und einem Flugzeug am Himmel zeigt „✈️ Schau mal die Flugzeuge!“
  den Teleskop-Blick mit dem Flugzeugnamen; danach schließt er sich.
- **WH-AK-10** Fokusverlust pausiert; Spiel erscheint im Portal mit Version 1.0.0.
- **WH-AK-11** Ruhe-Regeln (Vitest + E2E): keine Zeitlimits, kein Verlieren, keine Punkte; alle
  Leerlauf-Animationen haben Zyklen ≥ 4 s (Atmen/Laterne 10 s); nichts blinkt schneller als 3 Hz;
  Lautstärke startet bei 30 %, Stummschalten und Lautstärke bleiben nach Neuladen; bei
  `prefers-reduced-motion` laufen Animationen langsamer.
- **WH-AK-12** (E2E) Ruhemoment: Laterne wird 5 s heller und 5 s dunkler; „Fertig“ beendet ihn
  jederzeit. Ruhe-Tätigkeit „Haustier bürsten“ per Halten löst eine sanfte Animation aus.
