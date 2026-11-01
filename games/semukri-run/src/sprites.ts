/**
 * Pixel-Sprites (24 × 32) für Ukri, Semlaki und Billy, per Code gezeichnet.
 * Eigene Interpretationen, keine übernommenen Grafiken.
 */

export const SPRITE_W = 24;
export const SPRITE_H = 32;
export const FRAMES = ["idle", "run0", "run1", "run2", "run3", "cheer"] as const;
export type Frame = (typeof FRAMES)[number];

export const CHARACTERS = [
  { id: "ukri", name: "Ukri" },
  { id: "semlaki", name: "Semlaki" },
  { id: "billy", name: "Billy" },
] as const;
export type CharacterId = (typeof CHARACTERS)[number]["id"];

interface Palette {
  skin: string;
  hair: string;
  hairDark: string;
  top: string;
  topDark: string;
  bottom: string;
  bottomDark: string;
  shoe: string;
  shoeAccent: string;
  bareLegs: boolean;
}

const OUTLINE = "#1a1c2c";

const PALETTES: Record<CharacterId, Palette> = {
  ukri: {
    skin: "#f4c7a1",
    hair: "#f6d55c",
    hairDark: "#d9a93a",
    top: "#3b8ef0",
    topDark: "#2560b8",
    bottom: "#2f5fc0",
    bottomDark: "#21478f",
    shoe: "#ffffff",
    shoeAccent: "#2f6fd6",
    bareLegs: true,
  },
  semlaki: {
    skin: "#e8b48f",
    hair: "#3a2a22",
    hairDark: "#241913",
    top: "#d63a3a",
    topDark: "#9e2525",
    bottom: "#c43232",
    bottomDark: "#8c2121",
    shoe: "#2b2b2b",
    shoeAccent: "#ffffff",
    bareLegs: false,
  },
  billy: {
    skin: "#f1c09b",
    hair: "#8a5a2b",
    hairDark: "#5e3b1a",
    top: "#4caf50",
    topDark: "#2f7d33",
    bottom: "#3d5fa8",
    bottomDark: "#2a4277",
    shoe: "#f2f2f2",
    shoeAccent: "#d64545",
    bareLegs: false,
  },
};

type Plot = (x: number, y: number, c: string) => void;

