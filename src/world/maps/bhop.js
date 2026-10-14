import { C, TX } from './builder.js';

// Bhop: 3 stages de plateformes à enchaîner en bunnyhop (Espace maintenu + strafe en l'air).
// Plateforme: gap = vide avant (bord à bord), s = taille, dx = décalage latéral, dy = dénivelé.
const TH = 160, X_STEP = 3200, Y0 = 4000;

const gen = (n, s, d, g0, g1, amp, dys) => Array.from({ length: n }, (_, i) => ({
  gap: Math.round(g0 + (g1 - g0) * i / (n - 1)),
  s, d,
  dx: (i % 2 ? 1 : -1) * Math.round(amp * (0.4 + 0.6 * ((i * 7) % 5) / 4)),
  dy: dys[i % dys.length],
}));

const STAGES = [
  { name: 'Initiation', c: [C.turquoise, C.white], tx: TX.pave, plats: gen(14, 256, 288, 64, 176, 40, [0, 0, 16, 0, -16, 0]) },
  { name: 'Rythme', c: [C.gold, C.orange], tx: TX.pierre, plats: gen(16, 176, 256, 110, 210, 80, [0, 16, 0, 24, -32, 0]) },
  { name: 'Maîtrise', c: [C.coral, C.black], tx: TX.grille, plats: gen(18, 144, 224, 160, 250, 70, [0, 0, -24, 0, 16, -16]) },
];

export const bhopMap = () => {
  const objects = [], stages = [];
  STAGES.forEach((S, k) => {
    const X = (k - 1) * X_STEP;
    const box = (cx, top, cz, w, d, c, tx) => objects.push({ t: 'box', p: [cx, top - TH, cz], s: [w, TH, d], r: 0, c, tx });
    // plateforme de départ longue pour prendre de la vitesse
    box(X, Y0, 0, 512, 1024, C.white, TX.pave);
    let cx = X, top = Y0, front = -512, minTop = Y0;
    const path = [{ x: X, z: 0, y: Y0, yaw: 0, face: 0, z0: 512, z1: -512, hw: 256 }];
    S.plats.forEach((q, i) => {
      const cz = front - q.gap - q.d / 2; cx += q.dx; top += q.dy;
      const col = S.c[i % 2];
      box(cx, top, cz, q.s, q.d, col, S.tx);
      front = cz - q.d / 2; minTop = Math.min(minTop, top);
      path.push({ x: cx, z: cz, y: top, yaw: 0, face: 0, z0: cz + q.d / 2, z1: cz - q.d / 2, hw: q.s / 2 });
    });
    // arrivée
    const ez = front - 160 - 512, ew = 640;
    box(cx, top, ez, ew, 1024, C.gold, TX.pave);
    path.push({ x: cx, z: ez, y: top, yaw: 0, face: 0, z0: ez + 512, z1: ez - 512, hw: ew / 2 });
    stages.push({
      spawn: { p: [X, Y0, 380], r: 0, pitch: 0 },
      end: { p: [cx, top - 100, ez], s: [ew, 900, 1024], r: 0 },
      failY: minTop - 900, path, name: S.name,
    });
  });
  return { v: 3, mode: 'stages', floor: false, sky: 'nuit', particles: 'neige', spawn: stages[0].spawn, stages, objects };
};
