import * as THREE from 'three';

// Profils de rampe (section transversale), CCW, x ∈ [-w/2, w/2], y ∈ [0, h].
export const PROFILES = ['peak', 'wedge', 'trap', 'curve', 'curvepeak'];
export const PROFILE_LABEL = { peak: 'Pic (2 faces)', wedge: 'Simple + mur', trap: 'Plateau', curve: 'Courbe + mur', curvepeak: 'Pic courbe' };
const CURVE_SEG = 8;
const CURVE_K = 0.25; // pente varie de (1-K) à (1+K) × pente moyenne

function curvePts(x0, dir, run, h) {
  // part de (x0,0), monte de h sur une largeur run, de plus en plus raide. dir=+1 vers +x, -1 vers -x
  const S = h / run, s0 = S * (1 - CURVE_K), s1 = S * (1 + CURVE_K);
  const pts = [];
  for (let i = 0; i <= CURVE_SEG; i++) {
    const v = i / CURVE_SEG;
    pts.push([x0 + dir * run * v, run * (s0 * v + (s1 - s0) * v * v / 2)]);
  }
  return pts;
}

export function profilePoints(o) {
  const [w, h] = o.s, hw = w / 2;
  switch (o.pr) {
    case 'wedge': return [[-hw, 0], [hw, 0], [hw, h]];
    case 'trap': { const t = Math.min(o.top ?? 64, w - 8) / 2; return [[-hw, 0], [hw, 0], [t, h], [-t, h]]; }
    case 'curve': return [[hw, 0], [hw, h], ...curvePts(-hw, 1, w, h).reverse().slice(1)];
    case 'curvepeak': {
      const right = curvePts(hw, -1, hw, h);              // (hw,0) -> (0,h)
      const left = curvePts(-hw, 1, hw, h).reverse();     // (0,h) -> (-hw,0)
      return [...right, ...left.slice(1)];
    }
    default: return [[-hw, 0], [hw, 0], [0, h]];
  }
}

// Angle(s) de la face surf en degrés [min, max]
export function surfAngles(o) {
  const [w, h] = o.s;
  const deg = (s) => Math.atan(s) * 180 / Math.PI;
  switch (o.pr) {
    case 'wedge': return [deg(h / w), deg(h / w)];
    case 'trap': { const run = (w - Math.min(o.top ?? 64, w - 8)) / 2; return [deg(h / run), deg(h / run)]; }
    case 'curve': return [deg(h / w * (1 - CURVE_K)), deg(h / w * (1 + CURVE_K))];
    case 'curvepeak': return [deg(2 * h / w * (1 - CURVE_K)), deg(2 * h / w * (1 + CURVE_K))];
    default: return [deg(2 * h / w), deg(2 * h / w)];
  }
}

