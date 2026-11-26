/** Kapitel 4 · Käse-Labyrinth (Spec K4, KI-AK-11) */
import { SPRITES, drawSprite } from "../art/sprites.ts";
import { drawNumber, rhombus } from "../art/scenes.ts";
import {
  MAZE_LEVELS,
  distances,
  extend,
  free,
  makeMaze,
  shortestPath,
  type Maze,
  type MazeLevel,
} from "../logic/maze.ts";
import { starsOf, type Chapter, type Kit, type Pt } from "./kit.ts";

type Cell = [number, number];

export function mazeChapter(kit: Kit): Chapter {
  const S = {
    level: MAZE_LEVELS[0]! as MazeLevel,
    m: makeMaze(MAZE_LEVELS[0]!) as Maze,
    path: [] as Cell[],
    drawing: false,
    /** Maus läuft: Fortschritt in Feldern */
    run: -1,
    wave: -1,
    dist: [] as number[][],
    best: [] as Cell[],
    tip: [] as Cell[],
    tipUntil: 0,
    done: false,
    min: 0,
  };
  let G = { tw: 12, ox: 160, oy: 40 };
  function geo(vw: number, vh: number) {
    const n = S.m.size;
    const byW = Math.floor((vw * 0.92) / n / 2) * 2;
    const byH = Math.floor(((vh - 70) * 2) / n / 2) * 2;
    const tw = Math.max(8, Math.min(32, byW, byH));
    return {
      tw,
      ox: Math.round(vw / 2),
      oy: Math.round(64 + (vh - 64 - (n * tw) / 2) / 2 - tw / 4),
    };
  }
  const scr = (x: number, y: number): Pt => ({
    x: G.ox + ((x - y) * G.tw) / 2,
    y: G.oy + ((x + y) * G.tw) / 4,
  });
  function cellAt(p: Pt): Cell {
    const a = (p.x - G.ox) / (G.tw / 2);
    const b = (p.y - G.oy) / (G.tw / 4);
    return [Math.round((a + b) / 2), Math.round((b - a) / 2)];
  }
  function ui() {
    const i = MAZE_LEVELS.indexOf(S.level) + 1;
    kit.setTop(
      `🐭 Level ${i} · Käse-Labyrinth`,
      [
        { id: "los", label: "🐭 Los!", primary: true },
        { id: "welle", label: "🌊 Zeig, wie der Computer sucht" },
        { id: "tipp", label: "💡 Tipp" },
        { id: "neu", label: "↺ Neu" },
        { id: "map", label: "🏝️ Insel" },
      ],
      (id) => {
        if (id === "los") go();
        else if (id === "welle") {
          S.wave = 0;
          kit.toast(
            "Die Welle breitet sich Feld für Feld aus – die Zahl ist der Abstand zur Maus.",
            5,
          );
        } else if (id === "tipp") tip();
        else if (id === "neu") reset();
        else kit.map();
      },
    );
    count();
  }
  const count = () => kit.setCount(`Weg: ${S.path.length - 1} Schritte · Profi-Zahl: ${S.min}`);
  function reset() {
    S.m = makeMaze(S.level);
    S.path = [S.m.start];
    S.run = -1;
    S.wave = -1;
    S.dist = distances(S.m);
    S.best = shortestPath(S.m);
    S.min = S.best.length - 1;
    S.done = false;
    S.tip = [];
    ui();
  }
  function tip() {
    // von der Wegspitze aus Richtung Käse (Abstand zum Käse wird kleiner)
    const toGoal = distances(S.m, S.m.goal);
    let [x, y] = S.path.at(-1)!;
    const out: Cell[] = [];
    for (let k = 0; k < 3; k++) {
      const d = toGoal[y]![x]!;
      const nb = (
        [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const
      )
        .map(([dx, dy]) => [x + dx, y + dy] as Cell)
        .find(([a, b]) => free(S.m, a, b) && toGoal[b]![a] === d - 1);
      if (!nb) break;
      out.push(nb);
      [x, y] = nb;
    }
    S.tip = out;
    S.tipUntil = kit.clock() + 4;
    kit.toast("Die leuchtenden Felder führen näher zum Käse.", 3);
  }
  function go() {
    if (S.run >= 0 || S.done) return;
    S.run = 0;
  }
  function start(i: number) {
    S.level = MAZE_LEVELS[i]!;
    reset();
    kit.intro(
      `🐭 Käse-Labyrinth`,
      `<p>Die Maus riecht Käse! Mal mit dem Finger (oder den Pfeiltasten) einen Weg durch die Hecken
       bis zum Käse und drück „🐭 Los!“. Der kürzeste Weg hat <b>${S.min} Schritte</b>.</p>`,
    );
  }
  return {
    id: "labyrinth",
    icon: "🐭",
    title: "Käse-Labyrinth",
    region: "wege",
    levels: MAZE_LEVELS.map((l, i) => ({ id: l.id, label: `${["klein", "mittel", "groß"][i]}` })),
    card: `<h2>🤖 So denkt ein Computer</h2>
      <p><b>Breitensuche:</b> Der Computer schaut zuerst alle Felder an, die 1 Schritt von der Maus
      weg sind, dann alle mit 2 Schritten, dann 3 … – wie Wasser, das sich in alle Richtungen
      gleichzeitig ausbreitet. Sobald die Welle den Käse erreicht, kennt er den kürzesten Weg:
      einfach rückwärts den Zahlen folgen (immer eins kleiner).</p>`,
    start,
    tick(dt) {
      const sp = kit.speed();
      if (S.wave >= 0) S.wave += dt * 8 * sp;
      if (S.run >= 0) {
        S.run += dt * 6 * sp;
        if (S.run >= S.path.length - 1) {
          const end = S.path.at(-1)!;
          S.run = -1;
          if (end[0] === S.m.goal[0] && end[1] === S.m.goal[1]) {
            S.done = true;
            kit.sound.tada();
            const i = MAZE_LEVELS.indexOf(S.level);
            const steps = S.path.length - 1;
            kit.finish({
              chapter: "labyrinth",
              level: S.level.id,
              stars: starsOf(steps, S.min),
              text: `Mmh, Käse! ${steps} Schritte – der kürzeste Weg hat ${S.min}.`,
              next: MAZE_LEVELS[i + 1] ? () => start(i + 1) : null,
              again: () => start(i),
            });
          } else kit.toast("Hier geht's nicht weiter – mal den Weg bis zum Käse!", 3);
        }
      }
    },
    draw(g, vw, vh) {
      G = geo(vw, vh);
      g.fillStyle = "#7cc45e";
      g.fillRect(0, 0, vw, vh);
      const n = S.m.size;
      const onPath = new Set(S.path.map(([x, y]) => `${x},${y}`));
      const onBest = new Set(S.best.map(([x, y]) => `${x},${y}`));
      const tips = new Set(S.tip.map(([x, y]) => `${x},${y}`));
      const t = kit.clock();
      const tw = G.tw;
      const hh = Math.max(2, Math.round(tw / 5));
      for (let s = 0; s < 2 * n; s++)
        for (let x = 0; x < n; x++) {
          const y = s - x;
          if (y < 0 || y >= n) continue;
          const p = scr(x, y);
          const key = `${x},${y}`;
          if (S.m.wall[y]![x]) {
            // Hecke: hochgezogener Block mit Seiten
            g.fillStyle = "#3e7a34";
            g.fillRect(Math.round(p.x - tw / 2), Math.round(p.y - hh), tw / 2, hh + 1);
            g.fillStyle = "#2f6328";
            g.fillRect(Math.round(p.x), Math.round(p.y - hh), tw / 2, hh + 1);
            rhombus(g, p.x, p.y - hh, tw, "#5aa84a");
            if ((x * 7 + y * 3) % 5 === 0) {
              g.fillStyle = "#f4a0a8";
              g.fillRect(Math.round(p.x - 1), Math.round(p.y - hh - 1), 1, 1);
            }
          } else {
            const d = S.dist[y]![x]!;
            let c = (x + y) % 2 ? "#e9d8a6" : "#efdfb0";
            if (S.wave >= 0 && d >= 0 && d <= S.wave)
              c = `hsl(${200 - Math.min(160, d * 6)}, 70%, ${72 - (d % 2) * 4}%)`;
            if (onPath.has(key)) c = "#f0a35a";
            rhombus(g, p.x, p.y, tw, c);
            if (S.wave > S.dist[S.m.goal[1]]![S.m.goal[0]]! + 2 && onBest.has(key)) {
              g.globalAlpha = 0.5 + 0.3 * Math.sin(t * Math.PI * 2);
              rhombus(g, p.x, p.y, Math.max(4, tw - 4), "#ffffff");
              g.globalAlpha = 1;
            }
            if (tips.has(key) && t < S.tipUntil) {
              g.globalAlpha = 0.4 + 0.3 * Math.sin(t * Math.PI * 2);
              rhombus(g, p.x, p.y, tw, "#fff6a8");
              g.globalAlpha = 1;
            }
            if (S.wave >= 0 && d >= 0 && d <= S.wave && tw >= 12)
              drawNumber(g, d, p.x, p.y, "#2b2233");
          }
          if (x === S.m.goal[0] && y === S.m.goal[1])
            drawSprite(g, SPRITES.kaese!, Math.round(p.x - 3), Math.round(p.y - 7));
        }
      // Maus
      const k = S.run >= 0 ? S.run : S.done ? S.path.length - 1 : 0;
      const i0 = Math.min(S.path.length - 1, Math.floor(k));
      const i1 = Math.min(S.path.length - 1, i0 + 1);
      const f = k - i0;
      const a = scr(...S.path[i0]!);
      const b = scr(...S.path[i1]!);
      const mx = a.x + (b.x - a.x) * f;
      const my = a.y + (b.y - a.y) * f;
      drawSprite(g, SPRITES.maus!, Math.round(mx - 4), Math.round(my - 8), b.x < a.x);
    },
    down(p) {
      if (S.run >= 0 || S.done) return;
      const [x, y] = cellAt(p);
      const idx = S.path.findIndex(([a, b]) => a === x && b === y);
      if (idx >= 0) {
        S.path = S.path.slice(0, idx + 1);
        S.drawing = true;
      } else {
        const before = S.path.length;
        S.path = extend(S.m, S.path, x, y);
        S.drawing = S.path.length !== before;
      }
      S.wave = -1;
      count();
    },
    move(p) {
      if (!S.drawing || S.run >= 0 || S.done) return;
      const [x, y] = cellAt(p);
      const before = S.path.length;
      S.path = extend(S.m, S.path, x, y);
      if (S.path.length !== before) {
        kit.sound.click();
        count();
      }
    },
    up() {
      S.drawing = false;
    },
    key(e) {
      const d: Record<string, [number, number]> = {
        ArrowRight: [1, 0],
        ArrowLeft: [-1, 0],
        ArrowDown: [0, 1],
        ArrowUp: [0, -1],
      };
      if (e.key === "Enter") {
        go();
        return true;
      }
      const v = d[e.key];
      if (!v || S.run >= 0 || S.done) return false;
      const [x, y] = S.path.at(-1)!;
      S.path = extend(S.m, S.path, x + v[0], y + v[1]);
      count();
      return true;
    },
    debug: () => ({
      level: S.level.id,
      path: S.path.length - 1,
      min: S.min,
      running: S.run >= 0,
      wave: S.wave,
      done: S.done,
      best: S.best,
    }),
    point(what) {
      const [a, b] = what.split(",").map(Number);
      return scr(a!, b!);
    },
  };
}
