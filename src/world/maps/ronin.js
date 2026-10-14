import { buildLevel, C, TX } from './builder.js';

// Tier 3 — rampes de 768, enchaînements latéraux larges, virages à 120°, torsions fortes.
const R = { w: 768, h: 640 };
const STAGES = [
  [{ ...R, dx: -192 }, { ...R, dx: 640, gap: 640 }, { ...R, dx: -640, gap: 640 }, { ...R, dx: 640, gap: 640 }],
  [{ ...R, dx: -192, bend: 90, L: 5632, drop: 768 }, { ...R, bend: -90, L: 5632, gap: 640, drop: 768 }],
  [{ ...R, dx: -192 }, { valley: true, w: 512, h: 900, L: 4608, dy: 640, gap: 640 }, { ...R, dy: 1300, dx: 448, gap: 512 }, { ...R, dx: -448, gap: 640 }],
  [{ ...R, dx: -192, h: 700, twist: 16, L: 4096 }, { ...R, h: 700, twist: -16, gap: 640, dx: 384 }, { ...R, h: 700, twist: 16, gap: 640, dx: -384 }],
  [{ ...R, dx: -192, bend: 60, L: 4096 }, { ...R, bend: -60, L: 4096, gap: 768, dx: 256 }, { ...R, bend: 60, L: 4096, gap: 768, dx: -256 }, { ...R, gap: 768 }],
  [{ ...R, dx: -192, L: 6144, drop: 2400 }, { ...R, gap: 900, dy: 128, dx: 512 }, { pr: 'curvepeak', w: 768, h: 700, gap: 900, bend: -90, L: 5120, drop: 512 }],
];

export const roninMap = () => buildLevel(STAGES, {
  ramps: [{ c: C.indigo, tx: TX.asanoha }, { c: C.gold, tx: TX.ichimatsu }],
  torii: C.red, chochin: true, sky: 'crepuscule', sea: 0x3b4f6e, tree: 'pin',
}, { y: 11000, endLen: 2560, endW: 1280, exitFrac: 0.5, dy: 400 });
