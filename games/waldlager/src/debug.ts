export interface DebugHooks {
  state(): Record<string, unknown>;
  /** Figur versetzen (Kachel-Koordinaten) */
  teleport(x: number, y: number, fx?: number, fy?: number): void;
  /** nächstes sichtbares, noch nicht entdecktes Tier: [x, y, Art] */
  nearestAnimal(): [number, number, string] | null;
  /** Weltzeit setzen (Sekunden, 600 = ein Tag) */
  setTime(total: number): void;
  /** Leisten setzen */
  setNeeds(n: { hunger?: number; rest?: number; fitness?: number }): void;
  /** nächster stehender Baum mit freiem Feld daneben: [Baum x, y, Stehfeld x, y] */
  nearestTree(): [number, number, number, number] | null;
  /** nächster Strauch mit Beeren und freiem Feld daneben: [Stehfeld x, y] */
  nearestBush(): [number, number] | null;
  /** freies, ebenes Feld zum Bauen: [Stehfeld x, y, Blickrichtung fx, fy] */
  buildSpot(): [number, number, number, number] | null;
}

declare global {
  interface Window {
    __dampf?: DebugHooks;
  }
}

export const debugEnabled = new URLSearchParams(location.search).has("e2e");
