import { describe, expect, it } from "vitest";
import { FLOOR_Y, FURNITURE, WICHTEL, WINDOW, itemBox, windowX } from "./furniture.ts";

describe("WH-AK-15: Möbelplan", () => {
  for (const roomW of [120, 150])
    it(`Räume ${roomW} Punkte breit: alles im Raum, Fenster frei`, () => {
      const wx = windowX(roomW);
      for (const [room, items] of Object.entries(FURNITURE))
        for (const it of items) {
          const b = itemBox(it, roomW);
          const name = `${room}/${it.key}`;
          expect(b.x, name).toBeGreaterThanOrEqual(3);
          expect(b.x + b.w, name).toBeLessThanOrEqual(roomW);
          expect(b.y, name).toBeGreaterThanOrEqual(0);
          expect(b.y + b.h, name).toBeLessThanOrEqual(FLOOR_Y);
          const overlapX = b.x < wx + WINDOW.w && b.x + b.w > wx;
          const overlapY = b.y < WINDOW.y + WINDOW.h + 2;
          expect(overlapX && overlapY, `${name} verdeckt das Fenster`).toBe(false);
        }
    });

  it("Wichtel höchstens 44 Punkte hoch, drei gleich große Bilder", () => {
    expect(WICHTEL.h).toBeLessThanOrEqual(44);
    expect(WICHTEL.frames).toHaveLength(3);
  });
});
