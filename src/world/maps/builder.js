import { rampFrame } from '../shapes.js';

// Constructeur de levels.
// - "stages": chaque stage = plateforme de départ (torii) -> rampes enchaînées -> arrivée, téléport entre stages.
// - "linéaire": une seule course continue découpée en sections; une porte de checkpoint entre chaque section.
// Paramètres de rampe: w largeur, h hauteur, L longueur, drop dénivelé, gap écart avant la rampe,
// dy décalage vertical avant la rampe, dx décalage latéral, bend courbure (°), twist torsion (°), pr profil, valley (V).

export const C = { white: 6, red: 8, wood: 9, orange: 10, pink: 11, indigo: 12, gold: 13, black: 14, turquoise: 15, sand: 16, coral: 17, ice: 18, deep: 19 };
export const TX = { grille: 0, seigaiha: 1, asanoha: 2, shippo: 3, ichimatsu: 4, bois: 5, laque: 6 };

const deg = (r) => r * 180 / Math.PI;
const fwd = (yaw) => [-Math.sin(yaw), -Math.cos(yaw)];
const rgt = (yaw) => [Math.cos(yaw), -Math.sin(yaw)];
const local = (x0, z0, yaw, lx, lz) => { const R = rgt(yaw), F = fwd(yaw); return [x0 + R[0] * lx - F[0] * lz, z0 + R[1] * lx - F[1] * lz]; };

function torii(objects, x, y, z, yaw, span, th) {
  const R = rgt(yaw), h = 640, r = deg(yaw);
  for (const s of [-1, 1]) objects.push({ t: 'box', p: [x + R[0] * s * span / 2, y, z + R[1] * s * span / 2], s: [48, h, 48], r, c: th.torii, tx: TX.laque });
  objects.push({ t: 'box', p: [x, y + h, z], s: [span + 256, 40, 72], r, c: th.torii, tx: TX.laque });
  objects.push({ t: 'box', p: [x, y + h + 40, z], s: [span + 320, 24, 90], r, c: C.black, tx: TX.laque });
  objects.push({ t: 'box', p: [x, y + h - 120, z], s: [span + 48, 28, 40], r, c: th.torii, tx: TX.laque });
  if (th.chochin) for (const s of [-1, 1]) objects.push({ t: 'deco', k: 'chochin', p: [x + R[0] * s * span * 0.28, y + h - 128, z + R[1] * s * span * 0.28], r });
}

const plat = (th) => th.platform || { c: C.wood, tx: TX.bois };
const trees = (th) => th.trees || [th.tree || 'sakura'];

function startPlatform(objects, X, Y0, th, k) {
  objects.push({ t: 'box', p: [X, Y0 - 384, 0], s: [768, 384, 768], r: 0, ...plat(th) });
  objects.push({ t: 'deco', k: th.island || 'ile', p: [X, Y0 - 384, 0], r: k * 37, sc: 0.95 });
  torii(objects, X, Y0, 160, 0, 520, th);
  const tr = trees(th);
  for (const s of [-1, 1]) {
    objects.push({ t: 'deco', k: tr[(k + (s > 0 ? 1 : 0)) % tr.length], p: [X + s * 300, Y0, 300], r: k * 50 + s * 30, sc: 1.1 });
    objects.push({ t: 'deco', k: th.lantern || 'toro', p: [X + s * 320, Y0, -300], r: 0, sc: 0.6 });
  }
  return { p: [X, Y0, -150], r: 0, pitch: -0.42 };
}

