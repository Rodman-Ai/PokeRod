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

// Paint a themed border ring (edge band) into the grid. Each cell
// is filled per a deterministic hash so the same town always looks
// the same. The codes list mixes 'tall' (tree/rock) and 'short'
// (bush/grass/flower) entries; short ones break up the otherwise
// gridlike wall and make the border read as natural foliage instead
// of a fence.
function applyBorderRing(grid, kind, opts) {
  if (!kind) return;
  opts = opts || {};
  const thickness = opts.thickness || 2;
  const edges = opts.edges || { north:true, south:true, east:true, west:true };
  const codes = (() => {
    switch (kind) {
      // Tall blocking codes mixed with walkable ground-cover ('c'
      // flowerbush, '1' flowergrass, 'k' snowybush, 'b' bush) so
      // the border has rhythm - tree, tree, BUSH, tree, GRASS,
      // tree - instead of a solid wall.
      case 'forest':     return ['Y','T','c','Y','b','T','1'];
      case 'darkforest': return ['G','U','V','c','G','j','b'];
      case 'pines':      return ['Q','k','Q','2','Q','c'];
      case 'rocks':      return ['(',')','(','3','(','b'];
      case 'palms':      return ['O','3','O','c','O','1'];
      case 'hedge':      return ['h','c','h','1','h'];
      case 'birch':      return ['N','1','N','(','c','N'];
      case 'autumn':     return ['E','j','E','1','E','c'];
      default:           return ['Y','c','1'];
    }
  })();
  const W = CITY_W, H = CITY_H;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let inBorder = false;
      if (edges.north && y < thickness) inBorder = true;
      if (edges.south && y >= H - thickness) inBorder = true;
      if (edges.west  && x < thickness) inBorder = true;
      if (edges.east  && x >= W - thickness) inBorder = true;
      if (!inBorder) continue;
      // Don't overwrite edge transition tiles ('X').
      if (grid[y][x] === 'X') continue;
      // Hash position so the placement is deterministic but varied.
      const h = ((x * 73856093) ^ (y * 19349663) ^ (opts.seed || 0)) >>> 0;
      grid[y][x] = codes[h % codes.length];
    }
  }
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
    // Don't overwrite a corner tile that the previous pass already
    // set to 'X' - this previously wiped (0,0) when only north was
    // an edge but west wasn't, leaving the north edge corner as
    // fill (tree) and isolating the row-0 X strip.
    if (grid[y][0] !== 'X') putTile(grid, 0, y, cfg.edges && cfg.edges.west ? 'X' : fill);
    else if (cfg.edges && cfg.edges.west) putTile(grid, 0, y, 'X');
    if (grid[y][CITY_W - 1] !== 'X') putTile(grid, CITY_W - 1, y, cfg.edges && cfg.edges.east ? 'X' : fill);
    else if (cfg.edges && cfg.edges.east) putTile(grid, CITY_W - 1, y, 'X');
  }
  // Optional border ring of theme-appropriate flora/rocks/water.
  // Painted before the tree scatter so the scatter can dot the
  // interior without colliding with the dense edge.
  if (cfg.borderRing) applyBorderRing(grid, cfg.borderRing.kind || cfg.borderRing, cfg.borderRing.opts || cfg.borderRing);
  scatterTiles(grid, { on:fill, codes:cfg.trees || ['c','1'], rate:cfg.treeRate || 11, seed:cfg.seed || 1 });
  // PATH NETWORK is per-city now (was previously a hardcoded
  // skeleton that made every town feel identical). Each updateCity
  // call supplies its own cfg.paths + cfg.plazas; the legacy global
  // skeleton has been removed.
  if (cfg.paths) {
    for (const p of cfg.paths) carvePath(grid, p.points, p.code || pathCode, p.radius || 0);
  }
  if (cfg.plazas) {
    for (const pz of cfg.plazas) carveRect(grid, pz.x, pz.y, pz.w, pz.h, pz.code || pathCode);
  }
  if (cfg.features) {
    for (const f of cfg.features) carveRect(grid, f.x, f.y, f.w, f.h, f.code);
  }
  const hub = cfg.hub || [22, 17];
  if (cfg.buildings) {
    for (const b of cfg.buildings) stampBuilding(grid, b, pathCode, hub);
  }
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
      { x:14, y:6, dir:'down', sprite:'npc_girl', name:'MARKET LILA',
        dialog:["The tall grass north of town is full of wild creatures.","Step right up to LILA's stall!"],
        shop:{ greeting:["Welcome to LILA's stall!","Shore-pearl charms, fresh today."], extraItems:['wave_charm'] } }
    ],
    decorations:[
      { x:14, y:5, key:'produce_stall' }
    ],
    ambient: [
      { species:'nibblet',  x:8,  y:6,  range:2 },
      { species:'flitwing', x:15, y:11, range:2 },
      { species:'glimkit',  x:6,  y:12, range:2 },
      // Swimmers on the south-side water (paddle within their 5x5
      // water patch; the swim:true flag keeps them off ground tiles).
      { species:'duck',     x:26, y:26, range:2, swim:true },
      { species:'duck',     x:32, y:26, range:2, swim:true },
      { species:'swan',     x:38, y:26, range:2, swim:true }
    ],
    signs: {
      '3,11': "RODPORT TOWN - Where every adventure begins.",
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
        dialog:["Don't forget to save before bed, dear!","Adventures are tiring - rest when you can."] },
      { x:1, y:5, dir:'right', sprite:'npc_kid_girl', name:'NIECE LIA', wander:{ range:1 },
        dialog:["You have so many shoes! Are they all for hiking?"] },
      { x:5, y:5, dir:'left', sprite:'npc_old_woman', name:'AUNT LU', wander:{ range:1 },
        dialog:["Your mom's pies are the best in the region.","Shh, don't tell her I said that."] }
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
        dialog:["My brother BLAINE is at the lab.","He's always trying to outshine you!"] },
      { x:1, y:5, dir:'right', sprite:'npc_old_man_alt', name:'GRANDPA RIK', wander:{ range:1 },
        dialog:["BLAINE was always the competitive one.","Don't let him spook you."] },
      { x:5, y:5, dir:'left', sprite:'npc_kid_boy', name:'COUSIN TOMI', wander:{ range:1 },
        dialog:["Wanna trade? I've got a flat rock!","BLAINE says rocks aren't items but they ARE."] }
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
        dialog:["A POKEROD ball sits here..."] , ballSlot:1 },
      { x:7, y:6, dir:'left', sprite:'npc_scientist', name:'AIDE NEM', wander:{ range:1 },
        dialog:["I help PROF. ROD log POKEROD data.","Capture more species and the dex page lights up."] },
      { x:3, y:6, dir:'right', sprite:'clerk', name:'AIDE OREN', wander:{ range:1 },
        dialog:["The lab's been busy this season.","New trainers come through every week."] }
    ],
    doors: {
      '5,8': { to:'rodport', x:9, y:10 }
    }
  },

  route1: {
    id:'route1', name:'Route 1', weather:'overcast',
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
      '16,6': "ROUTE 1 - Tall grass hides wild creatures. Walk carefully."
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
      { x:14, y:7, dir:'down', sprite:'npc_girl', name:'GROCER',
        dialog:["BRINDALE TOWN!","The POKEROD CENTER on the left, MART on the right.","I run the produce stall - try a FARM LUNCH!"],
        shop:{ greeting:["Welcome to the GROCER's stall!","Country lunches and trail snacks."], extraItems:['farm_lunch'] } }
    ],
    decorations:[
      { x:14, y:6, key:'produce_stall' }
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
                  defeat:["A fine showing! Take this WAVE BADGE."] } },
      { x:1, y:6, dir:'right', sprite:'npc_swimmer_m', name:'SWIMMER FIN',
        dialog:["Wait your turn, kid. WAVE is mine first."],
        trainer:{ team:[['splashfin',10],['mistfin',11]], reward:280, defeat:["You're fast! Slick moves."] } },
      { x:7, y:6, dir:'left', sprite:'npc_youth', name:'STUDENT BO', wander:{ range:1 },
        dialog:["WAVE's WATER PULSE hits like a truck.","Bring an ELECTRIC partner if you can."] },
      { x:4, y:7, dir:'up', sprite:'npc_kid_girl', name:'CHEERLEADER PEN', wander:{ range:1 },
        dialog:["Go WAVE! Go WAVE!"] }
    ],
    doors: { '4,8': { to:'brindale', x:13, y:15 } }
  },


  pokecenter: {
    id:'pokecenter', name:'PokeRod Center', interior:true,
    tiles: [
      'BBBBBBBBB',
      'B}>>>>>}B',
      'BFFFF9FFB',
      'BFCCCFFFB',
      'BFCHCFFFB',
      'BF/FFFFFB',
      'B{FFFFF{B',
      'BBBBDBBBB'
    ],
    npcs: [
      { x:3, y:4, dir:'down', sprite:'nurse', name:'NURSE ROSY',
        dialog:["Welcome to the POKEROD CENTER!","Step up and I'll heal your team."],
        healer:true },
      { x:6, y:5, dir:'left', sprite:'npc_jogger', name:'JOGGER BIX', wander:{ range:1 },
        dialog:["Quick stop to top off my team.","Back on the road in five!"] },
      { x:3, y:6, dir:'up', sprite:'npc_old_man_alt', name:'GRAMPS WIL', wander:{ range:1 },
        dialog:["Centers were tougher in my day. Walked uphill both ways."] },
      { x:7, y:5, dir:'left', sprite:'npc_tourist', name:'TOURIST ELI', wander:{ range:1 },
        dialog:["Where am I? Oh - PokeRod CENTER. Free heal!"] }
    ],
    decorations: [
      { x:2, y:2, key:'pod_bed_left' },
      { x:3, y:2, key:'pod_healing_idle', anim:'pod' },
      { x:4, y:2, key:'pod_console' },
      { x:1, y:5, key:'rug_round_red' },
      { x:6, y:6, key:'lamp_floor_tall' },
      { x:5, y:6, key:'wall_clock_round' },
      { x:7, y:6, key:'display_glass_case' }
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
        shop:{ greeting:["Welcome to the BRINDALE MART!","How can I help you?"] } },
      { x:1, y:5, dir:'right', sprite:'npc_old_woman', name:'CUSTOMER LUC', wander:{ range:1 },
        dialog:["Are POTIONS on sale this week?","I can never decide between FRESH WATER and SODA POP."] },
      { x:9, y:5, dir:'left', sprite:'npc_dog_walker', name:'CUSTOMER PAT', wander:{ range:1 },
        dialog:["MAX REPEL - perfect for the long route ahead."] },
      { x:5, y:7, dir:'up', sprite:'npc_kid_boy', name:'KID FYN', wander:{ range:1 },
        dialog:["Mom said I could only get one CANDY. Just one!"] }
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
        dialog:["In my day, we walked uphill both ways through tall grass!","...and we liked it."] },
      { x:1, y:5, dir:'right', sprite:'npc_baker', name:'BAKER PEM', wander:{ range:1 },
        dialog:["I'm visiting from RODPORT. Such a quiet town!"] },
      { x:5, y:5, dir:'left', sprite:'npc_kid_girl', name:'GRAND-DAUGHTER LU', wander:{ range:1 },
        dialog:["Grandpa knows ALL the old routes!"] }
    ],
    doors: {
      '3,6': { to:'brindale', x:8, y:11 }
    }
  },

  route2: {
    id:'route2', name:'Route 2', weather:'sleet',
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
    id:'woodfall', name:'Woodfall Village', weather:'driving-rain',
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
        dialog:["Welcome to WOODFALL.","The slate-roofed building south is the WOODFALL GYM.","South of town, the trees thicken into PEBBLEWOOD."] },
      { x:10, y:9, dir:'down', sprite:'npc_old', name:'CARVER',
        dialog:["I carve totems from the windfall wood.","Each totem brings travelers a little luck."],
        shop:{ greeting:["The CARVER's stall.","Hand-shaped wooden charms."], extraItems:['wood_totem'] } }
    ],
    decorations:[
      { x:10, y:8, key:'craft_stall' }
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
                  defeat:["A clean win! The VERDE BADGE is yours."] } },
      { x:1, y:6, dir:'right', sprite:'npc_hiker_alt', name:'HIKER GIL',
        dialog:["FERN's GRASS team is no joke!"],
        trainer:{ team:[['nibblet',14],['pebra',15]], reward:480, defeat:["Tough match!"] } },
      { x:7, y:6, dir:'left', sprite:'npc_youth', name:'STUDENT TEY', wander:{ range:1 },
        dialog:["Bring FIRE moves. Or BUG. Or FLYING."] },
      { x:4, y:7, dir:'up', sprite:'npc_kid_boy', name:'KID NIM', wander:{ range:1 },
        dialog:["FERN gave me a SUNFLORA SEED!"] }
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
        healer:true },
      { x:6, y:5, dir:'left', sprite:'npc_construction', name:'WORKER YEN', wander:{ range:1 },
        dialog:["Long shift at the LODGE. Need a heal."] },
      { x:3, y:6, dir:'up', sprite:'npc_kid_girl', name:'KID ROSE', wander:{ range:1 },
        dialog:["My SPROUTLING fainted on the path home."] },
      { x:7, y:5, dir:'left', sprite:'npc_old_woman', name:'GRAN PEN', wander:{ range:1 },
        dialog:["NURSE PIPPA is so kind to my old PARTNER."] }
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
        shop:{ greeting:["Welcome to the WOODFALL MART!","How can I help you?"] } },
      { x:1, y:5, dir:'right', sprite:'npc_jogger', name:'CUSTOMER LIN', wander:{ range:1 },
        dialog:["Energy bars - aisle two!"] },
      { x:9, y:5, dir:'left', sprite:'npc_artist', name:'CUSTOMER POE', wander:{ range:1 },
        dialog:["Ink for sketches and ROD BALLS for catches."] },
      { x:5, y:7, dir:'up', sprite:'npc_old_man_alt', name:'OLD JEM', wander:{ range:1 },
        dialog:["A SUPER POTION costs HOW much these days?"] }
    ],
    doors: { '5,10': { to:'woodfall', x:12, y:6 } }
  },

  pebblewood: {
    id:'pebblewood', name:'Pebblewood Forest', weather:'light-rain',
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
    id:'crestrock', name:'Crestrock Town', weather:'hail',
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
      { x:14, y:8, dir:'down', sprite:'npc_girl', name:'TRADER',
        dialog:["CRESTROCK TOWN, gateway to HIGHSPIRE.","I trade alpine kits to climbers and trainers alike."],
        shop:{ greeting:["Welcome to the TRADER's stall!","Climber's kits and travel gear."], extraItems:['mountain_kit'] } }
    ],
    decorations:[
      { x:14, y:7, key:'craft_stall' }
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
                  defeat:["A solid win! The CRAG BADGE is yours."] } },
      { x:1, y:6, dir:'right', sprite:'npc_construction', name:'WORKER LANE',
        dialog:["Boss said no chiseling on the gym walls."],
        trainer:{ team:[['stoneworm',20],['pebra',21]], reward:780, defeat:["Tough as bedrock, you are."] } },
      { x:7, y:6, dir:'left', sprite:'npc_security', name:'GUARD MAR', wander:{ range:1 },
        dialog:["BOULDER doesn't like loud noises during matches."] },
      { x:4, y:7, dir:'up', sprite:'npc_kid_girl', name:'KID NIA', wander:{ range:1 },
        dialog:["I'll beat BOULDER someday!"] }
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
        healer:true },
      { x:6, y:5, dir:'left', sprite:'npc_cyclist', name:'CYCLIST DON', wander:{ range:1 },
        dialog:["Quick patch and I'm back on the climb."] },
      { x:3, y:6, dir:'up', sprite:'npc_construction', name:'BUILDER MEL', wander:{ range:1 },
        dialog:["Quarry dust gets into everything."] },
      { x:7, y:5, dir:'left', sprite:'npc_artist', name:'PAINTER VIA', wander:{ range:1 },
        dialog:["The cliff colors at sunset - painting them now."] }
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
        shop:{ greeting:["Climbing the highlands?","Stock up before you go!"] } },
      { x:1, y:5, dir:'right', sprite:'npc_hiker_alt', name:'CUSTOMER ULF', wander:{ range:1 },
        dialog:["I need MORE rope. The WALL is HIGHER than I expected."] },
      { x:9, y:5, dir:'left', sprite:'npc_paramedic', name:'CUSTOMER FAY', wander:{ range:1 },
        dialog:["I'm restocking REVIVES for the medic post."] },
      { x:5, y:7, dir:'up', sprite:'npc_journalist', name:'CUSTOMER REN', wander:{ range:1 },
        dialog:["Got film? I'm on a feature about CRESTROCK."] }
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
    id:'frostmere', name:'Frostmere Town', weather:'medium-snow',
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
      { x:14, y:8, dir:'down', sprite:'npc_old', name:'SNOW SAGE',
        dialog:["FROSTMERE is built around a frozen lake.","Step inside my tent - the cold does not wait."],
        shop:{ greeting:["The SNOW SAGE's tent.","Frost-cold charms, untouched by spring."], extraItems:['frost_charm'] } }
    ],
    decorations:[
      { x:14, y:7, key:'winter_tent' }
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
                  defeat:["A flawless win! The CHILL BADGE is yours."] } },
      { x:1, y:6, dir:'right', sprite:'npc_swimmer_f', name:'ICE SWIMMER ROW',
        dialog:["Brrrr! Try this!"],
        trainer:{ team:[['mistfin',24],['frostpup',25]], reward:1100, defeat:["You don't FREEZE!"] } },
      { x:7, y:6, dir:'left', sprite:'npc_kid_boy', name:'KID OWEN', wander:{ range:1 },
        dialog:["RIME's BLIZZARD made me cry once."] },
      { x:4, y:7, dir:'up', sprite:'npc_old_woman', name:'GRAN BEN', wander:{ range:1 },
        dialog:["RIME used to be my pupil!"] }
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
        healer:true },
      { x:6, y:5, dir:'left', sprite:'npc_hiker_alt', name:'CLIMBER ESS', wander:{ range:1 },
        dialog:["My team got hammered on the peak. Need a heal."] },
      { x:3, y:6, dir:'up', sprite:'npc_chef', name:'CHEF NIVA', wander:{ range:1 },
        dialog:["Soup helps - inside and out."] },
      { x:7, y:5, dir:'left', sprite:'npc_kid_girl', name:'KID JESS', wander:{ range:1 },
        dialog:["A SNOWOX is bigger up close than I thought!"] }
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
        shop:{ greeting:["Bundle up.","The mountain past here is unforgiving."] } },
      { x:1, y:5, dir:'right', sprite:'npc_paramedic', name:'CUSTOMER ASH', wander:{ range:1 },
        dialog:["FROSTBITE KIT, please. Two of them."] },
      { x:9, y:5, dir:'left', sprite:'npc_old_man_alt', name:'CUSTOMER VEM', wander:{ range:1 },
        dialog:["Can you point me to the SUPER POTIONS aisle?"] },
      { x:5, y:7, dir:'up', sprite:'npc_kid_boy', name:'KID NIK', wander:{ range:1 },
        dialog:["I want gummi-fish. Where are they?"] }
    ],
    doors: { '5,10': { to:'frostmere', x:12, y:6 } }
  },

  frostpeak: {
    id:'frostpeak', name:'Frostpeak', weather:'blizzard',
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
    id:'harborside', name:'Harborside Town', weather:'light-rain',
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
      { x:9, y:9, dir:'right', sprite:'npc_youth', name:'FISHMONGER',
        dialog:["HARBORSIDE - last stop before the SEAROUTE.","Pearls from the harbor today - want one?"],
        shop:{ greeting:["Welcome to the FISHMONGER's stall!","Dockside pearls, fresh off the boat."], extraItems:['pearl_bauble'] } }
    ],
    decorations:[
      { x:10, y:9, key:'fish_market_stall' }
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
                  defeat:["A clean sweep! The GUST BADGE is yours."] } },
      { x:1, y:6, dir:'right', sprite:'npc_swimmer_m', name:'TRAINEE NEX',
        dialog:["Wind in our wings!"],
        trainer:{ team:[['flitwing',28],['breezlet',29]], reward:1500, defeat:["You read the gusts well."] } },
      { x:7, y:6, dir:'left', sprite:'npc_journalist', name:'REPORTER FA', wander:{ range:1 },
        dialog:["I'm covering GALE's title defense."] },
      { x:4, y:7, dir:'up', sprite:'npc_kid_boy', name:'KID DEC', wander:{ range:1 },
        dialog:["Wow, you can battle GALE? You're brave!"] }
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
        healer:true },
      { x:6, y:5, dir:'left', sprite:'npc_swimmer_f', name:'DIVER NAV', wander:{ range:1 },
        dialog:["Currents got rough out there.","My team needs a quick rinse."] },
      { x:3, y:6, dir:'up', sprite:'npc_construction', name:'DOCKER LIN', wander:{ range:1 },
        dialog:["Cargo work all morning. Time for a rest."] },
      { x:7, y:5, dir:'left', sprite:'npc_kid_girl', name:'KID OLI', wander:{ range:1 },
        dialog:["My SPLASHFIN evolved into MISTFIN today!"] }
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
        shop:{ greeting:["Heading to the SEAROUTE?","Pack snacks. And maybe a swimsuit."] } },
      { x:1, y:5, dir:'right', sprite:'npc_tourist', name:'CUSTOMER UMA', wander:{ range:1 },
        dialog:["Sunscreen? You sell SUNSCREEN here?","Just a SUPER POTION. Got it."] },
      { x:9, y:5, dir:'left', sprite:'npc_businessman', name:'CUSTOMER VAL', wander:{ range:1 },
        dialog:["Charge it to the firm. The receipt, please."] },
      { x:5, y:7, dir:'up', sprite:'npc_dog_walker', name:'CUSTOMER ZAN', wander:{ range:1 },
        dialog:["MAX REPELS for me, KIBBLE for the dog."] }
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
    id:'summitvale', name:'Summitvale', weather:'overcast',
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
        dialog:["You climbed all the way to SUMMITVALE!","I am ROWE - the FIRE-typed CHAMPION.","If you've earned every other BADGE, I'll grant you the CINDER BADGE. If you can take it."],
        gymRequirement:{ minBadges:7 },
        gymLocked:["Earn all seven other BADGES first.","Only then will I face you."],
        trainer:{ team:[['emberkit',38],['flarebound',40],['magmaron',42],['infernarok',46]],
                  reward:5000,
                  defeat:["Magnificent! The CINDER BADGE - and the title of CHAMPION - are yours."] } },
      { x:5, y:13, dir:'down', sprite:'npc_old', name:'PEAK TRADER',
        dialog:["I climb down once a season.","My brews are distilled from peak air itself."],
        shop:{ greeting:["The PEAK TRADER's tent.","Summit brews for desperate trainers."], extraItems:['summit_brew'] } }
    ],
    decorations:[
      { x:5, y:12, key:'winter_tent' }
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
        healer:true },
      { x:6, y:5, dir:'left', sprite:'npc_doctor', name:'DR. KAY', wander:{ range:1 },
        dialog:["Champion-grade injuries. Be careful out there."] },
      { x:3, y:6, dir:'up', sprite:'npc_old_man_alt', name:'VETERAN GAR', wander:{ range:1 },
        dialog:["I once challenged ROWE. Lost in two minutes."] },
      { x:7, y:5, dir:'left', sprite:'npc_paramedic', name:'MEDIC PAS', wander:{ range:1 },
        dialog:["Stocking REVIVES for the title match."] }
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
               bonusTier:1 } },
      { x:1, y:5, dir:'right', sprite:'npc_doctor', name:'CUSTOMER LARS', wander:{ range:1 },
        dialog:["Two FULL RESTORES. Maybe three."] },
      { x:9, y:5, dir:'left', sprite:'npc_journalist', name:'CUSTOMER NAT', wander:{ range:1 },
        dialog:["Last gear-check before tomorrow's piece."] },
      { x:5, y:7, dir:'up', sprite:'npc_kid_girl', name:'KID FENN', wander:{ range:1 },
        dialog:["Mom said I could pick ONE souvenir.","I want them ALL."] }
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
        dialog:["I came from RODPORT too!","Funny how the road home is always longer than you remember."] },
      { x:1, y:5, dir:'right', sprite:'npc_old_man_alt', name:'GRAMPS WICK', wander:{ range:1 },
        dialog:["You earned every BADGE? Bah - in MY day..."] },
      { x:5, y:5, dir:'left', sprite:'npc_kid_boy', name:'KID FERN', wander:{ range:1 },
        dialog:["Will you sign my POKEDEX, hero?"] }
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
    id:'beach', name:'Sunkissed Beach', weather:'hurricane',
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
    id:'mountain', name:'Highspire Mountain', weather:'thunder',
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
        dialog:["I am VOLTA, leader of the HIGHSPIRE GYM.","The mountain crackles with electric storms - and so does my team!"],
        gymRequirement:{ minBadges:3 },
        gymLocked:["The path here is steep - earn at least three BADGES first.","Then we'll see if you can ride the lightning."],
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
        ] },
      { x:13, y:11, dir:'down', sprite:'npc_dog_walker', name:'FARMHAND ROO', wander:{ range:1 },
        dialog:["Feeding time goes from dawn till dusk.","Some of the rarer ones are picky eaters."] },
      { x:14, y:15, dir:'up', sprite:'npc_kid_girl', name:'VISITOR LEN', wander:{ range:1 },
        dialog:["Look how many types live here!","I want to see EVERY single one."] }
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
    map.decorations = cfg.decorations || [];
    map.birds = cfg.birds || [];
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
    map.decorations = cfg.decorations || [];
    map.birds = cfg.birds || [];
    if (cfg.encounters) map.encounters = cfg.encounters;
    if (cfg.encounterZones) map.encounterZones = cfg.encounterZones;
    map.doors = {};
    for (const d of cfg.doors || []) map.doors[d.x + ',' + d.y] = { to:d.to, x:d.tx, y:d.ty };
    if (cfg.weather) map.weather = cfg.weather;
  }

  // RODPORT - coastal starter village. Linear east-west layout
  // hugging a harbor, with a wooden pier and lighthouse landmark on
  // the east side. Forest border on the north + west.
  const rodportBuildings = [
    { x:3,  y:6,  w:7, roof:'+', wall:'@', to:'player_house', tx:3, ty:6 },
    { x:12, y:6,  w:7, roof:'-', wall:'@', to:'rival_house',  tx:3, ty:6 },
    { x:22, y:5,  w:10, doorOffset:4, roof:'P', wall:'B', doorTile:'D', to:'lab', tx:5, ty:8 },
    { x:5,  y:18, w:8, doorOffset:3, roof:'=', wall:'$', to:'rodport_dockhouse', tx:5, ty:7 },
    { x:14, y:18, w:8, doorOffset:3, roof:'&', wall:'#', to:'rodport_boathouse', tx:5, ty:7 }
  ];
  updateCity('rodport', {
    fill:'Y', pathCode:'_', trees:['K','c','1','e'], seed:3,
    treeRate:14,
    edges:{ south:true, west:true },
    borderRing:{ kind:'forest', thickness:2, edges:{ north:true, west:true }, seed:3 },
    buildings:rodportBuildings,
    paths:[
      // Cottage row in front of houses (y=11) east-west.
      { points:[[2,11],[31,11]], radius:1 },
      // Spurs from each cottage door down to cottage row.
      { points:[[6,9],[6,11]], radius:0 },
      { points:[[15,9],[15,11]], radius:0 },
      { points:[[26,8],[26,11]], radius:0 },
      // Main north-south boulevard to the south exit.
      { points:[[22,11],[22,33]], radius:1 },
      // East-west connector through hub at y=17 (links west edge to spine).
      { points:[[1,17],[22,17]], radius:1 },
      // East-west boardwalk along the dock row (y=23).
      { points:[[3,23],[28,23]], radius:1, code:'t' },
      // Dockhouse door spurs.
      { points:[[8,22],[8,23]], radius:0 },
      { points:[[17,22],[17,23]], radius:0 },
      // Pier extending east into the water.
      { points:[[28,23],[36,23]], radius:1, code:'t' },
      // Connector from cottage row to harbor walk (via spine).
      { points:[[22,11],[22,23]], radius:1 }
    ],
    plazas:[
      // Welcome plaza in front of the lab.
      { x:22, y:13, w:6, h:5, code:'_' },
      // Cottage front yards.
      { x:3, y:10, w:7, h:1, code:'_' },
      { x:12, y:10, w:7, h:1, code:'_' }
    ],
    features:[
      // Harbor water - east half of the lower map (clear of column 22 spine).
      { x:25, y:25, w:17, h:7, code:'W' },
      // Western harbor pocket (leaves col 0..1 clear for west edge).
      { x:2,  y:28, w:14, h:4, code:'W' },
      // Sandy beach strip just above the water.
      { x:2,  y:25, w:14, h:3, code:'s' },
      { x:25, y:24, w:17, h:1, code:'s' },
      // Decorative gardens between cottages.
      { x:11, y:13, w:1, h:3, code:"'" },
      { x:20, y:13, w:1, h:3, code:"'" },
      // A bit of grass-flower variety along the cottage row.
      { x:1,  y:13, w:2, h:3, code:'1' }
    ],
    extraTiles:[
      // Sign post locations get tile code 'S' from updateCity using cfg.signs.
    ],
    signs:{
      '22,15': 'RODPORT TOWN - Harbor, lab, and first steps.',
      '2,11': 'The desert road loops back here after six BADGES.'
    },
    npcs:[
      { x:25, y:11, dir:'down', sprite:'npc_oak', name:'PROF. ROD',
        dialog:["Welcome to the world of POKEROD!","My lab is bigger now, but the adventure still starts with one partner."] },
      { x:13, y:11, dir:'down', sprite:'npc_girl', name:'LILA',
        dialog:["The new harbor paths all bend back to the plaza.","If you get turned around, follow the cobbles."] },
      { x:30, y:23, dir:'left', sprite:'npc_youth', name:'DOCKHAND REN',
        dialog:["We keep spare ROD BALL crates by the pier.","The sea breeze makes every route feel longer."] },
      { x:22, y:14, dir:'down',  sprite:'npc_construction', name:'FOREMAN GUS', wander:{ range:2 },
        dialog:["The plaza got new pavers last week.","Watch your step around the wet cement."] },
      { x:22, y:25, dir:'down',  sprite:'npc_tourist',      name:'TOURIST POE', wander:{ range:1 },
        dialog:["First time visiting RODPORT! The harbor is gorgeous!","Did you know they brew salt-taffy down at the pier?"] },
      { x:18, y:11, dir:'right', sprite:'npc_jogger',       name:'JOGGER ANNE', wander:{ range:2 },
        dialog:["Nice morning for laps along the cottage row!"],
        trainer:{ team:[['nibblet',5]], reward:120, defeat:["You keep up better than I expected!"] } },
      { x:9,  y:11, dir:'right', sprite:'npc_dog_walker',   name:'WALKER SAM', wander:{ range:2 },
        dialog:["MOCHA pulls toward every other PARTNER we pass."] },
      { x:11, y:23, dir:'right', sprite:'npc_kid_boy',      name:'KID NOAH', wander:{ range:1 },
        dialog:["I want to be a TRAINER like you!"],
        trainer:{ team:[['flitwing',4],['nibblet',5]], reward:160, defeat:["I'll train harder!"] } },
      { x:25, y:23, dir:'left',  sprite:'npc_kid_girl',     name:'KID MIRA', wander:{ range:1 },
        dialog:["Catch! ...wait, that was just a leaf."] },
      { x:22, y:18, dir:'down', sprite:'npc_journalist',    name:'REPORTER KAY', wander:{ range:1 },
        dialog:["Mind a quick photo for the GAZETTE?","Smile! ...okay maybe later."] },
      { x:5,  y:23, dir:'right', sprite:'npc_baker',        name:'BAKER PIPPA', wander:{ range:1 },
        dialog:["The fresh shell-bread comes out at noon.","BAKERY's just up the path - turn at the lamppost."] }
    ],
    decorations:[
      // LIGHTHOUSE LANDMARK at the east edge of the pier (3 tiles tall).
      { x:36, y:21, key:'lighthouse_top' },
      { x:36, y:22, key:'lighthouse_tower' },
      { x:36, y:23, key:'lighthouse_base' },
      // Anchor + barrel cluster at the dock entrance.
      { x:24, y:23, key:'anchor' },
      // Ornate streetlamps lining the cottage row.
      { x:11, y:11, key:'streetlamp_ornate_double' },
      { x:30, y:11, key:'streetlamp_ornate_double' },
      // Lab plaza decor.
      { x:21, y:14, key:'planter_flowerbed_oval' },
      { x:28, y:14, key:'planter_flowerbed_oval' },
      { x:21, y:17, key:'bench_park_brown' },
      { x:28, y:17, key:'bench_park_brown' },
      { x:24, y:14, key:'water_fountain_round' },
      // Cottage-front pots - placed in the gaps between cottages
      // (not directly under walls) so they read as garden bouquets
      // instead of items glued to the building.
      { x:10, y:11, key:'pot_terracotta_red' },
      { x:11, y:11, key:'pot_painted_yellow' },
      { x:19, y:11, key:'pot_painted_yellow' },
      { x:20, y:11, key:'pot_terracotta_red' },
      // Pier oil lamps.
      { x:28, y:22, key:'lamp_oil_brass' },
      { x:32, y:22, key:'lamp_oil_brass' },
      // Bench under the cottage row tree.
      { x:18, y:13, key:'bench_marble_white' },
      // Dockyard trash + crate (we use trash_grey_lid as a crate stand-in).
      { x:14, y:23, key:'trash_grey_lid' },
      { x:27, y:23, key:'trash_blue_recycle' }
    ],
    ambient:[
      { species:'nibblet', x:16, y:13, range:2 },
      { species:'flitwing', x:34, y:29, range:2 },
      { species:'glimkit', x:7, y:23, range:2 },
      { species:'chicken', x:14, y:14, range:6 },
      { species:'chicken', x:24, y:18, range:6 },
      { species:'chicken', x:11, y:23, range:6 }
    ],
    birds:[
      // Home positions chosen near roof tiles or tree clusters.
      { kind:'sparrow', x:6,  y:6,  range:8 }, // player_house roof
      { kind:'sparrow', x:15, y:6,  range:8 }, // rival_house roof
      { kind:'pigeon',  x:25, y:5,  range:8 }, // lab roof
      { kind:'pigeon',  x:36, y:21, range:8 }, // lighthouse top
      { kind:'crow',    x:1,  y:3,  range:10 } // forest border
    ],
    edgeDefs:{
      west:{ x:0, to:'desert', tx:46, ty:20, gate:{ minBadges:6, message:'The desert loop is too harsh without six BADGES.' } },
      south:{ y:33, to:'route1', tx:24, ty:1 }
    }
  });

  // BRINDALE - concentric garden city. Buildings ring a central
  // fountain plaza. Cherry-arch landmarks frame the north/south
  // entrances. Hedge border for a formal-garden feel.
  const brindaleBuildings = [
    { x:4,  y:4,  w:7, roof:'P', wall:'B', doorTile:'D', to:'pokecenter', tx:4, ty:6 },
    { x:33, y:4,  w:7, roof:'M', wall:'$', doorTile:'f', to:'mart', tx:5, ty:9 },
    { x:31, y:14, w:9, roof:'-', wall:'!', to:'brindale_school', tx:5, ty:7 },
    { x:4,  y:14, w:7, roof:'=', wall:'$', to:'townhouse', tx:3, ty:6 },
    { x:18, y:24, w:9, roof:'&', wall:'B', doorTile:'D', to:'brindale_gym', tx:4, ty:7 }
  ];
  updateCity('brindale', {
    fill:'K', pathCode:'p', trees:['c','1','e','K'], seed:7,
    treeRate:18,
    edges:{ north:true, south:true },
    borderRing:{ kind:'hedge', thickness:2, edges:{ east:true, west:true }, seed:7 },
    buildings:brindaleBuildings,
    paths:[
      // Outer ring road (rectangular boundary).
      { points:[[7,11],[35,11]], radius:1 },     // top edge
      { points:[[35,11],[35,22]], radius:1 },    // right edge
      { points:[[7,22],[35,22]], radius:1 },     // bottom edge
      { points:[[7,11],[7,22]], radius:1 },      // left edge
      // North entrance from route1.
      { points:[[22,0],[22,11]], radius:1 },
      // South entrance to route2 (passes through gym plaza).
      { points:[[22,22],[22,33]], radius:1 },
      // East-west cross diameter through fountain.
      { points:[[7,17],[35,17]], radius:1 },
      // Building door spurs.
      { points:[[7,8],[7,11]], radius:0 },       // pokecenter
      { points:[[36,8],[36,11]], radius:0 },     // mart
      { points:[[7,18],[7,17]], radius:0 },      // townhouse
      { points:[[35,18],[35,17]], radius:0 },    // school
      { points:[[22,23],[22,22]], radius:0 }     // gym
    ],
    plazas:[
      // Central round-ish plaza around the fountain.
      { x:18, y:14, w:9, h:7, code:'p' },
      // Inner ring stone plaza of cobble.
      { x:20, y:16, w:5, h:3, code:'_' }
    ],
    features:[
      // Heart-shaped flowerbed wings around the fountain.
      { x:14, y:14, w:3, h:3, code:"'" },
      { x:28, y:14, w:3, h:3, code:"'" },
      { x:14, y:18, w:3, h:3, code:"'" },
      { x:28, y:18, w:3, h:3, code:"'" },
      // Long flowerbed along south path (clear of column 21..23 spine).
      { x:18, y:25, w:3, h:5, code:"'" },
      { x:25, y:25, w:3, h:5, code:"'" },
      // Cherry-bush thickets framing the entrances (clear of col 21..23).
      { x:14, y:5, w:6, h:3, code:'c' },
      { x:24, y:5, w:6, h:3, code:'c' }
    ],
    signs:{ '20,9':'BRINDALE CITY - Gardens, school, Center, Mart, and Gym.' },
    npcs:[
      { x:22, y:18, dir:'down', sprite:'npc_girl', name:'BRINDALE GUIDE',
        dialog:["BRINDALE has grown into a real garden city.","The Gym is tucked into the southern courtyard."] },
      { x:33, y:11, dir:'down', sprite:'npc_youth', name:'SCHOOL KID NEM',
        dialog:["Trainer school says Great Balls show up earlier now.","I wrote that down twice."] },
      { x:11, y:17, dir:'right', sprite:'npc_old', name:'GARDENER ELI',
        dialog:["Every flowerbed is a tiny route if you walk slowly enough."] },
      { x:22, y:5,  dir:'down',  sprite:'npc_teacher',     name:'TEACHER ROSALIE', wander:{ range:2 },
        dialog:["Every PARTNER learns a move at the right time.","Don't rush evolution - read the chapter twice."] },
      { x:22, y:11, dir:'down',  sprite:'npc_librarian',   name:'LIBRARIAN ED', wander:{ range:1 },
        dialog:["The Brindale archives have a whole shelf on TM moves.","Quiet, please. We've got reading hours."] },
      { x:18, y:17, dir:'right', sprite:'npc_dancer',      name:'DANCER BREE', wander:{ range:1 },
        dialog:["Watch this combo! TWIRL, TWIRL, BATTLE!"],
        trainer:{ team:[['glimkit',10],['flitwing',11]], reward:300, defeat:["I left my ribbon at the dojo!"] } },
      { x:26, y:17, dir:'left',  sprite:'npc_punk',        name:'PUNK ZED', wander:{ range:1 },
        dialog:["You don't look so tough."],
        trainer:{ team:[['nibblet',11],['cinderpup',12]], reward:340, defeat:["Tch. Lucky."] } },
      { x:18, y:25, dir:'right', sprite:'npc_artist',      name:'ARTIST ROSAMUND', wander:{ range:1 },
        dialog:["The garden lighting at sunset is divine.","Hold still! The portrait would suit you."] },
      { x:26, y:25, dir:'left',  sprite:'npc_kid_girl',    name:'KID NORA', wander:{ range:1 },
        dialog:["My brother thinks GLIMKIT are scary. They're so cute!"] },
      { x:33, y:17, dir:'left',  sprite:'npc_dog_walker',  name:'WALKER YAEL', wander:{ range:1 },
        dialog:["BRUNO, drop the FLOWER. I said DROP."] }
    ],
    decorations:[
      // CHERRY ARCH at the north entrance - the iconic landmark.
      { x:21, y:9, key:'cherry_arch' },
      // Central fountain in the plaza heart.
      { x:22, y:17, key:'water_fountain_round' },
      // Marble corner statues framing the fountain.
      { x:19, y:14, key:'pedestal_statue' },
      { x:25, y:14, key:'pedestal_statue' },
      // Garden lamps at the four ring-road corners.
      { x:7,  y:11, key:'lamp_ornate_gold' },
      { x:35, y:11, key:'lamp_ornate_gold' },
      { x:7,  y:22, key:'streetlamp_ornate_double' },
      { x:35, y:22, key:'streetlamp_ornate_double' },
      // Iron benches around the central plaza.
      { x:19, y:19, key:'bench_garden_iron' },
      { x:25, y:19, key:'bench_garden_iron' },
      // Marble benches along the cross diameter.
      { x:11, y:18, key:'bench_marble_white' },
      { x:31, y:18, key:'bench_marble_white' },
      // Topiary hedge planters.
      { x:14, y:11, key:'planter_hedge_round' },
      { x:28, y:11, key:'planter_hedge_round' },
      { x:14, y:22, key:'planter_hedge_round' },
      { x:28, y:22, key:'planter_hedge_round' },
      // Flowerpot pairs along the entrance path.
      { x:21, y:5,  key:'pot_painted_yellow' },
      { x:23, y:5,  key:'pot_painted_yellow' },
      // Wicker bins.
      { x:11, y:11, key:'trash_basket_wicker' },
      { x:31, y:11, key:'trash_basket_wicker' }
    ],
    ambient:[
      { species:'glimkit', x:12, y:16, range:2 },
      { species:'splashfin', x:31, y:14, range:2 },
      { species:'nibblet', x:8, y:24, range:2 },
      { species:'chicken', x:14, y:18, range:6 },
      { species:'chicken', x:28, y:18, range:6 },
      { species:'chicken', x:22, y:25, range:6 }
    ],
    birds:[
      { kind:'sparrow', x:7,  y:5,  range:8 },
      { kind:'sparrow', x:36, y:5,  range:8 },
      { kind:'pigeon',  x:7,  y:14, range:8 },
      { kind:'pigeon',  x:36, y:14, range:8 },
      { kind:'crow',    x:22, y:24, range:10 }
    ],
    edgeDefs:{
      north:{ y:0, to:'route1', tx:24, ty:36 },
      south:{ y:33, to:'route2', tx:24, ty:1 }
    }
  });

  // WOODFALL - winding forest village. Curved mossy paths weave
  // around a giant ancient oak landmark in the center. Torii gate
  // marks the north entrance. Dense ancient-tree border.
  const woodfallBuildings = [
    { x:5,  y:6,  w:7, roof:'P', wall:'B', doorTile:'D', to:'woodfall_center', tx:4, ty:6 },
    { x:31, y:6,  w:7, roof:'M', wall:'?', doorTile:'f', to:'woodfall_mart', tx:5, ty:9 },
    { x:33, y:18, w:8, roof:'8', wall:'?', to:'woodfall_lodge', tx:5, ty:7 },
    { x:3,  y:18, w:8, roof:'7', wall:'?', to:'woodfall_cabin', tx:5, ty:7 },
    { x:18, y:24, w:9, roof:'&', wall:'B', doorTile:'D', to:'woodfall_gym', tx:4, ty:7 }
  ];
  updateCity('woodfall', {
    fill:'G', pathCode:'z', trees:['U','V','4','n'], seed:4,
    treeRate:20,
    edges:{ north:true, south:true },
    borderRing:{ kind:'darkforest', thickness:2, edges:{ east:true, west:true }, seed:4 },
    buildings:woodfallBuildings,
    paths:[
      // Curved spine from north to south, jogging around the central oak.
      { points:[[22,0],[22,8],[18,12],[22,16],[26,20],[22,24],[22,33]], radius:1 },
      // Curved east-west cross route, also bending around oak.
      { points:[[0,17],[8,17],[12,14],[18,14],[18,20],[26,20],[30,17],[43,17]], radius:1 },
      // Door spurs.
      { points:[[8,9],[8,12]], radius:0 },       // center
      { points:[[34,9],[34,12]], radius:0 },     // mart
      { points:[[6,17],[6,22]], radius:0 },      // cabin (extended to y=22)
      { points:[[36,17],[36,22]], radius:0 },    // lodge (extended to y=22)
      { points:[[22,23],[22,28]], radius:0 }     // gym (extended to y=28)
    ],
    plazas:[
      // Small mossy clearing in front of the gym.
      { x:18, y:21, w:9, h:3, code:'z' },
      // Open glade by the cabin.
      { x:11, y:18, w:3, h:5, code:'z' }
    ],
    features:[
      // Lush grass patches around the village.
      { x:13, y:7, w:5, h:3, code:'4' },
      { x:26, y:9, w:5, h:3, code:'4' },
      { x:14, y:27, w:7, h:3, code:'4' },
      // Purple flower patch.
      { x:27, y:27, w:5, h:3, code:'m' },
      // Mossy stones along the path.
      { x:14, y:13, w:1, h:1, code:'(' },
      { x:28, y:13, w:1, h:1, code:'(' }
    ],
    signs:{ '20,9':'WOODFALL - Cabins under the old canopy.' },
    npcs:[
      { x:22, y:12, dir:'down', sprite:'npc_old', name:'WOODFALL ELDER',
        dialog:["The village paths twist with the roots now.","South of town, PEBBLEWOOD has deeper side trails."] },
      { x:30, y:17, dir:'left', sprite:'npc_girl', name:'FORAGER MIA',
        dialog:["A forest cavern opened near PEBBLEWOOD.","Cavern Balls work nicely in places like that."] },
      { x:11, y:21, dir:'up', sprite:'npc_youth', name:'CABIN KID SOL',
        dialog:["I counted five different roofs from my porch!"] },
      { x:22, y:5,  dir:'down',  sprite:'npc_hiker_alt',   name:'HIKER VAL', wander:{ range:2 },
        dialog:["The northern trail is easier than it looks."],
        trainer:{ team:[['fernsprout',16],['pebra',15]], reward:520, defeat:["Catch your breath - I will too!"] } },
      { x:14, y:14, dir:'down', sprite:'npc_artist',      name:'CARVER LIN', wander:{ range:1 },
        dialog:["I carve charm-totems from fallen wood.","Each design tells a story of the forest."] },
      { x:28, y:20, dir:'left',  sprite:'npc_dog_walker',  name:'WALKER OREN', wander:{ range:1 },
        dialog:["RUFUS sniffs out berry bushes for me."] },
      // Moved off (22,25) - the gym building's central path runs straight
      // through that tile (z `path_moss` carved across the roof footprint
      // for visual continuity), so Mae sat on the corridor leading down
      // to the gym door at (22,27). With wander she'd drift to (22,26),
      // visually obscuring the door entrance for any approaching player.
      // (10,22) puts her on the main east-west moss thoroughfare in the
      // village square - a sensible spot for a jogger and clearly off
      // the gym's entry path.
      { x:10, y:22, dir:'right', sprite:'npc_jogger',      name:'TRAILRUNNER MAE', wander:{ range:1 },
        dialog:["Cross-country, twenty kilometers a day!"],
        trainer:{ team:[['flitwing',15],['nibblet',16],['pebra',16]], reward:560, defeat:["Wow! You set the new record!"] } },
      { x:18, y:23, dir:'right', sprite:'npc_kid_boy',     name:'KID PIP', wander:{ range:1 },
        dialog:["Look! A SPROUTLING in the bushes!","...okay, it's a leaf again."] },
      { x:35, y:17, dir:'left',  sprite:'npc_construction', name:'BUILDER GERM', wander:{ range:1 },
        dialog:["Lodge expansion's almost done.","They want a third floor next month."] },
      { x:5,  y:17, dir:'right', sprite:'npc_journalist',  name:'JOURNALIST RU', wander:{ range:1 },
        dialog:["WOODFALL Gazette - any wildlife sightings?","I've seen a SPROUTLING evolve before. Magic."] }
    ],
    decorations:[
      // TORII GATE marking the north entrance.
      { x:21, y:4, key:'torii_gate' },
      // ANCIENT OAK landmark in the central glade (2 tiles tall).
      { x:21, y:16, key:'ancient_oak_top' },
      { x:21, y:17, key:'ancient_oak_bot' },
      // Paper lanterns along the curved path.
      { x:14, y:14, key:'lamp_paper_lantern' },
      { x:28, y:14, key:'lamp_paper_lantern' },
      { x:18, y:21, key:'lamp_paper_lantern' },
      { x:26, y:21, key:'lamp_paper_lantern' },
      // Log benches near the oak.
      { x:18, y:17, key:'bench_log' },
      { x:25, y:17, key:'bench_log' },
      // Zen stone planters around the oak base.
      { x:19, y:19, key:'planter_zen_stone' },
      { x:23, y:19, key:'planter_zen_stone' },
      // Forest pots and lilies.
      { x:11, y:13, key:'pot_succulent_small' },
      { x:31, y:13, key:'pot_succulent_small' },
      { x:11, y:21, key:'pot_tall_lily' },
      { x:31, y:21, key:'pot_tall_lily' },
      // South-end log bench under the gym wall.
      { x:18, y:23, key:'bench_log' },
      { x:26, y:23, key:'bench_log' },
      // Wicker bins.
      { x:8,  y:17, key:'trash_basket_wicker' },
      { x:34, y:17, key:'trash_basket_wicker' }
    ],
    ambient:[
      { species:'sproutling', x:8, y:14, range:3 },
      { species:'crawlbug', x:33, y:16, range:2 },
      { species:'fernsprout', x:18, y:27, range:2 },
      { species:'chicken', x:14, y:14, range:6 },
      { species:'chicken', x:28, y:14, range:6 },
      { species:'chicken', x:22, y:21, range:6 }
    ],
    birds:[
      { kind:'sparrow', x:8,  y:6,  range:8 },
      { kind:'pigeon',  x:34, y:6,  range:8 },
      { kind:'pigeon',  x:21, y:16, range:8 }, // ancient oak top
      { kind:'crow',    x:36, y:18, range:10 },
      { kind:'sparrow', x:6,  y:18, range:8 }
    ],
    edgeDefs:{
      north:{ y:0, to:'route2', tx:24, ty:36 },
      south:{ y:33, to:'pebblewood', tx:24, ty:1 }
    }
  });

  // CRESTROCK - terraced rocky town. Two-tier layout connected by a
  // gravel staircase. Meteor pedestal landmark in the central plaza.
  // Mining cart on rails near the workshop. Rocks border on most sides.
  const crestrockBuildings = [
    { x:4,  y:4,  w:7, roof:'P', wall:'B', doorTile:'D', to:'crestrock_center', tx:4, ty:6 },
    { x:14, y:4,  w:7, roof:'M', wall:'#', doorTile:'f', to:'crestrock_mart', tx:5, ty:9 },
    { x:30, y:4,  w:9, roof:'=', wall:'#', to:'crestrock_workshop', tx:5, ty:7 },
    { x:6,  y:22, w:8, roof:'&', wall:'#', to:'crestrock_house', tx:5, ty:7 },
    { x:24, y:22, w:9, roof:'&', wall:'B', doorTile:'D', to:'crestrock_gym', tx:4, ty:7 }
  ];
  updateCity('crestrock', {
    fill:'V', pathCode:'v', trees:['2','(',')','V'], seed:10,
    treeRate:14,
    edges:{ north:true, east:true, south:true },
    borderRing:{ kind:'rocks', thickness:2, edges:{ west:true, east:true }, seed:10 },
    buildings:crestrockBuildings,
    paths:[
      // Upper terrace - shop row east-west.
      { points:[[2,11],[42,11]], radius:1 },
      // Building door spurs (upper).
      { points:[[7,8],[7,11]], radius:0 },
      { points:[[17,8],[17,11]], radius:0 },
      { points:[[34,8],[34,11]], radius:0 },
      // Staircase (gravel) connecting upper to lower terrace.
      { points:[[22,11],[22,21]], radius:1, code:';' },
      // Lower terrace - gym row.
      { points:[[2,21],[42,21]], radius:1 },
      // Door spurs (lower) - extended down to building exits.
      { points:[[9,21],[9,26]], radius:0 },
      { points:[[28,21],[28,26]], radius:0 },
      // North entrance from pebblewood.
      { points:[[22,0],[22,11]], radius:1 },
      // South exit to glimcavern.
      { points:[[22,29],[22,33]], radius:1 },
      // East exit to mountain (y=17 to match edgeDef target).
      { points:[[36,17],[43,17]], radius:1 }
    ],
    plazas:[
      // Plaza around the meteor pedestal.
      { x:18, y:14, w:9, h:5, code:'v' },
      // Wider stair landing in the middle.
      { x:21, y:15, w:3, h:3, code:';' }
    ],
    features:[
      // Quarry / rock outcrops.
      { x:3,  y:13, w:5, h:6, code:'(' },
      { x:36, y:13, w:5, h:6, code:'(' },
      // Workshop yard (gravel).
      { x:31, y:13, w:5, h:3, code:';' },
      // Big rock formations in the southern fringe.
      { x:14, y:27, w:3, h:2, code:')' },
      { x:27, y:27, w:3, h:2, code:')' }
    ],
    signs:{ '20,9':'CRESTROCK - Terraces, workshops, and the Highspire gate.' },
    npcs:[
      { x:22, y:16, dir:'down', sprite:'npc_girl', name:'CRESTROCK GUIDE',
        dialog:["The east switchback reaches HIGHSPIRE.","The south gate drops into GLIMCAVERN."] },
      { x:34, y:11, dir:'down', sprite:'npc_old', name:'MINER OREN',
        dialog:["We carved more bends into the roads than the mountain asked for."] },
      { x:11, y:21, dir:'up', sprite:'npc_youth', name:'WORKSHOP KAI',
        dialog:["Quick Balls are best before a wild Pokerod gets its bearings."] },
      { x:22, y:5,  dir:'down',  sprite:'npc_construction', name:'FOREMAN PIKE', wander:{ range:2 },
        dialog:["Stone needs to settle before we lay paths."],
        trainer:{ team:[['pebra',22],['boulderon',23]], reward:920, defeat:["Sturdy! Like real CRESTROCK stone."] } },
      { x:22, y:11, dir:'down',  sprite:'npc_security',     name:'GUARD VANCE', wander:{ range:1 },
        dialog:["I'm watching for ROCK SLIDES.","HIGHSPIRE gate is open if you've earned it."] },
      { x:19, y:16, dir:'right', sprite:'npc_cyclist',      name:'CYCLIST CRU', wander:{ range:1 },
        dialog:["Switchbacks are murder on the legs!"],
        trainer:{ team:[['voltkit',22],['flitwing',23]], reward:880, defeat:["Phew! Need a cooldown."] } },
      { x:25, y:16, dir:'left',  sprite:'npc_paramedic',    name:'MEDIC TARA', wander:{ range:1 },
        dialog:["Tourists try to climb the cliffs barehanded.","Take MAX REVIVES with you."] },
      { x:18, y:21, dir:'right', sprite:'npc_artist',       name:'PAINTER DAR', wander:{ range:1 },
        dialog:["These cliffs in dawn light - poetry."] },
      { x:30, y:21, dir:'left',  sprite:'npc_journalist',   name:'REPORTER NEV', wander:{ range:1 },
        dialog:["The mountain's still got secrets we haven't filed."] },
      { x:39, y:11, dir:'left',  sprite:'npc_dog_walker',   name:'WALKER ROXY', wander:{ range:1 },
        dialog:["TRACE loves the high passes."] }
    ],
    decorations:[
      // METEOR PEDESTAL landmark in the central plaza.
      { x:22, y:17, key:'meteor_pedestal' },
      // MINING CART near the workshop.
      { x:36, y:11, key:'mining_cart' },
      // Modern chrome lamps along the upper terrace.
      { x:11, y:11, key:'lamp_modern_chrome' },
      { x:31, y:11, key:'lamp_modern_chrome' },
      // Ornate streetlamps along the lower terrace.
      { x:11, y:21, key:'streetlamp_ornate_double' },
      { x:31, y:21, key:'streetlamp_ornate_double' },
      // Stone benches around the meteor pedestal.
      { x:19, y:18, key:'bench_stone_grey' },
      { x:25, y:18, key:'bench_stone_grey' },
      { x:19, y:14, key:'bench_stone_grey' },
      { x:25, y:14, key:'bench_stone_grey' },
      // Zen stone planters at the upper terrace corners.
      { x:14, y:11, key:'planter_zen_stone' },
      { x:28, y:11, key:'planter_zen_stone' },
      // Terracotta pot pairs lining the staircase.
      { x:21, y:13, key:'pot_terracotta_red' },
      { x:23, y:13, key:'pot_terracotta_red' },
      { x:21, y:19, key:'pot_terracotta_red' },
      { x:23, y:19, key:'pot_terracotta_red' },
      // Industrial dumpster + bins near the workshop yard.
      { x:30, y:14, key:'trash_dumpster' },
      { x:38, y:11, key:'trash_grey_lid' },
      // Raised wooden planters on the lower terrace.
      { x:14, y:21, key:'planter_raised_wood' },
      { x:28, y:21, key:'planter_raised_wood' }
    ],
    ambient:[
      { species:'pebra', x:9, y:14, range:2 },
      { species:'geistmite', x:32, y:16, range:2 },
      { species:'voltkit', x:14, y:25, range:2 },
      { species:'chicken', x:18, y:14, range:6 },
      { species:'chicken', x:18, y:21, range:6 },
      { species:'chicken', x:28, y:21, range:6 }
    ],
    birds:[
      { kind:'pigeon',  x:7,  y:4,  range:8 },
      { kind:'pigeon',  x:33, y:4,  range:8 },
      { kind:'crow',    x:36, y:13, range:10 }, // mining cart area
      { kind:'sparrow', x:5,  y:14, range:8 },
      { kind:'crow',    x:22, y:24, range:10 }
    ],
    edgeDefs:{
      north:{ y:0, to:'pebblewood', tx:24, ty:36 },
      east:{ x:43, to:'mountain', tx:1, ty:20 },
      south:{ y:33, to:'glimcavern', tx:24, ty:1 }
    }
  });

  // FROSTMERE - frozen lake town. Big lake fills the southwest;
  // walking paths wrap around it. Hot spring + ice sculpture
  // landmark behind the inn. Dense snowy-pine border.
  const frostmereBuildings = [
    { x:5,  y:5,  w:7, doorOffset:2, roof:'P', wall:'B', doorTile:'D', to:'frostmere_center', tx:4, ty:6 },
    { x:14, y:5,  w:7, doorOffset:2, roof:'M', wall:'?', doorTile:'f', to:'frostmere_mart', tx:5, ty:9 },
    { x:30, y:5,  w:8, doorOffset:3, roof:'%', wall:'!', to:'frostmere_inn', tx:5, ty:7 },
    { x:32, y:18, w:8, doorOffset:3, roof:'%', wall:'?', to:'frostmere_cabin', tx:5, ty:7 },
    { x:24, y:23, w:9, roof:'&', wall:'B', doorTile:'D', to:'frostmere_gym', tx:4, ty:7 }
  ];
  updateCity('frostmere', {
    fill:'Q', pathCode:'6', trees:['k','2','Q'], seed:6,
    treeRate:18,
    edges:{ north:true, south:true },
    borderRing:{ kind:'pines', thickness:2, edges:{ east:true, west:true }, seed:6 },
    buildings:frostmereBuildings,
    paths:[
      // Top east-west road across the buildings.
      { points:[[2,11],[42,11]], radius:1 },
      // Building door spurs.
      { points:[[7,8],[7,12]], radius:0 },     // center
      { points:[[16,8],[16,12]], radius:0 },   // mart
      { points:[[33,8],[33,12]], radius:0 },   // inn
      { points:[[35,17],[35,22]], radius:0 },  // cabin (extended to y=22)
      // North entrance from glimcavern.
      { points:[[22,0],[22,11]], radius:1 },
      // Lake-side circuit (curves around the frozen lake to the south).
      { points:[[22,11],[26,15],[34,17]], radius:1, code:'_' },
      { points:[[34,17],[42,17]], radius:1 },
      // South exit through gym plaza to frostpeak (column 22 standard).
      { points:[[22,11],[22,33]], radius:1 },
      // Bridge across the lake to the gym side.
      { points:[[18,18],[28,18]], radius:1, code:'A' }
    ],
    plazas:[
      // Plaza in front of the inn (welcoming hot-spring zone).
      { x:30, y:11, w:9, h:5, code:'_' },
      // Gym plaza on the south side.
      { x:24, y:22, w:9, h:3, code:'_' }
    ],
    features:[
      // FROZEN LAKE - fills the southwest quadrant.
      { x:3,  y:18, w:14, h:9, code:'W' },
      // Snowy bushes around the lake.
      { x:3,  y:14, w:8, h:3, code:'k' },
      // Hot-spring pool tucked behind the inn (small W rect with snow rim).
      { x:30, y:14, w:3, h:2, code:'W' },
      // Lighter snowdrifts in the south plaza area.
      { x:11, y:28, w:11, h:3, code:'2' }
    ],
    signs:{ '20,9':'FROSTMERE - Frozen lake, warm inn, cold Gym.' },
    npcs:[
      { x:34, y:13, dir:'down', sprite:'npc_old', name:'FROSTMERE SAGE',
        dialog:["The lake district grew around the old ice path.","FROSTPEAK hides an ice cave now."] },
      { x:33, y:11, dir:'down', sprite:'npc_girl', name:'INNKEEPER POL',
        dialog:["The hot spring is small, but the stories get larger every night."] },
      { x:36, y:11, dir:'down', sprite:'npc_youth', name:'SNOW SCOUT IVA',
        dialog:["Look for Ultra Balls in late mountain pockets."] },
      { x:22, y:5,  dir:'down',  sprite:'npc_doctor',       name:'DR. NORD', wander:{ range:1 },
        dialog:["Frostbite checkups are free this month.","Drink something warm before going up the peak."] },
      { x:11, y:11, dir:'down',  sprite:'npc_chef',         name:'CHEF NIVE', wander:{ range:1 },
        dialog:["The inn's stew has been simmering for nine years!","Secret ingredient? Patience."] },
      { x:24, y:18, dir:'right', sprite:'npc_swimmer_m',    name:'ICE DIVER KAI', wander:{ range:1 },
        dialog:["Cold water builds character!"],
        trainer:{ team:[['mistfin',30],['splashfin',31]], reward:1320, defeat:["You bested an ice diver. Impressive!"] } },
      { x:26, y:11, dir:'left',  sprite:'npc_kid_girl',     name:'KID YULIA', wander:{ range:1 },
        dialog:["A FROSTPUP licked my mitten today!"] },
      { x:22, y:25, dir:'down',  sprite:'npc_hiker_alt',    name:'CLIMBER NOR', wander:{ range:1 },
        dialog:["Summit day! Wish me luck."],
        trainer:{ team:[['pebra',30],['boulderon',32],['pugpaw',31]], reward:1450, defeat:["You climb fast for a city walker!"] } },
      { x:24, y:23, dir:'right',  sprite:'npc_old_woman',    name:'GRAN UNN', wander:{ range:1 },
        dialog:["My SCARF is older than half this town."] },
      { x:39, y:17, dir:'left',  sprite:'npc_baker',        name:'BAKER FYR', wander:{ range:1 },
        dialog:["Cinnamon buns! Just out of the stove!"] }
    ],
    decorations:[
      // ICE SCULPTURE landmark in the south plaza.
      { x:28, y:25, key:'ice_sculpture' },
      // Paper lanterns lining the dry edges (not in the lake).
      { x:18, y:18, key:'lamp_paper_lantern' },
      { x:18, y:27, key:'lamp_paper_lantern' },
      // Lanterns at the inn plaza.
      { x:31, y:13, key:'lamp_paper_lantern' },
      { x:38, y:13, key:'lamp_paper_lantern' },
      // Log benches on the lake-circle path.
      { x:17, y:14, key:'bench_log' },
      { x:26, y:14, key:'bench_log' },
      // Marble benches around the gym plaza.
      { x:25, y:25, key:'bench_marble_white' },
      { x:31, y:25, key:'bench_marble_white' },
      // Zen planters at the entrances.
      { x:21, y:5,  key:'planter_zen_stone' },
      { x:23, y:5,  key:'planter_zen_stone' },
      // Marble pots flanking the inn plaza.
      { x:31, y:15, key:'pot_marble_white' },
      { x:38, y:15, key:'pot_marble_white' },
      // Lily pots at the south plaza corners.
      { x:25, y:30, key:'pot_tall_lily' },
      { x:31, y:30, key:'pot_tall_lily' },
      // Raised wooden planters along the gym plaza edge.
      { x:24, y:24, key:'planter_raised_wood' },
      { x:32, y:24, key:'planter_raised_wood' },
      // Bins.
      { x:11, y:13, key:'trash_grey_lid' },
      { x:38, y:11, key:'trash_grey_lid' }
    ],
    ambient:[
      { species:'frostpup', x:8, y:14, range:2 },
      { species:'snowox', x:34, y:17, range:2 },
      { species:'glimkit', x:18, y:25, range:2 },
      { species:'chicken', x:24, y:11, range:6 },
      { species:'chicken', x:18, y:23, range:6 },
      { species:'chicken', x:34, y:13, range:6 }
    ],
    birds:[
      { kind:'pigeon',  x:8,  y:5,  range:8 },
      { kind:'pigeon',  x:34, y:5,  range:8 },
      { kind:'crow',    x:36, y:18, range:10 },
      { kind:'crow',    x:22, y:23, range:10 },
      { kind:'sparrow', x:1,  y:14, range:8 }
    ],
    edgeDefs:{
      north:{ y:0, to:'glimcavern', tx:24, ty:36 },
      south:{ y:33, to:'frostpeak', tx:24, ty:1 }
    }
  });

  // HARBORSIDE - major commercial port. L-shaped: city occupies the
  // north + west, two piers extend east and south into the water.
  // LIGHTHOUSE on the eastern pier; FISH MARKET stall on the south
  // boardwalk. Palm-tree border on dry sides, water on east/south.
  const harborsideBuildings = [
    { x:4,  y:5,  w:7, roof:'P', wall:'B', doorTile:'D', to:'harborside_center', tx:4, ty:6 },
    { x:14, y:5,  w:7, roof:'M', wall:'!', doorTile:'f', to:'harborside_mart', tx:5, ty:9 },
    { x:24, y:5,  w:9, roof:'&', wall:'$', to:'harborside_warehouse', tx:5, ty:7 },
    { x:4,  y:14, w:8, roof:'=', wall:'!', to:'harborside_fisher', tx:5, ty:7 },
    { x:14, y:14, w:9, roof:'&', wall:'B', doorTile:'D', to:'harborside_gym', tx:4, ty:7 }
  ];
  updateCity('harborside', {
    fill:'O', pathCode:'t', trees:['3','s','O'], seed:13,
    treeRate:14,
    edges:{ north:true, east:true, south:true },
    borderRing:{ kind:'palms', thickness:2, edges:{ north:true, west:true }, seed:13 },
    buildings:harborsideBuildings,
    paths:[
      // Upper road across the city (in front of shops).
      { points:[[2,11],[33,11]], radius:1 },
      // Mid road (in front of fisher + gym).
      { points:[[2,20],[27,20]], radius:1 },
      // Vertical connector between the two rows.
      { points:[[8,11],[8,20]], radius:1 },
      { points:[[18,11],[18,20]], radius:1 },
      { points:[[28,11],[28,20]], radius:1 },
      // Building door spurs.
      { points:[[7,8],[7,11]], radius:0 },
      { points:[[17,8],[17,11]], radius:0 },
      { points:[[28,8],[28,11]], radius:0 },
      { points:[[7,17],[7,20]], radius:0 },
      { points:[[18,17],[18,20]], radius:0 },
      // East pier (boardwalk over water out to the lighthouse).
      { points:[[28,20],[40,20]], radius:1, code:'t' },
      // South pier / fish market boardwalk.
      { points:[[18,20],[18,30]], radius:1, code:'t' },
      // North entry from frostpeak.
      { points:[[22,0],[22,11]], radius:1 },
      // Connection to south exit (searoute).
      { points:[[18,30],[22,30],[22,33]], radius:1 },
      // East exit toward beach (must reach x=42, y=17 walkable).
      { points:[[28,17],[42,17]], radius:1, code:'t' }
    ],
    plazas:[
      // Open plaza at the upper-mid intersection.
      { x:7, y:11, w:11, h:1, code:'t' },
      // Boardwalk plaza junction by the lighthouse.
      { x:36, y:18, w:5, h:5, code:'t' }
    ],
    features:[
      // East harbor water (split into north + south of the row-17
      // boardwalk so the east-exit corridor stays walkable).
      { x:30, y:13, w:13, h:3, code:'W' },
      { x:30, y:18, w:13, h:1, code:'W' },
      { x:30, y:21, w:13, h:5, code:'W' },
      // South harbor water.
      { x:21, y:24, w:21, h:8, code:'W' },
      // Sand strip near the gym (small beach pocket).
      { x:24, y:22, w:6, h:2, code:'s' }
    ],
    signs:{ '20,9':'HARBORSIDE - Docks, warehouses, beach road.' },
    npcs:[
      { x:22, y:11, dir:'down', sprite:'npc_youth', name:'DOCKHAND TEO',
        dialog:["The beach path runs east from the dock road.","South is the longer, windier SEAROUTE."] },
      { x:38, y:20, dir:'left', sprite:'npc_girl', name:'MARKET JIN',
        dialog:["Quick Balls sell fast when travelers smell storm weather."] },
      { x:18, y:28, dir:'up', sprite:'npc_old', name:'OLD FISHER PIKE',
        dialog:["The tide cavern opens when you least expect a shortcut."] },
      { x:22, y:5,  dir:'down',  sprite:'npc_swimmer_f',    name:'SWIMMER ARI', wander:{ range:1 },
        dialog:["The water is perfect today!"],
        trainer:{ team:[['splashfin',40],['mistfin',41],['tidalwhal',40]], reward:2200, defeat:["You swim with the current! Great battle!"] } },
      { x:34, y:11, dir:'down',  sprite:'npc_businessman',  name:'EXEC LANN', wander:{ range:1 },
        dialog:["Shipping rates are climbing this quarter.","I'm late for a meeting at the warehouse."] },
      { x:13, y:11, dir:'right', sprite:'npc_security',     name:'OFFICER CADE', wander:{ range:1 },
        dialog:["No loitering on the dock road.","If you see contraband, report it."],
        trainer:{ team:[['voltkit',40],['nibblet',41]], reward:2050, defeat:["I should've trained more this morning."] } },
      { x:32, y:20, dir:'right', sprite:'npc_tourist',      name:'TOURIST QUI', wander:{ range:1 },
        dialog:["Photo with the lighthouse, please?","Stunning! Just stunning."] },
      { x:18, y:24, dir:'down',  sprite:'npc_construction', name:'DOCKER MEL', wander:{ range:1 },
        dialog:["Cargo's heavy today. Three crates of ROD BALLS."] },
      { x:13, y:20, dir:'right', sprite:'npc_dog_walker',   name:'WALKER VEN', wander:{ range:1 },
        dialog:["BEAU loves the salty air."] },
      { x:23, y:11, dir:'down',  sprite:'npc_journalist',   name:'COR. NIA', wander:{ range:1 },
        dialog:["Big storm coming. I'm filing the lead piece by sunset."] }
    ],
    decorations:[
      // LIGHTHOUSE LANDMARK at the east pier end (3 tiles tall).
      { x:40, y:18, key:'lighthouse_top' },
      { x:40, y:19, key:'lighthouse_tower' },
      { x:40, y:20, key:'lighthouse_base' },
      // FISH MARKET STALL on the south boardwalk.
      { x:18, y:25, key:'fish_market_stall' },
      // ANCHOR + crates near the warehouse door.
      { x:31, y:11, key:'anchor' },
      // Pier oil lamps along both piers.
      { x:31, y:20, key:'lamp_oil_brass' },
      { x:35, y:20, key:'lamp_oil_brass' },
      { x:18, y:23, key:'lamp_oil_brass' },
      { x:18, y:27, key:'lamp_oil_brass' },
      // Ornate streetlamps on the city upper road.
      { x:11, y:11, key:'streetlamp_ornate_double' },
      { x:21, y:11, key:'streetlamp_ornate_double' },
      // Pier-wood benches along east pier.
      { x:32, y:21, key:'bench_pier_wood' },
      { x:36, y:21, key:'bench_pier_wood' },
      // Picnic benches in the plaza junction (clear of the gym roof).
      { x:9,  y:18, key:'bench_picnic_red' },
      { x:23, y:18, key:'bench_picnic_red' },
      // Herb-box planters at building corners.
      { x:13, y:5,  key:'planter_herb_box' },
      { x:32, y:5,  key:'planter_herb_box' },
      // Ceramic pots in the upper plaza.
      { x:11, y:12, key:'pot_ceramic_blue' },
      { x:32, y:12, key:'pot_ceramic_blue' },
      // Raised wooden planters at fish market.
      { x:16, y:25, key:'planter_raised_wood' },
      // Bins.
      { x:13, y:14, key:'trash_dumpster' },
      { x:23, y:14, key:'trash_blue_recycle' },
      // Bus stop near the upper plaza.
      { x:9,  y:11, key:'bus_stop_sign' }
    ],
    ambient:[
      { species:'aquapup', x:10, y:14, range:2 },
      { species:'splashfin', x:34, y:21, range:2 },
      { species:'mistfin', x:16, y:25, range:2 },
      { species:'chicken', x:11, y:14, range:6 },
      { species:'chicken', x:14, y:18, range:6 },
      { species:'chicken', x:23, y:18, range:6 }
    ],
    birds:[
      { kind:'pigeon',  x:7,  y:5,  range:8 },
      { kind:'pigeon',  x:17, y:5,  range:8 },
      { kind:'crow',    x:40, y:18, range:10 }, // lighthouse top
      { kind:'sparrow', x:7,  y:14, range:8 },
      { kind:'sparrow', x:18, y:25, range:8 }   // fish market
    ],
    edgeDefs:{
      north:{ y:0, to:'frostpeak', tx:24, ty:36 },
      east:{ x:43, to:'beach', tx:1, ty:20 },
      south:{ y:33, to:'searoute', tx:24, ty:1 }
    }
  });

  // SUMMITVALE - champion's plateau. Star-shaped plaza in the center
  // with an OBELISK landmark; eight paths radiate outward to the
  // ring road. Champion statues at the cardinal corners. Birch
  // border + scattered desert tiles bleeding in from the east edge.
  const summitBuildings = [
    { x:4,  y:5,  w:7, roof:'P', wall:'B', doorTile:'D', to:'summitvale_center', tx:4, ty:6 },
    { x:33, y:5,  w:7, roof:'M', wall:'!', doorTile:'f', to:'summitvale_mart', tx:5, ty:9 },
    { x:33, y:14, w:8, roof:'*', wall:'!', to:'summitvale_house', tx:3, ty:6 },
    { x:4,  y:14, w:8, roof:'=', wall:'#', to:'summitvale_lookout', tx:5, ty:7 },
    { x:18, y:24, w:9, roof:'*', wall:'!', to:'summitvale_hall', tx:5, ty:7 }
  ];
  updateCity('summitvale', {
    fill:'N', pathCode:'i', trees:['1','c','N','('], seed:16,
    treeRate:14,
    edges:{ north:true, east:true },
    borderRing:{ kind:'birch', thickness:2, edges:{ north:true, west:true, south:true }, seed:16 },
    buildings:summitBuildings,
    paths:[
      // Outer ring road (rectangle).
      { points:[[7,11],[36,11]], radius:1 },
      { points:[[36,11],[36,21]], radius:1 },
      { points:[[7,21],[36,21]], radius:1 },
      { points:[[7,11],[7,21]], radius:1 },
      // 8 spokes radiating from the central plaza to the ring.
      { points:[[22,11],[22,15]], radius:0 },     // N
      { points:[[22,21],[22,17]], radius:0 },     // S
      { points:[[7,16],[18,16]], radius:0 },      // W
      { points:[[36,16],[26,16]], radius:0 },     // E
      { points:[[10,12],[19,15]], radius:0 },     // NW diagonal
      { points:[[33,12],[25,15]], radius:0 },     // NE diagonal
      { points:[[10,20],[19,17]], radius:0 },     // SW diagonal
      { points:[[33,20],[25,17]], radius:0 },     // SE diagonal
      // North entrance from searoute.
      { points:[[22,0],[22,11]], radius:1 },
      // East exit toward desert.
      { points:[[36,16],[43,16]], radius:1 },
      // Spurs to building doors.
      { points:[[7,8],[7,11]], radius:0 },        // center
      { points:[[36,8],[36,11]], radius:0 },      // mart
      { points:[[36,21],[36,17]], radius:0 },     // house
      { points:[[7,21],[7,17]], radius:0 },       // lookout
      { points:[[22,21],[22,24]], radius:0 }      // hall
    ],
    plazas:[
      // Central star plaza around the obelisk.
      { x:18, y:13, w:9, h:7, code:'Z' },
      // Inner plinth circle (zen tile).
      { x:20, y:15, w:5, h:3, code:'i' }
    ],
    features:[
      // Desert sand bleeding in from the east edge.
      { x:38, y:14, w:5, h:5, code:'5' },
      // Rocky outcrops on the west edge.
      { x:1, y:14, w:2, h:4, code:'(' },
      // Lantern ground tiles framing the south path.
      { x:21, y:25, w:3, h:3, code:'I' }
    ],
    signs:{ '20,9':'SUMMITVALE - The loop turns east toward the desert.' },
    npcs:[
      { x:22, y:18, dir:'down', sprite:'npc_oak', name:'CHAMPION ROWE',
        gym:true, badge:'CINDER',
        dialog:["You climbed all the way to SUMMITVALE!","I am ROWE - the FIRE-typed CHAMPION.","If you've earned every other BADGE, I'll grant you the CINDER BADGE. If you can take it."],
        gymRequirement:{ minBadges:7 },
        gymLocked:["Earn all seven other BADGES first.","Only then will I face you."],
        trainer:{ team:[['emberkit',38],['flarebound',40],['magmaron',42],['infernarok',46]],
                  reward:5000,
                  defeat:["Magnificent! The CINDER BADGE - and the title of CHAMPION - are yours."] } },
      { x:36, y:13, dir:'down', sprite:'npc_girl', name:'LOOKOUT ANA',
        dialog:["From here the region finally looks like a circle.","The desert closes the loop to Rodport."] },
      { x:8, y:21, dir:'up', sprite:'npc_youth', name:'RIDGE RUNNER CAL',
        dialog:["The old straight roads are gone. Every route has a bend worth checking."] },
      { x:22, y:5,  dir:'down',  sprite:'npc_scientist',    name:'DR. SAGE', wander:{ range:1 },
        dialog:["I'm cataloguing rare species at the summit.","Could I borrow your DEX scans?"] },
      { x:22, y:13, dir:'down',  sprite:'npc_doctor',       name:'DR. ALDEN', wander:{ range:1 },
        dialog:["Altitude sickness affects PARTNERS too.","Pace yourself on long climbs."] },
      { x:19, y:16, dir:'right', sprite:'npc_punk',         name:'PUNK XEN', wander:{ range:1 },
        dialog:["Top of the world! Gimme your best shot!"],
        trainer:{ team:[['shadefox',50],['umbrasire',52],['voltlynx',51]], reward:3500, defeat:["First loss in months. Respect."] } },
      { x:25, y:16, dir:'left',  sprite:'npc_dancer',       name:'DANCER ELEN', wander:{ range:1 },
        dialog:["The mountain wind sets the rhythm."],
        trainer:{ team:[['glimkit',49],['lustrofox',51],['flitwing',50]], reward:3300, defeat:["A graceful battle, indeed."] } },
      { x:22, y:21, dir:'down',  sprite:'npc_old_man_alt',  name:'ELDER WICK', wander:{ range:1 },
        dialog:["I climbed this mountain at your age. Twice."] },
      { x:11, y:11, dir:'right', sprite:'npc_old_woman',    name:'ELDER MIRR', wander:{ range:1 },
        dialog:["The old roads still appear in dreams."] },
      { x:36, y:21, dir:'left',  sprite:'npc_journalist',   name:'COR. SETH', wander:{ range:1 },
        dialog:["Recording the final stretch for the GAZETTE."] }
    ],
    decorations:[
      // OBELISK LANDMARK in the center of the star plaza (2 tiles tall).
      { x:22, y:15, key:'obelisk_top' },
      { x:22, y:16, key:'obelisk_base' },
      // CHAMPION STATUES at the four cardinal star points.
      { x:18, y:14, key:'champion_statue' },
      { x:26, y:14, key:'champion_statue' },
      { x:18, y:18, key:'champion_statue' },
      { x:26, y:18, key:'champion_statue' },
      // Oil-brass lamps at the ring corners.
      { x:7,  y:11, key:'lamp_oil_brass' },
      { x:36, y:11, key:'lamp_oil_brass' },
      { x:7,  y:21, key:'streetlamp_ornate_double' },
      { x:36, y:21, key:'streetlamp_ornate_double' },
      // Marble benches at the ring midpoints.
      { x:11, y:16, key:'bench_marble_white' },
      { x:32, y:16, key:'bench_marble_white' },
      { x:22, y:11, key:'bench_marble_white' },
      // Stone benches along the SW + SE diagonals (well clear of
      // the corner statues so the silhouettes don't overlap).
      { x:14, y:13, key:'bench_stone_grey' },
      { x:30, y:13, key:'bench_stone_grey' },
      { x:14, y:19, key:'bench_stone_grey' },
      { x:30, y:19, key:'bench_stone_grey' },
      // Zen + marble pots at the entrances.
      { x:21, y:5,  key:'planter_zen_stone' },
      { x:23, y:5,  key:'planter_zen_stone' },
      { x:21, y:11, key:'pot_marble_white' },
      { x:23, y:11, key:'pot_marble_white' },
      // Tall lily pots at the south plaza.
      { x:20, y:24, key:'pot_tall_lily' },
      { x:25, y:24, key:'pot_tall_lily' },
      // Hedge rings at the SW/SE corners.
      { x:11, y:21, key:'planter_hedge_round' },
      { x:32, y:21, key:'planter_hedge_round' },
      // Bins.
      { x:11, y:14, key:'trash_grey_lid' },
      { x:32, y:14, key:'trash_grey_lid' }
    ],
    ambient:[
      { species:'emberkit', x:11, y:15, range:2 },
      { species:'voltkit', x:34, y:15, range:2 },
      { species:'glimkit', x:19, y:26, range:2 },
      { species:'chicken', x:11, y:11, range:6 },
      { species:'chicken', x:33, y:11, range:6 },
      { species:'chicken', x:22, y:23, range:6 }
    ],
    birds:[
      { kind:'pigeon',  x:7,  y:5,  range:8 },
      { kind:'pigeon',  x:36, y:5,  range:8 },
      { kind:'crow',    x:22, y:15, range:10 }, // obelisk top
      { kind:'crow',    x:36, y:14, range:10 },
      { kind:'sparrow', x:7,  y:14, range:8 }
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
    birds:[
      { kind:'sparrow', x:8,  y:6,  range:10 },
      { kind:'sparrow', x:38, y:8,  range:10 },
      { kind:'crow',    x:24, y:18, range:10 },
      { kind:'pigeon',  x:14, y:30, range:10 }
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
    birds:[
      { kind:'sparrow', x:10, y:6,  range:10 },
      { kind:'pigeon',  x:32, y:8,  range:10 },
      { kind:'crow',    x:20, y:20, range:10 },
      { kind:'sparrow', x:36, y:30, range:10 }
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
    birds:[
      { kind:'sparrow', x:8,  y:6,  range:10 },
      { kind:'crow',    x:30, y:10, range:10 },
      { kind:'pigeon',  x:18, y:22, range:10 },
      { kind:'sparrow', x:38, y:28, range:10 },
      { kind:'crow',    x:6,  y:32, range:10 }
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
    birds:[
      { kind:'crow',    x:10, y:8,  range:10 },
      { kind:'crow',    x:32, y:12, range:10 },
      { kind:'sparrow', x:20, y:24, range:10 }
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
    birds:[
      { kind:'crow',    x:8,  y:6,  range:10 },
      { kind:'crow',    x:32, y:8,  range:10 },
      { kind:'pigeon',  x:18, y:18, range:10 },
      { kind:'sparrow', x:36, y:28, range:10 }
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
    birds:[
      { kind:'pigeon',  x:8,  y:6,  range:10 },
      { kind:'pigeon',  x:34, y:10, range:10 },
      { kind:'sparrow', x:20, y:20, range:10 },
      { kind:'crow',    x:10, y:30, range:10 }
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

  // Interior exits - coords match the new redesigned city layouts.
  // Each (x, y) is the city tile the player stands on after exiting.
  updateExit('player_house', '3,6', 'rodport', 6, 10);
  updateExit('rival_house', '3,6', 'rodport', 15, 10);
  updateExit('lab', '5,8', 'rodport', 26, 9);
  updateExit('pokecenter', '4,7', 'brindale', 7, 8);
  updateExit('mart', '5,10', 'brindale', 36, 8);
  updateExit('townhouse', '3,6', 'brindale', 7, 18);
  updateExit('brindale_gym', '4,8', 'brindale', 22, 28);
  updateExit('woodfall_center', '4,7', 'woodfall', 8, 10);
  updateExit('woodfall_mart', '5,10', 'woodfall', 34, 10);
  updateExit('woodfall_gym', '4,8', 'woodfall', 22, 28);
  updateExit('crestrock_center', '4,7', 'crestrock', 7, 8);
  updateExit('crestrock_mart', '5,10', 'crestrock', 17, 8);
  updateExit('crestrock_gym', '4,8', 'crestrock', 28, 26);
  updateExit('frostmere_center', '4,7', 'frostmere', 7, 9);
  updateExit('frostmere_mart', '5,10', 'frostmere', 16, 9);
  updateExit('frostmere_gym', '4,8', 'frostmere', 28, 27);
  updateExit('harborside_center', '4,7', 'harborside', 7, 8);
  updateExit('harborside_mart', '5,10', 'harborside', 17, 8);
  updateExit('harborside_gym', '4,8', 'harborside', 18, 18);
  updateExit('summitvale_center', '4,7', 'summitvale', 7, 8);
  updateExit('summitvale_mart', '5,10', 'summitvale', 36, 8);
  updateExit('summitvale_house', '3,6', 'summitvale', 36, 18);
  MAPS.glimcavern_b1.tags = ['cave'];
  updateExit('glimcavern_b1', '10,1', 'glimcavern', 37, 9);

  MAPS.rodport_dockhouse = makeFlavorInterior('rodport_dockhouse', 'Dock House', 'rodport', 8, 22, {
    x:5, y:4, dir:'down', sprite:'npc_old', name:'CAPTAIN EDA',
    dialog:['The harbor used to be one pier and a rumor.','Now it has enough corners to lose a sandwich.']
  });
  MAPS.rodport_boathouse = makeFlavorInterior('rodport_boathouse', 'Boathouse', 'rodport', 17, 22, {
    x:5, y:4, dir:'down', sprite:'npc_youth', name:'BOATWRIGHT NIX',
    dialog:['Every route needs a few bends.','Straight roads make lazy boots.']
  });
  MAPS.brindale_school = makeFlavorInterior('brindale_school', 'Trainer School', 'brindale', 35, 18, {
    x:5, y:4, dir:'down', sprite:'npc_girl', name:'TEACHER VERA',
    dialog:['Lesson one: check your party stats.','Lesson two: do it before the Gym.']
  });
  MAPS.woodfall_lodge = makeFlavorInterior('woodfall_lodge', 'Forest Lodge', 'woodfall', 36, 22, {
    x:5, y:4, dir:'down', sprite:'npc_old', name:'LODGE KEEPER',
    dialog:['Pebblewood is wider now.','The quiet side paths are where items hide.']
  });
  MAPS.woodfall_cabin = makeFlavorInterior('woodfall_cabin', 'Leaf Cabin', 'woodfall', 6, 22, {
    x:5, y:4, dir:'down', sprite:'npc_youth', name:'BUG WATCHER',
    dialog:['I saw a Cavern Ball sparkle in the woods.','Then a Crawlbug sat on it.']
  });
  MAPS.crestrock_workshop = makeFlavorInterior('crestrock_workshop', 'Stone Workshop', 'crestrock', 34, 8, {
    x:5, y:4, dir:'down', sprite:'npc_old', name:'FOREMAN IVO',
    dialog:['Glimcavern got bigger after the last quake.','Take a Cavern Ball if you find one.']
  });
  MAPS.crestrock_house = makeFlavorInterior('crestrock_house', 'Terrace House', 'crestrock', 9, 26, {
    x:5, y:4, dir:'down', sprite:'npc_girl', name:'TERRACE FAN',
    dialog:['Highspire looks close on the map.','Your feet will disagree.']
  });
  MAPS.frostmere_inn = makeFlavorInterior('frostmere_inn', 'Warm Inn', 'frostmere', 33, 9, {
    x:5, y:4, dir:'down', sprite:'npc_old', name:'INN AUNTIE',
    dialog:['Warm hands, cold routes.','Check Frostpeak pockets for rare balls.']
  });
  MAPS.frostmere_cabin = makeFlavorInterior('frostmere_cabin', 'Snow Cabin', 'frostmere', 35, 22, {
    x:5, y:4, dir:'down', sprite:'npc_girl', name:'SNOW ARTIST',
    dialog:['The ice cave wall shines like a badge case.']
  });
  MAPS.harborside_warehouse = makeFlavorInterior('harborside_warehouse', 'Warehouse', 'harborside', 28, 8, {
    x:5, y:4, dir:'down', sprite:'npc_youth', name:'WAREHOUSE CLERK',
    dialog:['We stock Quick Balls near the exits.','Nobody buys them after a long fight.']
  });
  MAPS.harborside_fisher = makeFlavorInterior('harborside_fisher', 'Fisher House', 'harborside', 7, 18, {
    x:5, y:4, dir:'down', sprite:'npc_old', name:'FISHER PIKE',
    dialog:['Tide caverns are caves with opinions.','Cavern Balls still count.']
  });
  MAPS.summitvale_lookout = makeFlavorInterior('summitvale_lookout', 'Lookout House', 'summitvale', 7, 18, {
    x:5, y:4, dir:'down', sprite:'npc_girl', name:'LOOKOUT ANA',
    dialog:['Rodport, Desert, Summitvale...','A circle feels better from up here.']
  });
  MAPS.summitvale_hall = makeFlavorInterior('summitvale_hall', 'Summit Hall', 'summitvale', 22, 28, {
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
