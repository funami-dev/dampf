/** Kapitel 15 · Brücken-Spaziergang (Spec K15, KI-AK-16) */
import { SPRITES, drawSprite } from "../art/sprites.ts";
import { drawNumber, ellipse } from "../art/scenes.ts";
import {
  EULER_LEVELS,
  allUsed,
  degrees,
  eulerKind,
  newWalk,
  nextIsland,
  stuck,
  walkTo,
  type EulerLevel,
  type Walk,
} from "../logic/euler.ts";
import { type Chapter, type Kit, type Pt, type Tool } from "./kit.ts";

export function eulerChapter(kit: Kit): Chapter {
  const S = {
    level: EULER_LEVELS[0]! as EulerLevel,
    w: newWalk(EULER_LEVELS[0]!) as Walk,
    tries: 1,
    showDeg: false,
    tip: null as string | null,
    tipUntil: 0,
    hop: null as null | { from: string; to: string; t: number },
    done: false,
  };
  let box = { x: 20, y: 80, w: 280, h: 100 };
  const pos = (id: string): Pt => {
    const i = S.level.islands.find((x) => x.id === id)!;
    return { x: box.x + (i.x / 100) * box.w, y: box.y + (i.y / 100) * box.h };
  };
  const impossible = () => eulerKind(S.level).kind === "unmoeglich";
  function ui() {
    const i = EULER_LEVELS.indexOf(S.level) + 1;
    const tools: Tool[] = [
      ...(impossible()
        ? [
            { id: "ja", label: "✅ Geht!" },
            { id: "nein", label: "❌ Geht nicht!" },
          ]
        : []),
      { id: "zaehlen", label: "🔢 Brücken zählen", pressed: S.showDeg },
      { id: "tipp", label: "💡 Tipp" },
      { id: "neu", label: "↺ Neu" },
      { id: "map", label: "🏝️ Insel" },
    ];
    kit.setTop(`🌉 Level ${i} · Brücken-Spaziergang`, tools, (id) => {
      if (id === "zaehlen") {
        S.showDeg = !S.showDeg;
        ui();
      } else if (id === "tipp") {
        const to = nextIsland(S.level, S.w);
        if (to === null) {
          kit.toast(
            impossible()
              ? "Zähl die Brücken an jeder Insel. Bei mehr als zwei ungeraden Zahlen …?"
              : "Von hier geht es nicht weiter – fang mit ↺ Neu noch einmal an.",
            5,
          );
          return;
        }
        S.tip = to;
        S.tipUntil = kit.clock() + 4;
        kit.toast(
          S.w.at === null
            ? "💡 Fang auf der leuchtenden Insel an."
            : "💡 Geh zur leuchtenden Insel.",
          3,
        );
      } else if (id === "neu") {
        S.w = newWalk(S.level);
        S.tries++;
        count();
      } else if (id === "ja")
        kit.toast("Probier es aus … und zähl dann die Brücken an jeder Insel!", 4);
      else if (id === "nein") answerImpossible();
      else kit.map();
    });
    count();
  }
  const count = () =>
    kit.setCount(
      `Brücken: ${S.w.used.filter(Boolean).length} von ${S.level.bridges.length} · Versuch ${S.tries}`,
    );
  function answerImpossible() {
    if (S.done) return;
    S.done = true;
    kit.sound.tada();
    const d = degrees(S.level);
    const odd = eulerKind(S.level).odd;
    kit.finish({
      chapter: "bruecken",
      level: S.level.id,
      stars: S.tries <= 1 ? 3 : S.tries <= 3 ? 2 : 1,
      text: `Richtig – das geht nicht! ${odd.map((o) => `Insel ${o}: ${d[o]} Brücken`).join(", ")} – mehr als zwei Inseln mit ungerader Zahl.`,
      next: null,
      again: () => start(EULER_LEVELS.indexOf(S.level)),
    });
  }
  function hop(to: string) {
    if (S.done || S.hop) return;
    const n = walkTo(S.level, S.w, to);
    if (!n) {
      kit.toast("Dahin führt keine freie Brücke.", 2.5);
      return;
    }
    if (S.w.at === null) {
      S.w = n;
      kit.sound.click();
      count();
      return;
    }
    S.hop = { from: S.w.at, to, t: 0 };
    S.w = n;
    kit.sound.pick();
  }
  function start(i: number) {
    S.level = EULER_LEVELS[i]!;
    S.w = newWalk(S.level);
    S.tries = 1;
    S.showDeg = false;
    S.done = false;
    S.hop = null;
    ui();
    kit.intro(
      `🌉 Brücken-Spaziergang`,
      impossible()
        ? `<p>Hier gibt es 4 Inseln und 7 Brücken. Kann man über <b>jede Brücke genau einmal</b>
           gehen? Probier es aus – und dann sag: „✅ Geht!“ oder „❌ Geht nicht!“.</p>`
        : `<p>Geh über <b>jede Brücke genau einmal</b>! Tippe zuerst die Insel an, auf der du
           anfängst, dann die nächste Insel. Benutzte Brücken werden bunt.</p>`,
    );
  }
  return {
    id: "bruecken",
    icon: "🌉",
    title: "Brücken-Spaziergang",
    region: "wege",
    levels: EULER_LEVELS.map((l, i) => ({
      id: l.id,
      label: ["Rundgang", "richtiger Start", "Geht das?"][i]!,
    })),
    card: `<h2>🤖 So denkt ein Computer</h2>
      <p><b>Zähl die Brücken an jeder Insel.</b> Wer auf eine Insel kommt, muss sie auch wieder
      verlassen – darum braucht jede Insel, die nicht Anfang oder Ende ist, eine <b>gerade</b> Zahl.</p>
      <p>Alle gerade → Rundgang geht. Genau zwei ungerade → es geht, wenn man auf einer von ihnen
      anfängt. Mehr als zwei ungerade → unmöglich! Das hat Leonhard Euler 1736 für die Brücken von
      Königsberg herausgefunden – der Anfang der <b>Graphentheorie</b>, mit der heute
      Navigationsgeräte Wege planen.</p>`,
    start,
    tick(dt) {
      const h = S.hop;
      if (!h) return;
      h.t += (dt * kit.speed()) / 0.5;
      if (h.t >= 1) {
        S.hop = null;
        kit.sound.drop();
        count();
        if (allUsed(S.w)) {
          S.done = true;
          kit.sound.tada();
          const i = EULER_LEVELS.indexOf(S.level);
          kit.finish({
            chapter: "bruecken",
            level: S.level.id,
            stars: S.tries <= 1 ? 3 : S.tries <= 3 ? 2 : 1,
            text: `Jede Brücke genau einmal – im ${S.tries}. Versuch!`,
            next: EULER_LEVELS[i + 1] ? () => start(i + 1) : null,
            again: () => start(i),
          });
        } else if (stuck(S.level, S.w))
          kit.toast("Hier geht keine freie Brücke mehr weg – fang mit ↺ Neu noch einmal an.", 4);
      }
    },
    draw(g, vw, vh) {
      box = {
        x: Math.round(vw * 0.12),
        y: Math.round(vh * 0.32),
        w: Math.round(vw * 0.76),
        h: Math.round(vh * 0.6),
      };
      const t = kit.clock();
      g.fillStyle = "#4a90d9";
      g.fillRect(0, 0, vw, vh);
      for (let i = 0; i < 60; i++) {
        const a = (Math.sin(t * (Math.PI / 2) + i) + 1) / 2;
        g.fillStyle = a > 0.5 ? "#6aaee8" : "#5aa0e6";
        g.fillRect((i * 47) % vw, (i * 29) % vh, 5, 1);
      }
      // Brücken (parallele leicht versetzt)
      const seen = new Map<string, number>();
      S.level.bridges.forEach(([a, b], k) => {
        const key = [a, b].sort().join();
        const n = seen.get(key) ?? 0;
        seen.set(key, n + 1);
        const p = pos(a);
        const q = pos(b);
        const len = Math.hypot(q.x - p.x, q.y - p.y);
        const nx = -(q.y - p.y) / len;
        const ny = (q.x - p.x) / len;
        const off =
          n === 0
            ? S.level.bridges.filter(([x, y]) => [x, y].sort().join() === key).length > 1
              ? -6
              : 0
            : 6;
        const used = S.w.used[k];
        for (let s = 0.18; s <= 0.82; s += 0.02) {
          const x = p.x + (q.x - p.x) * s + nx * off;
          const y = p.y + (q.y - p.y) * s + ny * off;
          g.fillStyle = used ? "#e67e22" : "#a8703f";
          g.fillRect(Math.round(x - 2), Math.round(y - 2), 4, 4);
          g.fillStyle = used ? "#f6b26b" : "#c88a52";
          g.fillRect(Math.round(x - 2), Math.round(y - 2), 4, 1);
        }
      });
      // Inseln
      for (const isl of S.level.islands) {
        const p = pos(isl.id);
        const tip = S.tip === isl.id && t < S.tipUntil;
        if (tip) {
          g.globalAlpha = 0.4 + 0.25 * Math.sin(t * Math.PI * 2);
          ellipse(g, p.x, p.y, 24, 16, "#fff6a8");
          g.globalAlpha = 1;
        }
        ellipse(g, p.x, p.y + 2, 19, 12, "#f2dc9b");
        ellipse(g, p.x, p.y, 16, 10, "#6fbf5a");
        g.fillStyle = "#3e8e3e";
        g.fillRect(Math.round(p.x + 6), Math.round(p.y - 12), 2, 8);
        ellipse(g, p.x + 7, p.y - 14, 5, 4, "#4caf50");
        if (S.showDeg) {
          const d = degrees(S.level)[isl.id]!;
          ellipse(g, p.x - 8, p.y - 4, 6, 5, d % 2 ? "#f4a0a8" : "#ffffff");
          drawNumber(g, d, p.x - 8, p.y - 4, "#2b2233");
        }
      }
      // Spaziergänger
      let wp: Pt | null = S.w.at ? pos(S.w.at) : null;
      if (S.hop) {
        const a = pos(S.hop.from);
        const b = pos(S.hop.to);
        wp = { x: a.x + (b.x - a.x) * S.hop.t, y: a.y + (b.y - a.y) * S.hop.t };
      }
      if (wp) drawSprite(g, SPRITES.hase!, Math.round(wp.x - 5), Math.round(wp.y - 14));
    },
    down(p) {
      let best: string | null = null;
      let bd = Infinity;
      for (const isl of S.level.islands) {
        const q = pos(isl.id);
        const d = Math.hypot(p.x - q.x, (p.y - q.y) * 1.5);
        if (d < 22 && d < bd) {
          bd = d;
          best = isl.id;
        }
      }
      if (best) hop(best);
    },
    debug: () => ({
      level: S.level.id,
      at: S.w.at,
      used: S.w.used.filter(Boolean).length,
      total: S.level.bridges.length,
      busy: !!S.hop,
      done: S.done,
      kind: eulerKind(S.level).kind,
    }),
    point(what) {
      return pos(what);
    },
  };
}
