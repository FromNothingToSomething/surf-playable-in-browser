import * as THREE from 'three';

// Pluie de pétales de cerisier: points GPU, position calculée dans le shader (boîte qui suit la caméra).
function petalTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.translate(32, 34);
  const grad = g.createRadialGradient(0, 4, 2, 0, 0, 28);
  grad.addColorStop(0, '#fff2f6'); grad.addColorStop(0.6, '#f8bfd3'); grad.addColorStop(1, '#ee9fbd');
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(0, 26);
  g.bezierCurveTo(-26, 12, -22, -22, -6, -26);
  g.lineTo(0, -18);
  g.lineTo(6, -26);
  g.bezierCurveTo(22, -22, 26, 12, 0, 26);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function bubbleTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(26, 24, 2, 32, 32, 28);
  grad.addColorStop(0, 'rgba(255,255,255,0.95)'); grad.addColorStop(0.25, 'rgba(220,250,255,0.35)');
  grad.addColorStop(0.85, 'rgba(180,240,255,0.55)'); grad.addColorStop(1, 'rgba(180,240,255,0)');
  g.fillStyle = grad; g.beginPath(); g.arc(32, 32, 28, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function snowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 24);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.6, 'rgba(255,255,255,0.8)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.beginPath(); g.arc(32, 32, 24, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Réglages par type: vitesse de chute (négatif = monte), balancement, rotation, taille
const KINDS = {
  petales: { tex: petalTexture, fall: 1, sway: 1, spin: 1, size: 11 },
  bulles: { tex: bubbleTexture, fall: -1.6, sway: 0.4, spin: 0, size: 9 },
  neige: { tex: snowTexture, fall: 1.3, sway: 0.7, spin: 0, size: 7 },
};

export function createPetals(count = 1600) {
  const geo = new THREE.BufferGeometry();
  const seed = new Float32Array(count * 3);
  for (let i = 0; i < seed.length; i++) seed[i] = Math.random();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(seed, 3));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: {
      map: { value: petalTexture() }, time: { value: 0 }, cam: { value: new THREE.Vector3() },
      scale: { value: 400 }, size: { value: 11 }, opacity: { value: 1 },
      fall: { value: 1 }, sway: { value: 1 }, spin: { value: 1 },
    },
    vertexShader: `
      attribute vec3 seed; uniform float time, scale, size, fall, sway, spin; uniform vec3 cam;
      varying float vRot; varying float vFade;
      void main(){
        vec3 box = vec3(3200.0, 2200.0, 3200.0);
        vec3 p = seed * box;
        p.y -= time * (70.0 + seed.y * 70.0) * fall;
        p.x += time * 45.0 * sway + sin(time * 0.8 + seed.z * 6.2832) * 140.0 * sway;
        p.z += time * 15.0 * sway + cos(time * 0.6 + seed.x * 6.2832) * 90.0 * sway;
        p = mod(p - cam + box * 0.5, box) + cam - box * 0.5;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float d = -mv.z;
        gl_PointSize = clamp(size * scale / max(d, 1.0), 0.0, 48.0);
        gl_Position = projectionMatrix * mv;
        vRot = (time * (0.8 + seed.x * 2.0) + seed.z * 6.2832) * spin;
        vFade = smoothstep(1600.0, 900.0, d) * smoothstep(5.0, 40.0, d);
      }`,
    fragmentShader: `
      uniform sampler2D map; uniform float opacity; varying float vRot; varying float vFade;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float s = sin(vRot), co = cos(vRot);
        vec2 uv = vec2(co * c.x - s * c.y, s * c.x + co * c.y) + 0.5;
        vec4 t = texture2D(map, uv);
        if (t.a < 0.15) discard;
        gl_FragColor = vec4(t.rgb, t.a * vFade * opacity);
        #include <colorspace_fragment>
      }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 2;
  const texCache = {};
  pts.setKind = (kind) => {
    const k = KINDS[kind] || KINDS.petales;
    mat.uniforms.map.value = texCache[kind] || (texCache[kind] = k.tex());
    mat.uniforms.fall.value = k.fall; mat.uniforms.sway.value = k.sway; mat.uniforms.spin.value = k.spin; mat.uniforms.size.value = k.size;
    pts.visible = kind !== 'aucune';
  };
  pts.update = (time, camera, renderer) => {
    mat.uniforms.time.value = time;
    mat.uniforms.cam.value.copy(camera.position);
    const h = renderer.domElement.height;
    mat.uniforms.scale.value = h * 0.5 * camera.projectionMatrix.elements[5];
  };
  return pts;
}
