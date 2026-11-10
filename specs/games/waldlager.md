# Spiel: Waldlager

**Status:** Umgesetzt
**Slug:** `waldlager`
**Name:** „Waldlager“ (Arbeitstitel)

## Zweck

Ruhiges Überlebens- und Lagerspiel in einem **isometrischen Wald** im Pixel-Stil. Man hackt
Holz, baut sein **Zelt** und ein **Lagerfeuer**, sucht **Beeren** zum Essen und erlebt, wie es
**dämmert und dunkel wird**. Man spielt **allein**. Später können **andere über WebSocket in die
eigene Welt kommen**, sobald der Online-Server bereitsteht.

Kindgerecht: **Tiere werden nie verletzt oder getötet.** Es gibt keine Waffen und keine Aktion
gegen Tiere. Rehe und andere Waldtiere laufen nur herum. Man kann nicht sterben.

## Welt: eine Insel

- **Isometrische Kachelkarte** (2D, Phaser), **256 × 256 Felder**, aus einem **Seed**
  deterministisch erzeugt. Alle Grafiken werden per Code gezeichnet, es gibt keine Bilddateien.
- **Immer eine Insel:**
  - Rundum liegt **Meer**: mindestens 12 Felder breit an jedem Rand, danach erst Land.
  - Das Meer ist nicht begehbar und nicht zu überqueren. Es gibt dort keine Furten und keine
    Brücken.
  - Die Küste ist unregelmäßig, mit Buchten und Landzungen.
  - Mindestens 35 % der Karte sind Land.
- **Gelände auf der Insel:**
  - Strand (Sand) an der Küste.
  - Wiese und Waldboden.
  - **Wald** mit vielen Bäumen.
  - **Flüsse**, 3 bis 5, laufen vom Inland zum Meer. Sie sind nicht begehbar. Es gibt **keine
    fertigen Brücken**: Brücken muss man **selbst bauen** (siehe Tätigkeiten). Nur an **3–6 Stellen
    pro Insel** gibt es eine **steinige Furt** (Trittsteine, höchstens 4 Felder breit, mindestens
    25 Felder voneinander entfernt), über die man zu Fuß kommt (Feedback `fb_9bwz2s9o`).
  - **Kleine Seen** (Feedback `fb_ch2wfaa6`): 3–6 pro Insel, je 12–60 Felder groß, im Inland auf
    Wiese oder Waldboden, nie am Meer. Seen sind nicht begehbar, man kann **keine Brücken** darauf
    bauen. Wo ein See entsteht, stehen keine Bäume, Sträucher, Trümmer, Hütte oder Flugzeug, und er
    trennt keine begehbaren Gebiete voneinander. Wassertiere (Biber, Ente, Frosch …) leben auch an
    Seen. Auf der Funk-Karte sind Seen zu sehen.
  - **Fische** in Flüssen und Seen: An festen Fischstellen (je See 1–2, an Flüssen etwa alle 20
    Felder, immer gleich je Seed) sieht man alle paar Sekunden ruhig **Wasserringe** und kleine
    aufsteigende **Bläschen**. Fangen kann man sie noch nicht (kommt mit der Angel).
  - Ältere Spielstände: Steht man beim Laden in einem neuen See, landet man am nächsten freien
    Ufer; Zelte, Feuer und Pilze auf Seefeldern verschwinden.
  - **Hügel** in 2–3 Höhenstufen, als erhöhte Kacheln mit Kanten dargestellt und begehbar.
  - **Einige Berge** (Fels): nicht begehbar und nicht abbaubar. Auf jedem Felsfeld ragt ein
    Gipfel in einer von drei Höhen auf, der höchste mit Schnee – so sehen Berge hoch aus
    (Feedback `fb_owbtcbd8`).
  - **Baumarten** (Feedback `fb_5rohgojr`): Tanne, Kiefer, Laubbaum und Birke. Im Wald überwiegen
    Nadelbäume, auf Wiesen Laubbäume und Birken; Apfelbäume sind Laubbäume. Nur das Aussehen
    ändert sich, nicht die Regeln.
- **Meer und Fluss sehen verschieden aus:** Das Meer ist dunkler und hat Wellen am Strand.
- **Erreichbarkeit:**
  - Zwischen zwei Flüssen hängen alle begehbaren Felder zusammen.
  - Mit selbst gebauten Brücken über die Flüsse ist jede Stelle der Insel erreichbar, auch das
    Flugzeug.
  - Am Landeplatz gibt es genug Bäume für Holz: mindestens 10 im Umkreis von 15 Feldern.
- **Leistung:** Das Erzeugen der Welt dauert auf einem normalen Rechner höchstens 3 Sekunden.
  Während dessen steht „Die Insel entsteht …“. Gezeichnet wird nur der sichtbare Ausschnitt.
- **Alte Spielstände:** Spielstände mit einer anderen Kartengröße (96 × 96, 512 × 512) werden
  nicht übernommen. Man startet in einer neuen Insel-Welt. Das Tierbuch bleibt erhalten.

## Fallschirm-Landung

- **Beim Start einer Welt** und beim Beitreten als Gast schwebt man mit einem **Fallschirm**
  auf die Insel. Das dauert etwa 3 Sekunden; der Schirm ist in der eigenen Farbe. Danach geht
  es los.
- **Landeplatz:**
  - Für jede Spielerin und jeden Spieler ein **eigener, zufälliger** Ort.
  - Immer auf freiem, begehbarem Land, nicht im Wasser und nicht in Bäumen.
  - Mindestens 60 Felder vom Flugzeug entfernt.
  - Beerensträucher sind immer in der Nähe (höchstens 6 Felder).
- Der Landeplatz ist das „Zuhause“, solange man kein Zelt hat: Dort wacht man auf, wenn man vor
  Müdigkeit eingeschlafen ist.

## Das abgestürzte Flugzeug und das Funkgerät

