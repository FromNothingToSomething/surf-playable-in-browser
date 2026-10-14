import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import medievalUrl from '../assets/medieval.glb?url';
import knightUrl from '../assets/knight.glb?url';

// Assets 3D CC0 de Kay Lousberg (KayKit Medieval Hexagon Pack + Adventurers). Chargés une seule fois.
let cache = null;

function toLambert(root) {
  const conv = new Map();
  root.traverse(o => {
    if (!o.isMesh) return;
    const src = o.material;
    if (!conv.has(src)) {
      const m = new THREE.MeshLambertMaterial({ map: src.map || null, color: src.color ? src.color.clone() : 0xffffff, side: src.side, transparent: src.transparent, alphaTest: src.alphaTest });
      if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
      conv.set(src, m);
    }
    o.material = conv.get(src);
  });
}

export function loadAssets() {
  if (cache) return cache;
  const loader = new GLTFLoader();
  const load = (url) => new Promise((res, rej) => loader.load(url, res, undefined, rej));
  cache = Promise.all([load(medievalUrl), load(knightUrl)]).then(([med, kn]) => {
    toLambert(med.scene);
    const models = {};
    for (const c of med.scene.children) models[c.name] = c;
    kn.scene.traverse(o => { if (o.isMesh) { o.frustumCulled = false; if (o.material.map) o.material.map.colorSpace = THREE.SRGBColorSpace; } });
    return { models, knight: kn };
  });
  return cache;
}

// Copie d'un modèle (non skinné)
export function cloneModel(assets, name) {
  const m = assets.models[name];
  return m ? m.clone(true) : new THREE.Group();
}

// Instanciation: un InstancedMesh par sous-maillage du modèle. items: [{p:[x,y,z], r (deg), s}]
export function instanced(assets, name, items) {
  const src = assets.models[name], group = new THREE.Group();
  if (!src || !items.length) return group;
  src.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(src.matrixWorld).invert();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  src.traverse(o => {
    if (!o.isMesh) return;
    const local = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    const im = new THREE.InstancedMesh(o.geometry, o.material, items.length);
    items.forEach((it, i) => {
      e.set(0, (it.r || 0) * Math.PI / 180, 0); q.setFromEuler(e);
      v.set(it.p[0], it.p[1], it.p[2]); sc.setScalar(it.s || 1);
      m.compose(v, q, sc).multiply(local);
      im.setMatrixAt(i, m);
    });
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    group.add(im);
  });
  return group;
}

// Chevalier animé
const HIDE = ['1H_Sword_Offhand', 'Round_Shield', 'Spike_Shield', '2H_Sword', 'Rectangle_Shield'];
export function makeKnight(assets, anim = 'Idle', variant = 0) {
  const k = SkeletonUtils.clone(assets.knight.scene);
  k.traverse(o => {
    if (!o.isMesh) return;
    if (HIDE.includes(o.name)) o.visible = false;
    if (variant === 1 && o.name === 'Badge_Shield') o.visible = false;
    if (variant === 1 && o.name === 'Rectangle_Shield') o.visible = true;
  });
  const mixer = new THREE.AnimationMixer(k);
  const clips = {};
  for (const c of assets.knight.animations) clips[c.name] = c;
  const play = (name, fade = 0.3) => {
    const clip = clips[name] || clips.Idle;
    const a = mixer.clipAction(clip);
    if (k.userData.cur && k.userData.cur !== a) k.userData.cur.fadeOut(fade);
    a.reset().fadeIn(fade).play();
    k.userData.cur = a;
  };
  play(anim, 0);
  mixer.update(Math.random() * 2);
  return { obj: k, mixer, play };
}
