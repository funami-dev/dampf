/** Einheiten der Anzeigen (Spec: Anzeigen, PP-AK-18). Intern rechnet der Flug in m und m/s. */
import { FEET, KNOTS } from "./flight.ts";

export type Units = "metrisch" | "luftfahrt";
export const UNITS_KEY = "dampf.pilotpro.einheiten";

export const UNIT_LABELS: Record<Units, { spd: string; alt: string; vs: string; name: string }> = {
  metrisch: { spd: "km/h", alt: "m", vs: "m/s", name: "Metrisch (km/h, m)" },
  luftfahrt: { spd: "Knoten", alt: "Fuß", vs: "Fuß/min", name: "Wie echte Piloten (Knoten, Fuß)" },
};

/** Werte als Text: Geschwindigkeit, Höhe, Steig-/Sinkrate */
export function gauges(
  s: { speed: number; y: number; vs: number },
  u: Units,
): { spd: string; alt: string; vs: string } {
  if (u === "luftfahrt")
    return {
      spd: String(Math.round(s.speed * KNOTS)),
      alt: String(Math.round(s.y * FEET)),
      vs: String(Math.round((s.vs * FEET * 60) / 10) * 10),
    };
  const vs = Math.round(s.vs * 10) / 10;
  return {
    spd: String(Math.round(s.speed * 3.6)),
    alt: String(Math.round(s.y)),
    vs: (Object.is(vs, -0) ? 0 : vs).toLocaleString("de-DE", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }),
  };
}

export function loadUnits(get: (k: string) => string | null): Units {
  try {
    return get(UNITS_KEY) === "luftfahrt" ? "luftfahrt" : "metrisch";
  } catch {
    return "metrisch";
  }
}
