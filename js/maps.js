// Map data. Tile codes:
// '.' grass walkable, ',' path, ':' tall grass (encounter), 'T' tree (block),
// 'W' water (block), 'R' house roof (block), 'B' wall (block), 'D' door,
// 'P' center roof (block), 'M' mart roof (block), 'F' floor, 'S' sign,
// 'C' counter (block), 'H' healer counter (block, interact heals), 'L' ledge (jump south),
// 'X' exit edge (transition), 'r' rug (walkable, decorative), 's' sand (walkable)
'use strict';

const TILE_PROPS = {
  '.': { walk:true, name:'grass' },
  ',': { walk:true, name:'path' },
  ':': { walk:true, encounter:true, name:'tallgrass' },
  's': { walk:true, name:'sand' },
  'r': { walk:true, name:'rug' },
  'F': { walk:true, name:'floor' },
  // Trees (always block).
  'T': { walk:false, name:'tree' },
  'Y': { walk:false, name:'oak' },
  'O': { walk:false, name:'palm' },
  'K': { walk:false, name:'cherry' },
  'J': { walk:false, name:'deadtree' },
  'Q': { walk:false, name:'snowypine' },
  'N': { walk:false, name:'birch' },
  'U': { walk:false, name:'mushroomtree' },
  'V': { walk:false, name:'willow' },
  'E': { walk:false, name:'autumntree' },
  'G': { walk:false, name:'ancienttree' },
  // Small bushes (walkable - player steps over them).
  'b': { walk:true, name:'bush' },
  'c': { walk:true, name:'flowerbush' },
  'e': { walk:true, name:'berrybush' },
  'j': { walk:true, name:'autumnbush' },
  'k': { walk:true, name:'snowybush' },
  'l': { walk:true, name:'blueflowerbush' },
  'm': { walk:true, name:'purpleflowerbush' },
  // Large / hostile foliage (block).
  'g': { walk:false, name:'thornbush' },
  'h': { walk:false, name:'hedge' },
  'n': { walk:true, name:'thorncluster' },
  '1': { walk:true, name:'flowergrass' },
  '2': { walk:true, name:'lightgrass' },
  '3': { walk:true, name:'drygrass' },
  '4': { walk:true, name:'lushgrass' },
  'W': { walk:false, name:'water' },
  'R': { walk:false, name:'roof' },
  'B': { walk:false, name:'wall' },
  'P': { walk:false, name:'center' },
  'M': { walk:false, name:'mart' },
  'C': { walk:false, name:'counter' },
  'H': { walk:false, name:'healer', interact:'heal' },
  'S': { walk:false, name:'sign', interact:'sign' },
  'L': { walk:'south', name:'ledge' },
  'D': { walk:true, door:true, name:'door' },
  'X': { walk:true, edge:true, name:'edge' },
  // House roofs (8) - all block.
  '+': { walk:false, name:'roof_blue' },
  '-': { walk:false, name:'roof_thatched' },
  '=': { walk:false, name:'roof_terracotta' },
  '*': { walk:false, name:'roof_dome' },
  '%': { walk:false, name:'roof_snow' },
  '&': { walk:false, name:'roof_slate' },
  '7': { walk:false, name:'roof_moss' },
  '8': { walk:false, name:'roof_leaf' },
  // House walls (6) - all block.
  '#': { walk:false, name:'wall_stone' },
  '@': { walk:false, name:'wall_timber' },
  '$': { walk:false, name:'wall_brick' },
  '?': { walk:false, name:'wall_log' },
  '!': { walk:false, name:'wall_white' },
  '0': { walk:false, name:'wall_lattice' },
  // Doors / windows / chimneys.
  'd': { walk:true, door:true, name:'door_blue' },
  'f': { walk:true, door:true, name:'door_shop' },
  '[': { walk:false, name:'window_left' },
  ']': { walk:false, name:'window_right' },
  '(': { walk:true,  name:'small_rock' },
  ')': { walk:false, name:'large_rock' },
  // Paths (20) - all walkable.
  '_': { walk:true, name:'path_cobble' },
  '^': { walk:true, name:'path_dirt' },
  'o': { walk:true, name:'path_stepstone' },
  ';': { walk:true, name:'path_gravel' },
  'i': { walk:true, name:'path_redbrick' },
  'p': { walk:true, name:'path_park' },
  'q': { walk:true, name:'path_mosaic' },
  't': { walk:true, name:'path_boardwalk' },
  'u': { walk:true, name:'path_sand' },
  'v': { walk:true, name:'path_rocky' },
  'w': { walk:true, name:'path_wetstone' },
  'x': { walk:true, name:'path_crossroads' },
  'y': { walk:true, name:'path_yellowbrick' },
  'z': { walk:true, name:'path_moss' },
  'a': { walk:true, name:'path_autumn' },
  'A': { walk:true, name:'path_bridge' },
  'Z': { walk:true, name:'path_zen' },
  'I': { walk:true, name:'path_lantern' },
  '5': { walk:true, name:'path_desert' },
  '6': { walk:true, name:'path_snow' },
  // Small street furniture (walkable - player squeezes past).
  '<': { walk:true, name:'bench' },
  '|': { walk:true, name:'streetlamp' },
  '~': { walk:true, name:'hydrant' },
  '{': { walk:true, name:'flowerpot' },
  "'": { walk:true, name:'gardenbed' },
  '\\': { walk:true, name:'mailbox' },
  // Real obstacles / interior fixtures (block).
  '>': { walk:false, name:'shelf' },
  '`': { walk:false, name:'fence_h' },
  '"': { walk:false, name:'fence_v' },
  '/': { walk:false, name:'pc_terminal', interact:'pc' },
  '9': { walk:false, name:'vending' },
  '}': { walk:false, name:'pottedplant' }
};

function tileAt(map, x, y) {
  if (y < 0 || y >= map.tiles.length) return 'T';
  const row = map.tiles[y];
  if (x < 0 || x >= row.length) return 'T';
  return row[x];
}

const OUTDOOR_W = 48;
const OUTDOOR_H = 38;
const CITY_W = 44;
const CITY_H = 34;

function makeGrid(w, h, fill) {
  const rows = [];
  for (let y = 0; y < h; y++) {
    rows.push(Array(w).fill(fill));
  }
  return rows;
}

function putTile(grid, x, y, code) {
  if (y < 0 || y >= grid.length) return;
  if (x < 0 || x >= grid[y].length) return;
  grid[y][x] = code;
}

function carveBrush(grid, x, y, code, radius) {
  radius = radius || 0;
  for (let yy = y - radius; yy <= y + radius; yy++) {
    for (let xx = x - radius; xx <= x + radius; xx++) {
      putTile(grid, xx, yy, code);
    }
  }
}

function carveSegment(grid, a, b, code, radius) {
  let x = a[0], y = a[1];
  carveBrush(grid, x, y, code, radius);
  while (x !== b[0] || y !== b[1]) {
    if (x !== b[0]) x += x < b[0] ? 1 : -1;
    else if (y !== b[1]) y += y < b[1] ? 1 : -1;
    carveBrush(grid, x, y, code, radius);
  }
}

function carvePath(grid, points, code, radius) {
  for (let i = 1; i < points.length; i++) {
    carveSegment(grid, points[i - 1], points[i], code, radius);
  }
}

function carveRect(grid, x, y, w, h, code) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) putTile(grid, xx, yy, code);
  }
}

function scatterTiles(grid, cfg) {
  if (!cfg || !cfg.codes || !cfg.codes.length) return;
  const seed = cfg.seed || 0;
  const fill = cfg.on;
  for (let y = 1; y < grid.length - 1; y++) {
    for (let x = 1; x < grid[y].length - 1; x++) {
      if (fill && grid[y][x] !== fill) continue;
      const n = (x * 19 + y * 31 + seed) % (cfg.rate || 23);
      if (n === 0) grid[y][x] = cfg.codes[(x + y + seed) % cfg.codes.length];
    }
  }
}

function makeWindingTiles(cfg) {
  const w = cfg.w || OUTDOOR_W;
  const h = cfg.h || OUTDOOR_H;
  const grid = makeGrid(w, h, cfg.fill);
  carvePath(grid, cfg.path, cfg.pathCode || ',', cfg.pathRadius || 0);
  if (cfg.branches) {
    for (const branch of cfg.branches) {
      carvePath(grid, branch.points, branch.code || cfg.pathCode || ',', branch.radius || 0);
    }
  }
  if (cfg.pockets) {
    for (const p of cfg.pockets) carveRect(grid, p.x, p.y, p.w, p.h, p.code || ':');
  }
  if (cfg.rects) {
    for (const r of cfg.rects) carveRect(grid, r.x, r.y, r.w, r.h, r.code);
  }
  if (cfg.decor) {
    for (const d of cfg.decor) scatterTiles(grid, d);
  }
  if (cfg.tiles) {
    for (const t of cfg.tiles) putTile(grid, t.x, t.y, t.code);
  }
  if (cfg.doors) {
    for (const d of cfg.doors) putTile(grid, d.x, d.y, d.code || 'D');
  }
  return grid.map(row => row.join(''));
}

function stampBuilding(grid, b, pathCode, hub) {
  const x = b.x, y = b.y, w = b.w || 7;
  const roof = b.roof || '+';
  const wall = b.wall || '#';
  const doorOffset = Math.max(1, Math.min(w - 2, b.doorOffset == null ? Math.floor(w / 2) : b.doorOffset));
  const doorX = x + doorOffset;
  const doorY = y + 3;
  carveRect(grid, x, y, w, 2, roof);
  carveRect(grid, x, y + 2, w, 2, wall);
  if (w >= 6) {
    putTile(grid, x + 1, y + 3, '[');
    putTile(grid, x + w - 2, y + 3, ']');
  }
  const below = Math.min(grid.length - 2, doorY + 1);
  carveSegment(grid, [doorX, below], hub || [22, 17], pathCode, 0);
  putTile(grid, doorX, doorY, b.doorTile || 'd');
  if (b.trim) putTile(grid, x + w - 1, y, b.trim);
  return { x: doorX, y: doorY };
}

function makeCityHubTiles(cfg) {
  const fill = cfg.fill || '.';
  const pathCode = cfg.pathCode || ',';
  const grid = makeGrid(CITY_W, CITY_H, fill);
  for (let x = 0; x < CITY_W; x++) {
    putTile(grid, x, 0, cfg.edges && cfg.edges.north ? 'X' : fill);
    putTile(grid, x, CITY_H - 1, cfg.edges && cfg.edges.south ? 'X' : fill);
  }
  for (let y = 0; y < CITY_H; y++) {
    putTile(grid, 0, y, cfg.edges && cfg.edges.west ? 'X' : fill);
    putTile(grid, CITY_W - 1, y, cfg.edges && cfg.edges.east ? 'X' : fill);
  }
  scatterTiles(grid, { on:fill, codes:cfg.trees || ['c','1'], rate:cfg.treeRate || 11, seed:cfg.seed || 1 });
  carvePath(grid, [[22,0],[22,5],[17,5],[17,10],[22,10],[22,33]], pathCode, 1);
  carvePath(grid, [[0,17],[8,17],[8,14],[17,14],[26,14],[26,17],[43,17]], pathCode, 1);
  carvePath(grid, [[9,29],[15,25],[22,25],[29,25],[35,29]], pathCode, 1);
  carveRect(grid, 15, 13, 14, 8, pathCode);
  carveRect(grid, 18, 22, 9, 6, cfg.plaza || pathCode);
  if (cfg.paths) {
    for (const p of cfg.paths) carvePath(grid, p.points, p.code || pathCode, p.radius || 0);
  }
  if (cfg.features) {
    for (const f of cfg.features) carveRect(grid, f.x, f.y, f.w, f.h, f.code);
  }
  const hub = cfg.hub || [22, 17];
  if (cfg.buildings) {
    for (const b of cfg.buildings) stampBuilding(grid, b, pathCode, hub);
  }
  // Keep a guaranteed civic spine through every hub even when a district
  // building sits close to the winding street plan.
  carvePath(grid, [[22,0],[22,CITY_H - 1]], pathCode, 1);
  carvePath(grid, [[0,17],[CITY_W - 1,17]], pathCode, 1);
  if (cfg.buildings) {
    for (const b of cfg.buildings) {
      const [dx, dy] = buildingDoor(b);
      putTile(grid, dx, dy, b.doorTile || 'd');
    }
  }
  if (cfg.signTiles) {
    for (const s of cfg.signTiles) putTile(grid, s.x, s.y, 'S');
  }
  if (cfg.extraTiles) {
    for (const t of cfg.extraTiles) putTile(grid, t.x, t.y, t.code);
  }
  return grid.map(row => row.join(''));
}

function buildingDoor(b) {
  const w = b.w || 7;
  const doorOffset = Math.max(1, Math.min(w - 2, b.doorOffset == null ? Math.floor(w / 2) : b.doorOffset));
  return [b.x + doorOffset, b.y + 3];
}

function cityDoors(buildings) {
  const doors = {};
  for (const b of buildings || []) {
    if (!b.to) continue;
    const [x, y] = buildingDoor(b);
    doors[x + ',' + y] = { to:b.to, x:b.tx, y:b.ty };
  }
  return doors;
}

function makeFlavorInterior(id, name, returnMap, returnX, returnY, npc) {
  return {
    id, name, interior:true, tags:['interior'],
    tiles: [
      'BBBBBBBBBBB',
      'B}FFFFFFF}B',
      'BFFFrrFFFFB',
      'BFFFrrFFFFB',
      'BF>>FFF>>FB',
      'BFFFFFFFFFB',
      'BFFFFCFFFFB',
      'B{rrrrrrr{B',
      'BBBBBDBBBBB'
    ],
    npcs: npc ? [npc] : [],
    doors: { '5,8': { to:returnMap, x:returnX, y:returnY } }
  };
}

function makeSideCave(id, name, returnMap, returnX, returnY, cfg) {
  cfg = cfg || {};
  const grid = makeGrid(30, 20, '#');
  carvePath(grid, [[14,19],[14,15],[8,15],[8,9],[16,9],[16,5],[23,5]], 's', 1);
  carvePath(grid, [[8,9],[5,9],[5,13],[11,13]], 's', 1);
  carvePath(grid, [[16,9],[22,9],[22,14],[18,14]], 's', 1);
  carveRect(grid, 4, 11, 8, 4, ':');
  carveRect(grid, 18, 12, 7, 4, ':');
  carveRect(grid, 20, 3, 6, 4, cfg.deepCode || ':');
  scatterTiles(grid, { on:'#', codes:['T',')'], rate:13, seed:cfg.seed || 5 });
  scatterTiles(grid, { on:'#', codes:['('], rate:17, seed:(cfg.seed || 5) + 3 });
  putTile(grid, 14, 19, 'D');
  if (cfg.extraTiles) {
    for (const t of cfg.extraTiles) putTile(grid, t.x, t.y, t.code);
  }
  return {
    id, name, interior:true, tags:cfg.tags || ['cave'],
    tiles: grid.map(row => row.join('')),
    npcs: cfg.npcs || [],
    encounters: cfg.encounters || [
      { species:'pebra', minL:8, maxL:12, weight:4 },
      { species:'geistmite', minL:8, maxL:12, weight:3 },
      { species:'cavewing', minL:8, maxL:12, weight:3 }
    ],
    hidden: cfg.hidden || {},
    doors: { '14,19': { to:returnMap, x:returnX, y:returnY } }
  };
}

