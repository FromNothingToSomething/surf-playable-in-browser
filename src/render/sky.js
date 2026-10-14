import * as THREE from 'three';

export const SUN_DIR = new THREE.Vector3(0.45, 0.6, 0.35).normalize();
export const HORIZON = new THREE.Color(0xf4dccf);

// Presets d'ambiance: ciel, mont Fuji, brouillard, lumières.
export const SKY_PRESETS = {
  jour: { top: 0x5d9bd6, horizon: 0xf4dccf, bottom: 0x8fa7b5, sun: [0.45, 0.6, 0.35], sunCol: 0xfff1dd, fuji: 0x8b93b8, snow: 0xf7f7fb, hills: 0x6f8a9a,
    hemiSky: 0xfff3f3, hemiGround: 0x6a7a68, hemi: 1.55, dir: 2.0, amb: 0.35, stars: 0, disc: 1 },
  crepuscule: { top: 0x34407e, horizon: 0xf6a06a, bottom: 0x6d5a6a, sun: [0.55, 0.1, -0.6], sunCol: 0xffb27a, fuji: 0x584a6c, snow: 0xf3cdbf, hills: 0x4b3d58,
    hemiSky: 0xffd2b8, hemiGround: 0x4a3a48, hemi: 1.25, dir: 1.6, amb: 0.7, stars: 0.15, disc: 1 },
  nuit: { top: 0x05081a, horizon: 0x283058, bottom: 0x0c1022, sun: [-0.35, 0.45, -0.6], sunCol: 0xc4d0ff, fuji: 0x1b1f38, snow: 0x8a90b4, hills: 0x121630,
    hemiSky: 0x9aa6e0, hemiGround: 0x2a2236, hemi: 1.25, dir: 1.0, amb: 0.9, stars: 1, disc: 0.6 },
  // sous la mer: pas de Fuji, brume turquoise, lumière filtrée
  ocean: { top: 0x0b4a6e, horizon: 0x38b6c4, bottom: 0x0b3550, sun: [0.2, 0.9, 0.2], sunCol: 0xc8fff6, fuji: 0x1e6f86, snow: 0x7fd3dc, hills: 0x1a5c72,
    hemiSky: 0xbff6ff, hemiGround: 0x1f4f5a, hemi: 1.4, dir: 1.3, amb: 0.6, stars: 0, disc: 0.25, fujiOn: 0, fogNear: 2500, fogFar: 26000 },
  hiver: { top: 0x8fa9c4, horizon: 0xe9eef3, bottom: 0xc9d3dc, sun: [0.3, 0.35, -0.5], sunCol: 0xfff4e6, fuji: 0x9aa8bd, snow: 0xffffff, hills: 0xb8c4d1,
    hemiSky: 0xf2f6ff, hemiGround: 0x9aa4b0, hemi: 1.5, dir: 1.4, amb: 0.5, stars: 0, disc: 0.5, fogNear: 4000, fogFar: 36000 },
  // enfer: plafond noir-rouge, horizon incandescent, lumière de lave par en dessous, crêtes déchiquetées
  enfer: { top: 0x12030a, horizon: 0xa8321a, bottom: 0xc04a1c, sun: [0.25, -0.8, 0.3], sunCol: 0xff7a2e, fuji: 0x000000, snow: 0x000000, hills: 0x1a0606,
    hemiSky: 0xd07a66, hemiGround: 0xff6a24, hemi: 1.6, dir: 1.6, amb: 0.75, stars: 0.35, disc: 0, fujiOn: 0, jag: 1, fogNear: 3500, fogFar: 30000 },
};

export function createSky() {
  const u = {
    top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, bottom: { value: new THREE.Color() },
    sun: { value: new THREE.Vector3() }, sunCol: { value: new THREE.Color() },
    fuji: { value: new THREE.Color() }, snow: { value: new THREE.Color() }, hills: { value: new THREE.Color() },
    stars: { value: 0 }, disc: { value: 1 }, fujiAz: { value: -0.35 }, fujiOn: { value: 1 }, jag: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: u,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }`,
    fragmentShader: `
      uniform vec3 top, horizon, bottom, sun, sunCol, fuji, snow, hills; uniform float stars, disc, fujiAz, fujiOn, jag;
      varying vec3 vDir;
      float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      void main(){
        vec3 d = normalize(vDir);
        float e = asin(clamp(d.y, -1.0, 1.0));
        float az = atan(d.x, -d.z);
        vec3 col = d.y > 0.0 ? mix(horizon, top, pow(d.y, 0.5)) : mix(horizon, bottom, pow(-d.y, 0.4));
        // étoiles
        if (stars > 0.0 && d.y > 0.05) {
          vec3 q = floor(d * 380.0);
          float h = hash(q);
          col += vec3(step(0.9975, h) * stars * (0.6 + 0.4 * hash(q + 3.1)));
        }
        // soleil / lune
        float s = max(dot(d, normalize(sun)), 0.0);
        col += sunCol * (pow(s, 900.0) * 3.0 * disc + pow(s, 10.0) * 0.22);
        // mont Fuji
        float da = abs(mod(az - fujiAz + 3.14159, 6.28318) - 3.14159);
        float fh = 0.13 * pow(max(1.0 - da / 0.42, 0.0), 1.35);
        fh = min(fh, 0.118);
        if (fujiOn > 0.5 && e > 0.0 && e < fh) {
          float sn = step(fh * 0.7 + 0.006 * sin(da * 90.0), e);
          col = mix(mix(fuji, horizon, 0.35), mix(snow, horizon, 0.2), sn);
        }
        // collines lointaines
        float hh = 0.022 + 0.012 * sin(az * 5.0 + 1.0) + 0.008 * sin(az * 13.0) + 0.004 * sin(az * 31.0);
        hh += jag * (0.05 * pow(abs(sin(az * 7.0)), 3.0) + 0.025 * abs(sin(az * 23.0 + 1.0)) + 0.012 * abs(sin(az * 61.0)));
        if (e > -0.01 && e < hh) col = mix(hills, horizon, 0.25 + 6.0 * (hh - e));
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 24), mat);
  m.frustumCulled = false;
  m.renderOrder = -1;
  m.onBeforeRender = (r, s, cam) => m.position.copy(cam.position);
  m.setPreset = (p) => {
    for (const k of ['top', 'horizon', 'bottom', 'sunCol', 'fuji', 'snow', 'hills']) u[k].value.setHex(p[k]);
    u.sun.value.set(...p.sun).normalize();
    u.stars.value = p.stars; u.disc.value = p.disc; u.fujiOn.value = p.fujiOn ?? 1; u.jag.value = p.jag ?? 0;
  };
  return m;
}
