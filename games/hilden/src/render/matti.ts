import * as THREE from "three";

/** Matti als Low-Poly-Figur (ca. 1,4 m): lange blonde Haare, blauer Hoodie, blaue Shorts. Blick nach −Z. */
export function buildMatti() {
  const g = new THREE.Group();
  const m = (color: number) => new THREE.MeshLambertMaterial({ color });
  const skin = m(0xf4c9a6);
  const hoodie = m(0x3b8ef0);
  const hoodieDark = m(0x2f6fd0);
  const shorts = m(0x2f5fc0);
  const hair = m(0xf2cc4f);
  const shoe = m(0xffffff);

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.5, 0.28), hoodie);
  body.position.y = 0.82;
  const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.02), hoodieDark);
  pocket.position.set(0, 0.7, -0.15);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.2), hoodieDark);
  hood.position.set(0, 1.08, 0.08);
  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.16, 0.26), shorts);
  hips.position.y = 0.52;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), skin);
  head.position.y = 1.3;
  // lange Haare: Kappe + Strähnen hinten und an den Seiten
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.215, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
    hair,
  );
  cap.position.y = 1.32;
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 0.12), hair);
  back.position.set(0, 1.12, 0.14);
  const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.38, 0.22), hair);
  sideL.position.set(-0.19, 1.15, 0.02);
  const sideR = sideL.clone();
  sideR.position.x = 0.19;
  const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.01), m(0x1d2a38));
  eyes.position.set(0, 1.31, -0.195);
  g.add(body, pocket, hood, hips, head, cap, back, sideL, sideR, eyes);

  const limb = (w: number, h: number, mat: THREE.Material, x: number, y: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat);
    mesh.position.y = -h / 2;
    pivot.add(mesh);
    g.add(pivot);
    return pivot;
  };
  const legL = limb(0.15, 0.44, skin, -0.11, 0.48);
  const legR = limb(0.15, 0.44, skin, 0.11, 0.48);
  for (const leg of [legL, legR]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.08, 0.26), shoe);
    s.position.set(0, -0.44, -0.04);
    leg.add(s);
  }
  const armL = limb(0.12, 0.46, hoodie, -0.3, 1.04);
  const armR = limb(0.12, 0.46, hoodie, 0.3, 1.04);

  let phase = 0;
  return {
    group: g,
    /** Laufanimation: speed in m/s */
    animate(dt: number, speed: number) {
      phase += dt * speed * 1.6;
      const a = speed > 0.1 ? Math.sin(phase) * Math.min(0.9, 0.25 + speed * 0.08) : 0;
      legL.rotation.x = a;
      legR.rotation.x = -a;
      armL.rotation.x = -a * 0.8;
      armR.rotation.x = a * 0.8;
      g.children[0]!.position.y = 0.82 + Math.abs(Math.sin(phase)) * (speed > 0.1 ? 0.03 : 0);
    },
  };
}
