import { browserStore, load, save, type SaveData } from "./logic/records.ts";

const store = browserStore();

/** Ob Rekorde in diesem Browser gespeichert werden können. */
export const canSave = store !== null;
export const loadData = (): SaveData => load(store);
export const saveData = (data: SaveData): boolean => save(store, data);
