import * as THREE from 'three';

// Motifs japonais procéduraux, en niveaux de gris (teintés par la couleur de l'objet). Tous tuilables.
// 1 tuile = 256 unités monde.
export const TEXTURES = ['grille', 'seigaiha', 'asanoha', 'shippo', 'ichimatsu', 'bois', 'laque', 'netherrack', 'basalte', 'obsidienne', 'magma', 'briques', 'pierre', 'pave'];

function canvas(w, h = w) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }
function grain(g, w, h, amount, seed = 7) {
  const img = g.getImageData(0, 0, w, h), r = rng(seed);
  for (let i = 0; i < img.data.length; i += 4) {
    const d = (r() - 0.5) * amount;
    img.data[i] += d; img.data[i + 1] += d; img.data[i + 2] += d;
  }
  g.putImageData(img, 0, 0);
}

// Vagues: arcs concentriques en écailles
function seigaiha() {
  const S = 512, R = 64, [c, g] = canvas(S);
  g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, S, S);
  const rings = [[R, '#e6e6e6'], [R * 0.78, '#f7f7f7'], [R * 0.56, '#e6e6e6'], [R * 0.34, '#f7f7f7'], [R * 0.14, '#e6e6e6']];
  for (let row = -2; row <= S / (R / 2) + 2; row++) {
    const y = row * (R / 2), off = (row & 1) ? R : 0;
    for (let x = -2 * R + off; x <= S + 2 * R; x += 2 * R) {
      for (const [rr, col] of rings) {
        g.beginPath(); g.arc(x, y, rr, Math.PI, 2 * Math.PI); g.lineTo(x + rr, y + R); g.lineTo(x - rr, y + R); g.closePath();
        g.fillStyle = col; g.fill();
        g.beginPath(); g.arc(x, y, rr, Math.PI, 2 * Math.PI);
        g.strokeStyle = '#8a8a8a'; g.lineWidth = 3; g.stroke();
      }
    }
  }
  grain(g, S, S, 10);
  return c;
}

// Feuille de chanvre: réseau triangulaire, chaque triangle relié à son centre
function asanoha() {
  const W = 512, s = 128, hh = s * Math.sqrt(3) / 2, H = Math.round(hh * 4), [c, g] = canvas(W, H);
  g.fillStyle = '#f3f3f3'; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#7f7f7f'; g.lineWidth = 2.5; g.lineCap = 'round';
  const line = (a, b) => { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); };
  for (let r = -1; r <= 5; r++) for (let i = -2; i <= W / s + 2; i++) {
    const y0 = r * hh, y1 = y0 + hh, ox = (r & 1) ? s / 2 : 0;
    const A = [i * s + ox, y0], B = [A[0] + s, y0], C = [A[0] + s / 2, y1], D = [C[0] + s, y1];
    for (const t of [[A, B, C], [B, D, C]]) {
      const m = [(t[0][0] + t[1][0] + t[2][0]) / 3, (t[0][1] + t[1][1] + t[2][1]) / 3];
      line(t[0], t[1]); line(t[1], t[2]); line(t[2], t[0]);
      for (const p of t) line(p, m);
    }
  }
  grain(g, W, H, 10);
  return c;
}

// Sept trésors: cercles entrelacés
function shippo() {
  const S = 512, R = 64, [c, g] = canvas(S);
  g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, S, S);
  g.lineWidth = 3; g.strokeStyle = '#808080';
  for (let y = -R * 2; y <= S + R * 2; y += R * 2) for (let x = -R * 2; x <= S + R * 2; x += R * 2) {
    for (const [dx, dy] of [[0, 0], [R, R]]) { g.beginPath(); g.arc(x + dx, y + dy, R, 0, Math.PI * 2); g.stroke(); }
  }
  g.fillStyle = '#d9d9d9';
  for (let y = 0; y <= S; y += R * 2) for (let x = 0; x <= S; x += R * 2) { g.beginPath(); g.arc(x + R, y, 9, 0, 7); g.fill(); g.beginPath(); g.arc(x, y + R, 9, 0, 7); g.fill(); }
  grain(g, S, S, 10);
  return c;
}

