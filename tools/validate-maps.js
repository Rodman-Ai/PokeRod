'use strict';

global.window = {};
require('../js/maps.js');

const { MAPS, TILE_PROPS, tileAt } = window.PR_MAPS;

const REQUIRED_34x28 = [
  'route1','route2','pebblewood','glimcavern','frostpeak',
  'searoute','mountain','beach','desert'
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
  if (REQUIRED_34x28.includes(id) && (d.w !== 34 || d.h !== 28)) {
    fail(`${id}: expected 34x28, got ${d.w}x${d.h}`);
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
      anchors.push([x, y]);
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
