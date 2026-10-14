import { rampFrame } from '../shapes.js';

// Constructeur de levels "staged": chaque stage = plateforme de départ (torii) -> rampes enchaînées -> arrivée.
// Paramètres de rampe: w largeur, h hauteur, L longueur, drop dénivelé, gap écart avant la rampe,
// dy décalage vertical avant la rampe, dx décalage latéral, bend courbure (°), twist torsion (°), pr profil, valley (V).

export const C = { white: 6, red: 8, wood: 9, orange: 10, pink: 11, indigo: 12, gold: 13, black: 14 };
export const TX = { grille: 0, seigaiha: 1, asanoha: 2, shippo: 3, ichimatsu: 4, bois: 5, laque: 6 };

const deg = (r) => r * 180 / Math.PI;
const fwd = (yaw) => [-Math.sin(yaw), -Math.cos(yaw)];
const rgt = (yaw) => [Math.cos(yaw), -Math.sin(yaw)];

function torii(objects, x, y, z, yaw, span, th) {
  const R = rgt(yaw), h = 640, r = deg(yaw);
  for (const s of [-1, 1]) objects.push({ t: 'box', p: [x + R[0] * s * span / 2, y, z + R[1] * s * span / 2], s: [48, h, 48], r, c: th.torii, tx: TX.laque });
  objects.push({ t: 'box', p: [x, y + h, z], s: [span + 256, 40, 72], r, c: th.torii, tx: TX.laque });
  objects.push({ t: 'box', p: [x, y + h + 40, z], s: [span + 320, 24, 90], r, c: C.black, tx: TX.laque });
  objects.push({ t: 'box', p: [x, y + h - 120, z], s: [span + 48, 28, 40], r, c: th.torii, tx: TX.laque });
  if (th.chochin) for (const s of [-1, 1]) objects.push({ t: 'deco', k: 'chochin', p: [x + R[0] * s * span * 0.28, y + h - 128, z + R[1] * s * span * 0.28], r });
}

const local = (x0, z0, yaw, lx, lz) => { const R = rgt(yaw), F = fwd(yaw); return [x0 + R[0] * lx - F[0] * lz, z0 + R[1] * lx - F[1] * lz]; };

export function buildStage(k, segs, objects, stages, th, opt = {}) {
  const X = (k - 4) * (opt.spacing ?? 18000), Y0 = opt.y ?? 7000;
  let yaw = 0;
  // départ: plateforme bois sur île flottante
  objects.push({ t: 'box', p: [X, Y0 - 384, 0], s: [768, 384, 768], r: 0, c: C.wood, tx: TX.bois });
  objects.push({ t: 'deco', k: 'ile', p: [X, Y0 - 384, 0], r: k * 37, sc: 0.95 });
  torii(objects, X, Y0, 160, 0, 520, th);
  for (const s of [-1, 1]) {
    objects.push({ t: 'deco', k: th.tree || 'sakura', p: [X + s * 300, Y0, 300], r: k * 50 + s * 30, sc: 1.1 });
    objects.push({ t: 'deco', k: 'toro', p: [X + s * 320, Y0, -300], r: 0, sc: 0.6 });
  }
  const spawn = { p: [X, Y0, -150], r: 0, pitch: -0.42 };
  let B = [X, -192], T = Y0 - 192, minBase = Infinity;
  const path = [];
  segs.forEach((sg, idx) => {
    if (idx > 0) {
      const F = fwd(yaw);
      B = [B[0] + F[0] * (sg.gap ?? 384), B[1] + F[1] * (sg.gap ?? 384)];
      T -= sg.dy ?? opt.dy ?? 256;
    }
    const R = rgt(yaw), dx = sg.dx || 0;
    const w = sg.w ?? 1024, h = sg.h ?? 640, L = sg.L ?? 3584, drop = sg.drop ?? 384;
    const look = th.ramps[idx % th.ramps.length];
    const pieces = sg.valley
      ? [{ pr: 'wedge', off: (w / 2), r: 0 }, { pr: 'wedge', off: -(w / 2), r: 180 }]
      : [{ pr: sg.pr || 'peak', off: 0, r: 0 }];
    let last = null;
    for (const pc of pieces) {
      const o = { t: 'ramp', pr: pc.pr, p: [0, 0, 0], s: [w, h, L], r: deg(yaw) + pc.r, drop: sg.valley ? 0 : drop, bend: sg.bend || 0, twist: sg.twist || 0, c: look.c, tx: look.tx };
      const f0 = rampFrame(o, pc.r ? 1 : 0);
      const lat = dx + pc.off;
      o.p = [B[0] + R[0] * lat - f0.pos.x, T - h - o.drop, B[1] + R[1] * lat - f0.pos.z];
      objects.push(o);
      minBase = Math.min(minBase, o.p[1] - Math.abs(o.twist || 0) * 12);
      if (!pc.r) last = o;
    }
    const face = sg.valley ? 0 : w / 4;
    for (let i = 0; i <= 24; i++) {
      const f = rampFrame(last, i / 24), Rr = rgt(f.yaw);
      const cx = f.pos.x - (sg.valley ? Rr[0] * w / 2 : 0), cz = f.pos.z - (sg.valley ? Rr[1] * w / 2 : 0);
      path.push({ x: cx, z: cz, y: f.top, yaw: f.yaw, face });
    }
    const f1 = rampFrame(last, 1), R1 = rgt(f1.yaw);
    B = sg.valley ? [f1.pos.x - R1[0] * w / 2, f1.pos.z - R1[1] * w / 2] : [f1.pos.x, f1.pos.z];
    yaw = f1.yaw;
    T = sg.valley ? T : f1.top - h * (opt.exitFrac ?? 0);
  });
  // arrivée
  const F = fwd(yaw), top = T - (opt.endDrop ?? 520), len = opt.endLen ?? 3584, ew = opt.endW ?? 1792;
  const ex = B[0] + F[0] * (256 + len / 2), ez = B[1] + F[1] * (256 + len / 2);
  objects.push({ t: 'box', p: [ex, top - 256, ez], s: [ew, 256, len], r: deg(yaw), c: C.wood, tx: TX.bois });
  objects.push({ t: 'deco', k: 'ile', p: [ex, top - 256, ez], r: k * 23, sc: Math.max(ew, len) / 1100 });
  torii(objects, ex + F[0] * (len / 2 - 200), top, ez + F[1] * (len / 2 - 200), yaw, 900, th);
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) {
    const [x, z] = local(ex, ez, yaw, s * (ew / 2 - 150), -len / 2 + 700 + i * 900);
    objects.push({ t: 'deco', k: i === 1 ? 'toro' : (th.tree || 'sakura'), p: [x, top, z], r: i * 70 + s * 20, sc: i === 1 ? 1 : 1.6 });
  }
  const end = { p: [ex, top - 600, ez], s: [Math.max(2048, ew + 256), 2600, len + 512], r: deg(yaw) };
  stages.push({ spawn, end, failY: Math.min(minBase, top - 256) - 700, path });
}

export function buildLevel(stagesDef, th, opt = {}) {
  const objects = [], stages = [];
  stagesDef.forEach((s, k) => buildStage(k, s, objects, stages, th, opt));
  return { v: 3, floor: true, floorColor: th.sea ?? 0x3f8494, sky: th.sky || 'jour', spawn: stages[0].spawn, stages, objects };
}
