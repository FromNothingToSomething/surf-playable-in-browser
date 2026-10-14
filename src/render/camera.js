import * as THREE from 'three';
export function createCamera() {
  const c = new THREE.PerspectiveCamera(90, innerWidth/innerHeight, 4, 320000);
  c.rotation.order = 'YXZ';
  addEventListener('resize', () => { c.aspect = innerWidth/innerHeight; c.updateProjectionMatrix(); });
  return c;
}
export function updateCamera(cam, p, input, alpha) {
  cam.position.lerpVectors(p.prevPos, p.pos, alpha);
  cam.position.y += p.eyeOffset;
  cam.rotation.y = input.yaw;
  cam.rotation.x = input.pitch;
}
