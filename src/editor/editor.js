import * as THREE from 'three';
import { makeGeometry, PROFILES, PROFILE_LABEL, surfAngles } from '../world/shapes.js';
import { PALETTE } from '../world/build.js';
import { resetLevel, emptyMap, downloadMap, normalize } from '../world/mapdata.js';
import { TEXTURES } from '../render/patterns.js';
import { DECO_KINDS, DECO_LABEL, decoGeometry } from '../world/deco.js';
import { angleVectors } from '../physics/math.js';

const CENTER = new THREE.Vector2(0, 0);
const SNAPS = [16, 32, 64, 128, 256];
const SURF_MIN_DEG = Math.acos(0.7) * 180 / Math.PI; // 45.57°
const typing = (e) => /^(INPUT|SELECT|TEXTAREA)$/.test(e.target && e.target.tagName);
const ghostMat = new THREE.MeshBasicMaterial({ color: 0x44ff88, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide });
const ghostEdge = new THREE.LineBasicMaterial({ color: 0x44ff88 });

const FIELDS = [
  ['w', 'Largeur', 'box ramp'], ['h', 'Hauteur', 'box ramp'], ['l', 'Longueur', 'box ramp'],
  ['top', 'Plateau', 'ramp'], ['drop', 'Dénivelé', 'ramp'], ['bend', 'Courbure °', 'ramp'],
  ['twist', 'Torsion °', 'ramp'], ['r', 'Rotation °', 'box ramp deco'], ['sc', 'Échelle', 'deco'],
];

export class Editor {
  constructor(level, camera, input, scene, hooks) {
    Object.assign(this, { level, camera, input, scene, hooks });
    this.active = false;
    this.pos = new THREE.Vector3(0, 1500, 2500);
    this.tool = 'ramp';
    this.params = {
      box: { s: [512, 256, 512], r: 0, c: 9, tx: 5 },
      ramp: { pr: 'peak', s: [1024, 640, 2048], r: 0, top: 128, drop: 256, bend: 0, twist: 0, c: 10, tx: 1 },
      deco: { k: 'sakura', r: 0, sc: 1 },
    };
    this.snap = 64; this.lift = 0;
    this.undoStack = [];
    this.rc = new THREE.Raycaster();
    this.rc.far = 60000;
    this.target = [0, 0, 0];
    this.ghost = null;
    this._buildUI();
    this._refreshGhost();
    addEventListener('keydown', e => this._key(e));
  }

  get map() { return this.level.map; }
  get cur() { return this.params[this.tool]; }

  setActive(a) {
    this.active = a;
    this.panel.style.display = a ? 'block' : 'none';
    if (this.ghost) this.ghost.visible = a;
    this.level.setEditVisible(a);
  }
  _push() { this.undoStack.push(JSON.stringify(this.map)); if (this.undoStack.length > 80) this.undoStack.shift(); }
  undo() { const s = this.undoStack.pop(); if (s) this.level.replace(JSON.parse(s)); this._syncUI(); }
  _commit() { this.level.commit(); this._syncUI(); }

  _newObject() {
    const p = this.cur;
    if (this.tool === 'deco') return { t: 'deco', k: p.k, p: [...this.target], r: p.r, sc: p.sc };
    const o = { t: this.tool, p: [...this.target], s: [...p.s], r: p.r, c: p.c, tx: p.tx };
    if (this.tool === 'ramp') Object.assign(o, { pr: p.pr, top: p.top, drop: p.drop, bend: p.bend, twist: p.twist });
    return o;
  }

