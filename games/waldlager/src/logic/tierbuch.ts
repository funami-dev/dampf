import type { Store } from "./save.ts";
import { SPECIES } from "./species.ts";

/** Tierbuch: entdeckte Arten, gehört der Spielerin/dem Spieler (WL-AK-21) */
export const BOOK_KEY = "dampf.waldlager.tierbuch.v1";
const KNOWN = new Set(SPECIES.map((s) => s.id));

export function loadBook(store: Store): Set<string> {
  try {
    const raw = store.get(BOOK_KEY);
    const d = raw ? (JSON.parse(raw) as { v?: number; seen?: unknown }) : null;
    if (d?.v !== 1 || !Array.isArray(d.seen)) return new Set();
    return new Set(d.seen.filter((x): x is string => typeof x === "string" && KNOWN.has(x)));
  } catch {
    return new Set();
  }
}

export function saveBook(store: Store, book: Set<string>) {
  store.set(BOOK_KEY, JSON.stringify({ v: 1, seen: [...book] }));
}

/** Trägt neu gesehene Arten ein; gibt nur die neuen zurück (je Art genau einmal) */
export function discover(book: Set<string>, kinds: Iterable<string>): string[] {
  const fresh: string[] = [];
  for (const k of kinds)
    if (KNOWN.has(k) && !book.has(k)) {
      book.add(k);
      fresh.push(k);
    }
  return fresh;
}