- Irgendwo auf der Insel liegt **ein abgestürztes Flugzeug**:
  - ein **kleines einmotoriges Sportflugzeug** (Hochdecker: Flügel oben auf der Kabine, weiß mit
    farbigem Streifen) mit abgeknicktem Flügel und verbogenem Propeller, auf einer Brandstelle
    über mehrere Felder (Feedback `fb_90g9p14c`),
  - auf ebenem Land, ohne Logo, Marke oder echte Fluggesellschaft.
  - **Rauch:** Über dem Wrack steigt eine graue Rauchsäule auf (leicht vom Wind verweht), so hoch,
    dass man sie über den Bäumen schon von Weitem sieht; nachts glimmt die Brandstelle orange.
  - **Schneise:** Vom Wrack führt eine 30–40 Felder lange, etwa 3 Felder breite Schneise in die
    Richtung, aus der das Flugzeug kam (dieselbe Richtung wie die Trümmerspur). Der Boden ist
    angesengt; die Bäume darin sind umgeknickte, angekohlte Stämme: man kann hindurchlaufen, sie
    nicht hacken, und sie tragen keine Äpfel. Alle anderen Bäume, Sträucher und Trümmer bleiben,
    wo sie waren (Spielstände bleiben gültig).
  - Die Wrack-Felder sind nicht begehbar, man kann aber direkt daneben stehen.
- **Trümmerteile verraten den Weg:**
  - Beim Absturz sind **Trümmerteile** über die Insel verstreut: 15–25 Stück entlang einer Spur,
    die zum Wrack führt.
  - Die Teile liegen zwischen 10 und 90 Feldern vom Wrack entfernt, nahe am Wrack dichter. Sie
    liegen immer auf begehbarem Land.
  - Steht man an einem Trümmerteil, zeigt die Aktion „Trümmer ansehen“ einen Hinweis mit der
    **Himmelsrichtung** und der **ungefähren Entfernung**, z. B. „Ein Stück Flugzeug! Die Spur
    führt nach Nordosten – noch weit weg.“
  - Himmelsrichtungen beziehen sich auf den Bildschirm: Norden ist oben.
  - Entfernungen: „ganz nah“ (unter 20 Felder), „nicht mehr weit“ (unter 50), „noch weit weg“
    (darüber).
  - Trümmerteile blockieren den Weg nicht.
- **Funkgerät finden:**
  - Wer bis auf 2 Felder an das Wrack herankommt, findet ein **Funkgerät**.
  - Es erscheint einmal die Meldung „📻 Du hast im Flugzeug ein Funkgerät gefunden!“.
  - Jede Spielerin und jeder Spieler findet ein eigenes.
- **Das Funkgerät** gilt **pro Welt**: In einer neuen Welt und als Gast in einer fremden Welt muss
  man das Flugzeug erst finden. Nach Neuladen bleibt es erhalten.
- **Funk** (Button „Funk“ bzw. Taste F, nur mit Funkgerät sichtbar):
  - **Liste** aller Spieler in der Welt mit Namen und **Koordinaten**, z. B.
    „Ben · X 113 · Y 177“; die eigene Zeile ist hervorgehoben.
  - **Kleine Inselkarte** mit Küste, farbigen Punkten für alle Spieler und einem Symbol für das
    Flugzeug. Die Karte ist **wie das Spielbild gedreht** (Norden oben) und zeigt oben eine kleine
    Windrose (N/O/S/W) und die **Hütte 🏠** (immer, Feedback `fb_nqi67r2h`).
  - Koordinaten sind die Feldnummern: X und Y von 0 bis 255.
- Ohne Funkgerät gibt es keine Koordinaten und keine Karte. Man muss sich am Gelände orientieren.
- **Kompass** (Feedback `fb_nqi67r2h`): oben neben der Uhr, immer sichtbar, mit N/O/S/W (Norden =
  oben im Spielbild). **Mit Funkgerät** zeigt zusätzlich eine Nadel 🏠 die Richtung zur Hütte.

## Tiere entdecken (nie verletzbar)

Waldlager ist auch ein **Entdeckerspiel**: Auf der Insel leben **33 Tierarten**. Wer ein Tier zum ersten
Mal sieht, trägt es ins **Tierbuch** ein.

- Es gibt keine Aktion, die ein Tier verletzt, fängt, füttert oder tötet. Tiere blockieren den Weg
  nicht dauerhaft. Kommt man zu nah, laufen sie davon (Vögel, Fledermäuse und Schmetterlinge
  flattern weg).
- **Lebensraum:** Jede Art lebt dort, wo sie hingehört:
  - **Wald:** zwischen Bäumen.
  - **Wiese:** auf offenen Flächen.
  - **Wasser:** am Ufer, höchstens 3 Felder vom Fluss entfernt.
  - **Hügel:** auf Höhe 2 oder 3, auch am Fels.
- **Tageszeit:**
  - **Tagaktive** Tiere ruhen nachts, man sieht sie aber.
  - **Nachtaktive** Tiere sind nur in der Dämmerung und nachts unterwegs; tagsüber sind sie
    versteckt und nicht zu sehen.
- **Seltenheit:** häufig, selten, sehr selten. Seltene Arten gibt es nur ein- bis zweimal in einer
  Welt. Jede Art außer dem Einhorn kommt in jeder Welt mindestens einmal vor.
- **Der Hai** (sehr selten):
  - Ab und zu sieht man im Meer nahe der Küste eine **Haifischflosse**, die ihre Kreise zieht.
  - Ein Hai bleibt immer im Meer und kommt nie an Land; es gibt höchstens zwei auf der Karte.
  - Die Flosse ist nur etwa ein Drittel der Zeit über Wasser zu sehen, sonst taucht der Hai ab.
  - Er zählt für das Tierbuch, wenn man die Flosse sieht.
- **Das Einhorn** (sehr selten, magisch):
  - Zu Beginn jedes Spieltags gibt es mit 15 % Chance für diesen Tag ein Einhorn.
  - Es erscheint auf einer Lichtung weit weg von allen Spielern und schimmert leicht.
  - Es gibt höchstens eins gleichzeitig, und am Ende des Tages verschwindet es wieder.
  - **Regenbogenspur** (Feedback `fb_mdi16t2g`): Jedes Feld, über das das Einhorn läuft, bekommt
    eine kleine Regenbogenspur mit Glitzer. Sie bleibt **10 Minuten** sichtbar (ein Spieltag),
    verblasst in der letzten Minute und leuchtet auch nachts. Verschwindet das Einhorn, bleibt
    seine Spur bis zum Ablauf. Höchstens 300 Spurfelder (ältere gehen zuerst). Alle Spieler der
    Welt sehen die Spur; sie wird nicht gespeichert.
- Alle Tiere werden als Pixel-Grafiken per Code gezeichnet, keine Bilddateien.

### Arten

