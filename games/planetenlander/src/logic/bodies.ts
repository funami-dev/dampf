/** Himmelskörper mit echter Fallbeschleunigung und Luftdichte am Boden (PL-AK-01) */
export const G_EARTH = 9.81;

export interface Body {
  id: string;
  name: string;
  icon: string;
  /** Fallbeschleunigung in m/s² */
  g: number;
  /** Luftdichte am Boden in kg/m³ (0 = keine Luft) */
  rho: number;
  /** spielbar? Gasriesen haben keinen festen Boden */
  playable: boolean;
  /** kurzer Fakt (Lern-Karte) bzw. Erklärung, warum man nicht landen kann */
  fact: string;
  /** Farben: Himmel oben/unten, Boden, Bodenkante */
  colors: { skyTop: string; skyBottom: string; ground: string; edge: string; haze?: string };
  /** Sterne am Himmel (Orte ohne dichte Luft) */
  stars: boolean;
}

export const BODIES: Body[] = [
  {
    id: "mond",
    name: "Mond",
    icon: "🌙",
    g: 1.62,
    rho: 0,
    playable: true,
    fact: "Hier sind 1969 die ersten Menschen gelandet. Ihre Fußspuren sind noch heute da – es gibt keinen Wind, der sie verweht.",
    colors: { skyTop: "#000000", skyBottom: "#05060c", ground: "#8d8d92", edge: "#c9c9cf" },
    stars: true,
  },
  {
    id: "ceres",
    name: "Ceres",
    icon: "🪨",
    g: 0.28,
    rho: 0,
    playable: true,
    fact: "Ceres ist ein Zwergplanet im Asteroidengürtel zwischen Mars und Jupiter – nur so breit wie Deutschland.",
    colors: { skyTop: "#000000", skyBottom: "#04050a", ground: "#4d4b4a", edge: "#7a7672" },
    stars: true,
  },
  {
    id: "pluto",
    name: "Pluto",
    icon: "❄️",
    g: 0.62,
    rho: 0,
    playable: true,
    fact: "Pluto ist so weit weg, dass das Sonnenlicht über 5 Stunden bis dorthin braucht. Auf ihm gibt es ein riesiges Herz aus Eis.",
    colors: { skyTop: "#000000", skyBottom: "#0a0a12", ground: "#d9cbb3", edge: "#f4ece0" },
    stars: true,
  },
  {
    id: "titan",
    name: "Titan",
    icon: "🟠",
    g: 1.35,
    rho: 5.3,
    playable: true,
    fact: "Titan ist ein Mond des Saturn. Seine Luft ist dichter als auf der Erde, und es gibt Seen – aber aus flüssigem Methan statt Wasser.",
    colors: {
      skyTop: "#7a4a12",
      skyBottom: "#c9862e",
      ground: "#5b3c1e",
      edge: "#8a5f33",
      haze: "rgba(214,150,60,0.35)",
    },
    stars: false,
  },
  {
    id: "merkur",
    name: "Merkur",
    icon: "☿️",
    g: 3.7,
    rho: 0,
    playable: true,
    fact: "Merkur ist der Planet am nächsten an der Sonne. Tagsüber wird es über 400 °C heiß, nachts eiskalt.",
    colors: { skyTop: "#000000", skyBottom: "#070605", ground: "#5e5a55", edge: "#8f8a83" },
    stars: true,
  },
  {
    id: "mars",
    name: "Mars",
    icon: "🔴",
    g: 3.71,
    rho: 0.02,
    playable: true,
    fact: "Der Mars ist rot, weil sein Staub rostet. Seine Luft ist so dünn, dass Fallschirme dort kaum bremsen.",
    colors: { skyTop: "#b98a6e", skyBottom: "#e3b48f", ground: "#a5442a", edge: "#cf6a45" },
    stars: false,
  },
  {
    id: "venus",
    name: "Venus",
    icon: "🟡",
    g: 8.87,
    rho: 65,
    playable: true,
    fact: "Die Luft auf der Venus ist 50-mal dichter als bei uns und fast 470 °C heiß. Echte Landesonden haben dort nur gut eine Stunde durchgehalten.",
    colors: {
      skyTop: "#a07a28",
      skyBottom: "#e3c46a",
      ground: "#7d6431",
      edge: "#ad9050",
      haze: "rgba(240,200,90,0.4)",
    },
    stars: false,
  },
  {
    id: "erde",
    name: "Erde",
    icon: "🌍",
    g: 9.81,
    rho: 1.225,
    playable: true,
    fact: "Unsere Erde! Hier ist die Schwerkraft am stärksten von allen Landeplätzen im Spiel – deine Fähre schafft es gerade so.",
    colors: { skyTop: "#3d7fd1", skyBottom: "#a9d4f5", ground: "#3f8a3a", edge: "#6cc25b" },
    stars: false,
  },
  {
    id: "jupiter",
    name: "Jupiter",
    icon: "🟤",
    g: 24.79,
    rho: 0,
    playable: false,
    fact: "Jupiter ist ein Gasriese – er hat keinen festen Boden. Je tiefer man sinkt, desto stärker drückt das Gas, bis jede Fähre zerquetscht würde.",
    colors: { skyTop: "#000", skyBottom: "#000", ground: "#000", edge: "#000" },
    stars: true,
  },
  {
    id: "saturn",
    name: "Saturn",
    icon: "🪐",
    g: 10.44,
    rho: 0,
    playable: false,
    fact: "Saturn ist auch ein Gasriese ohne Boden. Er ist so leicht, dass er in einer riesigen Badewanne schwimmen würde – landen kann man trotzdem nicht.",
    colors: { skyTop: "#000", skyBottom: "#000", ground: "#000", edge: "#000" },
    stars: true,
  },
  {
    id: "uranus",
    name: "Uranus",
    icon: "🔵",
    g: 8.69,
    rho: 0,
    playable: false,
    fact: "Uranus ist ein Eisriese aus Gas und Eis – ohne festen Boden. Er rollt seitlich liegend um die Sonne.",
    colors: { skyTop: "#000", skyBottom: "#000", ground: "#000", edge: "#000" },
    stars: true,
  },
  {
    id: "neptun",
    name: "Neptun",
    icon: "🌀",
    g: 11.15,
    rho: 0,
    playable: false,
    fact: "Neptun ist ein Eisriese ohne Boden. Dort wehen die stärksten Winde im ganzen Sonnensystem – über 2000 km/h.",
    colors: { skyTop: "#000", skyBottom: "#000", ground: "#000", edge: "#000" },
    stars: true,
  },
];

