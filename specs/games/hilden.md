# Spiel: Mein Hilden

**Status:** Umgesetzt
**Slug:** `hilden`
**Name:** „Mein Hilden“ (Arbeitstitel)

## Zweck

3D-Spiel, in dem man mit **Matti** zu Fuß durch die Stadt **Hilden** läuft, sich ein eigenes
Haus aussucht und in vier **Berufen** kleine Aufgaben erledigt. Oder einfach frei herumläuft und
die Stadt erkundet. Kindgerecht, ohne Zeitdruck, ohne Gewalt.

## Figur

**Matti** (wie in Himmelhüpfer): 9 Jahre, lange blonde Haare, blauer Hoodie, blaue Shorts,
Sneaker. Als einfaches Low-Poly-3D-Modell mit Lauf- und Stehanimation.

## Stadt

- **Quelle:** **von Hand vereinfacht nachgebaut** (keine OpenStreetMap-Daten). Die Innenstadt
  orientiert sich grob an Hilden: Mittelstraße als Fußgängerzone, Alter Markt mit
  Reformationskirche, Bahnhof im Osten, Stadtpark mit Teich, die Itter im Süden. Straßenverlauf,
  Abstände und Gebäude stimmen nur ungefähr; Wohnviertel werden regelmäßig ergänzt.
- **Raster:** Die Stadt ist ein Raster aus 5-m-Feldern (Straße, Platz, Park, Wasser, Gleis,
  Gebäude mit Höhe, Garten). Daraus entstehen Darstellung, Kollision und Wegfindung.
- **Ausschnitt:** Innenstadt rund um den Alten Markt, ca. 1,6 km × 1,6 km.
- **Darstellung:** Boden als eine Textur aus dem Raster (Straßen, Plätze, Parks, Wasser),
  Gebäude als einfache Blöcke (Innenstadt 3–4, Wohnviertel 2 Stockwerke), Bäume in Parks und an
  Straßen. Wichtige Straßen sind beschriftet.
- **Wahrzeichen** mit eigenem, etwas detaillierterem Modell: Reformationskirche am Alten Markt,
  Bahnhof Hilden. Weitere bekannte Orte werden beschriftet (z. B. Mittelstraße, Stadtpark).
- **Kollision:** Man kann nicht durch Gebäude, Wasser oder über Gleise laufen.

## Das eigene Haus

- Beim ersten Spielstart werden **3 freie Häuser** in Wohnstraßen markiert; man läuft hin und
  wählt eins. Die Häuser werden nur „Haus 1/2/3“ genannt, **es werden keine echten Adressen oder
  Hausnummern angezeigt**.
- Das Haus ist **betretbar**: eigener Innenraum mit fester Einrichtung (Bett, Sofa, Tisch,
  Küche, Fernseher). Keine Möbel kaufen oder verschieben.
- Das Haus ist Startpunkt nach dem Laden. Auswahl wird im Browser gespeichert und kann im Menü
  zurückgesetzt werden.

## Berufe

Am **Jobbrett** am Alten Markt (oder im Menü) wählt man einen Beruf und bekommt eine Aufgabe.
Ein Pfeil und die Karte zeigen jeweils das nächste Ziel. Jede erledigte Aufgabe gibt einen Stern
für diesen Beruf; ab 5 Sternen gibt es ein Abzeichen (z. B. „Meister-Postbote“).

| Beruf     | Arbeitsort (fiktiv platziert) | Aufgabe (MVP)                                                                                   |
| --------- | ----------------------------- | ----------------------------------------------------------------------------------------------- |
| Postbote  | Post                          | 3 Briefe abholen und an 3 markierte Häuser bringen                                              |
| Bäcker    | Bäckerei an der Mittelstraße  | Brötchen backen (Mini-Spiel: im richtigen Moment aus dem Ofen holen), dann an 2 Kunden liefern  |
| Polizei   | Polizeiwache                  | 3 verlorene Gegenstände in der Stadt finden und zur Wache bringen                               |
| Feuerwehr | Feuerwache                    | Zum Einsatzort laufen: Katze vom Baum holen oder kleines Feuer löschen (Button gedrückt halten) |

Eine Aufgabe kann jederzeit abgebrochen werden. Sterne und Abzeichen werden gespeichert.