| Art             | Lebensraum | Zeit  | Seltenheit  |
| --------------- | ---------- | ----- | ----------- |
| Reh             | Wald       | Tag   | häufig      |
| Hase            | Wiese      | Tag   | häufig      |
| Fuchs           | Wald       | Tag   | häufig      |
| Eichhörnchen    | Wald       | Tag   | häufig      |
| Rothirsch       | Wald       | Tag   | selten      |
| Wildschwein     | Wald       | Tag   | häufig      |
| Dachs           | Wald       | Nacht | häufig      |
| Igel            | Wiese      | Nacht | häufig      |
| Baummarder      | Wald       | Nacht | selten      |
| Mauswiesel      | Wiese      | Tag   | häufig      |
| Biber           | Wasser     | Tag   | selten      |
| Fischotter      | Wasser     | Tag   | selten      |
| Wolf            | Wald       | Nacht | selten      |
| Luchs           | Hügel      | Nacht | sehr selten |
| Wildkatze       | Wald       | Nacht | selten      |
| Maulwurf        | Wiese      | Tag   | häufig      |
| Siebenschläfer  | Wald       | Nacht | häufig      |
| Fledermaus      | Wald       | Nacht | häufig      |
| Waldkauz        | Wald       | Nacht | häufig      |
| Uhu             | Hügel      | Nacht | selten      |
| Buntspecht      | Wald       | Tag   | häufig      |
| Eichelhäher     | Wald       | Tag   | häufig      |
| Rotkehlchen     | Wiese      | Tag   | häufig      |
| Graureiher      | Wasser     | Tag   | häufig      |
| Stockente       | Wasser     | Tag   | häufig      |
| Grasfrosch      | Wasser     | Tag   | häufig      |
| Feuersalamander | Wald       | Nacht | selten      |
| Ringelnatter    | Wasser     | Tag   | selten      |
| Hirschkäfer     | Wald       | Nacht | selten      |
| Zitronenfalter  | Wiese      | Tag   | häufig      |
| Hai             | Meer       | Tag   | sehr selten |
| Einhorn         | Wiese      | Tag   | sehr selten |

Zu jeder Art gibt es im Tierbuch einen kurzen, kindgerechten Satz (z. B. „Der Igel rollt sich
bei Gefahr zu einer stacheligen Kugel zusammen.“).

### Entdecken und Tierbuch

- **Entdeckt** ist ein Tier, wenn die eigene Figur ihm nahe kommt:
  - tagsüber bis 5 Felder,
  - nachts bis 3 Felder oder im Lichtkreis eines brennenden Feuers.
- **Beim ersten Mal** je Art erscheint die Meldung „Neu entdeckt: Igel!“, beim Einhorn
  „✨ Ein Einhorn! ✨“. Danach kommt für diese Art keine Meldung mehr.
- **Tierbuch** (Menüpunkt „Tierbuch“, Taste T):
  - Liste aller 33 Arten mit Zähler, z. B. „12 / 33 entdeckt“.
  - **Entdeckte Arten:** Bild, Name, Lebensraum, Tageszeit und der kurze Satz.
  - **Unentdeckte Arten:** dunkle Silhouette und „???“, dazu nur ein Hinweis auf Lebensraum und
    Tageszeit (z. B. „Nachts im Wald“). Beim Einhorn steht nur „Sehr selten …“.
  - **Gerade aktiv?** (Feedback `fb_axcsy5zh`) Jeder Eintrag (außer dem unentdeckten Einhorn)
    zeigt, ob die Art **jetzt** unterwegs ist, passend zur Tageszeit im Spiel:
    - Tagaktive Tiere sind morgens, tagsüber und in der Dämmerung unterwegs, nachtaktive in der
      Dämmerung und nachts.
    - Text: „🟢 Jetzt unterwegs“ bzw. „💤 Schläft gerade“.
    - Beim Hai zählt, ob die Flosse gerade über Wasser ist: „🟢 Flosse ist gerade zu sehen“ bzw.
      „🌊 Gerade abgetaucht“.
  - **Suchfeld** „Tier suchen“ über der Liste (Feedback `fb_jmxcmomo`): Beim Tippen zeigt die
    Liste nur noch entdeckte Arten, deren Name den Text enthält (Groß-/Kleinschreibung egal,
    z. B. „hase“ → Hase). Unentdeckte Arten werden beim Suchen ausgeblendet, damit die Suche
    nichts verrät. Passt nichts: „Kein entdecktes Tier heißt so.“ Leeres Feld zeigt wieder alle.
    Der Zähler „12 / 33 entdeckt“ bleibt unverändert.
- **Das Tierbuch gehört der Spielerin bzw. dem Spieler, nicht der Welt.** Es bleibt bei „Neue Welt“
  erhalten und wird auch als Gast in fremden Welten weitergeführt. Im Mehrspieler entdeckt jeder
  für sich.

## Spielfigur

- Beim Start wählt man **Name** (max. 12 Zeichen) und **Farbe**: eine von 6 Jacken-Farben oder
  über den **Farbwähler** „Eigene Farbe“ jede beliebige Farbe (Feedback `fb_1hogxvcy`).
  - Farben sind immer `#rrggbb` (klein geschrieben). Andere Werte lehnen Spielstand und
    Mehrspieler-Nachrichten ab (Spielstand: dann erste Jacken-Farbe).
- Die Figur läuft in 8 Richtungen. **Rennen** ist schneller und kostet Fitness.

## Zustand („Health-Leiste“)

Drei Leisten von 0 bis 100 % stehen immer oben im Bild:

| Leiste        | sinkt …                                                                              | steigt …                                                           |
| ------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| **Hunger**    | langsam mit der Zeit (voll → leer in ca. 12 Min.)                                    | Essen: Pilz +8 %, Beere +12 %, Apfel +20 %, Dose +35 %             |
| **Müdigkeit** | mit der Zeit, nachts doppelt so schnell                                              | Schlafen im eigenen Zelt (schnell); am Lagerfeuer sitzen (langsam) |
| **Fitness**   | beim Rennen (voll → leer in ca. 30 s), Holzhacken (2,5 % je Hieb), leicht beim Gehen | beim Stehen und Schlafen, am Lagerfeuer schneller                  |
| **Wärme**     | nachts und in der Dämmerung draußen ohne Feuer (ca. 2,5 Min.)                        | am Feuer schnell, beim Schlafen, tagsüber                          |

(Bei „Müdigkeit“ bedeutet 100 % ausgeruht und 0 % todmüde.)

**Kein Sterben.** Ist eine Leiste leer:

