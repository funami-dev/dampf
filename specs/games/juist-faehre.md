# Spiel: Juist-Fähre

**Status:** Umgesetzt
**Slug:** `juist-faehre`
**Name:** „Juist-Fähre“ (Arbeitstitel)

## Zweck

3D-Schiffssimulator: Man ist Kapitän einer Fähre und fährt **von Norddeich nach Juist und
zurück**. Es geht um den **Fahrplan** (pünktlich ablegen und ankommen) und um zufriedene
**Passagiere** (ruhige Fahrt, sanftes Anlegen). Eine Fahrt dauert etwa **5 Minuten**.

## Schiffe

Acht Schiffe, die sich **nur im Aussehen** unterscheiden (gleiches Fahrverhalten):

Frisia I, Frisia II, Frisia III, Frisia IV, Frisia VII, Frisia VIII, Frisia IX, Frisia E-I.

- **Darstellung:** eigene, vereinfachte Low-Poly-Modelle, die sich an Fahrgastschiffen der
  Juist-Linie orientieren (dunkler Rumpf, weiße Aufbauten, Brücke vorn, Schornstein bzw. bei der
  Frisia E-I kein Schornstein). Unterschiede in Länge, Zahl der Decks und Aufbauten; keine
  originalgetreuen Nachbauten.
- **Name** steht am Bug (neutrale Schrift). **Keine Logos der Reederei**, keine nachgebildeten
  Logos, keine Bilddateien.

## Welt (vereinfacht)

- **Norddeich** (Festland, Süden): Deich, Hafen mit Mole und Fähranleger, ein paar Gebäude.
- **Wattenmeer** dazwischen, **Juist** (Norden): lange, schmale Insel mit Dünen, Strand, Ort und
  Hafen mit Anleger auf der Südseite.
- **Fahrwasser** mit grünen und roten Tonnen als Orientierung. Abstände stark verkürzt, damit eine
  Fahrt etwa 5 Minuten dauert.
- **Land und Sandbänke:** Das Schiff kann nicht an Land fahren; bei Grundberührung bleibt es heil,
  stoppt sanft (Meldung „Auf Grund gelaufen!“) und kostet Zufriedenheit.
- Tageslicht, leichte Wellen, Möwen optional.

## Ablauf einer Fahrt

1. **Auswahl:** Schiff wählen, Richtung (Norddeich → Juist oder Juist → Norddeich).
2. **Einsteigen:** Das Schiff liegt am Anleger. Passagiere steigen ein (Zähler). Abfahrt laut
   Fahrplan, z. B. „Abfahrt 09:30“. Button „Ablegen“, sobald alle an Bord sind.
3. **Fahrt:** Geschwindigkeit per Fahrhebel, Kurs per Ruder. Anzeige: Spieluhr, Soll-Ankunft,
   Geschwindigkeit (Knoten), Entfernung zum Ziel, Zufriedenheit.
4. **Anlegen:** Im Zielhafen langsam an den Anleger fahren; unter 1 m/s im Anlegebereich →
   Button „Festmachen“.
5. **Ergebnis:** Pünktlichkeit, Zufriedenheit, 1–3 Sterne. Danach „Zurückfahren“ (gleiches
   Schiff, Gegenrichtung) oder „Anderes Schiff“.

## Fahrplan und Zeit

- **Spieluhr:** 1 Sekunde echte Zeit = 18 Sekunden Spielzeit (5 Minuten ≈ 1,5 Stunden, wie die
  echte Überfahrt).
- Jede Fahrt hat **Abfahrt** und **Soll-Ankunft** (90 Spielminuten später).
- **Pünktlichkeit:** Ankunft bis 5 Spielminuten nach Soll = pünktlich; jede weitere Minute
  Verspätung kostet Punkte. Zu frühes Ablegen ist nicht möglich.

## Passagiere

- Anzahl je Fahrt zufällig (100–300). Einsteigen dauert wenige Sekunden.
- **Zufriedenheit** startet bei 100 % und sinkt bei:
  - Grundberührung (−15 %),
  - zu scharfen Kurven bei hoher Fahrt (Schräglage, −1 % pro Sekunde),
  - zu hartem Anlegen (Aufprall am Anleger mit mehr als 1 m/s, −10 %),
  - starker Verspätung (−1 % pro Spielminute über 5 Minuten).
