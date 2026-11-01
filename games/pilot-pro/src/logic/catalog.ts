/**
 * Flugzeugtypen und Airlines (Spec: specs/games/pilot-pro.md).
 * Lackierungen sind eigene, vereinfachte Gestaltungen: Airline-Name + typische Leitwerksfarben
 * + eigenes Symbol. Keine Original-Logos, keine Bilddateien.
 */

export interface Aircraft {
  id: "a320" | "a321" | "a340" | "a380";
  name: string;
  /** Meter */
  length: number;
  span: number;
  engines: 2 | 4;
  decks: 1 | 2;
  /** Rumpfdurchmesser in Metern */
  diameter: number;
}

export const AIRCRAFT: readonly Aircraft[] = [
  { id: "a320", name: "A320", length: 38, span: 36, engines: 2, decks: 1, diameter: 4 },
  { id: "a321", name: "A321", length: 45, span: 36, engines: 2, decks: 1, diameter: 4 },
  { id: "a340", name: "A340", length: 75, span: 64, engines: 4, decks: 1, diameter: 5.6 },
  { id: "a380", name: "A380", length: 73, span: 80, engines: 4, decks: 2, diameter: 7.1 },
];

export const SYMBOLS = [
  "circle",
  "flag-stripes",
  "arc",
  "h-stripes",
  "waves",
  "line",
  "star-stripes",
] as const;
export type Symbol = (typeof SYMBOLS)[number];

export interface Airline {
  id: string;
  name: string;
  /** Grundfarbe Leitwerk */
  tail: string;
  /** Symbolfarbe */
  accent: string;
  /** zweite Symbolfarbe */
  accent2: string;
  /** Farbe des Schriftzugs am Rumpf */
  text: string;
  /** Rumpfunterseite */
  belly: string;
  symbol: Symbol;
}

export const AIRLINES: readonly Airline[] = [
  {
    id: "lufthansa",
    name: "Lufthansa",
    tail: "#0a1d3d",
    accent: "#f9b000",
    accent2: "#ffffff",
    text: "#0a1d3d",
    belly: "#e8e8e8",
    symbol: "circle",
  },
  {
    id: "emirates",
    name: "Emirates",
    tail: "#ffffff",
    accent: "#d71921",
    accent2: "#00843d",
    text: "#d71921",
    belly: "#e8e8e8",
    symbol: "flag-stripes",
  },
  {
    id: "eurowings",
    name: "Eurowings",
    tail: "#8a1538",
    accent: "#2ec4c6",
    accent2: "#ffffff",
    text: "#8a1538",
    belly: "#e8e8e8",
    symbol: "arc",
  },
  {
    id: "condor",
    name: "Condor",
    tail: "#ffcc00",
    accent: "#ffffff",
    accent2: "#ffcc00",
    text: "#1d1d1b",
    belly: "#e8e8e8",
    symbol: "h-stripes",
  },
  {
    id: "british-airways",
    name: "British Airways",
    tail: "#1b2a5a",
    accent: "#d22630",
    accent2: "#ffffff",
    text: "#1b2a5a",
    belly: "#1b2a5a",
    symbol: "waves",
  },
  {
    id: "la-compagnie",
    name: "La Compagnie",
    tail: "#1f2a44",
    accent: "#c8a24a",
    accent2: "#ffffff",
    text: "#1f2a44",
    belly: "#e8e8e8",
    symbol: "line",
  },
  {
    id: "us-airways",
    name: "US Airways",
    tail: "#16285c",
    accent: "#c8102e",
    accent2: "#ffffff",
    text: "#16285c",
    belly: "#c5c9d1",
    symbol: "star-stripes",
  },
];

export const aircraftById = (id: string) => AIRCRAFT.find((a) => a.id === id) ?? AIRCRAFT[0]!;
export const airlineById = (id: string) => AIRLINES.find((a) => a.id === id) ?? AIRLINES[0]!;
