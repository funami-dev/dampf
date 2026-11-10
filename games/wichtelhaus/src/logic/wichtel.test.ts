import { describe, expect, it } from "vitest";
import {
  BREATH,
  BREATH_CYCLE,
  DEFAULT_VOLUME,
  IDLE_CYCLES,
  MAX_FLASH_HZ,
  MIN_IDLE_CYCLE,
  breathPhase,
  lanternLevel,
} from "./calm.ts";
import {
  ATTIC_AT,
  DAY,
  FLOOR_AFTER_ABSENCE,
  FOODS,
  KEY,
  MAX_FOOD,
  ROOMS,
  activityInfo,
  ask,
  atticOpen,
  catchUp,
  chooseActivity,
  dayOf,
  foodCount,
  giveGift,
  load,
  newWichtel,
  save,
  shop,
  step,
  type Store,
} from "./wichtel.ts";

const fixed = (v: number) => () => v;
const memory = (): Store & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, get: (k) => data.get(k) ?? null, set: (k, v) => void data.set(k, v) };
};

describe("WH-AK-01: neuer Wichtel und Speichern", () => {
  it("Name, Mütze, Haustier, Vorliebe; Bedürfnisse bei 80 %", () => {
    const w = newWichtel({ name: "  Pip  ", hat: "#27ae60", pet: "igel" }, fixed(0));
    expect([w.name, w.hat, w.pet, w.trait]).toEqual(["Pip", "#27ae60", "igel", "musik"]);
    expect(Object.values(w.needs)).toEqual([80, 80, 80, 80]);
    expect(newWichtel({}).name).toBe("Wichtel");
    expect(newWichtel({ hat: "#123456" }).hat).toBe("#c0392b");
  });
  it("übersteht Neuladen; kaputte Daten → null", () => {
    const s = memory();
    const w = newWichtel({ name: "Pip", pet: "drache" });
    w.food = { kuchen: 3 };
    save(s, w, 1000);
    const r = load(s)!;
    expect([r.name, r.pet, r.food.kuchen]).toEqual(["Pip", "drache", 3]);
    expect(KEY).toBe("dampf.wichtelhaus.v1");
    for (const bad of ["{", "null", '{"v":2}', '{"v":1,"name":"x","t":1,"needs":{"hunger":"x"}}'])
      expect(load({ get: () => bad, set() {} }), bad).toBeNull();
  });
});

