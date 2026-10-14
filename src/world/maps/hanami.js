import { buildLevel, C, TX } from './builder.js';

// Tier 2 — rampes plus étroites, écarts et décalages plus grands, virages serrés.
const R = { w: 896 };
const STAGES = [
  [{ ...R, dx: -224 }, { ...R, dx: 512, gap: 512 }, { ...R, dx: -512, gap: 512 }],
  [{ ...R, dx: -224, bend: 90, L: 4608, drop: 640 }, { ...R, bend: -90, L: 4608, gap: 512 }],
  [{ ...R, dx: -224, pr: 'curvepeak', h: 780 }, { valley: true, w: 576, h: 960, L: 4096, dy: 600 }, { ...R, dy: 1300, twist: 12, h: 760 }],
  [{ ...R, dx: -224, L: 5120, drop: 1800 }, { ...R, gap: 640, dy: 384, dx: 384 }, { ...R, gap: 640, dx: -384 }],
  [{ ...R, dx: -224, twist: 14, h: 820 }, { ...R, twist: -14, h: 820, gap: 512, bend: 45 }, { ...R, gap: 512, bend: 45 }],
  [{ ...R, dx: -224, L: 4096, drop: 1024 }, { ...R, bend: 90, L: 6144, drop: 512 }, { ...R, gap: 640, dx: 512 }, { ...R, gap: 640, dx: -512, pr: 'curvepeak', h: 780 }],
];

export const hanamiMap = () => buildLevel(STAGES, {
  ramps: [{ c: C.pink, tx: TX.shippo }, { c: C.white, tx: TX.seigaiha }],
  torii: C.red, chochin: true, sky: 'jour', sea: 0x4a8fa0,
}, { y: 9000, endLen: 3072, endW: 1536, exitFrac: 0.4, dy: 320 });
