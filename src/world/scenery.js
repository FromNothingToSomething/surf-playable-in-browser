import * as THREE from 'three';
import { loadAssets, cloneModel, instanced, makeKnight } from '../render/assets.js';
import { makeHeight, buildTerrainMesh, detailTexture, createWater } from './terrain.js';

// Décor "paysage" d'une map: terrain, eau, château, village, forêt, chevaliers. Purement visuel.
export class Scenery {
  constructor(scene, renderer) {
    this.scene = scene; this.renderer = renderer;
    this.group = new THREE.Group(); scene.add(this.group);
    this.knights = []; this.token = 0;
    this.detail = null;
  }

  clear() {
    this.token++;
    for (const c of [...this.group.children]) {
      this.group.remove(c);
      c.traverse(o => { if (o.isInstancedMesh) o.dispose(); if (o.geometry && o.userData.own) o.geometry.dispose(); });
    }
    this.knights = [];
  }

  build(map) {
    this.clear();
    const S = map.scenery, T = map.terrain;
    if (!S || !T) return;
    const token = this.token;
    // terrain + eau (immédiat)
    const hf = makeHeight(T);
    const geo = buildTerrainMesh(T, hf);
    this.detail = this.detail || detailTexture(this.renderer);
    const terr = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, map: this.detail }));
    terr.userData.own = true; terr.raycast = () => {};
    this.group.add(terr);
    this.group.add(createWater(T.size, T.water));
    // modèles (asynchrone)
    loadAssets().then(A => { if (token === this.token) this.populate(A, S); }).catch(e => console.error('assets', e));
  }

  populate(A, S) {
    const add = (name, p, r = 0, s = 1) => { const o = cloneModel(A, name); o.position.set(...p); o.rotation.y = r * Math.PI / 180; o.scale.setScalar(s); this.group.add(o); return o; };
    for (const b of S.buildings) add(b.k, b.p, b.r, b.s);
    // forêt et nuages instanciés par type
    const byKind = {};
    for (const t of S.trees) (byKind[t.k] = byKind[t.k] || []).push(t);
    for (const [k, items] of Object.entries(byKind)) this.group.add(instanced(A, k, items));
    const clouds = instanced(A, 'cloud', S.clouds);
    clouds.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.fog = false; } });
    this.group.add(clouds);
    // chevaliers
    for (const k of S.knights) {
      const kn = makeKnight(A, k.anim, k.variant || 0);
      kn.obj.position.set(...k.p); kn.obj.rotation.y = (k.r || 0) * Math.PI / 180; kn.obj.scale.setScalar(k.s || 32);
      kn.def = k; kn.seg = 0; kn.t = 0;
      if (k.patrol) kn.play('Walking_A', 0);
      this.group.add(kn.obj);
      this.knights.push(kn);
    }
  }

  update(dt, camPos) {
    for (const k of this.knights) {
      // animer seulement si assez proche (économie CPU)
      const d2 = camPos ? k.obj.position.distanceToSquared(camPos) : 0;
      if (d2 < 12000 * 12000) k.mixer.update(dt);
      const P = k.def.patrol;
      if (!P || k.cheering) continue;
      const a = P[k.seg], b = P[(k.seg + 1) % P.length];
      const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
      k.t += (k.def.speed || 90) * dt / L;
      if (k.t >= 1) { k.t = 0; k.seg = (k.seg + 1) % P.length; continue; }
      k.obj.position.x = a[0] + dx * k.t; k.obj.position.z = a[1] + dz * k.t;
      k.obj.rotation.y = Math.atan2(dx, dz);
    }
  }

  // les chevaliers acclament le joueur à l'arrivée
  cheer(seconds = 5) {
    for (const k of this.knights) {
      k.cheering = true; k.play('Cheer');
      clearTimeout(k.timer);
      k.timer = setTimeout(() => { k.cheering = false; k.play(k.def.patrol ? 'Walking_A' : k.def.anim); }, seconds * 1000);
    }
  }
}
