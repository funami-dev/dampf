/** Kapitel 12 · Zaubertrick mit Karten (Spec K12, KI-AK-15) */
import { drawNumber, ellipse } from "../art/scenes.ts";
import { CARD_LEVELS, bitsOf, cardNumbers, popcount, trickSum, valueOf } from "../logic/karten.ts";
import { starsOf, type Chapter, type Kit, type Pt } from "./kit.ts";

export function kartenChapter(kit: Kit): Chapter {
  const S = {
    li: 0,
    k: 3,
    phase: "trick" as "trick" | "lampen",
    yes: [] as boolean[],
    lamps: [] as boolean[],
    taps: 0,
    target: 5,
    done: false,
  };
  let L = { xs: [] as number[], y: 120, r: 10 };
  const min = () => popcount(S.target);
  function trickCard(i: number) {
    if (i >= S.k) {
      const n = trickSum(S.yes);
      const firsts = S.yes.map((y, j) => (y ? 2 ** j : 0)).filter(Boolean);
      const el = kit.panel(
        `<h2>🦝 Abrakadabra!</h2>
         <p>Deine Zahl ist <b style="font-size:24px">${n}</b>!</p>
         <p><small>Der Trick: Ich zähle nur die ersten Zahlen der Karten zusammen, bei denen du „Ja“
         gesagt hast${firsts.length ? `: ${firsts.join(" + ")} = ${n}` : ""}.</small></p>
         <div class="ki-row"><button class="ki-btn ki-primary" type="button" data-x>Jetzt du!</button></div>`,
        "Zaubertrick",
      );
      el.querySelector("[data-x]")!.addEventListener("click", () => {
        kit.closePanel();
        S.phase = "lampen";
        ui();
      });
      return;
    }
    const nums = cardNumbers(S.k, i);
    const el = kit.panel(
      `<h2>🃏 Karte ${i + 1} von ${S.k}</h2>
       <p>Denk dir eine Zahl von 1 bis ${2 ** S.k - 1}. Steht sie auf dieser Karte?</p>
       <div class="ki-cardnums">${nums.map((n) => `<span>${n}</span>`).join("")}</div>
       <div class="ki-row">
         <button class="ki-btn ki-primary" type="button" data-y>Ja, drauf</button>
         <button class="ki-btn" type="button" data-n>Nein</button>
       </div>`,
      "Zaubertrick",
    );
    const answer = (y: boolean) => {
      S.yes[i] = y;
      kit.sound.click();
      trickCard(i + 1);
    };
    el.querySelector("[data-y]")!.addEventListener("click", () => answer(true));
    el.querySelector("[data-n]")!.addEventListener("click", () => answer(false));
  }
  function ui() {
    if (S.phase === "trick") {
      kit.setTop(`🃏 Level ${S.li + 1} · Zaubertrick`, [{ id: "map", label: "🏝️ Insel" }], () =>
        kit.map(),
      );
      kit.setCount(`${S.k} Zauberkarten · Zahlen 1 bis ${2 ** S.k - 1}`);
      kit.info(null);
      return;
    }
    kit.setTop(
      `🃏 Level ${S.li + 1} · Zahl mit Lampen zeigen`,
      [
        { id: "fertig", label: "✨ Fertig", primary: true },
        { id: "trick", label: "🃏 Trick nochmal" },
        { id: "map", label: "🏝️ Insel" },
      ],
      (id) => {
        if (id === "fertig") check();
        else if (id === "trick") start(S.li);
        else kit.map();
      },
    );
    kit.info(
      `🦝 „Zeig mir die Zahl <b>${S.target}</b> mit den Lampen! Jede Lampe hat einen Wert – die hellen werden zusammengezählt.“`,
    );
    count();
  }
  const count = () =>
    kit.setCount(`Lampen zeigen: ${valueOf(S.lamps)} · Schalter: ${S.taps} · Profi-Zahl: ${min()}`);
  function check() {
    if (S.done) return;
    if (valueOf(S.lamps) !== S.target) {
      kit.sound.ouch();
      kit.toast(
        `Noch nicht – die hellen Lampen ergeben ${valueOf(S.lamps)}, nicht ${S.target}.`,
        4,
      );
      return;
    }
    S.done = true;
    kit.sound.tada();
    kit.finish({
      chapter: "karten",
      level: CARD_LEVELS[S.li]!.id,
      stars: starsOf(S.taps, min()),
      text: `${S.target} = ${bitsOf(S.target, S.k)
        .map((b, i) => (b ? 2 ** i : 0))
        .filter(Boolean)
        .reverse()
        .join(" + ")} – so sieht die Zahl im Computer aus!`,
      next: CARD_LEVELS[S.li + 1] ? () => start(S.li + 1) : null,
      again: () => start(S.li),
    });
  }
  function start(i: number) {
    S.li = i;
    S.k = CARD_LEVELS[i]!.cards;
    S.target = CARD_LEVELS[i]!.target;
    S.phase = "trick";
    S.yes = [];
    S.lamps = Array<boolean>(S.k).fill(false);
    S.taps = 0;
    S.done = false;
    ui();
    trickCard(0);
  }
  return {
    id: "karten",
    icon: "🃏",
    title: "Zaubertrick",
    region: "codes",
    levels: CARD_LEVELS.map((l) => ({ id: l.id, label: `${l.cards} Karten` })),
    card: `<h2>🤖 So denkt ein Computer</h2>
      <p>Die Zauberkarten beginnen mit <b>1, 2, 4, 8, 16</b> – jede doppelt so viel wie die davor.
      Jede Zahl lässt sich auf genau eine Art daraus zusammensetzen: 11 = 8 + 2 + 1.</p>
      <p>Das sind <b>Binärzahlen</b>: Lampe an = 1, Lampe aus = 0. Die 11 heißt binär
      <b>1011</b>. So speichert ein Computer alles – Zahlen, Buchstaben, Bilder und Musik.</p>`,
    start,
    tick() {},
    draw(g, vw, vh) {
      const t = kit.clock();
      // Zauberbühne
      g.fillStyle = "#3a1f4a";
      g.fillRect(0, 0, vw, vh);
      for (let x = 0; x < vw; x += 16) {
        g.fillStyle = x % 32 ? "#7a1f2a" : "#962a38";
        g.fillRect(x, 0, 16, Math.round(vh * 0.18));
      }
      g.fillStyle = "#8a5a33";
      g.fillRect(0, Math.round(vh * 0.85), vw, vh);
      // Waschbär-Zauberer (einfach gezeichnet)
      const wx = Math.round(vw * 0.14);
      const wy = Math.round(vh * 0.85);
      ellipse(g, wx, wy - 14, 9, 12, "#8a8f99");
      ellipse(g, wx, wy - 32, 8, 7, "#a7a9b0");
      g.fillStyle = "#2b2233";
      g.fillRect(wx - 7, wy - 34, 14, 3);
      g.fillStyle = "#ffffff";
      g.fillRect(wx - 4, wy - 34, 2, 2);
      g.fillRect(wx + 2, wy - 34, 2, 2);
      g.fillStyle = "#2b2233";
      g.fillRect(wx - 6, wy - 49, 12, 10);
      g.fillRect(wx - 9, wy - 40, 18, 2);
      g.fillStyle = "#c9a227";
      g.fillRect(wx + 10, wy - 22, 10, 1);
      g.fillStyle = "#ffffff";
      g.fillRect(wx + 19, wy - 23, 2, 3);
      // Lampenreihe: links der größte Wert
      const n = S.k;
      const gap = Math.min(54, Math.floor((vw * 0.7) / n));
      L = {
        xs: Array.from({ length: n }, (_, i) => Math.round(vw * 0.58 + (i - (n - 1) / 2) * gap)),
        y: Math.round(vh * 0.6),
        r: Math.max(7, Math.min(16, Math.floor(gap / 3))),
      };
      L.xs.forEach((x, i) => {
        const bit = n - 1 - i;
        const on = S.lamps[bit]!;
        if (on) {
          g.globalAlpha = 0.25 + 0.05 * Math.sin(t * (Math.PI / 2));
          ellipse(g, x, L.y, L.r * 2, L.r * 1.6, "#ffe27a");
          g.globalAlpha = 1;
        }
        ellipse(g, x, L.y, L.r, L.r, on ? "#ffd84a" : "#4a3a58");
        ellipse(g, x - L.r / 3, L.y - L.r / 3, L.r / 3, L.r / 3, on ? "#fff6c8" : "#5e4c6e");
        g.fillStyle = "#6b6b6b";
        g.fillRect(x - 3, L.y + L.r, 6, 4);
        drawNumber(g, 2 ** bit, x, L.y + L.r + 11, "#f7f7f2");
        drawNumber(g, on ? 1 : 0, x, L.y - L.r - 8, on ? "#ffd84a" : "#8a7a9a");
      });
    },
    down(p: Pt) {
      if (S.phase !== "lampen" || S.done) return;
      L.xs.forEach((x, i) => {
        if (Math.abs(p.x - x) <= L.r + 4 && Math.abs(p.y - L.y) <= L.r + 6) {
          const bit = S.k - 1 - i;
          S.lamps[bit] = !S.lamps[bit];
          S.taps++;
          kit.sound.click();
          count();
        }
      });
    },
    debug: () => ({
      level: CARD_LEVELS[S.li]!.id,
      phase: S.phase,
      target: S.target,
      value: valueOf(S.lamps),
      taps: S.taps,
      done: S.done,
    }),
    point(what) {
      // „lampe:4“ = Lampe mit dem Wert 4
      const v = Number(what.split(":")[1]);
      const bit = Math.log2(v);
      const x = L.xs[S.k - 1 - bit];
      return x === undefined ? null : { x, y: L.y };
    },
  };
}
