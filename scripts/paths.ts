import { fileURLToPath } from "node:url";

export const root = fileURLToPath(new URL("../", import.meta.url));
export const gamesDir = fileURLToPath(new URL("../games/", import.meta.url));
export const portalDist = fileURLToPath(new URL("../apps/portal/dist/", import.meta.url));
export const dist = fileURLToPath(new URL("../dist/", import.meta.url));
