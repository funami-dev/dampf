# Spiel: Planetenlander

**Status:** Abgenommen
**Slug:** `planetenlander`

## Zweck

Eine kleine Landefähre sanft auf Monden und Planeten aufsetzen – jeweils mit der **echten
Schwerkraft** und, wo es eine gibt, **echtem Luftwiderstand**. Nebenbei lernt man, wie stark die
Gravitation anderswo im Vergleich zur Erde ist. 2D-Seitenansicht in Pixelgrafik (Phaser), läuft
auch auf älteren iPads (Build-Ziel wie die anderen Spiele).

## Himmelskörper

Gleiche Fähre, gleicher Start, gleicher Treibstoff – nur Schwerkraft und Luft sind verschieden.
**Alle Orte sind von Anfang an spielbar** (Feedback `fb_2rpon5ao`); die Reihenfolge ist die
empfohlene Reihenfolge („Nächster Ort“ nach einer Landung).

| #   | Ort     | g (m/s²) | Erde = 100 % | Luftdichte am Boden (kg/m³) | Himmel / Boden           |
| --- | ------- | -------- | ------------ | --------------------------- | ------------------------ |
| 1   | 🌙 Mond | 1,62     | 17 %         | 0 (keine Luft)              | schwarz / grau           |
| 2   | Ceres   | 0,28     | 3 %          | 0                           | schwarz / dunkelgrau     |
| 3   | Pluto   | 0,62     | 6 %          | 0 (Spuren, vernachlässigt)  | schwarz / beige-weiß     |
| 4   | Titan   | 1,35     | 14 %         | 5,3 (dichter als Erde)      | orange Dunst / braun     |
| 5   | Merkur  | 3,70     | 38 %         | 0                           | schwarz / dunkelgrau     |
| 6   | 🔴 Mars | 3,71     | 38 %         | 0,020 (sehr dünn)           | rosa-beige / rot         |
| 7   | Venus   | 8,87     | 90 %         | 65 (extrem dicht)           | gelber Dunst / gelbbraun |
| 8   | 🌍 Erde | 9,81     | 100 %        | 1,225                       | blau / grün mit Wiese    |

**Gasriesen – nur zum Anschauen, nicht spielbar** (in der Auswahl ausgegraut, mit Erklärung):

| Ort     | g (m/s²) | Erklärung (kindgerecht)                                                                                                                               |
| ------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Jupiter | 24,79    | „Jupiter ist ein Gasriese – er hat keinen festen Boden. Je tiefer man sinkt, desto stärker drückt das Gas, bis jede Fähre zerquetscht würde.“         |
| Saturn  | 10,44    | gleicher Grundgedanke, eigener Satz (z. B. „Saturn ist so leicht, dass er in einer riesigen Badewanne schwimmen würde – aber landen kann man nicht.“) |
| Uranus  | 8,69     | eigener Satz (Eisriese aus Gas und Eis, kein Boden)                                                                                                   |
| Neptun  | 11,15    | eigener Satz (Eisriese, stärkste Winde im Sonnensystem, kein Boden)                                                                                   |

## Physik (echte Einheiten, SI)

Ein Rechenschritt mit fester Schrittweite (z. B. 1/120 s), unabhängig von der Bildrate.

- **Fähre:** Leermasse 1500 kg, Treibstoff 600 kg; Hauptdüse 30 kN entlang der Fähren-Achse;
  Treibstoffverbrauch Hauptdüse 10 kg/s (entspricht ~300 s spezifischem Impuls).
  - Damit schafft die Fähre auch auf der Erde mehr als ihr Gewicht (Schub/Gewicht ≈ 1,46 voll
    betankt) – aber nur knapp, die Erde ist die schwerste Stufe.
- **Drehen:** Seitendüsen drehen die Fähre (Winkelbeschleunigung fest, z. B. 90 °/s²; höchstens
  ±90° Neigung); sie verbrauchen 0,5 kg/s.
- **Schwerkraft:** konstant g des Ortes, nach unten.
- **Luftwiderstand** (nur mit Luft): F = ½ · ρ · v² · c_w · A mit c_w = 1,2 und A = 10 m²,
  entgegen der Bewegung. Dadurch:
  - Endgeschwindigkeit im freien Fall (voll betankt) ca. Venus 7 m/s, Titan 9 m/s, Erde 52 m/s,
    Mars 255 m/s (Mars-Luft bremst kaum).
- **Masse** = Leermasse + restlicher Treibstoff; Beschleunigung = Kraft / Masse.
- Ohne Treibstoff gehen die Düsen aus.

## Spielablauf

1. **Auswahl:** Liste aller Orte als Karten (Name, Symbol, g, „x % der Erde“, Sterne).
   Alle Orte sind frei; Gasriesen ausgegraut mit „ℹ️ Warum nicht?“ → Erklärung.
2. **Lern-Karte** vor dem Start:
   - g-Wert und Vergleich mit der Erde („Hier ist die Schwerkraft 6-mal schwächer als auf der Erde.“).
   - „Ein Ball fällt hier in 1 Sekunde x m tief.“ (½ · g · 1 s², ohne Luft) – auf der Erde 4,9 m.
   - Ein Satz zur Luft („Keine Luft – nichts bremst dich.“ / „Dichte Luft bremst dich wie ein Fallschirm.“).
   - Ein Fakt zum Ort. Knopf „Los!“.
