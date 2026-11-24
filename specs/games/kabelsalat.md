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
- **Offener Stromkreis:** Nichts leuchtet; im Freibau zeigt „💡 Hilfe“, wo der Kreis offen ist
  (Anschluss blinkt langsam, höchstens 2 Hz).

### Tipps Schritt für Schritt (Version 1.1, Feedback `fb_awvz9vwf`)

- In jeder Mission heißt der Knopf **„💡 Tipp (n/m)“**. Jeder Druck blendet den **nächsten Schritt**
  ein (3–6 Schritte je Mission), mit kurzer Erklärung, warum – z. B. „Kabel von + zum Lämpchen:
  Der Strom kommt aus dem Pluspol.“
- Die eingeblendeten Schritte stehen in einer kleinen Liste am Rand (schließbar, verdeckt die
  Werkbank nicht); **erledigte Schritte bekommen automatisch ein ✓**, auch wenn man sie ohne Tipp
  geschafft hat.
- Beim aktuellen Schritt leuchten die betroffenen Teile oder Anschlusspunkte sanft (1 Hz).
- Tipps kosten keine Sterne.

### Schaltplan

- **Platz nutzen** (Version 1.1, Feedback `fb_9pxzf1oa`): Werkbank und Schaltplan füllen den
  freien Platz aus; ihre Form passt sich dem Bildschirm an (die Werkbank wird breiter oder höher
  statt leeren Rand zu lassen). Am Computer teilen sie sich die Breite (Werkbank etwa 3/5,
  Schaltplan 2/5) bei voller Höhe; Ziel, Modus-Knöpfe und Menü stehen in einer schmalen Zeile.
  Wird der Platz kleiner, rücken Teile, die nicht mehr hineinpassen, an den Rand.
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
ob die Lämpchen wie verlangt leuchten. Bei Missionen mit Schaltern zählt sie erst, wenn man nach dem Verkabeln
selbst einen Schalter umgelegt hat (sonst Hinweis „Jetzt probier die Schalter aus“).

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

## Version 1.2: LED, Widerstand und Messgerät (Vorschlag im Chat angenommen)

### Neue Bauteile

| Bauteil    | Anschlusspunkte   | Verhalten                                                                       |
| ---------- | ----------------- | ------------------------------------------------------------------------------- |
| LED        | 2 (A = +, K = −)  | leuchtet nur richtig herum (A zum Plus); braucht etwa 2 V; zu viel Strom → Puff |
| Widerstand | 2                 | bremst den Strom; Wert 100 Ω, 220 Ω, 470 Ω oder 1 kΩ, mit Farbringen            |
| Messgerät  | 2 (+ rot, − blau) | zeigt **Volt** (Spannung zwischen den Spitzen) oder **mA** (Strom hindurch)     |

- **LED:** Die Rechnung nimmt eine Schwellspannung von 2,0 V und einen kleinen Eigenwiderstand
  (5 Ω). Andersherum eingebaut fließt kein Strom. Helligkeit: unter 1 mA aus, bis 8 mA schwach,
  bis 30 mA hell. **Über 30 mA:** ein kleines graues **Puff-Wölkchen** steigt auf, die LED bleibt
  dunkel und eine Sprechblase erklärt: „Puff! Zu viel Strom – die LED braucht einen Widerstand als
  Bremse.“ Nichts geht kaputt: Mit Widerstand leuchtet sie sofort wieder.
- **Widerstand:** Block mit Farbringen nach Wert (100 Ω braun-schwarz-braun, 220 Ω
  rot-rot-braun, 470 Ω gelb-violett-braun, 1 kΩ braun-schwarz-rot). Im Modus Bauen: Widerstand
  antippen, dann „🎨 Wert“ wechselt reihum (Start 220 Ω). Auf dem Block steht der Wert.
- **Messgerät:** Block mit kleiner Anzeige. Im Modus ▶ Ausprobieren schaltet Antippen zwischen
  **V** und **mA** um (Start: V). Als Voltmeter misst es fast stromlos (10 MΩ); als
  Strommesser ist es fast ein Kabel (0,1 Ω) – darum gehört es dann **in den Kreis**. Steckt es auf
  mA direkt an der Batterie, gibt es einen Kurzschluss (wie in echt), mit Hinweis
  „Auf mA ist das Messgerät wie ein Kabel – miss Strom immer in Reihe.“ Anzeige gerundet
  („4,5 V“, „290 mA“), eine Nachkommastelle bei Volt.
- **Schaltplan:** LED als Dreieck mit Strich und zwei Pfeilen (leuchtet gelb, wenn an), Widerstand
  als Rechteck mit Wert, Messgerät als Kreis mit „V“ bzw. „A“.
- **Bauteile-Buch:** Steckbriefe für LED, Widerstand und Messgerät.

### Neue Missionen

9. **LED mit Bremse:** Batterie, LED, Widerstand. Die LED soll leuchten, ohne Puff. (Erklärung:
   Die LED braucht einen Widerstand, und sie leuchtet nur richtig herum: A zum Plus.)
10. **Spannung messen:** Batterie, Lämpchen, Messgerät. Das Lämpchen leuchtet, und das Messgerät
    zeigt auf **V** die Spannung am Lämpchen (mindestens 3,5 V).
11. **Strom messen:** Batterie, Lämpchen, Messgerät. Das Messgerät steckt **in Reihe** im Kreis,
    steht auf **mA** und zeigt den Strom (mindestens 200 mA); das Lämpchen leuchtet.

Jede neue Mission hat 3–6 Tipp-Schritte wie die anderen. Nach Mission 9 sind LED und Widerstand,
nach Mission 10 das Messgerät im Freibau verfügbar.

