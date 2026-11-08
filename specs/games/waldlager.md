# Spiel: Waldlager

**Status:** Entwurf (Änderung: Entdecken und Tierbuch, WL-AK-18 bis 22)
**Slug:** `waldlager`
**Name:** „Waldlager“ (Arbeitstitel)

## Zweck

Ruhiges Überlebens- und Lagerspiel in einem **isometrischen Wald** im Pixel-Stil. Man hackt
Holz, baut sein **Zelt** und ein **Lagerfeuer**, sucht **Beeren** zum Essen und erlebt, wie es
**dämmert und dunkel wird**. Man spielt **allein**. Später können **andere über WebSocket in die
eigene Welt kommen**, sobald der Online-Server bereitsteht.

Kindgerecht: **Tiere werden nie verletzt oder getötet.** Es gibt keine Waffen und keine Aktion
gegen Tiere. Rehe und andere Waldtiere laufen nur herum. Man kann nicht sterben.

## Welt

- **Isometrische Kachelkarte** (2D, Phaser), ca. 96 × 96 Felder, aus einem **Seed** deterministisch
  erzeugt. Alle Grafiken werden per Code gezeichnet, es gibt keine Bilddateien.
- **Gelände:**
  - Wiese und Waldboden.
  - **Wald** mit vielen Bäumen.
  - **Flüsse**, die nicht begehbar sind. Es gibt **Furten bzw. Brücken**, mindestens zwei je Fluss.
  - **Hügel** in 2–3 Höhenstufen, als erhöhte Kacheln mit Kanten dargestellt und begehbar.
  - **Wenige Berge** (Fels): nicht begehbar und nicht abbaubar.
- **Startpunkt:** eine Lichtung nahe einem Fluss, mit Beerensträuchern in der Nähe.
- **Erreichbarkeit:** Alle begehbaren Felder hängen zusammen.

## Tiere entdecken (nie verletzbar)

Waldlager ist auch ein **Entdeckerspiel**: Im Wald leben **31 Tierarten**. Wer ein Tier zum ersten
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
- **Das Einhorn** (sehr selten, magisch):
  - Zu Beginn jedes Spieltags gibt es mit 15 % Chance für diesen Tag ein Einhorn.
  - Es erscheint auf einer Lichtung weit weg von allen Spielern und schimmert leicht.
  - Es gibt höchstens eins gleichzeitig, und am Ende des Tages verschwindet es wieder.
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
  - Liste aller 31 Arten mit Zähler, z. B. „12 / 31 entdeckt“.
  - **Entdeckte Arten:** Bild, Name, Lebensraum, Tageszeit und der kurze Satz.
  - **Unentdeckte Arten:** dunkle Silhouette und „???“, dazu nur ein Hinweis auf Lebensraum und
    Tageszeit (z. B. „Nachts im Wald“). Beim Einhorn steht nur „Sehr selten …“.
- **Das Tierbuch gehört der Spielerin bzw. dem Spieler, nicht der Welt.** Es bleibt bei „Neue Welt“
  erhalten und wird auch als Gast in fremden Welten weitergeführt. Im Mehrspieler entdeckt jeder
  für sich.

## Spielfigur

- Beim Start wählt man **Name** (max. 12 Zeichen) und **Farbe** (6 Jacken-Farben).
- Die Figur läuft in 8 Richtungen. **Rennen** ist schneller und kostet Fitness.

## Zustand („Health-Leiste“)

Drei Leisten von 0 bis 100 % stehen immer oben im Bild:

| Leiste        | sinkt …                                           | steigt …                                                           |
| ------------- | ------------------------------------------------- | ------------------------------------------------------------------ |
| **Hunger**    | langsam mit der Zeit (voll → leer in ca. 12 Min.) | Essen: Beere +12 %                                                 |
| **Müdigkeit** | mit der Zeit, nachts doppelt so schnell           | Schlafen im eigenen Zelt (schnell); am Lagerfeuer sitzen (langsam) |
| **Fitness**   | beim Rennen und Holzhacken                        | beim Stehen oder Gehen (langsam), am Lagerfeuer schneller          |

