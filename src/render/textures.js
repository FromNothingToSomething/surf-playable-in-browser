import * as THREE from 'three';

// Texture procédurale type "dev texture" Source: 1 tuile = 256 unités, lignes fines tous les 32u, fortes tous les 256u.
export const TEX_WORLD = 256;

function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }

export function makeGridTexture(renderer, { base = 222, minor = 196, major = 150, noise = 10, size = 512 } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  const r = rng(1234);
  for (let i = 0; i < size * size; i++) {
    const v = base + (r() - 0.5) * noise;
    img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // dalles légèrement variées (64u)
  const cell = size / 4;
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    g.fillStyle = `rgba(0,0,0,${(r() * 0.05).toFixed(3)})`;
    g.fillRect(x * cell, y * cell, cell, cell);
  }
  const step = size / 8;
  g.fillStyle = `rgb(${minor},${minor},${minor})`;
  for (let i = 0; i < 8; i++) { g.fillRect(i * step, 0, 2, size); g.fillRect(0, i * step, size, 2); }
  g.fillStyle = `rgb(${major},${major},${major})`;
  g.fillRect(0, 0, 4, size); g.fillRect(0, 0, size, 4);
  g.fillRect(size - 2, 0, 2, size); g.fillRect(0, size - 2, size, 2);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 1;
  return t;
}
