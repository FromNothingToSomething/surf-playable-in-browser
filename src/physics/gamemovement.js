import * as THREE from 'three';
import * as C from '../config.js';
import { angleVectors } from './math.js';

const _wish = new THREE.Vector3();

export function simulate(player, input, dt) {
  const { forward, right } = angleVectors(input.yaw, 0);
  const wm = input.wishMove;
  _wish.set(0, 0, 0)
    .addScaledVector(forward, wm.forward)
    .addScaledVector(right, wm.right);
  const wl = _wish.length();
  if (wl > 1e-6) _wish.divideScalar(wl);
  const wishspeed = C.MAX_SPEED * Math.min(1, wl);

  const onSurf = player.surfNormal !== null;

  if (player.onGround && !onSurf && input.jumpPressed) {
    player.vel.y = C.JUMP_VELOCITY;
    player.onGround = false;
    input.jumpBuffer = 0;
  }

  if (player.onGround && !onSurf) {
    applyFriction(player, dt);
    accelerate(player, _wish, wishspeed, C.ACCELERATE, dt);
  } else {
    accelerate(player, _wish, wishspeed, C.AIR_ACCELERATE, dt, C.AIR_WISHSPEED_CAP);
    player.vel.y -= C.GRAVITY * dt;
  }
  const mv = C.MAX_VELOCITY;
  player.vel.set(
    Math.max(-mv, Math.min(mv, player.vel.x)),
    Math.max(-mv, Math.min(mv, player.vel.y)),
    Math.max(-mv, Math.min(mv, player.vel.z)));
}

function applyFriction(p, dt) {
  const speed = Math.hypot(p.vel.x, p.vel.z);
  if (speed < 0.1) { p.vel.x = 0; p.vel.z = 0; return; }
  const control = Math.max(speed, C.STOP_SPEED);
  const drop = control * C.FRICTION * dt;
  const k = Math.max(0, speed - drop) / speed;
  p.vel.x *= k; p.vel.z *= k;
}

function accelerate(p, wishDir, wishspeed, accel, dt, cap = wishspeed) {
  if (wishspeed <= 0) return;
  const current = p.vel.dot(wishDir);
  const add = Math.min(wishspeed, cap) - current;
  if (add <= 0) return;
  let accelSpeed = accel * wishspeed * dt;
  if (accelSpeed > add) accelSpeed = add;
  p.vel.addScaledVector(wishDir, accelSpeed);
}