function endPlatform(objects, st, th, opt, k) {
  const F = fwd(st.yaw), top = st.T - (opt.endDrop ?? 520), len = opt.endLen ?? 3584, ew = opt.endW ?? 1792;
  const ex = st.B[0] + F[0] * (256 + len / 2), ez = st.B[1] + F[1] * (256 + len / 2);
  objects.push({ t: 'box', p: [ex, top - 256, ez], s: [ew, 256, len], r: deg(st.yaw), ...plat(th) });
  objects.push({ t: 'deco', k: th.island || 'ile', p: [ex, top - 256, ez], r: k * 23, sc: Math.max(ew, len) / 1100 });
  torii(objects, ex + F[0] * (len / 2 - 200), top, ez + F[1] * (len / 2 - 200), st.yaw, 900, th);
  const tr = trees(th);
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) {
    const [x, z] = local(ex, ez, st.yaw, s * (ew / 2 - 150), -len / 2 + 700 + i * 900);
    objects.push({ t: 'deco', k: i === 1 ? (th.lantern || 'toro') : tr[(i + k + (s > 0 ? 1 : 0)) % tr.length], p: [x, top, z], r: i * 70 + s * 20, sc: i === 1 ? 1 : 1.6 });
  }
  return { end: { p: [ex, top - 600, ez], s: [Math.max(2048, ew + 256), 2600, len + 512], r: deg(st.yaw) }, top };
}

// Place une suite de rampes à partir de l'état courant (B = point arrière de crête, T = hauteur de crête, yaw).
function placeSegments(st, segs, th, opt, first) {
  const placed = [];
  segs.forEach((sg, i) => {
    if (!(first && i === 0)) {
      const F = fwd(st.yaw);
      st.B = [st.B[0] + F[0] * (sg.gap ?? 384), st.B[1] + F[1] * (sg.gap ?? 384)];
      st.T -= sg.dy ?? opt.dy ?? 256;
    }
    const R = rgt(st.yaw), dx = sg.dx || 0;
    const w = sg.w ?? 1024, h = sg.h ?? 640, L = sg.L ?? 3584, drop = sg.drop ?? 384;
    const look = th.ramps[st.n++ % th.ramps.length];
    const pieces = sg.valley
      ? [{ pr: 'wedge', off: (w / 2), r: 0 }, { pr: 'wedge', off: -(w / 2), r: 180 }]
      : [{ pr: sg.pr || 'peak', off: 0, r: 0 }];
    let last = null;
    for (const pc of pieces) {
      const o = { t: 'ramp', pr: pc.pr, p: [0, 0, 0], s: [w, h, L], r: deg(st.yaw) + pc.r, drop: sg.valley ? 0 : drop, bend: sg.bend || 0, twist: sg.twist || 0, c: look.c, tx: look.tx };
      const f0 = rampFrame(o, pc.r ? 1 : 0);
      const lat = dx + pc.off;
      o.p = [st.B[0] + R[0] * lat - f0.pos.x, st.T - h - o.drop, st.B[1] + R[1] * lat - f0.pos.z];
      st.objects.push(o);
      st.minBase = Math.min(st.minBase, o.p[1] - Math.abs(o.twist || 0) * 12);
      if (!pc.r) last = o;
    }
    placed.push({ o: last, sg, w, h });
    const face = sg.valley ? 0 : w / 4;
    for (let j = 0; j <= 24; j++) {
      const f = rampFrame(last, j / 24), Rr = rgt(f.yaw);
      const cx = f.pos.x - (sg.valley ? Rr[0] * w / 2 : 0), cz = f.pos.z - (sg.valley ? Rr[1] * w / 2 : 0);
      st.path.push({ x: cx, z: cz, y: f.top, yaw: f.yaw, face });
    }
    const f1 = rampFrame(last, 1), R1 = rgt(f1.yaw);
    st.B = sg.valley ? [f1.pos.x - R1[0] * w / 2, f1.pos.z - R1[1] * w / 2] : [f1.pos.x, f1.pos.z];
    st.yaw = f1.yaw;
    st.T = sg.valley ? st.T : f1.top - h * (opt.exitFrac ?? 0);
  });
  return placed;
}

const newState = (X, Y0, objects) => ({ B: [X, -192], T: Y0 - 192, yaw: 0, minBase: Infinity, path: [], objects, n: 0 });

export function buildStage(k, segs, objects, stages, th, opt = {}) {
  const X = (k - 4) * (opt.spacing ?? 18000), Y0 = opt.y ?? 7000;
  const spawn = startPlatform(objects, X, Y0, th, k);
  const st = newState(X, Y0, objects);
  placeSegments(st, segs, th, opt, true);
  const { end, top } = endPlatform(objects, st, th, opt, k);
  stages.push({ spawn, end, failY: Math.min(st.minBase, top - 256) - 700, path: st.path });
}

