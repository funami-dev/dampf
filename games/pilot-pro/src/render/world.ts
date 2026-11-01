import * as THREE from "three";
import {
  AIRPORTS,
  BOUNDS,
  CITIES,
  LANDMARKS,
  RIVER,
  RIVER_WIDTH,
  dir,
  groundHeight,
  isWater,
  riverDistance,
  runwayAt,
} from "../logic/world.ts";
import { runwayTexture } from "./textures.ts";

/** Welt (Logik: x Ost, z Nord) → Three.js (x, y, −z). */
export const toThree = (x: number, y: number, z: number) => new THREE.Vector3(x, y, -z);

/** Kurs → Drehung um Y für Objekte, deren „vorn“ −Z ist. */
export const yaw = (heading: number) => (-heading * Math.PI) / 180;

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function buildWorld(scene: THREE.Scene) {
  scene.background = new THREE.Color(0x8ec5ff);
  scene.fog = new THREE.Fog(0x9fcdf5, 4000, 26_000);
  scene.add(new THREE.HemisphereLight(0xdfefff, 0x5d7a4a, 1.5));
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.8);
  sun.position.set(-3000, 6000, 2000);
  scene.add(sun);

  scene.add(terrain());
  scene.add(river());
  for (const a of AIRPORTS) scene.add(airport(a));
  scene.add(cities());
  scene.add(forests());
  scene.add(landmarks());
  scene.add(clouds());
}

function terrain() {
  const W = BOUNDS.maxX - BOUNDS.minX + 8000;
  const H = BOUNDS.maxZ - BOUNDS.minZ + 8000;
  const geo = new THREE.PlaneGeometry(W, H, 160, 260);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position!;
  const colors: number[] = [];
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = -pos.getZ(i);
    pos.setY(i, groundHeight(x, z) - 0.5);
    // Felder-Flickenteppich
    const cell =
      Math.sin(Math.floor(x / 700) * 12.9898 + Math.floor(z / 700) * 78.233) * 43758.5453;
    const f = cell - Math.floor(cell);
    const city = CITIES.some((ct) => Math.hypot(x - ct.x, z - ct.z) < ct.radius);
    if (city) c.setRGB(0.62, 0.62, 0.6);
    else if (f < 0.25) c.setRGB(0.55, 0.68, 0.32);
    else if (f < 0.45) c.setRGB(0.78, 0.74, 0.45);
    else if (f < 0.75) c.setRGB(0.42, 0.62, 0.3);
    else c.setRGB(0.36, 0.55, 0.28);
    if (riverDistance(x, z) < RIVER_WIDTH) c.setRGB(0.48, 0.6, 0.38);
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  mesh.name = "terrain";
  return mesh;
}

