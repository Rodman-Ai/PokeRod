// Quest registry validator. Confirms:
//  - every quest id is unique.
//  - every reward.item is a real item id.
//  - every fetch quest's target.item is a real item id.
//  - every talk quest's target.talkTo is a real story character id.
//  - every visit quest's target.maps[] are real map ids.
//  - every catchSpecies quest's target.species is a real creature id.
//  - every catchType quest's target.type is a real type.
//  - every quest with `giver` references a real story character.
//  - every quest has check() defined.
'use strict';

global.window = {};
require('../js/data.js');
require('../js/maps.js');
require('../js/items.js');
require('../js/story_encounters.js');
require('../js/quests.js');

const { QUESTS } = window.PR_QUESTS;
const ITEMS = window.PR_ITEMS && window.PR_ITEMS.ITEMS;
const CREATURES = window.PR_DATA && window.PR_DATA.CREATURES;
const MAPS = window.PR_MAPS && window.PR_MAPS.MAPS;
const STORY_CHARS = (window.PR_STORY_ENCOUNTERS && window.PR_STORY_ENCOUNTERS.STORY_CHARACTERS) || [];

const TYPES = new Set([
  'NORMAL','FIRE','WATER','GRASS','ELECTRIC','ICE','FIGHTING','POISON',
  'GROUND','FLYING','PSYCHIC','BUG','ROCK','GHOST','DRAGON','DARK','STEEL','FAIRY'
]);

const errors = [];
function fail(msg) { errors.push(msg); }

const ids = Object.keys(QUESTS);
const seen = new Set();
let withGiver = 0, autoStart = 0;

for (const id of ids) {
  if (seen.has(id)) fail(`duplicate quest id: ${id}`);
  seen.add(id);
  const q = QUESTS[id];
  if (!q.id) fail(`${id}: id field missing`);
  if (q.id !== id) fail(`${id}: q.id=${q.id} !== key`);
  if (typeof q.name !== 'string' || !q.name) fail(`${id}: name missing`);
  if (typeof q.desc !== 'string' || !q.desc) fail(`${id}: desc missing`);
  if (typeof q.check !== 'function') fail(`${id}: check() missing`);
  if (!q.reward || !q.reward.item) fail(`${id}: reward.item missing`);
  else if (ITEMS && !ITEMS[q.reward.item]) fail(`${id}: reward.item ${q.reward.item} not in items registry`);

  if (q.giver) {
    withGiver++;
    if (!STORY_CHARS.find(c => c.id === q.giver)) {
      fail(`${id}: giver '${q.giver}' not a story character id`);
    }
  } else {
    autoStart++;
  }

  if (q.target) {
    if (q.target.item && ITEMS && !ITEMS[q.target.item]) {
      fail(`${id}: target.item ${q.target.item} not found`);
    }
    if (q.target.species && CREATURES && !CREATURES[q.target.species]) {
      fail(`${id}: target.species ${q.target.species} not found`);
    }
    if (q.target.type && !TYPES.has(q.target.type)) {
      fail(`${id}: target.type ${q.target.type} not a valid type`);
    }
    if (q.target.talkTo && !STORY_CHARS.find(c => c.id === q.target.talkTo)) {
      fail(`${id}: target.talkTo '${q.target.talkTo}' not a story character`);
    }
    if (q.target.maps) {
      if (!Array.isArray(q.target.maps)) fail(`${id}: target.maps must be array`);
      else for (const m of q.target.maps) if (MAPS && !MAPS[m]) fail(`${id}: target.maps unknown map ${m}`);
    }
  }

  if (q.category && typeof q.category !== 'string') {
    fail(`${id}: category must be string`);
  }
}

if (errors.length) {
  for (const m of errors) console.error(m);
  console.error(`\nFAIL: ${errors.length} quest registry issues`);
  process.exit(1);
}

console.log(`validated ${ids.length} quests (${withGiver} NPC-given, ${autoStart} auto-start)`);