- **Hunger 0:** Man läuft nur noch langsam, Hinweis „Du hast Hunger – such Beeren!“.
- **Müdigkeit 0:** Man schläft ein und wacht am eigenen Zelt auf, oder am Startpunkt, wenn es
  noch kein Zelt gibt. Die Müdigkeit steht danach bei 50 %. Nichts geht verloren.
- **Fitness 0:** Rennen und Hacken gehen nicht, bis Fitness wieder 20 % erreicht.

**Schwäche** (Feedback `fb_xqyh0ytu`):

- **Wenig Fitness macht langsam:** unter 25 % läuft man mit 80 % des Tempos, unter 10 % mit 60 %.
  Hunger 0 ergibt ebenfalls 60 %. Es zählt die stärkere Bremse, nicht beides zusammen.
- **Hunger zehrt an der Fitness:** Ist Hunger unter 25 %, kosten Rennen und Holzhacken doppelt so
  viel Fitness, und Fitness erholt sich nur halb so schnell.

## Tätigkeiten

- **Holz hacken:** An einem Baum die Aktionstaste mehrmals drücken bzw. halten. Ein Baum gibt
  3 Holz und wird zum Baumstumpf. Nach einem Spieltag wächst er nach. Nur Holz hacken, keine
  anderen Werkzeuge.
- **Beeren pflücken:** Ein Strauch hat 4 Beeren. Pflücken legt sie ins Inventar. Essen geht per
  Taste bzw. Button „Essen“. Leere Sträucher füllen sich nach einem halben Spieltag wieder.
- **Zelt aufbauen:** kostet 8 Holz, auf einem freien, ebenen Feld. Jeder Spieler hat **ein**
  Zelt, ein neues ersetzt das alte. Im Zelt kann man schlafen.
- **Brücke bauen:** kostet **3 Holz je Brückenfeld**.
  - Gebaut wird auf dem Flussfeld vor der Figur, also auf Wasser im Fluss, nicht im Meer.
  - Die Flüsse sind 2–3 Felder breit, eine Brücke braucht also 2–3 Stücke. Man baut Stück für
    Stück und läuft dabei auf die schon gebaute Brücke hinaus.
  - Brücken bleiben stehen und gehören allen; im Mehrspieler sehen alle sie.
  - Im Bau-Menü steht „Brücke (3 Holz)“, Taste 3.
- **Lagerfeuer bauen:** kostet 3 Holz. Es brennt 3 Minuten, jedes nachgelegte Holz gibt
  +2 Minuten. Am Feuer sitzen erholt Fitness und Müdigkeit. Das Feuer **leuchtet nachts**.
- **Inventar:** Holz (max. 30), Beeren, Äpfel, Pilze, Dosen und Fische (je max. 20).
- **Werkzeuge** (Feedback `fb_ch2wfaa6`): Im Inventar gibt es eine Werkzeug-Zeile. Die **Axt** 🪓
  hat man von Anfang an. Eine **Angel** 🎣 baut man aus 5 Holz (Bau-Menü „Angel (5 Holz)“,
  Taste 4); jeder hat höchstens eine, sie übersteht Neuladen.
- **Angeln:** Mit Angel an einer Fischstelle (Wasserringe, höchstens 2,5 Felder weit) heißt die
  Aktion „Angeln“ und gibt **1 Fisch** 🐟. Danach ruht die Stelle einen halben Spieltag (keine
  Ringe, kein Fang), dann sind die Fische zurück. Ohne Angel steht dort nichts zum Angeln.
  Fisch ist Essen (+30 % Hunger) und erscheint in der Essen-Auswahl. Im Mehrspieler angeln Gäste
  genauso; ruhende Stellen sehen alle.

### Die verlassene Hütte und mehr Essen (Feedback `fb_h8wy9ca4`)

- **Verlassene Hütte:** Auf jeder Insel steht **genau eine** kleine Holzhütte im Wald bzw. auf
  einer Wiese, mindestens 40 Felder vom Inselmittelpunkt und 15 Felder vom Flugzeug entfernt, vom
  Landeplatz aus zu Fuß (ggf. mit Brücken) erreichbar. Man kann nicht durch sie hindurchlaufen.
  - Kommt man zum ersten Mal auf 4 Felder heran: Meldung „Eine verlassene Hütte! In der Kiste
    ist vielleicht etwas zu essen.“
  - **Vorratskiste:** „Kiste öffnen“ gibt 2 Dosen 🥫 (solange Platz ist). Danach ist die Kiste
    leer und füllt sich nach einem Spieltag wieder.
  - **Schlafen in der Hütte** geht wie im Zelt („In der Hütte schlafen“), wenn die Kiste leer ist
    oder man keinen Platz mehr hat.
- **Apfelbäume:** Etwa jeder zehnte Baum ist ein Apfelbaum (rote Punkte in der Krone).
  „Äpfel schütteln“ gibt 2 Äpfel; danach hängen nach einem halben Spieltag neue Äpfel dran.
  Solange Äpfel dran sind, kommt beim Apfelbaum zuerst „Äpfel schütteln“, danach „Holz hacken“.
- **Pilze:** Auf Waldfeldern wachsen Pilze (auf einer 256er-Insel etwa 60). „Pilz sammeln“ nimmt
  einen; nach einem halben Spieltag wächst irgendwo im Wald ein neuer.
- **Essen:** Hat man nur eine Sorte dabei, isst „Essen“ (Taste Q) sie direkt. Bei mehreren Sorten
  erscheint eine Leiste mit den Sorten und ihrer Anzahl (z. B. „🍎 Apfel (2)“, Tasten 1–4);
  „✕“ schließt sie. Ohne Essen: „Nichts zu essen dabei – such Beeren, Äpfel oder Pilze!“
- **Anzeige oben:** 🪵 Holz und 🫐 Beeren wie bisher, dazu 🍎, 🍄 und 🥫, sobald man davon etwas hat.
- **Mehrspieler und Speichern:** Hütte, Äpfel und Pilze sehen alle; Gäste essen ihre eigenen
  Vorräte. Inventar, Kiste, Äpfel und Pilze werden gespeichert.

## Tag und Nacht

- **Ein Spieltag dauert ca. 10 Minuten:** Morgen 0,5 Min., Tag 5,5 Min., Dämmerung 1 Min.,
  Nacht 3 Min.
- Die Uhr wird als Sonne bzw. Mond mit Spielzeit angezeigt (z. B. „19:30“).
- **Licht:** Die Dämmerung färbt die Welt orange-blau. Nachts wird es dunkel. Rund um Lagerfeuer
  (groß) und Spielfigur (klein, „Laterne“) bleibt es hell.
