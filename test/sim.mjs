import * as THREE from 'three';
import { buildCollision } from '../src/world/build.js';
import { makeGeometry, PROFILES, surfAngles } from '../src/world/shapes.js';
import { defaultMap, validate, normalize } from '../src/world/mapdata.js';
import { Player } from '../src/player/player.js';
import { simulate } from '../src/physics/gamemovement.js';
import { CollisionWorld } from '../src/physics/collision.js';
import { DT } from '../src/config.js';

let fails = 0;
const ok = (name, cond, info = '') => { if (!cond) fails++; console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : '')); };
const mkInput = () => ({ yaw: 0, pitch: 0, jumpBuffer: 0, jumpHeld: false, wm: { forward: 0, right: 0 },
  get wishMove() { return this.wm; }, get jumpPressed() { return this.jumpBuffer > 0; } });
const hs = (p) => Math.hypot(p.vel.x, p.vel.z);
const world = (map) => new CollisionWorld(buildCollision({ v: 2, floor: true, spawn: { p: [0, 0, 0] }, objects: [], ...map }));
const stepper = (w) => (p, i) => {
  i.jumpBuffer = i.jumpHeld ? 0.1 : Math.max(0, i.jumpBuffer - DT);
  simulate(p, i, DT); w.moveAndSlide(p, DT);
};
// pénétration résiduelle: combien la capsule bouge si on la dépénètre
const penetration = (w, p) => { const q = p.pos.clone(); w.depenetrate(q, p.radius - 0.05, p.height, null); return q.distanceTo(p.pos); };

// ---------- géométrie ----------
function signedVolume(g) {
  const a = g.attributes.position; let v = 0;
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  for (let i = 0; i < a.count; i += 3) {
    A.fromBufferAttribute(a, i); B.fromBufferAttribute(a, i + 1); C.fromBufferAttribute(a, i + 2);
    v += A.dot(B.clone().cross(C)) / 6;
  }
  return v;
}
for (const pr of PROFILES) for (const [bend, twist, drop] of [[0, 0, 0], [90, 0, 300], [-60, 20, 500]]) {
  const g = makeGeometry({ t: 'ramp', pr, s: [1024, 1000, 2048], top: 128, bend, twist, drop });
  const v = signedVolume(g);
  if (v <= 0) ok(`volume ${pr} b${bend} t${twist}`, false, v.toFixed(0));
}
ok('rampes fermées et orientées (tous profils, courbure, torsion)', true);
ok('volume box', signedVolume(makeGeometry({ t: 'box', s: [100, 100, 100] })) > 0);
ok('map exemple valide', validate(defaultMap()));
ok('migration v1 wedge', normalize({ v: 1, spawn: { p: [0, 0, 0] }, objects: [{ t: 'wedge', p: [0, 0, 0], s: [1, 1, 1] }] }).objects[0].pr === 'wedge');

// ---------- sol plat ----------
{
  const w = world({}), step = stepper(w);
  const p = new Player(), i = mkInput(); p.pos.set(0, 100, 0);
  for (let t = 0; t < 200; t++) step(p, i);
  ok('repos au sol', p.onGround && Math.abs(p.pos.y) < 0.1 && p.vel.y === 0, `y=${p.pos.y.toFixed(3)}`);
  let flips = 0, prev = p.onGround;
  for (let t = 0; t < 1 / DT; t++) { step(p, i); if (p.onGround !== prev) flips++; prev = p.onGround; }
  ok('sol stable (pas de clignotement)', flips === 0);

  i.jumpHeld = true; step(p, i); i.jumpHeld = false;
  let maxY = p.pos.y, air = 1;
  while (!p.onGround && air < 300) { step(p, i); maxY = Math.max(maxY, p.pos.y); air++; }
  ok('saut', air * DT > 0.6 && air * DT < 0.75 && maxY > 40 && maxY < 50, `t=${(air * DT).toFixed(3)}s apex=${maxY.toFixed(1)}`);

  p.vel.set(0, 0, -300);
  for (let t = 0; t < 1 / DT; t++) step(p, i);
  ok('friction sol', hs(p) < 10, `v=${hs(p).toFixed(1)}`);

  // strafe + bhop
  const strafeYaw = () => { const v = hs(p) || 1; i.yaw = Math.atan2(-p.vel.x / v, -p.vel.z / v); };
  p.vel.set(0, 0, -300); i.jumpHeld = true; i.wm.right = 1;
  let groundTicks = 0, jumps = 0, was = true;
  for (let t = 0; t < 10 / DT; t++) {
    strafeYaw(); step(p, i);
    if (p.onGround) groundTicks++;
    if (was && !p.onGround) jumps++;
    was = p.onGround;
  }
  ok('bhop: gain de vitesse, 1 tick au sol par saut', hs(p) > 500 && groundTicks <= jumps + 1, `v=${hs(p).toFixed(0)} jumps=${jumps} sol=${groundTicks}`);
}