// Extrusion du profil le long d'un chemin: longueur l, courbure bend (°), dénivelé drop, torsion twist (°).
// Avant = -z local. Origine = centre de l'emprise au sol, base avant à y=0, arrière à y=drop.
function rampGeometry(o) {
  const l = o.s[2];
  const bend = (o.bend || 0) * Math.PI / 180, twist = (o.twist || 0) * Math.PI / 180, drop = o.drop || 0;
  const prof = profilePoints(o);
  const n = Math.max(1, Math.ceil(Math.abs(o.bend || 0) / 6), Math.ceil(Math.abs(o.twist || 0) / 4));
  const R = Math.abs(bend) > 1e-6 ? l / bend : 0;
  const center = (t) => {
    if (!R) return new THREE.Vector3(0, 0, -l * t);
    const ph = bend * t;
    return new THREE.Vector3(R * (1 - Math.cos(ph)), 0, -R * Math.sin(ph));
  };
  const off = center(0).add(center(1)).multiplyScalar(-0.5);
  const sections = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, ph = bend * t, ro = twist * (t - 0.5);
    const c = center(t).add(off);
    const right = new THREE.Vector3(Math.cos(ph), 0, Math.sin(ph));
    const cr = Math.cos(ro), sr = Math.sin(ro);
    const yb = drop * (1 - t);
    sections.push(prof.map(([px, py]) => {
      const x = px * cr - py * sr, y = px * sr + py * cr;
      return c.clone().addScaledVector(right, x).setY(c.y + y + yb);
    }));
  }
  // UV continues: u = périmètre du profil, v = distance le long de la rampe (évite les lignes de grille cassées)
  const T = 256, perim = [0];
  for (let j = 1; j <= prof.length; j++) {
    const a = prof[j - 1], b = prof[j % prof.length];
    perim.push(perim[j - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const pos = [], uv = [];
  const tri = (a, b, c, ua, ub, uc) => { pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); uv.push(...ua, ...ub, ...uc); };
  const m = prof.length;
  for (let i = 0; i < n; i++) {
    const S0 = sections[i], S1 = sections[i + 1], v0 = l * i / n / T, v1 = l * (i + 1) / n / T;
    for (let j = 0; j < m; j++) {
      const k = (j + 1) % m, uj = perim[j] / T, uk = perim[j + 1] / T;
      tri(S0[j], S1[k], S0[k], [uj, v0], [uk, v1], [uk, v0]);
      tri(S0[j], S1[j], S1[k], [uj, v0], [uj, v1], [uk, v1]);
    }
  }
  // bouchons
  const caps = THREE.ShapeUtils.triangulateShape(prof.map(([x, y]) => new THREE.Vector2(x, y)), []);
  const capFace = (S, outward) => {
    for (const [a, b, c] of caps) {
      const A = S[a], B = S[b], C = S[c];
      const ua = [prof[a][0] / T, prof[a][1] / T], ub = [prof[b][0] / T, prof[b][1] / T], uc = [prof[c][0] / T, prof[c][1] / T];
      const nrm = new THREE.Vector3().subVectors(B, A).cross(new THREE.Vector3().subVectors(C, A));
      if (nrm.dot(outward) < 0) tri(A, C, B, ua, uc, ub); else tri(A, B, C, ua, ub, uc);
    }
  };
  const fwd = (ph) => new THREE.Vector3(Math.sin(ph), 0, -Math.cos(ph));
  capFace(sections[0], fwd(0).negate());
  capFace(sections[n], fwd(bend));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

// Ligne centrale (base) de la rampe en coordonnées monde à t∈[0,1] (0 = arrière, 1 = avant). y = base + dénivelé.
export function rampFrame(o, t) {
  const l = o.s[2], bend = (o.bend || 0) * Math.PI / 180, drop = o.drop || 0;
  const R = Math.abs(bend) > 1e-6 ? l / bend : 0;
  const center = (u) => {
    if (!R) return new THREE.Vector3(0, 0, -l * u);
    const ph = bend * u;
    return new THREE.Vector3(R * (1 - Math.cos(ph)), 0, -R * Math.sin(ph));
  };
  const off = center(0).add(center(1)).multiplyScalar(-0.5);
  const ph = bend * t;
  const m = objectMatrix(o);
  const pos = center(t).add(off).setY(drop * (1 - t)).applyMatrix4(m);
  const yaw = (o.r || 0) * Math.PI / 180 - ph;
  return { pos, yaw, top: pos.y + o.s[1] };
}

export function makeGeometry(o) {
  if (o.t === 'ramp') return rampGeometry(o);
  const [w, h, l] = o.s;
  const g = new THREE.BoxGeometry(w, h, l).toNonIndexed();
  g.deleteAttribute('uv'); g.deleteAttribute('normal');
  g.translate(0, h / 2, 0);
  return g;
}

export function objectMatrix(o) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(o.p[0], o.p[1], o.p[2]),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (o.r || 0) * Math.PI / 180, 0)),
    new THREE.Vector3(1, 1, 1));
}

// Géométrie en coordonnées monde
export function worldGeometry(o) {
  const g = makeGeometry(o);
  g.applyMatrix4(objectMatrix(o));
  return g;
}
