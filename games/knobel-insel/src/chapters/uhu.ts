/** Kapitel 11 · Orakel-Uhu (Spec K11, KI-AK-15) */
import { SPRITES, drawSprite } from "../art/sprites.ts";
import { drawNumber, ellipse, seededStars } from "../art/scenes.ts";
import { UHU_LEVELS, uhuAnswer, uhuGuess, uhuMin } from "../logic/uhu.ts";
import { starsOf, type Chapter, type Kit } from "./kit.ts";

export function uhuChapter(kit: Kit): Chapter {
  const S = {
    li: 0,
    max: 10,
    lo: 1,
    hi: 10,
    q: 0,
    guesses: [] as number[],
    done: false,
    /** Uhu rät deine Zahl */
    rev: null as null | { lo: number; hi: number; q: number; g: number; done: boolean },
  };
  const min = () => uhuMin(S.max);
  function ui() {
    if (S.rev) {
      kit.setTop(
        "🦉 Jetzt rät der Uhu",
        [
          { id: "hoeher", label: "⬆ Höher" },
          { id: "tiefer", label: "⬇ Tiefer" },
          { id: "richtig", label: "✅ Richtig!", primary: true },
          { id: "selbst", label: "Ich rate wieder" },
        ],
        (id) => revAnswer(id),
      );
      kit.setCount(`Uhu-Fragen: ${S.rev.q} · höchstens ${min()}`);
      return;
    }
    kit.setTop(
      `🦉 Level ${S.li + 1} · Zahl von 1 bis ${S.max}`,
      [
        {
          id: "zahl",
          label: "Deine Zahl",
          number: { min: 1, max: S.max, value: Math.ceil(S.max / 2) },
        },
        { id: "fragen", label: "🦉 Fragen", primary: true },
        { id: "uhu", label: "🔄 Jetzt rät der Uhu" },
        { id: "neu", label: "↺ Neu" },
        { id: "map", label: "🏝️ Insel" },
      ],
      (id, v) => {
        if (id === "fragen" && v !== undefined) ask(Math.round(v));
        else if (id === "uhu") startRev();
        else if (id === "neu") reset();
        else if (id === "map") kit.map();
      },
    );
    count();
  }
  const count = () => kit.setCount(`Fragen: ${S.q} · Profi-Zahl: ${min()}`);
  function reset() {
    S.lo = 1;
    S.hi = S.max;
    S.q = 0;
    S.guesses = [];
    S.done = false;
    S.rev = null;
    ui();
  }
  function ask(g: number) {
    if (S.done || !Number.isFinite(g) || g < 1 || g > S.max) {
      kit.toast(`Nenn eine Zahl von 1 bis ${S.max}.`, 3);
      return;
    }
    S.q++;
    S.guesses.push(g);
    const r = uhuAnswer(S.lo, S.hi, g);
    S.lo = r.lo;
    S.hi = r.hi;
    count();
    if (r.answer === "richtig") {
      S.done = true;
      kit.sound.tada();
      kit.toast("Huhu! Richtig!", 3);
      kit.finish({
        chapter: "uhu",
        level: UHU_LEVELS[S.li]!.id,
        stars: starsOf(S.q, min()),
        text: `Gefunden mit ${S.q} Fragen – die Profi-Zahl ist ${min()}.`,
        next: UHU_LEVELS[S.li + 1] ? () => start(S.li + 1) : null,
        again: () => start(S.li),
      });
    } else {
      kit.sound.click();
      kit.toast(`🦉 „${r.answer === "höher" ? "Höher!" : "Tiefer!"}“`, 2.5);
    }
  }
  function startRev() {
    S.rev = { lo: 1, hi: S.max, q: 1, g: uhuGuess(1, S.max), done: false };
    ui();
    say();
  }
  function say() {
    const r = S.rev!;
    kit.info(
      `🦉 „Ich nehme die Mitte zwischen ${r.lo} und ${r.hi}: Ist es <b>${r.g}</b>?“<br><small>Denk dir eine Zahl von 1 bis ${S.max} und antworte ehrlich.</small>`,
    );
  }
  function revAnswer(id: string) {
    const r = S.rev!;
    if (id === "selbst") {
      kit.info(null);
      reset();
      return;
    }
    if (r.done) return;
    if (id === "richtig") {
      r.done = true;
      kit.sound.tada();
      kit.info(`🦉 „Hab ich in ${r.q} Fragen gefunden – immer die Mitte, so halbiert sich alles!“`);
      return;
    }
    if (id === "hoeher") r.lo = r.g + 1;
    else r.hi = r.g - 1;
    if (r.lo > r.hi) {
      kit.info("🦉 „Hm, da passt keine Zahl mehr – hast du dich vertan? Probier's nochmal.“");
      r.done = true;
      return;
    }
    r.q++;
    r.g = uhuGuess(r.lo, r.hi);
    kit.setCount(`Uhu-Fragen: ${r.q} · höchstens ${min()}`);
    say();
  }
  function start(i: number) {
    S.li = i;
    S.max = UHU_LEVELS[i]!.max;
    reset();
    kit.intro(
      `🦉 Orakel-Uhu`,
      `<p>Der Uhu denkt sich eine Zahl von <b>1 bis ${S.max}</b>. Gib eine Zahl ein und frag ihn – er
       sagt nur „höher“ oder „tiefer“. Schaffst du es mit <b>${min()} Fragen</b>?</p>
       <p><small>Der grüne Teil der Zahlenlinie zeigt, wo die Zahl noch sein kann.</small></p>`,
    );
  }
  return {
    id: "uhu",
    icon: "🦉",
    title: "Orakel-Uhu",
    region: "suchen",
    levels: UHU_LEVELS.map((l) => ({ id: l.id, label: `1–${l.max}` })),
    card: `<h2>🤖 So denkt ein Computer</h2>
      <p><b>Binäre Suche:</b> Frag immer nach der <b>Mitte</b>. Jede Antwort halbiert den Bereich:
      100 → 50 → 25 → 13 → 7 → 4 → 2 → 1. Darum reichen 7 Fragen für 100 Zahlen und 10 Fragen
      für 1000 – und 20 Fragen für über eine Million!</p>
      <p>So findet ein Computer blitzschnell ein Wort im Wörterbuch oder einen Namen in einer
      sortierten Liste.</p>`,
    start,
    tick() {},
    draw(g, vw, vh) {
      const t = kit.clock();
      g.fillStyle = "#1d2648";
      g.fillRect(0, 0, vw, vh);
      seededStars(g, vw, vh * 0.5, t);
      ellipse(g, vw * 0.85, 30, 9, 9, "#f2ecc8");
      // Ast und Uhu
      g.fillStyle = "#6b4226";
      g.fillRect(Math.round(vw * 0.25), Math.round(vh * 0.5), Math.round(vw * 0.5), 4);
      const blink = t % 6 < 0.15;
      drawSprite(
        g,
        SPRITES.eule!,
        Math.round(vw / 2 - 15),
        Math.round(vh * 0.5 - 30),
        false,
        blink ? { w: "#8a6a4a", k: "#8a6a4a" } : {},
        3,
      );
      // Zahlenlinie
      const x0 = 16;
      const x1 = vw - 16;
      const y = Math.round(vh * 0.8);
      const X = (n: number) => x0 + ((n - 1) / Math.max(1, S.max - 1)) * (x1 - x0);
      g.fillStyle = "#4a4458";
      g.fillRect(x0, y, x1 - x0, 6);
      const lo = S.rev ? S.rev.lo : S.lo;
      const hi = S.rev ? S.rev.hi : S.hi;
      if (lo <= hi) {
        g.fillStyle = "#7fcc68";
        g.fillRect(Math.round(X(lo) - 2), y, Math.max(4, Math.round(X(hi) - X(lo) + 4)), 6);
      }
      for (const gu of S.guesses) {
        g.fillStyle = "#f6d55c";
        g.fillRect(Math.round(X(gu)), y - 5, 1, 5);
      }
      if (S.rev && !S.rev.done) {
        g.fillStyle = "#f4a0a8";
        g.fillRect(Math.round(X(S.rev.g)), y - 7, 2, 7);
      }
      drawNumber(g, 1, x0, y + 12, "#f7f7f2");
      drawNumber(g, S.max, x1, y + 12, "#f7f7f2");
      if (lo <= hi && hi - lo < S.max - 1) {
        drawNumber(g, lo, X(lo), y - 12, "#c8f0b8");
        if (hi !== lo) drawNumber(g, hi, X(hi), y - 12, "#c8f0b8");
      }
    },
    down() {},
    debug: () => ({
      level: UHU_LEVELS[S.li]!.id,
      lo: S.lo,
      hi: S.hi,
      q: S.q,
      min: min(),
      done: S.done,
      rev: S.rev ? { ...S.rev } : null,
    }),
  };
}
