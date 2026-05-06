// Validate PokeRod's offensive type chart against the canonical matchup
// table used by this project. Missing entries are expected to be neutral.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

const EXPECTED = {
  NORMAL:  { super:[], weak:['ROCK','STEEL'], immune:['GHOST'] },
  FIRE:    { super:['GRASS','ICE','BUG','STEEL'], weak:['FIRE','WATER','ROCK','DRAGON'], immune:[] },
  WATER:   { super:['FIRE','GROUND','ROCK'], weak:['WATER','GRASS','DRAGON'], immune:[] },
  ELECTRIC:{ super:['WATER','FLYING'], weak:['ELECTRIC','GRASS','DRAGON'], immune:['GROUND'] },
  GRASS:   { super:['WATER','GROUND','ROCK'], weak:['FIRE','GRASS','POISON','FLYING','BUG','DRAGON','STEEL'], immune:[] },
  ICE:     { super:['GRASS','GROUND','FLYING','DRAGON'], weak:['FIRE','WATER','ICE','STEEL'], immune:[] },
  FIGHTING:{ super:['NORMAL','ICE','ROCK','DARK','STEEL'], weak:['POISON','FLYING','PSYCHIC','BUG','FAIRY'], immune:['GHOST'] },
  POISON:  { super:['GRASS','FAIRY'], weak:['POISON','GROUND','ROCK','GHOST'], immune:['STEEL'] },
  GROUND:  { super:['FIRE','ELECTRIC','POISON','ROCK','STEEL'], weak:['GRASS','BUG'], immune:['FLYING'] },
  FLYING:  { super:['GRASS','FIGHTING','BUG'], weak:['ELECTRIC','ROCK','STEEL'], immune:[] },
  PSYCHIC: { super:['FIGHTING','POISON'], weak:['PSYCHIC','STEEL'], immune:['DARK'] },
  BUG:     { super:['GRASS','PSYCHIC','DARK'], weak:['FIRE','FIGHTING','POISON','FLYING','GHOST','STEEL','FAIRY'], immune:[] },
  ROCK:    { super:['FIRE','ICE','FLYING','BUG'], weak:['FIGHTING','GROUND','STEEL'], immune:[] },
  GHOST:   { super:['PSYCHIC','GHOST'], weak:['DARK'], immune:['NORMAL'] },
  DRAGON:  { super:['DRAGON'], weak:['STEEL'], immune:['FAIRY'] },
  DARK:    { super:['PSYCHIC','GHOST'], weak:['FIGHTING','DARK','FAIRY'], immune:[] },
  STEEL:   { super:['ICE','ROCK','FAIRY'], weak:['FIRE','WATER','ELECTRIC','STEEL'], immune:[] },
  FAIRY:   { super:['FIGHTING','DRAGON','DARK'], weak:['FIRE','POISON','STEEL'], immune:[] }
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

const context = { window:{}, console };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8'), context);
const data = context.window.PR_DATA;
const types = data.TYPES || [];

for (const type of Object.keys(EXPECTED)) {
  if (!types.includes(type)) fail(`missing type ${type}`);
  if (!data.TYPE_COLOR[type]) fail(`missing color for ${type}`);
}

for (const atk of Object.keys(EXPECTED)) {
  const spec = EXPECTED[atk];
  for (const def of Object.keys(EXPECTED)) {
    let want = 1;
    if (spec.super.includes(def)) want = 2;
    if (spec.weak.includes(def)) want = 0.5;
    if (spec.immune.includes(def)) want = 0;
    const got = data.effectiveness(atk, [def]);
    if (got !== want) fail(`${atk} -> ${def}: expected ${want}, got ${got}`);
  }
}

const iceVsGrassFlying = data.effectiveness('ICE', ['GRASS', 'FLYING']);
if (iceVsGrassFlying !== 4) fail(`dual-type stacking failed: ICE -> GRASS/FLYING expected 4, got ${iceVsGrassFlying}`);

if (!process.exitCode) {
  console.log(`validated offensive type chart for ${Object.keys(EXPECTED).length} types`);
}