  _refreshGhost() {
    if (this.ghost) { this.scene.remove(this.ghost); this.ghost.geometry.dispose(); this.ghost.children.forEach(c => c.geometry.dispose()); }
    let geo;
    if (this.tool === 'spawn') geo = new THREE.CylinderGeometry(16, 16, 72, 12).translate(0, 36, 0);
    else if (this.tool === 'deco') { const o = this._newObject(); o.p = [0, 0, 0]; o.r = 0; const d = decoGeometry(o); geo = d.lit || d.glow; }
    else geo = makeGeometry(this._newObject());
    this.ghost = new THREE.Mesh(geo, ghostMat);
    this.ghost.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), ghostEdge));
    this.ghost.visible = this.active;
    this.scene.add(this.ghost);
  }

  _targets() {
    const t = [...this.level.group.children];
    if (this.map.floor) t.push(this.level.floorMesh);
    return t;
  }

  _updateGhost() {
    this.rc.setFromCamera(CENTER, this.camera);
    const hit = this.rc.intersectObjects(this._targets(), false)[0];
    const { origin, direction: d } = this.rc.ray;
    let pt;
    if (hit) pt = hit.point.clone();
    else if (d.y < -1e-3) pt = origin.clone().addScaledVector(d, -origin.y / d.y);
    else pt = origin.clone().addScaledVector(d, 2000);
    const s = this.snap;
    pt.set(Math.round(pt.x / s) * s, Math.round(pt.y / s) * s + this.lift, Math.round(pt.z / s) * s);
    this.target = [pt.x, pt.y, pt.z];
    this.ghost.position.copy(pt);
    const r = this.tool === 'spawn' ? this.input.yaw * 180 / Math.PI : this.cur.r;
    this.ghost.rotation.y = r * Math.PI / 180;
  }

  update(dt) {
    const k = this.input.keys;
    const { forward, right } = angleVectors(this.input.yaw, this.input.pitch);
    const mv = new THREE.Vector3()
      .addScaledVector(forward, (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0))
      .addScaledVector(right, (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0));
    mv.y += (k.Space ? 1 : 0) - (k.KeyC ? 1 : 0);
    if (mv.lengthSq() > 0) this.pos.addScaledVector(mv.normalize(), 2000 * (k.ShiftLeft || k.ShiftRight ? 4 : 1) * dt);
    this.camera.position.copy(this.pos);
    this.camera.rotation.y = this.input.yaw;
    this.camera.rotation.x = this.input.pitch;
    this.camera.updateMatrixWorld(true);
    this._updateGhost();
  }

  surfCheck() {
    if (this.tool !== 'ramp') return '';
    const [a0, a1] = surfAngles(this.cur);
    const tw = Math.abs(this.cur.twist || 0) / 2;
    const lo = a0 - tw, hi = a1 + tw;
    const ok = lo > SURF_MIN_DEG && hi < 88;
    return `pente ${lo.toFixed(1)}°–${hi.toFixed(1)}°  ${ok ? 'SURF OK' : (lo <= SURF_MIN_DEG ? 'TROP PLATE (sol, min 45.6°)' : 'TROP RAIDE')}`;
  }

  hudText() {
    const p = this.cur;
    const head = this.tool === 'spawn' ? 'outil: spawn' : this.tool === 'deco' ? `outil: déco / ${DECO_LABEL[p.k]}  échelle ${p.sc}  rot ${p.r}°` :
      `outil: ${this.tool}${this.tool === 'ramp' ? ' / ' + PROFILE_LABEL[p.pr] : ''}  ${p.s.join('×')}  rot ${p.r}°` +
      (this.tool === 'ramp' ? `  dén ${p.drop}  courb ${p.bend}°  tors ${p.twist}°` : '');
    return `ÉDITEUR  ${head}\n${this.surfCheck()}\ngrille ${this.snap}  hauteur +${this.lift}  objets ${this.map.objects.length}  pos ${this.target.map(v => v.toFixed(0)).join(' ')}`;
  }

  onMouse(b) {
    if (!this.active) return;
    if (b === 0) {
      this._push();
      if (this.tool === 'spawn') {
        this.map.spawn = { p: [...this.target], r: Math.round(this.input.yaw * 180 / Math.PI) };
        if (this.map.stages && this.map.stages[0]) this.map.stages[0].spawn = this.map.spawn;
      }
      else this.map.objects.push(this._newObject());
      this._commit();
      return;
    }
    const i = this._pick();
    if (i < 0) return;
    if (b === 2) { this._push(); this.map.objects.splice(i, 1); this._commit(); }
    else if (b === 1) this._copy(this.map.objects[i]);
  }
  _pick() {
    this.rc.setFromCamera(CENTER, this.camera);
    const hit = this.rc.intersectObjects(this.level.group.children, false)[0];
    return hit ? hit.object.userData.i : -1;
  }
  _copy(o) {
    const t = o.t === 'wedge' ? 'ramp' : o.t;
    const p = this.params[t];
    if (t === 'deco') { Object.assign(p, { k: o.k, r: o.r || 0, sc: o.sc || 1 }); this.tool = t; this._refreshGhost(); this._syncUI(); return; }
    p.s = [...o.s]; p.r = o.r || 0; p.c = o.c ?? p.c; p.tx = o.tx ?? 0;
    if (t === 'ramp') Object.assign(p, { pr: o.pr || 'wedge', top: o.top ?? p.top, drop: o.drop || 0, bend: o.bend || 0, twist: o.twist || 0 });
    this.tool = t; this._refreshGhost(); this._syncUI();
  }
  onWheel(dy) { if (this.active) this.lift = Math.max(-8192, this.lift + (dy < 0 ? 1 : -1) * this.snap); }

  _key(e) {
    if (!this.active || typing(e)) return;
    const p = this.cur || {}, mult = e.shiftKey ? 4 : 1, step = this.snap * mult;
    let used = true, ghost = true;
    if (e.ctrlKey && e.key.toLowerCase() === 'z') { this.undo(); e.preventDefault(); return; }
    const sz = (i, d) => { if (p.s) p.s[i] = Math.max(16, p.s[i] + d * step); };
    switch (e.code) {
      case 'Digit1': case 'Numpad1': this.tool = 'box'; break;
      case 'Digit2': case 'Numpad2': this.tool = 'ramp'; break;
      case 'Digit3': case 'Numpad3': this.tool = 'spawn'; break;
      case 'Digit4': case 'Numpad4': this.tool = 'deco'; break;
      case 'KeyY': if (p.tx !== undefined) p.tx = (p.tx + 1) % TEXTURES.length; else if (this.tool === 'deco') p.k = DECO_KINDS[(DECO_KINDS.indexOf(p.k) + 1) % DECO_KINDS.length]; break;
      case 'KeyR': if (p.r !== undefined) p.r = ((p.r + (e.shiftKey ? -15 : 15)) % 360 + 360) % 360; break;
      case 'KeyG': this.snap = SNAPS[(SNAPS.indexOf(this.snap) + 1) % SNAPS.length]; ghost = false; break;
      case 'KeyV': if (this.tool === 'ramp') p.pr = PROFILES[(PROFILES.indexOf(p.pr) + 1) % PROFILES.length]; break;
      case 'KeyT': if (p.c !== undefined) p.c = (p.c + 1) % PALETTE.length; break;
      case 'KeyF': { const i = this._pick(); if (i >= 0) { this._push(); this._copy(this.map.objects[i]); this.map.objects.splice(i, 1); this._commit(); } break; }
      case 'KeyH': this.lift = 0; ghost = false; break;
      case 'ArrowLeft': sz(0, -1); break;
      case 'ArrowRight': sz(0, 1); break;
      case 'ArrowUp': sz(2, 1); break;
      case 'ArrowDown': sz(2, -1); break;
      case 'PageUp': sz(1, 1); break;
      case 'PageDown': sz(1, -1); break;
      case 'KeyB': if (this.tool === 'ramp') p.bend = Math.max(-180, p.bend - 15 * mult); break;
      case 'KeyN': if (this.tool === 'ramp') p.bend = Math.min(180, p.bend + 15 * mult); break;
      case 'KeyJ': if (this.tool === 'ramp') p.drop = p.drop - step; break;
      case 'KeyK': if (this.tool === 'ramp') p.drop = p.drop + step; break;
      case 'KeyU': if (this.tool === 'ramp') p.twist = Math.max(-45, p.twist - 4 * mult); break;
      case 'KeyI': if (this.tool === 'ramp') p.twist = Math.min(45, p.twist + 4 * mult); break;
      default: used = false;
    }
    if (!used) return;
    e.preventDefault();
    if (ghost) this._refreshGhost();
    this._syncUI();
  }

  _buildUI() {
    const p = this.panel = document.createElement('div');
    p.id = 'panel';
    p.innerHTML = `<b>ÉDITEUR</b>
<div class="row"><button data-t="box">1 Bloc</button><button data-t="ramp">2 Rampe</button><button data-t="spawn">3 Spawn</button><button data-t="deco">4 Déco</button></div>
<label>Motif (Y) <select id="tx">${TEXTURES.map((k, i) => `<option value="${i}">${k}</option>`).join('')}</select></label>
<label>Décor (Y) <select id="dk">${DECO_KINDS.map(k => `<option value="${k}">${DECO_LABEL[k]}</option>`).join('')}</select></label>
<label>Profil (V) <select id="pr">${PROFILES.map(k => `<option value="${k}">${PROFILE_LABEL[k]}</option>`).join('')}</select></label>
${FIELDS.map(([k, n]) => `<label>${n} <input id="f_${k}" type="number"></label>`).join('')}
<div class="row" id="sw">${PALETTE.map((c, i) => `<span data-c="${i}" style="background:#${c.toString(16).padStart(6, '0')}"></span>`).join('')}</div>
<label>Grille (G) <select id="snap">${SNAPS.map(s => `<option>${s}</option>`).join('')}</select></label>
<label><span><input id="floor" type="checkbox"> Sol infini</span></label>
<div id="chk"></div>
<div class="row"><button id="bplay">Jouer (P)</button><button id="bundo">Annuler</button></div>
<div class="row"><button id="bexp">Exporter</button><button id="bimp">Importer</button><input id="file" type="file" accept=".json" hidden></div>
<div class="row"><button id="bex">Réinitialiser le level</button><button id="bnew">Vider</button></div>
<pre>Échap: libère la souris (panneau)
ZQSD vol · Espace/C haut/bas · Maj ×4
Clic G poser · Clic D suppr
Clic molette copier · F déplacer
Molette hauteur · H remise à 0
R/Maj+R rotation ±15° · G grille
V profil · T couleur · Y motif/décor
4 Déco (cerisier, lanterne, île…)
←→ largeur · ↑↓ longueur
PgUp/PgDn hauteur (Maj ×4)
B/N courbure · J/K dénivelé
U/I torsion · Ctrl+Z annuler
Sauvegarde auto.</pre>`;
    document.body.appendChild(p);
    const $ = (s) => p.querySelector(s);
    p.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { this.tool = b.dataset.t; this._refreshGhost(); this._syncUI(); });
    p.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { if (this.cur.c !== undefined) { this.cur.c = +b.dataset.c; this._refreshGhost(); this._syncUI(); } });
    $('#pr').onchange = (e) => { this.params.ramp.pr = e.target.value; this._refreshGhost(); this._syncUI(); };
    for (const [k] of FIELDS) $('#f_' + k).onchange = (e) => {
      const v = +e.target.value || 0, c = this.cur;
      if (!c) return;
      if (['w', 'h', 'l'].includes(k) && !c.s) return;
      if (k === 'sc') c.sc = Math.max(0.2, Math.min(5, v || 1));
      else if (k === 'w') c.s[0] = Math.max(16, v); else if (k === 'h') c.s[1] = Math.max(16, v); else if (k === 'l') c.s[2] = Math.max(16, v);
      else if (k === 'bend') c.bend = Math.max(-180, Math.min(180, v));
      else if (k === 'twist') c.twist = Math.max(-45, Math.min(45, v));
      else c[k] = v;
      this._refreshGhost(); this._syncUI();
    };
    $('#snap').onchange = (e) => { this.snap = +e.target.value; };
    $('#floor').onchange = (e) => { this._push(); this.map.floor = e.target.checked; this._commit(); };
    $('#bplay').onclick = () => this.hooks.onPlay();
    $('#bundo').onclick = () => this.undo();
    $('#bexp').onclick = () => downloadMap(this.map);
    $('#bimp').onclick = () => $('#file').click();
    $('#file').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try { const m = normalize(JSON.parse(await f.text())); if (!m) throw 0; m.id = this.map.id; this._push(); this.level.replace(m); this._syncUI(); }
      catch (err) { alert('Fichier de map invalide'); }
      e.target.value = '';
    };
    $('#bex').onclick = () => { if (!confirm('Revenir à la version d\'origine de ce level ? (tes modifs seront perdues)')) return; this._push(); this.level.load(resetLevel(this.map.id)); this._syncUI(); };
    $('#tx').onchange = (e) => { if (this.cur && this.cur.tx !== undefined) { this.cur.tx = +e.target.value; this._refreshGhost(); this._syncUI(); } };
    $('#dk').onchange = (e) => { this.params.deco.k = e.target.value; this._refreshGhost(); this._syncUI(); };
    $('#bnew').onclick = () => { this._push(); this.level.replace({ ...emptyMap(this.map.id), name: this.map.name, sky: this.map.sky }); this._syncUI(); };
    this._syncUI();
  }

  _syncUI() {
    const p = this.panel, c = this.cur;
    p.querySelectorAll('[data-t]').forEach(b => b.classList.toggle('on', b.dataset.t === this.tool));
    p.querySelectorAll('[data-c]').forEach(b => b.classList.toggle('on', !!c && +b.dataset.c === c.c));
    const pr = p.querySelector('#pr');
    pr.value = this.params.ramp.pr; pr.disabled = this.tool !== 'ramp';
    const tx = p.querySelector('#tx'); tx.disabled = !c || c.tx === undefined; tx.value = c && c.tx !== undefined ? c.tx : 0;
    const dk = p.querySelector('#dk'); dk.disabled = this.tool !== 'deco'; dk.value = this.params.deco.k;
    const vals = c ? { w: c.s && c.s[0], h: c.s && c.s[1], l: c.s && c.s[2], top: c.top, drop: c.drop, bend: c.bend, twist: c.twist, r: c.r, sc: c.sc } : {};
    for (const [k, , tools] of FIELDS) {
      const el = p.querySelector('#f_' + k), on = tools.split(' ').includes(this.tool) && (k !== 'top' || c.pr === 'trap');
      el.disabled = !on; el.value = on ? vals[k] : '';
      el.step = ['bend', 'r'].includes(k) ? 15 : k === 'twist' ? 4 : this.snap;
    }
    p.querySelector('#snap').value = this.snap;
    p.querySelector('#floor').checked = !!this.map.floor;
    const chk = this.surfCheck();
    p.querySelector('#chk').textContent = chk;
    p.querySelector('#chk').className = chk.includes('OK') ? 'ok' : (chk ? 'bad' : '');
  }
}