describe("WH-AK-02: Bedürfnisse und eigene Entscheidungen", () => {
  it("sinken mit der Zeit und bleiben zwischen 0 und 100", () => {
    const w = newWichtel({}, fixed(0.5));
    for (let k = 0; k < 5000; k++) step(w, 1, fixed(0.5));
    for (const v of Object.values(w.needs)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
  it("wählt bei niedrigem Wert die passende Tätigkeit; ohne Vorräte traurig", () => {
    const w = newWichtel({}, fixed(0.5));
    w.t = DAY * 0.3; // Tag
    w.needs = { hunger: 20, energy: 90, fun: 90, clean: 90 };
    expect(chooseActivity(w, fixed(0.5)).kind).toBe("essen");
    w.food = {};
    expect(chooseActivity(w, fixed(0.5)).kind).toBe("traurig");
    w.needs = { hunger: 90, energy: 10, fun: 90, clean: 90 };
    expect(chooseActivity(w, fixed(0.5)).kind).toBe("schlafen");
    w.needs = { hunger: 90, energy: 90, fun: 90, clean: 10 };
    const bad = chooseActivity(w, fixed(0.5));
    expect(bad.kind).toBe("baden");
    expect(bad.room).toBe("bad");
    w.t = DAY * 0.9; // Nacht
    w.needs = { hunger: 90, energy: 70, fun: 90, clean: 90 };
    expect(chooseActivity(w, fixed(0.5)).kind).toBe("schlafen");
  });
  it("Essen verbraucht einen Vorrat und füllt Hunger je Sorte", () => {
    const w = newWichtel({}, fixed(0.5));
    w.t = DAY * 0.3;
    w.food = { suppe: 1 };
    w.needs.hunger = 30;
    w.activity = { kind: "essen", room: "kueche", left: 0.1, food: "suppe" };
    step(w, 0.2, fixed(0.5));
    expect(w.food.suppe).toBe(0);
    expect(w.needs.hunger).toBeCloseTo(30 + FOODS.suppe.hunger, 0);
  });
});

describe("WH-AK-03/04: Einkaufen, Geschenke, Bitten", () => {
  it("höchstens 10 Vorräte", () => {
    const w = newWichtel({});
    w.food = {};
    for (let k = 0; k < 12; k++) shop(w, "brot");
    expect(foodCount(w)).toBe(MAX_FOOD);
    expect(shop(w, "obst")).toBe("Der Vorratsschrank ist voll.");
  });
  it("Geschenk einmal pro Spieltag", () => {
    const w = newWichtel({});
    expect(giveGift(w, "ball")).toMatch(/Danke/);
    expect(giveGift(w, "buch")).toMatch(/schon ein Geschenk/);
    w.t += DAY;
    expect(giveGift(w, "buch")).toMatch(/Danke/);
    expect(w.gifts).toEqual(["ball", "buch"]);
  });
  it("Bitten: immer eine Antwort; müde → freundliches Nein", () => {
    const w = newWichtel({});
    w.t = DAY * 0.3;
    w.needs = { hunger: 80, energy: 80, fun: 80, clean: 80 };
    const yes = ask(w, "musik", fixed(0.9));
    expect(yes.ok).toBe(true);
    expect(w.activity.kind).toBe("musik");
    w.needs.energy = 10;
    const no = ask(w, "basteln", fixed(0.1));
    expect(no).toEqual({ ok: false, text: "Jetzt nicht, ich bin so müde …" });
    w.needs.energy = 95;
    expect(ask(w, "schlafen").ok).toBe(false);
    for (const r of ["musik", "basteln", "vorlesen", "schlafen", "spielen"] as const)
      expect(ask(w, r).text.length).toBeGreaterThan(5);
  });
});

describe("WH-AK-05: Abwesenheit", () => {
  it("höchstens ein Spieltag läuft nach, nichts unter 20 %", () => {
    const w = newWichtel({}, fixed(0.5));
    w.food = {};
    w.savedAt = 0;
    const t0 = w.t;
    const sim = catchUp(w, 10 * 24 * 3600 * 1000, fixed(0.5));
    expect(sim).toBe(DAY);
    expect(w.t - t0).toBeCloseTo(DAY, 0);
    for (const v of Object.values(w.needs)) expect(v).toBeGreaterThanOrEqual(FLOOR_AFTER_ABSENCE);
  });
});

describe("WH-AK-06: Briefe und Freundschaft", () => {
  it("etwa ein Brief pro Spieltag, passend zum Tag; Dachboden ab Freundschaft 10", () => {
    const w = newWichtel({}, fixed(0.5));
    w.t = DAY * 0.3;
    giveGift(w, "blume");
    for (let k = 0; k < DAY; k++) step(w, 1, fixed(0.5));
    expect(w.letters.length).toBe(1);
    expect(w.letters[0]!.text).toMatch(/Blume/);
    for (let k = 0; k < DAY * 2; k++) step(w, 1, fixed(0.5));
    expect(w.letters.length).toBe(3);
    expect(dayOf(w.t)).toBeGreaterThanOrEqual(3);
    expect(atticOpen(w)).toBe(false);
    w.friendship = ATTIC_AT;
    expect(atticOpen(w)).toBe(true);
    expect(ROOMS.dachboden.floor).toBe(2);
    expect(activityInfo("sterne").room).toBe("dachboden");
  });
});

describe("WH-AK-11/12: Ruhe-Regeln", () => {
  it("Zyklen ≥ 4 s, Atem/Laterne 10 s, Lautstärke startet bei 30 %", () => {
    for (const [k, c] of Object.entries(IDLE_CYCLES)) {
      expect(c, k).toBeGreaterThanOrEqual(MIN_IDLE_CYCLE);
      expect(1 / c).toBeLessThanOrEqual(MAX_FLASH_HZ);
    }
    expect(IDLE_CYCLES.atmen).toBe(10);
    expect(DEFAULT_VOLUME).toBe(0.3);
    expect(newWichtel({}).volume).toBe(0.3);
  });
  it("Laterne: 5 s heller, 5 s dunkler", () => {
    expect(BREATH).toEqual({ inhale: 5, exhale: 5 });
    expect(lanternLevel(0)).toBeCloseTo(0);
    expect(lanternLevel(BREATH.inhale)).toBeCloseTo(1);
    expect(lanternLevel(BREATH_CYCLE)).toBeCloseTo(0);
    expect(lanternLevel(2)).toBeLessThan(lanternLevel(4));
    expect(lanternLevel(7)).toBeLessThan(lanternLevel(6));
    expect(breathPhase(1)).toBe("Einatmen");
    expect(breathPhase(6)).toBe("Ausatmen");
  });
});
