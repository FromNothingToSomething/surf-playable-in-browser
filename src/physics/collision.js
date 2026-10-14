import * as THREE from 'three';
import { GROUND_NY, SURF_NY_MIN, NON_JUMP_VELOCITY } from '../config.js';

// Capsule (pieds = p.pos) contre triangles du BVH, par sous-pas pour éviter le tunneling.
const _seg = new THREE.Line3();
const _box = new THREE.Box3();
const _triPt = new THREE.Vector3();
const _capPt = new THREE.Vector3();
const _n = new THREE.Vector3();
const _tn = new THREE.Vector3();
const _c = new THREE.Vector3();
const _save = new THREE.Vector3();

const MAX_SUBSTEP_FRAC = 0.5; // déplacement max par sous-pas = radius * 0.5
const GROUND_PROBE = 2;
const STICK = 10;

export class CollisionWorld {
  constructor(mesh) { this.setMesh(mesh); }
  setMesh(mesh) {
    this.mesh = mesh;
    this.bvh = mesh ? mesh.geometry.boundsTree : null;
  }

  // Dépénètre la capsule placée en (pos). Ajoute les normales de contact à out. Modifie pos.
  depenetrate(pos, r, h, out) {
    if (!this.bvh) return;
    for (let iter = 0; iter < 3; iter++) {
      _seg.start.set(pos.x, pos.y + r, pos.z);
      _seg.end.set(pos.x, pos.y + h - r, pos.z);
      _box.makeEmpty();
      _box.expandByPoint(_seg.start); _box.expandByPoint(_seg.end);
      _box.min.addScalar(-r); _box.max.addScalar(r);
      let moved = false;
      this.bvh.shapecast({
        intersectsBounds: b => b.intersectsBox(_box),
        intersectsTriangle: tri => {
          const d = tri.closestPointToSegment(_seg, _triPt, _capPt);
          if (d >= r) return false;
          tri.getNormal(_tn);
          if (d > 1e-5) _n.subVectors(_capPt, _triPt).divideScalar(d);
          else {
            _c.addVectors(_seg.start, _seg.end).multiplyScalar(0.5).sub(_triPt);
            _n.copy(_tn); if (_n.dot(_c) < 0) _n.negate();
          }
          const depth = r - d + 1e-3;
          _seg.start.addScaledVector(_n, depth);
          _seg.end.addScaledVector(_n, depth);
          pos.addScaledVector(_n, depth);
          // n: direction de dépénétration (arrondie sur les arêtes), f: normale de la face (classement sol/surf, comme Source)
          if (out) out.push({ n: _n.clone(), f: _tn.dot(_n) > 0.05 ? _tn.clone() : null });
          moved = true;
          return false;
        },
      });
      if (!moved) break;
    }
  }

  // Normale la plus "sol" sous la capsule (test décalé vers le bas), sans déplacer.
  probe(pos, r, h, dist) {
    const list = [];
    _save.copy(pos); _save.y -= dist;
    this.depenetrate(_save, r, h, list);
    let best = null;
    for (const c of list) if (c.f && (!best || c.f.y > best.y)) best = c.f;
    return best;
  }

  moveAndSlide(p, dt) {
    const r = p.radius, h = p.height;
    const wasGround = p.onGround;
    p.onGround = false;
    p.surfNormal = null;

    const contacts = [];
    const speed = p.vel.length();
    const steps = Math.max(1, Math.ceil(speed * dt / (r * MAX_SUBSTEP_FRAC)));
    const sdt = dt / steps;
    for (let s = 0; s < steps; s++) {
      p.pos.addScaledVector(p.vel, sdt);
      const n0 = contacts.length;
      this.depenetrate(p.pos, r, h, contacts);
      for (let pass = 0; pass < 2; pass++) {
        for (let i = n0; i < contacts.length; i++) {
          const n = contacts[i].n;
          const vn = p.vel.dot(n);
          if (vn < 0) p.vel.addScaledVector(n, -vn);
        }
      }
    }

    // état sol / surf
    for (const { f: n } of contacts) {
      if (!n) continue;
      if (n.y > GROUND_NY) { if (p.vel.y < NON_JUMP_VELOCITY) p.onGround = true; }
      else if (n.y > SURF_NY_MIN && (!p.surfNormal || n.y > p.surfNormal.y)) p.surfNormal = n;
    }
    if (p.vel.y < NON_JUMP_VELOCITY) {
      const g = this.probe(p.pos, r, h, wasGround ? STICK : GROUND_PROBE);
      if (g) {
        if (g.y > GROUND_NY) {
          p.onGround = true;
          // colle au sol (pentes descendantes)
          _save.copy(p.pos); _save.y -= wasGround ? STICK : GROUND_PROBE;
          this.depenetrate(_save, r, h, null);
          if (_save.y < p.pos.y) p.pos.copy(_save);
        } else if (g.y > SURF_NY_MIN && !p.surfNormal) p.surfNormal = g;
      }
    }
    if (p.onGround) { p.surfNormal = null; if (p.vel.y < 0) p.vel.y = 0; }
  }
}
