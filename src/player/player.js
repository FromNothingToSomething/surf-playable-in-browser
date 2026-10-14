import * as THREE from 'three';
import { PLAYER_RADIUS, PLAYER_HEIGHT, PLAYER_EYE } from '../config.js';
// pos = pieds (bas de la capsule)
export class Player {
  constructor() {
    this.pos = new THREE.Vector3(0, 0, 0);
    this.prevPos = this.pos.clone();
    this.vel = new THREE.Vector3();
    this.onGround = false;
    this.surfNormal = null;
    this.radius = PLAYER_RADIUS;
    this.height = PLAYER_HEIGHT;
    this.eyeOffset = PLAYER_EYE;
  }
}
