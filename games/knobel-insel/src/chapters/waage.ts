/** Kapitel 3 · Keks-Waage (Spec K3, KI-AK-10) */
import { SPRITES, drawSprite } from "../art/sprites.ts";
import { drawBear, ellipse } from "../art/scenes.ts";
import {
  WAAGE_LEVELS,
  found,
  startCands,
  waageStars,
  weigh,
  type Cand,
  type Outcome,
  type WaageLevel,
} from "../logic/waage.ts";
import { pickNearest, type Chapter, type Kit, type Pt } from "./kit.ts";

type Place = "tisch" | "links" | "rechts";

export function waageChapter(kit: Kit): Chapter {
  const S = {
    level: WAAGE_LEVELS[0]! as WaageLevel,
    cands: [] as Cand[],
    place: [] as Place[],
    sel: -1,
    weighings: 0,
    tilt: 0,
    target: 0,
    guessing: false,
    done: false,
    doneAt: 0,
    last: null as Outcome | null,
  };
  let L = layout(320, 200);
  /** Lage der Waagschalen (wird beim Zeichnen mit der Neigung aktualisiert) */
  let panPos = (dir: -1 | 1): Pt => ({ x: L.cx + dir * L.arm, y: L.beamY + 26 });
  function layout(vw: number, vh: number) {
    const tableY = Math.round(vh * 0.82);
    return {
      vw,
      vh,
      tableY,
      cx: Math.round(vw / 2),
      beamY: Math.round(vh * 0.42),
      arm: Math.min(70, Math.round(vw * 0.22)),
    };
  }
  const tools = () => [
    { id: "wiegen", label: "⚖️ Wiegen", primary: true },
    { id: "raten", label: "🤔 Das ist er!", pressed: S.guessing },
    { id: "tipp", label: "💡 Tipp" },
    { id: "neu", label: "↺ Neu" },
    { id: "map", label: "🏝️ Insel" },
  ];
  function ui() {
    const i = WAAGE_LEVELS.indexOf(S.level) + 1;
    kit.setTop(`🍪 Level ${i} · ${S.level.n} Kekse`, tools(), (id) => {
      if (id === "wiegen") doWeigh();
      else if (id === "raten") {
        S.guessing = !S.guessing;
        if (S.guessing) kit.toast("Tippe auf den Keks, der anders ist.", 3);
        ui();
      } else if (id === "tipp")
        kit.toast(
          S.level.both
            ? "Teile in drei Gruppen zu je 4: links, rechts und daneben. Merk dir, welche Seite sich senkt!"
            : "Teile in drei gleich große Gruppen: links, rechts und daneben.",
          5,
        );
      else if (id === "neu") reset();
      else kit.map();
    });
    count();
  }
  const count = () => kit.setCount(`Wiegungen: ${S.weighings} · Profi-Zahl: ${S.level.min}`);
  function reset() {
    S.cands = startCands(S.level);
    S.place = Array.from({ length: S.level.n }, () => "tisch" as Place);
    S.sel = -1;
    S.weighings = 0;
    S.target = 0;
    S.tilt = 0;
    S.guessing = false;
    S.done = false;
    S.last = null;
    ui();
  }
  const side = (p: Place) => S.place.map((x, k) => (x === p ? k : -1)).filter((k) => k >= 0);
  function doWeigh() {
    if (S.done) return;
    const left = side("links");
    const right = side("rechts");
    if (!left.length && !right.length) {
      kit.toast("Leg erst Kekse auf die Waagschalen.", 3);
      return;
    }
    if (left.length !== right.length)
      kit.toast("Ungleich viele Kekse – da ist immer die vollere Seite schwerer.", 4);
    const r = weigh(S.cands, left, right);
    S.cands = r.cands;
    S.last = r.outcome;
    S.weighings++;
    S.target = r.outcome === "links" ? 1 : r.outcome === "rechts" ? -1 : 0;
    kit.sound.drop();
    kit.toast(
      r.outcome === "gleich"
        ? "Gleich schwer! Der besondere Keks liegt nicht auf der Waage."
        : `${r.outcome === "links" ? "Links" : "Rechts"} ist schwerer!`,
      3,
    );
    count();
  }
  function guess(k: number) {
    S.guessing = false;
    const f = found(S.cands);
    if (f === k) {
      S.done = true;
      S.doneAt = kit.clock();
      kit.sound.tada();
      const i = WAAGE_LEVELS.indexOf(S.level);
      const next = WAAGE_LEVELS[i + 1];
      kit.finish({
        chapter: "waage",
        level: S.level.id,
        stars: waageStars(S.weighings, S.level.min),
        text: `Gefunden mit ${S.weighings} Wiegung${S.weighings === 1 ? "" : "en"} – die Profi-Zahl ist ${S.level.min}.`,
        next: next ? () => start(i + 1) : null,
        again: () => start(i),
      });
    } else {
      kit.sound.ouch();
      kit.toast("Fast! Es könnte auch ein anderer sein – wieg noch einmal.", 4);
      ui();
    }
  }
  function start(i: number) {
    S.level = WAAGE_LEVELS[i]!;
    reset();
    kit.intro(
      `🍪 Keks-Waage · ${S.level.n} Kekse`,
      `<p>Die Koch-Maus hat ${S.level.n} Kekse gebacken. Einer ist anders: ${
        S.level.both
          ? "etwas <b>schwerer oder leichter</b>"
          : "mit doppelt Schokolade etwas <b>schwerer</b>"
      }. Leg Kekse auf die Waagschalen und wiege. Findest du ihn mit <b>${S.level.min} Wiegung${S.level.min === 1 ? "" : "en"}</b>?</p>
       <p><small>Keks antippen, dann eine Waagschale (oder den Tisch) antippen. Fertig? „🤔 Das ist er!“ und den Keks antippen.</small></p>`,
    );
  }
  /** Platz eines Kekses im Bild */
  function cookiePos(k: number): Pt {
    const p = S.place[k]!;
    if (p === "tisch") {
      const onTable = side("tisch");
      const i = onTable.indexOf(k);
      const n = onTable.length;
      const gap = Math.min(14, Math.floor((L.vw - 20) / Math.max(1, n)));
      return { x: L.cx + (i - (n - 1) / 2) * gap, y: L.tableY + 12 };
    }
    const list = side(p);
    const i = list.indexOf(k);
    const pan = panPos(p === "links" ? -1 : 1);
    const col = i % 4;
    const row = Math.floor(i / 4);
    return { x: pan.x + (col - 1.5) * 8, y: pan.y - 6 - row * 6 };
  }

  /** Welche Möglichkeiten gibt es noch für Keks k? */
  const mark = (k: number) => {
    const c = S.cands.filter((x) => x.k === k);
    return { heavy: c.some((x) => x.d === 1), light: c.some((x) => x.d === -1) };
  };
  return {
    id: "waage",
    icon: "🍪",
    title: "Keks-Waage",
    region: "suchen",
    levels: WAAGE_LEVELS.map((l) => ({ id: l.id, label: `${l.n} 🍪` })),
    card: `<h2>🤖 So denkt ein Computer</h2>
      <p><b>Teile und herrsche:</b> Jede Wiegung hat <b>drei</b> Ausgänge – links schwerer, rechts
      schwerer oder gleich. Darum teilt man die Kekse in <b>drei</b> Gruppen: Bei 9 Keksen bleiben
      nach einer Wiegung nur 3 übrig, nach der zweiten nur noch einer (3 × 3 = 9).</p>
      <p>Computer lösen viele große Aufgaben so: in kleine Teile zerlegen und nur dort weitersuchen,
      wo die Antwort stecken kann.</p>`,
    start,
    tick(dt) {
      S.tilt += (S.target - S.tilt) * Math.min(1, dt * 3 * kit.speed());
    },
    draw(g, vw, vh) {
      L = layout(vw, vh);
      // Markt-Stube: Holzwand, Wimpel
      g.fillStyle = "#f2dfc0";
      g.fillRect(0, 0, vw, vh);
      for (let x = 0; x < vw; x += 12) {
        g.fillStyle = "#e6cfa8";
        g.fillRect(x, 0, 1, L.tableY);
      }
      const flags = ["#e74c3c", "#f6d55c", "#3498db", "#2ecc71"];
      for (let x = 4, i = 0; x < vw; x += 14, i++) {
        g.fillStyle = flags[i % 4]!;
        for (let r = 0; r < 6; r++) g.fillRect(x + r / 2, 52 + r, 8 - r, 1);
      }
      drawBear(g, Math.round(vw / 2 - 16), 4, SPRITES.baer!, S.done ? "happy" : "");
      // Tisch
      g.fillStyle = "#b9783e";
      g.fillRect(0, L.tableY, vw, vh - L.tableY);
      g.fillStyle = "#d49a5c";
      g.fillRect(0, L.tableY, vw, 2);
      // Waage: Fuß, Säule, Balken, Schalen
      g.fillStyle = "#8a5a33";
      g.fillRect(L.cx - 14, L.tableY - 4, 28, 4);
      g.fillRect(L.cx - 2, L.beamY, 4, L.tableY - L.beamY - 4);
      const a = S.tilt * 0.18;
      const lp = { x: L.cx - L.arm * Math.cos(a), y: L.beamY + L.arm * Math.sin(a) };
      const rp = { x: L.cx + L.arm * Math.cos(a), y: L.beamY - L.arm * Math.sin(a) };
      g.fillStyle = "#c9a227";
      for (let t = 0; t <= 1; t += 1 / (L.arm * 2)) {
        g.fillRect(
          Math.round(lp.x + (rp.x - lp.x) * t),
          Math.round(lp.y + (rp.y - lp.y) * t) - 1,
          1,
          3,
        );
      }
      ellipse(g, L.cx, L.beamY, 4, 4, "#e0b83a");
      for (const p of [lp, rp]) {
        g.fillStyle = "#7a6a4a";
        g.fillRect(Math.round(p.x) - 12, Math.round(p.y), 1, 24);
        g.fillRect(Math.round(p.x) + 12, Math.round(p.y), 1, 24);
        ellipse(g, p.x, p.y + 26, 20, 3, "#c9a227");
        ellipse(g, p.x, p.y + 25, 18, 2, "#e8c44a");
      }
      // Schalen-Lage für die Kekse merken
      panPos = (dir) => (dir < 0 ? { x: lp.x, y: lp.y + 26 } : { x: rp.x, y: rp.y + 26 });
      // Kekse
      const t = kit.clock();
      for (let k = 0; k < S.level.n; k++) {
        const p = cookiePos(k);
        let y = p.y;
        if (k === S.sel) y -= 4;
        const sp = SPRITES.keks!;
        drawSprite(g, sp, Math.round(p.x - 3), Math.round(y - 3));
        // was noch möglich ist: ✓ normal, ↑ schwer, ↓ leicht
        const m = mark(k);
        if (S.weighings > 0) {
          g.fillStyle = !m.heavy && !m.light ? "#2ecc71" : m.heavy ? "#e74c3c" : "#3498db";
          if (!m.heavy && !m.light) {
            g.fillRect(Math.round(p.x) - 1, Math.round(y) - 6, 1, 1);
            g.fillRect(Math.round(p.x), Math.round(y) - 5, 1, 1);
            g.fillRect(Math.round(p.x) + 1, Math.round(y) - 6, 1, 1);
            g.fillRect(Math.round(p.x) + 2, Math.round(y) - 7, 1, 1);
          } else {
            if (m.heavy) g.fillRect(Math.round(p.x) - 1, Math.round(y) - 8, 3, 2);
            if (m.light) {
              g.fillStyle = "#3498db";
              g.fillRect(Math.round(p.x) - 1, Math.round(y) + 5, 3, 2);
            }
          }
        }
        if (S.guessing) {
          g.globalAlpha = 0.3 + 0.2 * Math.sin(t * Math.PI * 2);
          g.fillStyle = "#fff6a8";
          g.fillRect(Math.round(p.x - 5), Math.round(y - 5), 11, 11);
          g.globalAlpha = 1;
        }
      }
    },
    down(p) {
      if (S.done) return;
      // eng liegende Kekse: der nächste gewinnt
      const cookies = Array.from({ length: S.level.n }, (_, k) => cookiePos(k));
      const hit = pickNearest(cookies, p, kit.hitR());
      if (S.guessing) {
        if (hit >= 0) guess(hit);
        return;
      }
      if (hit >= 0 && (S.sel < 0 || (hit !== S.sel && S.place[hit] === S.place[S.sel]))) {
        // Keks nehmen (oder einen anderen vom selben Platz)
        S.sel = hit;
        kit.sound.pick();
        return;
      }
      if (S.sel < 0) return;
      // Ziel: linke/rechte Schale, sonst Tisch
      const lp = panPos(-1);
      const rp = panPos(1);
      const pan = pickNearest(
        [
          { x: lp.x, y: lp.y - 6, r: 26 },
          { x: rp.x, y: rp.y - 6, r: 26 },
        ],
        p,
        kit.hitR(),
      );
      const to: Place =
        hit === S.sel ? "tisch" : pan === 0 ? "links" : pan === 1 ? "rechts" : "tisch";
      S.place[S.sel] = to;
      S.sel = -1;
      S.target = 0;
      kit.sound.drop();
    },
    debug: () => ({
      level: S.level.id,
      weighings: S.weighings,
      sel: S.sel,
      left: side("links"),
      right: side("rechts"),
      cands: S.cands.length,
      found: found(S.cands),
      done: S.done,
      last: S.last,
    }),
    point(what) {
      if (what.startsWith("keks:")) return cookiePos(Number(what.slice(5)));
      if (what === "links" || what === "rechts") {
        const p = panPos(what === "links" ? -1 : 1);
        return { x: p.x, y: p.y - 4 };
      }
      if (what === "tisch") return { x: 10, y: L.tableY + 4 };
      return null;
    },
  };
}
