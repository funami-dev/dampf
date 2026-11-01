import * as THREE from "three";
import { formatEuro } from "../logic/register.ts";
import type { Product } from "../logic/catalog.ts";

const stickerCache = new Map<string, THREE.Texture>();

/** Etikett mit Name, Preis und Barcode (eigene Gestaltung, keine Marken). */
function sticker(p: Product): THREE.Texture {
  const hit = stickerCache.get(p.id);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 160;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, 256, 160);
  g.fillStyle = "#1d2a38";
  g.font = "bold 34px system-ui, sans-serif";
  g.fillText(p.name, 12, 40);
  g.font = "24px system-ui, sans-serif";
  g.fillText(formatEuro(p.price), 12, 70);
  // Barcode aus dem Produktnamen abgeleitet
  let x = 12;
  for (let i = 0; x < 244; i++) {
    const w = 1 + ((p.id.charCodeAt(i % p.id.length) + i * 7) % 4);
    if (i % 2 === 0) g.fillRect(x, 84, w, 60);
    x += w + 1;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  stickerCache.set(p.id, t);
  return t;
}

/**
 * 3D-Ware. Etikett mit Barcode zeigt nach +Z (zur Kassiererin), wenn die Ware „richtig herum“
 * liegt. Ursprung: Mitte der Unterseite.
 */
export function buildProduct(p: Product): THREE.Group {
  const [w, h, d] = p.size;
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: p.color });
  let front = d / 2;
  let stickerW = Math.min(w * 0.9, 0.12);
  let stickerY = h / 2;
  const add = (m: THREE.Mesh) => {
    m.userData.pick = true;
    g.add(m);
    return m;
  };
  switch (p.shape) {
    case "bottle": {
      const r = w / 2;
      add(
        new THREE.Mesh(
          new THREE.CylinderGeometry(r, r, h * 0.72, 16),
          new THREE.MeshPhysicalMaterial({
            color: p.color,
            transparent: true,
            opacity: 0.7,
            roughness: 0.1,
          }),
        ),
      ).position.y = h * 0.36;
      add(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.35, r, h * 0.2, 16), mat)).position.y =
        h * 0.82;
      add(
        new THREE.Mesh(
          new THREE.CylinderGeometry(r * 0.38, r * 0.38, h * 0.06, 12),
          new THREE.MeshLambertMaterial({ color: 0x2f6fd6 }),
        ),
      ).position.y = h * 0.95;
      front = r;
      stickerY = h * 0.38;
      break;
    }
    case "can": {
      add(new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2.3, h, 16), mat)).position.y =
        h / 2;
      front = w / 2;
      break;
    }
    case "round": {
      const m = add(new THREE.Mesh(new THREE.CapsuleGeometry(h / 2, w - h, 6, 12), mat));
      m.rotation.z = Math.PI / 2;
      m.position.y = h / 2;
      front = d / 2;
      stickerW = 0.06;
      break;
    }
    case "bunch": {
      for (let i = 0; i < 4; i++) {
        const m = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.018, w * 0.85, 4, 8), mat));
        m.rotation.z = Math.PI / 2 + 0.2;
        m.rotation.y = (i - 1.5) * 0.12;
        m.position.set(0, 0.02 + (i % 2) * 0.02, (i - 1.5) * 0.025);
      }
      stickerW = 0.06;
      stickerY = 0.04;
      front = d / 2;
      break;
    }
    case "bag": {
      const m = add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), mat));
      m.scale.set(w, h, d);
      m.position.y = h / 2;
      front = d / 2 - 0.01;
      break;
    }
    case "tray": {
      add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)).position.y = h / 2;
      add(
        new THREE.Mesh(
          new THREE.BoxGeometry(w * 1.04, h * 0.3, d * 1.04),
          new THREE.MeshLambertMaterial({ color: 0xdddddd }),
        ),
      ).position.y = h * 0.15;
      break;
    }
    default:
      add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)).position.y = h / 2;
  }
  const sh = Math.min(h * 0.8, stickerW * 0.62, 0.08);
  const sw = Math.min(stickerW, sh / 0.62);
  const st = add(
    new THREE.Mesh(
      new THREE.PlaneGeometry(sw, sh),
      new THREE.MeshBasicMaterial({ map: sticker(p) }),
    ),
  );
  st.position.set(0, Math.max(sh / 2 + 0.003, Math.min(stickerY, h - sh / 2)), front + 0.003);
  g.userData = { productId: p.id, size: p.size };
  return g;
}
