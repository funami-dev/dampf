/** Kapitel 8 · Frosch-Hüpfen (Spec K8, KI-AK-14) */
import { SPRITES, drawSprite } from "../art/sprites.ts";
import { ellipse } from "../art/scenes.ts";
import {
  FROG_LEVELS,
  frogBest,
  frogGoal,
  frogMin,
  frogMove,
  frogStart,
  frogStuck,
  frogTarget,
  type Pad,
} from "../logic/frogs.ts";
import { starsOf, type Chapter, type Kit, type Pt } from "./kit.ts";

const BROWN = { g: "#8a5a2b", G: "#b07a40" };

export function frogsChapter(kit: Kit): Chapter {
  const S = {
    li: 0,
    n: 1,
    s: frogStart(1) as Pad[],
    history: [] as Pad[][],
    jump: null as null | { from: number; to: number; t: number },
    tip: -1,
    tipUntil: 0,
    wiggle: { i: -1, until: 0 },
    done: false,
  };
  let L = { padX: [] as number[], y: 120 };
  function ui() {
    kit.setTop(
      `🐸 Level ${S.li + 1} · ${S.n} + ${S.n} Frösche`,
      [
        { id: "zurueck", label: "↩ Zurück" },
        { id: "tipp", label: "💡 Tipp" },
        { id: "neu", label: "↺ Neu" },
        { id: "map", label: "🏝️ Insel" },
      ],
      (id) => {
        if (id === "zurueck") undo();
        else if (id === "tipp") {
          const b = frogBest(S.s);
          if (b.first === null) {
            kit.toast("Von hier geht es nicht mehr – nimm ein paar Hüpfer zurück.", 4);
            return;
          }
          S.tip = b.first;
          S.tipUntil = kit.clock() + 4;
          kit.toast("💡 Der leuchtende Frosch ist dran.", 3);
        } else if (id === "neu") reset();
        else kit.map();
      },
    );
    count();
  }
  const count = () => kit.setCount(`Hüpfer: ${S.history.length} · Profi-Zahl: ${frogMin(S.n)}`);
  function reset() {
    S.s = frogStart(S.n);
    S.history = [];
    S.jump = null;
    S.done = false;
    S.tip = -1;
    ui();
  }
  function undo() {
    if (S.jump || S.done || !S.history.length) return;
    S.s = S.history.pop()!;
    count();
  }
  function hop(i: number) {
    if (S.jump || S.done) return;
    const t = frogTarget(S.s, i);
    if (t < 0) {
      S.wiggle = { i, until: kit.clock() + 0.5 };
      kit.toast("Der kann gerade nicht hüpfen – nur vorwärts, aufs freie Blatt.", 3);
      return;
    }
    S.jump = { from: i, to: t, t: 0 };
    kit.sound.pick();
  }
  function start(i: number) {
    S.li = i;
    S.n = FROG_LEVELS[i]!.n;
    reset();
    kit.intro(
      `🐸 Frosch-Hüpfen`,
      `<p>Die grünen Frösche wollen nach rechts, die braunen nach links – sie sollen die Seiten
       tauschen. Ein Frosch hüpft nur <b>vorwärts</b>: auf das freie Seerosenblatt daneben oder
       <b>über genau einen Frosch</b> hinweg. Profi-Zahl: <b>${frogMin(S.n)} Hüpfer</b>.</p>`,
    );
  }
  return {
    id: "frosch",
    icon: "🐸",
    title: "Frosch-Hüpfen",
    region: "logik",
    levels: FROG_LEVELS.map((l) => ({ id: l.id, label: `${l.n}+${l.n}` })),
    card: `<h2>🤖 So denkt ein Computer</h2>
      <p>Schau dir das <b>Muster</b> an: Erst hüpft 1 Frosch, dann 2 der anderen Farbe, dann 3 …
      und am Ende wieder weniger. Jeder Frosch muss jeden Frosch der anderen Farbe einmal
      überspringen (n · n Sprünge) und jeder rückt dazu n + 1 Felder vor – zusammen
      <b>n² + 2n</b> Hüpfer. Muster zu erkennen hilft Computern, Rechenarbeit zu sparen.</p>`,
    start,
    tick(dt) {
      const j = S.jump;
      if (!j) return;
      j.t += (dt * kit.speed()) / 0.35;
      if (j.t >= 1) {
        S.history.push(S.s);
        S.s = frogMove(S.s, j.from)!;
        S.jump = null;
        kit.sound.drop();
        count();
        if (frogGoal(S.s)) {
          S.done = true;
          kit.sound.tada();
          const moves = S.history.length;
          kit.finish({
            chapter: "frosch",
            level: FROG_LEVELS[S.li]!.id,
            stars: starsOf(moves, frogMin(S.n)),
            text: `Seiten getauscht mit ${moves} Hüpfern – die Profi-Zahl ist ${frogMin(S.n)}.`,
            next: FROG_LEVELS[S.li + 1] ? () => start(S.li + 1) : null,
            again: () => start(S.li),
          });
        } else if (frogStuck(S.s))
          kit.toast("Quak! Huch, festgehüpft – nimm mit ↩ Zurück ein paar Hüpfer zurück.", 5);
      }
    },
    draw(g, vw, vh) {
      const n = S.s.length;
      const gap = Math.min(40, Math.floor((vw - 20) / n));
      L = {
        padX: S.s.map((_, i) => Math.round(vw / 2 + (i - (n - 1) / 2) * gap)),
        y: Math.round(vh * 0.62),
      };
      const t = kit.clock();
      g.fillStyle = "#4a90d9";
      g.fillRect(0, 0, vw, vh);
      for (let i = 0; i < 50; i++) {
        const a = (Math.sin(t * (Math.PI / 2) + i) + 1) / 2;
        g.fillStyle = a > 0.5 ? "#6aaee8" : "#5aa0e6";
        g.fillRect((i * 53) % vw, (i * 31) % vh, 5, 1);
      }
      // Schilf am Rand
      for (let x = 4; x < vw; x += 23) {
        g.fillStyle = "#3f8a3a";
        g.fillRect(x, vh - 22, 1, 22);
        g.fillRect(x + 3, vh - 16, 1, 16);
        g.fillStyle = "#7a4f2a";
        g.fillRect(x, vh - 26, 1, 5);
      }
      L.padX.forEach((x) => {
        ellipse(g, x, L.y, Math.round(gap * 0.42), 5, "#3e8e3e");
        ellipse(g, x - 1, L.y - 1, Math.round(gap * 0.36), 3, "#5aae4f");
        g.fillStyle = "#4a90d9";
        g.fillRect(x, L.y - 4, 4, 3);
      });
      const drawFrog = (kind: Pad, x: number, y: number, i: number) => {
        const sp = SPRITES.frosch!;
        const glow = i === S.tip && t < S.tipUntil;
        if (glow) {
          g.globalAlpha = 0.35 + 0.25 * Math.sin(t * Math.PI * 2);
          ellipse(g, x, y - 4, 9, 7, "#fff6a8");
          g.globalAlpha = 1;
        }
        const shake = i === S.wiggle.i && t < S.wiggle.until ? Math.sin(t * 40) : 0;
        const k = gap >= 30 ? 2 : 1;
        drawSprite(
          g,
          sp,
          Math.round(x - 5 * k + shake),
          Math.round(y - 9 * k),
          kind === "B",
          kind === "B" ? BROWN : {},
          k,
        );
      };
      S.s.forEach((f, i) => {
        if (f === "." || (S.jump && S.jump.from === i)) return;
        drawFrog(f, L.padX[i]!, L.y, i);
      });
      const j = S.jump;
      if (j) {
        const a = L.padX[j.from]!;
        const b = L.padX[j.to]!;
        const x = a + (b - a) * j.t;
        const y = L.y - Math.sin(Math.PI * j.t) * (Math.abs(j.to - j.from) > 1 ? 20 : 10);
        drawFrog(S.s[j.from]!, x, y, -2);
      }
    },
    down(p) {
      if (S.done || S.jump) return;
      let best = -1;
      let bd = Infinity;
      L.padX.forEach((x, i) => {
        const d = Math.abs(p.x - x);
        if (d < bd && Math.abs(p.y - (L.y - 4)) < 16) {
          bd = d;
          best = i;
        }
      });
      if (best >= 0 && S.s[best] !== ".") hop(best);
    },
    key(e) {
      if (e.key === "z" || e.key === "Z") undo();
      else return false;
      return true;
    },
    debug: () => ({
      level: FROG_LEVELS[S.li]!.id,
      pads: S.s.join(""),
      moves: S.history.length,
      busy: !!S.jump,
      done: S.done,
    }),
    point(what): Pt | null {
      const x = L.padX[Number(what)];
      return x === undefined ? null : { x, y: L.y - 4 };
    },
  };
}
