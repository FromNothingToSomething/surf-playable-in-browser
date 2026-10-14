import * as THREE from 'three';
import { createRenderer } from './render/renderer.js';
import { createCamera, updateCamera } from './render/camera.js';
import { createPetals } from './render/petals.js';
import { Input } from './input/input.js';
import { Player } from './player/player.js';
import { Level } from './world/level.js';
import { LEVELS } from './world/levels.js';
import { loadLevel, currentLevelId, setCurrentLevelId, bestTimes, saveBest, isModified } from './world/mapdata.js';
import { Editor } from './editor/editor.js';
import { simulate } from './physics/gamemovement.js';
import { CollisionWorld } from './physics/collision.js';
import { DT, MOUSE_SENS } from './config.js';
import { updateHUD, setHUD, setMode as setBodyMode, setRun } from './ui/hud.js';
import { Run, fmt } from './game/stages.js';

const renderer = createRenderer();
const scene = new THREE.Scene();
const camera = createCamera();
const lockEl = document.getElementById('lock');
const lockText = document.getElementById('lockText');
const menuEl = document.getElementById('menu');
const input = new Input(lockEl);
const player = new Player();
const level = new Level(scene, renderer, loadLevel(currentLevelId()));
const collision = new CollisionWorld(null);
const editor = new Editor(level, camera, input, scene, { onPlay: () => setMode('play') });
const petals = createPetals();
scene.add(petals);

let mode = 'play';
let acc = 0;
const run = new Run();
let finishT = 0;

const MSG = {
  play: 'Cliquer pour jouer\nZQSD · Espace (maintenir = bhop) · souris\nR recommencer le stage · Maj+R tout recommencer · 1-9 stage · P éditeur',
  edit: 'Cliquer pour éditer\nZQSD vol · Espace/C haut-bas · Maj rapide\nP jouer · Échap = panneau',
};

function renderMenu() {
  const cur = level.map.id;
  menuEl.innerHTML = LEVELS.map(L => {
    const b = bestTimes(L.id).total;
    return `<button data-lv="${L.id}" class="${L.id === cur ? 'on' : ''}">
      <span class="t">${'★'.repeat(L.tier)}${'☆'.repeat(4 - L.tier)}</span>
      <b>${L.name}</b><small>${L.desc}${isModified(L.id) ? ' · modifié' : ''}</small>
      <small>${b ? 'record ' + fmt(b) : 'pas encore fini'}</small></button>`;
  }).join('');
  menuEl.querySelectorAll('[data-lv]').forEach(btn => btn.onclick = (e) => {
    e.stopPropagation();
    switchLevel(btn.dataset.lv);
  });
}

function switchLevel(id) {
  setCurrentLevelId(id);
  level.load(loadLevel(id));
  editor.undoStack.length = 0;
  editor._syncUI();
  setMode(mode);
}

function respawn() {
  const s = run.spawnOf(run.stage);
  player.pos.set(s.p[0], s.p[1] + 1, s.p[2]);
  player.prevPos.copy(player.pos);
  player.vel.set(0, 0, 0);
  player.onGround = false;
  player.surfNormal = null;
  input.yaw = (s.r || 0) * Math.PI / 180;
  input.pitch = s.pitch || 0;
}

function setMode(m) {
  mode = m;
  setBodyMode(m);
  lockText.textContent = MSG[m];
  renderMenu();
  if (m === 'play') {
    editor.setActive(false);
    collision.setMesh(level.collision());
    run.reset(level.map);
    respawn();
    acc = 0;
  } else {
    editor.pos.copy(camera.position);
    editor.setActive(true);
  }
}

input.onLockChange = (locked) => {
  lockEl.classList.toggle('hidden', locked);
  if (!locked) renderMenu();
  if (locked && document.activeElement) document.activeElement.blur();
};
input.onMouseDown = (b) => { if (mode === 'edit') editor.onMouse(b); };
input.onWheel = (dy) => { if (mode === 'edit') editor.onWheel(dy); };

addEventListener('keydown', (e) => {
  if (e.repeat || /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
  if (e.code === 'KeyP') setMode(mode === 'play' ? 'edit' : 'play');
  else if (mode === 'play' && e.code === 'KeyR') {
    if (e.shiftKey) run.reset(level.map); else { run.stageTime = 0; run.finished = null; }
    respawn();
  } else if (mode === 'play' && /^Digit[1-9]$/.test(e.code)) {
    const k = +e.code.slice(5) - 1;
    if (k < run.stages.length) { run.reset(level.map); run.stage = k; run.practice = k > 0; respawn(); }
  }
});

let last = performance.now() / 1000;
const t0 = last;
const MAX_DT = 0.25;

function loop() {
  const now = performance.now() / 1000;
  let dt = now - last; last = now;
  if (dt > MAX_DT) dt = MAX_DT;

  if (input.pointerLocked) {
    const m = input.consumeMouse();
    input.yaw   -= m.dx * MOUSE_SENS;
    input.pitch -= m.dy * MOUSE_SENS;
    const lim = Math.PI/2 - 0.01;
    input.pitch = Math.max(-lim, Math.min(lim, input.pitch));
  }

  if (mode === 'edit') {
    editor.update(dt);
    setHUD(editor.hudText());
  } else {
    acc += dt;
    while (acc >= DT) { step(DT); acc -= DT; }
    updateCamera(camera, player, input, acc / DT);
    updateHUD(player);
    setRun(`${level.map.name || ''}  ·  ${run.hud()}`, run.msgT > 0 ? run.msg : '');
  }
  petals.update(now - t0, camera, renderer);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

function step(dt) {
  player.prevPos.copy(player.pos);
  input.tick(dt);
  simulate(player, input, dt);
  collision.moveAndSlide(player, dt);
  const ev = run.tick(player, dt);
  if (ev === 'next' || ev === 'fail') respawn();
  if (ev === 'finish') {
    finishT = 5;
    if (!run.practice) {
      const b = bestTimes(level.map.id);
      if (!b.total || run.finished < b.total) { b.total = run.finished; saveBest(level.map.id, b); run.flash(`Nouveau record : ${fmt(run.finished)}`, 5); }
    }
  }
  if (finishT > 0 && (finishT -= dt) <= 0) { run.reset(level.map); respawn(); }
}

setMode('play');
loop();
window.__game = { player, input, level, editor, collision, setMode, switchLevel, camera, renderer, scene, run };
