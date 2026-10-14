import * as THREE from 'three';
import { SCREEN_SCALE } from '../config.js';
export function createRenderer() {
  const r = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  r.setPixelRatio(SCREEN_SCALE);
  r.setSize(innerWidth, innerHeight);
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.0;
  document.body.appendChild(r.domElement);
  addEventListener('resize', () => r.setSize(innerWidth, innerHeight));
  return r;
}
