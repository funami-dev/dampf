import * as THREE from "three";
import {
  CELL,
  Cell,
  HALF,
  ITTER,
  JOB_BOARD,
  N,
  STREETS,
  WORKPLACES,
  type City,
} from "../logic/city.ts";
import { drawCity } from "./mapCanvas.ts";

/** Logik (x Ost, z Nord) → Three.js (x, y, −z) */
export const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, -z);

function canvasTexture(c: HTMLCanvasElement, repeat = false) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function textSprite(text: string, color = "#1d2a38", bg = "rgba(255,255,255,0.88)", scale = 1) {
  const c = document.createElement("canvas");
  const g = c.getContext("2d")!;
  g.font = "bold 44px system-ui, sans-serif";
  const w = Math.ceil(g.measureText(text).width) + 40;
  c.width = w;
  c.height = 72;
  g.fillStyle = bg;
  g.beginPath();
  g.roundRect(0, 0, w, 72, 18);
  g.fill();
  g.font = "bold 44px system-ui, sans-serif";
  g.fillStyle = color;
  g.textBaseline = "middle";
  g.fillText(text, 20, 38);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(c), depthTest: true }));
  s.scale.set((w / 72) * 3 * scale, 3 * scale, 1);
  return s;
}

/** Fassadentextur: Fensterraster, kachelbar (1 Kachel = 3 m × 3 m). */
function facadeTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = "#5b7186";
  g.fillRect(16, 14, 32, 30);
  g.fillStyle = "#c9d6e2";
  g.fillRect(18, 16, 13, 12);
  return canvasTexture(c, true);
}

export function buildCityScene(scene: THREE.Scene, city: City) {
  scene.background = new THREE.Color(0xa9d4f5);
  scene.fog = new THREE.Fog(0xa9d4f5, 180, 700);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6b8f55, 1.5));
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.6);
  sun.position.set(-200, 400, 150);
  scene.add(sun);

  // Boden: eine Textur aus dem Raster
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(N * CELL, N * CELL),
    new THREE.MeshLambertMaterial({ map: canvasTexture(drawCity(city, 6)) }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.name = "boden";
  scene.add(ground);

  scene.add(buildings(city));
  scene.add(trees(city));
  scene.add(rails());
  scene.add(church());
  scene.add(station());
  for (const w of WORKPLACES) scene.add(workplace(w));
  scene.add(jobBoard());
  for (const s of STREETS) {
    const mid = s.points[Math.floor(s.points.length / 2) - (s.points.length % 2 === 0 ? 1 : 0)]!;
    const nxt = s.points[Math.min(s.points.length - 1, s.points.indexOf(mid) + 1)]!;
    const label = textSprite(s.name);
    label.position.copy(v3((mid[0] + nxt[0]) / 2, 9, (mid[1] + nxt[1]) / 2));
    scene.add(label);
  }
  const itter = textSprite("Itter", "#ffffff", "rgba(40,110,170,0.85)");
  itter.position.copy(v3(ITTER[2]![0], 5, ITTER[2]![1]));
  scene.add(itter);
}