(Bei „Müdigkeit“ bedeutet 100 % ausgeruht und 0 % todmüde.)

**Kein Sterben.** Ist eine Leiste leer:

- **Hunger 0:** Man läuft nur noch langsam, Hinweis „Du hast Hunger – such Beeren!“.
- **Müdigkeit 0:** Man schläft ein und wacht am eigenen Zelt auf, oder am Startpunkt, wenn es
  noch kein Zelt gibt. Die Müdigkeit steht danach bei 50 %. Nichts geht verloren.
- **Fitness 0:** Rennen und Hacken gehen nicht, bis Fitness wieder 20 % erreicht.

## Tätigkeiten

- **Holz hacken:** An einem Baum die Aktionstaste mehrmals drücken bzw. halten. Ein Baum gibt
  3 Holz und wird zum Baumstumpf. Nach einem Spieltag wächst er nach. Nur Holz hacken, keine
  anderen Werkzeuge.
- **Beeren pflücken:** Ein Strauch hat 4 Beeren. Pflücken legt sie ins Inventar. Essen geht per
  Taste bzw. Button „Essen“. Leere Sträucher füllen sich nach einem halben Spieltag wieder.
- **Zelt aufbauen:** kostet 8 Holz, auf einem freien, ebenen Feld. Jeder Spieler hat **ein**
  Zelt, ein neues ersetzt das alte. Im Zelt kann man schlafen.
- **Lagerfeuer bauen:** kostet 3 Holz. Es brennt 3 Minuten, jedes nachgelegte Holz gibt
  +2 Minuten. Am Feuer sitzen erholt Fitness und Müdigkeit. Das Feuer **leuchtet nachts**.
- **Inventar:** Holz (max. 30), Beeren (max. 20).

## Tag und Nacht

- **Ein Spieltag dauert ca. 10 Minuten:** Morgen 0,5 Min., Tag 5,5 Min., Dämmerung 1 Min.,
  Nacht 3 Min.
- Die Uhr wird als Sonne bzw. Mond mit Spielzeit angezeigt (z. B. „19:30“).
- **Licht:** Die Dämmerung färbt die Welt orange-blau. Nachts wird es dunkel. Rund um Lagerfeuer
  (groß) und Spielfigur (klein, „Laterne“) bleibt es hell.
- **Schlafen** im Zelt erholt die Müdigkeit schnell. Allein läuft die Nacht beim Schlafen
  4-mal so schnell. Mit anderen Spielern läuft die Zeit nur schneller, wenn alle schlafen.

## Mehrspieler: andere kommen in deine Welt

- **Allein spielen geht immer**, auch ohne Internet bzw. ohne Server.
- **Welt öffnen:** Im Menü „Welt öffnen“. Man bekommt einen **Raum-Code** aus 4 Buchstaben
  (z. B. „WALD“ + Zahl, eindeutig) und ist **Gastgeber**.
- **Beitreten:** Auf der Startseite „Einer Welt beitreten“ den Code eingeben. Bis zu **6 Spieler**
  sind in einer Welt.
- **Gastgeber führt die Welt:**
  - Sein Browser berechnet Zeit, Bäume, Sträucher, Tiere, Zelte und Feuer und schickt den Stand
    an alle.
  - Gäste schicken ihre Bewegungen und Aktionen.
  - Jeder sieht die anderen mit Name und Farbe.
- **Gemeinsam:** Bäume, Beeren und Lagerfeuer gehören allen. Jeder hat sein eigenes Zelt,
  Inventar und eigene Leisten.
- Verlässt der Gastgeber die Welt, sehen die Gäste den Hinweis „Der Gastgeber hat die Welt
  verlassen“ und kommen zurück zum Menü.
- **Ohne Server:** Ist kein Server eingerichtet, sind „Welt öffnen“ und „Beitreten“ ausgeblendet.
  Ist der Server nicht erreichbar, erscheint der Hinweis „Online gerade nicht möglich – spiel
  einfach allein weiter.“

## Online-Server (WebSocket)

