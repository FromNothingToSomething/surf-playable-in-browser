# surf-bhop

Jeu de surf / bhop style CS:S dans le navigateur. Three.js + Vite, physique Source portée en JS.

## Lancer

```
npm install
npm run dev
```

Version fichier unique (sans npm) : `npm run single` génère `surf-bhop.html`, à ouvrir directement.

## Contrôles (AZERTY)

- ZQSD, Espace (maintenir = bhop), souris
- R : recommencer le stage · Maj+R : recommencer le level · 1-9 : choisir un stage
- P : éditeur · Échap : menu des levels

## Levels

| Level | Tier | Stages |
|---|---|---|
| Kitsune | 1 | 9 |
| Hanami | 2 | 6 |
| Rōnin | 3 | 6 |
| Oni | 4 | 5 |

## Tests

```
npm test
```

`test/sim.mjs` : physique et collisions. `test/bot.mjs` : un bot termine chaque stage de chaque level.

## Structure

```
src/
  physics/   gamemovement (air-accel, friction, saut), collision (capsule + BVH)
  world/     formes, build, levels, maps/ (builder + levels), décor
  render/    renderer, caméra, ciel, motifs, pétales
  editor/    éditeur de map
  game/      stages, chrono
  input/ player/ ui/
```
