import * as THREE from 'three';

// Terrain procédural (visuel, sans collision) + eau animée.
// Paramètres (map.terrain): centre (château), niveau du plateau, niveau d'eau, piste à éviter, rivière, lac, sommet de départ.

function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function noise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function fbm(x, y, o = 5) { let v = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { v += a * noise(x * f, y * f); f *= 2.03; a *= 0.5; } return v; }
const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

// distance point-segment (xz) et paramètre
function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2));
  const qx = ax + dx * t, qz = az + dz * t;
  return [Math.hypot(px - qx, pz - qz), t];
}

export function makeHeight(T) {
  const [cx, cz] = T.center, base = T.plateau, water = T.water;
  // index spatial grossier de la piste (points espacés) pour le couloir
  const pts = T.path; const cell = 4000, grid = new Map();
  pts.forEach((p, i) => { const k = Math.floor(p.x / cell) + ',' + Math.floor(p.z / cell); (grid.get(k) || grid.set(k, []).get(k)).push(i); });
  const nearPath = (x, z) => {
    const gx = Math.floor(x / cell), gz = Math.floor(z / cell); let best = Infinity, by = 0;
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) {
      const l = grid.get((gx + a) + ',' + (gz + b)); if (!l) continue;
      for (const i of l) { const p = pts[i]; const d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < best) { best = d; by = p.y; } }
    }
    return [Math.sqrt(best), by];
  };
  const hx = T.castleHalf[0], hz = T.castleHalf[1], cy = Math.cos(-T.castleYaw), sy = Math.sin(-T.castleYaw);
  return (x, z) => {
    // coordonnées locales du château
    const dx = x - cx, dz = z - cz, lx = dx * cy + dz * sy, lz = -dx * sy + dz * cy;
    const r = Math.hypot(dx, dz);
    // collines + montagnes en couronne
    let h = base + fbm(x / 9000, z / 9000) * 900 + fbm(x / 2500 + 7, z / 2500) * 180;
    const ring = smooth(18000, 60000, r);
    h += ring * (fbm(x / 22000 + 3, z / 22000 + 5, 6) * 26000 + 2000);
    // sommet de départ
    const [sx, sz, sh] = T.summit; const ds = Math.hypot(x - sx, z - sz);
    h = Math.max(h, sh - (ds / 9000) ** 1.6 * 9000 - fbm(x / 3000, z / 3000) * 800);
    // couloir de la piste: le relief reste sous les rampes
    const [dp, py] = nearPath(x, z);
    if (dp < 9000) { const lim = Math.max(py - 2600 + smooth(1500, 9000, dp) * 9000, base + 150); h = Math.min(h, lim); }
    // plateau du château + douves (anneau rectangulaire)
    const ox = Math.abs(lx) - hx, oz = Math.abs(lz) - hz, out = Math.max(ox, oz);
    const plateauW = smooth(5200, 2600, Math.max(out, 0));
    h = h * (1 - plateauW) + (base - 20) * plateauW;
    if (out > 120 && out < 1600) h = Math.min(h, water - 170 + Math.max(0, out - 950) * 0.8 + Math.max(0, 320 - out) * 2.2);
    // rivière (polyligne) et lac
    for (let i = 0; i + 1 < T.river.length; i++) {
      const [d] = segDist(x, z, T.river[i][0], T.river[i][1], T.river[i + 1][0], T.river[i + 1][1]);
      if (d < 1800) h = Math.min(h, water - 140 + smooth(350, 1800, d) * 1800 + (h - water) * smooth(900, 1800, d));
    }
    const [lkx, lkz, lkr] = T.lake; const dl = Math.hypot(x - lkx, z - lkz);
    if (dl < lkr + 1500) h = Math.min(h, water - 220 + smooth(lkr, lkr + 1500, dl) * 1600);
    return h;
  };
}

