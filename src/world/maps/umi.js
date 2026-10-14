import { buildLinear, C, TX } from './builder.js';

// Linéaire, tier 2 — Umi (la mer): une seule descente continue sous l'eau, 6 sections avec checkpoints.
const W = { w: 960 };
const SECTIONS = [
  [{ ...W, dx: -240 }, { ...W }, { ...W, dx: 384 }],
  [{ ...W, bend: 60, L: 4608, drop: 640 }, { ...W, bend: 30, L: 3584 }],
  [{ ...W, pr: 'curvepeak', h: 800 }, { valley: true, w: 576, h: 960, L: 4096, dy: 600 }, { ...W, dy: 1300 }],
  [{ ...W, L: 5120, drop: 1600 }, { ...W, dx: -384, gap: 512 }, { ...W, dx: 384, gap: 512 }],
  [{ ...W, twist: 12, h: 820 }, { ...W, twist: -12, h: 820, bend: -45 }],
  [{ ...W, bend: -60, L: 4608, drop: 640 }, { ...W, pr: 'curvepeak', h: 800 }, { ...W, L: 4096, drop: 1024 }],
];

export const umiMap = () => buildLinear(SECTIONS, {
  ramps: [{ c: C.turquoise, tx: TX.seigaiha }, { c: C.sand, tx: TX.shippo }, { c: C.deep, tx: TX.asanoha }],
  torii: C.red, chochin: true, sky: 'ocean', sea: 0x1d6f80, particles: 'bulles',
  platform: { c: C.sand, tx: TX.ichimatsu }, island: 'recif', trees: ['corail', 'algue'], lantern: 'toro',
}, { y: 22000, exitFrac: 0.4, dy: 320 });
