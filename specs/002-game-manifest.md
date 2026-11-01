# 002 – Game-Manifest (`game.json`) & Pflichten eines Spiels

**Status:** Abgenommen

## Zweck

Jedes Spiel beschreibt sich selbst über `games/<slug>/game.json`. Das Portal liest diese Dateien
zur Build-Zeit; es gibt keine zentrale Liste, die man pflegen muss.

## Schema

```jsonc
{
  "slug": "snake",                     // Pflicht, [a-z0-9-]+, == Ordnername
  "title": "Snake",                    // Pflicht, 1–40 Zeichen
  "description": "Friss, wachse, …",   // Pflicht, 1–160 Zeichen
  "thumbnail": "thumbnail.png",        // Pflicht, relativ zu public/, 16:9, ≥ 640×360
  "controls": {                        // Pflicht, mindestens eins true
    "keyboard": true,
    "touch": true
  },
  "status": "published",               // Pflicht: "published" | "draft"
  "order": 10,                         // optional, Sortierung auf der Startseite (aufsteigend)
  "addedAt": "2026-11-01"              // Pflicht, ISO-Datum
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
