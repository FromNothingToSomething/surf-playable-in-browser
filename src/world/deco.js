import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Décor japonais low-poly, sans collision. Chaque type renvoie { lit, glow } (géométries monde avec couleurs).
export const DECO_KINDS = ['sakura', 'toro', 'chochin', 'ile', 'pin', 'corail', 'algue', 'rocher', 'recif', 'ileneige', 'colonnes', 'glowstone', 'champi_c', 'champi_w', 'brasero', 'portail', 'ilenether'];
export const DECO_LABEL = { sakura: 'Cerisier', toro: 'Lanterne de pierre', chochin: 'Lanterne papier', ile: 'Île flottante', pin: 'Pin', corail: 'Corail', algue: 'Algue', rocher: 'Rocher', recif: 'Récif flottant', ileneige: 'Île enneigée', colonnes: 'Colonnes de basalte', glowstone: 'Pierre lumineuse', champi_c: 'Champignon cramoisi', champi_w: 'Champignon distordu', brasero: 'Brasero', portail: 'Portail', ilenether: 'Île infernale' };

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

function corail(r) {
  const cols = [0xf07a5a, 0xf5a3b5, 0xffb347, 0xe8576b], lit = [];
  const col = cols[Math.floor(r() * cols.length)];
  const branch = (x, y, z, len, rad, ax, az, depth) => {
    const g = new THREE.CylinderGeometry(rad * 0.6, rad, len, 6);
    g.translate(0, len / 2, 0); g.rotateX(ax); g.rotateZ(az); at(g, x, y, z);
    lit.push(paint(g, col, 0.1, r));
    const ex = x - Math.sin(az) * Math.cos(ax) * len, ey = y + Math.cos(az) * Math.cos(ax) * len, ez = z + Math.sin(ax) * len;
    if (depth > 0) for (let i = 0; i < 2; i++) branch(ex, ey, ez, len * 0.7, rad * 0.65, ax + (r() - 0.5) * 1.1, az + (r() - 0.5) * 1.1, depth - 1);
    else { const b = new THREE.IcosahedronGeometry(rad * 1.6, 0); at(b, ex, ey, ez); lit.push(paint(b, col, 0.15, r)); }
  };
  for (let i = 0; i < 4; i++) branch((r() - 0.5) * 60, 0, (r() - 0.5) * 60, 90 + r() * 50, 16, (r() - 0.5) * 0.7, (r() - 0.5) * 0.7, 2);
  return { lit, glow: [] };
}

function algue(r) {
  const lit = [];
  for (let k = 0; k < 4; k++) {
    let x = (r() - 0.5) * 80, z = (r() - 0.5) * 80, y = 0;
    for (let i = 0; i < 7; i++) {
      const seg = new THREE.CylinderGeometry(9 - i, 11 - i, 70, 5);
      const nx = x + Math.sin(i * 0.9 + k) * 18, nz = z + Math.cos(i * 0.7 + k) * 12;
      at(seg, (x + nx) / 2, y + 35, (z + nz) / 2);
      lit.push(paint(seg, 0x2f8a4a, 0.15, r));
      x = nx; z = nz; y += 66;
    }
  }
  return { lit, glow: [] };
}

function rocher(r) {
  const g = new THREE.IcosahedronGeometry(120, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = 0.75 + r() * 0.5; p.setXYZ(i, p.getX(i) * k, Math.max(p.getY(i) * k * 0.7, -10), p.getZ(i) * k); }
  return { lit: [paint(g, 0x6d7472, 0.12, r)], glow: [] };
}

function recif(r) {
  const base = ile(r);
  base.lit = [paint(base.lit[0], 0x5b6a6e, 0.12, r), paint(base.lit[1], 0xe8d3a0, 0.08, r)];
  for (let i = 0; i < 5; i++) {
    const a = r() * 6.28, d = 150 + r() * 300;
    const c = (i % 2 ? corail : algue)(r).lit;
    for (const g of c) base.lit.push(at(g, Math.cos(a) * d, 0, Math.sin(a) * d));
  }
  return base;
}

function ileneige(r) {
  const b = ile(r);
  b.lit = [paint(b.lit[0], 0x7d8590, 0.1, r), paint(b.lit[1], 0xf4f7fb, 0.03, r)];
  return b;
}

