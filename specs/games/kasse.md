# Spiel: Kassen-Held

**Status:** Entwurf
**Slug:** `kasse`
**Name:** „Kassen-Held“ (Arbeitstitel)

## Zweck

3D-Spiel aus Sicht einer Kassiererin bzw. eines Kassierers an der Kasse eines **EDEKA**-Markts.
Kunden legen ihre Einkäufe aufs Band; man **greift jede Ware, zieht sie über den Scanner** und
legt sie in die Ablage. Ganz **ohne Zeitdruck**: Kunden kommen nacheinander, es gibt keine Uhr und
keine Strafen. Kindgerecht.

## Supermarkt und Waren

- **EDEKA:** Name und typische Farben (Blau und Gelb) im Markt, z. B. auf Schildern und am
  Kassenbildschirm, in **neutraler Schrift**. **Kein Original-Logo, kein nachgebildetes Logo.**
  Die Verwendung des Namens hat der Repo-Inhaber am 2026-11-01 so gewünscht.
- **Waren:** neutrale Produkte **ohne echte Marken**, als einfache 3D-Formen mit Etikett
  (Name + Barcode): Milch, Brot, Butter, Käse, Eier, Joghurt, Äpfel, Bananen, Tomaten, Nudeln,
  Saft, Wasser, Kaffee, Müsli, Schokolade (mindestens 15). Jede Ware hat einen Preis.
- Alle Grafiken werden per Code erzeugt, keine Bilddateien.

## Ablauf

1. **Start:** „Kasse öffnen“.
2. **Kunde kommt:** Eine Person stellt sich an, legt 3–10 Waren aufs Band; das Band fährt die
   Waren nach vorn.
3. **Scannen:** Ware greifen (antippen/anklicken und gedrückt halten) und **über das
   Scannerfeld ziehen**. Zeigt der Barcode zum Scanner → „Piep“ (sichtbar), die Ware erscheint
   mit Preis auf dem Kassenbildschirm. Zeigt der Barcode weg → kein Piep, Hinweis „Barcode
   drehen“; mit „Drehen“ wird die Ware umgedreht. Danach die Ware in die Ablage ziehen
   (oder loslassen: sie rutscht automatisch in die Ablage).
4. **Summe:** Sind alle Waren gescannt, erscheint „Summe“. Der Kunde zahlt mit Karte
   (kurze Animation), der Bon wird gedruckt, der Kunde verabschiedet sich.
5. **Nächster Kunde.** Oben steht, wie viele Kunden man heute schon bedient hat und der Umsatz.
6. **Feierabend** (Button jederzeit): Zusammenfassung (Kunden, Waren, Umsatz).

Eine Ware wird nur **einmal** berechnet; erneutes Darüberziehen scannt nicht doppelt.

## Steuerung

| Aktion          | Maus / Touch                                       | Tastatur |
| --------------- | -------------------------------------------------- | -------- |
| Ware greifen    | antippen/anklicken und gedrückt halten             | –        |
| Ware bewegen    | ziehen                                             | –        |
| Drehen          | Button „Drehen“ (während des Greifens oder danach) | R        |
| Summe           | Button „Summe“                                     | Enter    |
| Feierabend/Menü | Button „Feierabend“                                | Esc      |

Alle Bedienelemente im sicheren Bereich (MANIFEST-AK-08).

## Darstellung

- **Kamera:** fest, Sitzposition hinter der Kasse, Blick schräg nach unten auf Band, Scanner und
  Ablage; der Kunde steht gegenüber.
- **Kasse:** Band (bewegt sich), Scannerglas (leuchtet beim Piep rot/grün), Waage-Optik,
  Ablagemulde, Kassenbildschirm mit Bonliste und Summe, Kartenterminal.
- **Markt im Hintergrund:** Regale, Kühltheke, Schilder in Blau/Gelb mit „EDEKA“ in neutraler
  Schrift.
- **Kunden:** einfache Low-Poly-Figuren in verschiedenen Farben.

## Technik

Three.js + Vite (wie die anderen 3D-Spiele). Warenkatalog, Kundengenerator (seedbar),
Scan-Regeln, Bon/Summe und Statistik als reines TypeScript, testbar.

## Akzeptanzkriterien

- **KA-AK-01** Katalog: mindestens 15 Waren, jede mit Name, Preis (> 0, in Cent) und Form;
  keine echten Marken, keine Bilddateien.
- **KA-AK-02** Kunde: 3–10 Waren aus dem Katalog, deterministisch je Seed.
- **KA-AK-03** Scannen nur, wenn die Ware über dem Scannerfeld ist **und** der Barcode zum
  Scanner zeigt; sonst kein Eintrag.
- **KA-AK-04** „Drehen“ dreht die Ware um 180°; danach lässt sie sich scannen.
- **KA-AK-05** Jede Ware wird höchstens einmal berechnet.
- **KA-AK-06** Summe = Summe der gescannten Preise (Cent-genau), Anzeige „12,34 €“.
- **KA-AK-07** „Summe“ ist erst möglich, wenn alle Waren des Kunden gescannt sind; danach
  Bezahlung und nächster Kunde.
- **KA-AK-08** Statistik: Kunden, Waren und Umsatz werden pro Schicht mitgezählt;
  „Feierabend“ zeigt sie an.
- **KA-AK-09** (E2E Desktop) Kasse öffnen, eine Ware mit der Maus über den Scanner ziehen (inkl.
  Drehen, falls nötig), alle Waren scannen, Summe, nächster Kunde erscheint.
- **KA-AK-10** (E2E Mobile 375×667) Ware per Touch greifen und über den Scanner ziehen; Buttons
  „Drehen“, „Summe“, „Feierabend“ sichtbar und bedienbar.
- **KA-AK-11** Fokusverlust pausiert (Band steht still).

## Nicht-Ziele (MVP)

- Kein Zeitdruck, kein Bargeld/Wechselgeld, kein Wiegen von Obst, keine Pfandbons, keine
  Alterskontrolle, kein Speichern über die Schicht hinaus, kein Sound, keine Original-Logos,
  keine echten Markenprodukte.
