// Bot bhop: Espace maintenu + auto-strafe vers la plateforme suivante. usage: node test/bhop.mjs [v]
import { buildCollision } from '../src/world/build.js';
import { generateLevel } from '../src/world/mapdata.js';
import { Player } from '../src/player/player.js';
import { simulate } from '../src/physics/gamemovement.js';
import { CollisionWorld } from '../src/physics/collision.js';
import { Run } from '../src/game/stages.js';
import { DT } from '../src/config.js';

const verbose = !!process.env.V;
const map = generateLevel('initiation'), world = new CollisionWorld(buildCollision(map));

function attempt(k, strafe = true, vmax = 900) {
  const run = new Run(); run.reset(map); run.stage = k;
  const st = map.stages[k], path = st.path, p = new Player();
  p.pos.set(st.spawn.p[0], st.spawn.p[1] + 1, st.spawn.p[2]);
  const inp = { yaw: 0, pitch: 0, jumpBuffer: 0, jp: false, wm: { forward: 0, right: 0 }, get wishMove() { return this.wm; }, get jumpPressed() { return this.jp; } };
  let idx = 1, flip = 1, maxSp = 0;
  for (let t = 0; t < 120 / DT; t++) {
    while (idx < path.length - 1 && path[idx].z > p.pos.z - 20) idx++;
    const tg = path[Math.min(idx, path.length - 1)];
    const sp = Math.hypot(p.vel.x, p.vel.z); maxSp = Math.max(maxSp, sp);
    const th = Math.atan2(-(tg.x - p.pos.x), -(tg.z - p.pos.z)); // cap vers la cible
    // trajectoire prévue: atterrit-on sur une plateforme ? (vy du saut au sol, vy réel en l'air)
    const fl = Math.atan2(-p.vel.x, -p.vel.z), fx = -Math.sin(fl), fz = -Math.cos(fl), vy = p.onGround ? 268.33 : p.vel.y;
    const lands = (v2 = sp) => {
      for (const q of path) {
        const dyT = q.y - p.pos.y, disc = vy * vy - 1600 * dyT;
        if (disc < 0) continue;
        const T = (vy + Math.sqrt(disc)) / 800, Lz = p.pos.z + fz * v2 * T, Lx = p.pos.x + fx * v2 * T;
        if (Lz < q.z0 - 60 && Lz > q.z1 + 36 && Math.abs(Lx - q.x) < q.hw - 12) return true;
      }
      return false;
    };
    const good = lands();
    const nearEdge = path.some(q => q.y - p.pos.y > -40 && q.y - p.pos.y < 40 && Math.abs(p.pos.z - q.z1) < 24 && p.pos.z > q.z1 - 8 && Math.abs(p.pos.x - q.x) < q.hw);
    inp.jp = sp >= 200 && (good || nearEdge) && !(p.onGround && sp > vmax + 30);
    if (process.env.DBG && p.onGround && t * DT > 11.5 && t * DT < 14.0) console.log("G", (t * DT).toFixed(2), p.pos.z.toFixed(0), p.pos.y.toFixed(0), "sp", sp.toFixed(0), "jp", inp.jp, "good", good, "edge", nearEdge);
    if (p.onGround) { inp.yaw = th; inp.wm.forward = 1; inp.wm.right = 0; }
    else if (sp > 60) {
      const hv = Math.atan2(-p.vel.x, -p.vel.z);
      let e = th - hv; while (e > Math.PI) e -= 2 * Math.PI; while (e < -Math.PI) e += 2 * Math.PI;
      inp.yaw = hv; inp.wm.forward = 0;
      if (!strafe) inp.wm.right = 0;
      else if (Math.abs(e) > 0.06) inp.wm.right = e > 0 ? -1 : 1;
      else if (sp > vmax || (good && !lands(sp + 25))) inp.wm.right = 0;
      else { flip = -flip; inp.wm.right = flip; }
    }
    simulate(p, inp, DT); world.moveAndSlide(p, DT);
    const ev = run.tick(p, DT);
    if (verbose && t % 20 === 0) console.log((t * DT).toFixed(1), p.pos.toArray().map(v => v.toFixed(0)).join(','), 'v', sp.toFixed(0), p.onGround ? 'G' : 'A', 'idx', idx);
    if (ev === 'next' || ev === 'finish') return { ok: true, time: (t * DT).toFixed(2), maxSp: maxSp.toFixed(0) };
    if (ev === 'fail') return { ok: false, at: p.pos.toArray().map(v => v.toFixed(0)).join(','), idx: `${idx}/${path.length - 1}`, time: (t * DT).toFixed(1), maxSp: maxSp.toFixed(0) };
  }
  return { ok: false, timeout: true, idx: `${idx}/${path.length - 1}` };
}
if (process.env.V) { console.log(JSON.stringify(attempt(+process.env.S || 0, true, +process.env.V))); process.exit(0); }
let fails = 0;
const VM = [350, 400, 450, 500, 600, 900];
map.stages.forEach((s, k) => {
  const rs = VM.map(v => attempt(k, true, v)), b = attempt(k, false);
  const ok = rs.filter(r => r.ok).length;
  if (ok < 2) fails++;
  console.log(`${ok >= 2 ? 'PASS' : 'FAIL'} stage ${k + 1} ${s.name}  vmax ${VM.map((v, i) => v + ':' + (rs[i].ok ? 'ok' : 'X@' + rs[i].idx)).join(' ')} | sans strafe ${b.ok ? 'ok' : 'X@' + b.idx}`);
});
console.log(fails ? `${fails} FAIL` : 'ALL PASS');
process.exit(fails ? 1 : 0);