// ---------- surf ----------
function surfRun(label, obj, start, vel, plane) {
  const w = world({ objects: [obj] }), step = stepper(w);
  const p = new Player(), i = mkInput();
  p.pos.copy(start); p.vel.copy(vel);
  let surf = 0, ground = 0, maxPen = 0, minD = 1e9, vzSurf = null;
  for (let t = 0; t < 3 / DT; t++) {
    step(p, i);
    if (!isFinite(p.pos.x + p.pos.y + p.pos.z)) { ok(label + ' NaN', false); return; }
    maxPen = Math.max(maxPen, penetration(w, p));
    if (p.surfNormal) { surf++; vzSurf = p.vel.z; }
    if (p.onGround && p.pos.y > 5) ground++;
    if (plane && p.surfNormal) {
      const c = p.pos.clone(); c.y += p.radius;
      minD = Math.min(minD, c.sub(plane.pt).dot(plane.n));
    }
  }
  ok(`${label}: surf`, surf > 20, `surfTicks=${surf}`);
  ok(`${label}: jamais "sol" sur la rampe`, ground === 0, `ground=${ground}`);
  ok(`${label}: aucune pénétration`, maxPen < 0.1 && (!plane || minD > p.radius - 0.1), `pen=${maxPen.toFixed(3)} d=${plane ? minD.toFixed(2) : '-'}`);
  return { p, vzSurf };
}
{
  // pic 1024×640: face droite normale (sin,cos) avec angle atan(640/512)
  const a = Math.atan(640 / 512);
  const n = new THREE.Vector3(Math.sin(a), Math.cos(a), 0);
  const r = surfRun('pic droit', { t: 'ramp', pr: 'peak', p: [0, 200, 0], s: [1024, 640, 4096], r: 0 },
    new THREE.Vector3(260, 1000, 1500), new THREE.Vector3(0, 0, -600), { pt: new THREE.Vector3(512, 200, 0), n });
  ok('pic droit: vitesse conservée en surf (pas de friction)', Math.abs(r.vzSurf) > 599, `vz=${r.vzSurf.toFixed(1)}`);
}
surfRun('rampe courbée 90°', { t: 'ramp', pr: 'peak', p: [0, 200, 0], s: [1024, 700, 4096], r: 0, bend: 90 },
  new THREE.Vector3(-1100, 1100, 1100), new THREE.Vector3(0, 0, 0), null);
surfRun('pic courbe torsadé', { t: 'ramp', pr: 'curvepeak', p: [0, 200, 0], s: [1024, 1100, 4096], r: 30, twist: 12, drop: 400 },
  new THREE.Vector3(0.866 * 250, 1800, -0.5 * 250), new THREE.Vector3(-0.5 * 900, 0, -0.866 * 900), null);
surfRun('wedge', { t: 'ramp', pr: 'wedge', p: [0, 0, 0], s: [800, 1400, 4096], r: 0 },
  new THREE.Vector3(-100, 1800, 1000), new THREE.Vector3(0, 0, -800), null);

// ---------- tunneling haute vitesse ----------
{
  const w = world({ objects: [{ t: 'box', p: [0, 0, -500], s: [1000, 400, 16], r: 0 }] }), step = stepper(w);
  const p = new Player(), i = mkInput(); p.pos.set(0, 50, 0); p.vel.set(0, 0, -3500);
  for (let t = 0; t < 1 / DT; t++) step(p, i);
  ok('mur fin (16u) à 3500 u/s: pas de traversée', p.pos.z > -500, `z=${p.pos.z.toFixed(1)}`);
}
{
  const w = world({ objects: [{ t: 'ramp', pr: 'peak', p: [0, 0, 0], s: [1024, 640, 4096], r: 0 }] }), step = stepper(w);
  const p = new Player(), i = mkInput(); p.pos.set(200, 3000, 0); p.vel.set(-2000, -3500, 0);
  let maxPen = 0;
  for (let t = 0; t < 2 / DT; t++) { step(p, i); maxPen = Math.max(maxPen, penetration(w, p)); }
  ok('chute 3500 u/s sur rampe: pas de traversée', p.pos.y > -0.5 && maxPen < 0.1, `y=${p.pos.y.toFixed(1)} pen=${maxPen.toFixed(3)}`);
}

// ---------- map exemple: spawn + avance ----------
{
  const m = defaultMap(), w = new CollisionWorld(buildCollision(m)), step = stepper(w);
  const p = new Player(), i = mkInput(); p.pos.set(...m.spawn.p); p.pos.y += 1;
  for (let t = 0; t < 1 / DT; t++) step(p, i);
  ok('map exemple: posé sur la plateforme', p.onGround && Math.abs(p.pos.y - m.spawn.p[1]) < 0.5, `y=${p.pos.y.toFixed(2)}`);
  i.wm.forward = 1;
  let maxPen = 0, surf = 0;
  for (let t = 0; t < 8 / DT; t++) { if (!p.onGround) { i.wm.forward = 0; i.wm.right = 1; } step(p, i); maxPen = Math.max(maxPen, penetration(w, p)); if (p.surfNormal) surf++; }
  ok('map exemple: chute sur rampe 1 et surf, sans pénétration', surf > 20 && maxPen < 0.1, `surf=${surf} pen=${maxPen.toFixed(3)} pos=${p.pos.toArray().map(v => v.toFixed(0))}`);
  const angs = m.objects.filter(o => o.t === 'ramp').map(o => { const [a, b] = surfAngles(o); return [a - (o.twist || 0) / 2, b + (o.twist || 0) / 2]; });
  ok("map exemple: toutes les rampes surfables (>45.6°)", angs.every(([a]) => a > 45.6) && angs.length > 15, JSON.stringify(angs.map(a => a.map(v => +v.toFixed(1)))));
}

console.log(fails ? `${fails} FAIL` : 'ALL PASS');
process.exit(fails ? 1 : 0);