// Damier
function ichimatsu() {
  const S = 512, n = 4, q = S / n, [c, g] = canvas(S);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.fillStyle = (x + y) & 1 ? '#bdbdbd' : '#f2f2f2'; g.fillRect(x * q, y * q, q, q); }
  grain(g, S, S, 12);
  return c;
}

// Planches de bois
function bois() {
  const S = 512, [c, g] = canvas(S), r = rng(99), plank = 64;
  for (let y = 0; y < S; y += plank) {
    const base = 205 + (r() - 0.5) * 30;
    g.fillStyle = `rgb(${base},${base},${base})`; g.fillRect(0, y, S, plank);
    for (let k = 0; k < 14; k++) {
      const yy = y + 4 + r() * (plank - 8), a = 0.08 + r() * 0.12;
      g.strokeStyle = `rgba(60,60,60,${a})`; g.lineWidth = 1 + r() * 1.5;
      g.beginPath(); g.moveTo(0, yy);
      for (let x = 0; x <= S; x += 32) g.lineTo(x, yy + Math.sin(x * 0.02 + k) * 2);
      g.stroke();
    }
    g.fillStyle = 'rgba(40,40,40,.55)'; g.fillRect(0, y, S, 3);
    const joint = r() * S; g.fillRect(joint, y, 3, plank);
  }
  grain(g, S, S, 14);
  return c;
}

function laque() {
  const S = 128, [c, g] = canvas(S);
  g.fillStyle = '#ececec'; g.fillRect(0, 0, S, S);
  grain(g, S, S, 6);
  return c;
}

function grille() {
  const S = 512, [c, g] = canvas(S);
  g.fillStyle = '#dedede'; g.fillRect(0, 0, S, S);
  g.fillStyle = '#c4c4c4';
  for (let i = 0; i < 8; i++) { g.fillRect(i * 64, 0, 2, S); g.fillRect(0, i * 64, S, 2); }
  g.fillStyle = '#969696'; g.fillRect(0, 0, 4, S); g.fillRect(0, 0, S, 4);
  grain(g, S, S, 10);
  return c;
}