// Grille non uniforme: dense au centre (château), large en périphérie.
export function buildTerrainMesh(T, heightFn) {
  const N = 220, S = T.size / 2, a = 0.07;
  const map = (u) => S * u * (a + (1 - a) * u * u);
  const pos = new Float32Array((N + 1) * (N + 1) * 3), col = new Float32Array((N + 1) * (N + 1) * 3), uv = new Float32Array((N + 1) * (N + 1) * 2);
  const [cx, cz] = T.center;
  const c = new THREE.Color();
  const grass = new THREE.Color(0x5f8f3a), grass2 = new THREE.Color(0x7aa34a), dirt = new THREE.Color(0x8a7650), rock = new THREE.Color(0x7d7a74), snow = new THREE.Color(0xf4f6f8), sand = new THREE.Color(0xc9b98a);
  const H = new Float32Array((N + 1) * (N + 1));
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
    const x = cx + map(i / N * 2 - 1), z = cz + map(j / N * 2 - 1), k = j * (N + 1) + i;
    const h = heightFn(x, z); H[k] = h;
    pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z;
    uv[k * 2] = x / 1600; uv[k * 2 + 1] = z / 1600;
  }
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
    const k = j * (N + 1) + i, h = H[k];
    const iL = Math.max(0, i - 1), iR = Math.min(N, i + 1), jD = Math.max(0, j - 1), jU = Math.min(N, j + 1);
    const dxw = pos[(j * (N + 1) + iR) * 3] - pos[(j * (N + 1) + iL) * 3] || 1, dzw = pos[(jU * (N + 1) + i) * 3 + 2] - pos[(jD * (N + 1) + i) * 3 + 2] || 1;
    const sx = (H[j * (N + 1) + iR] - H[j * (N + 1) + iL]) / dxw, sz = (H[jU * (N + 1) + i] - H[jD * (N + 1) + i]) / dzw;
    const slope = Math.hypot(sx, sz), rel = h - T.plateau;
    const x = pos[k * 3], z = pos[k * 3 + 2];
    c.copy(grass).lerp(grass2, noise(x / 3000, z / 3000));
    if (h < T.water + 60) c.copy(sand);
    c.lerp(dirt, smooth(0.35, 0.7, slope) * 0.7);
    c.lerp(rock, smooth(0.6, 1.1, slope) + smooth(9000, 14000, rel) * 0.8);
    c.lerp(snow, smooth(15000, 19000, rel + noise(x / 4000, z / 4000) * 2500) * (1 - smooth(1.2, 1.8, slope) * 0.5));
    col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
  }
  const idx = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const a0 = j * (N + 1) + i, b0 = a0 + 1, c0 = a0 + N + 1, d0 = c0 + 1;
    idx.push(a0, c0, b0, b0, c0, d0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// texture d'herbe/détail (niveaux de gris, multipliée par la couleur du sol)
export function detailTexture(renderer) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), img = g.createImageData(S, S);
  for (let i = 0; i < S * S; i++) {
    const x = i % S, y = (i / S) | 0;
    const v = 200 + (hash(x, y) - 0.5) * 60 + (noise(x / 16, y / 16) - 0.5) * 50;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 1;
  return t;
}

export function createWater(size, level) {
  const mat = new THREE.ShaderMaterial({
    transparent: true, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { time: { value: 0 }, deep: { value: new THREE.Color(0x1d4e6b) }, shallow: { value: new THREE.Color(0x3f8fae) }, sky: { value: new THREE.Color(0xcfe2ef) } }]),
    vertexShader: `varying vec3 vW;
      #include <fog_pars_vertex>
      void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `uniform float time; uniform vec3 deep, shallow, sky; varying vec3 vW;
      #include <fog_pars_fragment>
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
      void main(){
        vec2 p = vW.xz / 220.0;
        float w = n(p + vec2(time * 0.35, time * 0.2)) * 0.6 + n(p * 2.3 - vec2(time * 0.25, -time * 0.4)) * 0.4;
        vec3 V = normalize(cameraPosition - vW);
        float fres = pow(1.0 - max(V.y, 0.0), 3.0);
        vec3 col = mix(deep, shallow, w * 0.6);
        col = mix(col, sky, fres * 0.7);
        col += vec3(1.0, 0.97, 0.9) * smoothstep(0.78, 0.95, w) * 0.25;
        gl_FragColor = vec4(col, 0.88);
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2), mat);
  m.position.y = level;
  m.raycast = () => {};
  m.onBeforeRender = () => { mat.uniforms.time.value = performance.now() / 1000; };
  return m;
}
