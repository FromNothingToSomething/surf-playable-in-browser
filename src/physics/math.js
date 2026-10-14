import * as THREE from 'three';
export function angleVectors(yaw, pitch) {
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const cy = Math.cos(yaw),   sy = Math.sin(yaw);
  return {
    forward: new THREE.Vector3(-sy*cp, sp, -cy*cp),
    right:   new THREE.Vector3(cy, 0, -sy),
  };
}