- Ein kleiner **Raum-Server** liegt im Repo unter `services/relay` und wird auf **Cloudflare
  Workers** betrieben (je Raum ein Durable Object).
- **Aufgaben des Servers:**
  - Raum-Codes vergeben.
  - Nachrichten zwischen Gastgeber und Gästen weiterleiten.
  - Räume schließen, wenn der Gastgeber geht.
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

- **WL-AK-01** Welt: Gleicher Seed ergibt die gleiche Welt. Es gibt Wiese, Wald, Fluss mit
  Furt/Brücke, Hügel und Berge. Alle begehbaren Felder hängen zusammen. Der Start liegt auf einer
  Lichtung mit Beeren in Reichweite.
- **WL-AK-02** Kollision: Wasser (außer Furt/Brücke), Berge, Bäume und Zelte sind nicht begehbar.
  Man gleitet an Hindernissen entlang.
- **WL-AK-03** Leisten: Hunger, Müdigkeit und Fitness sinken und steigen wie in der Tabelle und
  bleiben zwischen 0 und 100.
- **WL-AK-04** Kein Sterben: Hunger 0 macht langsam. Müdigkeit 0 lässt einschlafen, man wacht am
  Zelt bzw. Startpunkt mit 50 % auf, und das Inventar bleibt. Fitness 0 sperrt Rennen und Hacken
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
- **WL-AK-11** Raum-Server-Logik: Ein Raum-Code ist eindeutig, es gibt höchstens 6 Spieler, und
  Nachrichten werden zwischen Gastgeber und Gästen weitergeleitet. Die Grenzen für Rate und Größe
  werden durchgesetzt. Geht der Gastgeber, wird der Raum geschlossen.
- **WL-AK-12** Protokoll: Nachrichten mit falscher Version oder ungültigem Inhalt werden
  ignoriert, ohne Absturz.
- **WL-AK-13** (E2E Desktop) Name und Farbe wählen, Holz hacken, Feuer und Zelt bauen, Beeren
  pflücken und essen. Die Leisten ändern sich, und Test-Hilfen spulen die Zeit bis zur Nacht vor.
- **WL-AK-14** (E2E Mobile 375×667) Joystick, „Aktion“, „Essen“, „Bauen“ und „Menü“ sind sichtbar
  und bedienbar. Der Joystick bewegt die Figur.
- **WL-AK-15** (E2E, lokaler Raum-Server) Zwei Browser: Einer öffnet eine Welt, der andere tritt
  mit dem Code bei. Beide sehen sich, und ein gefällter Baum ist bei beiden ein Stumpf. Verlässt
  der Gastgeber die Welt, sieht der Gast den Hinweis.
- **WL-AK-16** Ohne `VITE_RELAY_URL` sind „Welt öffnen“ und „Beitreten“ ausgeblendet. Allein
  spielen geht vollständig.
- **WL-AK-17** Fokusverlust pausiert: Allein hält die Zeit an, online bleibt die eigene Figur
  stehen.

- **WL-AK-18** Katalog: mindestens 29 Arten plus Einhorn. Jede Art hat Name, Lebensraum,
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
  Tierbuch zeigt dann „1 / 31 entdeckt“ (bzw. die passende Zahl) mit Name und Satz; unentdeckte
  Arten zeigen „???“. Nach Neuladen ist der Eintrag noch da. Auf Mobile ist das Tierbuch
  bedienbar.

## Nicht-Ziele (MVP)

- **Tiere:** Keine Tiere jagen, fangen, füttern oder zähmen, keine Fotos und keine Tier-Sounds.
- **Spielinhalte:** Kein Kampf, keine weiteren Rohstoffe oder Werkzeuge (Stein, Erz), kein
  Kochen, kein Wetter oder Regen, kein Wasser trinken.
- **Online:** Keine Konten, kein Chat (höchstens kurze Emote-Symbole später), keine dauerhaft
  gespeicherten Online-Welten. Die Welt existiert nur, solange der Gastgeber online ist.
- **Sonstiges:** Kein Sound.
