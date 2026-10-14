import { buildLinear, C, TX } from './builder.js';

// Linéaire SANS checkpoint, tier 5 — Inferno: descente infernale au-dessus d'une mer de lave.
// Rampes de 704 (60°), sauts latéraux de 512-640, virages à 90-120°, torsions de 16-18°, vallées en V, rampes montantes.
const R = { w: 704, h: 620 };
const S = [
  [{ ...R, dx: -176, L: 4096, drop: 512 }, { ...R, dx: 512, gap: 640 }, { ...R, dx: -512, gap: 640 }, { ...R, L: 4608, drop: 900 }],
  [{ ...R, L: 3584 }, { ...R, bend: 60, L: 5632, drop: 600, gap: 640 }, { ...R, gap: 640, dx: 256 }, { ...R, bend: -60, L: 5632, drop: 600, gap: 640 }],
  [{ ...R, h: 680, twist: 16, L: 4096 }, { ...R, h: 680, twist: -16, gap: 640, dx: -384 }, { ...R, h: 680, twist: 16, gap: 640, dx: 384 }],
  [{ ...R, L: 5120, drop: 1400 }, { ...R, L: 4096, drop: -500, gap: 512 }, { ...R, gap: 768, dx: -448 }],
  [{ ...R }, { valley: true, w: 480, h: 860, L: 4608, dy: 640, gap: 640 }, { ...R, dy: 1300, gap: 512, dx: 448 }, { valley: true, w: 480, h: 860, L: 4096, dy: 500, gap: 640 }, { ...R, dy: 1300, gap: 640 }],
  [{ ...R, L: 3584 }, { ...R, bend: -90, L: 6144, drop: 800, gap: 640 }, { ...R, gap: 768, dx: 448 }, { ...R, bend: 90, L: 6144, drop: 800, gap: 768 }],
  [{ pr: 'curvepeak', w: 704, h: 680, L: 4096 }, { pr: 'curvepeak', w: 704, h: 680, gap: 768, dx: -448, twist: 10 }, { ...R, L: 4096, drop: -400, gap: 640 }, { ...R, gap: 768, dx: 512 }],
  [{ ...R, L: 6144, drop: 2000 }, { ...R, gap: 900, dy: 128, dx: -512 }, { ...R, gap: 900, dx: 512, bend: 60, L: 4608 }, { ...R, gap: 900, bend: -60, L: 4608 }],
  [{ ...R, twist: 18, h: 700 }, { ...R, twist: -18, h: 700, gap: 768, dx: 448, bend: 45 }, { ...R, gap: 768, dx: -448, bend: -45 }, { ...R, L: 4096, drop: -500, gap: 640 }],
  [{ ...R, L: 5120, drop: 1200 }, { ...R, gap: 900, dx: 640 }, { ...R, gap: 900, dx: -640 }, { pr: 'curvepeak', w: 704, h: 680, gap: 1024, L: 5120, drop: 900 }],
];
// miroir gauche/droite d'une section
const M = (sec) => sec.map(sg => ({ ...sg, dx: -(sg.dx || 0), bend: -(sg.bend || 0), twist: -(sg.twist || 0) }));
// 17 sections enchaînées
const SECTIONS = [S[0], S[1], S[2], S[3], S[4], M(S[0]), S[5], S[6], M(S[2]), S[7], M(S[3]), S[8], M(S[6]), M(S[4]), S[0], M(S[9]), S[9]];

export const infernoMap = () => buildLinear(SECTIONS, {
  ramps: [{ c: C.blanc, tx: TX.netherrack }, { c: C.blanc, tx: TX.basalte }, { c: C.blanc, tx: TX.magma }, { c: C.blanc, tx: TX.obsidienne }],
  gate: 'portail', sky: 'enfer', particles: 'braises', floorKind: 'lave', sea: 0x3a0c06,
  platform: { c: C.blanc, tx: TX.briques }, island: 'ilenether', trees: ['champi_c', 'champi_w', 'colonnes'], lantern: 'brasero', floating: 'glowstone',
}, { y: 86000, exitFrac: 0.5, dy: 400, endLen: 2560, endW: 1280, noCheckpoint: true, failMargin: 2600 });