export function buildLevel(stagesDef, th, opt = {}) {
  const objects = [], stages = [];
  stagesDef.forEach((s, k) => buildStage(k, s, objects, stages, th, opt));
  return { v: 3, mode: 'stages', floor: true, floorColor: th.sea ?? 0x3f8494, sky: th.sky || 'jour', particles: th.particles || 'petales', spawn: stages[0].spawn, stages, objects };
}

// Course linéaire: sections enchaînées sans plateforme intermédiaire. Entre deux sections, une porte de checkpoint.
// En cas de chute: retour au dernier checkpoint, au-dessus de la rampe, avec de l'élan.
export function buildLinear(sections, th, opt = {}) {
  const objects = [], stages = [];
  const Y0 = opt.y ?? 16000;
  const spawn0 = startPlatform(objects, 0, Y0, th, 0);
  const st = newState(0, Y0, objects);
  let spawn = spawn0;
  sections.forEach((segs, k) => {
    st.minBase = Infinity;
    const pathStart = st.path.length;
    const placed = placeSegments(st, segs, th, opt, k === 0);
    const path = st.path.slice(pathStart);
    const isLast = k === sections.length - 1;
    let end, top = Infinity;
    if (isLast) ({ end, top } = endPlatform(objects, st, th, opt, k));
    // le checkpoint de la section suivante se place au début de sa première rampe: on le calcule au prochain tour
    stages.push({ spawn, end, failY: Math.min(st.minBase, top - 256) - 900, path, _first: placed[0] });
  });
  // checkpoints: zone de fin de la section k = entrée de la section k+1; spawn de k+1 au-dessus de sa 1re rampe
  for (let k = 1; k < stages.length; k++) {
    const { o, w, h } = stages[k]._first;
    const f0 = rampFrame(o, 0), Rr = rgt(f0.yaw), F = fwd(f0.yaw);
    const zw = w * 2 + 1536;
    stages[k - 1].end = {
      p: [f0.pos.x - F[0] * 200, f0.top - 4200, f0.pos.z - F[1] * 200], s: [zw, 5600, 500], r: deg(f0.yaw),
      cp: true, gate: { y: f0.top - 300, w: w * 1.7, h: 1500 },
    };
    const fs = rampFrame(o, Math.min(0.12, 500 / o.s[2]));
    const sx = fs.pos.x + Rr[0] * w / 4, sz = fs.pos.z + Rr[1] * w / 4;
    stages[k].spawn = { p: [sx, fs.top - h / 2 + 140, sz], r: deg(fs.yaw), pitch: -0.15, v: [F[0] * 700, 0, F[1] * 700] };
  }
  for (const s of stages) delete s._first;
  // décor flottant de part et d'autre de chaque section
  const tr = trees(th);
  stages.forEach((sg, k) => {
    const q = sg.path[Math.floor(sg.path.length / 2)], Rr = rgt(q.yaw);
    for (const s of [-1, 1]) {
      const d = 2600 + ((k * 7 + (s > 0 ? 3 : 0)) % 5) * 300, y = q.y - 1300 - ((k + (s > 0 ? 1 : 0)) % 3) * 500;
      const x = q.x + Rr[0] * s * d, z = q.z + Rr[1] * s * d;
      objects.push({ t: 'deco', k: th.island || 'ile', p: [x, y, z], r: k * 41 + s * 13, sc: 1.3 });
      objects.push({ t: 'deco', k: tr[(k + (s > 0 ? 1 : 0)) % tr.length], p: [x + 150, y, z - 100], r: k * 30, sc: 1.5 });
      objects.push({ t: 'deco', k: th.lantern || 'toro', p: [x - 250, y, z + 150], r: 0, sc: 0.9 });
    }
  });
  return { v: 3, mode: 'lineaire', floor: true, floorColor: th.sea ?? 0x3f8494, sky: th.sky || 'jour', particles: th.particles || 'petales', spawn: spawn0, stages, objects };
}
