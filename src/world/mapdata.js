import { LEVELS, levelById } from './levels.js';

const PREFIX = 'surfbhop.level.';
const CURRENT = 'surfbhop.current';

export const emptyMap = (id = 'perso') => ({ v: 3, id, name: 'Perso', floor: true, sky: 'jour', spawn: { p: [0, 0, 0], r: 0 }, objects: [] });

export const generateLevel = (id) => { const L = levelById(id) || LEVELS[0]; return { ...L.gen(), id: L.id, name: L.name, tier: L.tier }; };
export const defaultMap = () => generateLevel(LEVELS[0].id);

function migrate(m) {
  if (m.v >= 2) return { ...m, v: 3 };
  return {
    v: 3, floor: m.floor !== false, spawn: m.spawn,
    objects: m.objects.map(o => o.t === 'wedge' ? { t: 'ramp', pr: 'wedge', p: o.p, s: o.s, r: o.r || 0 } : o),
  };
}

export function validate(m) {
  return !!m && Array.isArray(m.objects) && !!m.spawn && Array.isArray(m.spawn.p) &&
    m.objects.every(o => ['box', 'ramp', 'wedge', 'deco'].includes(o.t) && Array.isArray(o.p) && (o.t === 'deco' || Array.isArray(o.s)));
}

export function normalize(m) { return validate(m) ? migrate(m) : null; }

const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
};

// Map d'un level: version modifiée dans l'éditeur si elle existe, sinon générée.
export function loadLevel(id) {
  const s = store.get(PREFIX + id);
  if (s) { try { const m = normalize(JSON.parse(s)); if (m) return { ...m, id }; } catch (e) { /* ignore */ } }
  return generateLevel(id);
}
export function resetLevel(id) { store.del(PREFIX + id); return generateLevel(id); }
export function isModified(id) { return !!store.get(PREFIX + id); }
export function currentLevelId() { const id = store.get(CURRENT); return levelById(id) ? id : LEVELS[0].id; }
export function setCurrentLevelId(id) { store.set(CURRENT, id); }
export function loadMap() { return loadLevel(currentLevelId()); }
export function saveMap(m) { store.set(PREFIX + (m.id || 'perso'), JSON.stringify(m)); }
export function bestTimes(id) { try { return JSON.parse(store.get('surfbhop.best.' + id) || '{}'); } catch (e) { return {}; } }
export function saveBest(id, b) { store.set('surfbhop.best.' + id, JSON.stringify(b)); }

export function downloadMap(m, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(m)], { type: 'application/json' }));
  a.download = name || `${m.id || 'surf-map'}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
