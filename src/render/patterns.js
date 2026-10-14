import * as THREE from 'three';

// Motifs japonais procéduraux, en niveaux de gris (teintés par la couleur de l'objet). Tous tuilables.
// 1 tuile = 256 unités monde.
export const TEXTURES = ['grille', 'seigaiha', 'asanoha', 'shippo', 'ichimatsu', 'bois', 'laque'];

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

const MAKERS = { grille, seigaiha, asanoha, shippo, ichimatsu, bois, laque };

export function makePatternTextures(renderer) {
  const aniso = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 1;
  return TEXTURES.map(name => {
    const cv = MAKERS[name]();
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = aniso;
    // garde 1 tuile = 256u en largeur; hauteur proportionnelle au canvas
    t.repeat.set(1, cv.width / cv.height);
    return t;
  });
}
