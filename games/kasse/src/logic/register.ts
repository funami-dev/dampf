import { PRODUCTS, productById } from "./catalog.ts";

export interface Item {
  /** eindeutig innerhalb eines Kunden */
  uid: string;
  productId: string;
  /** Zeigt der Barcode zum Scanner (toward) oder weg (away)? */
  facing: "toward" | "away";
  scanned: boolean;
}

export interface Customer {
  seed: number;
  items: Item[];
}

export interface Stats {
  customers: number;
  items: number;
  revenue: number;
}

export interface Register {
  /** laufende Nummer des aktuellen Kunden (ab 1) */
  customer: number;
  seed: number;
  items: Item[];
  /** Bonzeilen: Produkt-IDs in Scan-Reihenfolge */
  receipt: string[];
  stats: Stats;
}

function rng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** KA-AK-02: 3–10 Waren, etwa jede vierte mit Barcode nach hinten. */
export function createCustomer(seed: number): Customer {
  const rand = rng(seed);
  const n = 3 + Math.floor(rand() * 8);
  const items: Item[] = Array.from({ length: n }, (_, i) => ({
    uid: `${seed}-${i}`,
    productId: PRODUCTS[Math.floor(rand() * PRODUCTS.length)]!.id,
    facing: rand() < 0.28 ? "away" : "toward",
    scanned: false,
  }));
  return { seed, items };
}

export function openRegister(seed: number): Register {
  return {
    customer: 1,
    seed,
    items: createCustomer(seed).items,
    receipt: [],
    stats: { customers: 0, items: 0, revenue: 0 },
  };
}

const update = (r: Register, uid: string, fn: (i: Item) => Item): Register => ({
  ...r,
  items: r.items.map((i) => (i.uid === uid ? fn(i) : i)),
});

/** KA-AK-04: Ware um 180° drehen. */
export const turn = (r: Register, uid: string): Register =>
  update(r, uid, (i) => ({ ...i, facing: i.facing === "toward" ? "away" : "toward" }));

export type ScanResult = "beep" | "away" | "already" | "none";

/** KA-AK-03/05: Scanversuch, wenn die Ware über das Scannerfeld gezogen wird. */
export function attemptScan(
  r: Register,
  uid: string,
  overScanner: boolean,
): { state: Register; result: ScanResult } {
  const it = r.items.find((i) => i.uid === uid);
  if (!it || !overScanner) return { state: r, result: "none" };
  if (it.scanned) return { state: r, result: "already" };
  if (it.facing === "away") return { state: r, result: "away" };
  const state = update(r, uid, (i) => ({ ...i, scanned: true }));
  return { state: { ...state, receipt: [...state.receipt, it.productId] }, result: "beep" };
}

export const total = (r: Register) =>
  r.receipt.reduce((s, id) => s + (productById(id)?.price ?? 0), 0);
export const canTotal = (r: Register) => r.items.length > 0 && r.items.every((i) => i.scanned);

/** KA-AK-07/08: Kartenzahlung, Statistik, nächster Kunde. */
export function pay(r: Register): Register {
  if (!canTotal(r)) return r;
  const seed = r.seed + 1;
  return {
    customer: r.customer + 1,
    seed,
    items: createCustomer(seed).items,
    receipt: [],
    stats: {
      customers: r.stats.customers + 1,
      items: r.stats.items + r.items.length,
      revenue: r.stats.revenue + total(r),
    },
  };
}

export function formatEuro(cents: number): string {
  const euros = Math.floor(cents / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${euros},${String(cents % 100).padStart(2, "0")} €`;
}
