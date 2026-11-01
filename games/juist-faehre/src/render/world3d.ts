import * as THREE from "three";
import {
  BERTHS,
  BUOYS,
  COAST_Z,
  JUIST,
  JUIST_BASIN,
  JUIST_MOLES,
  NORDDEICH_BASIN,
  NORDDEICH_MOLES,
  SANDBANKS,
  type Pt,
} from "../logic/world.ts";

/** Logik (x Ost, z Nord) → Three.js (x, y, −z) */
export const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, -z);

export function textSprite(
  text: string,
  color = "#12324f",
  bg = "rgba(255,255,255,0.9)",
  scale = 1,
) {
  const c = document.createElement("canvas");
  const g = c.getContext("2d")!;
  g.font = "bold 48px system-ui, sans-serif";
  const w = Math.ceil(g.measureText(text).width) + 44;
  c.width = w;
  c.height = 76;
  g.fillStyle = bg;
  g.beginPath();
  g.roundRect(0, 0, w, 76, 20);
  g.fill();
  g.font = "bold 48px system-ui, sans-serif";
  g.fillStyle = color;
  g.textBaseline = "middle";
  g.fillText(text, 22, 40);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t }));
  s.scale.set((w / 76) * 14 * scale, 14 * scale, 1);
  return s;
}

/** Flache Landfläche aus einem Polygon (Logik-Koordinaten), extrudiert nach oben. */
function land(points: Pt[], height: number, color: number) {
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, z)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color }));
  m.position.y = -0.5;
  return m;
}

function waveTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  g.strokeStyle = "rgba(255,255,255,0.35)";
  g.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const y = (i * 128) / 9 + 6;
    const x = (i * 37) % 128;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + 10, y - 4, x + 22, y);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(160, 160);
  return t;
}

