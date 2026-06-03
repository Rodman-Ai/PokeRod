'use strict';

const fs = require('fs');
const path = require('path');

global.window = {};
require('../js/data.js');
require('../js/maps.js');
require('../js/items.js');

const { MAPS, TILE_PROPS, tileAt } = window.PR_MAPS;
const CREATURES = window.PR_DATA.CREATURES;

// Routes may have varied dimensions (each one designed to fit its theme),
// but still need to be at least 24x18 so the camera/HUD fits, and use width
// 48 so city <-> route x coordinates line up. Cities stay locked at 44x34.
const REQUIRED_ROUTES = [
  'route1','route2','pebblewood','glimcavern','frostpeak',
  'searoute','mountain','beach','desert'
];
const ROUTE_REQUIRED_W = 48;
const ROUTE_MIN_H = 18;
const REQUIRED_44x34 = [
  'rodport','brindale','woodfall','crestrock','frostmere',
  'harborside','summitvale'
];
const ROOT = path.resolve(__dirname, '..');
const ATLAS_STYLES = [
  { id:'gb_red', json:'atlas-gb-red.json' },
  { id:'gbc_yellow', json:'atlas-gbc-yellow.json' },
  { id:'gba_firered', json:'atlas.json' },
  { id:'ds_diamond', json:'atlas-ds-diamond.json' }
];

const errors = [];
let atlasFramesByStyle = null;

function fail(msg) {
  errors.push(msg);
}

function atlasFrames() {
  if (atlasFramesByStyle) return atlasFramesByStyle;
  atlasFramesByStyle = [];
  for (const style of ATLAS_STYLES) {
    const file = path.join(ROOT, 'assets', style.json);
    if (!fs.existsSync(file)) {
      fail(`${style.id}: missing assets/${style.json}`);
      continue;
    }
    try {
      const atlas = JSON.parse(fs.readFileSync(file, 'utf8'));
      atlasFramesByStyle.push({ id:style.id, frames:atlas.frames || {} });
    } catch (err) {
      fail(`${style.id}: cannot read assets/${style.json}: ${err.message}`);
    }
  }
  return atlasFramesByStyle;
}

function dims(map) {
  return { w: map.tiles[0].length, h: map.tiles.length };
}

function inBounds(map, x, y) {
  const d = dims(map);
  return x >= 0 && y >= 0 && x < d.w && y < d.h;
}

function isWalkable(map, x, y) {
  if (!inBounds(map, x, y)) return false;
  const props = TILE_PROPS[tileAt(map, x, y)];
  return !!props && (props.walk === true || props.walk === 'south' || props.edge);
}

// Tree-tile chars whose name is one of the canopy types. A decoration
// landing on any of these reads as "stuck inside a tree" - that's the
// concrete bug this validator now catches.
const TREE_TILES = (function() {
  const out = new Set();
  for (const ch of Object.keys(TILE_PROPS)) {
    const name = TILE_PROPS[ch] && TILE_PROPS[ch].name;
    if (!name) continue;
    if (name === 'tree' || name === 'oak' || name === 'palm' ||
        name === 'cherry' || name === 'deadtree' || name === 'snowypine' ||
        name === 'birch' || name === 'mushroomtree' || name === 'willow' ||
        name === 'autumntree' || name === 'ancienttree') out.add(ch);
  }
  return out;
})();
function isOnTree(map, x, y) {
  if (!inBounds(map, x, y)) return false;
  return TREE_TILES.has(tileAt(map, x, y));
}

function validateEncounterList(mapId, label, list) {
  if (!Array.isArray(list)) return;
  for (const e of list) {
    if (!e || !e.species || !CREATURES[e.species]) {
      fail(`${mapId}: ${label} references unknown species ${e && e.species}`);
      continue;
    }
    if ((e.weight | 0) <= 0) fail(`${mapId}: ${label} ${e.species} has non-positive weight`);
    if ((e.minL | 0) < 1 || (e.maxL | 0) < (e.minL | 0)) {
      fail(`${mapId}: ${label} ${e.species} has invalid level range`);
    }
  }
}

function validateTrainerTeam(mapId, npc) {
  if (!npc.trainer) return;
  const team = npc.trainer.team;
  if (!Array.isArray(team) || !team.length) {
    fail(`${mapId}: trainer ${npc.name || npc.sprite} has missing team`);
    return;
  }
  for (let i = 0; i < team.length; i++) {
    const entry = team[i];
    if (!Array.isArray(entry) || entry.length < 2) {
      fail(`${mapId}: trainer ${npc.name || npc.sprite} team slot ${i} is invalid`);
      continue;
    }
    const species = entry[0];
    const level = entry[1] | 0;
    if (!CREATURES[species]) fail(`${mapId}: trainer ${npc.name || npc.sprite} references unknown species ${species}`);
    if (level < 1) fail(`${mapId}: trainer ${npc.name || npc.sprite} has invalid level ${level}`);
  }
}

