import * as THREE from 'three';

// Mer de lave animée (shader procédural, sans texture). Visible de très loin (pas de brouillard de scène).
export function createLava(size) {
  const mat = new THREE.ShaderMaterial({
    fog: false,
    uniforms: { time: { value: 0 }, haze: { value: new THREE.Color(0xc04a1c) } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      uniform float time; uniform vec3 haze; varying vec3 vW;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a * n(p); p *= 2.03; a *= 0.5; } return v; }
      void main(){
        vec2 p = vW.xz / 3000.0;
        float t = time * 0.05;
        vec2 q = vec2(fbm(p + t), fbm(p - t + 4.0));
        float v = fbm(p * 1.7 + q * 2.0 + vec2(t * 0.6, -t));
        float crust = smoothstep(0.42, 0.62, v);
        vec3 hot = mix(vec3(1.0, 0.85, 0.3), vec3(1.0, 0.35, 0.05), smoothstep(0.2, 0.45, v));
        vec3 col = mix(hot * 1.6, vec3(0.16, 0.04, 0.03), crust);
        float d = length(vW - cameraPosition);
        col = mix(col, haze, smoothstep(20000.0, 90000.0, d));
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2), mat);
  m.raycast = () => {};
  m.onBeforeRender = () => { mat.uniforms.time.value = performance.now() / 1000; };
  m.visible = false;
  return m;
}