3. **Flug:** Start 300 m über dem Boden, 150 m seitlich neben der Landeplattform, in Ruhe, aufrecht.
   - Boden: festes Höhenprofil je Ort (immer gleich, damit es fair ist), Hügel/Krater als
     Pixel-Linie, eine flache, markierte Plattform (30 m breit).
   - Die Ansicht folgt der Fähre; Maßstab fest, Plattform immer per Pfeil angezeigt, wenn außerhalb.
   - Seitlich gibt es unsichtbare Wände (Bereich 600 m breit).
4. **Ergebnis:**
   - **Gelandet**, wenn die Fähre mit beiden Beinen auf der Plattform aufsetzt mit: Sinken ≤ 2 m/s,
     seitlich ≤ 1 m/s, Neigung ≤ 10°.
   - Sonst **Bruchlandung**: kindgerechter Comic-„Rumms“ (Fähre fällt auseinander, Sternchen), kein
     Feuer/keine Personen. Auch das Aufsetzen neben der Plattform zählt als Bruchlandung
     („Zu felsig hier – ziel auf die Plattform!“).
   - Ergebnis-Bildschirm: Sinkgeschwindigkeit, Neigung, Rest-Treibstoff, Sterne; „Nochmal“,
     „Nächster Ort“ (wenn frei), „Zur Auswahl“.
5. **Sterne:** ★ gelandet · ★★ zusätzlich Sinken ≤ 1 m/s · ★★★ zusätzlich ≥ 30 % Treibstoff übrig.
   Bestwert je Ort wird lokal gespeichert (`dampf.planetenlander.v1`);
   kaputte Daten → Neustart ohne Absturz.

## Anzeigen im Flug

Höhe über Boden (m), Sinken/Steigen (m/s, Pfeil), seitlich (m/s), Neigung (°), Treibstoff (%), g
des Ortes. Werte für die Landung färben sich grün, sobald sie im sicheren Bereich sind, sonst gelb/rot.

## Steuerung

| Eingabe                        | Aktion                |
| ------------------------------ | --------------------- |
| ↑ / W / Leertaste (halten)     | Hauptdüse             |
| ← / A bzw. → / D (halten)      | drehen links / rechts |
| Touch: Knopf „🔥 Schub“ rechts | Hauptdüse             |
| Touch: Knöpfe „⟲“ „⟳“ links    | drehen                |
| P / Esc / Pause-Knopf          | Pause                 |

Fokusverlust pausiert. Kein Doppeltipp-Zoom (wie alle Spiele). Mehrfach-Touch: Schub und Drehen
gleichzeitig möglich.

## Grafik und Ton

Pixelgrafik per Code (keine Bilddateien), Düsenflamme animiert, Staubwolke beim Aufsetzen auf Orten
ohne Luft, Dunst-Schichten auf Titan/Venus. Kein Ton im MVP.

## Akzeptanzkriterien

**Physik und Daten (Vitest)**

- **PL-AK-01** Die Orte haben genau die g-Werte und Luftdichten aus der Tabelle; Gasriesen sind
  als nicht spielbar markiert und haben eine Erklärung.
- **PL-AK-02** Freier Fall ohne Luft: nach 1 s ist die Fähre ½ · g tief und hat v = g (±1 %), auf
  jedem Ort.
- **PL-AK-03** Volle Hauptdüse, aufrecht: Beschleunigung = 30 kN / Masse − g (±1 %); Treibstoff
  sinkt um 10 kg/s; leer → kein Schub mehr.
- **PL-AK-04** Mit Luft stellt sich im freien Fall die Endgeschwindigkeit √(2 m g / (ρ c_w A))
  ein (±2 %), z. B. Venus ≈ 7 m/s; auf Orten ohne Luft gibt es keine Bremsung.
- **PL-AK-05** Landung: gelandet genau bei Sinken ≤ 2 m/s, seitlich ≤ 1 m/s, Neigung ≤ 10° auf
  der Plattform; sonst Bruchlandung; neben der Plattform immer Bruchlandung.
- **PL-AK-06** Sterne nach den Regeln oben; Bestwerte überstehen Neuladen;
  kaputte Daten → Ausgangszustand.
- **PL-AK-07** Lern-Karte: Fall-Strecke in 1 s = ½ · g (gerundet auf eine Nachkommastelle), Text
  „x-mal schwächer/stärker als auf der Erde“ passend.

**Im Browser (Playwright)**

- **PL-AK-08** (E2E Desktop) Auswahl zeigt alle Orte, alle sind sofort spielbar; Gasriesen
  zeigen beim Antippen die Erklärung und lassen sich nicht starten.
- **PL-AK-09** (E2E Desktop) Mond: Lern-Karte → Los → mit Tasten Schub geben verändert
  Sinkgeschwindigkeit; über eine Test-Hilfe kurz über der Plattform sanft aufsetzen → „Gelandet“,
  Sterne, „Nächster Ort: Ceres“; Neuladen behält die Sterne.
- **PL-AK-10** (E2E Desktop) Zu schnell aufsetzen → Bruchlandung mit „Nochmal“.
- **PL-AK-11** (E2E Mobile 375×667) Knöpfe Schub/Drehen sichtbar und bedienbar (auch
  gleichzeitig), Anzeigen lesbar, kein horizontales Scrollen.
- **PL-AK-12** Fokusverlust pausiert; Spiel erscheint im Portal mit Version 1.0.0.