- **Schlafen** im Zelt erholt die Müdigkeit schnell. Allein läuft die Nacht beim Schlafen
  4-mal so schnell. Mit anderen Spielern läuft die Zeit nur schneller, wenn alle schlafen.

## Mehrspieler: jede Welt ist offen

- **Allein spielen geht immer**, auch ohne Internet bzw. ohne Server.
- **Jede Welt ist automatisch offen:**
  - Sobald man spielt und der Server erreichbar ist, ist die eigene Welt für alle anderen
    sichtbar. Man ist dort **Gastgeber**.
  - Es gibt keinen Knopf „Welt öffnen“ mehr.
  - Oben rechts steht klein „Online · 2“, also die Zahl der Spieler in der Welt.
- **Liste offener Welten im Hauptmenü:**
  - Unter „Offene Welten“ stehen alle laufenden Welten.
  - Jeder Eintrag zeigt den Namen des Gastgebers, z. B. „Mias Welt“, und die Namen aller
    Spieler darin, z. B. „Mia, Ben“ mit „2 / 6“.
  - Die Liste aktualisiert sich alle 5 Sekunden.
  - Volle Welten (6 Spieler) sind sichtbar, aber nicht wählbar. Die eigene Welt erscheint nicht
    in der Liste.
  - Antippen und „Beitreten“ wählen; einen Code muss man nicht mehr eingeben.
- **Hinweis zum Namen:** Unter dem Namensfeld steht „Dein Name ist für alle sichtbar – nimm
  einen Spitznamen.“
- **Gastgeber führt die Welt:**
  - Sein Browser berechnet Zeit, Bäume, Sträucher, Tiere, Zelte und Feuer und schickt den Stand
    an alle.
  - Gäste schicken ihre Bewegungen und Aktionen.
  - Jeder sieht die anderen mit Name und Farbe.
- **Gemeinsam:** Bäume, Beeren und Lagerfeuer gehören allen. Jeder hat sein eigenes Zelt,
  Inventar und eigene Leisten.
- Verlässt der Gastgeber die Welt, sehen die Gäste den Hinweis „Der Gastgeber hat die Welt
  verlassen“ und kommen zurück zum Menü.
- **Als Gast** ist die eigene Welt solange nicht offen. Im Menü gibt es „Welt verlassen“; danach
  spielt man in der eigenen Welt weiter, und die ist wieder offen.
- **Ohne Server:** Ist kein Server eingerichtet, gibt es keine Liste und keine Online-Anzeige. Ist
  der Server nicht erreichbar, steht in der Liste „Online gerade nicht möglich – spiel einfach
  allein weiter.“ Das Spiel versucht es im Hintergrund alle 30 Sekunden erneut.

## Online-Server (WebSocket)

- Ein kleiner **Raum-Server** liegt im Repo unter `services/relay` und wird auf **Cloudflare
  Workers** betrieben (je Raum ein Durable Object).
- **Aufgaben des Servers:**
  - Raum-Codes vergeben (intern, als Kennung der Welt).
  - Nachrichten zwischen Gastgeber und Gästen weiterleiten.
  - Räume schließen, wenn der Gastgeber geht.
  - **Liste offener Welten:**
    - `GET /rooms` liefert Code, Gastgeber-Name, Spieler-Namen und Anzahl.
    - Die Namen meldet der Gastgeber selbst (`meta`-Nachricht), höchstens 12 Zeichen je Name,
      Steuerzeichen werden entfernt.
    - Höchstens 50 Welten, die neuesten zuerst.
    - Eine Welt erscheint erst, wenn ihr Gastgeber den Namen gemeldet hat.
- **Keine Spiellogik** auf dem Server, keine Konten, keine gespeicherten Daten.
- **Grenzen:**
  - max. 6 Verbindungen je Raum,
  - max. 20 Nachrichten pro Sekunde je Verbindung,
  - max. 16 KB je Nachricht.
- Die **Raum-Logik** ist reines TypeScript und testbar. Für lokale Entwicklung und E2E-Tests
  läuft dieselbe Logik als Node-WebSocket-Server.
- **Veröffentlichen** per `wrangler deploy` (Cloudflare-API-Token mit „Workers Scripts: Edit“)
  als Worker `dampf`, erreichbar unter `wss://dampf.dw-a6b.workers.dev`. Die Adresse steht als
  `VITE_RELAY_URL` in `games/waldlager/.env.production` und kommt so in den Vercel-Build. Fehlt
  sie, wird nur allein gespielt.

## Speichern

`localStorage` (`dampf.waldlager.v1`): eigene Welt (Seed, gefällte Bäume, Zelt, Feuer,
Tageszeit), Inventar, Leisten, Name und Farbe. Kaputte oder fehlende Daten führen zu einer
neuen Welt ohne Absturz. Als Gast wird nichts von der fremden Welt gespeichert.

Das **Tierbuch** steht getrennt unter `dampf.waldlager.tierbuch.v1` (Liste entdeckter Arten). Es
wird auch als Gast gespeichert. Kaputte Daten ergeben ein leeres Tierbuch.

## Steuerung

| Aktion                                                      | Tastatur              | Touch                                 |
| ----------------------------------------------------------- | --------------------- | ------------------------------------- |
| Laufen                                                      | W A S D / Pfeiltasten | Joystick links                        |
| Rennen                                                      | Umschalt halten       | Joystick ganz ausgelenkt              |
| Aktion (hacken, pflücken, schlafen, sitzen, Holz nachlegen) | E / Leertaste         | Button „Aktion“ (zeigt, was passiert) |
| Essen                                                       | Q                     | Button „Essen“                        |
| Bauen (Zelt / Feuer)                                        | B                     | Button „Bauen“                        |
| Menü                                                        | Esc                   | Button „Menü“                         |

Alle Bedienelemente liegen im sicheren Bereich (MANIFEST-AK-08). Bei Fokusverlust pausiert das
Spiel. Allein hält dabei auch die Zeit an. Mit anderen läuft die Welt weiter, und die eigene
Figur steht.

## Technik

- **Engine:** Phaser 4 und Vite, isometrische Darstellung im Pixel-Stil.
- **Logik als reines TypeScript, testbar:**
  - Weltgenerator, Kollision und Erreichbarkeit,
  - Leisten, Tätigkeiten und Bauen,
  - Tag und Nacht,
  - Tiere (nur Wandern und Fliehen),
  - Speichern,
  - Netzwerk-Protokoll.
