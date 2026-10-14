// Logique de run: stages, zones de fin, chute, chrono.
export function inZone(pos, z) {
  const a = -(z.r || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  const dx = pos.x - z.p[0], dz = pos.z - z.p[2];
  const lx = dx * c + dz * s, lz = -dx * s + dz * c;
  const y = pos.y - z.p[1];
  return Math.abs(lx) <= z.s[0] / 2 && Math.abs(lz) <= z.s[2] / 2 && y >= 0 && y <= z.s[1];
}

export const fmt = (t) => {
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`;
};

export class Run {
  constructor() { this.reset(null); }
  reset(map) {
    this.map = map; this.stage = 0; this.stageTime = 0; this.total = 0;
    this.finished = null; this.best = this.best || {}; this.msg = ''; this.msgT = 0; this.practice = false;
  }
  get stages() { return (this.map && this.map.stages) || []; }
  spawnOf(i) { const st = this.stages[i]; return st ? st.spawn : this.map.spawn; }
  // retourne 'next' | 'fail' | 'finish' | null
  tick(player, dt) {
    if (this.msgT > 0) this.msgT -= dt;
    if (this.finished !== null) return null;
    this.stageTime += dt; this.total += dt;
    const st = this.stages[this.stage];
    if (!st) return player.pos.y < -4000 ? 'fail' : null;
    if (player.pos.y < st.failY) return 'fail';
    if (inZone(player.pos, st.end)) {
      const k = this.stage;
      if (!this.best[k] || this.stageTime < this.best[k]) this.best[k] = this.stageTime;
      const lin = this.map && this.map.mode === 'lineaire';
      this.flash(lin ? `Checkpoint ${k + 1} : ${fmt(this.total)}` : `Stage ${k + 1} : ${fmt(this.stageTime)}`);
      if (k === this.stages.length - 1) { this.finished = this.total; this.flash(`Map terminée en ${fmt(this.total)}`, 5); return 'finish'; }
      this.stage++; this.stageTime = 0;
      return lin ? 'cp' : 'next';
    }
    return null;
  }
  flash(m, t = 2.5) { this.msg = m; this.msgT = t; }
  hud() {
    const n = this.stages.length;
    if (!n) return '';
    const s = this.finished !== null
      ? `TERMINÉ  ${fmt(this.finished)}`
      : (this.map && this.map.mode === 'lineaire')
        ? `Section ${this.stage + 1}/${n}   ${fmt(this.total)}`
        : `Stage ${this.stage + 1}/${n}   ${fmt(this.stageTime)}   total ${fmt(this.total)}`;
    return s;
  }
}