function validateNpcSprite(mapId, npc) {
  if (!npc.sprite) return;
  const framesByStyle = atlasFrames();
  const keys = npc.sprite === 'ball'
    ? ['ball']
    : ['down','up','left','right'].flatMap((dir) => [0,1].map((f) => `${npc.sprite}_${dir}_${f}`));
  for (const style of framesByStyle) {
    for (const key of keys) {
      if (!style.frames[key]) fail(`${mapId}: sprite ${npc.sprite} is missing atlas frame ${key} in ${style.id}`);
    }
  }
}

function edgeCoord(edge, side) {
  if (side === 'north' || side === 'south') return edge.y;
  return edge.x !== undefined ? edge.x : edge.y;
}

function edgeTiles(map, side, edge) {
  const out = [];
  const d = dims(map);
  const c = edgeCoord(edge, side);
  if (side === 'north' || side === 'south') {
    for (let x = 0; x < d.w; x++) {
      if (isWalkable(map, x, c)) out.push([x, c]);
    }
  } else {
    for (let y = 0; y < d.h; y++) {
      if (isWalkable(map, c, y)) out.push([c, y]);
    }
  }
  return out;
}

function reachable(map, start) {
  const seen = new Set();
  const q = [start];
  seen.add(start.join(','));
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x + dx, ny = y + dy;
      const key = nx + ',' + ny;
      if (seen.has(key) || !isWalkable(map, nx, ny)) continue;
      seen.add(key);
      q.push([nx, ny]);
    }
  }
  return seen;
}

for (const [id, map] of Object.entries(MAPS)) {
  if (!map.tiles || !map.tiles.length) {
    fail(`${id}: missing tiles`);
    continue;
  }
  const d = dims(map);
  for (let y = 0; y < map.tiles.length; y++) {
    if (map.tiles[y].length !== d.w) fail(`${id}: row ${y} is ${map.tiles[y].length}, expected ${d.w}`);
    for (let x = 0; x < map.tiles[y].length; x++) {
      const code = map.tiles[y][x];
      if (!TILE_PROPS[code]) fail(`${id}: unknown tile ${JSON.stringify(code)} at ${x},${y}`);
    }
  }
  if (REQUIRED_ROUTES.includes(id) && (d.w !== ROUTE_REQUIRED_W || d.h < ROUTE_MIN_H)) {
    fail(`${id}: expected ${ROUTE_REQUIRED_W}x>=${ROUTE_MIN_H}, got ${d.w}x${d.h}`);
  }
  if (REQUIRED_44x34.includes(id) && (d.w !== 44 || d.h !== 34)) {
    fail(`${id}: expected 44x34, got ${d.w}x${d.h}`);
  }
  if (!Array.isArray(map.tags) || !map.tags.length) {
    fail(`${id}: missing map tags`);
  }

  const anchors = [];
  if (map.edges) {
    for (const [side, edge] of Object.entries(map.edges)) {
      if (!MAPS[edge.to]) fail(`${id}: ${side} edge targets missing map ${edge.to}`);
      const tiles = edgeTiles(map, side, edge);
      if (!tiles.length) fail(`${id}: ${side} edge has no walkable source tiles`);
      anchors.push(...tiles);
      const target = MAPS[edge.to];
      if (target && !isWalkable(target, edge.tx, edge.ty)) {
        fail(`${id}: ${side} edge arrives at non-walkable ${edge.to} ${edge.tx},${edge.ty}`);
      }
    }
  }
  if (map.doors) {
    for (const [key, door] of Object.entries(map.doors)) {
      const [x, y] = key.split(',').map(Number);
      if (!inBounds(map, x, y)) fail(`${id}: door ${key} out of bounds`);
      else if (!isWalkable(map, x, y)) fail(`${id}: door ${key} is not walkable`);
      anchors.push([x, y]);
      const target = MAPS[door.to];
      if (!target) fail(`${id}: door ${key} targets missing map ${door.to}`);
      else if (!isWalkable(target, door.x, door.y)) fail(`${id}: door ${key} arrives at non-walkable ${door.to} ${door.x},${door.y}`);
    }
  }
  if (map.hidden) {
    for (const key of Object.keys(map.hidden)) {
      const [x, y] = key.split(',').map(Number);
      if (!inBounds(map, x, y)) fail(`${id}: hidden item ${key} out of bounds`);
      else if (!isWalkable(map, x, y)) fail(`${id}: hidden item ${key} is not walkable`);
      const itemId = map.hidden[key] && map.hidden[key].item;
      if (!itemId || !window.PR_ITEMS.ITEMS[itemId]) fail(`${id}: hidden item ${key} references unknown item ${itemId}`);
      anchors.push([x, y]);
    }
  }
  // hiddenItems is the newer single-string pickup dict (drop 4): an
  // 'x,y' key maps directly to an item id. Same checks as hidden.
  if (map.hiddenItems) {
    for (const key of Object.keys(map.hiddenItems)) {
      const [x, y] = key.split(',').map(Number);
      if (!inBounds(map, x, y)) fail(`${id}: hiddenItems ${key} out of bounds`);
      else if (!isWalkable(map, x, y)) fail(`${id}: hiddenItems ${key} is not walkable`);
      const itemId = map.hiddenItems[key];
      if (!itemId || !window.PR_ITEMS.ITEMS[itemId]) fail(`${id}: hiddenItems ${key} references unknown item ${itemId}`);
      anchors.push([x, y]);
    }
  }
  // Decorations sitting on tree tiles read as "stuck inside the
  // foliage" - the bug class that prompted this check.
  if (map.decorations) {
    for (const d of map.decorations) {
      if (!d || typeof d.x !== 'number' || typeof d.y !== 'number') continue;
      if (!inBounds(map, d.x, d.y)) {
        fail(`${id}: decoration ${d.key || '?'} out of bounds at ${d.x},${d.y}`);
      } else if (isOnTree(map, d.x, d.y)) {
        fail(`${id}: decoration ${d.key || '?'} sits on a tree tile at ${d.x},${d.y}`);
      }
    }
  }
  validateEncounterList(id, 'encounters', map.encounters);
  if (map.encounterZones) {
    if (!Array.isArray(map.encounterZones)) fail(`${id}: encounterZones must be an array`);
    else {
      for (let i = 0; i < map.encounterZones.length; i++) {
        const z = map.encounterZones[i];
        if (!inBounds(map, z.x | 0, z.y | 0)) fail(`${id}: encounter zone ${i} starts out of bounds`);
        if ((z.w | 0) <= 0 || (z.h | 0) <= 0) fail(`${id}: encounter zone ${i} has invalid size`);
        if (!inBounds(map, (z.x | 0) + (z.w | 0) - 1, (z.y | 0) + (z.h | 0) - 1)) {
          fail(`${id}: encounter zone ${i} extends out of bounds`);
        }
        validateEncounterList(id, `encounter zone ${i}`, z.encounters);
      }
    }
  }
  if (map.signs) {
    for (const key of Object.keys(map.signs)) {
      const [x, y] = key.split(',').map(Number);
      if (!inBounds(map, x, y)) fail(`${id}: sign ${key} out of bounds`);
    }
  }
  if (map.npcs) {
    for (const npc of map.npcs) {
      if (!inBounds(map, npc.x, npc.y)) fail(`${id}: npc ${npc.name || npc.sprite} out of bounds at ${npc.x},${npc.y}`);
      // No NPC should ever be embedded in a tree canopy - shop/nurse
      // NPCs legitimately stand on counter / healer tiles, but never
      // on trees. (Walls aren't flagged here: a few NPCs are drawn
      // flush against a wall tile by design.)
      else if (isOnTree(map, npc.x, npc.y)) fail(`${id}: npc ${npc.name || npc.sprite} sits in a tree at ${npc.x},${npc.y}`);
      validateNpcSprite(id, npc);
      validateTrainerTeam(id, npc);
      if (npc.trainer && !npc.gym) {
        if (!isWalkable(map, npc.x, npc.y)) fail(`${id}: trainer ${npc.name || npc.sprite} is not on a walkable tile at ${npc.x},${npc.y}`);
        else anchors.push([npc.x, npc.y]);
      }
    }
  }

  if (anchors.length > 1) {
    const start = anchors.find(([x, y]) => isWalkable(map, x, y));
    if (start) {
      const seen = reachable(map, start);
      for (const [x, y] of anchors) {
        if (isWalkable(map, x, y) && !seen.has(x + ',' + y)) {
          fail(`${id}: anchor ${x},${y} is not reachable from ${start.join(',')}`);
        }
      }
    }
  }
}

