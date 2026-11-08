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
}
```

Das Schema wird in `packages/game-kit` als Zod-Schema definiert und von Build und Portal
gemeinsam genutzt.

## Pflichten eines Spiels

- Läuft als eigenständige Vollbild-Seite unter `/games/<slug>/`.
- Hat einen gut sichtbaren **Zurück-Button** zur Startseite (`/`), bereitgestellt durch
  `game-kit`, der das Spiel nicht verdeckt.
- Skaliert auf die Fenstergröße (Phaser `Scale.FIT`, zentriert) und reagiert auf
  Größen-/Orientierungswechsel.
- Wenn `controls.touch: true`: vollständig per Touch spielbar.
- Setzt `<title>` auf „<title> – Dampf“.
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
