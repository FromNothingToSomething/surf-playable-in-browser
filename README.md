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

## Modes et maps

Le mode se choisit sur l'écran d'accueil (ou Échap) : Stages, Linéaire, Éditeur.

| Map | Mode | Tier | Contenu |
|---|---|---|---|
| Kitsune | Stages | 1 | 9 stages |
| Hanami | Stages | 2 | 6 stages |
| Rōnin | Stages | 3 | 6 stages |
| Oni | Stages | 4 | 5 stages |
| Umi | Linéaire | 2 | sous la mer, 6 checkpoints |
| Yuki | Linéaire | 3 | neige, 6 checkpoints |
| Valombre | Linéaire | 2 | médiéval : sommet → vallée boisée → château avec douves, village, chevaliers |
| Inferno | Linéaire | 5 | enfer, **sans checkpoint**, 17 sections, course de 1 min 50 minimum |

En linéaire, une chute renvoie au dernier checkpoint avec de l'élan.
Sur Inferno, une chute renvoie au départ. Entraînement par section (sans record) : 1-9, N (suivante), B (précédente).

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

## Crédits assets

Modèles 3D de Valombre : **KayKit Medieval Hexagon Pack** et **KayKit Adventurers Character Pack** par Kay Lousberg (www.kaylousberg.com), licence CC0. Licences dans `src/assets/`.
