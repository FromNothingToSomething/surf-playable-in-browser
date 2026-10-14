import { buildLinear, C, TX } from './builder.js';
import { makeHeight } from '../terrain.js';

// Linéaire avec checkpoints, tier 2 — Valombre: du sommet de la montagne jusque dans la cour du château.
// Paysage: vallée boisée, rivière, lac, village, château entouré de douves, chevaliers (assets CC0 KayKit).
const R = { w: 896, h: 660 };
const SECTIONS = [
  [{ ...R, dx: -224, L: 4096, drop: 512 }, { ...R, dx: 384 }, { ...R, dx: -384, L: 4096 }],
  [{ ...R, bend: 45, L: 5120, drop: 640 }, { ...R, bend: -45, L: 5120, drop: 640 }],
  [{ ...R, pr: 'curvepeak', h: 800 }, { valley: true, w: 576, h: 960, L: 4608, dy: 600 }, { ...R, dy: 1300 }],
  [{ ...R, L: 5120, drop: 1200 }, { ...R, dx: 448, gap: 512 }, { ...R, dx: -448, gap: 512 }],
  [{ ...R, twist: 12, h: 800 }, { ...R, twist: -12, h: 800, bend: 30 }],
  [{ ...R, bend: -60, L: 5632, drop: 640 }, { ...R, L: 4096 }],
  [{ ...R, L: 5120, drop: 800 }, { ...R, L: 4096, drop: 400 }],
];

function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }

