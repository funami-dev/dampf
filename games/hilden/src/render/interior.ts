import * as THREE from "three";

/** Innenraum des eigenen Hauses (feste Einrichtung). Tür bei (0, 0, 4.6), Blick ins Zimmer = −Z. */
export const INTERIOR_DOOR = new THREE.Vector3(0, 0, 4.3);

export function buildInterior(scene: THREE.Scene) {
  scene.background = new THREE.Color(0x2b2420);
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x6b5a48, 1.6));
  const lamp = new THREE.PointLight(0xffe2b0, 40, 20);
  lamp.position.set(0, 2.6, 0);
  scene.add(lamp);
  const m = (color: number) => new THREE.MeshLambertMaterial({ color });
  const box = (w: number, h: number, d: number, color: number, x: number, y: number, z: number) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m(color));
    b.position.set(x, y, z);
    scene.add(b);
    return b;
  };
  // Raum 8 × 10 m
  box(8, 0.1, 10, 0xb98a5a, 0, -0.05, 0); // Boden
  box(8, 3, 0.1, 0xf3e6c8, 0, 1.5, -5); // Wände
  box(0.1, 3, 10, 0xf3e6c8, -4, 1.5, 0);
  box(0.1, 3, 10, 0xf3e6c8, 4, 1.5, 0);
  box(3, 3, 0.1, 0xf3e6c8, -2.5, 1.5, 5);
  box(3, 3, 0.1, 0xf3e6c8, 2.5, 1.5, 5);
  box(2, 0.6, 0.1, 0xf3e6c8, 0, 2.7, 5);
  box(1.6, 2.3, 0.05, 0x8a5a3a, 0, 1.15, 5.03); // Tür
  box(5, 0.05, 3, 0x3b8ef0, 0, 0.03, 0); // Teppich
  // Bett
  box(1.6, 0.45, 2.2, 0x6b4a2f, -2.9, 0.23, -3.6);
  box(1.5, 0.15, 2.1, 0xffffff, -2.9, 0.53, -3.6);
  box(1.5, 0.12, 1.3, 0x3b8ef0, -2.9, 0.63, -3.2);
  box(0.8, 0.15, 0.5, 0xfff1d6, -2.9, 0.66, -4.4);
  // Sofa + Fernseher
  box(2.4, 0.5, 0.9, 0xd35b4a, 2.6, 0.25, 1.2);
  box(2.4, 0.7, 0.25, 0xd35b4a, 2.6, 0.6, 1.6);
  box(1.6, 0.9, 0.08, 0x111111, 2.6, 1.4, -1.6);
  box(1.2, 0.5, 0.5, 0x6b4a2f, 2.6, 0.25, -1.5);
  // Tisch, Stühle, Küche
  box(1.4, 0.08, 0.9, 0xc89a5b, -1.2, 0.75, 1.2);
  for (const [x, z] of [
    [-1.8, 1.2],
    [-0.6, 1.2],
  ])
    box(0.45, 0.45, 0.45, 0xa0764a, x!, 0.23, z! + 0.8);
  box(3.2, 0.9, 0.6, 0xe9e9e9, 1.2, 0.45, -4.6);
  box(3.2, 0.06, 0.62, 0x555555, 1.2, 0.92, -4.6);
  // Bild an der Wand
  box(1.2, 0.8, 0.05, 0x5fa34a, -3.95, 1.8, 0.5).rotation.y = Math.PI / 2;
}
