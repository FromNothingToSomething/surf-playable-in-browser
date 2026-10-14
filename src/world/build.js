import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';
import { GROUND_NY, SURF_NY_MIN, WORLD_SIZE } from '../config.js';
import { worldGeometry } from './shapes.js';
import { TEX_WORLD } from '../render/textures.js';
import { buildDeco } from './deco.js';

THREE.Mesh.prototype.raycast = acceleratedRaycast;

export const PALETTE = [0xd9c27e, 0x5fb3b3, 0xe07a5f, 0x9b8bd4, 0x9ccc65, 0x8fa9c7, 0xf1ece4, 0xf2a65a, 0xc23b22, 0x9a7458, 0xe8672a, 0xf2a7c3, 0x4a5cab, 0xd8b45a, 0x2a2228];
export const BOX_DEFAULT_COLOR = 5;

const UP = new THREE.Vector3(0, 1, 0);
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
const _n = new THREE.Vector3(), _t = new THREE.Vector3(), _bt = new THREE.Vector3();

// UV monde par triangle (projection sur le plan du triangle) + couleurs par classe de face.
export function decorate(g, colorHex) {
  const pos = g.attributes.position, cnt = pos.count;
  const keepUV = !!g.attributes.uv;
  const uv = keepUV ? g.attributes.uv.array : new Float32Array(cnt * 2), col = new Float32Array(cnt * 3);
  const base = new THREE.Color(colorHex), c = new THREE.Color();
  for (let i = 0; i < cnt; i += 3) {
    _a.fromBufferAttribute(pos, i); _b.fromBufferAttribute(pos, i + 1); _c.fromBufferAttribute(pos, i + 2);
    _n.subVectors(_c, _b).cross(_t.subVectors(_a, _b)).normalize();
    const ny = _n.y;
    let mul;
    if (ny >= GROUND_NY) mul = 1.08;
    else if (ny > SURF_NY_MIN) mul = 1.0;
    else if (ny > -0.5) mul = 0.68;
    else mul = 0.45;
    c.copy(base).multiplyScalar(mul);
    const flat = Math.abs(ny) > 0.9;
    if (!flat) { _t.crossVectors(UP, _n).normalize(); _bt.crossVectors(_n, _t); }
    for (let k = 0; k < 3; k++) {
      const v = k === 0 ? _a : k === 1 ? _b : _c, j = i + k;
      if (keepUV) { /* UV fournies par la géométrie */ }
      else if (flat) { uv[j * 2] = v.x / TEX_WORLD; uv[j * 2 + 1] = v.z / TEX_WORLD; }
      else { uv[j * 2] = v.dot(_t) / TEX_WORLD; uv[j * 2 + 1] = v.dot(_bt) / TEX_WORLD; }
      col[j * 3] = c.r; col[j * 3 + 1] = c.g; col[j * 3 + 2] = c.b;
    }
  }
  if (!keepUV) g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

const edgeMat = new THREE.LineBasicMaterial({ color: 0x1a0f0a, transparent: true, opacity: 0.45 });

export function objColor(o) {
  return PALETTE[(o.c ?? (o.t === 'box' ? BOX_DEFAULT_COLOR : 0)) % PALETTE.length];
}

// mats: tableau de matériaux indexé par o.tx (motif)
export function buildVisual(o, mats) {
  if (o.t === 'deco') return buildDeco(o);
  const g = decorate(worldGeometry(o), objColor(o));
  const m = new THREE.Mesh(g, Array.isArray(mats) ? (mats[o.tx || 0] || mats[0]) : mats);
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(g, 25), edgeMat);
  e.raycast = () => {};
  m.add(e);
  return m;
}

export function buildCollision(map) {
  const parts = map.objects.filter(o => o.t !== 'deco').map(o => {
    const g = worldGeometry(o);
    for (const k of Object.keys(g.attributes)) if (k !== 'position') g.deleteAttribute(k);
    return g;
  });
  if (map.floor) {
    const f = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE).toNonIndexed();
    f.deleteAttribute('uv'); f.deleteAttribute('normal');
    f.rotateX(-Math.PI / 2);
    parts.push(f);
  }
  if (!parts.length) return null;
  const geo = mergeGeometries(parts, false);
  geo.boundsTree = new MeshBVH(geo);
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
}