// ---- Enfer: textures pixelisées colorées (teinte objet = blanc) + cartes de lueur ----
const PIX = 32;
function pixelCanvas(fn, n = PIX) {
  const [c, g] = canvas(n); const img = g.createImageData(n, n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const [r, gg, b] = fn(x, y); const i = (y * n + x) * 4; img.data[i] = r; img.data[i + 1] = gg; img.data[i + 2] = b; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0); c._pixel = true; return c;
}
function hash2(x, y, s = 1) { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function netherrack() {
  return pixelCanvas((x, y) => {
    const n = hash2(x, y, 3), blob = hash2(x >> 2, y >> 2, 9);
    const k = 0.55 + n * 0.3 + blob * 0.25;
    return [150 * k + 20, 40 * k + 8, 34 * k + 6];
  });
}
// cartes de lueur (fissures)
function crackMask(n, seed, density) {
  const m = new Float32Array(n * n);
  const r = rng(seed);
  for (let k = 0; k < density; k++) {
    let x = Math.floor(r() * n), y = Math.floor(r() * n), dx = r() < 0.5 ? 1 : -1, dy = r() < 0.5 ? 1 : 0;
    for (let i = 0; i < 6 + r() * 10; i++) {
      m[((y + n) % n) * n + ((x + n) % n)] = 1;
      if (r() < 0.35) dy = r() < 0.5 ? 1 : -1; if (r() < 0.25) dy = 0;
      x += dx; y += dy;
    }
  }
  return m;
}
const MAGMA = crackMask(PIX, 41, 18), BASALT = crackMask(PIX, 77, 5), NRACK = crackMask(PIX, 5, 3);
function magma() {
  return pixelCanvas((x, y) => {
    if (MAGMA[y * PIX + x]) return [255, 120, 30];
    const n = hash2(x, y, 11), b = hash2(x >> 3, y >> 3, 2);
    const k = 0.5 + n * 0.25 + b * 0.2;
    return [90 * k + 20, 30 * k + 10, 22 * k + 8];
  });
}
function basalte() {
  return pixelCanvas((x, y) => {
    if (BASALT[y * PIX + x]) return [255, 110, 40];
    const col = Math.floor(x / 4), n = hash2(x, y, 21), c = hash2(col, 0, 5);
    const edge = x % 4 === 0 ? 0.65 : 1;
    const k = (0.55 + c * 0.25 + n * 0.15) * edge;
    return [78 * k + 10, 74 * k + 10, 86 * k + 12];
  });
}
function obsidienne() {
  return pixelCanvas((x, y) => {
    const n = hash2(x, y, 31), b = hash2(x >> 1, y >> 2, 4);
    const sheen = n > 0.93 ? 1 : 0;
    const k = 0.4 + b * 0.35;
    return [30 * k + 10 + sheen * 60, 18 * k + 8 + sheen * 30, 52 * k + 14 + sheen * 110];
  });
}
function briques() {
  return pixelCanvas((x, y) => {
    const row = Math.floor(y / 4), off = (row & 1) * 4;
    const mortar = y % 4 === 3 || (x + off) % 8 === 7;
    const n = hash2(x, y, 51), brick = hash2(Math.floor((x + off) / 8), row, 7);
    if (mortar) return [40 + n * 14, 16, 20];
    const k = 0.75 + brick * 0.25 + n * 0.12;
    return [150 * k, 52 * k, 56 * k];
  });
}
function glowFrom(mask, color = [255, 140, 40]) {
  return () => pixelCanvas((x, y) => mask[y * PIX + x] ? color : [0, 0, 0]);
}
const GLOW = { magma: glowFrom(MAGMA), basalte: glowFrom(BASALT, [255, 100, 30]), netherrack: glowFrom(NRACK, [200, 60, 20]) };

// ---- Médiéval ----
// Pierres de taille: rangées décalées, joints sombres, variations par bloc
function pierre() {
  const S = 512, [c, g] = canvas(S), r = rng(321);
  g.fillStyle = '#5a5650'; g.fillRect(0, 0, S, S);
  const rowH = 64;
  for (let y = 0; y < S; y += rowH) {
    const off = ((y / rowH) & 1) ? 64 : 0;
    for (let x = -128; x < S + 128; x += 128) {
      const v = 175 + (r() - 0.5) * 50, w = 128 - 6, h = rowH - 6;
      g.fillStyle = `rgb(${v},${v - 4},${v - 12})`;
      g.fillRect(x + off + 3, y + 3, w, h);
      g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x + off + 3, y + 3, w, 4);
      g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x + off + 3, y + h - 1, w, 4);
    }
  }
  grain(g, S, S, 22);
  return c;
}
// Pavés arrondis
function pave() {
  const S = 512, [c, g] = canvas(S), r = rng(77);
  g.fillStyle = '#4e4a44'; g.fillRect(0, 0, S, S);
  const n = 8, q = S / n;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const v = 160 + (r() - 0.5) * 60, cx = x * q + q / 2 + (r() - 0.5) * 8, cy = y * q + q / 2 + (r() - 0.5) * 8;
    const grd = g.createRadialGradient(cx - 8, cy - 8, 4, cx, cy, q * 0.55);
    grd.addColorStop(0, `rgb(${v + 30},${v + 26},${v + 18})`); grd.addColorStop(1, `rgb(${v - 30},${v - 34},${v - 40})`);
    g.fillStyle = grd; g.beginPath(); g.ellipse(cx, cy, q * 0.44, q * 0.4, r() * 3, 0, 7); g.fill();
  }
  grain(g, S, S, 16);
  c._repeat = 4;
  return c;
}

const MAKERS = { grille, seigaiha, asanoha, shippo, ichimatsu, bois, laque, netherrack, basalte, obsidienne, magma, briques, pierre, pave };

function toTexture(cv, aniso) {
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  if (cv._pixel) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapLinearFilter; }
  t.anisotropy = aniso;
  const k = cv._repeat || (cv._pixel ? 2 : 1); // pixel art: 1 tuile = 128u (pixels de 4u)
  t.repeat.set(k, k * cv.width / cv.height);
  return t;
}

// Cartes émissives (null si le motif ne brille pas)
export function makeGlowTextures(renderer) {
  const aniso = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 1;
  return TEXTURES.map(name => GLOW[name] ? toTexture(GLOW[name](), aniso) : null);
}

export function makePatternTextures(renderer) {
  const aniso = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 1;
  // 1 tuile = 256u en largeur; hauteur proportionnelle au canvas
  return TEXTURES.map(name => toTexture(MAKERS[name](), aniso));
}