const MAPS = {
  rodport: {
    id:'rodport', name:'Rodport Town',
    music: 'town',
    tiles: [
      'YYYYYYYYYYYYYYYYYYYY',
      'Y.K..1c....K.c1..K.Y',
      'Y..RRR..|.RRR{\\.1.cY',
      'Y..RRR....RRR......Y',
      'Y..BDB....BDB....1.Y',
      'Y..___....___......Y',
      'Y.\'_..............,Y',
      'Y..___.PPPP..<....,Y',
      'Y..,...PPPP....c..,Y',
      'Y..,...BBDB.......,Y',
      'Y..,...____..|....,Y',
      'Y..S....1.......~.,Y',
      'Y.\'.\'.............,Y',
      'Y..,..WW.....1.(..,Y',
      'Y..,..WW.)........,Y',
      ',.|,,,,,,,,,,,,,,,,Y',
      'YYYYYYY,,YYYYYYYYYYY',
      'XXXXXXX,,XXXXXXXXXXX'
    ],
    npcs: [
      { x:11, y:10, dir:'down', sprite:'npc_oak', name:'PROF. ROD',
        dialog:["Welcome to the world of POKEROD!","I'm PROF. ROD, the local researcher.","Pick a partner from the lab to begin your journey!"] },
      { x:14, y:6, dir:'down', sprite:'npc_girl', name:'LILA',
        dialog:["The tall grass north of town is full of wild creatures.","Be careful out there!"] }
    ],
    ambient: [
      { species:'nibblet',  x:8,  y:6,  range:2 },
      { species:'flitwing', x:15, y:11, range:2 },
      { species:'glimkit',  x:6,  y:12, range:2 }
    ],
    signs: {
      '3,11': "RODPORT TOWN — Where every adventure begins.",
      '1,15': "A late desert road loops back here. Come prepared.",
    },
    doors: {
      '4,4':  { to:'player_house', x:3, y:6 },
      '11,4': { to:'rival_house',  x:3, y:6 },
      '9,9':  { to:'lab',          x:5, y:8 }
    },
    edges: {
      west: { x:0, to:'desert', tx:32, ty:14,
              gate:{ minBadges:6, message:"The desert loop is too harsh without six BADGES." } },
      south: { y:17, to:'route1', tx:7, ty:1 }
    }
  },

  player_house: {
    id:'player_house', name:'Your House', interior:true,
    tiles: [
      'BBBBBBBB',
      'BFFFFFFB',
      'BFrrFFFB',
      'BFrrFFFB',
      'BFFFFFFB',
      'BFFFFFFB',
      'BBBDBBBB'
    ],
    npcs: [
      { x:5, y:2, dir:'down', sprite:'npc_mom', name:'MOM',
        dialog:["Don't forget to save before bed, dear!","Adventures are tiring - rest when you can."] }
    ],
    doors: {
      '3,6': { to:'rodport', x:4, y:5 }
    }
  },

  rival_house: {
    id:'rival_house', name:'Rival House', interior:true,
    tiles: [
      'BBBBBBBB',
      'BFFFFFFB',
      'BFFrrFFB',
      'BFFrrFFB',
      'BFFFFFFB',
      'BFFFFFFB',
      'BBBDBBBB'
    ],
    npcs: [
      { x:4, y:2, dir:'down', sprite:'npc_sis', name:'KIRA',
        dialog:["My brother BLAINE is at the lab.","He's always trying to outshine you!"] }
    ],
    doors: {
      '3,6': { to:'rodport', x:11, y:5 }
    }
  },

  lab: {
    id:'lab', name:"Prof. Rod's Lab", interior:true,
    tiles: [
      'BBBBBBBBBBB',
      'BFFFFFFFFFB',
      'BFFFFFFFFFB',
      'BCCFFFFFFFB',
      'BFFFFFFFFFB',
      'BFFFFFFFFFB',
      'BFFFFFFFFFB',
      'BFFFFFFFFFB',
      'BBBBBDBBBBB'
    ],
    npcs: [
      { x:5, y:3, dir:'down', sprite:'npc_oak', name:'PROF. ROD',
        dialog:["Ah, you're here!","On the table are three POKEROD partners.","Choose the one that calls to you!"],
        starter:true },
      { x:8, y:5, dir:'left', sprite:'npc_rival', name:'BLAINE',
        dialog:["You finally showed up!","I'll pick the one that beats yours."] },
      { x:2, y:3, dir:'down', sprite:'ball', name:'',
        dialog:["A POKEROD ball sits here..."] , ballSlot:0 },
      { x:3, y:3, dir:'down', sprite:'ball', name:'',
        dialog:["A POKEROD ball sits here..."] , ballSlot:1 }
    ],
    doors: {
      '5,8': { to:'rodport', x:9, y:10 }
    }
  },

  route1: {
    id:'route1', name:'Route 1',
    tiles: makeWindingTiles({
      fill:'Y', pathCode:',', pathRadius:1,
      path:[[7,0],[7,4],[14,4],[14,8],[9,8],[9,13],[22,13],[22,18],[16,18],[16,23],[18,23],[18,27]],
      branches:[
        { points:[[14,8],[20,8],[20,5]], radius:1 },
        { points:[[9,13],[5,13],[5,18],[11,18]], radius:1 }
      ],
      pockets:[
        { x:16, y:4, w:6, h:4, code:':' },
        { x:4, y:15, w:8, h:5, code:':' },
        { x:23, y:14, w:6, h:6, code:':' }
      ],
      decor:[
        { on:'Y', codes:['K','E'], rate:17, seed:3 },
        { on:'Y', codes:['c','e','1'], rate:11, seed:5 }
      ]
    }),
    npcs: [
      { x:5, y:8, dir:'right', sprite:'npc_youth', name:'YOUNGSTER JOE',
        dialog:["Hey, you have a POKEROD?","Let's battle!"],
        trainer: { team: [['nibblet', 4], ['flitwing', 5]], reward: 200,
                   defeat:["Aww, you got me!","I need more training."] } }
    ],
    signs: {
      '16,6': "ROUTE 1 — Tall grass hides wild creatures. Walk carefully."
    },
    encounters: [
      { species:'nibblet',     minL:2, maxL:4, weight:5 },
      { species:'flitwing',    minL:2, maxL:4, weight:4, time:['day','dawn','dusk'] },
      { species:'crawlbug',    minL:2, maxL:3, weight:3, time:['day','dawn'] },
      { species:'zapret',      minL:3, maxL:5, weight:2 },
      { species:'cinderpup',   minL:3, maxL:5, weight:2, time:['day','dusk'] },
      { species:'fernsprout',  minL:3, maxL:5, weight:2, time:['day','dawn','dusk'] },
      { species:'voltkit',     minL:3, maxL:5, weight:2 },
      { species:'bumblesting', minL:2, maxL:4, weight:3, time:['day','dusk'] },
      { species:'galewing',    minL:3, maxL:5, weight:2, time:['day','dawn','dusk'] },
      { species:'glimkit',     minL:3, maxL:5, weight:1 },
      { species:'geistmite',   minL:3, maxL:5, weight:1 }
    ],
    hidden: {
      '20,5':  { item:'rodball',    count:2 },
      '11,18': { item:'antidote',   count:1 },
      '27,18': { item:'potion',     count:1 }
    },
    edges: {
      north: { y:0,  to:'rodport',  tx:7, ty:16 },
      south: { y:27, to:'brindale', tx:7, ty:1 }
    }
  },

  brindale: {
    id:'brindale', name:'Brindale Town',
    tiles: [
      'XXXXXXX,,XXXXXXXXXXX',
      'KKKKKKK,,KKKKKKKKKKK',
      'K.K..1.,,..1.K..1c.K',
      'K..PPPP...MMMM.....K',
      'K..PPPP...MMMM.....K',
      'K..$$D$...$$D$.....K',
      'K..____...____...|.K',
      'K..,|..........<..,K',
      'K..,...--{....\'...,K',
      'K..,...---........,K',
      'K..,...$D$........,K',
      'K..,...___......~.,K',
      'K..S..,,,,,,,,,,,,,K',
      'K.\'.\'.,.....&&&.(.,K',
      'K..,..,..)..BDB...,K',
      'K.|,,,,...........,K',
      'KKKKKKK,,KKKKKKKKKKK',
      'XXXXXXX,,XXXXXXXXXXX'
    ],
    npcs: [
      { x:14, y:7, dir:'down', sprite:'npc_girl', name:'TOWNSFOLK',
        dialog:["BRINDALE TOWN!","The POKEROD CENTER on the left heals your team for free.","The MART on the right sells useful items.","The slate-roofed building south is the BRINDALE GYM."] }
    ],
    ambient: [
      { species:'glimkit',    x:8,  y:7,  range:2 },
      { species:'splashfin',  x:15, y:13, range:2 },
      { species:'nibblet',    x:5,  y:14, range:2 }
    ],
    signs: {
      '3,12': "BRINDALE TOWN - Gateway to the highlands."
    },
    doors: {
      '5,5':  { to:'pokecenter',   x:4, y:6 },
      '12,5': { to:'mart',         x:5, y:9 },
      '8,10': { to:'townhouse',    x:3, y:6 },
      '13,14':{ to:'brindale_gym', x:4, y:7 }
    },
    edges: {
      north: { y:0,  to:'route1', tx:18, ty:26 },
      south: { y:17, to:'route2', tx:7, ty:1 }
    }
  },

  brindale_gym: {
    id:'brindale_gym', name:'Brindale Gym', interior:true,
    tiles: [
      'BBBBBBBBB',
      'BFFFFFFFB',
      'BFFFFFFFB',
      'BFFCCCFFB',
      'BFFCHCFFB',
      'BFFFFFFFB',
      'BFFFFFFFB',
      'B{FFFFF{B',
      'BBBBDBBBB'
    ],
    npcs: [
      { x:4, y:4, dir:'down', sprite:'npc_old', name:'GYM LEADER WAVE',
        gym:true, badge:'WAVE',
        dialog:["I am WAVE, leader of the BRINDALE GYM.","Show me you are ready and we shall battle!"],
        trainer:{ team:[['mistfin',12],['aquapup',13]], reward:600,
                  defeat:["A fine showing! Take this WAVE BADGE."] } }
    ],
    doors: { '4,8': { to:'brindale', x:13, y:15 } }
  },


  pokecenter: {
    id:'pokecenter', name:'PokeRod Center', interior:true,
    tiles: [
      'BBBBBBBBB',
      'B}>>>>>}B',
      'BF/FF9FFB',
      'BFCCCFFFB',
      'BFCHCFFFB',
      'BFFFFFFFB',
      'B{FFFFF{B',
      'BBBBDBBBB'
    ],
    npcs: [
      { x:3, y:4, dir:'down', sprite:'nurse', name:'NURSE ROSY',
        dialog:["Welcome to the POKEROD CENTER!","Step up and I'll heal your team."],
        healer:true }
    ],
    decorations: [
      { x:5, y:5, key:'rug_round_red' },
      { x:6, y:6, key:'lamp_floor_tall' },
      { x:5, y:3, key:'wall_clock_round' },
      { x:7, y:5, key:'display_glass_case' }
    ],
    doors: {
      '4,7': { to:'brindale', x:5, y:6 }
    }
  },

  mart: {
    id:'mart', name:'PokeRod Mart', interior:true,
    tiles: [
      'BBBBBBBBBBB',
      'B>>>>>>>>>B',
      'B>>>>F>>>>B',
      'BFFFFFFFFFB',
      'BFCCCCCCCFB',
      'BFFFFFFFFFB',
      'BF>>FF>>FFB',
      'BFFFFFFFFFB',
      'BF>>FF>>FFB',
      'B{rrrrrrr{B',
      'BBBBBDBBBBB'
    ],
    npcs: [
      { x:5, y:4, dir:'down', sprite:'clerk', name:'BRINDALE MART',
        dialog:["Welcome to the BRINDALE MART!"],
        shop:{ greeting:["Welcome to the BRINDALE MART!","How can I help you?"] } }
    ],
    decorations: [
      { x:2, y:1, key:'shelf_potions' },
      { x:5, y:1, key:'shelf_pokeballs' },
      { x:8, y:1, key:'shelf_berries' },
      { x:5, y:3, key:'display_register' },
      { x:3, y:6, key:'display_basket' },
      { x:7, y:6, key:'display_souvenir' },
      { x:3, y:8, key:'shelf_clothing' },
      { x:7, y:8, key:'shelf_food' }
    ],
    doors: {
      '5,10': { to:'brindale', x:12, y:6 }
    }
  },

  townhouse: {
    id:'townhouse', name:'House', interior:true,
    tiles: [
      'BBBBBBB',
      'BFFFFFB',
      'BFrrFFB',
      'BFrrFFB',
      'BFFFFFB',
      'BFFFFFB',
      'BBBDBBB'
    ],
    npcs: [
      { x:4, y:2, dir:'down', sprite:'npc_old', name:'OLD MAN',
        dialog:["In my day, we walked uphill both ways through tall grass!","...and we liked it."] }
    ],
    doors: {
      '3,6': { to:'brindale', x:8, y:11 }
    }
  },

  route2: {
    id:'route2', name:'Route 2',
    tiles: makeWindingTiles({
      fill:'K', pathCode:',', pathRadius:1,
      path:[[7,0],[7,5],[16,5],[16,9],[11,9],[11,14],[24,14],[24,20],[18,20],[18,27]],
      branches:[
        { points:[[16,9],[23,9],[23,6],[28,6]], radius:1 },
        { points:[[11,14],[6,14],[6,20],[12,20]], radius:1 }
      ],
      pockets:[
        { x:19, y:5, w:8, h:4, code:':' },
        { x:5, y:16, w:9, h:5, code:':' },
        { x:23, y:21, w:7, h:4, code:':' }
      ],
      decor:[
        { on:'K', codes:['m','c','1'], rate:10, seed:7 },
        { on:'K', codes:['E'], rate:19, seed:2 }
      ]
    }),
    npcs: [
      { x:6, y:8, dir:'right', sprite:'npc_youth', name:'CAMPER MEL',
        dialog:["Heading north already?","Not before you battle me!"],
        trainer: { team:[['cinderpup',6],['fernsprout',6]], reward:280,
                   defeat:["Whew, you're tough.","Good luck up the path!"] } }
    ],
    signs: {
      '16,4': "ROUTE 2 - The grass thickens. Keep your team ready."
    },
    encounters: [
      { species:'flitwing',    minL:4, maxL:7, weight:4 },
      { species:'nibblet',     minL:4, maxL:7, weight:4 },
      { species:'cinderpup',   minL:5, maxL:8, weight:2 },
      { species:'fernsprout',  minL:5, maxL:8, weight:2 },
      { species:'budling',     minL:5, maxL:8, weight:2 },
      { species:'bumblesting', minL:4, maxL:7, weight:3 }
    ],
    edges: {
      north: { y:0,  to:'brindale', tx:7, ty:16 },
      south: { y:27, to:'woodfall', tx:7, ty:1 }
    }
  },

  woodfall: {
    id:'woodfall', name:'Woodfall Village',
    tiles: [
      'XXXXXXX,,XXXXXXXXXXX',
      'GGGGGGG,,GGGGGGGGGGG',
      'G.G.U..,,..U.G.U.c.G',
      'G..PPPP...MMMM.....G',
      'G..PPPP...MMMM.....G',
      'G..??D?...??D?.....G',
      'G..____...____.....G',
      'G..,|...{......<..,G',
      'G..S....c.....1...,G',
      'G..,..\'...........,G',
      'G..,......1.......,G',
      'G..,...|.&&&...~..,G',
      'G..,.....BDB.c....,G',
      'G..,...4..........,G',
      'G.\'...4.4.........,G',
      'G..,,,,,,,,,,,,,,,,G',
      'GGGGGGG,,GGGGGGGGGGG',
      'XXXXXXX,,XXXXXXXXXXX'
    ],
    npcs: [
      { x:14, y:8, dir:'down', sprite:'npc_old', name:'WOODFALL ELDER',
        dialog:["Welcome to WOODFALL.","The slate-roofed building south is the WOODFALL GYM.","South of town, the trees thicken into PEBBLEWOOD."] }
    ],
    ambient: [
      { species:'sproutling', x:7,  y:9,  range:2 },
      { species:'crawlbug',   x:14, y:11, range:2 },
      { species:'fernsprout', x:5,  y:13, range:2 }
    ],
    signs: {
      '3,8': "WOODFALL VILLAGE - Where the woods begin."
    },
    doors: {
      '5,5':  { to:'woodfall_center', x:4, y:6 },
      '12,5': { to:'woodfall_mart',   x:5, y:9 },
      '10,12':{ to:'woodfall_gym',    x:4, y:7 }
    },
    edges: {
      north: { y:0,  to:'route2',     tx:18, ty:26 },
      south: { y:17, to:'pebblewood', tx:7, ty:1 }
    }
  },

  woodfall_gym: {
    id:'woodfall_gym', name:'Woodfall Gym', interior:true,
    tiles: [
      'BBBBBBBBB',
      'BFFFFFFFB',
      'BFFFFFFFB',
      'BFFCCCFFB',
      'BFFCHCFFB',
      'BFFFFFFFB',
      'BFFFFFFFB',
      'B{FFFFF{B',
      'BBBBDBBBB'
    ],
    npcs: [
      { x:4, y:4, dir:'down', sprite:'npc_girl', name:'GYM LEADER FERN',
        gym:true, badge:'VERDE',
        dialog:["I am FERN, leader of the WOODFALL GYM.","My GRASS team will tangle yours up!"],
        gymRequirement:{ badges:['WAVE'] },
        gymLocked:["You need the WAVE BADGE before challenging me.","Try the BRINDALE GYM first!"],
        trainer:{ team:[['fernsprout',16],['sproutling',16],['bramblewood',18]],
                  reward:900,
                  defeat:["A clean win! The VERDE BADGE is yours."] } }
    ],
    doors: { '4,8': { to:'woodfall', x:10, y:13 } }
  },

  woodfall_center: {
    id:'woodfall_center', name:'PokeRod Center', interior:true,
    tiles: [
      'BBBBBBBBB',
      'B}>>>>>}B',
      'BF/FF9FFB',
      'BFCCCFFFB',
      'BFCHCFFFB',
      'BFFFFFFFB',
      'B{FFFFF{B',
      'BBBBDBBBB'
    ],
    npcs: [
      { x:3, y:4, dir:'down', sprite:'nurse', name:'NURSE PIPPA',
        dialog:["Welcome to the WOODFALL CENTER!","Step up and I'll heal your team."],
        healer:true }
    ],
    doors: { '4,7': { to:'woodfall', x:5, y:6 } }
  },

  woodfall_mart: {
    id:'woodfall_mart', name:'PokeRod Mart', interior:true,
    tiles: [
      'BBBBBBBBBBB',
      'B>>>>>>>>>B',
      'B>>>>F>>>>B',
      'BFFFFFFFFFB',
      'BFCCCCCCCFB',
      'BFFFFFFFFFB',
      'BF>>FF>>FFB',
      'BFFFFFFFFFB',
      'BF>>FF>>FFB',
      'B{rrrrrrr{B',
      'BBBBBDBBBBB'
    ],
    npcs: [
      { x:5, y:4, dir:'down', sprite:'clerk', name:'WOODFALL MART',
        dialog:["Welcome to the WOODFALL MART!"],
        shop:{ greeting:["Welcome to the WOODFALL MART!","How can I help you?"] } }
    ],
    doors: { '5,10': { to:'woodfall', x:12, y:6 } }
  },

  pebblewood: {
    id:'pebblewood', name:'Pebblewood Forest',
    tiles: makeWindingTiles({
      fill:'G', pathCode:'z', pathRadius:1,
      path:[[7,0],[7,4],[13,4],[13,10],[9,10],[9,15],[21,15],[21,11],[27,11],[27,19],[18,19],[18,27]],
      branches:[
        { points:[[13,10],[18,10],[18,6],[24,6]], code:'z', radius:1 },
        { points:[[21,15],[25,15],[25,22],[12,22],[12,18]], code:'z', radius:1 }
      ],
      pockets:[
        { x:15, y:5, w:8, h:5, code:':' },
        { x:5, y:12, w:8, h:6, code:':' },
        { x:23, y:16, w:7, h:7, code:':' }
      ],
      decor:[
        { on:'G', codes:['U','V','g'], rate:12, seed:4 },
        { on:'G', codes:['4','n'], rate:18, seed:9 }
      ]
    }),
    npcs: [
      { x:14, y:6, dir:'left', sprite:'npc_youth', name:'BUG-FAN ARI',
        dialog:["Bugs are the BEST POKEROD.","I'll prove it in battle!"],
        trainer: { team:[['crawlbug',8],['bumblesting',8]], reward:360,
                   defeat:["Bugs are still the best though!","...probably."] } }
    ],
    signs: {},
    encounters: [
      { species:'crawlbug',    minL:6, maxL:9,  weight:5 },
      { species:'bumblesting', minL:7, maxL:10, weight:4 },
      { species:'sproutling',  minL:6, maxL:9,  weight:3 },
      { species:'fernsprout',  minL:7, maxL:10, weight:3 },
      { species:'mantilux',    minL:7, maxL:10, weight:3 },
      { species:'dewfae',      minL:8, maxL:11, weight:2 },
      { species:'clodlet',     minL:6, maxL:9,  weight:2 },
      { species:'glimkit',     minL:8, maxL:11, weight:1 }
    ],
    edges: {
      north: { y:0,  to:'woodfall',  tx:7, ty:16 },
      south: { y:27, to:'crestrock', tx:7, ty:1 }
    }
  },

  crestrock: {
    id:'crestrock', name:'Crestrock Town',
    tiles: [
      'XXXXXXX,,XXXXXXXXXXX',
      'VVVVVVV,,VVVVVVVVVVV',
      'V.V..2.,,..2.V..2c.V',
      'V..PPPP...MMMM.....V',
      'V..PPPP...MMMM.....V',
      'V..##D#...##D#.....V',
      'V..____...____...|.V',
      'V..,|...{......<..,V',
      'V..S..............,V',
      'V..,..\'..2........,V',
      'V..,..............,V',
      'V..,...|.&&&....~.,V',
      'V..,.....BDB..2...,V',
      'V..,..\'...........,V',
      'V.|,..............,V',
      'V..,,,,,,,,,,,,,,,,,',
      'VVVVVVV,,VVVVVVVVVVV',
      'XXXXXXX,,XXXXXXXXXXX'
    ],
    npcs: [
      { x:14, y:8, dir:'down', sprite:'npc_girl', name:'CRESTROCK GUIDE',
        dialog:["Welcome to CRESTROCK.","The slate-roofed building south is the CRESTROCK GYM.","East of town, HIGHSPIRE climbs into the clouds."] }
    ],
    ambient: [
      { species:'pebra',     x:8,  y:9,  range:2 },
      { species:'geistmite', x:13, y:11, range:2 },
      { species:'voltkit',   x:5,  y:13, range:2 }
    ],
    signs: {
      '3,8': "CRESTROCK TOWN - Mountain gateway."
    },
    doors: {
      '5,5':  { to:'crestrock_center', x:4, y:6 },
      '12,5': { to:'crestrock_mart',   x:5, y:9 },
      '10,12':{ to:'crestrock_gym',    x:4, y:7 }
    },
    edges: {
      north: { y:0,  to:'pebblewood', tx:18, ty:26 },
      east:  { x:19, to:'mountain', tx:1, ty:14 },
      south: { y:17, to:'glimcavern', tx:7, ty:1 }
    }
  },

  crestrock_gym: {
    id:'crestrock_gym', name:'Crestrock Gym', interior:true,
    tiles: [
      'BBBBBBBBB',
      'BFFFFFFFB',
      'BFFFFFFFB',
      'BFFCCCFFB',
      'BFFCHCFFB',
      'BFFFFFFFB',
      'BFFFFFFFB',
      'B{FFFFF{B',
      'BBBBDBBBB'
    ],
    npcs: [
      { x:4, y:4, dir:'down', sprite:'npc_old', name:'GYM LEADER BOULDER',
        gym:true, badge:'CRAG',
        dialog:["I am BOULDER, leader of the CRESTROCK GYM.","My ROCK team won't move easily!"],
        gymRequirement:{ badges:['WAVE','VERDE'] },
        gymLocked:["You'll need the WAVE and VERDE BADGES first.","Brindale and Woodfall are your training grounds."],
        trainer:{ team:[['pebra',22],['stoneworm',23],['boulderon',26]],
                  reward:1300,
                  defeat:["A solid win! The CRAG BADGE is yours."] } }
    ],
    doors: { '4,8': { to:'crestrock', x:10, y:13 } }
  },

  crestrock_center: {
    id:'crestrock_center', name:'PokeRod Center', interior:true,
    tiles: [
      'BBBBBBBBB',
      'B}>>>>>}B',
      'BF/FF9FFB',
      'BFCCCFFFB',
      'BFCHCFFFB',
      'BFFFFFFFB',
      'B{FFFFF{B',
      'BBBBDBBBB'
    ],
    npcs: [
      { x:3, y:4, dir:'down', sprite:'nurse', name:'NURSE QUILL',
        dialog:["CRESTROCK CENTER welcomes you.","Let me look after your team."],
        healer:true }
    ],
    doors: { '4,7': { to:'crestrock', x:5, y:6 } }
  },

  crestrock_mart: {
    id:'crestrock_mart', name:'PokeRod Mart', interior:true,
    tiles: [
      'BBBBBBBBBBB',
      'B>>>>>>>>>B',
      'B>>>>F>>>>B',
      'BFFFFFFFFFB',
      'BFCCCCCCCFB',
      'BFFFFFFFFFB',
      'BF>>FF>>FFB',
      'BFFFFFFFFFB',
      'BF>>FF>>FFB',
      'B{rrrrrrr{B',
      'BBBBBDBBBBB'
    ],
    npcs: [
      { x:5, y:4, dir:'down', sprite:'clerk', name:'CRESTROCK MART',
        dialog:["Climbing the highlands?","Stock up before you go!"],
        shop:{ greeting:["Climbing the highlands?","Stock up before you go!"] } }
    ],
    doors: { '5,10': { to:'crestrock', x:12, y:6 } }
  },

  glimcavern: {
    id:'glimcavern', name:'Glimcavern',
    tiles: makeWindingTiles({
      fill:'#', pathCode:'s', pathRadius:1,
      path:[[7,0],[7,5],[15,5],[15,9],[10,9],[10,14],[24,14],[24,19],[17,19],[17,24],[18,24],[18,27]],
      branches:[
        { points:[[15,9],[22,9],[22,6],[29,6]], code:'s', radius:1 },
        { points:[[10,14],[5,14],[5,20],[13,20]], code:'s', radius:1 }
      ],
      pockets:[
        { x:18, y:6, w:8, h:4, code:':' },
        { x:4, y:16, w:8, h:5, code:':' },
        { x:24, y:20, w:6, h:5, code:':' }
      ],
      decor:[
        { on:'#', codes:['T',')'], rate:15, seed:8 },
        { on:'#', codes:['('], rate:20, seed:6 }
      ]
    }),
    npcs: [
      { x:10, y:14, dir:'right', sprite:'npc_youth', name:'SPELUNKER GUS',
        dialog:["I came down here looking for crystals.","Found a fight instead!"],
        trainer: { team:[['pebra',12],['geistmite',12]], reward:520,
                   defeat:["Bah! The dark always wins, eventually."] } },
      { x:27, y:22, dir:'down', sprite:'ball', name:'',
        legendary:true, species:'stormfangis', level:30,
        dialog:["A faint thunder rolls deep in the dark..."],
        afterDialog:["The thunder is gone now. Just stone."] }
    ],
    encounters: [
      { species:'pebra',     minL:10, maxL:14, weight:5 },
      { species:'geistmite', minL:10, maxL:14, weight:4, time:['night','dusk','dawn'] },
      { species:'cavewing',  minL:10, maxL:14, weight:4, time:['night','dusk','dawn'] },
      { species:'stoneworm', minL:11, maxL:15, weight:3 },
      { species:'wraithlet', minL:11, maxL:14, weight:3, time:'night' },
      { species:'rivetbolt', minL:11, maxL:14, weight:2 },
      { species:'crysthorn', minL:12, maxL:15, weight:1 }
    ],
    doors: {
      '29,6': { to:'glimcavern_b1', x:10, y:1 }
    },
    edges: {
      north: { y:0,  to:'crestrock', tx:7, ty:6 },
      south: { y:27, to:'frostmere', tx:7, ty:1 }
    }
  },

  glimcavern_b1: {
    id:'glimcavern_b1', name:'Glimcavern B1', interior:true,
    tiles: [
      'TTTTTTTTTTTTTTTTTTTT',
      'TssssssTssDsssssssTT',
      'Ts:::sTsssss::ssssTT',
      'Tss:::ssssssss:sssTT',
      'TssssTsTssTsssTsssTT',
      'Ts::ssssssssss::ssTT',
      'TssssTsssTsssssssTTT',
      'Ts::sssTssss:::sssTT',
      'TsssssTssssTsssssTTT',
      'Ts::ssssssss:::ssTTT',
      'TssssTsTssTsssssssTT',
      'Ts:::ssssss::ssssTTT',
      'TssssTssssTssTsssTTT',
      'TssssssTssTsssssssTT',
      'TTTTTTTTTTTTTTTTTTTT'
    ],
    npcs: [
      { x:14, y:11, dir:'down', sprite:'ball', name:'',
        legendary:true, species:'shadefox', level:28,
        dialog:["Glowing eyes flicker in the gloom..."],
        afterDialog:["Whatever was here is long gone."] }
    ],
    encounters: [
      { species:'pebra',     minL:14, maxL:18, weight:4 },
      { species:'geistmite', minL:14, maxL:18, weight:5, time:['night','dusk','dawn'] },
      { species:'cavewing',  minL:14, maxL:18, weight:4, time:['night','dusk','dawn'] },
      { species:'stoneworm', minL:14, maxL:18, weight:3 },
      { species:'wraithlet', minL:15, maxL:19, weight:4, time:'night' },
      { species:'rivetbolt', minL:15, maxL:19, weight:2 },
      { species:'crysthorn', minL:15, maxL:19, weight:2 }
    ],
    doors: {
      '10,1': { to:'glimcavern', x:10, y:9 }
    }
  },

  frostmere: {
    id:'frostmere', name:'Frostmere Town',
    tiles: [
      'XXXXXXX,,XXXXXXXXXXX',
      'QQQQQQQ,,QQQQQQQQQQQ',
      'Q.Q..k.,,..k.Q..k..Q',
      'Q..PPPP...MMMM.....Q',
      'Q..PPPP...MMMM.....Q',
      'Q..??D?...??D?.....Q',
      'Q..6666...6666.....Q',
      'Q..,|..k.{.....<..,Q',
      'Q..S......k.......,Q',
      'Q..,......WWWW....,Q',
      'Q..,......WWWW.k..,Q',
      'Q..,...|.&&&....~.,Q',
      'Q..,.....BDB......,Q',
      'Q..,..............,Q',
      'Q.k,...k.k........,Q',
      'Q.|,,,,,,,,,,,,,,,,Q',
      'QQQQQQQ,,QQQQQQQQQQQ',
      'XXXXXXX,,XXXXXXXXXXX'
    ],
    npcs: [
      { x:14, y:8, dir:'down', sprite:'npc_old', name:'FROSTMERE SAGE',
        dialog:["FROSTMERE is built around a frozen lake.","The slate-roofed building south is the FROSTMERE GYM.","Beyond town, the FROSTPEAK rises into white silence."] }
    ],
    ambient: [
      { species:'frostpup', x:7,  y:8,  range:2 },
      { species:'snowox',   x:14, y:13, range:2 },
      { species:'glimkit',  x:5,  y:11, range:2 }
    ],
    signs: {
      '3,8': "FROSTMERE TOWN - The lake never thaws."
    },
    doors: {
      '5,5':  { to:'frostmere_center', x:4, y:6 },
      '12,5': { to:'frostmere_mart',   x:5, y:9 },
      '10,12':{ to:'frostmere_gym',    x:4, y:7 }
    },
    edges: {
      north: { y:0,  to:'glimcavern', tx:18, ty:26 },
      south: { y:17, to:'frostpeak',  tx:7, ty:1 }
    }
  },

  frostmere_gym: {
    id:'frostmere_gym', name:'Frostmere Gym', interior:true,
    tiles: [
      'BBBBBBBBB',
      'BFFFFFFFB',
      'BFFFFFFFB',
      'BFFCCCFFB',
      'BFFCHCFFB',
      'BFFFFFFFB',
      'BFFFFFFFB',
      'B{FFFFF{B',
      'BBBBDBBBB'
    ],
    npcs: [
      { x:4, y:4, dir:'down', sprite:'npc_girl', name:'GYM LEADER RIME',
        gym:true, badge:'CHILL',
        dialog:["I am RIME, leader of the FROSTMERE GYM.","My ICE team will freeze your hopes!"],
        gymRequirement:{ badges:['WAVE','VERDE','CRAG'] },
        gymLocked:["You'll need the first three BADGES first.","WAVE, VERDE, and CRAG."],
        trainer:{ team:[['frostpup',26],['glacierock',27],['snowox',28]],
                  reward:1700,
                  defeat:["A flawless win! The CHILL BADGE is yours."] } }
    ],
    doors: { '4,8': { to:'frostmere', x:10, y:13 } }
  },

  frostmere_center: {
    id:'frostmere_center', name:'PokeRod Center', interior:true,
    tiles: [
      'BBBBBBBBB',
      'B}>>>>>}B',
      'BF/FF9FFB',
      'BFCCCFFFB',
      'BFCHCFFFB',
      'BFFFFFFFB',
      'B{FFFFF{B',
      'BBBBDBBBB'
    ],
    npcs: [
      { x:3, y:4, dir:'down', sprite:'nurse', name:'NURSE FERN',
        dialog:["FROSTMERE CENTER, at your service.","A warm corner for cold travelers."],
        healer:true }
    ],
    doors: { '4,7': { to:'frostmere', x:5, y:6 } }
  },

  frostmere_mart: {
    id:'frostmere_mart', name:'PokeRod Mart', interior:true,
    tiles: [
      'BBBBBBBBBBB',
      'B>>>>>>>>>B',
      'B>>>>F>>>>B',
      'BFFFFFFFFFB',
      'BFCCCCCCCFB',
      'BFFFFFFFFFB',
      'BF>>FF>>FFB',
      'BFFFFFFFFFB',
      'BF>>FF>>FFB',
      'B{rrrrrrr{B',
      'BBBBBDBBBBB'
    ],
    npcs: [
      { x:5, y:4, dir:'down', sprite:'clerk', name:'FROSTMERE MART',
        dialog:["Bundle up. The mountain past here is unforgiving."],
        shop:{ greeting:["Bundle up.","The mountain past here is unforgiving."] } }
    ],
    doors: { '5,10': { to:'frostmere', x:12, y:6 } }
  },

  frostpeak: {
    id:'frostpeak', name:'Frostpeak',
    tiles: makeWindingTiles({
      fill:'Q', pathCode:'6', pathRadius:1,
      path:[[7,0],[7,4],[15,4],[15,8],[11,8],[11,13],[25,13],[25,18],[19,18],[19,23],[19,27]],
      branches:[
        { points:[[15,8],[24,8],[24,5],[29,5]], code:'6', radius:1 },
        { points:[[11,13],[6,13],[6,20],[14,20]], code:'6', radius:1 }
      ],
      pockets:[
        { x:17, y:5, w:8, h:4, code:':' },
        { x:5, y:15, w:8, h:6, code:':' },
        { x:22, y:19, w:7, h:5, code:':' }
      ],
      decor:[
        { on:'Q', codes:['k','2'], rate:11, seed:6 },
        { on:'Q', codes:['('], rate:21, seed:12 }
      ]
    }),
    npcs: [
      { x:24, y:8, dir:'left', sprite:'npc_old', name:'CLIMBER VAL',
        dialog:["The wind up here cuts to the bone.","Show me your strongest!"],
        trainer: { team:[['frostpup',16],['snowox',16]], reward:760,
                   defeat:["Aye... the slope respects your team."] } }
    ],
    encounters: [
      { species:'frostpup',   minL:14, maxL:18, weight:5 },
      { species:'snowox',     minL:14, maxL:18, weight:3 },
      { species:'glimkit',    minL:14, maxL:18, weight:3 },
      { species:'crysthorn',  minL:15, maxL:19, weight:2 },
      { species:'frostbloom', minL:14, maxL:18, weight:3 },
      { species:'galewing',   minL:14, maxL:18, weight:3 }
    ],
    edges: {
      north: { y:0,  to:'frostmere',  tx:7, ty:16 },
      south: { y:27, to:'harborside', tx:7, ty:1 }
    }
  },

  harborside: {
    id:'harborside', name:'Harborside Town',
    tiles: [
      'XXXXXXX,,XXXXXXXXXXX',
      'OOOOOOO,,OOOOOOOOOOO',
      'O.O..1.,,..1.O..1c.O',
      'O..PPPP...MMMM.....O',
      'O..PPPP...MMMM.....O',
      'O..!!D!...!!D!.....O',
      'O..tttt...tttt.....O',
      'O..,|........~.WWWWW',
      'O..S.....{.....WWWWW',
      'O..,......1....WWWWW',
      'O..,......&&&..WWWWW',
      'O..,.....<BDB|.WWWWW',
      'O..,..1........WWWWW',
      'O.\'............WWWWW',
      'O..,......1c...WWWWW',
      'O.|,,,,,,,,,,,,,,,,,',
      'OOOOOOO,,OOOOOOOOOOO',
      'XXXXXXX,,XXXXXXXXXXX'
    ],
    npcs: [
      { x:9, y:9, dir:'right', sprite:'npc_youth', name:'DOCKHAND TEO',
        dialog:["HARBORSIDE - last stop before the SEAROUTE.","The slate-roofed building south is the HARBORSIDE GYM.","The beach path heads east from the dock road."] }
    ],
    ambient: [
      { species:'aquapup',   x:8,  y:7,  range:2 },
      { species:'splashfin', x:12, y:13, range:2 },
      { species:'mistfin',   x:5,  y:11, range:2 }
    ],
    signs: {
      '3,8': "HARBORSIDE TOWN - The salt never sleeps."
    },
    doors: {
      '5,5':  { to:'harborside_center', x:4, y:6 },
      '12,5': { to:'harborside_mart',   x:5, y:9 },
      '11,11':{ to:'harborside_gym',    x:4, y:7 }
    },
    edges: {
      north: { y:0,  to:'frostpeak', tx:19, ty:26 },
      east:  { x:19, to:'beach', tx:1, ty:15 },
      south: { y:17, to:'searoute',  tx:7, ty:1 }
    }
  },

  harborside_gym: {
    id:'harborside_gym', name:'Harborside Gym', interior:true,
    tiles: [
      'BBBBBBBBB',
      'BFFFFFFFB',
      'BFFFFFFFB',
      'BFFCCCFFB',
      'BFFCHCFFB',
      'BFFFFFFFB',
      'BFFFFFFFB',
      'B{FFFFF{B',
      'BBBBDBBBB'
    ],
    npcs: [
      { x:4, y:4, dir:'down', sprite:'npc_youth', name:'GYM LEADER GALE',
        gym:true, badge:'GUST',
        dialog:["I am GALE, leader of the HARBORSIDE GYM.","My FLYING team will sweep yours from the sky!"],
        gymRequirement:{ badges:['WAVE','VERDE','CRAG','CHILL'] },
        gymLocked:["You'll need four BADGES before challenging me.","Earn WAVE, VERDE, CRAG, and CHILL first."],
        trainer:{ team:[['flitwing',30],['skylordan',31],['galewing',33]],
                  reward:2200,
                  defeat:["A clean sweep! The GUST BADGE is yours."] } }
    ],
    doors: { '4,8': { to:'harborside', x:11, y:12 } }
  },

  harborside_center: {
    id:'harborside_center', name:'PokeRod Center', interior:true,
    tiles: [
      'BBBBBBBBB',
      'B}>>>>>}B',
      'BF/FF9FFB',
      'BFCCCFFFB',
      'BFCHCFFFB',
      'BFFFFFFFB',
      'B{FFFFF{B',
      'BBBBDBBBB'
    ],
    npcs: [
      { x:3, y:4, dir:'down', sprite:'nurse', name:'NURSE MARLO',
        dialog:["HARBORSIDE CENTER.","Tides come and go - but healing is always free."],
        healer:true }
    ],
    doors: { '4,7': { to:'harborside', x:5, y:6 } }
  },

  harborside_mart: {
    id:'harborside_mart', name:'PokeRod Mart', interior:true,
    tiles: [
      'BBBBBBBBBBB',
      'B>>>>>>>>>B',
      'B>>>>F>>>>B',
      'BFFFFFFFFFB',
      'BFCCCCCCCFB',
      'BFFFFFFFFFB',
      'BF>>FF>>FFB',
      'BFFFFFFFFFB',
      'BF>>FF>>FFB',
      'B{rrrrrrr{B',
      'BBBBBDBBBBB'
    ],
    npcs: [
      { x:5, y:4, dir:'down', sprite:'clerk', name:'HARBORSIDE MART',
        dialog:["Heading to the SEAROUTE?","Pack snacks. And maybe a swimsuit."],
        shop:{ greeting:["Heading to the SEAROUTE?","Pack snacks. And maybe a swimsuit."] } }
    ],
    doors: { '5,10': { to:'harborside', x:12, y:6 } }
  },

  searoute: {
    id:'searoute', name:'Searoute', weather:'rain',
    tiles: makeWindingTiles({
      fill:'O', pathCode:'t', pathRadius:1,
      path:[[7,0],[7,4],[14,4],[14,10],[9,10],[9,15],[22,15],[22,11],[28,11],[28,20],[18,20],[18,27]],
      branches:[
        { points:[[14,10],[21,10],[21,6],[27,6]], code:'u', radius:1 },
        { points:[[22,15],[27,15],[27,23],[11,23],[11,19]], code:'u', radius:1 }
      ],
      pockets:[
        { x:16, y:5, w:8, h:5, code:':' },
        { x:5, y:16, w:8, h:5, code:':' },
        { x:22, y:21, w:7, h:4, code:':' },
        { x:27, y:2, w:5, h:8, code:'W' }
      ],
      decor:[
        { on:'O', codes:['3','s'], rate:10, seed:13 },
        { on:'O', codes:['W'], rate:28, seed:4 }
      ]
    }),
    npcs: [
      { x:21, y:10, dir:'left', sprite:'npc_youth', name:'FISHER LIL',
        dialog:["Hey there, traveler!","Care to test the salty waves?"],
        trainer: { team:[['mistfin',20],['aquapup',20],['splashfin',20]], reward:1100,
                   defeat:["The tide always returns. So will I."] } }
    ],
    encounters: [
      { species:'splashfin', minL:18, maxL:22, weight:5 },
      { species:'mistfin',   minL:18, maxL:22, weight:4 },
      { species:'aquapup',   minL:18, maxL:22, weight:3 },
      { species:'galewing',  minL:18, maxL:22, weight:2 },
      { species:'cavewing',  minL:18, maxL:22, weight:2 },
      { species:'miasmite',  minL:18, maxL:22, weight:2 }
    ],
    edges: {
      north: { y:0,  to:'harborside', tx:7, ty:6 },
      south: { y:27, to:'summitvale', tx:7, ty:1 }
    }
  },

  summitvale: {
    id:'summitvale', name:'Summitvale',
    tiles: [
      'XXXXXXX,,XXXXXXXXXXX',
      'NNNNNNN,,NNNNNNNNNNN',
      'N.N..1.,,..1.N..1c.N',
      'N..PPPP...MMMM.....N',
      'N..PPPP...MMMM.....N',
      'N..!!D!...!!D!.....N',
      'N..____...____...|.N',
      'N..,|..........<..,N',
      'N..S.....{...c....,N',
      'N..,......****....,N',
      'N..,......****....,N',
      'N..,......!!D!..~.,N',
      'N..,..\'...____....,N',
      'N..,...|..........,N',
      'N..,..............,N',
      'N.|,,,,,,,,,,,,,,,,,',
      'NNNNNNNNNNNNNNNNNNNN',
      'NNNNNNNNNNNNNNNNNNNN'
    ],
    npcs: [
      { x:14, y:8, dir:'down', sprite:'npc_oak', name:'CHAMPION ROWE',
        gym:true, badge:'CINDER',
        dialog:["You climbed all the way to SUMMITVALE!","I am ROWE — the FIRE-typed CHAMPION.","If you've earned every other BADGE, I'll grant you the CINDER BADGE. If you can take it."],
        gymRequirement:{ minBadges:7 },
        gymLocked:["Earn all seven other BADGES first.","Only then will I face you."],
        trainer:{ team:[['emberkit',38],['flarebound',40],['magmaron',42],['infernarok',46]],
                  reward:5000,
                  defeat:["Magnificent! The CINDER BADGE — and the title of CHAMPION — are yours."] } }
    ],
    ambient: [
      { species:'emberkit', x:8,  y:7,  range:2 },
      { species:'voltkit',  x:5,  y:13, range:2 },
      { species:'glimkit',  x:15, y:14, range:2 }
    ],
    signs: {
      '3,8': "SUMMITVALE - The road bends east toward the desert loop."
    },
    doors: {
      '5,5':  { to:'summitvale_center', x:4, y:6 },
      '12,5': { to:'summitvale_mart',   x:5, y:9 },
      '12,11':{ to:'summitvale_house',  x:3, y:6 }
    },
    edges: {
      north: { y:0, to:'searoute', tx:18, ty:26 },
      east:  { x:19, to:'desert', tx:1, ty:14 }
    }
  },

  summitvale_center: {
    id:'summitvale_center', name:'PokeRod Center', interior:true,
    tiles: [
      'BBBBBBBBB',
      'B}>>>>>}B',
      'BF/FF9FFB',
      'BFCCCFFFB',
      'BFCHCFFFB',
      'BFFFFFFFB',
      'B{FFFFF{B',
      'BBBBDBBBB'
    ],
    npcs: [
      { x:3, y:4, dir:'down', sprite:'nurse', name:'NURSE EMBER',
        dialog:["SUMMITVALE CENTER welcomes the brave.","Let me restore your team to peak form."],
        healer:true }
    ],
    doors: { '4,7': { to:'summitvale', x:5, y:6 } }
  },

  summitvale_mart: {
    id:'summitvale_mart', name:'PokeRod Mart', interior:true,
    tiles: [
      'BBBBBBBBBBB',
      'B>>>>>>>>>B',
      'B>>>>F>>>>B',
      'BFFFFFFFFFB',
      'BFCCCCCCCFB',
      'BFFFFFFFFFB',
      'BF>>FF>>FFB',
      'BFFFFFFFFFB',
      'BF>>FF>>FFB',
      'B{rrrrrrr{B',
      'BBBBBDBBBBB'
    ],
    npcs: [
      { x:5, y:4, dir:'down', sprite:'clerk', name:'SUMMITVALE MART',
        dialog:["You made it to the top!","Our shelves carry the finest gear."],
        shop:{ greeting:["Welcome to SUMMITVALE MART!","Our shelves carry the finest gear."],
               bonusTier:1 } }
    ],
    doors: { '5,10': { to:'summitvale', x:12, y:6 } }
  },

  summitvale_house: {
    id:'summitvale_house', name:'House', interior:true,
    tiles: [
      'BBBBBBB',
      'BFFFFFB',
      'BFrrFFB',
      'BFrrFFB',
      'BFFFFFB',
      'BFFFFFB',
      'BBBDBBB'
    ],
    npcs: [
      { x:4, y:2, dir:'down', sprite:'npc_girl', name:'TRAVELER NIA',
        dialog:["I came from RODPORT too!","Funny how the road home is always longer than you remember."] }
    ],
    doors: { '3,6': { to:'summitvale', x:11, y:12 } }
  }
,
desert: {
    id:'desert', name:'Sunbleach Desert',
    tiles: makeWindingTiles({
      fill:'J', pathCode:'5', pathRadius:1,
      path:[[0,14],[5,14],[5,9],[13,9],[13,5],[23,5],[23,11],[18,11],[18,17],[27,17],[27,22],[32,22],[32,14],[33,14]],
      branches:[
        { points:[[13,9],[9,9],[9,18],[14,18]], code:'5', radius:1 },
        { points:[[23,11],[29,11],[29,6]], code:'5', radius:1 }
      ],
      pockets:[
        { x:7, y:15, w:8, h:5, code:':' },
        { x:20, y:6, w:8, h:4, code:':' },
        { x:24, y:18, w:7, h:5, code:':' }
      ],
      decor:[
        { on:'J', codes:['3','O'], rate:9, seed:14 },
        { on:'J', codes:['('], rate:18, seed:3 }
      ]
    }),
    npcs: [
      { x:23, y:11, dir:'down', sprite:'npc_old', name:'GYM LEADER MIRE',
        gym:true, badge:'DUNE',
        dialog:["I am MIRE, leader of the SUNBLEACH GYM.","The dunes test only the worthy. Do you have what it takes?"],
        gymRequirement:{ minBadges:5 },
        gymLocked:["The desert respects only the seasoned.","Earn at least five BADGES first."],
        trainer:{ team:[['stoneworm',32],['boulderon',33],['quakeworm',35]],
                  reward:2800,
                  defeat:["Magnificent! The DUNE BADGE is yours."] } }
    ],
    encounters: [
      { species:'zapret',    minL:14, maxL:18, weight:4 },
      { species:'pebra',     minL:14, maxL:18, weight:5 },
      { species:'stoneworm', minL:14, maxL:18, weight:3 },
      { species:'cinderpup', minL:15, maxL:18, weight:3 },
      { species:'geistmite', minL:14, maxL:18, weight:2 }
    ],
    edges: {
      west: { x:0, to:'summitvale', tx:18, ty:15 },
      east: { x:33, to:'rodport', tx:1, ty:15 }
    }
  },

  beach: {
    id:'beach', name:'Sunkissed Beach',
    tiles: makeWindingTiles({
      fill:'O', pathCode:'u', pathRadius:1,
      path:[[0,15],[6,15],[6,10],[14,10],[14,6],[24,6],[24,13],[18,13],[18,20],[28,20]],
      branches:[
        { points:[[14,10],[9,10],[9,22],[15,22]], code:'t', radius:1 },
        { points:[[24,13],[30,13],[30,8]], code:'t', radius:1 }
      ],
      pockets:[
        { x:7, y:17, w:8, h:6, code:':' },
        { x:20, y:7, w:8, h:5, code:':' },
        { x:25, y:14, w:7, h:5, code:':' },
        { x:29, y:1, w:5, h:26, code:'W' }
      ],
      decor:[
        { on:'O', codes:['3','s'], rate:9, seed:4 }
      ]
    }),
    npcs: [],
    encounters: [
      { species:'splashfin', minL:14, maxL:18, weight:5 },
      { species:'aquapup',   minL:14, maxL:18, weight:4 },
      { species:'mistfin',   minL:14, maxL:18, weight:3 },
      { species:'cavewing',  minL:14, maxL:18, weight:2 },
      { species:'galewing',  minL:14, maxL:18, weight:3 }
    ],
    edges: {
      west: { x:0, to:'harborside', tx:18, ty:15 }
    }
  },

  mountain: {
    id:'mountain', name:'Highspire Mountain',
    tiles: makeWindingTiles({
      fill:'G', pathCode:'v', pathRadius:1,
      path:[[0,14],[5,14],[5,8],[12,8],[12,4],[21,4],[21,12],[28,12],[28,21],[19,21]],
      branches:[
        { points:[[12,8],[17,8],[17,14],[11,14]], code:'v', radius:1 },
        { points:[[21,12],[25,12],[25,6],[30,6]], code:'v', radius:1 }
      ],
      pockets:[
        { x:8, y:12, w:8, h:5, code:':' },
        { x:22, y:6, w:8, h:5, code:':' },
        { x:21, y:18, w:8, h:5, code:':' }
      ],
      decor:[
        { on:'G', codes:['#',')'], rate:11, seed:10 },
        { on:'G', codes:['('], rate:17, seed:2 }
      ]
    }),
    npcs: [
      { x:28, y:12, dir:'down', sprite:'npc_youth', name:'GYM LEADER VOLTA',
        gym:true, badge:'SPARK',
        dialog:["I am VOLTA, leader of the HIGHSPIRE GYM.","The mountain crackles with electric storms — and so does my team!"],
        gymRequirement:{ minBadges:3 },
        gymLocked:["The path here is steep — earn at least three BADGES first.","Then we'll see if you can ride the lightning."],
        trainer:{ team:[['voltkit',24],['zapret',26],['voltlynx',28]],
                  reward:2000,
                  defeat:["A shocking win! The SPARK BADGE is yours."] } }
    ],
    encounters: [
      { species:'pebra',     minL:16, maxL:20, weight:5 },
      { species:'stoneworm', minL:16, maxL:20, weight:4 },
      { species:'crysthorn', minL:18, maxL:22, weight:2 },
      { species:'geistmite', minL:16, maxL:20, weight:2 },
      { species:'snowox',    minL:18, maxL:22, weight:2 },
      { species:'draekit',   minL:18, maxL:22, weight:2 },
      { species:'clawmonk',  minL:16, maxL:20, weight:2 }
    ],
    edges: {
      west: { x:0, to:'crestrock', tx:18, ty:15 }
    }
  },

  pokerod_farm: {
    id:'pokerod_farm', name:'PokeRod Farm', tags:['farm'],
    tiles: [
      'YYYYYYYYYYYYYYYYYYYYYYYYYYYY',
      'Y..........RRRRRR..........Y',
      'Y..........RRRRRR..........Y',
      'Y..........BB[]BB..........Y',
      'Y...::::....,,......::::...Y',
      'Y...::::....,,......::::...Y',
      'Y...::::....,,......::::...Y',
      'Y...........,,.............Y',
      'Y...::::....,,......::::...Y',
      'Y...::::....,,......::::...Y',
      'Y...::::....,,......::::...Y',
      'Y...........,,.............Y',
      'Y...::::....,,......::::...Y',
      'Y...::::....,,......::::...Y',
      'Y...::::....,,......::::...Y',
      'Y...........,,.............Y',
      'Y...::::....,,......::::...Y',
      'Y...::::....,,......::::...Y',
      'X,,,,,,,,,,,,,,,,,,,,,S,,,,Y',
      'YYYYYYYYYYYYYYYYYYYYYYYYYYYY'
    ],
    npcs: [
      { x:13, y:7, dir:'down', sprite:'npc_old', name:'FARMER WREN',
        dialog:[
          "Welcome to POKEROD FARM!",
          "We keep two of every type here.",
          "It's a fine place to study them up close."
        ] }
    ],
    // Two ambient creatures per type, grouped roughly by element.
    // Single-species types (GHOST/DRAGON/FAIRY) appear twice as the
    // same species since the roster only has one representative.
    ambient: [
      // NORMAL + FIRE pen (top-left)
      { species:'nibblet',     x:5,  y:5,  range:1 },
      { species:'glimkit',     x:7,  y:5,  range:1 },
      { species:'emberkit',    x:5,  y:6,  range:1 },
      { species:'cinderpup',   x:7,  y:6,  range:1 },
      // WATER + ELECTRIC pen (top-right)
      { species:'aquapup',     x:21, y:5,  range:1 },
      { species:'mistfin',     x:23, y:5,  range:1 },
      { species:'zapret',      x:21, y:6,  range:1 },
      { species:'voltkit',     x:23, y:6,  range:1 },
      // GRASS + ICE pen (mid-left)
      { species:'sproutling',  x:5,  y:9,  range:1 },
      { species:'fernsprout',  x:7,  y:9,  range:1 },
      { species:'frostpup',    x:5,  y:10, range:1 },
      { species:'frostnip',    x:7,  y:10, range:1 },
      // FIGHTING + POISON pen (mid-right)
      { species:'pugpaw',      x:21, y:9,  range:1 },
      { species:'clawmonk',    x:23, y:9,  range:1 },
      { species:'bumblesting', x:21, y:10, range:1 },
      { species:'venipip',     x:23, y:10, range:1 },
      // GROUND + FLYING pen (lower-left)
      { species:'stoneworm',   x:5,  y:13, range:1 },
      { species:'mudmote',     x:7,  y:13, range:1 },
      { species:'flitwing',    x:5,  y:14, range:1 },
      { species:'breezlet',    x:7,  y:14, range:1 },
      // PSYCHIC + BUG pen (lower-right)
      { species:'mindrop',     x:21, y:13, range:1 },
      { species:'dreamilly',   x:23, y:13, range:1 },
      { species:'crawlbug',    x:21, y:14, range:1 },
      { species:'silkuttle',   x:23, y:14, range:1 },
      // ROCK + DARK pen (bottom-left)
      { species:'pebra',       x:5,  y:17, range:1 },
      { species:'craglet',     x:7,  y:17, range:1 },
      { species:'geistmite',   x:5,  y:16, range:1 },
      { species:'shadefox',    x:7,  y:16, range:1 },
      // STEEL + GHOST pen (bottom-right)
      { species:'rivettot',    x:21, y:17, range:1 },
      { species:'rivetbolt',   x:23, y:17, range:1 },
      { species:'wraithlet',   x:21, y:16, range:1 },
      { species:'wraithlet',   x:23, y:16, range:1 },
      // DRAGON + FAIRY (rare types) wandering near the central path
      { species:'draekit',     x:13, y:9,  range:1 },
      { species:'draekit',     x:14, y:9,  range:1 },
      { species:'dewfae',      x:13, y:13, range:1 },
      { species:'dewfae',      x:14, y:13, range:1 }
    ],
    signs: {
      '22,18': "POKEROD FARM - Two of every type, fed at dawn."
    },
    edges: {
      west: { x:0, to:'mountain', tx:46, ty:18 }
    }
  }
};

