/** Kapitel 6 · Brücke bei Nacht (Spec K6, KI-AK-13) */
import { SPRITES, drawSprite, seeded, spriteSize } from "../art/sprites.ts";
import { ellipse } from "../art/scenes.ts";
import {
  BRIDGE_LEVELS,
  bBest,
  bCheck,
  bCost,
  bGoal,
  bMove,
  bStart,
  type BState,
  type BridgeLevel,
} from "../logic/bridge.ts";
import { starsOf, type Chapter, type Kit, type Pt } from "./kit.ts";

export function bridgeChapter(kit: Kit): Chapter {
  const S = {
    level: BRIDGE_LEVELS[0]! as BridgeLevel,
    st: bStart(BRIDGE_LEVELS[0]!) as BState,
    sel: [] as string[],
    history: [] as { st: BState; t: number }[],
    minutes: 0,
    min: 0,
    walk: null as null | {
      ids: string[];
      from: 0 | 1;
      t: number;
      dur: number;
      cost: number;
      back: boolean;
    },
    pos: {} as Record<string, Pt>,
    tip: [] as string[],
    tipUntil: 0,
    done: false,
    /** alle Tiere stehen an ihrem Platz (für Tests) */
    settled: true,
  };
  let L = lay(320, 200);
  function lay(vw: number, vh: number) {
    const ground = Math.round(vh * 0.66);
    const gapL = Math.round(vw * 0.34);
    const gapR = Math.round(vw * 0.66);
    return { vw, vh, ground, gapL, gapR };
  }
  const name = (id: string) => S.level.walkers.find((w) => w.id === id)!.name;
  function ui() {
    const i = BRIDGE_LEVELS.indexOf(S.level) + 1;
    kit.setTop(
      `🔦 Level ${i} · Brücke bei Nacht`,
      [
        { id: "los", label: "🔦 Los!", primary: true },
        { id: "zurueck", label: "↩ Zurück" },
        { id: "tipp", label: "💡 Tipp" },
        { id: "neu", label: "↺ Neu" },
        { id: "map", label: "🏝️ Insel" },
      ],
      (id) => {
        if (id === "los") go();
        else if (id === "zurueck") undo();
        else if (id === "tipp") tip();
        else if (id === "neu") reset();
        else kit.map();
      },
    );
    count();
  }
  const count = () => kit.setCount(`Minuten: ${Math.round(S.minutes)} · Profi-Zahl: ${S.min}`);
  function reset() {
    S.st = bStart(S.level);
    S.sel = [];
    S.history = [];
    S.minutes = 0;
    S.min = bBest(S.level).min;
    S.walk = null;
    S.pos = {};
    S.done = false;
    S.tip = [];
    ui();
  }
  function go() {
    if (S.walk || S.done) return;
    const why = bCheck(S.level, S.st, S.sel);
    if (why) {
      kit.toast(why, 3);
      return;
    }
    const cost = bCost(S.level, S.sel);
    S.walk = { ids: [...S.sel], from: S.st.lamp, t: 0, dur: 0.9 + cost * 0.12, cost, back: false };
    kit.sound.click();
  }
  function undo() {
    if (S.walk || S.done || !S.history.length) return;
    const h = S.history.pop()!;
    const ids = S.level.walkers.filter((w) => h.st.side[w.id] !== S.st.side[w.id]).map((w) => w.id);
    S.walk = { ids, from: S.st.lamp, t: 0, dur: 0.8, cost: -(S.minutes - h.t), back: true };
    S.sel = [];
  }
  function tip() {
    if (S.walk || S.done) return;
    const f = bBest(S.level, S.st).first;
    if (!f) return;
    S.tip = f;
    S.tipUntil = kit.clock() + 5;
    kit.toast(
      `💡 Tipp: ${f.map(name).join(" und ")} ${f.length > 1 ? "gehen" : "geht"} als Nächstes.`,
      5,
    );
  }
  function start(i: number) {
    S.level = BRIDGE_LEVELS[i]!;
    reset();
    kit.intro(
      `🔦 Brücke bei Nacht`,
      `<p>Es ist dunkel, die Tiere wollen über die wackelige Hängebrücke. Höchstens <b>zwei</b>
       gleichzeitig, und nur <b>mit der Laterne</b>. Zu zweit gehen sie so langsam wie der
       Langsamere.</p>
       <p>${S.level.walkers.map((w) => `${w.name}: ${w.min} Min.`).join(" · ")}</p>
       <p>Schafft ihr es in <b>${S.min} Minuten</b>?</p>`,
    );
  }
  /** Stellplatz am Ufer */
  function slot(id: string, side: 0 | 1): Pt {
    const i = S.level.walkers.findIndex((w) => w.id === id);
    const n = S.level.walkers.length;
    const span = L.gapL - 16;
    const x = side === 0 ? 8 + ((i + 0.5) * span) / n : L.gapR + 8 + ((n - i - 0.5) * span) / n;
    return { x, y: L.ground };
  }
  const head = (side: 0 | 1, k: number): Pt => ({
    x: side === 0 ? L.gapL - 10 - k * 12 : L.gapR + 10 + k * 12,
    y: L.ground,
  });
  function bridgeY(x: number) {
    const u = (x - L.gapL) / (L.gapR - L.gapL);
    return L.ground + Math.sin(Math.PI * Math.max(0, Math.min(1, u))) * 8;
  }
  return {
    id: "bruecke",
    icon: "🔦",
    title: "Brücke bei Nacht",
    region: "logik",
    levels: BRIDGE_LEVELS.map((l) => ({ id: l.id, label: `${l.walkers.length} Tiere` })),
    card: `<h2>🤖 So denkt ein Computer</h2>
      <p>Der <b>naheliegende Plan</b> – der Schnellste bringt jeden einzeln hinüber und läuft
      zurück – braucht bei Hase, Igel, Schildkröte und Schnecke <b>19 Minuten</b>. Der Trick:
      Die beiden <b>Langsamsten gehen zusammen</b>, dann wartet niemand doppelt – <b>17 Minuten</b>.</p>
      <p>Computer probieren geschickt alle Möglichkeiten und nehmen immer zuerst die, die bisher am
      schnellsten ging (Dijkstra). So finden sie den kürzesten Weg, auch wenn er überraschend ist.</p>`,
    start,
    tick(dt) {
      const w = S.walk;
      if (w) {
        w.t += (dt * kit.speed()) / w.dur;
        if (w.t >= 1) {
          S.walk = null;
          if (w.back) {
            S.st = bMove(S.level, S.st, w.ids) ?? S.st;
            // Zurück: Zustand und Zeit wie vorher
            S.minutes = Math.max(0, S.minutes + w.cost);
            count();
          } else {
            S.history.push({ st: S.st, t: S.minutes });
            S.st = bMove(S.level, S.st, w.ids)!;
            S.minutes += w.cost;
            S.sel = [];
            kit.sound.drop();
            count();
            if (bGoal(S.level, S.st)) {
              S.done = true;
              kit.sound.tada();
              const i = BRIDGE_LEVELS.indexOf(S.level);
              kit.finish({
                chapter: "bruecke",
                level: S.level.id,
                stars: starsOf(S.minutes, S.min),
                text: `Alle drüben nach ${S.minutes} Minuten – die Profi-Zahl ist ${S.min}.`,
                next: BRIDGE_LEVELS[i + 1] ? () => start(i + 1) : null,
                again: () => start(i),
              });
            }
          }
        }
      }
      // Figuren gehen zu ihrem Platz
      let settled = !S.walk;
      for (const wk of S.level.walkers) {
        let target: Pt;
        const ww = S.walk;
        if (ww && ww.ids.includes(wk.id)) {
          const k = ww.ids.indexOf(wk.id);
          const a = head(ww.from, k);
          const b = head((1 - ww.from) as 0 | 1, k);
          const x = a.x + (b.x - a.x) * Math.min(1, ww.t);
          target = { x, y: bridgeY(x) };
          S.pos[wk.id] = target;
          continue;
        } else if (S.sel.includes(wk.id)) target = head(S.st.lamp, S.sel.indexOf(wk.id));
        else target = slot(wk.id, S.st.side[wk.id]!);
        const p = (S.pos[wk.id] ??= { ...target });
        const dx = target.x - p.x;
        const dy = target.y - p.y;
        const d = Math.hypot(dx, dy);
        const step = 60 * dt * kit.speed();
        if (d > 0.5) settled = false;
        if (d <= step) Object.assign(p, target);
        else {
          p.x += (dx / d) * step;
          p.y += (dy / d) * step;
        }
      }
      S.settled = settled;
    },
    draw(g, vw, vh) {
      L = lay(vw, vh);
      const t = kit.clock();
      // Nachthimmel in Streifen, Sterne, Mond
      const sky = ["#141a33", "#18203d", "#1d2648", "#232d54"];
      sky.forEach((c, i) => {
        g.fillStyle = c;
        g.fillRect(0, Math.round((i * L.ground) / 4), vw, Math.ceil(L.ground / 4) + 1);
      });
      const r = seeded(5);
      for (let i = 0; i < 60; i++) {
        const a = (Math.sin(t * 0.6 + i) + 1) / 2;
        g.fillStyle = a > 0.4 ? "#ffffff" : "#9aa6d6";
        g.fillRect(Math.round(r() * vw), Math.round(r() * L.ground * 0.8), 1, 1);
      }
      ellipse(g, vw * 0.8, 30, 10, 10, "#f2ecc8");
      ellipse(g, vw * 0.8 + 4, 27, 9, 9, "#1d2648");
      // Schlucht und Felsen
      g.fillStyle = "#0c0f1c";
      g.fillRect(L.gapL, L.ground, L.gapR - L.gapL, vh - L.ground);
      for (const [x0, x1] of [
        [0, L.gapL],
        [L.gapR, vw],
      ] as const) {
        g.fillStyle = "#2e4a2a";
        g.fillRect(x0, L.ground, x1 - x0, 4);
        g.fillStyle = "#3f3a4a";
        g.fillRect(x0, L.ground + 4, x1 - x0, vh - L.ground - 4);
        for (let y = L.ground + 10; y < vh; y += 8) {
          g.fillStyle = "#35303f";
          g.fillRect(x0, y, x1 - x0, 1);
        }
      }
      // Hängebrücke: Seile und Bretter
      for (let x = L.gapL; x <= L.gapR; x += 1) {
        const y = bridgeY(x);
        g.fillStyle = "#8a6a4a";
        g.fillRect(x, Math.round(y), 1, 2);
        if ((x - L.gapL) % 5 === 0) {
          g.fillStyle = "#6b4f37";
          g.fillRect(x, Math.round(y), 3, 3);
        }
        g.fillStyle = "#c9a77c";
        g.fillRect(x, Math.round(y - 12), 1, 1);
        if ((x - L.gapL) % 10 === 0) g.fillRect(x, Math.round(y - 12), 1, 12);
      }
      for (const x of [L.gapL - 2, L.gapR]) {
        g.fillStyle = "#6b4f37";
        g.fillRect(x, L.ground - 16, 3, 16);
      }
      // Glühwürmchen (ruhig)
      for (let i = 0; i < 10; i++) {
        const x = (i * 71 + Math.sin(t / 3 + i) * 12) % vw;
        const y = L.ground - 30 - ((i * 13) % 40) + Math.sin(t / 2 + i) * 6;
        g.globalAlpha = 0.5 + 0.4 * Math.sin(t / 1.5 + i * 2);
        g.fillStyle = "#f6f28a";
        g.fillRect(Math.round(x), Math.round(y), 1, 1);
        g.globalAlpha = 1;
      }
      // Laterne: geht mit, sonst am Ufer
      const w = S.walk;
      let lamp: Pt;
      if (w) {
        const p = S.pos[w.ids[0]!];
        lamp = p ? { x: p.x + 6, y: p.y - 14 } : head(S.st.lamp, 0);
      } else {
        const h = head(S.st.lamp, -1);
        lamp = { x: h.x, y: h.y - 2 };
      }
      g.globalAlpha = 0.16;
      ellipse(g, lamp.x, lamp.y - 3, 34, 24, "#ffd27a");
      g.globalAlpha = 0.22;
      ellipse(g, lamp.x, lamp.y - 3, 18, 12, "#ffe7a8");
      g.globalAlpha = 1;
      drawSprite(g, SPRITES.laterne!, Math.round(lamp.x - 2), Math.round(lamp.y - 7));
      // Tiere
      const list = [...S.level.walkers].sort(
        (a, b) => (S.pos[a.id]?.y ?? 0) - (S.pos[b.id]?.y ?? 0),
      );
      for (const wk of list) {
        const p = S.pos[wk.id];
        if (!p) continue;
        const sp = SPRITES[wk.kind]!;
        const { w: sw, h: sh } = spriteSize(sp);
        if (S.tip.includes(wk.id) && t < S.tipUntil) {
          g.globalAlpha = 0.35 + 0.25 * Math.sin(t * Math.PI * 2);
          g.fillStyle = "#fff6a8";
          g.fillRect(Math.round(p.x - sw / 2 - 2), Math.round(p.y - sh - 2), sw + 4, sh + 4);
          g.globalAlpha = 1;
        }
        const facing = S.st.side[wk.id] === 0;
        drawSprite(g, sp, Math.round(p.x - sw / 2), Math.round(p.y - sh), !facing);
        if (S.sel.includes(wk.id)) {
          g.fillStyle = "#ffd27a";
          g.fillRect(Math.round(p.x - 1), Math.round(p.y - sh - 4), 3, 2);
        }
      }
    },
    down(p) {
      if (S.walk || S.done) return;
      // das nächstgelegene getroffene Tier
      let hit: string | null = null;
      let best = Infinity;
      for (const wk of S.level.walkers) {
        const q = S.pos[wk.id];
        if (!q) continue;
        const { w, h } = spriteSize(SPRITES[wk.kind]!);
        const cy = q.y - h / 2;
        if (Math.abs(p.x - q.x) <= w / 2 + 3 && Math.abs(p.y - cy) <= h / 2 + 4) {
          const d = Math.hypot(p.x - q.x, p.y - cy);
          if (d < best) {
            best = d;
            hit = wk.id;
          }
        }
      }
      if (!hit) return;
      if (S.sel.includes(hit)) S.sel = S.sel.filter((x) => x !== hit);
      else if (S.st.side[hit] !== S.st.lamp) kit.toast("Die Laterne ist auf der anderen Seite.", 3);
      else if (S.sel.length >= 2) kit.toast("Die Brücke trägt höchstens zwei!", 3);
      else S.sel.push(hit);
      kit.sound.click();
    },
    key(e) {
      if (e.key === "Enter") go();
      else if (e.key === "z" || e.key === "Z") undo();
      else if (e.key === "h" || e.key === "H") tip();
      else return false;
      return true;
    },
    debug: () => ({
      level: S.level.id,
      side: { ...S.st.side },
      lamp: S.st.lamp,
      sel: [...S.sel],
      minutes: S.minutes,
      min: S.min,
      busy: !!S.walk,
      settled: S.settled,
      done: S.done,
    }),
    point(what) {
      const p = S.pos[what];
      if (!p) return null;
      const { h } = spriteSize(SPRITES[S.level.walkers.find((w) => w.id === what)!.kind]!);
      return { x: p.x, y: p.y - h / 2 };
    },
  };
}
