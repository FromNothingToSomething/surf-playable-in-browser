# surf-bhop

Jeu de surf / bhop style CS:S dans le navigateur. Three.js + Vite, physique Source portée en JS.

## Installation et lancement

Prérequis : [Node.js](https://nodejs.org) 18 ou plus.

```
npm install
npm run dev
```

1. `npm install` installe les dépendances (three, three-mesh-bvh, vite). À faire une seule fois.
2. `npm run dev` lance le serveur de développement. Ouvre ensuite l'adresse affichée (par défaut http://localhost:5173).

Ne pas ouvrir `index.html` avec Live Server ou en double-clic : les imports ne fonctionnent qu'à travers Vite.

Sans npm : ouvrir directement `surf-bhop.html` (version fichier unique, régénérée avec `npm run single`).

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
