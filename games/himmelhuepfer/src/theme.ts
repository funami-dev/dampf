export const FONT = '"Fredoka", "Trebuchet MS", sans-serif';

export const COLORS = {
  skyTop: 0x4fb8f2,
  skyBottom: 0xc6ecff,
  ink: "#23303d",
  inkHex: 0x23303d,
  white: "#ffffff",
  blue: "#2f7ad6",
  blueHex: 0x3b8ef0,
  yellow: "#ffd93b",
  yellowHex: 0xffd93b,
  cardHex: 0xf4f9ff,
  selectedHex: 0xfff5d6,
} as const;

export const CHARACTERS = [
  { id: "mauli", name: "Mauli" },
  { id: "schweini", name: "Schweini" },
  { id: "matti", name: "Matti" },
] as const;

export type CharacterId = (typeof CHARACTERS)[number]["id"];

/** Darstellungsmaßstab der Figuren (Textur 192×256 → ca. 58×77 WE). */
export const FIGURE_SCALE = 0.3;
