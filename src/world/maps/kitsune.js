import { buildLevel, C, TX } from './builder.js';

// Tier 1 — 9 stages (conservé).
const STAGES = [
  [{ dx: -256 }, { dy: 192 }],
  [{ dx: -256, L: 3072 }, { dx: 384, L: 3072 }, { dx: -384, L: 3072 }],
  [{ dx: -256 }, { bend: 60, L: 4096, drop: 512 }, { bend: 30, L: 3072 }],
  [{ dx: -256, L: 5120, drop: 1536 }, { L: 4608, drop: 1280 }],
  [{ dx: -256, pr: 'curvepeak', h: 820 }, { pr: 'curvepeak', h: 820, bend: -45, L: 4096 }],
  [{ dx: -256, h: 820, twist: 10, L: 4096 }, { h: 820, twist: -10, L: 4096 }],
  [{ dx: -256 }, { valley: true, w: 640, h: 1000, L: 4096, dy: 520 }, { dy: 1300 }],
  [{ dx: -256, bend: 45, L: 4096 }, { bend: -90, L: 5120, drop: 640 }, { bend: 45, L: 4096 }],
  [{ dx: -256, L: 4096, drop: 1024 }, { pr: 'curvepeak', h: 820, bend: 90, L: 5120, drop: 768 }, { twist: 8, h: 760, L: 3584 }],
];

export const kitsuneMap = () => buildLevel(STAGES, {
  ramps: [{ c: C.orange, tx: TX.seigaiha }, { c: C.white, tx: TX.asanoha }],
  torii: C.red, chochin: true, sky: 'jour', sea: 0x3f8494,
}, { y: 7000 });
