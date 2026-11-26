/** Kapitel 9 · Lichter aus (Spec K9, KI-AK-14) */
import { ellipse, rhombus, seededStars } from "../art/scenes.ts";
import {
  LIGHT_LEVELS,
  allOff,
  lightSolve,
  lightStart,
  press,
  type Grid,
  type LightLevel,
} from "../logic/lights.ts";
import { starsOf, type Chapter, type Kit, type Pt } from "./kit.ts";

export function lightsChapter(kit: Kit): Chapter {
  const S = {
    level: LIGHT_LEVELS[0]! as LightLevel,
    g: [] as Grid,
    taps: 0,
    min: 0,
    tip: null as [number, number] | null,
    tipUntil: 0,
    done: false,
    doneAt: 0,
  };
  let G = { tw: 24, ox: 160, oy: 60 };
  const scr = (x: number, y: number): Pt => ({
    x: G.ox + ((x - y) * G.tw) / 2,
    y: G.oy + ((x + y) * G.tw) / 4,
  });
  function cellAt(p: Pt): [number, number] {
    const a = (p.x - G.ox) / (G.tw / 2);
    const b = (p.y + G.tw * 0.35 - G.oy) / (G.tw / 4);
    return [Math.round((a + b) / 2), Math.round((b - a) / 2)];
  }
  function ui() {
    const i = LIGHT_LEVELS.indexOf(S.level) + 1;
    kit.setTop(
      `💡 Level ${i} · Lichter aus`,
      [
        { id: "tipp", label: "💡 Tipp" },
        { id: "neu", label: "↺ Neu" },
        { id: "map", label: "🏝️ Insel" },
      ],
      (id) => {
        if (id === "tipp") {
          const sol = lightSolve(S.g);
          if (!sol?.length) return;
          S.tip = sol[0]!;
          S.tipUntil = kit.clock() + 4;
          kit.toast("💡 Tipp: die leuchtende Stelle antippen.", 3);
        } else if (id === "neu") reset();
        else kit.map();
      },
    );
    count();
  }
  const count = () => kit.setCount(`Tipps: ${S.taps} · Profi-Zahl: ${S.min}`);
  function reset() {
    S.g = lightStart(S.level);
    S.taps = 0;
    S.min = lightSolve(S.g)!.length;
    S.done = false;
    S.tip = null;
    ui();
  }
  function tap(x: number, y: number) {
    const n = S.level.n;
    if (S.done || x < 0 || y < 0 || x >= n || y >= n) return;
    S.g = press(S.g, x, y);
    S.taps++;
    kit.sound.click();
    count();
    if (allOff(S.g)) {
      S.done = true;
      S.doneAt = kit.clock();
      kit.sound.tada();
      const i = LIGHT_LEVELS.indexOf(S.level);
      kit.finish({
        chapter: "lichter",
        level: S.level.id,
        stars: starsOf(S.taps, S.min),
        text: `Gute Nacht, Dorf! ${S.taps} Tipps – die Profi-Zahl ist ${S.min}.`,
        next: LIGHT_LEVELS[i + 1] ? () => start(i + 1) : null,
        again: () => start(i),
      });
    }
  }
  function start(i: number) {
    S.level = LIGHT_LEVELS[i]!;
    reset();
    kit.intro(
      `💡 Lichter aus`,
      `<p>Im Dorf brennen noch Laternen, alle wollen schlafen. Tippst du eine Laterne an,
       schaltet sie um – und ihre <b>vier Nachbarn</b> auch. Mach alle Lichter aus!
       Profi-Zahl: <b>${S.min} Tipps</b>.</p>`,
    );
  }
  return {
    id: "lichter",
    icon: "💡",
    title: "Lichter aus",
    region: "logik",
    levels: LIGHT_LEVELS.map((l) => ({ id: l.id, label: `${l.n}×${l.n}` })),
    card: `<h2>🤖 So denkt ein Computer</h2>
      <p><b>Die Reihenfolge ist egal</b>, und zweimal dieselbe Laterne antippen hebt sich auf. Darum
      tippt man jede Laterne höchstens einmal – es geht nur darum, <b>welche</b>.</p>
      <p>Ein Trick heißt „Licht jagen“: Reihe für Reihe tippt man unter jede brennende Laterne,
      dann wandern alle Lichter nach unten. Computer lösen so etwas mit Gleichungen, in denen es nur
      0 und 1 gibt – genau wie aus und an.</p>`,
    start,
    tick() {},
    draw(g, vw, vh) {
      const n = S.level.n;
      const tw = Math.max(
        16,
        Math.min(40, Math.floor((vw * 0.85) / n / 2) * 2, Math.floor(((vh - 90) * 2) / n / 2) * 2),
      );
      G = { tw, ox: Math.round(vw / 2), oy: Math.round(80 + (vh - 80 - (n * tw) / 2) / 2) };
      const t = kit.clock();
      g.fillStyle = "#151b33";
      g.fillRect(0, 0, vw, vh);
      seededStars(g, vw, vh * 0.5, t, S.done);
      if (S.done) {
        ellipse(g, vw * 0.85, 28, 9, 9, "#f2ecc8");
      }
      for (let s = 0; s < 2 * n; s++)
        for (let x = 0; x < n; x++) {
          const y = s - x;
          if (y < 0 || y >= n) continue;
          const p = scr(x, y);
          rhombus(g, p.x, p.y, tw, (x + y) % 2 ? "#4a4a5e" : "#55556b");
          const on = S.g[y]![x]!;
          if (on) {
            g.globalAlpha = 0.22;
            ellipse(g, p.x, p.y - tw * 0.4, tw * 0.55, tw * 0.4, "#ffd27a");
            g.globalAlpha = 1;
          }
          const tipHere = S.tip && S.tip[0] === x && S.tip[1] === y && t < S.tipUntil;
          if (tipHere) {
            g.globalAlpha = 0.4 + 0.25 * Math.sin(t * Math.PI * 2);
            rhombus(g, p.x, p.y, tw, "#fff6a8");
            g.globalAlpha = 1;
          }
          // Laternenpfahl und Lampe
          const ph = Math.round(tw * 0.55);
          g.fillStyle = "#2b2b2b";
          g.fillRect(Math.round(p.x), Math.round(p.y - ph), 2, ph);
          g.fillStyle = "#3a3a3a";
          g.fillRect(Math.round(p.x - 2), Math.round(p.y - ph - 5), 6, 6);
          g.fillStyle = on ? "#ffd27a" : "#5a5a6e";
          g.fillRect(Math.round(p.x - 1), Math.round(p.y - ph - 4), 4, 4);
          if (on) {
            g.fillStyle = "#fff6c8";
            g.fillRect(Math.round(p.x), Math.round(p.y - ph - 3), 2, 2);
          }
        }
    },
    down(p) {
      const [x, y] = cellAt(p);
      tap(x, y);
    },
    debug: () => ({
      level: S.level.id,
      lit: S.g.flat().filter(Boolean).length,
      taps: S.taps,
      min: S.min,
      solution: lightSolve(S.g),
      done: S.done,
    }),
    point(what) {
      const [x, y] = what.split(",").map(Number);
      const p = scr(x!, y!);
      return { x: p.x, y: p.y - G.tw * 0.3 };
    },
  };
}
