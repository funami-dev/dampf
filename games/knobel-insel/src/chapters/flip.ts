/** Kapitel 5 · Pfannkuchen wenden (Spec K5, KI-AK-12) */
import { SPRITES } from "../art/sprites.ts";
import { discWidth, drawBear, drawKitchen, drawPancake, kitchenLayout } from "../art/scenes.ts";
import { FLIP_LEVELS, flip, hintFlip, minFlips, sorted, type FlipLevel } from "../logic/flip.ts";
import { pickNearest, starsOf, type Chapter, type Kit, type Pt } from "./kit.ts";

export function flipChapter(kit: Kit): Chapter {
  const S = {
    level: FLIP_LEVELS[0]! as FlipLevel,
    stack: [] as number[],
    flips: 0,
    min: 0,
    anim: null as null | { at: number; t: number },
    tip: -1,
    tipUntil: 0,
    done: false,
    doneAt: 0,
  };
  let K = kitchenLayout(320, 200, 4);
  const yOf = (i: number) => K.tableY - (i + 1) * K.discH;
  function ui() {
    const i = FLIP_LEVELS.indexOf(S.level) + 1;
    kit.setTop(
      `🥞 Level ${i} · ${S.stack.length} Pfannkuchen wenden`,
      [
        { id: "tipp", label: "💡 Tipp" },
        { id: "neu", label: "↺ Neu" },
        { id: "map", label: "🏝️ Insel" },
      ],
      (id) => {
        if (id === "tipp") {
          const h = hintFlip(S.stack);
          if (h === null) return;
          S.tip = h;
          S.tipUntil = kit.clock() + 4;
          kit.toast(
            "Hol den größten, der noch falsch liegt, nach oben – dann wende ihn an seinen Platz.",
            5,
          );
        } else if (id === "neu") reset();
        else kit.map();
      },
    );
    count();
  }
  const count = () => kit.setCount(`Wendungen: ${S.flips} · Profi-Zahl: ${S.min}`);
  function reset() {
    S.stack = [...S.level.start];
    S.flips = 0;
    S.min = minFlips(S.level.start);
    S.anim = null;
    S.done = false;
    S.tip = -1;
    ui();
  }
  function doFlip(i: number) {
    if (S.anim || S.done || i < 0 || i >= S.stack.length - 1) return;
    S.anim = { at: i, t: 0 };
    kit.sound.pick();
  }
  function start(i: number) {
    S.level = FLIP_LEVELS[i]!;
    reset();
    kit.intro(
      `🥞 Pfannkuchen wenden`,
      `<p>Der Koch-Bär hat seinen Stapel durcheinandergebracht. Sortiere ihn: <b>groß unten, klein
       oben</b>. Du darfst nur eins: den Pfannenwender unter einen Pfannkuchen schieben (antippen) –
       dann wird <b>alles darüber umgedreht</b>. Profi-Zahl: <b>${S.min} Wendungen</b>.</p>`,
    );
  }
  return {
    id: "wenden",
    icon: "🥞",
    title: "Pfannkuchen wenden",
    region: "suchen",
    levels: FLIP_LEVELS.map((l) => ({ id: l.id, label: `${l.start.length} 🥞` })),
    card: `<h2>🤖 So denkt ein Computer</h2>
      <p><b>Sortieren mit nur einer Bewegung:</b> Hol den größten falsch liegenden Pfannkuchen mit
      einer Wendung nach oben, dann wende ihn mit der zweiten an seinen Platz. So braucht man
      höchstens etwa <b>2 Wendungen je Pfannkuchen</b>.</p>
      <p>Die allerbeste Zahl zu finden ist sogar für Computer schwer – Forscher knobeln bis heute
      daran.</p>`,
    start,
    tick(dt) {
      const a = S.anim;
      if (!a) return;
      a.t += (dt * kit.speed()) / 0.6;
      if (a.t >= 1) {
        S.stack = flip(S.stack, a.at);
        S.anim = null;
        S.flips++;
        kit.sound.drop();
        count();
        if (sorted(S.stack)) {
          S.done = true;
          S.doneAt = kit.clock();
          kit.sound.tada();
          const i = FLIP_LEVELS.indexOf(S.level);
          kit.finish({
            chapter: "wenden",
            level: S.level.id,
            stars: starsOf(S.flips, S.min),
            text: `Sortiert mit ${S.flips} Wendungen – die Profi-Zahl ist ${S.min}.`,
            next: FLIP_LEVELS[i + 1] ? () => start(i + 1) : null,
            again: () => start(i),
          });
        }
      }
    },
    draw(g, vw, vh) {
      const n = S.stack.length;
      K = kitchenLayout(vw, vh, n);
      K.maxW = Math.min(Math.floor(vw * 0.5), 110);
      drawKitchen(g, vw, vh, { ...K, pegX: [-999, K.pegX[1], 9999] as [number, number, number] });
      drawBear(g, Math.round(vw / 2 - 16), 4, SPRITES.baer!, S.done ? "happy" : "");
      const cx = K.pegX[1];
      const t = kit.clock();
      const a = S.anim;
      for (let i = 0; i < n; i++) {
        const d = S.stack[i]!;
        let x = cx;
        let y = yOf(i);
        const face = d;
        if (a && i >= a.at) {
          // der obere Teil hebt sich und liegt ab der Hälfte umgedreht
          const lift = Math.sin(Math.PI * a.t) * (8 + (n - a.at) * 2);
          y = yOf(a.t < 0.5 ? i : a.at + (n - 1 - i)) - lift;
          x = cx + Math.sin(Math.PI * a.t) * 3;
        }
        const glow =
          S.tip === i && t < S.tipUntil ? 0.35 + 0.25 * Math.sin(t * Math.PI * 2) : undefined;
        drawPancake(g, x, y, discWidth(K, face, n), K.discH, face, {
          topping: i === n - 1 && !a,
          blink: (t * 0.37 + d * 1.31) % 5 < 0.14 || (S.done && t - S.doneAt < 6),
          glow,
        });
      }
      // Pfannenwender beim Wenden
      if (a) {
        const y = yOf(a.at) + K.discH - Math.sin(Math.PI * a.t) * 6;
        g.fillStyle = "#9aa3ad";
        g.fillRect(Math.round(cx + discWidth(K, n, n) / 2 - 18), Math.round(y), 22, 2);
        g.fillStyle = "#6b4226";
        g.fillRect(Math.round(cx + discWidth(K, n, n) / 2 + 4), Math.round(y - 1), 18, 3);
      }
    },
    down(p) {
      if (S.anim || S.done) return;
      // Pfannkuchen sind flach: über die ganze Breite treffen, sonst der nächstgelegene
      const n = S.stack.length;
      const half = discWidth(K, n, n) / 2;
      const items = S.stack.map((_, j) => ({
        x: Math.max(K.pegX[1] - half, Math.min(K.pegX[1] + half, p.x)),
        y: yOf(j) + K.discH / 2,
      }));
      const i = pickNearest(items, p, kit.hitR());
      if (i < 0) return;
      if (i === S.stack.length - 1) {
        kit.toast("Den obersten allein umzudrehen ändert nichts – tipp weiter unten.", 3);
        return;
      }
      doFlip(i);
    },
    debug: () => ({
      level: S.level.id,
      stack: [...S.stack],
      flips: S.flips,
      min: S.min,
      busy: !!S.anim,
      done: S.done,
    }),
    point(what): Pt | null {
      const i = Number(what);
      return { x: K.pegX[1], y: yOf(i) + K.discH / 2 };
    },
  };
}
