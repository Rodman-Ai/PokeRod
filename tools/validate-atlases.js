// Validate that every graphics preset atlas has matching frame keys,
// complete tile-code coverage, and usable variant metadata.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const STYLES = [
  { id:'gb_red', label:'GB RED', image:'atlas-gb-red.png', json:'atlas-gb-red.json' },
  { id:'gbc_yellow', label:'GBC YELLOW', image:'atlas-gbc-yellow.png', json:'atlas-gbc-yellow.json' },
  { id:'gba_firered', label:'GBA FIRERED', image:'atlas.png', json:'atlas.json' },
  { id:'ds_diamond', label:'DS DIAMOND', image:'atlas-ds-diamond.png', json:'atlas-ds-diamond.json' }
];

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
}

const context = { window:{}, console };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/maps.js'), 'utf8'), context);
const tileCodes = Object.keys(context.window.PR_MAPS.TILE_PROPS);

let baselineKeys = null;
let checked = 0;

for (const style of STYLES) {
  const imagePath = path.join(ROOT, 'assets', style.image);
  const jsonPath = path.join(ROOT, 'assets', style.json);
  if (!fs.existsSync(imagePath)) fail(`${style.id}: missing assets/${style.image}`);
  if (!fs.existsSync(jsonPath)) fail(`${style.id}: missing assets/${style.json}`);
  if (!fs.existsSync(jsonPath)) continue;

  const atlas = readJson(path.join('assets', style.json));
  const frames = atlas.frames || {};
  const frameKeys = Object.keys(frames).sort();
  if (!baselineKeys) baselineKeys = frameKeys;
  else if (baselineKeys.join('\n') !== frameKeys.join('\n')) {
    fail(`${style.id}: frame keys differ from GBA baseline`);
  }

  const codeMap = atlas.tile_code_to_key || {};
  const missingCodes = tileCodes.filter((code) => !codeMap[code]);
  if (missingCodes.length) fail(`${style.id}: missing tile codes ${JSON.stringify(missingCodes)}`);
  for (const [code, key] of Object.entries(codeMap)) {
    if (!frames[key]) fail(`${style.id}: tile ${JSON.stringify(code)} references missing frame ${key}`);
  }

  const variants = atlas.tile_variants || {};
  for (const [code, meta] of Object.entries(variants)) {
    for (const key of meta.random || []) {
      if (!frames[key]) fail(`${style.id}: random variant for ${JSON.stringify(code)} references missing frame ${key}`);
    }
    for (const [name, key] of Object.entries(meta.context || {})) {
      if (!frames[key]) fail(`${style.id}: context variant ${name} for ${JSON.stringify(code)} references missing frame ${key}`);
    }
  }

  if (!atlas.style || atlas.style.id !== style.id) fail(`${style.id}: missing or incorrect style metadata`);
  if (atlas.image !== style.image) fail(`${style.id}: image metadata should be ${style.image}, got ${atlas.image}`);
  checked++;
}

if (!process.exitCode) console.log(`validated ${checked} atlas styles with ${tileCodes.length} tile codes`);
