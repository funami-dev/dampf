import { AIRCRAFT, AIRLINES } from "../logic/catalog.ts";

export interface MenuHandlers {
  onChange(aircraft: string, airline: string): void;
  onStart(): void;
}

/** Auswahlmenü (DOM über dem 3D-Bild). */
export function createMenu(
  layer: HTMLElement,
  initial: { aircraft: string; airline: string },
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
  bottom.append(go);
  el.append(top, bottom);
  layer.append(el);
  return {
    show: (v: boolean) => (el.style.display = v ? "" : "none"),
    get visible() {
      return el.style.display !== "none";
    },
  };
}