export function valombreMap() {
  const Y0 = 40000;
  const map = buildLinear(SECTIONS, {
    ramps: [{ c: C.blanc, tx: TX.pierre ?? 12 }, { c: C.wood, tx: TX.bois }],
    noDeco: true, sky: 'royaume', particles: 'aucune',
    platform: { c: C.blanc, tx: 13 },
  }, { y: Y0, exitFrac: 0.4, dy: 320, endLen: 3600, endW: 3200, endDrop: 1500, endGap: 1500, failMargin: 2800 });
  map.floor = false;

  const E = map.endInfo, [cx, top, cz] = E.center, yaw = E.yaw;
  const cs = Math.cos(yaw), sn = Math.sin(yaw);
  // repère local du château: +z = côté d'arrivée (porte), -z = donjon
  const W = (lx, lz) => [cx + lx * cs + lz * sn, cz - lx * sn + lz * cs];
  const deg = (r) => r * 180 / Math.PI, Y = deg(yaw);
  const hx = E.ew / 2 + 60, hz = E.len / 2 + 60;
  const plateau = top - 60, water = plateau - 130;
  const path = map.stages.flatMap(s => s.path).filter((_, i) => i % 2 === 0).map(p => ({ x: p.x, z: p.z, y: p.y }));
  let maxD = 0; for (const p of path) maxD = Math.max(maxD, Math.hypot(p.x - cx, p.z - cz));
  const river = [[-26000, -9000], [-17000, -6500], [-11000, -2600], [-6500, -1200], [-hx - 700, 300]].map(([a, b]) => W(a, b));
  const lk = W(15000, -9000);
  map.terrain = {
    center: [cx, cz], castleYaw: yaw, castleHalf: [hx, hz], plateau, water,
    summit: [map.spawn.p[0], map.spawn.p[2], Y0 - 450], path, river, lake: [lk[0], lk[1], 3600],
    size: Math.ceil((maxD * 2.3 + 60000) / 1000) * 1000,
  };
  const hf = makeHeight(map.terrain);
  const r = rng(4242);
  const buildings = [], trees = [], knights = [], clouds = [];
  const B = (k, lx, lz, rot = 0, s = 400, y) => { const [x, z] = W(lx, lz); buildings.push({ k, p: [x, y ?? hf(x, z), z], r: Y + rot, s }); };

  // --- château ---
  B('castle', 0, -hz + 650, 0, 440, top);
  const side = (ax, az, bx, bz, rot, gateMid) => {
    const L = Math.hypot(bx - ax, bz - az), n = Math.max(2, Math.round(L / 800)), seg = L / n;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, lx = ax + (bx - ax) * t, lz = az + (bz - az) * t;
      B(gateMid && i === Math.floor(n / 2) ? 'wallGate' : 'wall', lx, lz, rot, seg / 2, top);
    }
  };
  side(-hx, hz, hx, hz, 0, true);      // arrière (porte)
  side(-hx, -hz, hx, -hz, 180, false); // avant
  side(-hx, -hz, -hx, hz, 90, false);  // gauche
  side(hx, -hz, hx, hz, -90, false);   // droite
  for (const [sx, sz] of [[-1, -1], [1, -1]]) { B('towerCatapult', sx * hx, sz * hz, 0, 470, top); }
  for (const [sx, sz] of [[-1, 1], [1, 1]]) { B('towerB', sx * hx, sz * hz, 0, 470, top); B('flag', sx * hx, sz * hz, 0, 320, top + 1170); }
  for (const sx of [-1, 1]) { B('towerA', sx * hx, 0, 0, 430, top); B('flag', sx * hx, 0, 0, 300, top + 940); }
  B('bridge', 0, hz + 640, 0, 470, top - 200);
  B('well', 900, -300, 0, 300, top);
  for (const [lx, lz, k] of [[-hx + 300, -400, 'barrel'], [-hx + 320, -150, 'barrel'], [-hx + 360, 300, 'crates'], [hx - 320, 500, 'weaponrack'], [hx - 340, -600, 'wheelbarrow'], [-900, 800, 'tent']]) B(k, lx, lz, r() * 360, 300, top);
  map.objects.push({ t: 'box', hidden: true, p: [...W(0, -hz + 650)].flatMap((v, i) => i === 0 ? [v, top] : [v]), s: [900, 1700, 1000], r: Y });

  // --- village (côté gauche et avant) ---
  const village = [
    ['church', -7600, -6200, 30], ['tavern', -5600, -3400, 70], ['market', -6600, -800, 90], ['blacksmith', -4800, 2600, 100],
    ['well', -6200, 1400, 0], ['homeA', -8800, -3600, 60], ['homeB', -9400, -1400, 80], ['homeA', -8600, 1200, 110], ['homeB', -7600, 3600, 140],
    ['homeA', -4600, -6800, 20], ['homeB', -6000, -8600, 10], ['homeA', -3600, -9200, 340], ['homeB', -10400, -6000, 50],
    ['windmill', -12500, 6500, 120], ['barracks', 5600, -5200, 270], ['archery', 6800, -1600, 260],
    ['tent', 6200, 2600, 200], ['tent', 7200, 3400, 230], ['tent', 5400, 3600, 180],
  ];
  for (const [k, lx, lz, rot] of village) B(k, lx, lz, rot, k === 'windmill' ? 520 : 400);
  const [wmx, wmz] = river[2]; buildings.push({ k: 'watermill', p: [wmx + 700, hf(wmx + 700, wmz), wmz], r: Y + 90, s: 420 });
  B('target', 7600, -900, 270, 320); B('target', 7600, -2300, 270, 320);

  // --- chevaliers ---
  const K = (lx, lz, rot, anim, y, extra = {}) => { const [x, z] = W(lx, lz); knights.push({ p: [x, y ?? hf(x, z), z], r: Y + rot, anim, s: 55, ...extra }); };
  K(-240, hz + 260, 0, 'Blocking', top); K(240, hz + 260, 0, 'Blocking', top, { variant: 1 });
  for (const lx of [-1500, -600, 600, 1500]) K(lx, hz - 40, 0, 'Idle', top + 400, { variant: lx > 0 ? 1 : 0 });
  for (const lx of [-1200, 1200]) K(lx, -hz + 40, 180, 'Idle', top + 400);
  const loop = (ax, az, bx, bz) => [W(ax, az), W(bx, az), W(bx, bz), W(ax, bz)];
  K(-hx + 500, hz - 600, 0, 'Idle', top, { patrol: loop(-hx + 500, -hz + 1500, hx - 500, hz - 600), speed: 130 });
  K(hx - 500, -hz + 1500, 0, 'Idle', top, { patrol: loop(hx - 500, -hz + 1500, -hx + 500, hz - 600).reverse(), speed: 130, variant: 1 });
  K(7300, -900, 270, '1H_Melee_Attack_Chop'); K(7300, -2300, 270, '1H_Melee_Attack_Chop', undefined, { variant: 1 });
  K(-6600, -500, 120, 'Cheer'); K(-5400, -3000, 200, 'Idle', undefined, { variant: 1 });
  const road = [W(0, hz + 1300), W(-2500, 2600), W(-5200, 1200), W(-2500, 2600)];
  knights.push({ p: [road[0][0], hf(...road[0]), road[0][1]], r: 0, anim: 'Idle', s: 55, patrol: road, speed: 120, ground: true });

  // --- forêt ---
  const avoid = buildings.map(b => [b.p[0], b.p[2]]);
  let tries = 0;
  const pick = () => { const x = r(); return x < 0.46 ? 'treeA' : x < 0.80 ? 'treeB' : x < 0.86 ? 'treesSmall' : x < 0.93 ? 'treesLarge' : 'treesMedium'; };
  while (trees.length < 2100 && tries++ < 30000) {
    const a = r() * Math.PI * 2, d = 5200 + Math.pow(r(), 0.7) * Math.min(52000, maxD * 0.9 + 15000);
    const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, h = hf(x, z);
    if (h < water + 120 || h > plateau + 9000) continue;
    const dens = Math.sin(x / 9000 + Math.sin(z / 7000) * 2) + Math.cos(z / 8000);
    if (dens < -0.2 && r() > 0.15) continue;
    if (avoid.some(([bx, bz]) => (bx - x) ** 2 + (bz - z) ** 2 < 1300 * 1300)) continue;
    const k = pick();
    trees.push({ k, p: [x, h - 30, z], r: r() * 360, s: (k.startsWith('trees') ? 650 : 560) * (0.75 + r() * 0.6) });
  }
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2, d = 6000 + r() * 70000;
    const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    trees.push({ k: i % 3 ? 'rockA' : 'rockC', p: [x, hf(x, z) - 60, z], r: r() * 360, s: 900 + r() * 1200 });
  }
  for (let i = 0; i < 34; i++) {
    const a = r() * Math.PI * 2, d = 4000 + r() * 90000;
    clouds.push({ p: [cx + Math.cos(a) * d, Y0 + 5000 + r() * 9000, cz + Math.sin(a) * d], r: r() * 360, s: 2200 + r() * 2600 });
  }
  map.scenery = { buildings, trees, knights, clouds };
  delete map.endInfo;
  return map;
}