// Plain-NPC sprite keys must have an archetype mapping in
// js/npc_chatter.js so handleNpcInteract's rotating banter pool picks
// up the right voice. NPCs with a special role (trainer / shop /
// healer / starter / gate / story home) are excluded — they bypass the
// rotation. Missing sprite keys silently fall back to the 'townie'
// pool, which is fine; we just want a heads-up so a new sprite gets a
// proper archetype assignment in the same PR.
const SPRITE_TO_ARCHETYPE = (function() {
  const src = require('fs').readFileSync(
    require('path').join(__dirname, '..', 'js', 'npc_chatter.js'), 'utf8'
  );
  const m = src.match(/const SPRITE_TO_ARCHETYPE = \{([\s\S]*?)\};/);
  if (!m) return {};
  const out = {};
  for (const part of m[1].split(',')) {
    const kv = part.match(/([a-zA-Z_]+)\s*:\s*'([a-zA-Z]+)'/);
    if (kv) out[kv[1]] = kv[2];
  }
  return out;
})();
const archetypeWarnings = new Set();
for (const id of Object.keys(MAPS)) {
  const map = MAPS[id];
  if (!map.npcs) continue;
  for (const npc of map.npcs) {
    if (!npc.sprite) continue;
    if (npc.trainer || npc.shop || npc.healer || npc.starter ||
        npc.ballSlot !== undefined || npc.gate || npc.storyId) continue;
    if (npc.archetype) continue;
    if (!SPRITE_TO_ARCHETYPE[npc.sprite]) archetypeWarnings.add(npc.sprite);
  }
}
if (archetypeWarnings.size) {
  console.warn('warn: sprite keys without archetype mapping (will fall back to townie):',
    Array.from(archetypeWarnings).sort().join(', '));
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`validated ${Object.keys(MAPS).length} maps`);
