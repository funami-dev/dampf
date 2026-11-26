/** Kapitel 7 · Wasserkrüge (Spec K7, KI-AK-14) */
import { drawNumber, ellipse } from "../art/scenes.ts";
import {
  JUG_LEVELS,
  apply,
  jugGoal,
  jugKey,
  jugSearch,
  jugShortest,
  type JugAction,
  type JugLevel,
} from "../logic/jugs.ts";
import { pickNearest, starsOf, type Chapter, type Kit, type Pt } from "./kit.ts";

export function jugsChapter(kit: Kit): Chapter {
  const S = {
    level: JUG_LEVELS[0]! as JugLevel,
    s: [] as number[],
    history: [] as number[][],
    path: [] as string[],
    sel: -1 as number | "teich",
    min: 0,
    tip: null as JugAction | null,
    tipUntil: 0,
    done: false,
    pourAnim: 0,
  };
  let L = { vw: 320, vh: 200, benchY: 150, pond: { x: 60, y: 170 }, jugs: [] as Pt[] };
  const jugH = (cap: number) => 10 + cap * 6;
  const jugW = (cap: number) => 14 + cap * 2;
  function lay(vw: number, vh: number) {
    const n = S.level.caps.length;
    const benchY = Math.round(vh * 0.72);
    const jugs = S.level.caps.map((_, i) => ({
      x: Math.round(vw * (0.45 + ((i - (n - 1) / 2) * 0.5) / Math.max(2, n))),
      y: benchY,
    }));
    return { vw, vh, benchY, pond: { x: Math.round(vw * 0.13), y: Math.round(vh * 0.86) }, jugs };
  }
  const name = (i: number) => `${S.level.caps[i]}-Liter-Krug`;
  const describe = (a: JugAction) => {
    if (a.kind === "pour") return `Schütte den ${name(a.i)} in den ${name(a.j)}.`;
    return a.kind === "fill"
      ? `Füll den ${name(a.i)} am Teich.`
      : `Gieß den ${name(a.i)} in den Teich aus.`;
  };
  function ui() {
    const i = JUG_LEVELS.indexOf(S.level) + 1;
    kit.setTop(
      `💧 Level ${i} · Wasserkrüge`,
      [
        { id: "zurueck", label: "↩ Zurück" },
        { id: "tipp", label: "💡 Tipp" },
        { id: "neu", label: "↺ Neu" },
        { id: "map", label: "🏝️ Insel" },
      ],
      (id) => {
        if (id === "zurueck") undo();
        else if (id === "tipp") {
          const w = jugShortest(S.level, S.s);
          if (!w?.length) return;
          S.tip = w[0]!;
          S.tipUntil = kit.clock() + 5;
          kit.toast(`💡 Tipp: ${describe(w[0]!)}`, 5);
        } else if (id === "neu") reset();
        else kit.map();
      },
    );
    count();
  }
  const count = () => kit.setCount(`Schritte: ${S.history.length} · Profi-Zahl: ${S.min}`);
  function reset() {
    S.s = [...S.level.start];
    S.history = [];
    S.path = [jugKey(S.s)];
    S.sel = -1;
    S.min = jugShortest(S.level)!.length;
    S.done = false;
    S.tip = null;
    ui();
  }
  function undo() {
    if (S.done || !S.history.length) return;
    S.s = S.history.pop()!;
    S.path.pop();
    count();
  }
  function act(a: JugAction) {
    const n = apply(S.level, S.s, a);
    if (!n) {
      kit.toast(
        a.kind === "pour"
          ? "Da passt nichts mehr hinein – oder der Krug ist leer."
          : "Das ändert nichts.",
        3,
      );
      return;
    }
    S.history.push(S.s);
    S.s = n;
    S.path.push(jugKey(n));
    S.pourAnim = kit.clock();
    kit.sound.splash();
    count();
    if (jugGoal(S.level, n)) {
      S.done = true;
      kit.sound.tada();
      const i = JUG_LEVELS.indexOf(S.level);
      const steps = S.history.length;
      const { dist, states, edges } = jugSearch(S.level);
      const best = [jugKey(S.level.start)];
      let s = S.level.start;
      for (const x of jugShortest(S.level)!) {
        s = apply(S.level, s, x)!;
        best.push(jugKey(s));
      }
      const graph = {
        nodes: [...dist.entries()].map(([k, d]) => ({
          key: k,
          dist: d,
          goal: jugGoal(S.level, states.get(k)!),
        })),
        edges,
      };
      const mine = [...S.path];
      kit.finish({
        chapter: "kruege",
        level: S.level.id,
        stars: starsOf(steps, S.min),
        text: `Genau richtig für die Blumen! ${steps} Schritte – die Profi-Zahl ist ${S.min}.`,
        next: JUG_LEVELS[i + 1] ? () => start(i + 1) : null,
        again: () => start(i),
        extra: {
          label: "🗺️ Rätsel-Landkarte",
          fn: () => kit.stateMap(graph, mine, best, "kruege", () => kit.map()),
        },
      });
    }
  }
  function start(i: number) {
    S.level = JUG_LEVELS[i]!;
    reset();
    const l = S.level;
    kit.intro(
      `💧 Wasserkrüge`,
      `<p>Die Blumen brauchen ${l.twice ? `<b>zweimal genau ${l.target} Liter</b>` : `<b>genau ${l.target} Liter</b>`}. Die Krüge haben
       keine Striche: ${l.caps.map((c) => `${c} L`).join(", ")}.</p>
       <p><small>Krug antippen, dann einen anderen Krug antippen = umschütten.
       ${l.pond ? "Teich, dann Krug = füllen; Krug, dann Teich = ausgießen." : "Hier gibt es keinen Teich – nur umschütten!"}
       Profi-Zahl: <b>${S.min} Schritte</b>.</small></p>`,
    );
  }
  function jugAt(p: Pt): number {
    let hit = -1;
    S.level.caps.forEach((c, i) => {
      const j = L.jugs[i]!;
      if (Math.abs(p.x - j.x) <= jugW(c) / 2 + 4 && p.y <= j.y + 4 && p.y >= j.y - jugH(c) - 10)
        hit = i;
    });
    return hit;
  }
  return {
    id: "kruege",
    icon: "💧",
    title: "Wasserkrüge",
    region: "logik",
    levels: JUG_LEVELS.map((l) => ({
      id: l.id,
      label: l.caps.map((c) => `${c}`).join("+") + " L",
    })),
    card: `<h2>🤖 So denkt ein Computer</h2>
      <p>Jede Lage – wie viel Wasser in jedem Krug ist – ist ein Punkt auf der Rätsel-Landkarte.
      Füllen, Ausgießen und Umschütten sind die Wege dazwischen. Der Computer läuft die Landkarte
      Schritt für Schritt ab (<b>Breitensuche</b>) und findet so sicher den kürzesten Weg zu „genau
      richtig“ – ganz ohne Messbecher.</p>`,
    start,
    tick() {},
    draw(g, vw, vh) {
      L = lay(vw, vh);
      const t = kit.clock();
      g.fillStyle = "#9fd3f0";
      g.fillRect(0, 0, vw, Math.round(vh * 0.4));
      g.fillStyle = "#7cc45e";
      g.fillRect(0, Math.round(vh * 0.4), vw, vh);
      for (let i = 0; i < 40; i++) {
        g.fillStyle = i % 3 ? "#69b04c" : "#8fd46c";
        g.fillRect((i * 37) % vw, Math.round(vh * 0.45 + ((i * 23) % (vh * 0.5))), 2, 1);
      }
      // Blumenbeet (Ziel)
      const fx = Math.round(vw * 0.86);
      g.fillStyle = "#8a5a33";
      g.fillRect(fx - 20, L.benchY - 6, 40, 8);
      for (let i = 0; i < 5; i++) {
        g.fillStyle = "#3f8a3a";
        g.fillRect(fx - 16 + i * 8, L.benchY - 14, 1, 8);
        g.fillStyle = ["#e74c3c", "#f6d55c", "#f4a0a8", "#9b59b6", "#f39c12"][i]!;
        g.fillRect(fx - 17 + i * 8, L.benchY - 17, 3, 3);
      }
      drawNumber(g, S.level.target, fx, L.benchY + 8, "#2b2233");
      if (S.level.twice) drawNumber(g, S.level.target, fx + 10, L.benchY + 8, "#2b2233");
      // Teich
      if (S.level.pond) {
        ellipse(g, L.pond.x, L.pond.y, Math.round(vw * 0.11), 8, "#4a90d9");
        ellipse(g, L.pond.x, L.pond.y - 1, Math.round(vw * 0.09), 5, "#5aa0e6");
        if (S.sel === "teich") {
          g.globalAlpha = 0.4 + 0.2 * Math.sin(t * Math.PI * 2);
          ellipse(g, L.pond.x, L.pond.y, Math.round(vw * 0.12), 10, "#fff6a8");
          g.globalAlpha = 1;
        }
      }
      // Bank
      g.fillStyle = "#a8703f";
      g.fillRect(Math.round(vw * 0.2), L.benchY, Math.round(vw * 0.52), 4);
      g.fillStyle = "#7a4f2a";
      g.fillRect(Math.round(vw * 0.22), L.benchY + 4, 3, 10);
      g.fillRect(Math.round(vw * 0.68), L.benchY + 4, 3, 10);
      // Krüge
      S.level.caps.forEach((c, i) => {
        const j = L.jugs[i]!;
        const w = jugW(c);
        const h = jugH(c);
        const lift = S.sel === i ? 4 : 0;
        const x0 = j.x - w / 2;
        const y0 = j.y - h - lift;
        const tipHere =
          S.tip && t < S.tipUntil && (S.tip.i === i || (S.tip.kind === "pour" && S.tip.j === i));
        if (tipHere) {
          g.globalAlpha = 0.35 + 0.25 * Math.sin(t * Math.PI * 2);
          g.fillStyle = "#fff6a8";
          g.fillRect(Math.round(x0 - 3), Math.round(y0 - 3), w + 6, h + 6);
          g.globalAlpha = 1;
        }
        g.fillStyle = "#dff3fb";
        g.fillRect(Math.round(x0), Math.round(y0), w, h);
        const water = Math.round((S.s[i]! / c) * (h - 2));
        g.fillStyle = "#4a90d9";
        g.fillRect(Math.round(x0 + 1), Math.round(y0 + h - 1 - water), w - 2, water);
        if (water > 0) {
          g.fillStyle = "#8fc8f0";
          g.fillRect(Math.round(x0 + 1), Math.round(y0 + h - 1 - water), w - 2, 1);
        }
        g.fillStyle = "#7a8a94";
        g.fillRect(Math.round(x0), Math.round(y0), 1, h);
        g.fillRect(Math.round(x0 + w - 1), Math.round(y0), 1, h);
        g.fillRect(Math.round(x0), Math.round(y0 + h - 1), w, 1);
        g.fillRect(Math.round(x0 + w), Math.round(y0 + 3), 3, 1);
        g.fillRect(Math.round(x0 + w + 2), Math.round(y0 + 3), 1, 6);
        // Inhalt über dem Krug, Größe darunter
        drawNumber(g, S.s[i]!, j.x, y0 - 6, "#1d4f8a");
        drawNumber(g, c, j.x, j.y + 9, "#5a3a22");
      });
    },
    down(p) {
      if (S.done) return;
      let i = jugAt(p);
      if (i < 0)
        i = pickNearest(
          S.level.caps.map((c, k) => ({ x: L.jugs[k]!.x, y: L.jugs[k]!.y - jugH(c) / 2 })),
          p,
          kit.hitR(),
        );
      const onPond =
        i < 0 &&
        S.level.pond &&
        Math.abs(p.x - L.pond.x) < Math.max(L.vw * 0.12, kit.hitR()) &&
        Math.abs(p.y - L.pond.y) < Math.max(12, kit.hitR());
      if (S.sel === -1) {
        if (i >= 0) S.sel = i;
        else if (onPond) S.sel = "teich";
        if (S.sel !== -1) kit.sound.click();
        return;
      }
      const from = S.sel;
      S.sel = -1;
      if (from === "teich") {
        if (i >= 0) act({ kind: "fill", i });
      } else if (onPond) act({ kind: "empty", i: from });
      else if (i >= 0 && i !== from) act({ kind: "pour", i: from, j: i });
    },
    debug: () => ({
      level: S.level.id,
      jugs: [...S.s],
      steps: S.history.length,
      min: S.min,
      done: S.done,
      sel: S.sel,
    }),
    point(what) {
      if (what === "teich") return { x: L.pond.x, y: L.pond.y };
      const i = Number(what);
      const j = L.jugs[i];
      return j ? { x: j.x, y: j.y - jugH(S.level.caps[i]!) / 2 } : null;
    },
  };
}
