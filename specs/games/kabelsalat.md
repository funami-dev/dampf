# Spiel: Kabelsalat

**Status:** Abgenommen
**Slug:** `kabelsalat`

## Zweck

Grundlegende Elektronik verstehen lernen, für Kinder ab etwa 10 Jahren. Man zieht Bauteile als
**Blöcke** per Drag & Drop auf die Werkbank. Jedes Bauteil hat **Anschlusspunkte** (eine Batterie
zwei, ein Umschalter drei, später ein Transistor drei). Zwischen zwei Punkten zieht man ein
**Kabel**. Der Strom fließt sichtbar, Lämpchen leuchten, wenn der Stromkreis geschlossen ist.
Daneben zeigt der **Schaltplan** dieselbe Schaltung mit den echten Symbolen, damit man
Schaltpläne lesen lernt. Keine Programmierung.

Es gibt **Missionen** (kurze Aufgaben mit Erklärung) und **Freibau** (alle freigeschalteten Teile,
wird gespeichert). Kein Zeitlimit, kein Verlieren; Fehler wie ein Kurzschluss werden freundlich
erklärt.

Eigenes Spiel im Genre „Elektronik-Baukasten“ – ohne Namen, Aussehen oder Bauteil-Grafiken eines
bestimmten bekannten Programms. 2D (Phaser), Grafik per Code, Klänge per Web Audio (keine
Bild- oder Audiodateien), läuft auf älteren iPads und Handys.

## Version 1.0: Lampen an und aus

Der erste Schritt deckt nur Gleichstrom mit Lämpchen und Schaltern ab. Weitere Bauteile kommen in
späteren Versionen (siehe „Später“).

### Bauteile (Blöcke) und Kabel

Jedes Bauteil ist ein Block, den man frei auf der Werkbank verschiebt (er rastet an einem groben
Raster ein, damit es ordentlich aussieht). Am Block sitzen seine **Anschlusspunkte** als gut
sichtbare, große Punkte (Tippfläche mindestens 44 px), beschriftet wo nötig (+/−, später A/K oder
B/C/E).

| Bauteil        | Anschlusspunkte | Verhalten                                                |
| -------------- | --------------- | -------------------------------------------------------- |
| Batterie 4,5 V | 2 (+, −)        | Spannungsquelle mit kleinem Innenwiderstand              |
| Lämpchen       | 2               | Widerstand; Helligkeit nach Strom (aus / schwach / hell) |
| Schalter       | 2               | offen = kein Strom, zu = Verbindung                      |
| Umschalter     | 3 (Mitte, A, B) | verbindet die Mitte mit A oder mit B                     |

- **Kabel:** von einem Punkt zu einem anderen ziehen (oder: Punkt antippen, dann zweiten Punkt
  antippen). An einem Punkt dürfen mehrere Kabel hängen – so entstehen Abzweigungen. Ein Kabel vom
  Punkt zu sich selbst oder doppelt zwischen denselben Punkten wird nicht angelegt.
- Kabel sind weiche Bögen in wählbaren Farben (automatisch abwechselnd) und folgen, wenn man einen
  Block verschiebt.
- Bauteile lassen sich in 90°-Schritten **drehen** (die Punkte drehen mit).
- Werte werden kindgerecht gerundet gezeigt („0,3 A“, „4,5 V“).

### Strom sehen

- Die Simulation rechnet echt (ohmsches Gesetz, Knoten- und Maschenregel) und läuft bei jeder
  Änderung sofort neu.
- In Leitungen mit Strom wandern **kleine Lichtpunkte** von + nach −; mehr Strom = schneller.
- Lämpchen leuchten je nach Strom; zwei hintereinander leuchten sichtbar schwächer als eines.
- **Kurzschluss** (Batterie-Pole ohne Verbraucher verbunden): Die Batterie wird rot und „warm“
  (Wellenlinien), alle Lämpchen sind aus, eine Sprechblase erklärt: „Kurzschluss! Der Strom nimmt
  den kürzesten Weg und geht nicht durch das Lämpchen.“ Kein Feuer, nichts geht kaputt.