/** Gebäude: gleich hohe Felder zu Rechtecken zusammenfassen, als ein Mesh mit Fenstertextur. */
function buildings(city: City) {
  const seen = new Uint8Array(city.cells.length);
  const pos: number[] = [];
  const uv: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const palette = [0xf0e6d8, 0xe6d3bc, 0xd9c2a5, 0xf2efe9, 0xcfd6dd, 0xe9d8c9, 0xbfa58a];
  const roofCol = new THREE.Color(0x9a5a48);
  const flatRoof = new THREE.Color(0x8d8f93);
  const c = new THREE.Color();
  const quad = (p: number[][], u: number[][], color: THREE.Color) => {
    const base = pos.length / 3;
    p.forEach((q, k) => {
      pos.push(q[0]!, q[1]!, q[2]!);
      uv.push(u[k]![0]!, u[k]![1]!);
      col.push(color.r, color.g, color.b);
    });
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  for (let i = 0; i < city.cells.length; i++) {
    if (seen[i] || city.cells[i] !== Cell.Building || city.heights[i] === 0) continue;
    const h = city.heights[i]!;
    const c0 = i % N;
    const r0 = Math.floor(i / N);
    const same = (cc: number, rr: number) => {
      const j = rr * N + cc;
      return (
        cc < N && rr < N && !seen[j] && city.cells[j] === Cell.Building && city.heights[j] === h
      );
    };
    let w = 1;
    while (same(c0 + w, r0)) w++;
    let d = 1;
    while ([...Array(w).keys()].every((k) => same(c0 + k, r0 + d))) d++;
    for (let rr = r0; rr < r0 + d; rr++) for (let cc = c0; cc < c0 + w; cc++) seen[rr * N + cc] = 1;

    const x0 = c0 * CELL - HALF;
    const x1 = x0 + w * CELL;
    const z0 = r0 * CELL - HALF;
    const z1 = z0 + d * CELL;
    const hash = Math.abs(Math.sin(c0 * 12.9898 + r0 * 78.233) * 43758.5453) % 1;
    c.setHex(palette[Math.floor(hash * palette.length)]!);
    const T = 3; // Fensterraster in Metern
    // Wände (Three.js: z = −Nord)
    quad(
      [
        [x0, 0, -z0],
        [x1, 0, -z0],
        [x1, h, -z0],
        [x0, h, -z0],
      ],
      [
        [0, 0],
        [(x1 - x0) / T, 0],
        [(x1 - x0) / T, h / T],
        [0, h / T],
      ],
      c,
    ); // Süd
    quad(
      [
        [x1, 0, -z1],
        [x0, 0, -z1],
        [x0, h, -z1],
        [x1, h, -z1],
      ],
      [
        [0, 0],
        [(x1 - x0) / T, 0],
        [(x1 - x0) / T, h / T],
        [0, h / T],
      ],
      c,
    ); // Nord
    quad(
      [
        [x1, 0, -z0],
        [x1, 0, -z1],
        [x1, h, -z1],
        [x1, h, -z0],
      ],
      [
        [0, 0],
        [(z1 - z0) / T, 0],
        [(z1 - z0) / T, h / T],
        [0, h / T],
      ],
      c,
    ); // Ost
    quad(
      [
        [x0, 0, -z1],
        [x0, 0, -z0],
        [x0, h, -z0],
        [x0, h, -z1],
      ],
      [
        [0, 0],
        [(z1 - z0) / T, 0],
        [(z1 - z0) / T, h / T],
        [0, h / T],
      ],
      c,
    ); // West
    quad(
      [
        [x0, h, -z0],
        [x1, h, -z0],
        [x1, h, -z1],
        [x0, h, -z1],
      ],
      [
        [0.6, 0.05],
        [0.6, 0.05],
        [0.6, 0.05],
        [0.6, 0.05],
      ],
      h <= 8 ? roofCol : flatRoof,
    ); // Dach
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshLambertMaterial({ vertexColors: true, map: facadeTexture() }),
  );
  mesh.name = "gebaeude";
  return mesh;
}

function trees(city: City) {
  const spots: THREE.Vector3[] = [];
  for (let i = 0; i < city.cells.length; i += 3) {
    const t = city.cells[i];
    const [x, z] = city.center(i);
    const h = Math.abs(Math.sin(i * 1.7)) % 1;
    if (t === Cell.Park && h < 0.35) spots.push(v3(x + h * 3, 0, z));
    else if (t === Cell.Grass && h < 0.05) spots.push(v3(x, 0, z));
  }
  const g = new THREE.Group();
  const trunk = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.25, 0.35, 3, 6),
    new THREE.MeshLambertMaterial({ color: 0x6b4a2f }),
    spots.length,
  );
  const crown = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(2.4, 0),
    new THREE.MeshLambertMaterial({ color: 0x3f7f35, flatShading: true }),
    spots.length,
  );
  const m = new THREE.Matrix4();
  spots.forEach((p, k) => {
    m.makeTranslation(p.x, 1.5, p.z);
    trunk.setMatrixAt(k, m);
    const s = 0.8 + (k % 5) * 0.12;
    m.compose(
      new THREE.Vector3(p.x, 4.2 * s, p.z),
      new THREE.Quaternion(),
      new THREE.Vector3(s, s * 1.1, s),
    );
    crown.setMatrixAt(k, m);
  });
  g.add(trunk, crown);
  g.name = "baeume";
  return g;
}