## Freies Erkunden

Ohne Beruf läuft man frei herum. Eine Karte (aufklappbar) zeigt Position, Haus, Arbeitsorte und
Wahrzeichen. Entdeckte Wahrzeichen werden abgehakt.

## Steuerung

| Aktion                   | Tastatur              | Touch                                     |
| ------------------------ | --------------------- | ----------------------------------------- |
| Laufen                   | W A S D / Pfeiltasten | Joystick links                            |
| Rennen                   | Umschalt halten       | Joystick ganz ausgelenkt                  |
| Kamera drehen            | Maus ziehen / Q E     | Wischen auf der rechten Bildhälfte        |
| Benutzen (Tür, Brief, …) | E / Leertaste         | Button „Benutzen“ (erscheint in der Nähe) |
| Karte                    | M                     | Button „Karte“                            |
| Menü                     | Esc                   | Button „Menü“                             |

Alle Bedienelemente im sicheren Bereich (MANIFEST-AK-08).

## Kamera

Hinter und etwas über Matti, folgt weich; kann um Matti gedreht werden. Gebäude zwischen Kamera
und Matti werden durchsichtig oder die Kamera rückt näher heran.

## Speicherung

`localStorage` (`dampf.hilden.v1`): gewähltes Haus, Sterne und Abzeichen je Beruf, entdeckte
Wahrzeichen. Kaputte oder fehlende Daten → Neustart ohne Absturz.

## Technik

- Three.js + Vite wie Pilot Pro. Die Stadt wird beim Start deterministisch aus einer kleinen
  Beschreibung (Straßen, Plätze, Parks, Orte) als Raster erzeugt; Gebäude als wenige Meshes,
  damit es auf Handys flüssig läuft.
- Spiellogik (Bewegung, Kollision, Aufgaben, Speicherung) als reines TypeScript, testbar.

## Akzeptanzkriterien

- **HI-AK-01** Stadt: Straßen, Gebäude, Grünflächen und Wasser sind vorhanden; Alter Markt,
  Mittelstraße, Reformationskirche, Bahnhof, Stadtpark und Itter sind enthalten.
- **HI-AK-02** Alle begehbaren Felder hängen zusammen: Von jedem Haus, Arbeitsort und Wahrzeichen
  aus ist jeder andere zu Fuß erreichbar.
- **HI-AK-03** Bewegung: Laufen mit fester Geschwindigkeit, Rennen schneller; man kann nicht in
  Gebäude hineinlaufen (Kollision mit Grundrissen, gleitet an Wänden entlang).
- **HI-AK-04** Hausauswahl: 3 Häuser werden angeboten; das gewählte wird gespeichert und ist nach
  Neuladen Startpunkt. Keine echten Adressen werden angezeigt.
- **HI-AK-05** Haus betreten und verlassen funktioniert (Innenraum ↔ Stadt, Position vor der Tür).
- **HI-AK-06** Jede der 4 Berufsaufgaben lässt sich vollständig erledigen und gibt einen Stern;
  nach 5 Sternen erscheint das Abzeichen.
- **HI-AK-07** Aufgaben-Ziele liegen immer erreichbar auf Straßen/Wegen, nie in Gebäuden oder
  im Wasser.
- **HI-AK-08** Bäcker-Mini-Spiel: Herausholen im grünen Bereich = Erfolg, sonst neuer Versuch.
- **HI-AK-09** Speicherung übersteht Neuladen; kaputte Daten führen zu einem sauberen Neustart.
- **HI-AK-10** (E2E Desktop) Haus wählen, Haus betreten/verlassen, Postboten-Aufgabe per Tastatur
  erledigen (mit Test-Hilfen zum schnellen Hinlaufen).
- **HI-AK-11** (E2E Mobile 375×667) Joystick, „Benutzen“, „Karte“, „Menü“ sichtbar und bedienbar;
  Joystick bewegt Matti.
- **HI-AK-12** Fokusverlust pausiert das Spiel.

## Nicht-Ziele (MVP)

- Kein Möbelkaufen, keine weiteren Figuren, keine Autos/Verkehr, keine echten Adressen, keine
  Innenräume außer dem eigenen Haus und dem Bäcker-Mini-Spiel, kein Sound, kein Mehrspieler.