- **Netzwerk:** JSON-Nachrichten mit Versionsnummer. Der Gastgeber schickt etwa 10 Zustands-
  Updates pro Sekunde. Gäste schicken ihre Position etwa 10-mal pro Sekunde und Aktionen sofort.

## Akzeptanzkriterien

- **WL-AK-01** Welt:
  - Gleicher Seed ergibt die gleiche Welt, und sie ist 256 × 256 Felder groß.
  - Es ist eine Insel: Alle Randfelder in 12 Feldern Breite sind Meer, und mindestens 35 % der
    Karte sind Land.
  - Es gibt Strand, Wiese, Wald, 3–5 Flüsse, Hügel und Berge.
  - Es gibt keine fertigen Brücken; nur 3–6 steinige Furten (WL-AK-50).
  - Zählt man Flussfelder als überbrückbar, hängen alle begehbaren Felder zusammen.
  - Das Erzeugen dauert höchstens 3 Sekunden.
- **WL-AK-02** Kollision: Wasser (außer gebauten Brücken), Berge, Bäume und Zelte sind nicht
  begehbar.
  Man gleitet an Hindernissen entlang.
- **WL-AK-03** Leisten: Hunger, Müdigkeit und Fitness sinken und steigen wie in der Tabelle und
  bleiben zwischen 0 und 100.
- **WL-AK-04** Kein Sterben: Hunger 0 macht langsam. Müdigkeit 0 lässt einschlafen, man wacht am
  Zelt bzw. Landeplatz mit 50 % auf, und das Inventar bleibt. Fitness 0 sperrt Rennen und Hacken
  bis 20 %.
- **WL-AK-05** Holz: Ein Baum gibt 3 Holz, wird zum Stumpf und wächst nach einem Spieltag nach.
  Das Inventar hat maximal 30 Holz.
- **WL-AK-06** Beeren: Ein Strauch gibt 4 Beeren und füllt sich nach einem halben Spieltag wieder.
  Essen gibt Hunger +12 %.
- **WL-AK-07** Bauen: Das Zelt kostet 8 Holz, das Feuer 3 Holz. Gebaut wird nur auf freien, ebenen
  Feldern. Ein neues Zelt ersetzt das alte. Das Feuer brennt 3 Min., nachgelegtes Holz gibt
  +2 Min.
- **WL-AK-08** Tag und Nacht: Ein Zyklus dauert 10 Min. mit den Phasen Morgen, Tag, Dämmerung und
  Nacht. Nachts ist es um Feuer und Figur heller als sonst. Schlafen allein lässt die Nacht
  4-mal so schnell laufen.
- **WL-AK-09** Tiere wandern nur auf begehbaren Feldern und fliehen vor Spielern. Es gibt keine Aktion, die ein Tier verletzt oder entfernt.
- **WL-AK-10** Speichern: Welt, Inventar und Leisten überstehen Neuladen. Kaputte Daten führen zu
  einer neuen Welt ohne Absturz.
- **WL-AK-11** Raum-Server-Logik:
  - Ein Raum-Code ist eindeutig, es gibt höchstens 6 Spieler, und Nachrichten werden zwischen
    Gastgeber und Gästen weitergeleitet.
  - Die Grenzen für Rate und Größe werden durchgesetzt. Geht der Gastgeber, wird der Raum
    geschlossen.
  - Die Liste offener Welten enthält nur Räume mit gemeldetem Namen und zeigt Gastgeber,
    Spieler-Namen und Anzahl. Namen werden gekürzt und bereinigt. Geschlossene Räume
    verschwinden aus der Liste.
- **WL-AK-12** Protokoll: Nachrichten mit falscher Version oder ungültigem Inhalt werden
  ignoriert, ohne Absturz.
- **WL-AK-13** (E2E Desktop) Name und Farbe wählen, Holz hacken, Feuer und Zelt bauen, Beeren
  pflücken und essen. Die Leisten ändern sich, und Test-Hilfen spulen die Zeit bis zur Nacht vor.
- **WL-AK-14** (E2E Mobile 375×667) Joystick, „Aktion“, „Essen“, „Bauen“ und „Menü“ sind sichtbar
  und bedienbar. Der Joystick bewegt die Figur.
- **WL-AK-15** (E2E, lokaler Raum-Server) Zwei Browser:
  - Browser A spielt, und seine Welt ist ohne weiteres Zutun offen.
  - Browser B sieht im Hauptmenü unter „Offene Welten“ den Eintrag mit A's Namen und Spielern
    und tritt per Antippen bei.
  - Danach zeigt die Liste beide Namen, beide sehen sich, und ein gefällter Baum ist bei beiden
    ein Stumpf.
  - Verlässt der Gastgeber die Welt, sieht der Gast den Hinweis, und die Welt verschwindet aus
    der Liste.
- **WL-AK-16** Ohne `VITE_RELAY_URL` gibt es keine Liste offener Welten und keine
  Online-Anzeige. Allein spielen geht vollständig.
- **WL-AK-17** Fokusverlust pausiert: Allein hält die Zeit an, online bleibt die eigene Figur
  stehen.

- **WL-AK-18** Katalog: mindestens 30 Arten plus Einhorn (darunter der Hai). Jede Art hat Name, Lebensraum,
  Tageszeit, Seltenheit und einen Satz, und es gibt eine per Code gezeichnete Grafik.
- **WL-AK-19** Tiere in der Welt:
  - Jede Art außer dem Einhorn kommt mindestens einmal vor.
  - Wassertiere sind höchstens 3 Felder vom Wasser entfernt, Hügeltiere stehen auf Höhe ≥ 2.
  - Nachtaktive Tiere sind tagsüber versteckt.
  - Tiere stehen nur auf begehbaren Feldern.
- **WL-AK-20** Einhorn:
  - Pro Spieltag kommt es mit 15 % Chance, gleicher Seed ergibt den gleichen Verlauf.
  - Es gibt höchstens eins, es erscheint weit weg von Spielern und verschwindet am Tagesende.
  - Über viele Tage liegt der Anteil der Tage mit Einhorn ungefähr bei 15 %.
- **WL-AK-21** Entdecken:
  - Ein Tier im Sichtradius (Tag 5, Nacht 3 oder im Feuerschein) wird einmal eingetragen und
    löst genau eine Meldung „Neu entdeckt: …“ aus.
  - Versteckte Tiere zählen nicht.
  - Das Tierbuch übersteht Neuladen und „Neue Welt“, kaputte Daten ergeben ein leeres Tierbuch.