- **Offener Stromkreis:** Nichts leuchtet; ein Tipp-Knopf „💡 Hilfe“ zeigt, wo der Kreis offen ist
  (Anschluss blinkt langsam, höchstens 2 Hz).

### Schaltplan

- Neben (am Handy: umschaltbar über) der Werkbank zeigt der **Schaltplan** dieselbe Schaltung mit
  Normsymbolen (Batterie, Lampe, Schalter, Umschalter) an denselben Stellen wie die Blöcke; Kabel
  werden als rechtwinklige Leitungen gezeichnet, Abzweigungen mit Verbindungspunkt.
- Geschlossene Schalter und leuchtende Lampen sind auch im Schaltplan zu erkennen; Stromfluss als
  hervorgehobene Leitungen.

### Bedienung

- Oben zwei Modi: **🔧 Bauen** und **▶ Ausprobieren**. Der Strom fließt in beiden Modi.
- **Bauen:** Block aus der Teilekiste (unten) auf die Werkbank ziehen (oder antippen, dann Stelle
  antippen). Blöcke verschiebt man durch Ziehen. Kabel zieht man von Punkt zu Punkt (oder Punkt
  antippen, zweiten Punkt antippen). Antippen eines Blocks oder Kabels wählt es aus; dann gibt es
  „↻ Drehen“ (nur Blöcke) und „🗑 Weg“ (Tastatur: R, Entf). Entfernt man einen Block, verschwinden
  seine Kabel mit.
- **Ausprobieren:** Antippen eines Schalters/Umschalters schaltet ihn um; sonst bewegt sich nichts.
- Tastatur: B/A für die Modi, Tab/Enter zum Wählen von Blöcken und Punkten, R/Entf.
- Kein Markieren und kein Kontextmenü beim langen Drücken (MANIFEST-AK-12).

### Missionen (Version 1.0)

Jede Mission hat eine kurze Erklärung (1–3 Sätze, mit Bild), ein Ziel und eine vorgegebene
Teilekiste. Geschafft = ✓ und ein Stern; ein Extra-Stern, wenn man höchstens so viele Teile wie
nötig verbaut hat. Missionen werden der Reihe nach frei.

1. **Licht an!** Batterie, Lämpchen und zwei Kabel: Das Lämpchen soll leuchten. (Ein Stromkreis muss
   geschlossen sein.)
2. **Mit Schalter:** Das Lämpchen geht mit dem Schalter an und aus.
3. **Zwei hintereinander:** Zwei Lämpchen in Reihe – beide leuchten, aber schwächer.
4. **Zwei nebeneinander:** Zwei Lämpchen parallel – beide leuchten hell.
5. **Beide Schalter nötig:** Das Lämpchen leuchtet nur, wenn beide Schalter an sind (UND).
6. **Ein Schalter reicht:** Das Lämpchen leuchtet, wenn mindestens einer an ist (ODER).
7. **Treppenhaus-Licht:** Mit zwei Umschaltern lässt sich die Lampe von beiden Enden an- und
   ausmachen.
8. **Kurzschluss-Detektiv:** Eine fertige Schaltung hat einen Kurzschluss – finde und behebe ihn.

Geprüft wird automatisch: Das Spiel schaltet die Schalter durch alle Stellungen und vergleicht,
ob die Lämpchen wie verlangt leuchten.

### Freibau

- Alle Teile, die in Missionen schon vorkamen; höchstens 20 Blöcke und 40 Kabel.
- Die Schaltung bleibt nach Neuladen erhalten (`dampf.kabelsalat.v1`, zusammen mit dem
  Missions-Fortschritt). „🧹 Alles weg“ fragt vorher nach.

### Bauteile-Buch

