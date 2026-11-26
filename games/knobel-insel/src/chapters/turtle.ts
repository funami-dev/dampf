/** Kapitel 14 · Schildkröten-Programm (Spec K14, KI-AK-15) */
import { SPRITES, drawSprite } from "../art/sprites.ts";
import { rhombus } from "../art/scenes.ts";
import {
  CARD_LABEL,
  TURTLE_LEVELS,
  run,
  type Card,
  type Step,
  type TurtleLevel,
} from "../logic/turtle.ts";
import { starsOf, type Chapter, type Kit, type Pt } from "./kit.ts";

export function turtleChapter(kit: Kit): Chapter {
  const S = {
    level: TURTLE_LEVELS[0]! as TurtleLevel,
    prog: [] as Card[],
    steps: [] as Step[],
    t: -1,
    end: "unterwegs" as ReturnType<typeof run>["end"],
    done: false,
  };
  let G = { tw: 24, ox: 160, oy: 80 };
  const scr = (x: number, y: number): Pt => ({
    x: G.ox + ((x - y) * G.tw) / 2,
    y: G.oy + ((x + y) * G.tw) / 4,
  });
  function showProg() {
    const cur = S.t >= 0 ? S.steps[Math.min(S.steps.length - 1, Math.floor(S.t))]?.card : -1;
    kit.info(
      `🐢 Programm: ${
        S.prog.length
          ? S.prog
              .map((c, i) => `<span class="${i === cur ? "now" : ""}">${CARD_LABEL[c]}</span>`)
              .join(" ")
          : "<small>(noch leer – tippe Befehlskarten an)</small>"
      }`,
    );
  }
  function ui() {
    const i = TURTLE_LEVELS.indexOf(S.level) + 1;
    kit.setTop(
      `🐢 Level ${i} · Schildkröten-Programm`,
      [
        { id: "F", label: "⬆ Vorwärts" },
        { id: "R", label: "↻ Rechts" },
        { id: "L", label: "↺ Links" },
        { id: "R2", label: "🔁 2×" },
        { id: "R3", label: "🔁 3×" },
        { id: "R4", label: "🔁 4×" },
        { id: "END", label: "⏹ Ende" },
        { id: "weg", label: "⌫" },
        { id: "start", label: "▶ Start", primary: true },
        { id: "neu", label: "↺ Neu" },
        { id: "map", label: "🏝️ Insel" },
      ],
      (id) => {
        if (id === "start") go();
        else if (id === "weg") {
          S.prog.pop();
          stop();
        } else if (id === "neu") {
          S.prog = [];
          stop();
        } else if (id === "map") kit.map();
        else if (S.prog.length < 16) {
          S.prog.push(id as Card);
          stop();
        }
        count();
        showProg();
      },
    );
    count();
    showProg();
  }
  const count = () => kit.setCount(`Karten: ${S.prog.length} · Profi-Zahl: ${S.level.min}`);
  function stop() {
    S.t = -1;
    S.steps = [];
  }
  function go() {
    if (S.done || !S.prog.length) return;
    const r = run(S.level, S.prog);
    S.steps = r.steps;
    S.end = r.end;
    S.t = 0;
  }
  function start(i: number) {
    S.level = TURTLE_LEVELS[i]!;
    S.prog = [];
    S.done = false;
    stop();
    kit.intro(
      `🐢 Schildkröten-Programm`,
      `<p>Die Schildkröte hat Hunger auf das Salatblatt! Bau ihr ein <b>Programm</b> aus
       Befehlskarten: ⬆ vorwärts, ↻ rechts drehen, ↺ links drehen. Mit <b>🔁 2×/3×/4×</b> wird alles
       bis <b>⏹ Ende</b> wiederholt (ohne Ende: bis zum Schluss). Pass auf die Teiche auf!</p>
       <p><small>Profi-Zahl: <b>${S.level.min} Karten</b>.</small></p>`,
    );
    ui();
  }
  return {
    id: "programm",
    icon: "🐢",
    title: "Schildkröten-Programm",
    region: "codes",
    levels: TURTLE_LEVELS.map((l, i) => ({ id: l.id, label: ["Geradeaus", "Ecke", "Treppe"][i]! })),
    card: `<h2>🤖 So denkt ein Computer</h2>
      <p>Ein <b>Programm</b> ist eine Folge von Befehlen, die der Computer genau der Reihe nach
      ausführt – Schritt für Schritt, ohne nachzudenken.</p>
      <p>Mit einer <b>Schleife</b> (🔁) sagst du „mach das mehrmals“ und sparst viele Karten. Echte
      Programme bestehen aus genau solchen Befehlen, Schleifen und Entscheidungen.</p>`,
    start,
    tick(dt) {
      if (S.t < 0) return;
      const before = Math.floor(S.t);
      S.t += dt * 3 * kit.speed();
      if (Math.floor(S.t) !== before) {
        kit.sound.click();
        showProg();
      }
      if (S.t >= S.steps.length) {
        const end = S.end;
        S.t = -1;
        showProg();
        if (end === "ziel") {
          S.done = true;
          kit.sound.tada();
          const i = TURTLE_LEVELS.indexOf(S.level);
          kit.finish({
            chapter: "programm",
            level: S.level.id,
            stars: starsOf(S.prog.length, S.level.min),
            text: `Mampf! Programm mit ${S.prog.length} Karten – die Profi-Zahl ist ${S.level.min}.`,
            next: TURTLE_LEVELS[i + 1] ? () => start(i + 1) : null,
            again: () => start(i),
          });
        } else {
          kit.sound.ouch();
          kit.toast(
            end === "teich"
              ? "Platsch! Die Schildkröte ist im Teich gelandet. Ändere das Programm."
              : end === "rand"
                ? "Da ist der Gartenzaun – weiter geht's nicht."
                : "Das Programm ist zu Ende, aber der Salat ist noch nicht erreicht.",
            4,
          );
        }
      }
    },
    draw(g, vw, vh) {
      const l = S.level;
      const n = Math.max(l.w, l.h);
      // unten im Bild, damit Knopfleiste und Programm oben Platz haben
      const tw = Math.max(
        12,
        Math.min(
          40,
          Math.floor((vw * 0.8) / n / 2) * 2,
          Math.floor((vh * 0.42 * 4) / (l.w + l.h) / 2) * 2,
        ),
      );
      G = {
        tw,
        ox: Math.round(vw / 2 - ((l.w - l.h) * tw) / 4),
        oy: Math.round(vh - 16 - ((l.w + l.h - 2) * tw) / 4),
      };
      g.fillStyle = "#8fd46c";
      g.fillRect(0, 0, vw, vh);
      for (let s = 0; s < l.w + l.h; s++)
        for (let x = 0; x < l.w; x++) {
          const y = s - x;
          if (y < 0 || y >= l.h) continue;
          const p = scr(x, y);
          const pond = l.ponds.some(([a, b]) => a === x && b === y);
          rhombus(g, p.x, p.y, tw, pond ? "#4a90d9" : (x + y) % 2 ? "#a86f3c" : "#b97c45");
          if (!pond) rhombus(g, p.x, p.y - 1, tw - 4, (x + y) % 2 ? "#7cc45e" : "#86cc66");
          if (x === l.goal[0] && y === l.goal[1]) {
            g.fillStyle = "#3e8e3e";
            g.fillRect(Math.round(p.x - 4), Math.round(p.y - 6), 8, 5);
            g.fillStyle = "#6fcf5a";
            g.fillRect(Math.round(p.x - 3), Math.round(p.y - 7), 6, 3);
          }
        }
      // Schildkröte
      let pos = { x: l.start[0], y: l.start[1], dir: l.dir };
      if (S.t >= 0 && S.steps.length) {
        const k = Math.min(S.steps.length - 1, Math.floor(S.t));
        const a = k > 0 ? S.steps[k - 1]! : { x: l.start[0], y: l.start[1], dir: l.dir };
        const b = S.steps[k]!;
        const f = S.t - k;
        pos = { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, dir: b.dir };
      } else if (S.done && S.steps.length) pos = S.steps.at(-1)!;
      const p = scr(pos.x, pos.y);
      drawSprite(
        g,
        SPRITES.kroete!,
        Math.round(p.x - 6),
        Math.round(p.y - 8),
        pos.dir === 2 || pos.dir === 3,
      );
    },
    down() {},
    debug: () => ({
      level: S.level.id,
      prog: [...S.prog],
      running: S.t >= 0,
      end: S.end,
      min: S.level.min,
      done: S.done,
    }),
  };
}
