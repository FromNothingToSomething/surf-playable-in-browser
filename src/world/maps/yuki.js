import { buildLinear, C, TX } from './builder.js';

// Linéaire, tier 3 — Yuki (la neige): descente continue en montagne, 6 sections avec checkpoints.
const R = { w: 768, h: 640 };
const SECTIONS = [
  [{ ...R, dx: -192 }, { ...R, dx: 640, gap: 640 }, { ...R, dx: -640, gap: 640 }],
  [{ ...R, bend: 90, L: 5632, drop: 768 }, { ...R, gap: 640, dx: 448 }],
  [{ ...R, h: 700, twist: 16, L: 4096 }, { ...R, h: 700, twist: -16, gap: 640, dx: -384 }],
  [{ ...R }, { valley: true, w: 512, h: 900, L: 4608, dy: 640, gap: 640 }, { ...R, dy: 1300, dx: 448, gap: 512 }],
  [{ ...R, bend: -90, L: 5632, drop: 768 }, { ...R, gap: 768, dx: 256 }, { ...R, gap: 768, dx: -256 }],
  [{ ...R, L: 6144, drop: 2400 }, { ...R, gap: 900, dy: 128, dx: 512 }, { pr: 'curvepeak', w: 768, h: 700, gap: 900, L: 4096 }],
];

export const yukiMap = () => buildLinear(SECTIONS, {
  ramps: [{ c: C.ice, tx: TX.asanoha }, { c: C.white, tx: TX.seigaiha }],
  torii: C.red, chochin: true, sky: 'hiver', sea: 0xdfe8ef, particles: 'neige',
  island: 'ileneige', trees: ['pin'], lantern: 'toro',
}, { y: 26000, exitFrac: 0.5, dy: 400, endLen: 2560, endW: 1280 });
