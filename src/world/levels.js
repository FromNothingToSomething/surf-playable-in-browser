import { kitsuneMap } from './maps/kitsune.js';
import { hanamiMap } from './maps/hanami.js';
import { roninMap } from './maps/ronin.js';
import { oniMap } from './maps/oni.js';
import { umiMap } from './maps/umi.js';
import { yukiMap } from './maps/yuki.js';

export const MODES = [
  { id: 'stages', name: 'Stages', desc: 'Parcours découpés en stages, téléport à chaque fin de stage' },
  { id: 'lineaire', name: 'Linéaire', desc: 'Une seule descente continue, checkpoints en cas de chute' },
  { id: 'editeur', name: 'Éditeur', desc: 'Modifier la map sélectionnée' },
];

export const LEVELS = [
  { id: 'kitsune', mode: 'stages', name: 'Kitsune', tier: 1, desc: '9 stages · découverte', gen: kitsuneMap },
  { id: 'hanami', mode: 'stages', name: 'Hanami', tier: 2, desc: '6 stages · virages serrés', gen: hanamiMap },
  { id: 'ronin', mode: 'stages', name: 'Rōnin', tier: 3, desc: '6 stages · crépuscule', gen: roninMap },
  { id: 'oni', mode: 'stages', name: 'Oni', tier: 4, desc: '5 stages · de nuit', gen: oniMap },
  { id: 'umi', mode: 'lineaire', name: 'Umi', tier: 2, desc: 'linéaire · sous la mer · 6 checkpoints', gen: umiMap },
  { id: 'yuki', mode: 'lineaire', name: 'Yuki', tier: 3, desc: 'linéaire · neige · 6 checkpoints', gen: yukiMap },
];
export const levelById = (id) => LEVELS.find(l => l.id === id);