function rails() {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0x8a8f96 });
  for (const dx of [-2.5, -1, 1, 2.5]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, N * CELL), mat);
    r.position.set(735 + dx, 0.1, 0);
    g.add(r);
  }
  return g;
}

function church() {
  // Reformationskirche: Langhaus, hoher Westturm mit spitzem Helm
  const g = new THREE.Group();
  g.name = "reformationskirche";
  const brick = new THREE.MeshLambertMaterial({ color: 0x9c5a46 });
  const slate = new THREE.MeshLambertMaterial({ color: 0x3b4650 });
  const nave = new THREE.Mesh(new THREE.BoxGeometry(32, 14, 18), brick);
  nave.position.set(4, 7, 0);
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 11, 32, 4, 1), slate);
  roof.rotation.z = Math.PI / 2;
  roof.rotation.x = Math.PI / 4;
  roof.scale.set(1, 1, 0.75);
  roof.position.set(4, 18, 0);
  const tower = new THREE.Mesh(new THREE.BoxGeometry(9, 26, 9), brick);
  tower.position.set(-15, 13, 0);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(6.4, 24, 8), slate);
  spire.position.set(-15, 38, 0);
  const cross = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 3, 0.3),
    new THREE.MeshLambertMaterial({ color: 0xd4af37 }),
  );
  cross.position.set(-15, 51.5, 0);
  g.add(nave, roof, tower, spire, cross);
  g.position.copy(v3(-5, 0, 48));
  return g;
}

function station() {
  const g = new THREE.Group();
  g.name = "bahnhof";
  const wall = new THREE.MeshLambertMaterial({ color: 0xe4d8c4 });
  const main = new THREE.Mesh(new THREE.BoxGeometry(70, 10, 75), wall);
  main.position.y = 5;
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(72, 1.2, 77),
    new THREE.MeshLambertMaterial({ color: 0x5a6670 }),
  );
  roof.position.y = 10.6;
  const clock = new THREE.Mesh(new THREE.BoxGeometry(8, 18, 8), wall);
  clock.position.set(-30, 9, 0);
  const face = new THREE.Mesh(
    new THREE.CircleGeometry(2.4, 24),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  );
  face.position.set(-34.05, 14, 0);
  face.rotation.y = -Math.PI / 2;
  g.add(main, roof, clock, face);
  const sign = textSprite("Bahnhof Hilden", "#ffffff", "rgba(30,60,120,0.9)", 1.3);
  sign.position.set(-36, 21, 0);
  g.add(sign);
  g.position.copy(v3(675, 0, -262));
  return g;
}

function workplace(w: (typeof WORKPLACES)[number]) {
  const [x0, z0, x1, z1] = w.rect;
  const g = new THREE.Group();
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(x1 - x0, 9, z1 - z0),
    new THREE.MeshLambertMaterial({ color: 0xf2efe9 }),
  );
  box.position.copy(v3((x0 + x1) / 2, 4.5, (z0 + z1) / 2));
  const band = new THREE.Mesh(
    new THREE.BoxGeometry(x1 - x0 + 0.2, 1.6, z1 - z0 + 0.2),
    new THREE.MeshLambertMaterial({ color: w.color }),
  );
  band.position.copy(box.position).setY(7.6);
  const sign = textSprite(w.sign, "#ffffff", `#${w.color.toString(16).padStart(6, "0")}`, 1.2);
  sign.position.copy(v3(w.door[0], 11, w.door[1]));
  g.add(box, band, sign);
  g.name = `arbeitsort-${w.id}`;
  return g;
}

function jobBoard() {
  const g = new THREE.Group();
  const post1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 2.6, 0.2),
    new THREE.MeshLambertMaterial({ color: 0x5a3e2b }),
  );
  const post2 = post1.clone();
  post1.position.set(-1.1, 1.3, 0);
  post2.position.set(1.1, 1.3, 0);
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 1.6, 0.15),
    new THREE.MeshLambertMaterial({ color: 0xc89a5b }),
  );
  board.position.y = 2;
  const sign = textSprite("Jobbrett", "#1d2a38", "rgba(255,204,0,0.95)");
  sign.position.y = 3.8;
  g.add(post1, post2, board, sign);
  g.position.copy(v3(JOB_BOARD[0], 0, JOB_BOARD[1]));
  g.name = "jobbrett";
  return g;
}

export { textSprite };
