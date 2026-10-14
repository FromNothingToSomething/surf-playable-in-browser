import { kitsuneMap } from './maps/kitsune.js';
import { hanamiMap } from './maps/hanami.js';
import { roninMap } from './maps/ronin.js';
import { oniMap } from './maps/oni.js';

export const LEVELS = [
  { id: 'kitsune', name: 'Kitsune', tier: 1, desc: '9 stages · découverte', gen: kitsuneMap },
  { id: 'hanami', name: 'Hanami', tier: 2, desc: '6 stages · virages serrés', gen: hanamiMap },
  { id: 'ronin', name: 'Rōnin', tier: 3, desc: '6 stages · crépuscule', gen: roninMap },
  { id: 'oni', name: 'Oni', tier: 4, desc: '5 stages · de nuit', gen: oniMap },
];
export const levelById = (id) => LEVELS.find(l => l.id === id);