function river() {
  // Polylinie verdichten, dann als Band mit fester Breite aufbauen
  const pts: [number, number][] = [];
  for (let i = 1; i < RIVER.length; i++) {
    const [ax, az] = RIVER[i - 1]!;
    const [bx, bz] = RIVER[i]!;
    const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 250);
    for (let k = 0; k < n; k++) pts.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
  }
  pts.push(RIVER.at(-1)!);
  const verts: number[] = [];
  const idx: number[] = [];
  pts.forEach(([x, z], i) => {
    const [px, pz] = pts[Math.min(i + 1, pts.length - 1)]!;
    const [qx, qz] = pts[Math.max(i - 1, 0)]!;
    const dx = px - qx;
    const dz = pz - qz;
    const len = Math.hypot(dx, dz) || 1;
    const nx = (-dz / len) * (RIVER_WIDTH / 2);
    const nz = (dx / len) * (RIVER_WIDTH / 2);
    verts.push(x + nx, 0.4, -(z + nz), x - nx, 0.4, -(z - nz));
    if (i > 0) {
      const a = (i - 1) * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color: 0x3f7fb5,
      roughness: 0.25,
      metalness: 0.2,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  mesh.name = "rhein";
  return mesh;
}

function airport(a: (typeof AIRPORTS)[number]) {
  const g = new THREE.Group();
  g.name = `airport-${a.id}`;
  const tex = runwayTexture();
  const apron = new THREE.Mesh(
    new THREE.PlaneGeometry(1400, 900),
    new THREE.MeshLambertMaterial({
      color: 0x9a9d9f,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  apron.rotation.x = -Math.PI / 2;
  const r0 = a.runways[0]!;
  const [px, pz] = dir(r0.heading - 90);
  apron.position.copy(toThree(a.x + px * 650, 0.3, a.z + pz * 650));
  apron.rotation.z = yaw(r0.heading);
  g.add(apron);
  for (const r of a.runways) {
    const rw = new THREE.Mesh(
      new THREE.PlaneGeometry(r.width, r.length),
      new THREE.MeshLambertMaterial({
        map: tex,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
      }),
    );
    rw.rotation.x = -Math.PI / 2;
    rw.rotation.z = yaw(r.heading);
    rw.position.copy(toThree(r.cx, 0.6, r.cz));
    g.add(rw);
  }
  // Terminal und Tower
  const terminal = new THREE.Mesh(
    new THREE.BoxGeometry(600, 25, 90),
    new THREE.MeshLambertMaterial({ color: 0xd8dde3 }),
  );
  terminal.position.copy(toThree(a.x + px * 1000, 12.5, a.z + pz * 1000));
  terminal.rotation.y = yaw(r0.heading) + Math.PI / 2;
  g.add(terminal);
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(602, 8, 92),
    new THREE.MeshLambertMaterial({ color: 0x4a7aa0 }),
  );
  glass.position.copy(terminal.position).setY(18);
  glass.rotation.copy(terminal.rotation);
  g.add(glass);
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(6, 8, 70, 12),
    new THREE.MeshLambertMaterial({ color: 0xe6e6e6 }),
  );
  tower.position.copy(toThree(a.x + px * 800 + 300, 35, a.z + pz * 800));
  g.add(tower);
  const cab = new THREE.Mesh(
    new THREE.CylinderGeometry(14, 10, 10, 12),
    new THREE.MeshLambertMaterial({ color: 0x2f5d7c }),
  );
  cab.position.copy(tower.position).setY(75);
  g.add(cab);
  return g;
}

/** Freie Fläche für Bebauung/Bäume? */
function free(x: number, z: number, margin: number) {
  if (isWater(x, z) || riverDistance(x, z) < RIVER_WIDTH / 2 + margin) return false;
  if (runwayAt(x, z)) return false;
  if (AIRPORTS.some((a) => Math.hypot(x - a.x, z - a.z) < 2200)) return false;
  if (LANDMARKS.some((l) => Math.hypot(x - l.x, z - l.z) < 250)) return false;
  return true;
}

function cities() {
  const rand = rng(42);
  const matrices: THREE.Matrix4[] = [];
  const colors: THREE.Color[] = [];
  const palette = [0xd9d4cc, 0xc8beb0, 0xb9b3ab, 0xe8e4dc, 0xa89f94, 0xcfc6bb];
  for (const c of CITIES) {
    const count = Math.round((c.radius * c.radius) / 22_000);
    for (let i = 0; i < count; i++) {
      const ang = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * c.radius;
      const x = c.x + Math.cos(ang) * d;
      const z = c.z + Math.sin(ang) * d;
      if (!free(x, z, 60)) continue;
      const h = 8 + rand() * c.maxHeight * (1 - d / c.radius) + rand() * 10;
      const w = 25 + rand() * 45;
      const m = new THREE.Matrix4().compose(
        toThree(x, groundHeight(x, z) + h / 2, z),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI),
        new THREE.Vector3(w, h, w * (0.6 + rand() * 0.8)),
      );
      matrices.push(m);
      colors.push(new THREE.Color(palette[Math.floor(rand() * palette.length)]!));
    }
  }
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial(),
    matrices.length,
  );
  matrices.forEach((m, i) => {
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, colors[i]!);
  });
  mesh.name = "staedte";
  return mesh;
}

function forests() {
  const rand = rng(7);
  const matrices: THREE.Matrix4[] = [];
  for (let k = 0; k < 70; k++) {
    const cx = BOUNDS.minX + rand() * (BOUNDS.maxX - BOUNDS.minX);
    const cz = BOUNDS.minZ + rand() * (BOUNDS.maxZ - BOUNDS.minZ);
    if (CITIES.some((c) => Math.hypot(cx - c.x, cz - c.z) < c.radius + 500)) continue;
    for (let i = 0; i < 40; i++) {
      const x = cx + (rand() - 0.5) * 1400;
      const z = cz + (rand() - 0.5) * 1400;
      if (!free(x, z, 100)) continue;
      const h = 14 + rand() * 14;
      matrices.push(
        new THREE.Matrix4().compose(
          toThree(x, groundHeight(x, z) + h / 2, z),
          new THREE.Quaternion(),
          new THREE.Vector3(h * 0.45, h, h * 0.45),
        ),
      );
    }
  }
  const mesh = new THREE.InstancedMesh(
    new THREE.ConeGeometry(1, 1, 6),
    new THREE.MeshLambertMaterial({ color: 0x2f5a2a }),
    matrices.length,
  );
  matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.name = "waelder";
  return mesh;
}