- **WL-AK-22** (E2E) In die Nähe eines Tieres gehen ergibt die Meldung „Neu entdeckt: …“. Das
  Tierbuch zeigt dann „1 / 33 entdeckt“ (bzw. die passende Zahl) mit Name und Satz; unentdeckte
  Arten zeigen „???“. Nach Neuladen ist der Eintrag noch da. Auf Mobile ist das Tierbuch
  bedienbar.

- **WL-AK-23** Fallschirm:
  - Jede Spielerin und jeder Spieler, auch ein Gast, landet auf einem eigenen, zufälligen,
    freien Landfeld mit mindestens 60 Feldern Abstand zum Flugzeug und Beeren in höchstens
    6 Feldern.
  - Die Landung dauert etwa 3 Sekunden mit sichtbarem Schirm; währenddessen kann man nicht
    laufen.
- **WL-AK-24** Flugzeug:
  - Es gibt genau ein Wrack auf ebenem Land; es ist erreichbar, und seine Felder sind nicht
    begehbar.
  - Wer bis auf 2 Felder herankommt, erhält das Funkgerät mit genau einer Meldung.
  - Das Funkgerät gilt pro Welt und übersteht Neuladen.
- **WL-AK-25** Funk:
  - Ohne Funkgerät gibt es keinen Funk-Button.
  - Mit Funkgerät zeigt „Funk“ (Taste F) alle Spieler der Welt mit Namen und Koordinaten (X/Y
    0–255) und eine Inselkarte mit Punkten für die Spieler und das Flugzeug.
- **WL-AK-26** Hai:
  - Haie sind nur im Meer, verlassen es nie, und es gibt höchstens zwei.
  - Die Flosse ist zeitweise abgetaucht und dann weder sichtbar noch entdeckbar.
  - Der Hai steht im Tierbuch.
- **WL-AK-44** Kompass und Karte: Die Richtung auf dem Bildschirm wird richtig berechnet (Norden
  0°, Osten 90°, Süden 180°, Westen 270°); Kartenpunkte liegen wie im Spielbild gedreht
  (Inselmitte in der Kartenmitte, Norden oben).
- **WL-AK-45** (E2E) Der Kompass ist sichtbar (N), ohne Funkgerät ohne Hütten-Nadel; mit
  Funkgerät zeigt die Nadel zur Hütte (Winkel passt), und die Funk-Karte zeigt die Hütte.
- **WL-AK-46** Schneise: 30–40 Felder lang, beginnt am Wrack, zeigt (±30°) in die Richtung der
  Trümmerspur; Bäume darin sind umgeknickt (begehbar, keine Aktion „Holz hacken“, keine Äpfel),
  ihre Felder angesengt; immer gleich je Seed; Zahl und Lage aller Bäume unverändert.
- **WL-AK-47** (E2E) Am Wrack steigt Rauch auf (Rauch-Teilchen sichtbar); ein Feld mit
  umgeknicktem Baum ist begehbar.
- **WL-AK-51** Aussehen: Bäume haben vier Arten (jede mindestens 3 %), im Wald mehr als die
  Hälfte Nadelbäume, Apfelbäume sind Laubbäume, je Feld immer gleich; Felsgipfel gibt es in drei
  Höhen.
- **WL-AK-48** Frieren (Feedback `fb_gt0srcqv`): In Dämmerung und Nacht sinkt draußen die
  **Wärme** (voll → leer in ca. 2,5 Min.), am Feuer steigt sie schnell, beim Schlafen langsam,
  tagsüber erholt sie sich. Unter 30 % friert man: Fitness sinkt zusätzlich 4 %/s, und es kommt
  einmal die Meldung „🥶 Dir ist kalt – mach ein Feuer oder geh ins Zelt!“. Die Leiste „Wärme“
  erscheint in Dämmerung und Nacht und solange sie nicht voll ist. Gehen kostet leicht Fitness
  (0,5 %/s); erholen nur im Stehen, Sitzen und Schlafen (Feedback `fb_n5p5gxk2`).
- **WL-AK-49** Einhorn wiehern (Feedback `fb_7rnu4uip`): Gibt es ein Einhorn und ist es weiter als
  12 Felder weg, kommt im Mittel alle 2 Minuten „🦄 Du hörst ein Einhorn wiehern – irgendwo im
  Nordosten!“ mit der richtigen Himmelsrichtung (8 Richtungen, Norden oben).
- **WL-AK-50** Strandkrabben und Furten: Die Strandkrabbe (Feedback `fb_6hh2w8h7`) lebt nur auf
  Sand am Meer und steht im Tierbuch; jede Insel hat 3–6 steinige Furten über Flüsse (höchstens
  4 Felder breit, begehbar, mit Trittsteinen gezeichnet).
- **WL-AK-52** Seen und Fische (Feedback `fb_ch2wfaa6`): Jede Insel hat 3–6 Seen mit 12–60
  Feldern, keiner grenzt an Meer (auch nicht diagonal, 2 Felder Abstand), auf Seefeldern stehen
  keine Bäume, Sträucher, Trümmer, Hütte oder Flugzeug; Zahl und Lage aller Bäume bleiben gleich;
  Seen sind nicht begehbar und nicht überbrückbar; es bleibt alles erreichbar wie vorher (WL-AK-01).
  Fischstellen liegen nur auf Fluss- oder Seefeldern, jeder See hat 1–2, und alles ist je Seed
  gleich. Ein alter Spielstand mit der Figur auf einem Seefeld setzt sie auf ein freies Feld.
- **WL-AK-53** (E2E) An einem See sind Wasserringe zu sehen; das Seefeld ist nicht begehbar.
- **WL-AK-54** Werkzeuge und Angel (Feedback `fb_ch2wfaa6`): Eine Angel kostet 5 Holz, eine
  zweite geht nicht („Du hast schon eine Angel.“). Mit Angel an einer Fischstelle ergibt „Angeln“
  einen Fisch (max. 20); die Stelle ruht dann einen halben Spieltag. Ohne Angel oder an einer
  ruhenden Stelle gibt es kein „Angeln“. Fisch essen gibt +30 % Hunger. Angel, Fische und ruhende
  Stellen überstehen Neuladen und gehen im Mehrspieler an die Gäste.
- **WL-AK-55** (E2E) Angel bauen (Werkzeug-Zeile zeigt 🎣), an einer Fischstelle angeln, den Fisch
  in der Essen-Auswahl essen.