export function buildWorld(scene: THREE.Scene) {
  scene.background = new THREE.Color(0xa9d4f5);
  scene.fog = new THREE.Fog(0xb8dcf5, 1200, 5200);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x4d7a8a, 1.5));
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.6);
  sun.position.set(-800, 1500, 600);
  scene.add(sun);

  // Wasser + bewegte Wellenlinien
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(12_000, 12_000),
    new THREE.MeshStandardMaterial({ color: 0x2f6f8f, roughness: 0.35, metalness: 0.1 }),
  );
  water.rotation.x = -Math.PI / 2;
  scene.add(water);
  const waves = waveTexture();
  const waveMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(12_000, 12_000),
    new THREE.MeshBasicMaterial({ map: waves, transparent: true, depthWrite: false }),
  );
  waveMesh.rotation.x = -Math.PI / 2;
  waveMesh.position.y = 0.05;
  scene.add(waveMesh);

  // Sandbänke (Watt) mit hellem Flachwasser-Saum
  for (const s of SANDBANKS) {
    const shallow = new THREE.Mesh(
      new THREE.CircleGeometry(1, 40),
      new THREE.MeshBasicMaterial({ color: 0x5fa7b8, transparent: true, opacity: 0.8 }),
    );
    shallow.rotation.x = -Math.PI / 2;
    shallow.scale.set(s.rx * 1.3, s.rz * 1.3, 1);
    shallow.position.copy(v3(s.x, 0.1, s.z));
    const sand = new THREE.Mesh(
      new THREE.CircleGeometry(1, 40),
      new THREE.MeshLambertMaterial({ color: 0xd8c79a }),
    );
    sand.rotation.x = -Math.PI / 2;
    sand.scale.set(s.rx, s.rz, 1);
    sand.position.copy(v3(s.x, 0.3, s.z));
    scene.add(shallow, sand);
  }

  // Festland Norddeich mit Hafenbecken
  const [bx0, bz0, bx1] = NORDDEICH_BASIN;
  scene.add(
    land(
      [
        [-6000, COAST_Z],
        [bx0, COAST_Z],
        [bx0, bz0],
        [bx1, bz0],
        [bx1, COAST_Z],
        [6000, COAST_Z],
        [6000, -8000],
        [-6000, -8000],
      ],
      3,
      0x7fae5e,
    ),
  );
  for (const side of [-1, 1]) {
    const dike = new THREE.Mesh(
      new THREE.BoxGeometry(5800, 7, 30),
      new THREE.MeshLambertMaterial({ color: 0x6f9e52 }),
    );
    dike.position.copy(v3(side * (bx1 + 2900), 3, COAST_Z - 40));
    scene.add(dike);
  }
  for (const m of [...NORDDEICH_MOLES, ...JUIST_MOLES]) {
    const [x0, z0, x1, z1] = m;
    const mole = new THREE.Mesh(
      new THREE.BoxGeometry(x1 - x0, 4, z1 - z0),
      new THREE.MeshLambertMaterial({ color: 0x9a9a92 }),
    );
    mole.position.copy(v3((x0 + x1) / 2, 1.5, (z0 + z1) / 2));
    scene.add(mole);
  }
  // Juist mit Hafenbecken
  const pts: Pt[] = [];
  const [jx0, jz0, jx1, jz1] = JUIST_BASIN;
  const edgeZ = (x: number) => JUIST.z - JUIST.rz * Math.sqrt(1 - (x / JUIST.rx) ** 2);
  for (let a = 0; a <= 64; a++) {
    const ang = Math.PI + (a / 64) * Math.PI; // Südseite von West nach Ost
    const x = JUIST.x + Math.cos(ang) * JUIST.rx;
    if (x > jx0 && pts.length && pts.at(-1)![0] < jx0) {
      pts.push([jx0, edgeZ(jx0)], [jx0, jz1], [jx1, jz1], [jx1, edgeZ(jx1)]);
    }
    if (x > jx0 && x < jx1) continue;
    pts.push([x, JUIST.z + Math.sin(ang) * JUIST.rz]);
  }
  for (let a = 1; a < 64; a++) {
    const ang = (a / 64) * Math.PI; // Nordseite von Ost nach West
    pts.push([JUIST.x + Math.cos(ang) * JUIST.rx, JUIST.z + Math.sin(ang) * JUIST.rz]);
  }
  scene.add(land(pts, 2.5, 0xe2d3a5));
  void jz0;
  // Dünen und Ort auf Juist
  const dune = new THREE.MeshLambertMaterial({ color: 0x9cbf73 });
  for (let i = 0; i < 40; i++) {
    const x = -3600 + i * 185 + ((i * 53) % 70);
    if (Math.abs(x) < 400) continue;
    const z = JUIST.z + 120 + ((i * 97) % 160) - 80;
    const d = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), dune);
    d.scale.set(90, 18 + (i % 4) * 5, 60);
    d.position.copy(v3(x, 0, z));
    scene.add(d);
  }
  const houseWall = new THREE.MeshLambertMaterial({ color: 0xf3efe6 });
  const roof = new THREE.MeshLambertMaterial({ color: 0xa8433a });
  const village = (cx: number, cz: number, n: number, seed: number) => {
    for (let i = 0; i < n; i++) {
      const x = cx + (((i * 73 + seed) % 23) - 11) * 22;
      const z = cz + (((i * 41 + seed) % 11) - 5) * 26;
      const h = new THREE.Mesh(new THREE.BoxGeometry(14, 7, 10), houseWall);
      h.position.copy(v3(x, 5, z));
      const r = new THREE.Mesh(new THREE.ConeGeometry(10, 6, 4), roof);
      r.position.copy(v3(x, 11.5, z));
      r.rotation.y = Math.PI / 4;
      r.scale.set(1, 1, 0.75);
      scene.add(h, r);
    }
  };
  village(-320, JUIST.z + 30, 26, 3);
  village(320, JUIST.z + 30, 22, 7);
  village(-450, COAST_Z - 250, 30, 11);
  village(450, COAST_Z - 260, 26, 5);
  // Wasserturm auf Juist
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(5, 6, 34, 12),
    new THREE.MeshLambertMaterial({ color: 0xb2483b }),
  );
  tower.position.copy(v3(-150, 19, JUIST.z + 90));
  const tank = new THREE.Mesh(
    new THREE.CylinderGeometry(9, 8, 10, 12),
    new THREE.MeshLambertMaterial({ color: 0xb2483b }),
  );
  tank.position.copy(v3(-150, 39, JUIST.z + 90));
  const cap = new THREE.Mesh(
    new THREE.ConeGeometry(10, 7, 12),
    new THREE.MeshLambertMaterial({ color: 0x3e4a4c }),
  );
  cap.position.copy(v3(-150, 47.5, JUIST.z + 90));
  scene.add(tower, tank, cap);

  // Anleger mit Pollern und Schildern
  for (const b of Object.values(BERTHS)) {
    const [x0, z0, x1, z1] = b.rect;
    const pier = new THREE.Mesh(
      new THREE.BoxGeometry(14, 3, z1 - z0 + 20),
      new THREE.MeshLambertMaterial({ color: 0x7a5b3c }),
    );
    pier.position.copy(v3(x1 + 12, 1.3, (z0 + z1) / 2));
    scene.add(pier);
    for (let z = z0; z <= z1; z += 20) {
      const bollard = new THREE.Mesh(
        new THREE.CylinderGeometry(0.6, 0.7, 1.4, 8),
        new THREE.MeshLambertMaterial({ color: 0x222222 }),
      );
      bollard.position.copy(v3(x1 + 6, 3.4, z));
      scene.add(bollard);
    }
    const terminal = new THREE.Mesh(
      new THREE.BoxGeometry(40, 10, 24),
      new THREE.MeshLambertMaterial({ color: 0xf3efe6 }),
    );
    terminal.position.copy(v3(x1 + 50, 6, (z0 + z1) / 2));
    scene.add(terminal);
    const sign = textSprite(b.name, "#ffffff", "rgba(29,47,90,0.92)");
    sign.position.copy(v3(x1 + 50, 24, (z0 + z1) / 2));
    scene.add(sign);
    void x0;
  }
  const juistLabel = textSprite("Juist", "#12324f", "rgba(255,255,255,0.85)", 2);
  juistLabel.position.copy(v3(900, 60, JUIST.z));
  scene.add(juistLabel);

  // Tonnen: rot = Spierentonne/Stumpf, grün = Spitztonne
  const buoys = new THREE.Group();
  buoys.name = "tonnen";
  for (const b of BUOYS) {
    const g = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: b.color === "red" ? 0xd32f2f : 0x2e7d32 });
    const body =
      b.color === "red"
        ? new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 4, 12), mat)
        : new THREE.Mesh(new THREE.ConeGeometry(1.8, 4.5, 12), mat);
    body.position.y = 2;
    g.add(body);
    g.position.copy(v3(b.x, 0, b.z));
    buoys.add(g);
  }
  scene.add(buoys);

  return {
    /** pro Frame: Wellen bewegen, Tonnen schaukeln */
    animate(time: number) {
      waves.offset.set(time * 0.004, time * 0.006);
      buoys.children.forEach((b, i) => {
        b.position.y = Math.sin(time * 1.3 + i) * 0.25;
        b.rotation.z = Math.sin(time * 0.9 + i * 2) * 0.06;
      });
    },
  };
}
