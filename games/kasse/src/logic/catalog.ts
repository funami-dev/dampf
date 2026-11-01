/** Neutrale Waren ohne echte Marken (Spec: specs/games/kasse.md). Preise in Cent. */
export type Shape = "box" | "carton" | "bottle" | "can" | "bag" | "round" | "bunch" | "tray";

export interface Product {
  id: string;
  name: string;
  price: number;
  shape: Shape;
  /** Breite, Höhe, Tiefe in Metern */
  size: [number, number, number];
  color: string;
}

export const PRODUCTS: readonly Product[] = [
  {
    id: "milch",
    name: "Milch",
    price: 119,
    shape: "carton",
    size: [0.07, 0.2, 0.07],
    color: "#e8f1fb",
  },
  { id: "brot", name: "Brot", price: 249, shape: "bag", size: [0.24, 0.1, 0.12], color: "#c98b4a" },
  {
    id: "butter",
    name: "Butter",
    price: 229,
    shape: "box",
    size: [0.12, 0.04, 0.07],
    color: "#f5dc6b",
  },
  {
    id: "kaese",
    name: "Käse",
    price: 289,
    shape: "tray",
    size: [0.15, 0.03, 0.1],
    color: "#f2c04b",
  },
  { id: "eier", name: "Eier", price: 299, shape: "box", size: [0.2, 0.07, 0.11], color: "#d8c3a0" },
  {
    id: "joghurt",
    name: "Joghurt",
    price: 79,
    shape: "can",
    size: [0.08, 0.09, 0.08],
    color: "#ffffff",
  },
  {
    id: "aepfel",
    name: "Äpfel",
    price: 299,
    shape: "bag",
    size: [0.2, 0.14, 0.14],
    color: "#c0392b",
  },
  {
    id: "bananen",
    name: "Bananen",
    price: 199,
    shape: "bunch",
    size: [0.22, 0.06, 0.12],
    color: "#f4d03f",
  },
  {
    id: "tomaten",
    name: "Tomaten",
    price: 249,
    shape: "tray",
    size: [0.16, 0.07, 0.12],
    color: "#e74c3c",
  },
  {
    id: "nudeln",
    name: "Nudeln",
    price: 139,
    shape: "box",
    size: [0.1, 0.18, 0.05],
    color: "#f39c12",
  },
  {
    id: "saft",
    name: "Saft",
    price: 189,
    shape: "carton",
    size: [0.09, 0.22, 0.06],
    color: "#f5a623",
  },
  {
    id: "wasser",
    name: "Wasser",
    price: 59,
    shape: "bottle",
    size: [0.08, 0.3, 0.08],
    color: "#a9d4f5",
  },
  {
    id: "kaffee",
    name: "Kaffee",
    price: 599,
    shape: "box",
    size: [0.1, 0.16, 0.06],
    color: "#6b4a2f",
  },
  {
    id: "muesli",
    name: "Müsli",
    price: 349,
    shape: "box",
    size: [0.18, 0.25, 0.06],
    color: "#e1b866",
  },
  {
    id: "schokolade",
    name: "Schokolade",
    price: 129,
    shape: "box",
    size: [0.17, 0.015, 0.08],
    color: "#7a3e2b",
  },
  {
    id: "orangen",
    name: "Orangen",
    price: 279,
    shape: "bag",
    size: [0.2, 0.12, 0.14],
    color: "#f39c12",
  },
  {
    id: "gurke",
    name: "Gurke",
    price: 69,
    shape: "round",
    size: [0.3, 0.05, 0.05],
    color: "#3f8f3a",
  },
  {
    id: "reis",
    name: "Reis",
    price: 179,
    shape: "box",
    size: [0.12, 0.17, 0.05],
    color: "#f4f1e8",
  },
];

export const productById = (id: string) => PRODUCTS.find((p) => p.id === id);