function landmarks() {
  const g = new THREE.Group();
  const get = (id: string) => LANDMARKS.find((l) => l.id === id)!;
  const mat = (color: number) => new THREE.MeshLambertMaterial({ color });

  // Rheinturm: schlanker Schaft, Korb, Antenne
  const rt = get("rheinturm");
  const tower = new THREE.Group();
  tower.name = "rheinturm";
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(5, 9, 172, 16), mat(0xd7d7d2));
  shaft.position.y = 86;
  const pod = new THREE.Mesh(new THREE.CylinderGeometry(17, 12, 16, 20), mat(0x9aa3ab));
  pod.position.y = 172;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(8, 15, 8, 20), mat(0xd7d7d2));
  top.position.y = 184;
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2, 52, 8), mat(0xc0392b));
  antenna.position.y = 214;
  tower.add(shaft, pod, top, antenna);
  tower.position.copy(toThree(rt.x, 0, rt.z));
  g.add(tower);

  // Medienhafen: drei geschwungene Gebäude (weiß, silbern, Klinker)
  const mh = get("medienhafen");
  [0xf2f2ee, 0xb8c0c8, 0xa0553a].forEach((color, i) => {
    const b = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const part = new THREE.Mesh(new THREE.BoxGeometry(28, 50 + i * 6, 22), mat(color));
      part.position.set(k * 18, 25 + i * 3, Math.sin(k * 1.3) * 8);
      part.rotation.y = k * 0.35;
      b.add(part);
    }
    b.position.copy(toThree(mh.x + i * 110, 0, mh.z - i * 40));
    g.add(b);
  });

  // Kölner Dom: Langhaus, Querhaus, zwei spitze Türme (157 m)
  const dom = get("dom");
  const d = new THREE.Group();
  d.name = "dom";
  const stone = mat(0x5f5c57);
  const nave = new THREE.Mesh(new THREE.BoxGeometry(144, 45, 45), stone);
  nave.position.set(0, 22.5, 0);
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 26, 144, 4, 1), mat(0x3e4a4c));
  roof.rotation.z = Math.PI / 2;
  roof.rotation.x = Math.PI / 4;
  roof.position.set(0, 58, 0);
  roof.scale.set(1, 1, 0.7);
  const transept = new THREE.Mesh(new THREE.BoxGeometry(40, 45, 86), stone);
  transept.position.set(20, 22.5, 0);
  d.add(nave, roof, transept);
  for (const s of [-1, 1]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(26, 100, 26), stone);
    t.position.set(-72, 50, s * 22);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(15, 57, 4), stone);
    spire.position.set(-72, 128.5, s * 22);
    spire.rotation.y = Math.PI / 4;
    d.add(t, spire);
  }
  d.position.copy(toThree(dom.x, 0, dom.z));
  g.add(d);

  // Hohenzollernbrücke: Fahrbahn + drei Bögen über den Rhein (Ost-West)
  const br = get("hohenzollernbruecke");
  const bridge = new THREE.Group();
  bridge.name = "hohenzollernbruecke";
  const steel = mat(0x5f7d74);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(520, 4, 26), steel);
  deck.position.y = 14;
  bridge.add(deck);
  for (const k of [-1, 0, 1]) {
    for (const s of [-1, 1]) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(80, 2.2, 6, 24, Math.PI), steel);
      arch.position.set(k * 165, 14, s * 11);
      arch.scale.set(1, 0.45, 1);
      bridge.add(arch);
    }
  }
  bridge.position.copy(toThree(br.x, 0, br.z));
  g.add(bridge);

  // weitere Brücken in Düsseldorf
  for (const z of [12_200, 15_200]) {
    const t = (z - 11_000) / 3000;
    const x = -4000 + (-7300 + 4000) * Math.min(1, Math.max(0, t));
    const b = new THREE.Mesh(new THREE.BoxGeometry(520, 4, 30), mat(0xb7b7b2));
    b.position.copy(toThree(x, 12, z));
    b.rotation.y = 0.6;
    g.add(b);
  }
  return g;
}

function clouds() {
  const rand = rng(99);
  const g = new THREE.Group();
  g.name = "wolken";
  const mat = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    emissive: 0x9aa7b4,
    transparent: true,
    opacity: 0.92,
  });
  const geo = new THREE.SphereGeometry(1, 10, 8);
  for (let i = 0; i < 45; i++) {
    const x = BOUNDS.minX + rand() * (BOUNDS.maxX - BOUNDS.minX);
    const z = BOUNDS.minZ + rand() * (BOUNDS.maxZ - BOUNDS.minZ);
    const y = 1400 + rand() * 1600;
    const cloud = new THREE.Group();
    for (let k = 0; k < 6; k++) {
      const s = 120 + rand() * 160;
      const puff = new THREE.Mesh(geo, mat);
      puff.scale.set(s * 1.4, s * 0.6, s);
      puff.position.set((rand() - 0.5) * 400, (rand() - 0.5) * 60, (rand() - 0.5) * 250);
      cloud.add(puff);
    }
    cloud.position.copy(toThree(x, y, z));
    g.add(cloud);
  }
  return g;
}
