const typing = (e) => /^(INPUT|SELECT|TEXTAREA)$/.test(e.target && e.target.tagName);

export class Input {
  constructor(lockEl) {
    this.keys = Object.create(null);
    this.yaw = 0; this.pitch = 0;
    this.mouseDX = 0; this.mouseDY = 0;
    this.jumpBuffer = 0;
    this.JUMP_BUFFER = 0.1;
    this.pointerLocked = false;
    this.onLockChange = null;
    this.onMouseDown = null;
    this.onWheel = null;

    addEventListener('keydown', e => {
      if (e.repeat || typing(e)) return;
      this.keys[e.code] = true;
      if (e.code === 'Space') e.preventDefault();
    });
    addEventListener('keyup', e => { this.keys[e.code] = false; });
    addEventListener('blur', () => { this.keys = Object.create(null); });

    lockEl.addEventListener('click', () => { if (!this.pointerLocked) lockEl.requestPointerLock(); });
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === lockEl;
      if (!this.pointerLocked) this.keys = Object.create(null);
      this.onLockChange && this.onLockChange(this.pointerLocked);
    });
    addEventListener('mousemove', e => {
      if (!this.pointerLocked) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    });
    addEventListener('mousedown', e => {
      if (this.pointerLocked && this.onMouseDown) { e.preventDefault(); this.onMouseDown(e.button); }
    });
    addEventListener('wheel', e => {
      if (this.pointerLocked && this.onWheel) { e.preventDefault(); this.onWheel(e.deltaY); }
    }, { passive: false });
    addEventListener('contextmenu', e => e.preventDefault());
  }
  consumeMouse() { const dx = this.mouseDX, dy = this.mouseDY; this.mouseDX = 0; this.mouseDY = 0; return { dx, dy }; }
  tick(dt) {
    if (this.keys['Space']) this.jumpBuffer = this.JUMP_BUFFER;
    else if (this.jumpBuffer > 0) this.jumpBuffer -= dt;
    if (this.jumpBuffer < 0) this.jumpBuffer = 0;
  }
  // AZERTY: KeyW=Z(avant), KeyA=Q(gauche), KeyS=S(arrière), KeyD=D(droite)
  get wishMove() {
    return {
      forward: (this.keys['KeyW'] ? 1 : 0) - (this.keys['KeyS'] ? 1 : 0),
      right:   (this.keys['KeyD'] ? 1 : 0) - (this.keys['KeyA'] ? 1 : 0),
    };
  }
  get jumpPressed() { return this.jumpBuffer > 0; }
}
