import * as THREE from "three";
import type { ShipType } from "../logic/world.ts";

function nameTexture(name: string) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 96;
  const g = c.getContext("2d")!;
  g.font = 'bold 64px "Helvetica Neue", Arial, sans-serif';
  g.fillStyle = "#ffffff";
  g.textBaseline = "middle";
  g.fillText(name.toUpperCase(), 10, 50);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Vereinfachte Fähre: Bug zeigt nach −Z, Steuerbord = +X. Ursprung auf Wasserlinie, Mitte. */
export function buildShip(type: ShipType) {
  const L = type.length;
  const B = L * 0.22;
  const g = new THREE.Group();
  const m = (color: number) => new THREE.MeshLambertMaterial({ color });

  // Rumpf: Draufsicht mit spitzem Bug (Shape-y = vorwärts)
  const s = new THREE.Shape();
  s.moveTo(-B / 2, -L / 2);
  s.lineTo(B / 2, -L / 2);
  s.lineTo(B / 2, L * 0.22);
  s.quadraticCurveTo(B / 2, L * 0.42, 0, L / 2);
  s.quadraticCurveTo(-B / 2, L * 0.42, -B / 2, L * 0.22);
  s.closePath();
  const hullH = 4.2;
  const hullGeo = new THREE.ExtrudeGeometry(s, { depth: hullH, bevelEnabled: false });
  hullGeo.rotateX(-Math.PI / 2); // Shape-y → −Z (vorn), Extrusion → +Y (oben)
  const hull = new THREE.Mesh(hullGeo, m(0x1d2f5a));
  hull.position.y = -1.6;
  g.add(hull);
  const stripe = new THREE.Mesh(
    new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: false }).rotateX(-Math.PI / 2),
    m(0xc62828),
  );
  stripe.position.y = -1.7;
  stripe.scale.set(1.01, 1, 1.005);
  g.add(stripe);
  const deck = new THREE.Mesh(
    new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: false }).rotateX(-Math.PI / 2),
    m(0xc9c3b6),
  );
  deck.position.y = hullH - 1.6;
  g.add(deck);

  // Aufbauten
  const white = m(0xf7f7f4);
  const glass = m(0x2b3e55);
  const top0 = hullH - 1.3;
  const deckH = 2.8;
  let topY = top0;
  for (let d = 0; d < type.decks; d++) {
    const len = L * (0.55 - d * 0.12);
    const wid = B * (0.86 - d * 0.08);
    const zc = L * (0.02 + d * 0.04);
    const box = new THREE.Mesh(new THREE.BoxGeometry(wid, deckH, len), white);
    box.position.set(0, topY + deckH / 2, zc);
    const win = new THREE.Mesh(new THREE.BoxGeometry(wid + 0.1, deckH * 0.35, len * 0.92), glass);
    win.position.set(0, topY + deckH * 0.6, zc);
    g.add(box, win);
    topY += deckH;
  }
  // Brücke vorn auf dem obersten Deck
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(B * 0.7, 2.4, L * 0.1), white);
  const bridgeZ = -L * 0.12;
  bridge.position.set(0, topY + 1.2, bridgeZ);
  const bridgeWin = new THREE.Mesh(new THREE.BoxGeometry(B * 0.72, 0.9, L * 0.102), glass);
  bridgeWin.position.set(0, topY + 1.6, bridgeZ);
  g.add(bridge, bridgeWin);
  const bridgeTop = topY + 2.4;

  if (type.funnel) {
    const funnel = new THREE.Mesh(new THREE.CylinderGeometry(B * 0.11, B * 0.13, 5, 16), white);
    funnel.position.set(0, topY + 2.5, L * 0.16);
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(B * 0.112, B * 0.112, 1, 16),
      m(0x1d2f5a),
    );
    band.position.set(0, topY + 4.3, L * 0.16);
    g.add(funnel, band);
  } else {
    // Frisia E-I: kein Schornstein, Solardach
    const solar = new THREE.Mesh(new THREE.BoxGeometry(B * 0.7, 0.2, L * 0.3), m(0x1b2a44));
    solar.position.set(0, topY + 0.1, L * 0.14);
    g.add(solar);
  }
  // Mast
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 5, 6), m(0xdddddd));
  mast.position.set(0, bridgeTop + 2.5, bridgeZ);
  g.add(mast);

  // Name am Bug, beide Seiten
  const tex = nameTexture(type.name);
  for (const side of [1, -1] as const) {
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(L * 0.28, L * 0.0525),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
    );
    plate.rotation.y = (side * Math.PI) / 2;
    plate.position.set(side * (B / 2 + 0.06), 1.3, -L * 0.15);
    g.add(plate);
  }

  g.userData = {
    name: type.name,
    length: L,
    bridge: new THREE.Vector3(0, bridgeTop + 0.2, bridgeZ - L * 0.06),
  };
  return g;
}
