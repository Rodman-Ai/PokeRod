// Story encounter validator. Confirms:
//  - every chain has contiguous chainStep values 0..N (no gaps / dupes).
//  - every encounter id is unique.
//  - every character.sprite has 8 atlas frames in every style.
//  - every trigger.map references an existing map.
//  - every trigger.species references an existing creature.
//  - every gift step references an existing item.
'use strict';

const fs = require('fs');
const path = require('path');

global.window = {};
require('../js/data.js');
require('../js/maps.js');
require('../js/items.js');
require('../js/story_encounters.js');

const { ENCOUNTERS, STORY_CHARACTERS } = window.PR_STORY_ENCOUNTERS;
const { MAPS, TILE_PROPS, tileAt } = window.PR_MAPS;
const CREATURES = window.PR_DATA.CREATURES;
const ITEMS = window.PR_ITEMS && window.PR_ITEMS.ITEMS;

function isWalkable(map, x, y) {
  if (y < 0 || y >= map.tiles.length) return false;
  const row = map.tiles[y];
  if (x < 0 || x >= row.length) return false;
  const props = TILE_PROPS[tileAt(map, x, y)];
  return !!props && (props.walk === true || props.walk === 'south');
}

const ROOT = path.resolve(__dirname, '..');
const STYLES = [
  { id:'gb_red', json:'atlas-gb-red.json' },
  { id:'gbc_yellow', json:'atlas-gbc-yellow.json' },
  { id:'gba_firered', json:'atlas.json' },
  { id:'ds_diamond', json:'atlas-ds-diamond.json' }
];

const errors = [];
function fail(msg) { errors.push(msg); }

let framesByStyle = null;
function atlasFrames() {
  if (framesByStyle) return framesByStyle;
  framesByStyle = [];
  for (const s of STYLES) {
    const f = path.join(ROOT, 'assets', s.json);
    if (!fs.existsSync(f)) { fail(`${s.id}: missing assets/${s.json}`); continue; }
    try {
      framesByStyle.push({ id:s.id, frames: JSON.parse(fs.readFileSync(f, 'utf8')).frames || {} });
    } catch (e) {
      fail(`${s.id}: cannot read assets/${s.json}: ${e.message}`);
    }
  }
  return framesByStyle;
}

// Unique ids.
const seen = new Set();
for (const e of ENCOUNTERS) {
  if (!e.id) { fail('encounter missing id'); continue; }
  if (seen.has(e.id)) fail(`duplicate encounter id: ${e.id}`);
  seen.add(e.id);
}

// Chain contiguity.
const chains = {};
for (const e of ENCOUNTERS) {
  if (!e.chain) continue;
  if (!chains[e.chain]) chains[e.chain] = [];
  chains[e.chain].push(e);
}
for (const cn of Object.keys(chains)) {
  const arr = chains[cn].slice().sort((a,b) => (a.chainStep|0) - (b.chainStep|0));
  for (let i = 0; i < arr.length; i++) {
    if ((arr[i].chainStep | 0) !== i) {
      fail(`chain ${cn} has missing or out-of-order step at index ${i} (${arr[i].id} step=${arr[i].chainStep})`);
      break;
    }
  }
}

// Sprites exist in all atlas styles.
const styles = atlasFrames();
for (const e of ENCOUNTERS) {
  const sprite = e.character && e.character.sprite;
  if (!sprite) { fail(`${e.id}: character.sprite missing`); continue; }
  const keys = ['down','up','left','right'].flatMap((d) => [0,1].map((f) => `${sprite}_${d}_${f}`));
  for (const s of styles) {
    for (const k of keys) {
      if (!s.frames[k]) fail(`${e.id}: sprite ${sprite} missing frame ${k} in ${s.id}`);
    }
  }
}

// Trigger references.
for (const e of ENCOUNTERS) {
  const t = e.trigger;
  if (!t || !t.type) { fail(`${e.id}: trigger missing`); continue; }
  if (t.map && !MAPS[t.map]) fail(`${e.id}: trigger.map references unknown map ${t.map}`);
  if (t.species && !CREATURES[t.species]) fail(`${e.id}: trigger.species references unknown species ${t.species}`);
}

// Gift items.
for (const e of ENCOUNTERS) {
  for (const step of (e.scene || [])) {
    if (step.kind === 'gift' && step.item && ITEMS && !ITEMS[step.item]) {
      fail(`${e.id}: gift item ${step.item} not found`);
    }
    if (step.kind === 'choice' && step.options) {
      for (const opt of step.options) {
        if (opt && opt.gift && opt.gift.item && ITEMS && !ITEMS[opt.gift.item]) {
          fail(`${e.id}: choice gift item ${opt.gift.item} not found`);
        }
      }
    }
  }
}

// Story home characters: home tile walkable, sprite frames present in
// every atlas style, every phase has at least one `first` source, phases
// are in sensible order (no duplicate ids).
const charSeen = new Set();
for (const c of STORY_CHARACTERS || []) {
  if (!c.id) { fail('story character missing id'); continue; }
  if (charSeen.has(c.id)) fail(`duplicate story character id: ${c.id}`);
  charSeen.add(c.id);
  if (!c.name) fail(`${c.id}: name missing`);
  if (!c.sprite) fail(`${c.id}: sprite missing`);
  if (!c.home || typeof c.home.map !== 'string') {
    fail(`${c.id}: home.map missing`); continue;
  }
  const map = MAPS[c.home.map];
  if (!map) { fail(`${c.id}: home.map ${c.home.map} not found`); continue; }
  if (!isWalkable(map, c.home.x | 0, c.home.y | 0)) {
    const code = map.tiles[c.home.y] ? map.tiles[c.home.y][c.home.x] : '?';
    fail(`${c.id}: home tile ${c.home.x},${c.home.y} on ${c.home.map} is not walkable (tile=${JSON.stringify(code)})`);
  }
  // Sprite frames in every atlas style.
  if (c.sprite) {
    const keys = ['down','up','left','right'].flatMap((d) => [0,1].map((f) => `${c.sprite}_${d}_${f}`));
    for (const s of styles) {
      for (const k of keys) {
        if (!s.frames[k]) fail(`${c.id}: sprite ${c.sprite} missing frame ${k} in ${s.id}`);
      }
    }
  }
  // Each phase must have at least one source of "first" lines (either
  // `first` array or `firstFn` function). idle entries should be arrays
  // of arrays (the rotation buckets) — sanity-check that.
  if (!Array.isArray(c.phases) || !c.phases.length) {
    fail(`${c.id}: no phases defined`); continue;
  }
  for (let i = 0; i < c.phases.length; i++) {
    const p = c.phases[i];
    const hasFirst = (Array.isArray(p.first) && p.first.length) || typeof p.firstFn === 'function';
    if (!hasFirst) fail(`${c.id} phase ${i}: needs `+'`first` array or `firstFn` function');
    if (p.idle && !Array.isArray(p.idle)) fail(`${c.id} phase ${i}: idle must be an array`);
    if (p.idle) {
      for (let j = 0; j < p.idle.length; j++) {
        if (!Array.isArray(p.idle[j])) fail(`${c.id} phase ${i} idle[${j}]: must be a string[]`);
      }
    }
  }
}

if (errors.length) {
  for (const m of errors) console.error(m);
  console.error(`\nFAIL: ${errors.length} story encounter issues`);
  process.exit(1);
}

console.log(`validated ${ENCOUNTERS.length} encounters across ${Object.keys(chains).length} chains`);
console.log(`validated ${(STORY_CHARACTERS || []).length} home characters`);
