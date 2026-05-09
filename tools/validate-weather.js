// Weather validator. Walks every map; if map.weather is set, confirm
// PR_WEATHER.parseWeather() returns a non-null normalised triple.
// Catches typos like weather:'sno' or weather:'medium-snw'.
'use strict';

global.window = {};
global.performance = { now: () => 0 };

require('../js/data.js');
require('../js/maps.js');
// The weather parser is exposed on window.PR_WEATHER from world.js, but
// world.js is too DOM-coupled to require directly. Inline the same
// preset table here so the validator stays standalone. Keep this list
// in sync with the table in js/world.js.
const PRESETS = new Set([
  'rain','light-rain','medium-rain','heavy-rain','sleet',
  'light-snow','medium-snow','blizzard',
  'hail','thunder','tornado','hurricane','overcast'
]);
const KINDS = new Set([
  'rain','sleet','snow','hail','thunder','tornado','hurricane','overcast'
]);

const errors = [];
function fail(msg) { errors.push(msg); }

const MAPS = window.PR_MAPS && window.PR_MAPS.MAPS;
if (!MAPS) {
  console.error('PR_MAPS missing');
  process.exit(1);
}

let total = 0, withWeather = 0;
const byKind = {};
for (const id of Object.keys(MAPS)) {
  total++;
  const m = MAPS[id];
  const w = m.weather;
  if (w == null) continue;
  withWeather++;
  let kind = null;
  if (typeof w === 'string') {
    if (!PRESETS.has(w)) {
      fail(`map ${id}: unknown weather preset '${w}' (allowed: ${Array.from(PRESETS).join(', ')})`);
      continue;
    }
    // Map preset → kind for the per-kind report.
    if (w === 'rain' || w.endsWith('-rain')) kind = 'rain';
    else if (w === 'sleet') kind = 'sleet';
    else if (w === 'blizzard' || w.endsWith('-snow')) kind = 'snow';
    else kind = w;
  } else if (typeof w === 'object' && w.kind) {
    if (!KINDS.has(w.kind)) {
      fail(`map ${id}: unknown weather kind '${w.kind}' (allowed: ${Array.from(KINDS).join(', ')})`);
      continue;
    }
    kind = w.kind;
  } else {
    fail(`map ${id}: weather must be a string or {kind,intensity,wind} object (got ${typeof w})`);
    continue;
  }
  // Interior maps with weather are nonsense — render path skips them.
  if (m.interior) {
    fail(`map ${id}: weather set on interior map (no effect; render path skips interiors)`);
    continue;
  }
  byKind[kind] = (byKind[kind] || 0) + 1;
}

if (errors.length) {
  for (const e of errors) console.error(e);
  console.error(`\nFAIL: ${errors.length} weather issues across ${total} maps`);
  process.exit(1);
}

const dist = Object.keys(byKind).sort().map(k => `${k}:${byKind[k]}`).join(' ');
console.log(`validated weather on ${withWeather}/${total} maps (${dist || 'none'})`);