Zu jedem Teil ein kurzer Steckbrief (Bild, Schaltsymbol, was es tut, ein Alltagsbeispiel), wird
mit dem ersten Einsatz freigeschaltet.

### Klang

Leise Web-Audio-Klänge: Einrasten (Klick), Schalter (Klack), Lämpchen geht an (sanftes „Pling“),
Kurzschluss (kurzes tiefes Brummen), Mission geschafft (kleine Melodie). Lautstärke und Stumm im
Menü; startet leise (30 %).

## Später (nicht in 1.0)

- Version 1.1: LED (2 Punkte: Anode/Kathode, Richtung!) und Widerstand mit Farbringen, Puff-Wölkchen bei LED ohne
  Widerstand; Multimeter (Volt und Milliampere an zwei Messspitzen).
- Version 1.2: Taster, Drehregler (Potentiometer), Summer.
- Version 1.3: Kondensator (lädt und entlädt sich, Lämpchen glimmt nach), einfaches „Oszilloskop“.
- Version 1.4: Wechselstromquelle, Diode, Gleichrichter.
- Danach: Transistor (3 Punkte: Basis, Kollektor, Emitter) als Schalter, Lichtsensor, Motor.

## Akzeptanzkriterien

**Logik (Vitest)**

- **KS-AK-01** Netz aus Blöcken und Kabeln: Jedes Bauteil hat die richtige Zahl Punkte (Batterie 2,
  Lämpchen 2, Schalter 2, Umschalter 3); Kabel verbinden genau ihre zwei Punkte, mehrere Kabel an
  einem Punkt bilden einen Knoten; Kabel zu sich selbst und doppelte Kabel werden abgelehnt;
  Block entfernen entfernt seine Kabel; Drehen und Verschieben ändern die Verbindungen nicht.
- **KS-AK-02** Simulation: Batterie + Lämpchen → Strom nach ohmschem Gesetz (±2 %); zwei Lämpchen
  in Reihe → halber Strom, beide schwächer; parallel → beide wie eines allein; offener Schalter →
  kein Strom; Umschalter verbindet je nach Stellung; nicht angeschlossene Teile ändern nichts.
- **KS-AK-03** Kurzschluss: Batteriepole ohne Verbraucher verbunden → als Kurzschluss erkannt,
  alle Lämpchen aus; keine ungültigen Zahlen (NaN/Unendlich), auch bei Schleifen ohne Batterie.
- **KS-AK-04** Missionen 1–8: Für jede Mission gibt es eine richtige Lösung, die die Prüfung
  besteht, und typische falsche Lösungen, die sie nicht bestehen (z. B. Mission 5 mit ODER statt
  UND); Sterne und Freischalten der Reihe nach.
- **KS-AK-05** Speichern: Freibau-Schaltung, Schalterstellungen und Fortschritt überstehen
  Neuladen; kaputte Daten → Neustart ohne Absturz.

**Im Browser (Playwright)**

- **KS-AK-06** (E2E Desktop) Mission 1 und 2 durch Ziehen von Blöcken und Kabeln lösen, Lämpchen leuchtet,
  Schalter im Modus „Ausprobieren“ schaltet es aus und an; Schaltplan zeigt dieselbe Schaltung.
- **KS-AK-07** (E2E Mobile 375×667) Teil antippen → Stelle antippen setzt es; Punkt antippen →
  zweiten Punkt antippen legt ein Kabel; Drehen und Entfernen gehen; Werkbank und Schaltplan umschaltbar; kein Querscrollen.
- **KS-AK-08** (E2E) Kurzschluss bauen → Warnung erscheint, keine Fehler in der Konsole.
- **KS-AK-09** Freibau übersteht Neuladen; Spiel erscheint im Portal mit Version 1.0.0.
- **KS-AK-10** Ruhig und sicher: nichts blinkt schneller als 2 Hz, Klänge starten leise,
  Fokusverlust pausiert die Lichtpunkte (die Schaltung bleibt).
