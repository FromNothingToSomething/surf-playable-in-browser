import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Décor japonais low-poly, sans collision. Chaque type renvoie { lit, glow } (géométries monde avec couleurs).
export const DECO_KINDS = ['sakura', 'toro', 'chochin', 'ile', 'pin'];
export const DECO_LABEL = { sakura: 'Cerisier', toro: 'Lanterne de pierre', chochin: 'Lanterne papier', ile: 'Île flottante', pin: 'Pin' };

function rng(seed) { return () => ((seed = (seed * 16807 + 11) % 2147483647) / 2147483647); }

function paint(g, hex, jitter = 0, r = Math.random) {
  g = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(g.attributes)) if (k !== 'position') g.deleteAttribute(k);
  const n = g.attributes.position.count, col = new Float32Array(n * 3), c = new THREE.Color();
  for (let i = 0; i < n; i += 3) {
    c.setHex(hex); if (jitter) c.offsetHSL(0, 0, (r() - 0.5) * jitter);
    for (let k = 0; k < 3; k++) { col[(i + k) * 3] = c.r; col[(i + k) * 3 + 1] = c.g; col[(i + k) * 3 + 2] = c.b; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
const at = (g, x, y, z) => g.translate(x, y, z);

function sakura(r) {
  const lit = [];
  lit.push(paint(at(new THREE.CylinderGeometry(14, 24, 220, 7), 0, 110, 0), 0x4a3328, 0.1, r));
  const br = new THREE.CylinderGeometry(8, 13, 160, 6); br.rotateZ(0.8); at(br, 55, 230, 0); lit.push(paint(br, 0x4a3328, 0.1, r));
  const br2 = new THREE.CylinderGeometry(8, 13, 150, 6); br2.rotateZ(-0.7); br2.rotateY(2); at(br2, -40, 225, 30); lit.push(paint(br2, 0x4a3328, 0.1, r));
  const pinks = [0xf7c6d9, 0xf4b3cc, 0xfad7e5, 0xeea6c1];
  for (let i = 0; i < 7; i++) {
    const a = r() * Math.PI * 2, d = 40 + r() * 90;
    const s = new THREE.IcosahedronGeometry(80 + r() * 60, 0);
    s.scale(1, 0.75, 1);
    at(s, Math.cos(a) * d, 270 + r() * 90, Math.sin(a) * d);
    lit.push(paint(s, pinks[i % pinks.length], 0.08, r));
  }
  return { lit, glow: [] };
}

function pin(r) {
  const lit = [paint(at(new THREE.CylinderGeometry(12, 20, 200, 6), 0, 100, 0), 0x3e2d24, 0.1, r)];
  for (let i = 0; i < 4; i++) {
    const s = new THREE.CylinderGeometry(30 + i * 8, 120 - i * 18, 40, 7);
    at(s, (r() - 0.5) * 60, 160 + i * 55, (r() - 0.5) * 60);
    lit.push(paint(s, 0x2f5d3a, 0.1, r));
  }
  return { lit, glow: [] };
}

function toro(r) {
  const st = 0x9a958c, lit = [], glow = [];
  lit.push(paint(at(new THREE.BoxGeometry(110, 24, 110), 0, 12, 0), st, 0.06, r));
  lit.push(paint(at(new THREE.CylinderGeometry(22, 26, 120, 8), 0, 84, 0), st, 0.06, r));
  lit.push(paint(at(new THREE.BoxGeometry(96, 18, 96), 0, 153, 0), st, 0.06, r));
  glow.push(paint(at(new THREE.BoxGeometry(56, 56, 56), 0, 190, 0), 0xffcf7a));
  for (const [x, z] of [[-26, -26], [26, -26], [-26, 26], [26, 26]]) lit.push(paint(at(new THREE.BoxGeometry(10, 58, 10), x, 190, z), st, 0.06, r));
  lit.push(paint(at(new THREE.ConeGeometry(92, 54, 4), 0, 245, 0).rotateY(Math.PI / 4), 0x7d786f, 0.06, r));
  lit.push(paint(at(new THREE.SphereGeometry(12, 6, 4), 0, 280, 0), st, 0.06, r));
  return { lit, glow };
}

function chochin() {
  const g = new THREE.SphereGeometry(40, 10, 8); g.scale(1, 1.35, 1); at(g, 0, -60, 0);
  const lit = [
    paint(at(new THREE.CylinderGeometry(26, 26, 10, 10), 0, -4, 0), 0x1a1a1a),
    paint(at(new THREE.CylinderGeometry(26, 26, 10, 10), 0, -116, 0), 0x1a1a1a),
    paint(at(new THREE.CylinderGeometry(2, 2, 40, 4), 0, 18, 0), 0x1a1a1a),
  ];
  return { lit, glow: [paint(g, 0xe0422e)] };
}

function ile(r) {
  const g = new THREE.ConeGeometry(520, 900, 9, 3); g.rotateX(Math.PI); at(g, 0, -450, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) < -5) { p.setX(i, p.getX(i) * (0.8 + r() * 0.4)); p.setZ(i, p.getZ(i) * (0.8 + r() * 0.4)); p.setY(i, p.getY(i) * (0.85 + r() * 0.3)); }
  }
  const top = at(new THREE.CylinderGeometry(550, 546, 44, 9), 0, -20, 0);
  return { lit: [paint(g, 0x6b5a4c, 0.12, r), paint(top, 0x6f9a55, 0.08, r)], glow: [] };
}

const MAKE = { sakura, toro, chochin, ile, pin };

export function decoGeometry(o) {
  const r = rng(Math.floor((o.p[0] * 7 + o.p[2] * 13 + o.p[1]) % 100000) + 17);
  const { lit, glow } = (MAKE[o.k] || sakura)(r);
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(...o.p),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (o.r || 0) * Math.PI / 180, 0)),
    new THREE.Vector3(o.sc || 1, o.sc || 1, o.sc || 1));
  const merge = (arr) => { if (!arr.length) return null; const g = mergeGeometries(arr, false); g.applyMatrix4(m); g.computeVertexNormals(); return g; };
  return { lit: merge(lit), glow: merge(glow) };
}

const litMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true });

export function buildDeco(o) {
  const { lit, glow } = decoGeometry(o);
  const root = new THREE.Mesh(lit || new THREE.BufferGeometry(), litMat);
  if (glow) { const gm = new THREE.Mesh(glow, glowMat); gm.raycast = () => {}; root.add(gm); }
  return root;
}
