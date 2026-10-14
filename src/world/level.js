import * as THREE from 'three';
import { buildVisual, buildCollision, decorate } from './build.js';
import { saveMap } from './mapdata.js';
import { makePatternTextures, makeGlowTextures } from '../render/patterns.js';
import { createLava } from '../render/lava.js';
import { Scenery } from './scenery.js';
import { createSky, SKY_PRESETS } from '../render/sky.js';
import { WORLD_SIZE } from '../config.js';

export class Level {
  constructor(scene, renderer, map) {
    this.scene = scene;
    this.map = map;
    this.textures = makePatternTextures(renderer);
    this.glows = makeGlowTextures(renderer);
    this.mats = this.textures.map((t, i) => new THREE.MeshLambertMaterial(this.glows[i]
      ? { map: t, vertexColors: true, emissive: 0xffffff, emissiveMap: this.glows[i], emissiveIntensity: 1.6 }
      : { map: t, vertexColors: true }));
    this.group = new THREE.Group();
    scene.add(this.group);

    this.sky = createSky();
    scene.add(this.sky);
    scene.fog = new THREE.Fog(0xffffff, 7000, 48000);

    // mer: motif seigaiha (vagues) en grand
    const fg = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE).toNonIndexed();
    fg.rotateX(-Math.PI / 2);
    fg.deleteAttribute('uv');
    const seaTex = this.textures[1].clone();
    seaTex.needsUpdate = true;
    seaTex.repeat.set(1 / 6, 1 / 6);
    this.floorGeo = fg;
    this.floorMesh = new THREE.Mesh(decorate(fg, 0x3f8494), new THREE.MeshLambertMaterial({ map: seaTex, vertexColors: true }));
    this.floorColor = 0x3f8494;
    scene.add(this.floorMesh);
    this.lava = createLava(WORLD_SIZE);
    scene.add(this.lava);
    this.scenery = new Scenery(scene, renderer);
    this.sceneryFor = null;

    this.zones = new THREE.Group();
    scene.add(this.zones);
    this.zoneMat = new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.28, depthWrite: false });
    this.gateMat = new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.75, fog: false });
    this.veilMat = new THREE.MeshBasicMaterial({ color: 0xfff1c9, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide });

    // grille d'édition: mineure 256u, majeure 2048u
    this.grid = new THREE.Group();
    const g1 = new THREE.GridHelper(32768, 128, 0x9fd0ff, 0x9fd0ff);
    g1.material.transparent = true; g1.material.opacity = 0.18;
    const g2 = new THREE.GridHelper(32768, 16, 0xffffff, 0xffffff);
    g2.material.transparent = true; g2.material.opacity = 0.45;
    this.grid.add(g1, g2, new THREE.AxesHelper(1024));
    this.grid.position.y = 1;
    scene.add(this.grid);

    this.spawn = new THREE.Group();
    const sm = new THREE.MeshBasicMaterial({ color: 0x33ff77 });
    this.spawn.add(
      new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 72, 12).translate(0, 36, 0), sm),
      new THREE.Mesh(new THREE.BoxGeometry(8, 8, 64).translate(0, 60, -40), sm));
    scene.add(this.spawn);

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
    this.sun = new THREE.DirectionalLight(0xffffff, 2.0);
    this.amb = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(this.hemi, this.sun, this.amb);

    this.rebuild();
  }

  applySky() {
    const p = SKY_PRESETS[this.map.sky] || SKY_PRESETS.jour;
    this.sky.setPreset(p);
    this.scene.fog.color.setHex(p.horizon);
    this.scene.fog.near = p.fogNear ?? 7000; this.scene.fog.far = p.fogFar ?? 48000;
    this.hemi.color.setHex(p.hemiSky); this.hemi.groundColor.setHex(p.hemiGround); this.hemi.intensity = p.hemi;
    this.sun.color.setHex(p.sunCol); this.sun.intensity = p.dir;
    this.amb.color.setHex(p.hemiSky); this.amb.intensity = p.amb ?? 0.4;
    this.sun.position.set(...p.sun).normalize().multiplyScalar(1000);
  }

  rebuild() {
    for (const c of [...this.group.children]) {
      this.group.remove(c);
      c.geometry.dispose();
      c.children.forEach(e => e.geometry.dispose());
    }
    this.map.objects.forEach((o, i) => { const m = buildVisual(o, this.mats); m.userData.i = i; this.group.add(m); });
    const lava = this.map.floorKind === 'lave', terrain = !!this.map.terrain;
    this.floorMesh.visible = !!this.map.floor && !lava && !terrain;
    this.lava.visible = !!this.map.floor && lava;
    if (this.sceneryFor !== this.map.terrain) { this.sceneryFor = this.map.terrain; if (terrain) this.scenery.build(this.map); else this.scenery.clear(); }
    const fc = this.map.floorColor ?? 0x3f8494;
    if (fc !== this.floorColor) { decorate(this.floorGeo, fc); this.floorColor = fc; }
    for (const z of [...this.zones.children]) { this.zones.remove(z); z.traverse(o => o.geometry && o.geometry.dispose()); }
    for (const st of this.map.stages || []) {
      const e = st.end;
      let m;
      if (e.cp) {
        // porte de checkpoint: cadre doré + voile
        const { w, h } = e.gate, t = 40, gy = e.gate.y - e.p[1];
        const parts = [
          new THREE.BoxGeometry(w, t, t).translate(0, gy + h / 2, 0), new THREE.BoxGeometry(w, t, t).translate(0, gy - h / 2, 0),
          new THREE.BoxGeometry(t, h, t).translate(-w / 2, gy, 0), new THREE.BoxGeometry(t, h, t).translate(w / 2, gy, 0),
        ];
        m = new THREE.Group();
        for (const g of parts) m.add(new THREE.Mesh(g, this.gateMat));
        m.add(new THREE.Mesh(new THREE.PlaneGeometry(w, h).translate(0, gy, 0), this.veilMat));
        m.children.forEach(c => { c.raycast = () => {}; });
      } else {
        m = new THREE.Mesh(new THREE.BoxGeometry(e.s[0] - 256, 120, e.s[2] - 512).translate(0, 660, 0), this.zoneMat);
        m.raycast = () => {};
      }
      m.position.set(e.p[0], e.p[1], e.p[2]); m.rotation.y = (e.r || 0) * Math.PI / 180;
      this.zones.add(m);
    }
    const s = this.map.spawn;
    this.spawn.position.set(s.p[0], s.p[1], s.p[2]);
    this.spawn.rotation.y = (s.r || 0) * Math.PI / 180;
    this.applySky();
  }

  update(dt, camPos) { this.scenery.update(dt, camPos); }
  commit() { saveMap(this.map); this.rebuild(); }
  replace(map) { this.map = map; this.commit(); }
  load(map) { this.map = map; this.rebuild(); }
  setEditVisible(b) { this.grid.visible = b; this.spawn.visible = b; }
  collision() { return buildCollision(this.map); }
}