/** Linie aus 2×2-Blöcken (dicke Pixel-Gliedmaßen). */
function limb(plot: Plot, pts: [number, number][], c: string) {
  for (let i = 1; i < pts.length; i++) {
    let [x0, y0] = pts[i - 1]!;
    const [x1, y1] = pts[i]!;
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      plot(x0, y0, c);
      plot(x0 + 1, y0, c);
      plot(x0, y0 + 1, c);
      plot(x0 + 1, y0 + 1, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }
}

type Pose = {
  /** Beine: [Oberschenkel-Knie, Fuß] relativ, für hinteres (far) und vorderes (near) Bein */
  farLeg: [number, number][];
  nearLeg: [number, number][];
  farArm: [number, number][];
  nearArm: [number, number][];
  bob: number;
};

// Hüfte bei y=21, Schulter bei y=13. Blick nach rechts.
const RUN_A: Pose = {
  farLeg: [
    [10, 21],
    [7, 25],
    [4, 27],
  ],
  nearLeg: [
    [12, 21],
    [16, 24],
    [16, 28],
  ],
  farArm: [
    [13, 13],
    [16, 16],
    [19, 14],
  ],
  nearArm: [
    [11, 13],
    [8, 16],
    [7, 19],
  ],
  bob: 0,
};
const RUN_B: Pose = {
  farLeg: [
    [11, 21],
    [10, 25],
    [8, 27],
  ],
  nearLeg: [
    [12, 21],
    [13, 25],
    [12, 28],
  ],
  farArm: [
    [12, 13],
    [13, 17],
    [14, 19],
  ],
  nearArm: [
    [12, 13],
    [11, 17],
    [12, 19],
  ],
  bob: -1,
};
const swap = (p: Pose): Pose => ({
  ...p,
  farLeg: p.nearLeg,
  nearLeg: p.farLeg,
  farArm: p.nearArm,
  nearArm: p.farArm,
});

const POSES: Record<Frame, Pose> = {
  idle: {
    farLeg: [
      [10, 21],
      [10, 28],
    ],
    nearLeg: [
      [13, 21],
      [13, 28],
    ],
    farArm: [
      [9, 13],
      [8, 19],
    ],
    nearArm: [
      [14, 13],
      [15, 19],
    ],
    bob: 0,
  },
  run0: RUN_A,
  run1: RUN_B,
  run2: swap(RUN_A),
  run3: swap(RUN_B),
  cheer: {
    farLeg: [
      [10, 21],
      [8, 28],
    ],
    nearLeg: [
      [13, 21],
      [15, 28],
    ],
    farArm: [
      [9, 13],
      [6, 9],
      [5, 5],
    ],
    nearArm: [
      [14, 13],
      [17, 9],
      [18, 5],
    ],
    bob: -1,
  },
};

export function drawFigure(
  ctx: CanvasRenderingContext2D,
  id: CharacterId,
  frame: Frame,
  ox = 0,
  oy = 0,
) {
  const p = PALETTES[id];
  const pose = POSES[frame];
  const plot: Plot = (x, y, c) => {
    y += 1; // 1 px Luft oben für Krone und Haarspitzen
    if (x < 0 || y < 0 || x >= SPRITE_W || y >= SPRITE_H) return;
    ctx.fillStyle = c;
    ctx.fillRect(ox + x, oy + y, 1, 1);
  };
  const rect = (x: number, y: number, w: number, h: number, c: string) => {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) plot(xx, yy + pose.bob, c);
  };
  const bobbed = (pts: [number, number][]) =>
    pts.map(([x, y]) => [x, y + pose.bob] as [number, number]);

  const leg = (pts: [number, number][], dark: boolean) => {
    const b = bobbed(pts);
    // Oberschenkel in Hosenfarbe, Unterschenkel je nach Figur Haut oder Hose
    limb(plot, b.slice(0, 2), dark ? p.bottomDark : p.bottom);
    if (b.length > 2) limb(plot, b.slice(1), p.bareLegs ? p.skin : dark ? p.bottomDark : p.bottom);
    else if (p.bareLegs) limb(plot, [[b[0]![0], b[0]![1] + 3], b[1]!], p.skin);
    const [fx, fy] = b.at(-1)!;
    // Schuh
    for (let x = fx - 1; x <= fx + 2; x++) {
      plot(x, fy + 1, dark ? p.shoeAccent : p.shoe);
      plot(x, fy + 2, OUTLINE);
    }
  };
  const arm = (pts: [number, number][], dark: boolean) => {
    const b = bobbed(pts);
    limb(plot, b.slice(0, 2), dark ? p.topDark : p.top);
    const hand = b.at(-1)!;
    if (b.length > 2) limb(plot, b.slice(1), dark ? p.topDark : p.top);
    plot(hand[0], hand[1], p.skin);
    plot(hand[0] + 1, hand[1], p.skin);
    plot(hand[0], hand[1] + 1, p.skin);
    plot(hand[0] + 1, hand[1] + 1, p.skin);
  };

  // hinten
  leg(pose.farLeg, true);
  arm(pose.farArm, true);

  // Rumpf
  rect(8, 12, 8, 10, p.top);
  rect(8, 21, 8, 2, p.bottom);
  rect(8, 12, 1, 10, p.topDark);
  if (id === "semlaki") {
    rect(11, 12, 2, 6, "#f5f5f5"); // Hemd
    rect(10, 12, 4, 1, OUTLINE); // Fliege
    rect(11, 13, 2, 1, OUTLINE);
  } else if (id === "ukri") {
    rect(9, 18, 6, 2, p.topDark); // Bauchtasche
    plot(11, 13, "#ffffff");
    plot(13, 13, "#ffffff");
  } else {
    rect(9, 12, 6, 1, p.topDark); // Kragen
  }

  // vorne
  leg(pose.nearLeg, false);

  // Kopf
  rect(8, 3, 9, 9, p.skin);
  plot(14 + 0, 7 + pose.bob, OUTLINE); // Auge
  plot(15, 7 + pose.bob, OUTLINE);
  plot(14, 6 + pose.bob, "#ffffff");
  rect(14, 10, 2, 1, "#b5534a"); // Mund
  plot(8, 8 + pose.bob, p.skin);

  // Haare
  if (id === "ukri") {
    rect(7, 2, 10, 3, p.hair);
    rect(7, 5, 3, 4, p.hair);
    for (const [x, y] of [
      [8, 1],
      [10, 0],
      [12, 1],
      [14, 0],
      [16, 1],
      [6, 3],
      [17, 3],
    ] as const) {
      plot(x, y + pose.bob, p.hair);
      plot(x, y + 1 + pose.bob, p.hair);
    }
    rect(13, 5, 4, 1, p.hair); // Pony
    rect(7, 4, 1, 4, p.hairDark);
  } else if (id === "semlaki") {
    rect(7, 2, 10, 3, p.hair);
    rect(7, 5, 3, 3, p.hair);
    rect(14, 5, 3, 1, p.hair);
    // Krone
    rect(9, 0, 6, 2, "#ffd23b");
    for (const x of [9, 11, 14]) plot(x, -1 + pose.bob, "#ffd23b");
    plot(11, 1 + pose.bob, "#e83b3b");
    rect(9, 1, 6, 1, "#e0a800");
  } else {
    rect(7, 2, 10, 2, p.hair);
    rect(7, 4, 3, 3, p.hair);
    rect(13, 4, 4, 1, p.hair);
    rect(7, 2, 1, 4, p.hairDark);
  }
  // Ohr
  plot(10, 7 + pose.bob, "#d9a07c");

  // vorderer Arm zuletzt
  arm(pose.nearArm, false);
}