- **WL-AK-27** (E2E) Neue Welt:
  - Fallschirm-Landung, danach laufen.
  - Mit Test-Hilfe zum Flugzeug: Meldung und Funk-Button erscheinen.
  - Der Funk zeigt den eigenen Namen mit Koordinaten und die Karte.
  - Auf Mobile ist „Funk“ sichtbar und bedienbar.

- **WL-AK-28** Brücke bauen:
  - Ein Brückenfeld kostet 3 Holz und geht nur auf ein Flussfeld vor der Figur, nicht auf Meer
    oder Land.
  - Danach ist das Feld begehbar; mit 2–3 Stücken kommt man über einen Fluss.
  - Brücken übersteht Neuladen, und im Mehrspieler sehen alle sie.
  - Am Landeplatz stehen mindestens 10 Bäume im Umkreis von 15 Feldern.
- **WL-AK-29** Trümmer:
  - Es gibt 15–25 Trümmerteile auf begehbarem Land (nie auf einem Beerenstrauch), 10–90 Felder
    vom Wrack entfernt.
  - „Trümmer ansehen“ zeigt die richtige Himmelsrichtung (8 Richtungen, Norden = oben) und die
    passende Entfernungsstufe.
- **WL-AK-30** (E2E) An einen Fluss gehen und Holz sammeln, zwei bis drei Brückenstücke bauen
  (Taste B, 3), über den Fluss laufen. Ein Trümmerteil ansehen ergibt einen Hinweis mit
  Himmelsrichtung.
- **WL-AK-31** Eigene Farbe:
  - Gültig sind genau Farben im Format `#rrggbb`; Gäste mit anderer Farbe (z. B. `red`,
    `url(…)`) werden abgewiesen, auch in Snapshots.
  - Ein Spielstand mit eigener Farbe lädt mit dieser Farbe; ungültige Farbe ergibt die erste
    Jacken-Farbe.
- **WL-AK-32** (E2E) Im Startbildschirm über „Eigene Farbe“ eine Farbe wählen und spielen: Die
  Figur hat diese Farbe, nach Neuladen auch.
- **WL-AK-33** (E2E) Tierbuch-Suche: Mit einem entdeckten Tier zeigt „Tier suchen“ mit Teil des
  Namens nur dieses Tier, unentdeckte („???“) sind ausgeblendet; ein unpassender Text zeigt
  „Kein entdecktes Tier heißt so.“; leeres Feld zeigt wieder alle Arten. Tippen im Suchfeld löst
  keine Spieltasten aus. Auf Mobile bedienbar.

- **WL-AK-34** Schwäche: Tempo 100 % ab 25 % Fitness, 80 % darunter, 60 % unter 10 % Fitness
  oder bei Hunger 0 (nicht multipliziert). Bei Hunger unter 25 % kosten Rennen und Hacken doppelt
  so viel Fitness und Erholung ist halb so schnell; sonst unverändert.
- **WL-AK-35** Aktivität: Tagaktive sind morgens, tagsüber und in der Dämmerung aktiv,
  nachtaktive in Dämmerung und Nacht; der Hai ist aktiv, wenn seine Flosse zu sehen ist.
- **WL-AK-36** (E2E) Tierbuch zeigt tagsüber bei einem tagaktiven Tier „🟢 Jetzt unterwegs“ und
  bei einem nachtaktiven „💤 Schläft gerade“, nachts umgekehrt.

- **WL-AK-37** Regenbogenspur: Läuft das Einhorn auf ein Feld, bekommt es eine Spur bis
  „jetzt + 600 s“. Abgelaufene Spuren verschwinden, es gibt höchstens 300 (die ältesten gehen
  zuerst). Andere Tiere hinterlassen keine Spur. Gäste bekommen die Spur im Schnappschuss
  (rund um sich), ungültige Spurdaten werden abgewiesen. Nach dem Laden ist keine Spur da.
- **WL-AK-38** Fitness hält doppelt so lange: Rennen leert volle Fitness in ca. 30 s, ein
  Axthieb kostet 2,5 % (bei Hunger unter 25 % weiterhin doppelt).

- **WL-AK-39** Hütte: Jede Insel (viele Seeds) hat genau eine Hütte auf begehbarem Land, ≥ 40
  Felder vom Mittelpunkt, ≥ 15 vom Flugzeug, erreichbar; das Feld ist nicht begehbar. „Kiste
  öffnen“ gibt 2 Dosen, danach ist die Kiste leer und nach einem Spieltag wieder voll; bei leerer
  Kiste kommt „In der Hütte schlafen“. Die Meldung beim ersten Herankommen kommt genau einmal.
- **WL-AK-40** Apfelbäume: etwa 10 % der Bäume (5–15 %), immer gleich je Seed. „Äpfel schütteln“
  gibt 2 Äpfel, dann kommt „Holz hacken“; nach einem halben Spieltag hängen wieder Äpfel dran.
- **WL-AK-41** Pilze: Eine neue Welt hat Pilze nur auf freien Waldfeldern; „Pilz sammeln“ gibt
  einen Pilz, nach einem halben Spieltag gibt es wieder gleich viele.
- **WL-AK-42** Essen: Pilz +8 %, Beere +12 %, Apfel +20 %, Dose +35 % Hunger (max. 100); jede
  Sorte höchstens 20 im Inventar; Essen ohne Vorrat ändert nichts. Speichern/Laden und
  Mehrspieler-Schnappschüsse übertragen Vorräte, Kiste, Äpfel und Pilze; ungültige Werte werden
  abgewiesen.
- **WL-AK-43** (E2E) Zur Hütte gehen → Meldung, „Kiste öffnen“ → 🥫 2; einen Apfelbaum schütteln →
  🍎 2; „Essen“ zeigt die Auswahl-Leiste, Apfel essen erhöht den Hunger-Wert; auch auf Mobile.

## Nicht-Ziele (MVP)

- **Tiere:** Keine Tiere jagen, fangen, füttern oder zähmen, keine Fotos und keine Tier-Sounds.
- **Spielinhalte:** Kein Kampf, keine weiteren Rohstoffe oder Werkzeuge (Stein, Erz), kein
  Kochen, kein Wetter oder Regen, kein Wasser trinken.
- **Online:** Keine Konten, kein Chat (höchstens kurze Emote-Symbole später), keine dauerhaft
  gespeicherten Online-Welten. Die Welt existiert nur, solange der Gastgeber online ist.
- **Sonstiges:** Kein Sound.
