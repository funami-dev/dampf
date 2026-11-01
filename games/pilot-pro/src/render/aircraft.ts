import * as THREE from "three";
import type { Aircraft, Airline } from "../logic/catalog.ts";
import { fuselageSideTexture, tailTexture } from "./textures.ts";

/**
 * Low-Poly-Flugzeug. Nase zeigt nach -Z, rechte Tragfläche nach +X, oben = +Y.
 * Ursprung: Rumpfmitte; `userData.gearHeight` = Abstand Rumpfmitte → Boden.
 */
export function buildAircraft(type: Aircraft, airline: Airline): THREE.Group {
  const L = type.length;
  const r = type.diameter / 2;
  const group = new THREE.Group();
  group.name = "aircraft";
  const white = new THREE.MeshStandardMaterial({
    color: 0xf7f8fa,
    roughness: 0.45,
    metalness: 0.15,
  });
  const grey = new THREE.MeshStandardMaterial({ color: 0xc9ced6, roughness: 0.5, metalness: 0.3 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.6 });
  const tailMat = new THREE.MeshStandardMaterial({ color: airline.tail, roughness: 0.5 });
  const bellyMat = new THREE.MeshStandardMaterial({ color: airline.belly, roughness: 0.5 });

  // Rumpf (A380: höher, doppelstöckig)
  const body = new THREE.Group();
  const bodyLen = L * 0.74;
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r, bodyLen, 28), white);
  cyl.rotation.x = Math.PI / 2;
  body.add(cyl);
  const belly = new THREE.Mesh(
    new THREE.CylinderGeometry(
      r * 1.01,
      r * 1.01,
      bodyLen * 0.98,
      28,
      1,
      true,
      -Math.PI * 0.3,
      Math.PI * 0.6,
    ),
    bellyMat,
  );
  belly.rotation.x = Math.PI / 2;
  body.add(belly);
  const nose = new THREE.Mesh(
    new THREE.SphereGeometry(r, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    white,
  );
  nose.rotation.x = -Math.PI / 2;
  nose.scale.set(1, 1.9, 1);
  nose.position.z = -bodyLen / 2;
  body.add(nose);
  const tailCone = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.25, L * 0.2, 24), white);
  tailCone.rotation.x = -Math.PI / 2;
  tailCone.position.set(0, r * 0.35, bodyLen / 2 + L * 0.1);
  tailCone.scale.set(1, 1, 0.8);
  body.add(tailCone);
  if (type.decks === 2) body.scale.y = 1.32;
  group.add(body);
  const bodyH = r * body.scale.y;

  // Seiten-Decals: Fenster + Name
  for (const side of [1, -1] as const) {
    const mat = new THREE.MeshBasicMaterial({
      // Rechte Seite: Textur-u läuft vom Heck zur Nase → spiegeln, damit die Nase vorn liegt.
      map: fuselageSideTexture(airline, type.decks, side === 1),
      transparent: true,
      depthWrite: false,
    });
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(bodyLen * 1.05, bodyH * 1.7), mat);
    decal.name = side === 1 ? "name-right" : "name-left";
    decal.rotation.y = (side * Math.PI) / 2;
    decal.position.set(side * (r + 0.03), bodyH * 0.05, -L * 0.02);
    group.add(decal);
  }

  // Tragflächen (gepfeilt)
  const wingRoot = L * 0.2;
  const half = type.span / 2;
  const sweep = Math.tan((28 * Math.PI) / 180);
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.lineTo(half, half * sweep);
  wingShape.lineTo(half, half * sweep + wingRoot * 0.28);
  wingShape.lineTo(0, wingRoot);
  wingShape.closePath();
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: r * 0.18, bevelEnabled: false });
  for (const side of [1, -1] as const) {
    const wing = new THREE.Mesh(wingGeo, grey);
    wing.rotation.x = Math.PI / 2;
    wing.scale.x = side;
    wing.position.set(0, -bodyH * 0.45, -L * 0.1);
    group.add(wing);
    // Triebwerke
    const positions = type.engines === 4 ? [0.34, 0.64] : [0.36];
    for (const p of positions) {
      const ex = side * half * p;
      const ez = -L * 0.1 + half * p * sweep - L * 0.035;
      const eng = new THREE.Mesh(
        new THREE.CylinderGeometry(r * 0.42, r * 0.36, L * 0.11, 20),
        white,
      );
      eng.rotation.x = Math.PI / 2;
      eng.position.set(ex, -bodyH * 0.45 - r * 0.55, ez);
      group.add(eng);
      const inlet = new THREE.Mesh(new THREE.CircleGeometry(r * 0.36, 20), dark);
      inlet.position.set(ex, eng.position.y, ez - L * 0.055 - 0.01);
      inlet.rotation.y = Math.PI;
      group.add(inlet);
    }
  }

  // Höhenleitwerk
  const hHalf = half * 0.36;
  const hRoot = L * 0.1;
  const hShape = new THREE.Shape();
  hShape.moveTo(0, 0);
  hShape.lineTo(hHalf, hHalf * sweep * 1.1);
  hShape.lineTo(hHalf, hHalf * sweep * 1.1 + hRoot * 0.4);
  hShape.lineTo(0, hRoot);
  hShape.closePath();
  const hGeo = new THREE.ExtrudeGeometry(hShape, { depth: r * 0.1, bevelEnabled: false });
  for (const side of [1, -1] as const) {
    const h = new THREE.Mesh(hGeo, grey);
    h.rotation.x = Math.PI / 2;
    h.scale.x = side;
    h.position.set(0, bodyH * 0.3, L * 0.36);
    group.add(h);
  }

  // Seitenleitwerk mit Lackierung
  const finH = bodyH * 2.2 + L * 0.04;
  const finRoot = L * 0.2;
  const finPoly: [number, number][] = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0.62, 1],
  ];
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.lineTo(finRoot, 0);
  finShape.lineTo(finRoot, finH);
  finShape.lineTo(finRoot * 0.62, finH);
  finShape.closePath();
  const thick = r * 0.14;
  const fin = new THREE.Mesh(
    new THREE.ExtrudeGeometry(finShape, { depth: thick, bevelEnabled: false }),
    tailMat,
  );
  // Shape-x → Länge nach hinten (+Z), Shape-y → Höhe
  fin.rotation.y = -Math.PI / 2;
  const finZ0 = bodyLen / 2 - finRoot * 0.55;
  // Extrusion läuft nach -X; so liegt das Leitwerk mittig (−thick/2 … +thick/2).
  fin.position.set(thick / 2, bodyH * 0.6, finZ0);
  group.add(fin);
  for (const side of [1, -1] as const) {
    const poly = side === -1 ? finPoly : finPoly.map(([x, y]) => [1 - x, y] as [number, number]);
    const decal = new THREE.Mesh(
      new THREE.PlaneGeometry(finRoot, finH),
      new THREE.MeshStandardMaterial({
        map: tailTexture(airline, poly),
        transparent: true,
        roughness: 0.5,
      }),
    );
    decal.rotation.y = (side * Math.PI) / 2;
    decal.position.set(side * (thick / 2 + 0.02), bodyH * 0.6 + finH / 2, finZ0 + finRoot / 2);
    group.add(decal);
  }

  // Fahrwerk (angedeutet)
  const gearHeight = bodyH + r * 0.9;
  for (const [gx, gz] of [
    [0, -L * 0.36],
    [r * 1.1, L * 0.02],
    [-r * 1.1, L * 0.02],
  ] as const) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, r * 0.9, 8), grey);
    leg.position.set(gx, -bodyH - r * 0.45, gz);
    group.add(leg);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.28, r * 0.28, 0.6, 12), dark);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(gx, -gearHeight + r * 0.28, gz);
    group.add(wheel);
  }

  group.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = false;
  });
  group.userData = {
    gearHeight,
    length: L,
    radius: bodyH,
    airlineName: airline.name,
    aircraftName: type.name,
  };
  return group;
}