- **Sterne:** Pünktlichkeit und Zufriedenheit ergeben 1–3 Sterne.

## Fahrmodell (vereinfacht)

Reine Logik in TypeScript, testbar ohne 3D.

- **Fahrhebel:** −1 (voll zurück) bis +1 (voll voraus) in Stufen; Geschwindigkeit nähert sich
  Fahrhebel × 12 m/s mit 8 %/s an (rückwärts höchstens 4 m/s).
- **Ruder:** −35° bis +35°; Drehrate wächst mit der Geschwindigkeit (bei 0 m/s keine Drehung).
- **Schräglage** wächst mit Ruder × Geschwindigkeit; über einer Grenze sinkt die Zufriedenheit.
- **Grund:** Wasser unter einer Mindesttiefe (Land, Sandbank) → Schiff stoppt, wird zurück ins
  tiefe Wasser gesetzt.
- **Anlegebereich:** Rechteck vor dem Anleger; Festmachen nur bei < 1 m/s darin.

## Steuerung

| Aktion             | Tastatur      | Touch                            |
| ------------------ | ------------- | -------------------------------- |
| Fahrhebel          | W / S, ↑ / ↓  | Fahrhebel rechts (senkrecht)     |
| Ruder              | A / D, ← / →  | Ruder-Regler unten (waagerecht)  |
| Ablegen/Festmachen | E / Leertaste | Button (erscheint, wenn möglich) |
| Kamera wechseln    | C             | Button „Kamera“                  |
| Menü               | Esc           | Button „Menü“                    |

Kameras: **hinter dem Schiff** (Start) und **Brücke** (Blick nach vorn). Alle Bedienelemente im
sicheren Bereich (MANIFEST-AK-08).

## Logbuch

Im Browser gespeichert (`dampf.juist-faehre.v1`): beste Sterne je Schiff und Richtung, Zahl der
Fahrten. Kaputte Daten → leeres Logbuch ohne Absturz.

## Technik

Three.js + Vite (wie Pilot Pro). Fahrmodell, Welt (Land/Wasser/Tiefe, Häfen, Tonnen),
Fahrplan/Passagiere und Logbuch als reines TypeScript.

## Akzeptanzkriterien

- **JF-AK-01** Alle 8 Schiffe sind wählbar; jedes Modell trägt seinen Namen; keine Bilddateien.
- **JF-AK-02** Fahrhebel: Geschwindigkeit nähert sich Hebel × 12 m/s (rückwärts max. 4 m/s).
- **JF-AK-03** Ruder: keine Drehung im Stand; Drehrate wächst mit der Geschwindigkeit.
- **JF-AK-04** Land/Sandbank: Schiff fährt nicht auf Land, stoppt, bleibt heil; Zufriedenheit −15 %.
- **JF-AK-05** Fahrwasser von Hafen zu Hafen ist durchgehend tief genug (alle Tonnen-Wegpunkte im
  Wasser); beide Anleger liegen im Wasser.
- **JF-AK-06** Spieluhr läuft 18-fach; Soll-Ankunft = Abfahrt + 90 Spielminuten.
- **JF-AK-07** Ablegen erst, wenn alle Passagiere an Bord sind.
- **JF-AK-08** Festmachen nur im Anlegebereich und unter 1 m/s; Aufprall > 1 m/s kostet 10 %.
- **JF-AK-09** Zufriedenheit sinkt bei Schräglage und Verspätung wie beschrieben; Sterne 1–3 aus
  Pünktlichkeit und Zufriedenheit.
- **JF-AK-10** Logbuch speichert beste Sterne je Schiff und Richtung; robust bei kaputten Daten.
- **JF-AK-11** (E2E Desktop) Schiff wählen, Passagiere einsteigen, ablegen, mit Test-Hilfe zum
  Zielhafen, festmachen, Ergebnis mit Sternen, „Zurückfahren“ startet die Gegenrichtung.
- **JF-AK-12** (E2E Mobile 375×667) Fahrhebel, Ruder, Kamera, Menü sichtbar und bedienbar.
- **JF-AK-13** Fokusverlust pausiert (auch die Spieluhr).

## Nicht-Ziele (MVP)

- Keine Gezeiten/Ebbe-Flut, keine Fahrrinnen-Strafen außer Grundberührung, kein Wetter, keine
  anderen Schiffe, kein Sound, keine Original-Logos, keine originalgetreuen Schiffsmodelle.