## Version 1.3: Taster, Drehregler und Summer (Vorschlag im Chat angenommen)

### Neue Bauteile

| Bauteil    | Anschlusspunkte | Verhalten                                                                           |
| ---------- | --------------- | ----------------------------------------------------------------------------------- |
| Taster     | 2               | verbindet nur, **solange man ihn drückt** (im Modus ▶ Ausprobieren gedrückt halten) |
| Drehregler | 2               | regelbarer Widerstand mit 5 Stufen: 0, 10, 25, 60, 150 Ω                            |
| Summer     | 2               | brummt, wenn genug Strom fließt (ab 20 mA); 60 Ω                                    |

- **Taster:** Loslassen öffnet ihn wieder; beim Speichern ist er immer offen. Im Schaltplan wie ein
  Schalter mit kleinem Druckknopf.
- **Drehregler:** Im Modus ▶ Ausprobieren dreht jedes Antippen eine Stufe weiter (nach der
  letzten wieder auf 0). Der Zeiger am Knopf zeigt die Stufe, darunter steht der Wert. Im
  Schaltplan: Widerstand mit schrägem Pfeil.
- **Summer:** Wenn er an ist, wackeln kleine Schallwellen neben ihm (ruhig, 1 Hz) und es klingt
  ein leiser, freundlicher Piepton (folgt der Lautstärke, stumm = stumm; höchstens zweimal pro
  Sekunde). Im Schaltplan: Halbkreis mit zwei Anschlüssen.
- **Bauteile-Buch:** Steckbriefe für Taster, Drehregler und Summer.

### Neue Missionen

12. **Türklingel:** Batterie, Taster, Summer. Der Summer brummt nur, solange der Taster gedrückt
    ist.
13. **Dimmer:** Batterie, Lämpchen, Drehregler. Mit dem Drehregler lässt sich das Lämpchen hell
    und schwach stellen (die Prüfung dreht alle Stufen durch).
14. **Klingel mit Licht:** Batterie, Taster, Summer, Lämpchen. Auf Knopfdruck brummt der Summer
    **und** das Lämpchen leuchtet; losgelassen ist beides aus.

Jede Mission hat 3–6 Tipp-Schritte. Nach Mission 12 sind Taster und Summer, nach Mission 13 der
Drehregler im Freibau verfügbar.

## Später

- Version 1.4: Kondensator (lädt und entlädt sich, Lämpchen glimmt nach), einfaches „Oszilloskop“.
- Version 1.5: Wechselstromquelle, Diode, Gleichrichter.
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
- **KS-AK-11** (Vitest) Tipps: Jede Mission hat 3–6 Schritte mit Text; für eine richtige Lösung
  sind am Ende alle Schritte erledigt, in einer leeren Werkbank keiner (außer reinen
  Erklär-Schritten); Schritte zählen auch, wenn die Teile anders angeordnet sind.
- **KS-AK-12** (E2E) Tipp-Knopf zeigt nacheinander die Schritte, ein erledigter Schritt bekommt ✓;
  auf einem breiten Bildschirm (1300 × 700) füllen Werkbank und Schaltplan zusammen mindestens
  85 % der Breite und 75 % der Höhe des Spielbereichs.
- **KS-AK-13** (Vitest) LED und Widerstand: Batterie + 220 Ω + LED richtig herum → etwa 11 mA
  (±10 %), „hell“; mit 1 kΩ „schwach“; falsch herum → kein Strom; ohne Widerstand → „puff“ und kein
  Leuchten; Werte wechseln reihum 100 → 220 → 470 → 1000 → 100; Wert bleibt beim Speichern,
  unbekannte Werte → 220 Ω.
- **KS-AK-14** (Vitest) Messgerät: auf V über dem Lämpchen ≈ Spannung am Lämpchen, ändert den Strom
  nicht merklich (±1 %); auf mA in Reihe ≈ Lämpchenstrom (±5 %); auf mA direkt an der Batterie →
  Kurzschluss; Umschalten nur im Modus Ausprobieren (toggle).
- **KS-AK-15** (Vitest) Missionen 9–11: richtige Lösungen bestehen, falsche nicht (9: LED falsch
  herum oder ohne Widerstand; 10: Messgerät auf mA; 11: Messgerät auf V oder parallel); Tipp-Schritte
  wie KS-AK-11.
- **KS-AK-16** (E2E) Mission 9 bauen: LED ohne Widerstand → Puff-Hinweis; mit Widerstand leuchtet
  sie und die Mission ist geschafft; Widerstandswert über „🎨 Wert“ wechseln; Schaltplan zeigt die
  neuen Symbole; keine Fehler.
- **KS-AK-17** (Vitest) Taster verbindet nur, wenn gedrückt; nach dem Laden immer offen.
  Drehregler: 5 Stufen, reihum, mehr Ohm = weniger Strom; Stufe bleibt beim Speichern, unbekannte
  Stufe → 0. Summer: an ab 20 mA, mit 4,5 V allein ≈ 74 mA.
- **KS-AK-18** (Vitest) Missionen 12–14: richtige Lösungen bestehen, falsche nicht (12: Taster
  überbrückt, Summer dauerhaft an; 13: Drehregler parallel statt in
  Reihe; 14: Lämpchen nur ohne Taster); Tipp-Schritte wie KS-AK-11.
- **KS-AK-19** (E2E) Mission 12: Taster gedrückt halten → Summer an, loslassen → aus; geschafft;
  Mission 13: Antippen des Drehreglers macht das Lämpchen schwächer; keine Fehler.
- **KS-AK-10** Ruhig und sicher: nichts blinkt schneller als 2 Hz, Klänge starten leise,
  Fokusverlust pausiert die Lichtpunkte (die Schaltung bleibt).
