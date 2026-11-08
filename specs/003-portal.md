# 003 – Portal / Startseite

**Status:** Umgesetzt

## Zweck

Die Startseite (`/`) zeigt alle veröffentlichten Spiele als Karten. Ein Klick auf eine Karte
öffnet das Spiel als Vollbild-Seite (`/games/<slug>/`), im selben Tab.

## Inhalt & Layout

- Kopfbereich: Logo/Name „Dampf“ + Kurzbeschreibung (ein Satz).
- Optik: Retro-Pixel-Stil nach 000-vision (dunkles Blau-Grau, Cyan-Akzente, Pixel-Schrift
  für Überschriften, gut lesbare Schrift für Fließtext).
- Raster aus Spielkarten. Je Karte: Thumbnail, Titel, **Version** (klein, z. B. „v1.0.0“),
  Beschreibung, Steuerungs-Icons (Tastatur / Touch).
- **Neuigkeiten** (oben, über den Spielkarten), aus den `changelog`-Einträgen aller veröffentlichten
  Spiele:
  - die neuesten Einträge zuerst (nach Datum, bei gleichem Datum nach der Sortierung der Spiele),
    höchstens 10.
  - Die 3 neuesten stehen direkt da, die weiteren unter „Weitere Neuigkeiten“ zum Aufklappen
    (`<details>`, geht ohne JavaScript). Der Bereich scrollt nicht in sich selbst, damit man auf
    dem Handy die Seite weiter wischen kann.
  - Je Eintrag: Datum (z. B. „8. November 2026“), Spieltitel als Link zum Spiel, Version und die
    Punkte als Liste.
  - Ohne Einträge entfällt der Bereich.
- Sortierung: `order` aufsteigend, danach `title` alphabetisch.
- Leerer Zustand: Gibt es keine veröffentlichten Spiele, wird ein Hinweistext angezeigt.
- Fußbereich: Link zum GitHub-Repo.

## Nicht-funktionale Anforderungen

- Statisch generiert, kein Client-JavaScript nötig, um die Liste zu sehen.
- Responsive: 1 Spalte < 600 px, sonst automatisch so viele Spalten wie passen.
- Barrierearm: Karten sind Links mit sinnvollem Text, Bilder haben `alt`, sichtbarer Fokus,
  ausreichende Kontraste.
- Lighthouse (Mobile): Performance ≥ 90, Accessibility ≥ 95. (Zielwert, wird nicht automatisch geprüft.)

## Akzeptanzkriterien

- **PORTAL-AK-01** `/` listet genau die Spiele mit `status: "published"`.
- **PORTAL-AK-02** Jede Karte zeigt Thumbnail (mit `alt` = Titel), Titel und Beschreibung aus
  `game.json`.
- **PORTAL-AK-03** Jede Karte verlinkt auf `/games/<slug>/`; der Link lädt das Spiel
  (Canvas sichtbar) ohne Konsolenfehler.
- **PORTAL-AK-04** Sortierung nach `order`, dann `title`.
- **PORTAL-AK-05** Ohne veröffentlichte Spiele erscheint der Leer-Hinweis.
- **PORTAL-AK-06** Bei 375×667 (Mobile) gibt es kein horizontales Scrollen und die Karten
  stehen einspaltig.
- **PORTAL-AK-07** Die Seite funktioniert bei deaktiviertem JavaScript (Liste sichtbar, Links
  funktionieren).
- **PORTAL-AK-08** Ein neues Spiel unter `games/` erscheint nach erneutem Build ohne Änderung am
  Portal-Code.
- **PORTAL-AK-10** Jede Spielkarte zeigt die Version des Spiels („v“ + `version`).
- **PORTAL-AK-11** Der Bereich „Neuigkeiten“ zeigt die neuesten Änderungsprotokoll-Einträge
  veröffentlichter Spiele:
  - neueste zuerst, höchstens 10;
  - mit Datum, verlinktem Spieltitel, Version und Punkten;
  - Entwürfe (`draft`) erscheinen nicht.
  - Er funktioniert ohne JavaScript und ohne horizontales Scrollen auf Mobile (375×667).
- **PORTAL-AK-09** Die Startseite lässt sich auf Mobile per Wischgeste vertikal scrollen; das CSS
  der Spielseiten (Scroll-Sperre) gelangt nicht in die Startseite.

## Entscheidungen

- Kein „Neu“-Badge. `addedAt` wird nur gespeichert, nicht angezeigt.