export const PLAYABLE = BODIES.filter((b) => b.playable);
export const bodyById = (id: string) => BODIES.find((b) => b.id === id);

/** Zahl deutsch mit Komma */
export const de = (n: number, digits = 1) =>
  n.toLocaleString("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Vergleich mit der Erde für die Lern-Karte (PL-AK-07) */
export function compareText(g: number): string {
  const r = g / G_EARTH;
  const pct = Math.round(r * 100);
  if (Math.abs(r - 1) < 0.005) return "Das ist genau die Schwerkraft der Erde – wie zu Hause.";
  if (r >= 0.85 && r < 1)
    return `Die Schwerkraft ist hier fast so stark wie auf der Erde (${pct} %).`;
  if (r > 1 && r <= 1.2)
    return `Die Schwerkraft ist hier etwas stärker als auf der Erde (${pct} %).`;
  const f = r < 1 ? 1 / r : r;
  const n = f < 3 ? de(f) : String(Math.round(f));
  return `Die Schwerkraft ist hier ${n}-mal ${r < 1 ? "schwächer" : "stärker"} als auf der Erde.`;
}

/** Fallstrecke in der ersten Sekunde ohne Luft (½ · g · 1 s²) */
export const fallInOneSecond = (g: number) => Math.round(g * 5) / 10;

export function fallText(g: number): string {
  return `Ein Ball fällt hier in 1 Sekunde ${de(fallInOneSecond(g))} m tief (auf der Erde 4,9 m).`;
}

export function airText(b: Body): string {
  if (b.rho === 0) return "Keine Luft – nichts bremst dich. Nur deine Düse hilft.";
  if (b.rho < 0.1) return "Die Luft ist sehr dünn – sie bremst dich kaum.";
  if (b.rho > 10) return "Die Luft ist extrem dicht – sie bremst dich wie ein riesiger Fallschirm.";
  if (b.rho > 2) return "Die Luft ist dichter als auf der Erde – sie bremst dich gut.";
  return "Die Luft bremst dich ein bisschen – wie beim Fallschirmspringen.";
}
