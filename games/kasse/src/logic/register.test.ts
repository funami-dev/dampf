import { describe, expect, it } from "vitest";
import { PRODUCTS, productById } from "./catalog.ts";
import {
  attemptScan,
  canTotal,
  createCustomer,
  formatEuro,
  openRegister,
  pay,
  total,
  turn,
  type Register,
} from "./register.ts";

/** Dreht alle Waren richtig herum und scannt sie. */
function scanAll(r: Register): Register {
  let s = r;
  for (const it of s.items) {
    if (it.facing === "away") s = turn(s, it.uid);
    s = attemptScan(s, it.uid, true).state;
  }
  return s;
}

describe("Katalog (KA-AK-01)", () => {
  it("mindestens 15 Waren mit Name, Preis in Cent und Form", () => {
    expect(PRODUCTS.length).toBeGreaterThanOrEqual(15);
    for (const p of PRODUCTS) {
      expect(p.name.length).toBeGreaterThan(0);
      expect(Number.isInteger(p.price)).toBe(true);
      expect(p.price).toBeGreaterThan(0);
      expect(["box", "carton", "bottle", "can", "bag", "round", "bunch", "tray"]).toContain(
        p.shape,
      );
    }
    expect(new Set(PRODUCTS.map((p) => p.id)).size).toBe(PRODUCTS.length);
  });

  it("enthält die Grundwaren und keine Bilddateien oder Marken-Hinweise", () => {
    const names = PRODUCTS.map((p) => p.name);
    for (const n of ["Milch", "Brot", "Bananen", "Käse", "Eier", "Saft", "Schokolade"])
      expect(names).toContain(n);
    expect(JSON.stringify(PRODUCTS)).not.toMatch(/\.(png|jpe?g|svg|webp)|url\(|https?:|®|™/i);
  });
});

describe("Kunden (KA-AK-02)", () => {
  it("3–10 Waren aus dem Katalog, deterministisch", () => {
    for (let seed = 1; seed < 200; seed++) {
      const c = createCustomer(seed);
      expect(c.items.length).toBeGreaterThanOrEqual(3);
      expect(c.items.length).toBeLessThanOrEqual(10);
      for (const it of c.items) expect(productById(it.productId)).toBeDefined();
      expect(createCustomer(seed)).toEqual(c);
    }
  });

  it("manche Barcodes zeigen weg, aber nicht alle", () => {
    const all = Array.from({ length: 100 }, (_, i) => createCustomer(i + 1).items).flat();
    const away = all.filter((i) => i.facing === "away").length;
    expect(away).toBeGreaterThan(all.length * 0.1);
    expect(away).toBeLessThan(all.length * 0.6);
  });
});

describe("Scannen (KA-AK-03 … 05)", () => {
  const reg = () => openRegister(7);

  it("nur über dem Scanner und mit Barcode zum Scanner", () => {
    let r = reg();
    const uid = r.items[0]!.uid;
    if (r.items[0]!.facing === "away") r = turn(r, uid);
    expect(attemptScan(r, uid, false).result).toBe("none");
    const ok = attemptScan(r, uid, true);
    expect(ok.result).toBe("beep");
    expect(ok.state.receipt).toHaveLength(1);
    expect(ok.state.items[0]!.scanned).toBe(true);
  });

  it("Barcode zeigt weg → kein Eintrag, Hinweis; nach Drehen scannbar (KA-AK-04)", () => {
    let r = reg();
    const it = r.items[0]!;
    if (it.facing === "toward") r = turn(r, it.uid);
    const away = attemptScan(r, it.uid, true);
    expect(away.result).toBe("away");
    expect(away.state.receipt).toHaveLength(0);
    r = turn(r, it.uid);
    expect(r.items[0]!.facing).toBe("toward");
    expect(attemptScan(r, it.uid, true).result).toBe("beep");
  });

  it("jede Ware höchstens einmal (KA-AK-05)", () => {
    let r = reg();
    const uid = r.items[0]!.uid;
    if (r.items[0]!.facing === "away") r = turn(r, uid);
    r = attemptScan(r, uid, true).state;
    const again = attemptScan(r, uid, true);
    expect(again.result).toBe("already");
    expect(again.state.receipt).toHaveLength(1);
  });
});

describe("Summe und Bezahlen (KA-AK-06 … 08)", () => {
  it("Summe = gescannte Preise, cent-genau", () => {
    const r = scanAll(openRegister(11));
    const expected = r.items.reduce((s, it) => s + productById(it.productId)!.price, 0);
    expect(total(r)).toBe(expected);
  });

  it("Format 12,34 €", () => {
    expect(formatEuro(1234)).toBe("12,34 €");
    expect(formatEuro(5)).toBe("0,05 €");
    expect(formatEuro(100000)).toBe("1.000,00 €");
  });

  it("Summe erst, wenn alles gescannt ist; danach nächster Kunde", () => {
    let r = openRegister(3);
    expect(canTotal(r)).toBe(false);
    expect(pay(r)).toBe(r);
    r = scanAll(r);
    expect(canTotal(r)).toBe(true);
    const sum = total(r);
    const n = r.items.length;
    const next = pay(r);
    expect(next.customer).toBe(2);
    expect(next.receipt).toHaveLength(0);
    expect(next.items.every((i) => !i.scanned)).toBe(true);
    expect(next.stats).toEqual({ customers: 1, items: n, revenue: sum });
  });

  it("Statistik summiert über mehrere Kunden", () => {
    let r = openRegister(5);
    let items = 0;
    let revenue = 0;
    for (let k = 0; k < 4; k++) {
      r = scanAll(r);
      items += r.items.length;
      revenue += total(r);
      r = pay(r);
    }
    expect(r.stats).toEqual({ customers: 4, items, revenue });
  });
});
