/** Kapitel 10 · Pinguin-Parade (Spec K10, KI-AK-14) */
import { ellipse } from "../art/scenes.ts";
import {
  PENGUIN_LEVELS,
  bubbleFrames,
  inversions,
  isSorted,
  mergeFrames,
  swapAt,
} from "../logic/penguins.ts";
import { starsOf, type Chapter, type Kit, type Pt } from "./kit.ts";

/** kleiner Pinguin, Größe v (1..20), x = Mitte, y = Fußpunkt */
function penguin(g: CanvasRenderingContext2D, x: number, y: number, v: number, small = false) {
  const w = small ? 4 : 9;
  const h = small ? 3 + v : 8 + v * 3;
  const R = (a: number, b: number, c: number, d: number, col: string) => {
    g.fillStyle = col;
    g.fillRect(Math.round(a), Math.round(b), Math.round(c), Math.round(d));
  };
  R(x - w / 2, y - h, w, h, "#232a36");
  R(
    x - w / 2 + (small ? 1 : 2),
    y - h + (small ? 1 : 4),
    w - (small ? 2 : 4),
    h - (small ? 1 : 5),
    "#f4f6f8",
  );
  if (!small) {
    R(x - 2, y - h + 2, 1, 1, "#ffffff");
    R(x + 1, y - h + 2, 1, 1, "#ffffff");
    R(x - 1, y - h + 4, 2, 1, "#f39c12");
    R(x - 4, y - 1, 3, 1, "#f39c12");
    R(x + 1, y - 1, 3, 1, "#f39c12");
  }
}

