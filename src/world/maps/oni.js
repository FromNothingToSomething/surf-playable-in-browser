import { buildLevel, C, TX } from './builder.js';

// Tier 4 — de nuit: rampes de 640, sauts de 768-1024, demi-tours, torsions de 20°, double vallée.
const R = { w: 640, h: 560 };
const STAGES = [
  [{ ...R, dx: -160 }, { ...R, dx: 768, gap: 768 }, { ...R, dx: -768, gap: 768 }, { ...R, dx: 768, gap: 768 }, { ...R, dx: -768, gap: 768 }],
  [{ ...R, dx: -160, bend: 120, L: 7168, drop: 1024 }, { ...R, gap: 768, bend: -120, L: 7168, drop: 1024 }],
  [{ ...R, dx: -160, h: 600, twist: 20, L: 4096 }, { ...R, h: 600, twist: -20, gap: 768, dx: 448 }, { ...R, h: 600, twist: 20, gap: 768, dx: -448 }],
  [{ ...R, dx: -160, L: 3072 }, { valley: true, w: 448, h: 800, L: 3584, dy: 640, gap: 768 }, { ...R, dy: 1200, gap: 768, dx: 512, bend: 90 }, { valley: true, w: 448, h: 800, L: 3584, dy: 500, gap: 768 }, { ...R, dy: 1200, gap: 768 }],
  [{ ...R, dx: -160, L: 4096, drop: 800 }, { ...R, gap: 768, dx: 640 }, { ...R, gap: 768, dx: -640, bend: -60, L: 5120 }, { pr: 'curvepeak', w: 640, h: 600, gap: 1024, L: 4096 }],
];

export const oniMap = () => buildLevel(STAGES, {
  ramps: [{ c: C.red, tx: TX.seigaiha }, { c: C.white, tx: TX.asanoha }],
  torii: C.red, chochin: true, sky: 'nuit', sea: 0x1d2a44,
}, { y: 14000, endLen: 2048, endW: 1024, exitFrac: 0.5, dy: 420 });
