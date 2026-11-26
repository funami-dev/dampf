/** Kapitel 17 · Murmelbahn-Netz (Spec K17, KI-AK-16) */
import { drawNumber, ellipse } from "../art/scenes.ts";
import { MST_LEVELS, connected, cost, kruskal, type MstLevel } from "../logic/mst.ts";
import { starsOf, type Chapter, type Kit, type Pt } from "./kit.ts";

export function mstChapter(kit: Kit): Chapter {
  const S = {
    level: MST_LEVELS[0]! as MstLevel,
    built: [] as number[],
    min: 0,
    show: null as null | { steps: ReturnType<typeof kruskal>["steps"]; t: number },
    done: false,
  };
  let box = { x: 20, y: 80, w: 280, h: 100 };
  const P = (i: number): Pt => {
    const v = S.level.villages[i]!;
    return { x: box.x + (v.x / 100) * box.w, y: box.y + (v.y / 100) * box.h };
  };
  const builtEdges = () => S.built.map((i) => S.level.edges[i]!);
  function ui() {
    const i = MST_LEVELS.indexOf(S.level) + 1;
    kit.setTop(
      `🚇 Level ${i} · ${S.level.villages.length} Dörfer`,
      [
        { id: "fertig", label: "✨ Fertig", primary: true },
        { id: "zeig", label: "▶ Zeig's mir" },
        { id: "neu", label: "↺ Neu" },
        { id: "map", label: "🏝️ Insel" },
      ],
      (id) => {
        if (id === "fertig") check();
        else if (id === "zeig") {
          S.built = [];
          S.show = { steps: kruskal(S.level).steps, t: 0 };
          kit.toast(
            "Der Computer nimmt immer das billigste Stück – außer es schließt einen Kreis.",
            5,
          );
          count();
        } else if (id === "neu") reset();
        else kit.map();
      },
    );
    count();
  }
  const count = () => kit.setCount(`Holz: ${cost(builtEdges())} · Profi-Zahl: ${S.min}`);
  function reset() {
    S.built = [];
    S.min = kruskal(S.level).total;
    S.show = null;
    S.done = false;
    ui();
  }
  function check() {
    if (S.done || S.show) return;
    if (!connected(S.level.villages.length, builtEdges())) {
      kit.toast("Noch nicht alle Dörfer hängen an der Bahn!", 3);
      return;
    }
    S.done = true;
    kit.sound.tada();
    const c = cost(builtEdges());
    const i = MST_LEVELS.indexOf(S.level);
    kit.finish({
      chapter: "murmelbahn",
      level: S.level.id,
      stars: starsOf(c, S.min),
      text: `Alle Dörfer verbunden mit ${c} Holz – die Profi-Zahl ist ${S.min}.`,
      next: MST_LEVELS[i + 1] ? () => start(i + 1) : null,
      again: () => start(i),
    });
  }
  function start(i: number) {
    S.level = MST_LEVELS[i]!;
    reset();
    kit.intro(
      `🚇 Murmelbahn-Netz`,
      `<p>Die Dörfer auf den Hügeln wollen eine Murmelbahn! Jedes Bahnstück kostet so viel Holz, wie
       die Zahl daran zeigt. Verbinde <b>alle Dörfer</b> mit <b>möglichst wenig Holz</b> – tippe die
       Stücke an, dann „✨ Fertig“. Profi-Zahl: <b>${S.min} Holz</b>.</p>`,
    );
  }
  const mid = (k: number): Pt => {
    const [a, b] = S.level.edges[k]!;
    const p = P(a);
    const q = P(b);
    return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
  };
  return {
    id: "murmelbahn",
    icon: "🚇",
    title: "Murmelbahn-Netz",
    region: "wege",
    levels: MST_LEVELS.map((l) => ({ id: l.id, label: `${l.villages.length} Dörfer` })),
    card: `<h2>🤖 So denkt ein Computer</h2>
      <p><b>Gierig sein ist hier genau richtig:</b> Nimm immer das billigste Stück, das noch übrig
      ist – außer es schließt einen <b>Kreis</b> (dann wäre es überflüssig). Das nennt man den
      <b>Kruskal-Algorithmus</b>, er findet sicher das günstigste Netz (einen minimalen
      Spannbaum).</p>
      <p>So planen Ingenieure Strom-, Wasser- und Internetleitungen.</p>`,
    start,
    tick(dt) {
      const s = S.show;
      if (!s) return;
      const before = Math.floor(s.t);
      s.t += dt * 1.6 * kit.speed();
      const now = Math.floor(s.t);
      if (now !== before && before < s.steps.length) {
        const st = s.steps[before]!;
        if (st.take) {
          S.built.push(st.edge);
          kit.sound.click();
        }
        count();
      }
      if (s.t >= s.steps.length + 1.5) {
        S.show = null;
        kit.toast(`So geht's: ${S.min} Holz. Jetzt du – ↺ Neu!`, 4);
      }
    },
    draw(g, vw, vh) {
      box = {
        x: Math.round(vw * 0.1),
        y: Math.round(vh * 0.3),
        w: Math.round(vw * 0.8),
        h: Math.round(vh * 0.6),
      };
      g.fillStyle = "#9fd3f0";
      g.fillRect(0, 0, vw, vh);
      g.fillStyle = "#7cc45e";
      g.fillRect(0, Math.round(vh * 0.25), vw, vh);
      S.level.villages.forEach((_, i) => {
        const p = P(i);
        ellipse(g, p.x, p.y + 4, 16, 8, "#6fb55a");
      });
      const cur = S.show && S.show.steps[Math.floor(S.show.t)];
      // mögliche Stücke
      S.level.edges.forEach(([a, b, w], k) => {
        const p = P(a);
        const q = P(b);
        const on = S.built.includes(k);
        const looking = cur && cur.edge === k;
        for (let s = 0.1; s <= 0.9; s += 0.025) {
          const x = p.x + (q.x - p.x) * s;
          const y = p.y + (q.y - p.y) * s;
          if (on) {
            g.fillStyle = "#8b5a2b";
            g.fillRect(Math.round(x - 1), Math.round(y - 1), 3, 3);
            g.fillStyle = "#c88a52";
            g.fillRect(Math.round(x - 1), Math.round(y - 1), 3, 1);
          } else if (Math.floor(s * 40) % 2 === 0) {
            g.fillStyle = looking ? (cur!.take ? "#2ecc71" : "#e74c3c") : "rgba(43,34,51,0.35)";
            g.fillRect(Math.round(x), Math.round(y), looking ? 2 : 1, looking ? 2 : 1);
          }
        }
        const m = mid(k);
        ellipse(g, m.x, m.y, 5, 4, on ? "#f6d55c" : "#fff8ee");
        drawNumber(g, w, m.x, m.y, "#2b2233");
      });
      // Dörfer
      S.level.villages.forEach((_, i) => {
        const p = P(i);
        g.fillStyle = "#c88a52";
        g.fillRect(Math.round(p.x - 5), Math.round(p.y - 4), 10, 7);
        g.fillStyle = "#c0504d";
        for (let r = 0; r < 5; r++)
          g.fillRect(Math.round(p.x - 6 + r), Math.round(p.y - 5 - r), 12 - 2 * r, 1);
        g.fillStyle = "#5a3a22";
        g.fillRect(Math.round(p.x - 1), Math.round(p.y), 2, 3);
      });
    },
    down(p) {
      if (S.done || S.show) return;
      let best = -1;
      let bd = Infinity;
      S.level.edges.forEach((_, k) => {
        const m = mid(k);
        const d = Math.hypot(p.x - m.x, p.y - m.y);
        if (d < 10 && d < bd) {
          bd = d;
          best = k;
        }
      });
      if (best < 0) return;
      S.built = S.built.includes(best) ? S.built.filter((x) => x !== best) : [...S.built, best];
      kit.sound.click();
      count();
    },
    debug: () => ({
      level: S.level.id,
      built: [...S.built],
      cost: cost(builtEdges()),
      min: S.min,
      showing: !!S.show,
      done: S.done,
      mst: kruskal(S.level).picked,
    }),
    point(what) {
      return mid(Number(what));
    },
  };
}
