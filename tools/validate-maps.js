'use strict';

global.window = {};
require('../js/data.js');
require('../js/maps.js');
require('../js/items.js');

const { MAPS, TILE_PROPS, tileAt } = window.PR_MAPS;
const CREATURES = window.PR_DATA.CREATURES;

const REQUIRED_48x38 = [
  'route1','route2','pebblewood','glimcavern','frostpeak',
  'searoute','mountain','beach','desert'
];
const REQUIRED_44x34 = [
  'rodport','brindale','woodfall','crestrock','frostmere',
  'harborside','summitvale'
];

const errors = [];

function fail(msg) {
  errors.push(msg);
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
  if (REQUIRED_48x38.includes(id) && (d.w !== 48 || d.h !== 38)) {
    fail(`${id}: expected 48x38, got ${d.w}x${d.h}`);
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

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`validated ${Object.keys(MAPS).length} maps`);
