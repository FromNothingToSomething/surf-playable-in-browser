// Bot de validation: tente chaque stage de la map par défaut en surfant (air-strafe vers la face de la rampe suivante).
import { buildCollision } from '../src/world/build.js';
import { generateLevel } from '../src/world/mapdata.js';
import { LEVELS } from '../src/world/levels.js';
import { Player } from '../src/player/player.js';
import { simulate } from '../src/physics/gamemovement.js';
import { CollisionWorld } from '../src/physics/collision.js';
import { Run } from '../src/game/stages.js';
import { DT } from '../src/config.js';

// usage: node test/bot.mjs [level|all] [stage] [v]
const which = process.argv[2] || 'all';
const only = process.argv[3] ? +process.argv[3] - 1 : -1;
const verbose = !!process.argv[4];
let map, world;

function attempt(k, cfg, full = false) {
  const run = new Run(); run.reset(map);
  const secs = map.sections && !full;
  if (secs) run.section = k; else run.stage = k;
  const st = secs ? map.sections[k] : map.stages[k], path = full ? map.stages.flatMap(s => s.path) : st.path;
  const p = new Player();
  p.pos.set(st.spawn.p[0], st.spawn.p[1] + 1, st.spawn.p[2]);
  if (st.spawn.v) p.vel.set(...st.spawn.v);
  const inp = { yaw: (st.spawn.r || 0) * Math.PI / 180, pitch: 0, jumpBuffer: 0, wm: { forward: 1, right: 0 },
    get wishMove() { return this.wm; }, get jumpPressed() { return false; } };
  let idx = 0, side = 1, left = !!st.spawn.v, grounded = false, maxSpeed = 0;
  for (let t = 0; t < (full ? 400 : 60) / DT; t++) {
    if (p.onGround) grounded = true; else if (grounded) left = true;
    if (left) {
      const cfgNow = typeof cfg === 'function' ? cfg(idx) : cfg;
      // point de piste le plus proche (en avant)
      let best = idx, bd = Infinity;
      for (let i = idx; i < Math.min(path.length, idx + 40); i++) {
        const d = (path[i].x - p.pos.x) ** 2 + (path[i].z - p.pos.z) ** 2;
        if (d < bd) { bd = d; best = i; }
      }
      idx = best;
      const c = path[idx];
      const rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw);
      const lat = (p.pos.x - c.x) * rx + (p.pos.z - c.z) * rz;
      if (p.surfNormal && c.face) side = lat >= 0 ? 1 : -1;
      const j = Math.min(path.length - 1, idx + cfgNow.look), tp = path[j];
      const trx = Math.cos(tp.yaw), trz = -Math.sin(tp.yaw);
      const tx = tp.x + trx * side * tp.face * cfgNow.ff, tz = tp.z + trz * side * tp.face * cfgNow.ff;
      const sp = Math.hypot(p.vel.x, p.vel.z);
      maxSpeed = Math.max(maxSpeed, sp);
      if (sp > 80) inp.yaw = Math.atan2(-p.vel.x, -p.vel.z); else inp.yaw = c.yaw;
      const dx = tx - p.pos.x, dz = tz - p.pos.z;
      const lr = dx * Math.cos(inp.yaw) + dz * -Math.sin(inp.yaw);
      inp.wm.forward = 0;
      inp.wm.right = lr > 24 ? 1 : lr < -24 ? -1 : 0;
      if (cfgNow.hold && p.surfNormal && c.face) {
        // sur la rampe: regarder le long de la piste et appuyer vers la rampe (technique standard)
        inp.yaw = tp.yaw;
        const n = p.surfNormal, ry = Math.cos(inp.yaw), rz2 = -Math.sin(inp.yaw);
        inp.wm.right = (n.x * ry + n.z * rz2) > 0 ? -1 : 1;
      }
    }
    simulate(p, inp, DT);
    world.moveAndSlide(p, DT);
    const ev = run.tick(p, DT);
    if (verbose && t % 25 === 0) console.log(t * DT, p.pos.toArray().map(v => v.toFixed(0)).join(','), 'v', Math.hypot(p.vel.x, p.vel.z).toFixed(0), p.onGround ? 'G' : p.surfNormal ? 'S' : 'A', 'idx', idx);
    if (full && ev === 'cp') continue;
    if (ev === 'next' || ev === 'finish' || ev === 'cp') return { ok: true, time: (t * DT).toFixed(2), maxSpeed: maxSpeed.toFixed(0) };
    if (ev === 'fail') return { ok: false, time: (t * DT).toFixed(2), at: p.pos.toArray().map(v => v.toFixed(0)).join(','), idx: `${idx}/${path.length}` };
  }
  return { ok: false, timeout: true, at: p.pos.toArray().map(v => v.toFixed(0)).join(','), idx: `${idx}/${path.length}` };
}

// Plusieurs styles de pilotage: un stage est validé si au moins un style le termine.
const CFGS = [];
for (const hold of [true, false]) for (const look of [3, 5, 8]) for (const ff of [1, 0.5, 1.5]) CFGS.push({ hold, look, ff });
let fails = 0;
for (const L of LEVELS) {
if (which !== 'all' && which !== L.id) continue;
map = generateLevel(L.id); world = new CollisionWorld(buildCollision(map));
console.log(`== ${L.name} (tier ${L.tier})`);
const okCfgs = [];
(map.sections || map.stages).forEach((_, k) => {
  if (only >= 0 && k !== only) return;
  let r, ok = 0, firstOk = null;
  okCfgs[k] = [];
  for (const cfg of (verbose ? CFGS.slice(0, 1) : CFGS)) { r = attempt(k, cfg); if (r.ok) { ok++; okCfgs[k].push(cfg); firstOk = firstOk || { ...r, cfg }; } }
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'} stage ${k + 1}  styles réussis ${ok}/${CFGS.length}`, JSON.stringify(firstOk || r));
});
if (map.mode === 'lineaire' && only < 0) {
  let ok = 0, best = null;
  const times = [];
  for (const cfg of CFGS) { const r = attempt(0, cfg, true); if (r.ok) { ok++; times.push(+r.time); best = best || { ...r, cfg }; } }
  if (map.sections) {
    // pilote "adaptatif": dans chaque section, utilise un style qui a réussi cette section (comme un joueur qui connaît la map)
    const starts = []; let n = 0; for (const s of map.sections) { starts.push(n); n += s.path.length; }
    const secOf = (i) => { let k = 0; while (k + 1 < starts.length && i >= starts[k + 1]) k++; return k; };
    for (let v = 0; v < 6; v++) {
      const pick = (i) => { const c = okCfgs[secOf(i)] || []; return c.length ? c[v % c.length] : CFGS[0]; };
      const r = attempt(0, pick, true);
      console.log(`  pilote adaptatif v${v}:`, JSON.stringify(r));
      if (r.ok) { ok++; best = best || { ...r, cfg: 'adaptatif v' + v }; }
    }
  }
  console.log(`${map.noCheckpoint ? (ok ? 'PASS' : 'FAIL') : 'INFO'} run complet sans chute: ${ok}/${CFGS.length} styles`, best ? JSON.stringify(best) : '');
  if (times.length) console.log(`  temps des runs réussis: ${times.map(t => t.toFixed(1) + ' s').join(', ')}`);
  if (map.noCheckpoint && !ok) fails++;
}
}
console.log(fails ? `${fails} FAIL` : 'ALL PASS');
process.exit(fails ? 1 : 0);
