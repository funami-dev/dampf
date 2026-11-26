/** Kapitel 16 · Bienen-Lieferdienst (Spec K16, KI-AK-16) */
import { ellipse } from "../art/scenes.ts";
import { BEE_LEVELS, bestTour, greedyTour, tourLength, type BeeLevel } from "../logic/tsp.ts";
import { pickNearest, starsOf, type Chapter, type Kit, type Pt } from "./kit.ts";

const meters = (d: number) => Math.round(d);

export function beesChapter(kit: Kit): Chapter {
  const S = {
    level: BEE_LEVELS[0]! as BeeLevel,
    order: [] as number[],
    best: 0,
    greedy: null as null | number[],
    tip: -1,
    tipUntil: 0,
    fly: null as null | { from: Pt; to: Pt; t: number },
    done: false,
  };
  let box = { x: 20, y: 80, w: 280, h: 100 };
  const P = (p: { x: number; y: number }): Pt => ({
    x: box.x + (p.x / 100) * box.w,
    y: box.y + (p.y / 100) * box.h,
  });
  /** Strecke so weit (ohne Rückflug, außer wenn fertig) */
  const sofar = () => {
    if (!S.order.length) return 0;
    const full = tourLength(S.level, S.order);
    const last = S.level.flowers[S.order.at(-1)!]!;
    const back = Math.hypot(last.x - S.level.hive.x, last.y - S.level.hive.y);
    return S.order.length === S.level.flowers.length ? full : full - back;
  };
  function ui() {
    const i = BEE_LEVELS.indexOf(S.level) + 1;
    kit.setTop(
      `🐝 Level ${i} · ${S.level.flowers.length} Blumen`,
      [
        { id: "tipp", label: "💡 Tipp" },
        { id: "gierig", label: "🐝 Immer zur nächsten?" },
        { id: "neu", label: "↺ Neu" },
        { id: "map", label: "🏝️ Insel" },
      ],
      (id) => {
        if (id === "tipp") {
          const b = bestTour(S.level, S.order);
          S.tip = b.order[S.order.length] ?? -1;
          S.tipUntil = kit.clock() + 4;
          kit.toast("💡 Flieg als Nächstes zur leuchtenden Blume.", 3);
        } else if (id === "gierig") {
          const g = greedyTour(S.level);
          S.greedy = g.order;
          kit.toast(
            `„Immer zur nächsten Blume“ fliegt ${meters(g.len)} m – der kürzeste Weg ist ${meters(S.best)} m.`,
            5,
          );
        } else if (id === "neu") reset();
        else kit.map();
      },
    );
    count();
  }
  const count = () =>
    kit.setCount(`Strecke: ${meters(sofar())} m · Profi-Zahl: ${meters(S.best)} m`);
  function reset() {
    S.order = [];
    S.best = bestTour(S.level).len;
    S.greedy = null;
    S.fly = null;
    S.done = false;
    S.tip = -1;
    ui();
  }
  function visit(i: number) {
    if (S.done || S.fly || S.order.includes(i)) return;
    const from = S.order.length ? S.level.flowers[S.order.at(-1)!]! : S.level.hive;
    S.order.push(i);
    S.fly = { from: P(from), to: P(S.level.flowers[i]!), t: 0 };
    kit.sound.pick();
  }
  function start(i: number) {
    S.level = BEE_LEVELS[i]!;
    reset();
    kit.intro(
      `🐝 Bienen-Lieferdienst`,
      `<p>Die Biene startet am Bienenstock, soll <b>jede Blume einmal</b> besuchen und dann wieder
       nach Hause fliegen – auf dem <b>kürzesten</b> Weg. Tippe die Blumen der Reihe nach an.
       Profi-Zahl: <b>${meters(S.best)} m</b>.</p>`,
    );
  }
  return {
    id: "bienen",
    icon: "🐝",
    title: "Bienen-Lieferdienst",
    region: "wege",
    levels: BEE_LEVELS.map((l) => ({ id: l.id, label: `${l.flowers.length} 🌼` })),
    card: `<h2>🤖 So denkt ein Computer</h2>
      <p>Das ist das <b>Rundreise-Problem</b>. Bei 4 Blumen gibt es 24 Reihenfolgen, bei 8 schon
      40 320 – der Computer hat sie hier alle durchprobiert. Bei 20 Blumen wären es mehr als
      2 Trillionen!</p>
      <p>„Immer zur nächsten Blume“ ist schnell, aber oft nicht der kürzeste Weg. Darum benutzen
      Paketdienste und Navis geschickte Tricks, um gute Wege zu finden, ohne alles auszuprobieren.</p>`,
    start,
    tick(dt) {
      const f = S.fly;
      if (!f) return;
      f.t += (dt * kit.speed()) / 0.5;
      if (f.t < 1) return;
      S.fly = null;
      count();
      if (S.order.length === S.level.flowers.length) {
        if (f.to.x === P(S.level.hive).x && f.to.y === P(S.level.hive).y) {
          S.done = true;
          kit.sound.tada();
          const len = tourLength(S.level, S.order);
          const i = BEE_LEVELS.indexOf(S.level);
          kit.finish({
            chapter: "bienen",
            level: S.level.id,
            stars: starsOf(len, S.best * 1.0001),
            text: `Zurück im Stock nach ${meters(len)} m – der kürzeste Weg ist ${meters(S.best)} m.`,
            next: BEE_LEVELS[i + 1] ? () => start(i + 1) : null,
            again: () => start(i),
          });
        } else {
          // Heimflug
          S.fly = { from: f.to, to: P(S.level.hive), t: 0 };
        }
      }
    },
    draw(g, vw, vh) {
      box = {
        x: Math.round(vw * 0.1),
        y: Math.round(vh * 0.3),
        w: Math.round(vw * 0.8),
        h: Math.round(vh * 0.62),
      };
      const t = kit.clock();
      g.fillStyle = "#8fd46c";
      g.fillRect(0, 0, vw, vh);
      for (let i = 0; i < 80; i++) {
        g.fillStyle = i % 3 ? "#7cc45e" : "#a3e07e";
        g.fillRect((i * 43) % vw, (i * 71) % vh, 2, 1);
      }
      // gieriger Weg gestrichelt
      if (S.greedy) {
        const pts = [S.level.hive, ...S.greedy.map((k) => S.level.flowers[k]!), S.level.hive].map(
          P,
        );
        g.fillStyle = "rgba(43,34,51,0.35)";
        for (let k = 1; k < pts.length; k++)
          for (let s = 0; s < 1; s += 0.04)
            if (Math.floor(s * 25) % 2 === 0)
              g.fillRect(
                Math.round(pts[k - 1]!.x + (pts[k]!.x - pts[k - 1]!.x) * s),
                Math.round(pts[k - 1]!.y + (pts[k]!.y - pts[k - 1]!.y) * s),
                1,
                1,
              );
      }
      // eigener Weg
      const route = [S.level.hive, ...S.order.map((k) => S.level.flowers[k]!)].map(P);
      if (S.done) route.push(P(S.level.hive));
      g.fillStyle = "#f39c12";
      for (let k = 1; k < route.length; k++) {
        const a = route[k - 1]!;
        const b = route[k]!;
        if (k === route.length - 1 && S.fly && !S.done) break;
        for (let s = 0; s <= 1; s += 0.02)
          g.fillRect(Math.round(a.x + (b.x - a.x) * s), Math.round(a.y + (b.y - a.y) * s), 2, 2);
      }
      // Bienenstock
      const h = P(S.level.hive);
      ellipse(g, h.x, h.y, 9, 8, "#e0b83a");
      for (let k = -6; k <= 6; k += 3) {
        g.fillStyle = "#b8901f";
        g.fillRect(Math.round(h.x - 8), Math.round(h.y + k), 16, 1);
      }
      g.fillStyle = "#5a3a22";
      g.fillRect(Math.round(h.x - 2), Math.round(h.y + 3), 4, 3);
      // Blumen
      S.level.flowers.forEach((f, i) => {
        const p = P(f);
        const visited = S.order.includes(i);
        if (S.tip === i && t < S.tipUntil) {
          g.globalAlpha = 0.4 + 0.25 * Math.sin(t * Math.PI * 2);
          ellipse(g, p.x, p.y, 10, 10, "#fff6a8");
          g.globalAlpha = 1;
        }
        g.fillStyle = "#3f8a3a";
        g.fillRect(Math.round(p.x), Math.round(p.y + 2), 1, 6);
        const col = ["#e74c3c", "#9b59b6", "#f4a0a8", "#3498db"][i % 4]!;
        for (const [dx, dy] of [
          [-3, 0],
          [3, 0],
          [0, -3],
          [0, 3],
        ] as const)
          ellipse(g, p.x + dx, p.y + dy, 2, 2, visited ? "#c9c2b3" : col);
        ellipse(g, p.x, p.y, 2, 2, "#f6d55c");
      });
      // Biene
      let b: Pt;
      const last = S.order.length ? P(S.level.flowers[S.order.at(-1)!]!) : h;
      if (S.fly)
        b = {
          x: S.fly.from.x + (S.fly.to.x - S.fly.from.x) * S.fly.t,
          y: S.fly.from.y + (S.fly.to.y - S.fly.from.y) * S.fly.t,
        };
      else b = S.done ? h : last;
      const bob = Math.sin(t * 6) * 1;
      ellipse(g, b.x, b.y - 6 + bob, 3, 2, "#f6d55c");
      g.fillStyle = "#2b2233";
      g.fillRect(Math.round(b.x - 1), Math.round(b.y - 8 + bob), 1, 4);
      g.fillRect(Math.round(b.x + 1), Math.round(b.y - 8 + bob), 1, 4);
      g.globalAlpha = 0.7;
      ellipse(g, b.x - 1, b.y - 9 + bob, 2, 1, "#ffffff");
      ellipse(g, b.x + 2, b.y - 9 + bob, 2, 1, "#ffffff");
      g.globalAlpha = 1;
    },
    down(p) {
      const best = pickNearest(
        S.level.flowers.map((f) => ({ ...P(f), r: 10 })),
        p,
        kit.hitR(),
      );
      if (best >= 0) visit(best);
    },
    debug: () => ({
      level: S.level.id,
      order: [...S.order],
      best: S.best,
      busy: !!S.fly,
      done: S.done,
    }),
    point(what) {
      const f = S.level.flowers[Number(what)];
      return f ? P(f) : null;
    },
  };
}
