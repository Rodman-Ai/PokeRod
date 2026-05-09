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

const { ENCOUNTERS } = window.PR_STORY_ENCOUNTERS;
const { MAPS } = window.PR_MAPS;
const CREATURES = window.PR_DATA.CREATURES;
const ITEMS = window.PR_ITEMS && window.PR_ITEMS.ITEMS;

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

if (errors.length) {
  for (const m of errors) console.error(m);
  console.error(`\nFAIL: ${errors.length} story encounter issues`);
  process.exit(1);
}

console.log(`validated ${ENCOUNTERS.length} encounters across ${Object.keys(chains).length} chains`);
