import * as THREE from "three";

export const COUNTER_Y = 0.86;
/** Scannerfeld (Weltkoordinaten x/z) */
export const SCANNER = { x: -0.05, z: 0, halfW: 0.2, halfD: 0.2 } as const;
export const BELT = { x0: -2.1, x1: -0.32, z: 0 } as const;
export const BAG = { x0: 0.35, x1: 1.15, z: 0.02 } as const;

const EDEKA_BLUE = "#1c4e9c";
const EDEKA_YELLOW = "#ffd200";

function sign(text: string, w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = Math.round((512 * h) / w);
  const g = c.getContext("2d")!;
  g.fillStyle = EDEKA_BLUE;
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = EDEKA_YELLOW;
  g.font = `bold ${Math.round(c.height * 0.55)}px "Helvetica Neue", Arial, sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, c.width / 2, c.height / 2 + 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t }));
}

export function buildStore(scene: THREE.Scene) {
  scene.background = new THREE.Color(0xf2efe8);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8b0a0, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(1, 4, 2);
  scene.add(sun);
  const m = (color: number) => new THREE.MeshLambertMaterial({ color });

  // Boden und Decke
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), m(0xd9d4ca));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), m(0xf7f7f4));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 3.6;
  scene.add(ceiling);
  for (let i = -3; i <= 3; i++) {
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.05, 0.25),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    lamp.position.set(i * 2.2, 3.55, -3);
    scene.add(lamp);
  }

  // Kassentresen
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.6, COUNTER_Y, 0.7), m(0x3b4652));
  body.position.set(-0.45, COUNTER_Y / 2, 0);
  scene.add(body);
  const top = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.03, 0.72), m(0xb8bec6));
  top.position.set(-0.45, COUNTER_Y - 0.015, 0);
  scene.add(top);

  // Band (Streifen bewegen sich über die Textur)
  const bc = document.createElement("canvas");
  bc.width = 256;
  bc.height = 32;
  const bg = bc.getContext("2d")!;
  bg.fillStyle = "#1f2328";
  bg.fillRect(0, 0, 256, 32);
  bg.fillStyle = "#2c3238";
  for (let x = 0; x < 256; x += 16) bg.fillRect(x, 0, 6, 32);
  const beltTex = new THREE.CanvasTexture(bc);
  beltTex.wrapS = THREE.RepeatWrapping;
  beltTex.repeat.set(8, 1);
  const belt = new THREE.Mesh(
    new THREE.PlaneGeometry(BELT.x1 - BELT.x0, 0.5),
    new THREE.MeshLambertMaterial({ map: beltTex }),
  );
  belt.rotation.x = -Math.PI / 2;
  belt.position.set((BELT.x0 + BELT.x1) / 2, COUNTER_Y + 0.002, 0);
  scene.add(belt);
  const divider = new THREE.Mesh(new THREE.BoxGeometry(BELT.x1 - BELT.x0, 0.05, 0.02), m(0x9aa2ab));
  divider.position.set((BELT.x0 + BELT.x1) / 2, COUNTER_Y + 0.025, -0.27);
  scene.add(divider);

  // Scanner: Glasfeld, leuchtet beim Scannen
  const glassMat = new THREE.MeshBasicMaterial({ color: 0x3a1a1a });
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(SCANNER.halfW * 2, SCANNER.halfD * 2),
    glassMat,
  );
  glass.rotation.x = -Math.PI / 2;
  glass.position.set(SCANNER.x, COUNTER_Y + 0.003, SCANNER.z);
  scene.add(glass);
  const tower = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.06), m(0x2a2f36));
  tower.position.set(SCANNER.x, COUNTER_Y + 0.11, -0.28);
  scene.add(tower);
  const towerGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.14), glassMat);
  towerGlass.position.set(SCANNER.x, COUNTER_Y + 0.12, -0.249);
  scene.add(towerGlass);

  // Ablagemulde (hell, mit Rand)
  const bag = new THREE.Mesh(new THREE.BoxGeometry(BAG.x1 - BAG.x0, 0.01, 0.62), m(0xc9ced4));
  bag.position.set((BAG.x0 + BAG.x1) / 2, COUNTER_Y + 0.005, 0);
  scene.add(bag);
  for (const z of [-0.31, 0.31]) {
    const rim = new THREE.Mesh(new THREE.BoxGeometry(BAG.x1 - BAG.x0, 0.05, 0.02), m(0x9aa2ab));
    rim.position.set((BAG.x0 + BAG.x1) / 2, COUNTER_Y + 0.025, z);
    scene.add(rim);
  }

  // Kassenbildschirm (Canvas-Textur)
  const screenCanvas = document.createElement("canvas");
  screenCanvas.width = 512;
  screenCanvas.height = 384;
  const screenTex = new THREE.CanvasTexture(screenCanvas);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  const monitor = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.36, 0.04), m(0x22262b));
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.315),
    new THREE.MeshBasicMaterial({ map: screenTex }),
  );
  screen.position.z = 0.021;
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.3, 10), m(0x22262b));
  stand.position.y = -0.32;
  monitor.add(frame, screen, stand);
  monitor.position.set(0.95, COUNTER_Y + 0.42, -0.3);
  monitor.rotation.set(-0.1, -0.3, 0);
  scene.add(monitor);

  // Kartenterminal (Kundenseite)
  const terminal = new THREE.Group();
  const tBody = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.17), m(0x2a2f36));
  const tScreenMat = new THREE.MeshBasicMaterial({ color: 0x223344 });
  const tScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.05), tScreenMat);
  tScreen.rotation.x = -Math.PI / 2 + 0.4;
  tScreen.position.set(0, 0.02, -0.04);
  terminal.add(tBody, tScreen);
  terminal.position.set(0.25, COUNTER_Y + 0.05, -0.32);
  terminal.rotation.x = -0.3;
  scene.add(terminal);

  // Markt im Hintergrund: Regale, Kühltheke, Schilder
  const shelfColors = [0xe74c3c, 0xf1c40f, 0x27ae60, 0x2980b9, 0xe67e22, 0x8e44ad, 0xecf0f1];
  for (let s = 0; s < 5; s++) {
    const shelf = new THREE.Group();
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.9, 0.5), m(0xe9e4da));
    back.position.y = 0.95;
    shelf.add(back);
    for (let row = 0; row < 4; row++) {
      for (let k = 0; k < 9; k++) {
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.25, 0.2),
          m(shelfColors[(s * 3 + row * 5 + k) % shelfColors.length]!),
        );
        box.position.set(-0.95 + k * 0.24, 0.25 + row * 0.45, 0.2);
        shelf.add(box);
      }
    }
    shelf.position.set(-5 + s * 2.6, 0, -5.5);
    scene.add(shelf);
  }
  const fridge = new THREE.Mesh(new THREE.BoxGeometry(4, 1.1, 0.9), m(0xdfe8ee));
  fridge.position.set(5.5, 0.55, -4.5);
  fridge.rotation.y = -0.5;
  scene.add(fridge);
  const bigSign = sign("EDEKA", 3.2, 0.7);
  bigSign.position.set(0, 3.0, -5.9);
  scene.add(bigSign);
  const laneSign = sign("Kasse 3", 0.7, 0.22);
  laneSign.position.set(-1.2, 2.2, -0.35);
  scene.add(laneSign);
  const laneStand = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.3, 8), m(0x9aa2ab));
  laneStand.position.set(-1.2, 1.5, -0.35);
  scene.add(laneStand);

  const beltState = { offset: 0 };
  return {
    screenCanvas,
    screenTex,
    /** Band bewegen (m/s) */
    moveBelt(dt: number, speed: number) {
      beltState.offset -= (dt * speed * 8) / (BELT.x1 - BELT.x0);
      beltTex.offset.x = beltState.offset;
    },
    flash(kind: "ok" | "bad" | null) {
      glassMat.color.set(kind === "ok" ? 0x2ecc71 : kind === "bad" ? 0xe74c3c : 0x3a1a1a);
    },
    terminalLight(on: boolean) {
      tScreenMat.color.set(on ? 0x2ecc71 : 0x223344);
    },
  };
}

/** Kassenbildschirm zeichnen: EDEKA-Kopf in neutraler Schrift, Bonzeilen, Summe. */
export function drawScreen(
  c: HTMLCanvasElement,
  lines: [string, string][],
  totalText: string,
  customer: number,
) {
  const g = c.getContext("2d")!;
  g.fillStyle = "#f7f9fc";
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = EDEKA_BLUE;
  g.fillRect(0, 0, c.width, 56);
  g.fillStyle = EDEKA_YELLOW;
  g.font = 'bold 34px "Helvetica Neue", Arial, sans-serif';
  g.fillText("EDEKA", 16, 40);
  g.fillStyle = "#ffffff";
  g.font = "22px system-ui, sans-serif";
  g.fillText(`Kunde ${customer}`, 360, 38);
  g.fillStyle = "#1d2a38";
  g.font = "24px ui-monospace, monospace";
  const shown = lines.slice(-8);
  shown.forEach(([name, price], i) => {
    g.fillText(name, 16, 92 + i * 30);
    g.textAlign = "right";
    g.fillText(price, c.width - 16, 92 + i * 30);
    g.textAlign = "left";
  });
  g.fillStyle = EDEKA_BLUE;
  g.fillRect(0, c.height - 60, c.width, 60);
  g.fillStyle = "#ffffff";
  g.font = "bold 30px system-ui, sans-serif";
  g.fillText("Summe", 16, c.height - 20);
  g.textAlign = "right";
  g.fillText(totalText, c.width - 16, c.height - 20);
  g.textAlign = "left";
}

/** Kunde als einfache Figur, Blick nach +Z (zur Kasse). */
export function buildCustomer(seed: number) {
  const g = new THREE.Group();
  const shirts = [0xe74c3c, 0x27ae60, 0x8e44ad, 0xe67e22, 0x16a085, 0x2c3e50];
  const hairs = [0x3b2a22, 0xf2cc4f, 0x8a5a2b, 0x222222, 0xb0b0b0];
  const skins = [0xf4c9a6, 0xe8b48f, 0xc68a62, 0x8d5a3b];
  const pick = <T>(a: T[], k: number) => a[(seed * 7 + k * 13) % a.length]!;
  const mat = (c: number) => new THREE.MeshLambertMaterial({ color: c });
  const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.85, 10), mat(0x34495e));
  legs.position.y = 0.43;
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.18, 0.6, 12),
    mat(pick(shirts, 1)),
  );
  torso.position.y = 1.15;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), mat(pick(skins, 2)));
  head.position.y = 1.6;
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.135, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
    mat(pick(hairs, 3)),
  );
  hair.position.y = 1.62;
  const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.01), mat(0x1d2a38));
  eyes.position.set(0, 1.59, 0.126);
  g.add(legs, torso, head, hair, eyes);
  return g;
}