// ---------- enfer ----------
function colonnes(r) {
  const lit = [];
  for (let i = 0; i < 9; i++) {
    const a = r() * 6.28, d = r() * 160, hgt = 120 + r() * 420;
    const g = new THREE.CylinderGeometry(44, 48, hgt, 6); at(g, Math.cos(a) * d, hgt / 2, Math.sin(a) * d);
    lit.push(paint(g, 0x3e3a44, 0.15, r));
  }
  return { lit, glow: [] };
}
function glowstone(r) {
  const glow = [], lit = [];
  for (let i = 0; i < 10; i++) {
    const s = 40 + r() * 50, g = new THREE.BoxGeometry(s, s, s);
    g.rotateY(r() * 0.5); at(g, (r() - 0.5) * 140, (r() - 0.5) * 120, (r() - 0.5) * 140);
    glow.push(paint(g, [0xffd27a, 0xffe9a6, 0xffbf5a][i % 3]));
  }
  return { lit, glow };
}
function champi(r, cap, light) {
  const lit = [], glow = [];
  const hgt = 260 + r() * 160;
  lit.push(paint(at(new THREE.BoxGeometry(46, hgt, 46), 0, hgt / 2, 0), cap === 0xa3142c ? 0x6b1f2c : 0x1f5c5a, 0.12, r));
  lit.push(paint(at(new THREE.BoxGeometry(320, 70, 320), 0, hgt + 20, 0), cap, 0.1, r));
  lit.push(paint(at(new THREE.BoxGeometry(220, 70, 220), 0, hgt + 85, 0), cap, 0.1, r));
  for (let i = 0; i < 4; i++) {
    const a = i * 1.57 + r(); glow.push(paint(at(new THREE.BoxGeometry(48, 48, 48), Math.cos(a) * 120, hgt - 30, Math.sin(a) * 120), light));
  }
  for (let i = 0; i < 6; i++) { // lianes
    const a = r() * 6.28, d = 100 + r() * 50, l = 80 + r() * 160;
    lit.push(paint(at(new THREE.BoxGeometry(12, l, 12), Math.cos(a) * d, hgt - l / 2, Math.sin(a) * d), cap, 0.15, r));
  }
  return { lit, glow };
}
const champi_c = (r) => champi(r, 0xa3142c, 0xffa64d);
const champi_w = (r) => champi(r, 0x167e7a, 0xffb85a);
function brasero(r) {
  const lit = [paint(at(new THREE.CylinderGeometry(70, 40, 60, 8), 0, 150, 0), 0x2a2a30, 0.1, r)];
  for (const [x, z] of [[-40, -40], [40, -40], [-40, 40], [40, 40]]) lit.push(paint(at(new THREE.BoxGeometry(12, 130, 12), x, 65, z), 0x2a2a30, 0.1, r));
  const glow = [
    paint(at(new THREE.ConeGeometry(60, 150, 7), 0, 250, 0), 0xff6a1a),
    paint(at(new THREE.ConeGeometry(36, 120, 6), 10, 245, 8), 0xffc24a),
    paint(at(new THREE.ConeGeometry(18, 70, 5), -12, 230, -6), 0xfff1b0),
  ];
  return { lit, glow };
}
function portail(r) {
  const lit = [], glow = [], b = 64, W = 4, H = 5;
  const blk = (x, y, z) => lit.push(paint(at(new THREE.BoxGeometry(b, b, b), x, y, z), 0x221636, 0.12, r));
  for (let i = 0; i < W + 2; i++) { blk((i - (W + 1) / 2) * b, b / 2, 0); blk((i - (W + 1) / 2) * b, (H + 1) * b + b / 2, 0); }
  for (let j = 1; j <= H; j++) { blk(-(W + 1) / 2 * b, j * b + b / 2, 0); blk((W + 1) / 2 * b, j * b + b / 2, 0); }
  const pl = new THREE.BoxGeometry(W * b, H * b, 10); at(pl, 0, b + H * b / 2, 0);
  glow.push(paint(pl, 0x9a3cff));
  const pl2 = new THREE.BoxGeometry(W * b * 0.6, H * b * 0.7, 12); at(pl2, 0, b + H * b / 2, 0);
  glow.push(paint(pl2, 0xc98bff));
  return { lit, glow };
}
function ilenether(r) {
  const g = new THREE.ConeGeometry(520, 1000, 8, 4); g.rotateX(Math.PI); at(g, 0, -500, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) < -5) { const k = 0.7 + r() * 0.6; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); p.setY(i, p.getY(i) * (0.8 + r() * 0.4)); }
  const top = at(new THREE.CylinderGeometry(550, 546, 44, 8), 0, -20, 0);
  const pool = at(new THREE.CylinderGeometry(160, 160, 8, 10), 180, 4, -120);
  const drip = at(new THREE.ConeGeometry(40, 500, 5), 300, -280, 120); drip.rotateX(Math.PI);
  return { lit: [paint(g, 0x6e221c, 0.15, r), paint(top, 0x8a2b22, 0.1, r)], glow: [paint(pool, 0xff7a1a), paint(drip, 0xff5a10)] };
}

const MAKE = { sakura, toro, chochin, ile, pin, corail, algue, rocher, recif, ileneige, colonnes, glowstone, champi_c, champi_w, brasero, portail, ilenether };

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