export function penguinsChapter(kit: Kit): Chapter {
  const S = {
    li: 0,
    s: [] as number[],
    swaps: 0,
    min: 0,
    sel: -1,
    anim: null as null | { i: number; t: number },
    tipUntil: 0,
    done: false,
    race: null as null | { b: number[][]; m: number[][]; t: number; told: boolean },
  };
  let L = { xs: [] as number[], y: 140 };
  function ui() {
    kit.setTop(
      `🐧 Level ${S.li + 1} · Pinguin-Parade`,
      [
        { id: "tipp", label: "💡 Tipp" },
        { id: "neu", label: "↺ Neu" },
        { id: "map", label: "🏝️ Insel" },
      ],
      (id) => {
        if (id === "tipp") {
          S.tipUntil = kit.clock() + 4;
          kit.toast("💡 Die zwei leuchtenden Nachbarn stehen falsch herum.", 3);
        } else if (id === "neu") reset();
        else kit.map();
      },
    );
    count();
  }
  const count = () => kit.setCount(`Tausche: ${S.swaps} · Profi-Zahl: ${S.min}`);
  function reset() {
    S.s = [...PENGUIN_LEVELS[S.li]!.start];
    S.swaps = 0;
    S.min = inversions(S.s);
    S.sel = -1;
    S.anim = null;
    S.done = false;
    S.race = null;
    ui();
  }
  function startRace() {
    kit.closePanel();
    const r = Array.from({ length: 20 }, (_, i) => ((i * 7) % 20) + 1);
    S.race = { b: bubbleFrames(r), m: mergeFrames(r), t: 0, told: false };
    kit.setTop("🏁 Wettrennen der Sortierer", [{ id: "map", label: "🏝️ Insel" }], () => kit.map());
  }
  function start(i: number) {
    S.li = i;
    reset();
    kit.intro(
      `🐧 Pinguin-Parade`,
      `<p>Die Pinguine wollen sich für das Gruppenfoto aufstellen: <b>klein links, groß rechts</b>.
       Aber auf der glatten Scholle dürfen nur <b>zwei Nachbarn</b> die Plätze tauschen.</p>
       <p><small>Pinguin antippen, dann seinen Nachbarn. Profi-Zahl: <b>${S.min} Tausche</b>.</small></p>`,
    );
  }
  const badPair = () => S.s.findIndex((v, k) => k < S.s.length - 1 && v > S.s[k + 1]!);
  return {
    id: "pinguine",
    icon: "🐧",
    title: "Pinguin-Parade",
    region: "suchen",
    levels: PENGUIN_LEVELS.map((l) => ({ id: l.id, label: `${l.start.length} 🐧` })),
    card: `<h2>🤖 So denkt ein Computer</h2>
      <p>Wer nur Nachbarn tauscht, braucht genau so viele Tausche, wie Paare falsch herum stehen
      (<b>Fehlstände</b>). Das Verfahren heißt <b>Bubblesort</b>: Die Großen blubbern wie Blasen nach
      rechts.</p>
      <p>Bei vielen Pinguinen ist <b>Mischen (Mergesort)</b> viel schneller: kleine Gruppen sortieren
      und dann wie zwei Kartenstapel zusammenmischen. Schau dir das Wettrennen an!</p>`,
    start,
    tick(dt) {
      const a = S.anim;
      if (a) {
        a.t += (dt * kit.speed()) / 0.3;
        if (a.t >= 1) {
          S.s = swapAt(S.s, a.i);
          S.anim = null;
          S.swaps++;
          kit.sound.drop();
          count();
          if (isSorted(S.s)) {
            S.done = true;
            kit.sound.tada();
            kit.finish({
              chapter: "pinguine",
              level: PENGUIN_LEVELS[S.li]!.id,
              stars: starsOf(S.swaps, S.min),
              text: `Fertig fürs Foto! ${S.swaps} Tausche – die Profi-Zahl ist ${S.min}.`,
              next: PENGUIN_LEVELS[S.li + 1] ? () => start(S.li + 1) : null,
              again: () => start(S.li),
              extra: { label: "🏁 Wettrennen", fn: startRace },
            });
          }
        }
      }
      const r = S.race;
      if (r) {
        r.t += dt * 14 * kit.speed();
        const bi = Math.min(r.b.length, Math.floor(r.t));
        const mi = Math.min(r.m.length, Math.floor(r.t));
        kit.setCount(`Nachbarn tauschen: ${bi} Vergleiche · Mischen: ${mi} Vergleiche`);
        if (!r.told && bi >= r.b.length) {
          r.told = true;
          kit.toast(
            `Mischen war nach ${r.m.length} Vergleichen fertig – Nachbarn tauschen brauchte ${r.b.length}!`,
            6,
          );
        }
      }
    },
    draw(g, vw, vh) {
      const t = kit.clock();
      g.fillStyle = "#bfe6f5";
      g.fillRect(0, 0, vw, vh);
      g.fillStyle = "#3a7bd5";
      g.fillRect(0, Math.round(vh * 0.7), vw, vh);
      for (let i = 0; i < 30; i++) {
        const a = (Math.sin(t * (Math.PI / 2) + i) + 1) / 2;
        g.fillStyle = a > 0.5 ? "#6aaee8" : "#4a90d9";
        g.fillRect((i * 41) % vw, Math.round(vh * 0.72 + ((i * 17) % (vh * 0.26))), 5, 1);
      }
      const r = S.race;
      if (r) {
        // zwei Bahnen mit je 20 kleinen Pinguinen
        const lanes: [number[], string][] = [
          [r.b[Math.min(r.b.length - 1, Math.floor(r.t))]!, "#f2f7fa"],
          [r.m[Math.min(r.m.length - 1, Math.floor(r.t))]!, "#e8f5ea"],
        ];
        lanes.forEach(([arr, col], k) => {
          const y = Math.round(vh * (0.42 + k * 0.25));
          g.fillStyle = col;
          g.fillRect(8, y - 2, vw - 16, 6);
          const gap = (vw - 30) / arr.length;
          arr.forEach((v, i) => penguin(g, 15 + i * gap + gap / 2, y, v, true));
        });
        return;
      }
      // Eisscholle
      const n = S.s.length;
      const gap = Math.min(28, Math.floor((vw - 30) / n));
      L = {
        xs: S.s.map((_, i) => Math.round(vw / 2 + (i - (n - 1) / 2) * gap)),
        y: Math.round(vh * 0.66),
      };
      ellipse(g, vw / 2, L.y + 3, (n * gap) / 2 + 14, 9, "#ffffff");
      ellipse(g, vw / 2, L.y + 6, (n * gap) / 2 + 12, 6, "#d6eef8");
      const bp = badPair();
      S.s.forEach((v, i) => {
        let x = L.xs[i]!;
        const a = S.anim;
        if (a && (i === a.i || i === a.i + 1)) {
          const other = i === a.i ? L.xs[a.i + 1]! : L.xs[a.i]!;
          x = x + (other - x) * a.t;
        }
        const glow = i === S.sel || (t < S.tipUntil && (i === bp || i === bp + 1));
        if (glow) {
          g.globalAlpha = 0.35 + 0.25 * Math.sin(t * Math.PI * 2);
          ellipse(g, x, L.y - 8 - v, 9, 8 + v * 1.5, "#fff6a8");
          g.globalAlpha = 1;
        }
        penguin(
          g,
          x,
          L.y - (a && (i === a.i || i === a.i + 1) ? Math.sin(Math.PI * a.t) * 4 : 0),
          v,
        );
      });
    },
    down(p) {
      if (S.done || S.anim || S.race) return;
      let hit = -1;
      L.xs.forEach((x, i) => {
        if (Math.abs(p.x - x) <= 7 && p.y <= L.y + 4 && p.y >= L.y - 12 - S.s[i]! * 3) hit = i;
      });
      if (hit < 0) return;
      if (S.sel < 0) {
        S.sel = hit;
        kit.sound.click();
        return;
      }
      const a = S.sel;
      S.sel = -1;
      if (a === hit) return;
      if (Math.abs(a - hit) !== 1) {
        kit.toast("Nur Nachbarn dürfen tauschen – sonst rutschen alle aus!", 3);
        return;
      }
      S.anim = { i: Math.min(a, hit), t: 0 };
      kit.sound.pick();
    },
    debug: () => ({
      level: PENGUIN_LEVELS[S.li]!.id,
      order: [...S.s],
      swaps: S.swaps,
      min: S.min,
      busy: !!S.anim,
      done: S.done,
      race: S.race ? { done: !!S.race.told, b: S.race.b.length, m: S.race.m.length } : null,
    }),
    point(what): Pt | null {
      const i = Number(what);
      const x = L.xs[i];
      return x === undefined ? null : { x, y: L.y - 6 - S.s[i]! * 1.5 };
    },
  };
}