function applyWorldExpansion(MAPS) {
  function signTiles(signs) {
    return Object.keys(signs || {}).map(k => {
      const parts = k.split(',').map(Number);
      return { x:parts[0], y:parts[1] };
    });
  }

  function updateCity(id, cfg) {
    const map = MAPS[id];
    cfg.signTiles = signTiles(cfg.signs);
    map.name = cfg.name || map.name;
    map.tags = ['city'].concat(cfg.tags || []);
    map.tiles = makeCityHubTiles(cfg);
    map.doors = cityDoors(cfg.buildings);
    map.signs = cfg.signs || {};
    map.npcs = cfg.npcs || [];
    map.ambient = cfg.ambient || [];
    map.edges = cfg.edgeDefs || map.edges || {};
    if (cfg.hidden) map.hidden = cfg.hidden;
  }

  function updateExit(mapId, key, to, x, y) {
    if (!MAPS[mapId].doors) MAPS[mapId].doors = {};
    MAPS[mapId].doors[key] = { to, x, y };
  }

  function movedNpc(mapId, idx, x, y, dir) {
    const src = MAPS[mapId].npcs && MAPS[mapId].npcs[idx];
    return Object.assign({}, src || {}, { x, y, dir:dir || (src && src.dir) || 'down' });
  }

  function roadTrainer(x, y, dir, sprite, name, dialog, team, reward, defeat) {
    return {
      x, y, dir, sprite, name, dialog,
      trainer:{ team, reward, defeat }
    };
  }

  function updateRoute(id, cfg) {
    const map = MAPS[id];
    const doorTiles = (cfg.doors || []).map(d => ({ x:d.x, y:d.y, code:d.code || 'D' }));
    map.name = cfg.name || map.name;
    map.tags = cfg.tags || ['route'];
    map.tiles = makeWindingTiles(Object.assign({}, cfg, { doors:doorTiles }));
    map.edges = cfg.edges;
    map.signs = cfg.signs || {};
    map.hidden = cfg.hidden || {};
    map.npcs = cfg.npcs || [];
    if (cfg.encounters) map.encounters = cfg.encounters;
    if (cfg.encounterZones) map.encounterZones = cfg.encounterZones;
    map.doors = {};
    for (const d of cfg.doors || []) map.doors[d.x + ',' + d.y] = { to:d.to, x:d.tx, y:d.ty };
    if (cfg.weather) map.weather = cfg.weather;
  }

  const rodportBuildings = [
    { x:5,  y:5,  w:7, roof:'+', wall:'@', to:'player_house', tx:3, ty:6 },
    { x:14, y:5,  w:7, roof:'-', wall:'@', to:'rival_house',  tx:3, ty:6 },
    { x:24, y:4,  w:10, roof:'P', wall:'B', doorTile:'D', to:'lab', tx:5, ty:8 },
    { x:5,  y:22, w:8, roof:'=', wall:'$', to:'rodport_dockhouse', tx:5, ty:7 },
    { x:31, y:21, w:8, roof:'&', wall:'#', to:'rodport_boathouse', tx:5, ty:7 }
  ];
  updateCity('rodport', {
    fill:'Y', pathCode:'_', trees:['K','c','1','e'], seed:3, edges:{ south:true, west:true },
    buildings:rodportBuildings,
    features:[
      { x:32, y:27, w:10, h:4, code:'W' },
      { x:2, y:13, w:7, h:3, code:"'" },
      { x:27, y:13, w:7, h:3, code:'1' }
    ],
    extraTiles:[{x:10,y:17,code:'<'},{x:30,y:17,code:'<'},{x:33,y:26,code:'t'},{x:34,y:26,code:'t'}],
    signs:{
      '19,19': 'RODPORT TOWN - Harbor, lab, and first steps.',
      '2,17': 'The desert road loops back here after six BADGES.'
    },
    npcs:[
      { x:28, y:9, dir:'down', sprite:'npc_oak', name:'PROF. ROD',
        dialog:["Welcome to the world of POKEROD!","My lab is bigger now, but the adventure still starts with one partner."] },
      { x:13, y:17, dir:'down', sprite:'npc_girl', name:'LILA',
        dialog:["The new harbor paths all bend back to the plaza.","If you get turned around, follow the cobbles."] },
      { x:35, y:25, dir:'left', sprite:'npc_youth', name:'DOCKHAND REN',
        dialog:["We keep spare ROD BALL crates by the pier.","The sea breeze makes every route feel longer."] }
    ],
    ambient:[
      { species:'nibblet', x:16, y:18, range:3 },
      { species:'flitwing', x:34, y:29, range:2 },
      { species:'glimkit', x:7, y:14, range:2 }
    ],
    edgeDefs:{
      west:{ x:0, to:'desert', tx:46, ty:20, gate:{ minBadges:6, message:'The desert loop is too harsh without six BADGES.' } },
      south:{ y:33, to:'route1', tx:24, ty:1 }
    }
  });

  const brindaleBuildings = [
    { x:5, y:4, w:7, roof:'P', wall:'B', doorTile:'D', to:'pokecenter', tx:4, ty:6 },
    { x:15, y:4, w:7, roof:'M', wall:'$', doorTile:'f', to:'mart', tx:5, ty:9 },
    { x:28, y:5, w:9, roof:'-', wall:'!', to:'brindale_school', tx:5, ty:7 },
    { x:5, y:22, w:7, roof:'=', wall:'$', to:'townhouse', tx:3, ty:6 },
    { x:25, y:22, w:9, roof:'&', wall:'B', doorTile:'D', to:'brindale_gym', tx:4, ty:7 }
  ];
  updateCity('brindale', {
    fill:'K', pathCode:'p', trees:['c','1','e','K'], seed:7, edges:{ north:true, south:true },
    buildings:brindaleBuildings,
    features:[
      { x:12, y:20, w:9, h:4, code:"'" },
      { x:30, y:12, w:8, h:3, code:'1' },
      { x:5, y:13, w:6, h:3, code:'c' }
    ],
    signs:{ '18,19':'BRINDALE CITY - Gardens, school, Center, Mart, and Gym.' },
    npcs:[
      { x:21, y:16, dir:'down', sprite:'npc_girl', name:'BRINDALE GUIDE',
        dialog:["BRINDALE has grown into a real garden city.","The Gym is tucked into the southern courtyard."] },
      { x:33, y:10, dir:'left', sprite:'npc_youth', name:'SCHOOL KID NEM',
        dialog:["Trainer school says Great Balls show up earlier now.","I wrote that down twice."] },
      { x:14, y:23, dir:'up', sprite:'npc_old', name:'GARDENER ELI',
        dialog:["Every flowerbed is a tiny route if you walk slowly enough."] }
    ],
    ambient:[
      { species:'glimkit', x:12, y:16, range:2 },
      { species:'splashfin', x:31, y:14, range:2 },
      { species:'nibblet', x:8, y:24, range:2 }
    ],
    edgeDefs:{
      north:{ y:0, to:'route1', tx:24, ty:36 },
      south:{ y:33, to:'route2', tx:24, ty:1 }
    }
  });

  const woodfallBuildings = [
    { x:6, y:5, w:7, roof:'P', wall:'B', doorTile:'D', to:'woodfall_center', tx:4, ty:6 },
    { x:17, y:5, w:7, roof:'M', wall:'?', doorTile:'f', to:'woodfall_mart', tx:5, ty:9 },
    { x:30, y:6, w:8, roof:'8', wall:'?', to:'woodfall_lodge', tx:5, ty:7 },
    { x:7, y:22, w:8, roof:'7', wall:'?', to:'woodfall_cabin', tx:5, ty:7 },
    { x:24, y:23, w:9, roof:'&', wall:'B', doorTile:'D', to:'woodfall_gym', tx:4, ty:7 }
  ];
  updateCity('woodfall', {
    fill:'G', pathCode:'z', trees:['U','V','4','n'], seed:4, edges:{ north:true, south:true },
    buildings:woodfallBuildings,
    features:[
      { x:2, y:12, w:8, h:5, code:'4' },
      { x:31, y:14, w:8, h:5, code:'4' },
      { x:16, y:26, w:5, h:4, code:'m' }
    ],
    signs:{ '18,19':'WOODFALL - Cabins under the old canopy.' },
    npcs:[
      { x:22, y:16, dir:'down', sprite:'npc_old', name:'WOODFALL ELDER',
        dialog:["The village paths twist with the roots now.","South of town, PEBBLEWOOD has deeper side trails."] },
      { x:34, y:13, dir:'left', sprite:'npc_girl', name:'FORAGER MIA',
        dialog:["A forest cavern opened near PEBBLEWOOD.","Cavern Balls work nicely in places like that."] },
      { x:10, y:24, dir:'up', sprite:'npc_youth', name:'CABIN KID SOL',
        dialog:["I counted five different roofs from my porch!"] }
    ],
    ambient:[
      { species:'sproutling', x:8, y:14, range:3 },
      { species:'crawlbug', x:33, y:16, range:2 },
      { species:'fernsprout', x:18, y:27, range:2 }
    ],
    edgeDefs:{
      north:{ y:0, to:'route2', tx:24, ty:36 },
      south:{ y:33, to:'pebblewood', tx:24, ty:1 }
    }
  });

  const crestrockBuildings = [
    { x:5, y:5, w:7, roof:'P', wall:'B', doorTile:'D', to:'crestrock_center', tx:4, ty:6 },
    { x:16, y:5, w:7, roof:'M', wall:'#', doorTile:'f', to:'crestrock_mart', tx:5, ty:9 },
    { x:29, y:6, w:9, roof:'=', wall:'#', to:'crestrock_workshop', tx:5, ty:7 },
    { x:7, y:22, w:8, roof:'&', wall:'#', to:'crestrock_house', tx:5, ty:7 },
    { x:24, y:23, w:9, roof:'&', wall:'B', doorTile:'D', to:'crestrock_gym', tx:4, ty:7 }
  ];
  updateCity('crestrock', {
    fill:'V', pathCode:'v', trees:['2','(',')','V'], seed:10, edges:{ north:true, east:true, south:true },
    buildings:crestrockBuildings,
    features:[
      { x:3, y:12, w:8, h:4, code:'(' },
      { x:32, y:13, w:7, h:5, code:';' },
      { x:35, y:16, w:7, h:3, code:'v' }
    ],
    signs:{ '18,19':'CRESTROCK - Terraces, workshops, and the Highspire gate.' },
    npcs:[
      { x:22, y:16, dir:'down', sprite:'npc_girl', name:'CRESTROCK GUIDE',
        dialog:["The east switchback reaches HIGHSPIRE.","The south gate drops into GLIMCAVERN."] },
      { x:33, y:12, dir:'left', sprite:'npc_old', name:'MINER OREN',
        dialog:["We carved more bends into the roads than the mountain asked for."] },
      { x:12, y:24, dir:'up', sprite:'npc_youth', name:'WORKSHOP KAI',
        dialog:["Quick Balls are best before a wild Pokerod gets its bearings."] }
    ],
    ambient:[
      { species:'pebra', x:9, y:14, range:2 },
      { species:'geistmite', x:32, y:16, range:2 },
      { species:'voltkit', x:14, y:25, range:2 }
    ],
    edgeDefs:{
      north:{ y:0, to:'pebblewood', tx:24, ty:36 },
      east:{ x:43, to:'mountain', tx:1, ty:20 },
      south:{ y:33, to:'glimcavern', tx:24, ty:1 }
    }
  });

  const frostmereBuildings = [
    { x:5, y:5, w:7, roof:'P', wall:'B', doorTile:'D', to:'frostmere_center', tx:4, ty:6 },
    { x:16, y:5, w:7, roof:'M', wall:'?', doorTile:'f', to:'frostmere_mart', tx:5, ty:9 },
    { x:29, y:6, w:8, roof:'%', wall:'!', to:'frostmere_inn', tx:5, ty:7 },
    { x:7, y:22, w:8, roof:'%', wall:'?', to:'frostmere_cabin', tx:5, ty:7 },
    { x:24, y:23, w:9, roof:'&', wall:'B', doorTile:'D', to:'frostmere_gym', tx:4, ty:7 }
  ];
  updateCity('frostmere', {
    fill:'Q', pathCode:'6', trees:['k','2','Q'], seed:6, edges:{ north:true, south:true },
    buildings:frostmereBuildings,
    features:[
      { x:30, y:13, w:9, h:5, code:'W' },
      { x:3, y:14, w:8, h:4, code:'k' },
      { x:16, y:25, w:5, h:3, code:'2' }
    ],
    signs:{ '18,19':'FROSTMERE - Frozen lake, warm inn, cold Gym.' },
    npcs:[
      { x:22, y:16, dir:'down', sprite:'npc_old', name:'FROSTMERE SAGE',
        dialog:["The lake district grew around the old ice path.","FROSTPEAK hides an ice cave now."] },
      { x:33, y:12, dir:'left', sprite:'npc_girl', name:'INNKEEPER POL',
        dialog:["The hot spring is small, but the stories get larger every night."] },
      { x:11, y:24, dir:'up', sprite:'npc_youth', name:'SNOW SCOUT IVA',
        dialog:["Look for Ultra Balls in late mountain pockets."] }
    ],
    ambient:[
      { species:'frostpup', x:8, y:14, range:2 },
      { species:'snowox', x:34, y:17, range:2 },
      { species:'glimkit', x:18, y:25, range:2 }
    ],
    edgeDefs:{
      north:{ y:0, to:'glimcavern', tx:24, ty:36 },
      south:{ y:33, to:'frostpeak', tx:24, ty:1 }
    }
  });

  const harborsideBuildings = [
    { x:5, y:5, w:7, roof:'P', wall:'B', doorTile:'D', to:'harborside_center', tx:4, ty:6 },
    { x:16, y:5, w:7, roof:'M', wall:'!', doorTile:'f', to:'harborside_mart', tx:5, ty:9 },
    { x:29, y:6, w:9, roof:'&', wall:'$', to:'harborside_warehouse', tx:5, ty:7 },
    { x:7, y:22, w:8, roof:'=', wall:'!', to:'harborside_fisher', tx:5, ty:7 },
    { x:23, y:23, w:9, roof:'&', wall:'B', doorTile:'D', to:'harborside_gym', tx:4, ty:7 }
  ];
  updateCity('harborside', {
    fill:'O', pathCode:'t', trees:['3','s','O'], seed:13, edges:{ north:true, east:true, south:true },
    buildings:harborsideBuildings,
    features:[
      { x:34, y:10, w:9, h:7, code:'W' },
      { x:32, y:20, w:10, h:4, code:'W' },
      { x:29, y:18, w:8, h:2, code:'t' }
    ],
    signs:{ '18,19':'HARBORSIDE - Docks, warehouses, beach road.' },
    npcs:[
      { x:22, y:16, dir:'down', sprite:'npc_youth', name:'DOCKHAND TEO',
        dialog:["The beach path runs east from the dock road.","South is the longer, windier SEAROUTE."] },
      { x:34, y:19, dir:'left', sprite:'npc_girl', name:'MARKET JIN',
        dialog:["Quick Balls sell fast when travelers smell storm weather."] },
      { x:11, y:24, dir:'up', sprite:'npc_old', name:'OLD FISHER PIKE',
        dialog:["The tide cavern opens when you least expect a shortcut."] }
    ],
    ambient:[
      { species:'aquapup', x:10, y:14, range:2 },
      { species:'splashfin', x:34, y:21, range:2 },
      { species:'mistfin', x:16, y:25, range:2 }
    ],
    edgeDefs:{
      north:{ y:0, to:'frostpeak', tx:24, ty:36 },
      east:{ x:43, to:'beach', tx:1, ty:20 },
      south:{ y:33, to:'searoute', tx:24, ty:1 }
    }
  });

  const summitBuildings = [
    { x:5, y:5, w:7, roof:'P', wall:'B', doorTile:'D', to:'summitvale_center', tx:4, ty:6 },
    { x:16, y:5, w:7, roof:'M', wall:'!', doorTile:'f', to:'summitvale_mart', tx:5, ty:9 },
    { x:29, y:6, w:8, roof:'*', wall:'!', to:'summitvale_house', tx:3, ty:6 },
    { x:7, y:23, w:8, roof:'=', wall:'#', to:'summitvale_lookout', tx:5, ty:7 },
    { x:29, y:23, w:9, roof:'*', wall:'!', to:'summitvale_hall', tx:5, ty:7 }
  ];
  updateCity('summitvale', {
    fill:'N', pathCode:'i', trees:['1','c','N','('], seed:16, edges:{ north:true, east:true },
    buildings:summitBuildings,
    features:[
      { x:31, y:14, w:8, h:4, code:'5' },
      { x:3, y:14, w:8, h:4, code:'(' },
      { x:18, y:25, w:8, h:3, code:'I' }
    ],
    signs:{ '18,19':'SUMMITVALE - The loop turns east toward the desert.' },
    npcs:[
      movedNpc('summitvale', 0, 26, 18, 'down'),
      { x:34, y:13, dir:'left', sprite:'npc_girl', name:'LOOKOUT ANA',
        dialog:["From here the region finally looks like a circle.","The desert closes the loop to Rodport."] },
      { x:12, y:25, dir:'up', sprite:'npc_youth', name:'RIDGE RUNNER CAL',
        dialog:["The old straight roads are gone. Every route has a bend worth checking."] }
    ],
    ambient:[
      { species:'emberkit', x:11, y:15, range:2 },
      { species:'voltkit', x:34, y:15, range:2 },
      { species:'glimkit', x:19, y:26, range:2 }
    ],
    edgeDefs:{
      north:{ y:0, to:'searoute', tx:24, ty:36 },
      east:{ x:43, to:'desert', tx:1, ty:20 }
    }
  });

  updateRoute('route1', {
    fill:'Y', pathCode:',', pathRadius:1,
    path:[[24,0],[24,5],[17,5],[17,10],[30,10],[30,15],[20,15],[20,22],[34,22],[34,29],[24,29],[24,37]],
    branches:[
      { points:[[17,10],[8,10],[8,18],[14,18]], radius:1 },
      { points:[[30,15],[40,15],[40,9],[37,9]], radius:1 },
      { points:[[20,22],[10,22],[10,29],[18,29]], radius:1 },
      { points:[[24,5],[31,5],[31,10]], radius:1 },
      { points:[[34,22],[42,22],[42,30],[34,30]], radius:1 },
      { points:[[24,29],[24,33],[16,33],[16,29]], radius:1 }
    ],
    pockets:[
      { x:19, y:4, w:6, h:4, code:':' },
      { x:6, y:15, w:9, h:5, code:':' },
      { x:31, y:12, w:9, h:5, code:':' },
      { x:12, y:27, w:8, h:5, code:':' },
      { x:35, y:27, w:8, h:5, code:':' },
      { x:2, y:3, w:8, h:4, code:'1' },
      { x:26, y:31, w:7, h:4, code:'c' }
    ],
    rects:[
      { x:3, y:23, w:6, h:4, code:"'" },
      { x:27, y:2, w:4, h:3, code:'1' }
    ],
    decor:[{ on:'Y', codes:['K','E'], rate:15, seed:3 }, { on:'Y', codes:['c','e','1'], rate:8, seed:5 }],
    tiles:[
      { x:13, y:17, code:'<' }, { x:36, y:13, code:'|' },
      { x:5, y:24, code:'{' }, { x:41, y:29, code:'(' }
    ],
    doors:[{ x:37, y:9, to:'route1_hollow', tx:14, ty:18 }],
    signs:{ '18,6':'ROUTE 1 - The first road now has a few secrets.' },
    hidden:{ '18,29':{ item:'potion', count:1 }, '39,14':{ item:'rodball', count:2 } },
    encounters:[
      { species:'nibblet',     minL:2, maxL:4, weight:2 },
      { species:'flitwing',    minL:2, maxL:4, weight:2 },
      { species:'crawlbug',    minL:2, maxL:3, weight:2 },
      { species:'zapret',      minL:3, maxL:5, weight:1 }
    ],
    encounterZones:[
      { x:6, y:15, w:9, h:5, encounters:[
        { species:'silkuttle', minL:2, maxL:4, weight:4 },
        { species:'venipip',   minL:3, maxL:5, weight:3 },
        { species:'pugpaw',    minL:3, maxL:5, weight:3 },
        { species:'nibblet',   minL:2, maxL:4, weight:1 }
      ] },
      { x:31, y:12, w:9, h:5, encounters:[
        { species:'rivettot',  minL:3, maxL:5, weight:4 },
        { species:'mindrop',   minL:3, maxL:5, weight:3 },
        { species:'joltlet',   minL:3, maxL:5, weight:3 },
        { species:'glimkit',   minL:3, maxL:5, weight:1 }
      ] },
      { x:12, y:27, w:8, h:5, encounters:[
        { species:'mudmote',   minL:3, maxL:6, weight:4 },
        { species:'craglet',   minL:3, maxL:6, weight:4 },
        { species:'frostnip',  minL:3, maxL:5, weight:3 },
        { species:'crawlbug',  minL:2, maxL:4, weight:1 }
      ] },
      { x:19, y:4, w:6, h:4, encounters:[
        { species:'breezlet',  minL:3, maxL:5, weight:4 },
        { species:'joltlet',   minL:3, maxL:5, weight:2 },
        { species:'pugpaw',    minL:3, maxL:5, weight:2 },
        { species:'flitwing',  minL:2, maxL:4, weight:1 }
      ] }
    ],
    npcs:[
      movedNpc('route1', 0, 9, 18, 'right'),
      roadTrainer(13, 18, 'left', 'trainer_bug_catcher', 'BUG CATCHER NOX',
        ["This meadow is crawling with tiny champions!","Show me what you caught!"],
        [['silkuttle',3],['venipip',4]], 180,
        ["My net missed the big moment!","Back to the tall grass for me."]),
      roadTrainer(36, 14, 'left', 'trainer_picnicker', 'PICNICKER SIA',
        ["I found the prettiest hollow path.","Battle break? Battle break!"],
        [['breezlet',4],['joltlet',4]], 220,
        ["That was a breezy little lesson.","I'll picnic and train some more."])
    ],
    edges:{ north:{ y:0, to:'rodport', tx:22, ty:32 }, south:{ y:37, to:'brindale', tx:22, ty:1 } }
  });

  updateRoute('route2', {
    fill:'K', pathCode:',', pathRadius:1,
    path:[[24,0],[24,4],[15,4],[15,9],[32,9],[32,14],[18,14],[18,20],[10,20],[10,28],[24,28],[24,37]],
    branches:[
      { points:[[15,9],[7,9],[7,16],[13,16]], radius:1 },
      { points:[[32,14],[41,14],[41,22],[34,22]], radius:1 },
      { points:[[18,20],[25,20],[25,25],[31,25]], radius:1 },
      { points:[[24,4],[34,4],[34,9],[32,9]], radius:1 },
      { points:[[32,14],[38,14],[38,28],[24,28]], radius:1 },
      { points:[[18,20],[18,31],[28,31],[28,28]], radius:1 }
    ],
    pockets:[
      { x:5, y:13, w:9, h:5, code:':' },
      { x:33, y:19, w:9, h:5, code:':' },
      { x:21, y:23, w:9, h:5, code:':' },
      { x:30, y:3, w:7, h:5, code:':' },
      { x:14, y:28, w:7, h:5, code:'1' }
    ],
    rects:[
      { x:2, y:24, w:9, h:4, code:"'" },
      { x:40, y:25, w:5, h:5, code:'m' },
      { x:28, y:10, w:4, h:3, code:'c' }
    ],
    decor:[{ on:'K', codes:['m','c','1'], rate:8, seed:7 }, { on:'K', codes:['E'], rate:18, seed:2 }],
    tiles:[
      { x:31, y:24, code:'<' }, { x:38, y:18, code:'|' },
      { x:7, y:14, code:'{' }, { x:41, y:27, code:'(' }
    ],
    signs:{ '16,5':'ROUTE 2 - Flower meadows hide longer bends.' },
    hidden:{ '35,22':{ item:'greatball', count:1 }, '12,16':{ item:'awakening', count:1 } },
    npcs:[
      movedNpc('route2', 0, 7, 16, 'right'),
      roadTrainer(31, 25, 'left', 'trainer_camper', 'CAMPER TAVI',
        ["I looped around twice and still found a shortcut.","Let's see if your team can keep pace!"],
        [['nibblet',6],['cinderpup',7],['fernsprout',7]], 320,
        ["Guess I packed too light.","At least the flowers are nice."])
    ],
    edges:{ north:{ y:0, to:'brindale', tx:22, ty:32 }, south:{ y:37, to:'woodfall', tx:22, ty:1 } }
  });

  updateRoute('pebblewood', {
    fill:'G', pathCode:'z', pathRadius:1,
    path:[[24,0],[24,5],[14,5],[14,11],[29,11],[29,17],[18,17],[18,24],[34,24],[34,30],[24,30],[24,37]],
    branches:[
      { points:[[14,11],[7,11],[7,22],[14,22]], code:'z', radius:1 },
      { points:[[29,17],[40,17],[40,9],[37,9]], code:'z', radius:1 },
      { points:[[18,24],[10,24],[10,30],[16,30]], code:'z', radius:1 },
      { points:[[24,5],[33,5],[33,11],[29,11]], code:'z', radius:1 },
      { points:[[29,17],[37,17],[37,25],[34,25],[34,24]], code:'z', radius:1 },
      { points:[[18,24],[18,32],[25,32],[25,30]], code:'z', radius:1 }
    ],
    pockets:[
      { x:5, y:18, w:10, h:6, code:':' },
      { x:31, y:13, w:10, h:6, code:':' },
      { x:11, y:28, w:8, h:5, code:':' },
      { x:29, y:3, w:8, h:5, code:'4' },
      { x:34, y:23, w:8, h:5, code:':' }
    ],
    rects:[
      { x:2, y:26, w:6, h:5, code:'4' },
      { x:20, y:13, w:5, h:3, code:'n' },
      { x:41, y:4, w:4, h:9, code:'U' }
    ],
    decor:[{ on:'G', codes:['U','V','g'], rate:12, seed:4 }, { on:'G', codes:['4','n'], rate:14, seed:9 }],
    tiles:[
      { x:12, y:21, code:'|' }, { x:37, y:16, code:'(' },
      { x:22, y:14, code:'{' }, { x:35, y:24, code:'<' }
    ],
    doors:[{ x:37, y:9, to:'pebblewood_cavern', tx:14, ty:18 }],
    hidden:{ '16,30':{ item:'cavernball', count:1 }, '34,16':{ item:'antidote', count:1 } },
    npcs:[
      movedNpc('pebblewood', 0, 14, 22, 'right'),
      roadTrainer(12, 22, 'right', 'trainer_ranger', 'RANGER MOSS',
        ["Pebblewood opens up if you trust the side trails.","I'll guard this grove with a battle."],
        [['sproutling',9],['bumblesting',10]], 460,
        ["The grove likes you.","Mind your steps near the cavern."])
    ],
    edges:{ north:{ y:0, to:'woodfall', tx:22, ty:32 }, south:{ y:37, to:'crestrock', tx:22, ty:1 } }
  });

  updateRoute('glimcavern', {
    fill:'#', pathCode:'s', pathRadius:1, tags:['route','cave'],
    path:[[24,0],[24,5],[15,5],[15,11],[32,11],[32,16],[18,16],[18,22],[31,22],[31,30],[24,30],[24,37]],
    branches:[
      { points:[[15,11],[7,11],[7,23],[14,23]], code:'s', radius:1 },
      { points:[[32,16],[40,16],[40,8],[37,8]], code:'s', radius:1 },
      { points:[[18,22],[11,22],[11,29],[17,29]], code:'s', radius:1 },
      { points:[[24,5],[34,5],[34,11],[32,11]], code:'s', radius:1 },
      { points:[[32,16],[38,16],[38,27],[31,27],[31,30]], code:'I', radius:1 },
      { points:[[18,22],[22,22],[22,32],[24,32],[24,30]], code:'s', radius:1 }
    ],
    pockets:[
      { x:5, y:19, w:10, h:6, code:':' },
      { x:32, y:12, w:9, h:6, code:':' },
      { x:11, y:27, w:8, h:5, code:':' },
      { x:28, y:3, w:9, h:5, code:'I' },
      { x:24, y:25, w:8, h:5, code:':' }
    ],
    rects:[
      { x:2, y:3, w:7, h:4, code:')' },
      { x:41, y:19, w:4, h:7, code:'(' },
      { x:21, y:9, w:5, h:3, code:'I' }
    ],
    decor:[{ on:'#', codes:['T',')'], rate:13, seed:8 }, { on:'#', codes:['('], rate:16, seed:6 }],
    tiles:[
      { x:34, y:14, code:'|' }, { x:28, y:26, code:'(' },
      { x:38, y:26, code:'(' }, { x:22, y:31, code:'(' }
    ],
    doors:[{ x:37, y:8, to:'glimcavern_b1', tx:10, ty:1 }],
    hidden:{ '17,29':{ item:'cavernball', count:1 }, '36,15':{ item:'greatball', count:1 } },
    npcs:[
      movedNpc('glimcavern', 0, 11, 22, 'right'),
      movedNpc('glimcavern', 1, 35, 21, 'down'),
      roadTrainer(34, 15, 'left', 'trainer_miner', 'MINER ROOK',
        ["These tunnels fork more than my old pick.","Let's make some echoes!"],
        [['pebra',13],['geistmite',13],['stoneworm',14]], 620,
        ["Solid swing.","I'll mark the safer route with chalk."])
    ],
    edges:{ north:{ y:0, to:'crestrock', tx:22, ty:32 }, south:{ y:37, to:'frostmere', tx:22, ty:1 } }
  });

  updateRoute('frostpeak', {
    fill:'Q', pathCode:'6', pathRadius:1, tags:['route','snow'],
    path:[[24,0],[24,4],[16,4],[16,10],[31,10],[31,16],[19,16],[19,22],[36,22],[36,30],[24,30],[24,37]],
    branches:[
      { points:[[16,10],[8,10],[8,21],[14,21]], code:'6', radius:1 },
      { points:[[31,16],[41,16],[41,9],[37,9]], code:'6', radius:1 },
      { points:[[19,22],[12,22],[12,30],[18,30]], code:'6', radius:1 },
      { points:[[24,4],[33,4],[33,10],[31,10]], code:'6', radius:1 },
      { points:[[31,16],[39,16],[39,28],[36,28],[36,30]], code:'6', radius:1 },
      { points:[[19,22],[23,22],[23,32],[24,32],[24,30]], code:'6', radius:1 }
    ],
    pockets:[
      { x:6, y:17, w:9, h:6, code:':' },
      { x:32, y:12, w:9, h:6, code:':' },
      { x:13, y:28, w:8, h:5, code:':' },
      { x:28, y:2, w:8, h:5, code:'2' },
      { x:34, y:25, w:8, h:5, code:':' }
    ],
    rects:[
      { x:2, y:24, w:7, h:5, code:'2' },
      { x:3, y:4, w:5, h:4, code:'W' },
      { x:42, y:3, w:4, h:9, code:'k' }
    ],
    decor:[{ on:'Q', codes:['k','2'], rate:8, seed:6 }, { on:'Q', codes:['('], rate:17, seed:12 }],
    tiles:[
      { x:13, y:20, code:'<' }, { x:36, y:14, code:'|' },
      { x:39, y:27, code:'(' }, { x:8, y:25, code:'(' }
    ],
    doors:[{ x:37, y:9, to:'frostpeak_ice_cave', tx:14, ty:18 }],
    hidden:{ '18,30':{ item:'ultraball', count:1 }, '35,15':{ item:'fullheal', count:1 } },
    npcs:[
      movedNpc('frostpeak', 0, 38, 16, 'left'),
      roadTrainer(13, 21, 'right', 'trainer_skier', 'SKIER LUMI',
        ["The snow hides loops, shelves, and shortcuts.","I'll race you with a battle!"],
        [['frostnip',16],['frostpup',17],['snowox',18]], 840,
        ["You carved the cleaner line.","Watch for the ice cave side path."])
    ],
    edges:{ north:{ y:0, to:'frostmere', tx:22, ty:32 }, south:{ y:37, to:'harborside', tx:22, ty:1 } }
  });

  updateRoute('searoute', {
    fill:'O', pathCode:'t', pathRadius:1, tags:['route','water'], weather:'rain',
    path:[[24,0],[24,5],[15,5],[15,12],[31,12],[31,17],[18,17],[18,24],[35,24],[35,30],[24,30],[24,37]],
    branches:[
      { points:[[15,12],[7,12],[7,23],[13,23]], code:'u', radius:1 },
      { points:[[31,17],[42,17],[42,8],[38,8]], code:'u', radius:1 },
      { points:[[18,24],[11,24],[11,31],[17,31]], code:'u', radius:1 },
      { points:[[24,5],[34,5],[34,12],[31,12]], code:'t', radius:1 },
      { points:[[31,17],[37,17],[37,24],[35,24]], code:'u', radius:1 },
      { points:[[18,24],[23,24],[23,32],[24,32],[24,30]], code:'t', radius:1 }
    ],
    pockets:[
      { x:5, y:19, w:9, h:6, code:':' },
      { x:33, y:13, w:9, h:6, code:':' },
      { x:29, y:2, w:8, h:6, code:'W' },
      { x:40, y:22, w:7, h:7, code:'W' },
      { x:29, y:23, w:9, h:5, code:':' },
      { x:19, y:30, w:8, h:4, code:'3' }
    ],
    rects:[
      { x:2, y:3, w:6, h:6, code:'W' },
      { x:26, y:9, w:4, h:3, code:'s' },
      { x:43, y:9, w:3, h:8, code:'3' }
    ],
    decor:[{ on:'O', codes:['3','s'], rate:8, seed:13 }, { on:'O', codes:['W'], rate:32, seed:4 }],
    tiles:[
      { x:37, y:23, code:'<' }, { x:8, y:22, code:'{' },
      { x:34, y:14, code:'|' }, { x:22, y:31, code:'(' }
    ],
    doors:[{ x:38, y:8, to:'searoute_tide_cavern', tx:14, ty:18 }],
    hidden:{ '17,31':{ item:'quickball', count:1 }, '13,23':{ item:'superpotion', count:1 } },
    npcs:[
      movedNpc('searoute', 0, 38, 17, 'left'),
      roadTrainer(37, 24, 'left', 'trainer_sailor', 'SAILOR CORA',
        ["This boardwalk bends with the tide.","Keep your balance and battle!"],
        [['mistfin',21],['splashfin',21],['cavewing',22]], 1180,
        ["You kept your sea legs.","The tide cave is worth a peek."])
    ],
    edges:{ north:{ y:0, to:'harborside', tx:22, ty:32 }, south:{ y:37, to:'summitvale', tx:22, ty:1 } }
  });

  updateRoute('mountain', {
    fill:'G', pathCode:'v', pathRadius:1, tags:['route','mountain'],
    path:[[0,20],[6,20],[6,13],[15,13],[15,7],[28,7],[28,14],[39,14],[39,24],[31,24]],
    branches:[
      { points:[[15,13],[20,13],[20,22],[12,22]], code:'v', radius:1 },
      { points:[[28,14],[35,14],[35,23]], code:'v', radius:1 },
      { points:[[6,20],[6,29],[15,29]], code:'v', radius:1 },
      { points:[[6,13],[12,13],[12,8],[15,8],[15,7]], code:'v', radius:1 },
      { points:[[28,7],[36,7],[36,14],[39,14]], code:'v', radius:1 },
      { points:[[20,22],[24,22],[24,29],[31,29],[31,24]], code:'v', radius:1 },
      // Farm road: branches east off the (39,14)-(39,24) ridge run to
      // reach the new pokerod_farm zone at the east map edge.
      { points:[[39,18],[47,18]], code:'v', radius:1 }
    ],
    pockets:[
      { x:9, y:19, w:9, h:6, code:':' },
      { x:31, y:19, w:9, h:6, code:':' },
      { x:11, y:27, w:8, h:5, code:':' },
      { x:30, y:4, w:8, h:5, code:'2' },
      { x:23, y:26, w:9, h:5, code:':' }
    ],
    rects:[
      { x:2, y:4, w:5, h:7, code:')' },
      { x:41, y:18, w:4, h:9, code:'(' },
      { x:18, y:3, w:5, h:3, code:'2' }
    ],
    decor:[{ on:'G', codes:['#',')'], rate:10, seed:10 }, { on:'G', codes:['('], rate:13, seed:2 }],
    tiles:[
      { x:12, y:21, code:'<' }, { x:35, y:13, code:'|' },
      { x:25, y:28, code:'(' }, { x:6, y:28, code:'(' }
    ],
    hidden:{ '15,29':{ item:'quickball', count:1 }, '34,20':{ item:'greatball', count:1 } },
    npcs:[
      movedNpc('mountain', 0, 35, 23, 'down'),
      roadTrainer(12, 22, 'right', 'trainer_hiker', 'HIKER BRAM',
        ["The old climb was too straight for my boots.","Try the switchbacks, then try me!"],
        [['pebra',24],['voltkit',24],['crysthorn',25]], 1360,
        ["You found the firm footing.","Highspire opens up for careful walkers."])
    ],
    edges:{
      west:{ x:0, to:'crestrock', tx:42, ty:17 },
      east:{ x:47, to:'pokerod_farm', tx:1, ty:18 }
    }
  });

  updateRoute('beach', {
    fill:'O', pathCode:'u', pathRadius:1, tags:['route','water'],
    path:[[0,20],[7,20],[7,12],[17,12],[17,7],[31,7],[31,15],[23,15],[23,25],[39,25]],
    branches:[
      { points:[[17,12],[10,12],[10,28],[18,28]], code:'t', radius:1 },
      { points:[[31,15],[42,15],[42,8]], code:'t', radius:1 },
      { points:[[23,25],[31,25],[31,31],[38,31]], code:'t', radius:1 },
      { points:[[7,12],[14,12],[14,7],[17,7]], code:'u', radius:1 },
      { points:[[31,15],[36,15],[36,25],[31,25]], code:'t', radius:1 },
      { points:[[10,28],[10,33],[23,33],[23,25]], code:'u', radius:1 }
    ],
    pockets:[
      { x:8, y:24, w:10, h:6, code:':' },
      { x:27, y:9, w:10, h:6, code:':' },
      { x:39, y:1, w:8, h:30, code:'W' },
      { x:12, y:3, w:8, h:5, code:'3' },
      { x:28, y:27, w:8, h:5, code:':' }
    ],
    rects:[
      { x:2, y:24, w:5, h:7, code:'W' },
      { x:20, y:18, w:5, h:4, code:'3' },
      { x:43, y:32, w:4, h:4, code:'W' }
    ],
    decor:[{ on:'O', codes:['3','s'], rate:8, seed:4 }],
    tiles:[
      { x:31, y:27, code:'<' }, { x:13, y:27, code:'{' },
      { x:35, y:16, code:'|' }, { x:22, y:33, code:'(' }
    ],
    hidden:{ '18,28':{ item:'greatball', count:1 }, '38,31':{ item:'quickball', count:1 } },
    npcs:[
      { x:31, y:25, dir:'down', sprite:'npc_girl', name:'BEACHCOMBER RAE',
        dialog:["Every tide leaves something interesting in a side pocket."] },
      roadTrainer(31, 28, 'up', 'trainer_ace', 'ACE TRAINER VALE',
        ["A beach route with loops is perfect footwork practice.","Show me your cleanest battle line."],
        [['galewing',22],['aquapup',23],['breezlet',24]], 1480,
        ["Sharp footwork.","Even optional roads can make a team stronger."])
    ],
    edges:{ west:{ x:0, to:'harborside', tx:42, ty:17 } }
  });

  updateRoute('desert', {
    name:'Sunbleach Desert Hub',
    fill:'J', pathCode:'5', pathRadius:1, tags:['route','ruins'],
    path:[[0,20],[6,20],[6,13],[16,13],[16,7],[30,7],[30,13],[38,13],[38,20],[47,20]],
    branches:[
      { points:[[16,13],[11,13],[11,26],[18,26]], code:'5', radius:1 },
      { points:[[30,13],[34,13],[34,12]], code:'5', radius:1 },
      { points:[[38,20],[38,29],[29,29]], code:'5', radius:1 },
      { points:[[6,13],[13,13],[13,7],[16,7]], code:'5', radius:1 },
      { points:[[30,7],[42,7],[42,13],[38,13]], code:'5', radius:1 },
      { points:[[18,26],[23,26],[23,32],[29,32],[29,29]], code:'5', radius:1 }
    ],
    pockets:[
      { x:8, y:23, w:11, h:6, code:':' },
      { x:28, y:9, w:10, h:6, code:':' },
      { x:27, y:26, w:10, h:5, code:':' },
      { x:19, y:15, w:6, h:4, code:'W' },
      { x:39, y:5, w:7, h:5, code:'3' },
      { x:20, y:29, w:8, h:5, code:'3' }
    ],
    rects:[
      { x:2, y:4, w:7, h:5, code:'3' },
      { x:41, y:24, w:4, h:7, code:'(' },
      { x:25, y:16, w:6, h:3, code:')' }
    ],
    decor:[{ on:'J', codes:['3','O'], rate:8, seed:14 }, { on:'J', codes:['('], rate:14, seed:3 }],
    tiles:[
      { x:28, y:28, code:'<' }, { x:12, y:25, code:'{' },
      { x:34, y:11, code:'S' }, { x:43, y:8, code:'(' }
    ],
    doors:[{ x:34, y:12, to:'desert_ruins', tx:14, ty:18 }],
    signs:{ '21,14':'SUNBLEACH DESERT - Oasis, ruins, and the Rodport loop.' },
    hidden:{ '18,26':{ item:'quickball', count:1 }, '29,29':{ item:'ultraball', count:1 } },
    npcs:[
      movedNpc('desert', 0, 29, 20, 'down'),
      roadTrainer(28, 29, 'up', 'trainer_ruin_maniac', 'RUIN MANIAC SOL',
        ["The dunes spiral around old stones out here.","I dig up battles as often as relics."],
        [['stoneworm',33],['crysthorn',34],['mindrop',34]], 1880,
        ["A relic of a victory... yours, not mine.","The loop to Rodport lies beyond the heat."])
    ],
    edges:{ west:{ x:0, to:'summitvale', tx:42, ty:17 }, east:{ x:47, to:'rodport', tx:1, ty:17 } }
  });

  updateExit('player_house', '3,6', 'rodport', 8, 9);
  updateExit('rival_house', '3,6', 'rodport', 17, 9);
  updateExit('lab', '5,8', 'rodport', 28, 8);
  updateExit('pokecenter', '4,7', 'brindale', 8, 8);
  updateExit('mart', '5,10', 'brindale', 18, 8);
  updateExit('townhouse', '3,6', 'brindale', 8, 25);
  updateExit('brindale_gym', '4,8', 'brindale', 29, 26);
  updateExit('woodfall_center', '4,7', 'woodfall', 9, 9);
  updateExit('woodfall_mart', '5,10', 'woodfall', 20, 9);
  updateExit('woodfall_gym', '4,8', 'woodfall', 28, 27);
  updateExit('crestrock_center', '4,7', 'crestrock', 8, 9);
  updateExit('crestrock_mart', '5,10', 'crestrock', 19, 9);
  updateExit('crestrock_gym', '4,8', 'crestrock', 28, 27);
  updateExit('frostmere_center', '4,7', 'frostmere', 8, 9);
  updateExit('frostmere_mart', '5,10', 'frostmere', 19, 9);
  updateExit('frostmere_gym', '4,8', 'frostmere', 28, 27);
  updateExit('harborside_center', '4,7', 'harborside', 8, 9);
  updateExit('harborside_mart', '5,10', 'harborside', 19, 9);
  updateExit('harborside_gym', '4,8', 'harborside', 27, 27);
  updateExit('summitvale_center', '4,7', 'summitvale', 8, 9);
  updateExit('summitvale_mart', '5,10', 'summitvale', 19, 9);
  updateExit('summitvale_house', '3,6', 'summitvale', 33, 10);
  MAPS.glimcavern_b1.tags = ['cave'];
  updateExit('glimcavern_b1', '10,1', 'glimcavern', 37, 9);

  MAPS.rodport_dockhouse = makeFlavorInterior('rodport_dockhouse', 'Dock House', 'rodport', 9, 26, {
    x:5, y:4, dir:'down', sprite:'npc_old', name:'CAPTAIN EDA',
    dialog:['The harbor used to be one pier and a rumor.','Now it has enough corners to lose a sandwich.']
  });
  MAPS.rodport_boathouse = makeFlavorInterior('rodport_boathouse', 'Boathouse', 'rodport', 35, 25, {
    x:5, y:4, dir:'down', sprite:'npc_youth', name:'BOATWRIGHT NIX',
    dialog:['Every route needs a few bends.','Straight roads make lazy boots.']
  });
  MAPS.brindale_school = makeFlavorInterior('brindale_school', 'Trainer School', 'brindale', 32, 9, {
    x:5, y:4, dir:'down', sprite:'npc_girl', name:'TEACHER VERA',
    dialog:['Lesson one: check your party stats.','Lesson two: do it before the Gym.']
  });
  MAPS.woodfall_lodge = makeFlavorInterior('woodfall_lodge', 'Forest Lodge', 'woodfall', 34, 10, {
    x:5, y:4, dir:'down', sprite:'npc_old', name:'LODGE KEEPER',
    dialog:['Pebblewood is wider now.','The quiet side paths are where items hide.']
  });
  MAPS.woodfall_cabin = makeFlavorInterior('woodfall_cabin', 'Leaf Cabin', 'woodfall', 11, 26, {
    x:5, y:4, dir:'down', sprite:'npc_youth', name:'BUG WATCHER',
    dialog:['I saw a Cavern Ball sparkle in the woods.','Then a Crawlbug sat on it.']
  });
  MAPS.crestrock_workshop = makeFlavorInterior('crestrock_workshop', 'Stone Workshop', 'crestrock', 33, 10, {
    x:5, y:4, dir:'down', sprite:'npc_old', name:'FOREMAN IVO',
    dialog:['Glimcavern got bigger after the last quake.','Take a Cavern Ball if you find one.']
  });
  MAPS.crestrock_house = makeFlavorInterior('crestrock_house', 'Terrace House', 'crestrock', 11, 26, {
    x:5, y:4, dir:'down', sprite:'npc_girl', name:'TERRACE FAN',
    dialog:['Highspire looks close on the map.','Your feet will disagree.']
  });
  MAPS.frostmere_inn = makeFlavorInterior('frostmere_inn', 'Warm Inn', 'frostmere', 33, 10, {
    x:5, y:4, dir:'down', sprite:'npc_old', name:'INN AUNTIE',
    dialog:['Warm hands, cold routes.','Check Frostpeak pockets for rare balls.']
  });
  MAPS.frostmere_cabin = makeFlavorInterior('frostmere_cabin', 'Snow Cabin', 'frostmere', 11, 26, {
    x:5, y:4, dir:'down', sprite:'npc_girl', name:'SNOW ARTIST',
    dialog:['The ice cave wall shines like a badge case.']
  });
  MAPS.harborside_warehouse = makeFlavorInterior('harborside_warehouse', 'Warehouse', 'harborside', 33, 10, {
    x:5, y:4, dir:'down', sprite:'npc_youth', name:'WAREHOUSE CLERK',
    dialog:['We stock Quick Balls near the exits.','Nobody buys them after a long fight.']
  });
  MAPS.harborside_fisher = makeFlavorInterior('harborside_fisher', 'Fisher House', 'harborside', 11, 26, {
    x:5, y:4, dir:'down', sprite:'npc_old', name:'FISHER PIKE',
    dialog:['Tide caverns are caves with opinions.','Cavern Balls still count.']
  });
  MAPS.summitvale_lookout = makeFlavorInterior('summitvale_lookout', 'Lookout House', 'summitvale', 11, 27, {
    x:5, y:4, dir:'down', sprite:'npc_girl', name:'LOOKOUT ANA',
    dialog:['Rodport, Desert, Summitvale...','A circle feels better from up here.']
  });
  MAPS.summitvale_hall = makeFlavorInterior('summitvale_hall', 'Summit Hall', 'summitvale', 33, 27, {
    x:5, y:4, dir:'down', sprite:'npc_old', name:'HALL KEEPER',
    dialog:['Champions like open plazas.','They need room for dramatic pauses.']
  });

  MAPS.route1_hollow = makeSideCave('route1_hollow', 'Route 1 Hollow', 'route1', 37, 10, {
    seed:2,
    hidden:{ '23,5':{ item:'greatball', count:1 }, '11,13':{ item:'potion', count:1 } },
    encounters:[
      { species:'pebra', minL:3, maxL:5, weight:3 },
      { species:'cavewing', minL:3, maxL:5, weight:2 },
      { species:'glimkit', minL:3, maxL:5, weight:1 }
    ]
  });
  MAPS.pebblewood_cavern = makeSideCave('pebblewood_cavern', 'Pebblewood Cavern', 'pebblewood', 37, 10, {
    seed:6,
    hidden:{ '23,5':{ item:'cavernball', count:1 }, '11,13':{ item:'greatball', count:1 } }
  });
  MAPS.frostpeak_ice_cave = makeSideCave('frostpeak_ice_cave', 'Frostpeak Ice Cave', 'frostpeak', 37, 10, {
    seed:11, tags:['cave','snow'],
    hidden:{ '23,5':{ item:'ultraball', count:1 }, '11,13':{ item:'fullheal', count:1 } },
    encounters:[
      { species:'frostpup', minL:15, maxL:19, weight:4 },
      { species:'snowox', minL:16, maxL:20, weight:3 },
      { species:'crysthorn', minL:16, maxL:20, weight:2 }
    ]
  });
  MAPS.searoute_tide_cavern = makeSideCave('searoute_tide_cavern', 'Tide Cavern', 'searoute', 38, 9, {
    seed:15, tags:['cave','water'],
    hidden:{ '23,5':{ item:'cavernball', count:1 }, '11,13':{ item:'quickball', count:1 } },
    encounters:[
      { species:'splashfin', minL:18, maxL:22, weight:3 },
      { species:'cavewing', minL:18, maxL:22, weight:3 },
      { species:'mistfin', minL:18, maxL:22, weight:2 }
    ]
  });
  MAPS.desert_ruins = makeSideCave('desert_ruins', 'Sunbleach Ruins', 'desert', 34, 13, {
    seed:18, tags:['cave','ruins'],
    hidden:{ '23,5':{ item:'quickball', count:1 }, '11,13':{ item:'ultraball', count:1 } },
    encounters:[
      { species:'geistmite', minL:20, maxL:24, weight:4 },
      { species:'stoneworm', minL:20, maxL:24, weight:3 },
      { species:'crysthorn', minL:21, maxL:25, weight:2 }
    ]
  });

  for (const map of Object.values(MAPS)) {
    if (!map.tags) map.tags = map.interior ? ['interior'] : ['route'];
  }
}

applyWorldExpansion(MAPS);

window.PR_MAPS = { MAPS, TILE_PROPS, tileAt };
