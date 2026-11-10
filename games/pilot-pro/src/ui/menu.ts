import { AIRCRAFT, AIRLINES } from "../logic/catalog.ts";
import { UNIT_LABELS, type Units } from "../logic/units.ts";

export interface MenuHandlers {
  onChange(aircraft: string, airline: string): void;
  onStart(): void;
  /** Einheiten gewechselt (PP-AK-18) */
  onUnits?(u: Units): void;
}

/** Auswahlmenü (DOM über dem 3D-Bild). */
export function createMenu(
  layer: HTMLElement,
  initial: { aircraft: string; airline: string; units?: Units },
  h: MenuHandlers,
) {
  const el = document.createElement("section");
  el.className = "pp-menu";
  el.setAttribute("aria-label", "Flugzeug und Airline wählen");
  let { aircraft, airline } = initial;
  const group = (
    title: string,
    items: readonly { id: string; name: string }[],
    current: () => string,
    set: (id: string) => void,
  ) => {
    const wrap = document.createElement("div");
    wrap.innerHTML = `<h2>${title}</h2>`;
    const row = document.createElement("div");
    row.className = "pp-choices";
    row.setAttribute("role", "group");
    row.setAttribute("aria-label", title);
    const buttons = items.map((it) => {
      const b = document.createElement("button");
      b.className = "pp-btn";
      b.type = "button";
      b.textContent = it.name;
      b.dataset.id = it.id;
      b.addEventListener("click", () => {
        set(it.id);
        sync();
        h.onChange(aircraft, airline);
      });
      row.append(b);
      return b;
    });
    wrap.append(row);
    const sync = () =>
      buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.id === current())));
    sync();
    return wrap;
  };
  const top = document.createElement("div");
  top.innerHTML = "<h1>Pilot Pro</h1>";
  const bottom = document.createElement("div");
  bottom.append(
    group(
      "Flugzeug",
      AIRCRAFT,
      () => aircraft,
      (id) => (aircraft = id),
    ),
    group(
      "Airline",
      AIRLINES,
      () => airline,
      (id) => (airline = id),
    ),
  );
  const go = document.createElement("button");
  go.className = "pp-btn pp-go";
  go.type = "button";
  go.textContent = "Abheben!";
  go.addEventListener("click", () => h.onStart());
  // Einheiten (PP-AK-18)
  let units: Units = initial.units ?? "metrisch";
  const unitWrap = document.createElement("div");
  unitWrap.innerHTML = "<h2>Einheiten</h2>";
  const unitRow = document.createElement("div");
  unitRow.className = "pp-choices";
  unitRow.setAttribute("role", "group");
  unitRow.setAttribute("aria-label", "Einheiten");
  const unitButtons = (Object.keys(UNIT_LABELS) as Units[]).map((u) => {
    const b = document.createElement("button");
    b.className = "pp-btn";
    b.type = "button";
    b.textContent = UNIT_LABELS[u].name;
    b.addEventListener("click", () => {
      units = u;
      syncUnits();
      h.onUnits?.(u);
    });
    unitRow.append(b);
    return { u, b };
  });
  const syncUnits = () =>
    unitButtons.forEach(({ u, b }) => b.setAttribute("aria-pressed", String(u === units)));
  syncUnits();
  unitWrap.append(unitRow);
  bottom.append(unitWrap);
  bottom.append(go);
  // Datenschutz-Hinweis zur Live-Karte (PP-AK-17)
  const privacy = document.createElement("p");
  privacy.className = "pp-privacy";
  privacy.textContent =
    "Die Karte kommt von OpenStreetMap – dabei sieht deren Server deine Internet-Adresse.";
  bottom.append(privacy);
  el.append(top, bottom);
  layer.append(el);
  return {
    show: (v: boolean) => (el.style.display = v ? "" : "none"),
    get visible() {
      return el.style.display !== "none";
    },
  };
}
