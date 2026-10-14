const $ = (id) => document.getElementById(id);
export function updateHUD(p) {
  const hs = Math.hypot(p.vel.x, p.vel.z);
  const state = p.onGround ? 'sol' : (p.surfNormal ? 'surf' : 'air');
  $('speed').textContent = hs.toFixed(0);
  $('hud').textContent = `état: ${state}\nR stage · Maj+R run · 1-9 stage · P éditeur`;
}
export function setHUD(text) { $('hud').textContent = text; $('speed').textContent = ''; $('run').textContent = ''; $('msg').textContent = ''; }
export function setRun(text, msg) { $('run').textContent = text; $('msg').textContent = msg; }
export function setMode(m) { document.body.dataset.mode = m; }
