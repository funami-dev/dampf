/**
 * Süße 16-Bit-Figuren als Pixel-Karten (ein Zeichen = ein Pixel, „.“ = durchsichtig).
 * Gezeichnet wird per Canvas 2D in eine kleine Bildfläche, die scharf vergrößert wird.
 */
export interface Sprite {
  rows: string[];
  pal: Record<string, string>;
}

const SKIN = "#f5d0b0";
const DARK = "#2b2233";
const WHITE = "#f7f7f2";
const PINK = "#f4a0a8";

export const SPRITES: Record<string, Sprite> = {
  baeuerin: {
    rows: [
      "....yyyy....",
      "...yyyyyy...",
      ".yyyyyyyyyy.",
      "..hssssssh..",
      "..hskssksh..",
      "..hpssssph..",
      "...ssmmss...",
      "...rrrrrr...",
      "..rrwwwwrr..",
      ".srrwwwwrrs.",
      "..rrwwwwrr..",
      "..rrrrrrrr..",
      "...bb..bb...",
      "...bb..bb...",
    ],
    pal: {
      y: "#f6d55c",
      h: "#8a4b2a",
      s: SKIN,
      k: DARK,
      p: PINK,
      m: "#c0504d",
      r: "#d9534f",
      w: WHITE,
      b: "#6b4226",
    },
  },
  fuchs: {
    rows: [
      "..........o..o",
      "..........oooo",
      ".........ookoo",
      "w.......oowoon",
      "ow.oooooooww..",
      "oo.ooooooooo..",
      ".oooooooooo...",
      "..oowwwwwoo...",
      "..dd.....dd...",
      "..dd.....dd...",
    ],
    pal: { o: "#e8792b", w: WHITE, k: DARK, n: DARK, d: "#7a3d17" },
  },
  gans: {
    rows: [
      "........ww..",
      ".......wwww.",
      ".......wkwoo",
      "........ww..",
      "........ww..",
      "........ww..",
      ".wwwwwwwww..",
      "wwgwwwwwwww.",
      ".wggggwwww..",
      "..wwwwwwww..",
      "....oo.oo...",
      "...ooo.ooo..",
    ],
    pal: { w: WHITE, k: DARK, o: "#f39c12", g: "#c9ccd1" },
  },
  korn: {
    rows: [
      "....yy....",
      "...yyyy...",
      "...cccc...",
      "..bbbbbb..",
      ".bbbbbbbb.",
      "bbbbbbbbbb",
      "bbbdbbdbbb",
      "bbbbbbbbbb",
      "bbbbbbbbbb",
      ".bbbbbbbb.",
      "..bbbbbb..",
    ],
    pal: { y: "#f6d55c", c: "#7a5230", b: "#c8a26b", d: "#a8834f" },
  },
  hase: {
    rows: [
      "....w.w...",
      "....w.w...",
      "...ww.ww..",
      "....wwww..",
      "...wwkwkw.",
      "...wwwpww.",
      "..wwwwwww.",
      ".wwwwwwww.",
      "wwwwwwwww.",
      ".wwgwwgww.",
      ".ww....ww.",
      ".gg....gg.",
    ],
    pal: { w: "#eeeae0", k: DARK, p: PINK, g: "#b9b4a8" },
  },
  gross: {
    rows: [
      "..........bb..",
      ".........bbbb.",
      "........bbkbbn",
      "........bbbbw.",
      "....bbbbbbbbw.",
      "...bbbbbbbbbb.",
      "dd.bbbllbbbbb.",
      "ddddbbllllbbb.",
      "dddd.bbbbbbb..",
      ".....dd...dd..",
    ],
    pal: { b: "#8b5a2b", k: DARK, n: DARK, w: WHITE, l: "#c08a55", d: "#5a3a1a" },
  },
  klein: {
    rows: [
      ".......bb.",
      "......bkbn",
      "......bbw.",
      "...bbbbbb.",
      "d.bbllbbb.",
      "ddbbllbb..",
      "dd.bbbbb..",
      "....d..d..",
    ],
    pal: { b: "#a0693a", k: DARK, n: DARK, w: WHITE, l: "#d4a06c", d: "#5a3a1a" },
  },
  baer: {
    rows: [
      "....wwwwwwww....",
      "...wwwwwwwwww...",
      "...wwwwwwwwww...",
      "....wwwwwwww....",
      "..bb.gggggg.bb..",
      ".bbbbbbbbbbbbbb.",
      ".bbbbbbbbbbbbbb.",
      ".bbbkbbbbbbkbbb.",
      ".bbbbbllllbbbbb.",
      ".bpbbllnnllbbpb.",
      "..bbbllmmllbbb..",
      "...bbbbbbbbbb...",
      "..wwwwwwwwwwww..",
      ".bwwwwwrrwwwwwb.",
      ".bwwwwwwwwwwwwb.",
      "..wwwwwwwwwwww..",
      "..wwwwwwwwwwww..",
      "...bbb....bbb...",
    ],
    pal: {
      w: WHITE,
      g: "#c9ccd1",
      b: "#9a6233",
      k: DARK,
      l: "#d9b38c",
      p: PINK,
      n: DARK,
      m: "#c0504d",
      r: "#d9534f",
    },
  },
  maus: {
    rows: [".gg..gg.", "gpggggpg", ".gggggg.", ".gkggkg.", "..ggng..", ".gggggg.", "..g..g.."],
    pal: { g: "#a7a9b0", p: PINK, k: DARK, n: DARK },
  },
  ente: {
    rows: ["..gg..", ".gkgo.", "yyyyy.", "yyyyyy", ".yyyy."],
    pal: { g: "#3e8e5a", k: DARK, o: "#f39c12", y: "#f2e3b3" },
  },
};

/** Figur zeichnen (x/y = linke obere Ecke), optional gespiegelt */
export function drawSprite(
  g: CanvasRenderingContext2D,
  sp: Sprite,
  x: number,
  y: number,
  flip = false,
  over: Record<string, string> = {},
  scale = 1,
) {
  const w = sp.rows[0]!.length;
  sp.rows.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      const ch = row[rx]!;
      if (ch === ".") continue;
      g.fillStyle = over[ch] ?? sp.pal[ch] ?? "#ff00ff";
      g.fillRect(
        Math.round(x + (flip ? w - 1 - rx : rx) * scale),
        Math.round(y + ry * scale),
        scale,
        scale,
      );
    }
  });
}
export const spriteSize = (sp: Sprite) => ({ w: sp.rows[0]!.length, h: sp.rows.length });

/** kleiner Pseudo-Zufall mit festem Samen (für Blumen, Grasflecken) */
export function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}
