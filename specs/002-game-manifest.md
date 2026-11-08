# 002 – Game-Manifest (`game.json`) & Pflichten eines Spiels

**Status:** Umgesetzt

## Zweck

Jedes Spiel beschreibt sich selbst über `games/<slug>/game.json`. Das Portal liest diese Dateien
zur Build-Zeit; es gibt keine zentrale Liste, die man pflegen muss.

## Schema

```jsonc
{
  "slug": "snake", // Pflicht, [a-z0-9-]+, == Ordnername
  "title": "Snake", // Pflicht, 1–40 Zeichen
  "description": "Friss, wachse, …", // Pflicht, 1–160 Zeichen
  "thumbnail": "thumbnail.png", // Pflicht, relativ zu public/, 16:9, ≥ 640×360
  "controls": {
    // Pflicht, mindestens eins true
    "keyboard": true,
    "touch": true,
  },
  "status": "published", // Pflicht: "published" | "draft"
  "order": 10, // optional, Sortierung auf der Startseite (aufsteigend)
  "addedAt": "2026-11-01", // Pflicht, ISO-Datum
  "version": "1.0.0", // Pflicht, SemVer MAJOR.MINOR.PATCH
  "changelog": [
    // Pflicht, mindestens ein Eintrag, neueste Version zuerst
    {
      "version": "1.0.0", // SemVer
      "date": "2026-11-08", // ISO-Datum
      "items": ["Erste Version: …"], // 1–6 Punkte, je höchstens 120 Zeichen
    },
  ],
}
```

Das Schema wird in `packages/game-kit` als Zod-Schema definiert und von Build und Portal
gemeinsam genutzt.

## Versionen (SemVer) und Änderungsprotokoll

- **Jedes Spiel hat eine eigene Version** im Format `MAJOR.MINOR.PATCH`. Alle bestehenden Spiele
  starten bei **1.0.0**.
- **Wann wird erhöht:**
  - **PATCH:** nur Fehlerbehebungen, z. B. 1.0.0 → 1.0.1.
  - **MINOR:** neue Funktionen, die zum Spiel passen, z. B. 1.0.0 → 1.1.0.
  - **MAJOR:** große Umbauten, etwa wenn alte Spielstände nicht mehr passen, z. B.
    1.4.2 → 2.0.0.
- **Jede Änderung an einem Spiel**, die veröffentlicht wird, erhöht dessen Version und bekommt
  einen neuen Eintrag ganz oben im `changelog` mit kurzen, kindgerechten Punkten auf Deutsch.
- **Regeln, die der Build prüft:**
  - Der oberste `changelog`-Eintrag hat genau die aktuelle `version`.
  - Die Versionen im `changelog` sind eindeutig und stehen absteigend, die Daten ebenso
    (neueste zuerst).
  - Ein Datum liegt nicht vor `addedAt`.
- **Anzeige:**
  - **Startseite:** kleine Versionsangabe auf jeder Spielkarte (z. B. „v1.0.0“) und der Bereich
    „Neuigkeiten“ (siehe 003).
  - **Im Spiel:** Die obere Leiste zeigt neben dem Titel klein die Version, z. B.
    „Waldlager v1.0.0“.

## Pflichten eines Spiels

- Läuft als eigenständige Vollbild-Seite unter `/games/<slug>/`.
- Hat einen gut sichtbaren **Zurück-Button** zur Startseite (`/`), bereitgestellt durch
  `game-kit`, der das Spiel nicht verdeckt.
- Skaliert auf die Fenstergröße (Phaser `Scale.FIT`, zentriert) und reagiert auf
  Größen-/Orientierungswechsel.
- Wenn `controls.touch: true`: vollständig per Touch spielbar.
- Setzt `<title>` auf „<title> – Dampf“.
- Zeigt in der oberen Leiste neben dem Titel klein die Version aus `game.json` (über
  `mountGameShell({ title, version })`).
- Hält den sicheren Bereich frei (`env(safe-area-inset-*)`): Auf dem iPhone liegt kein Teil des
  Spielfelds und kein Bedienelement unter der Safari-Leiste, der Notch oder dem Home-Indikator.
- **Verhindert Zoomen auf Spielseiten:** Schnelles Doppeltippen (z. B. beim Holzhacken oder auf
  Buttons) und Zwei-Finger-Zoom vergrößern die Seite nicht. Umsetzung im `game-kit`:
  `touch-action: manipulation` für die ganze Spielseite, ein zweites Tippen innerhalb von 350 ms
  löst keinen Browser-Zoom aus, Safari-Gesten (`gesturestart`/`gesturechange`) werden
  abgefangen. Ist die Seite trotzdem vergrößert (z. B. durch Bedienungshilfen), wird beim
  nächsten Tippen auf das Spielfeld automatisch auf 100 % zurückgesetzt. Die Startseite
  (Portal) bleibt zoombar.

## Akzeptanzkriterien

- **MANIFEST-AK-01** Ein Manifest, das dem Schema entspricht, wird akzeptiert.
- **MANIFEST-AK-02** Fehlende Pflichtfelder, falsche Typen oder zu lange Texte werden abgelehnt;
  die Fehlermeldung nennt Feld und Datei.
- **MANIFEST-AK-03** `slug` ≠ Ordnername wird abgelehnt.
- **MANIFEST-AK-04** Ein nicht existierendes `thumbnail` wird abgelehnt.
- **MANIFEST-AK-05** `controls` mit beiden Werten `false` wird abgelehnt.
- **MANIFEST-AK-10** `version` und `changelog` sind Pflicht:
  - Eine Version, die kein SemVer ist (z. B. „1.0“ oder „v1.0.0“), wird abgelehnt.
  - Ein leerer `changelog`, ein oberster Eintrag ungleich `version`, doppelte oder falsch
    sortierte Versionen bzw. Daten, ein Datum vor `addedAt` sowie 0 oder mehr als 6 Punkte oder
    Punkte über 120 Zeichen werden mit Datei und Feld abgelehnt.
- **MANIFEST-AK-11** (E2E) Auf jeder Spielseite steht in der oberen Leiste die Version des
  Spiels, z. B. „v1.0.0“.
- **MANIFEST-AK-06** Spiele mit `status: "draft"` werden gebaut, aber **nicht** auf der
  Startseite gelistet (direkt per URL erreichbar, für Tests/Previews).
- **MANIFEST-AK-07** Auf jeder Spielseite führt der Zurück-Button zu `/` (E2E).
- **MANIFEST-AK-08** Der Spielbereich berücksichtigt `env(safe-area-inset-bottom)` und
  `env(safe-area-inset-top)` (umgesetzt im gemeinsamen Spiel-Rahmen von `game-kit`), sodass
  Spielfeld und Buttons vollständig im sichtbaren Bereich liegen (E2E mit simuliertem Inset).
- **MANIFEST-AK-09** Spielseiten zoomen nicht: `touch-action: manipulation` auf der Seite, der
  zweite Tipp eines Doppeltipps (< 350 ms) wird nicht als Zoom-Geste weitergegeben, und
  `gesturestart` wird verhindert. Das Spiel bekommt beide Tipps trotzdem. Die Startseite ist
  davon nicht betroffen (E2E).
