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

const OUTDOOR_W = 34;
const OUTDOOR_H = 28;

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
  const grid = makeGrid(OUTDOOR_W, OUTDOOR_H, cfg.fill);
  carvePath(grid, cfg.path, cfg.pathCode || ',', cfg.pathRadius || 0);
  if (cfg.branches) {
    for (const branch of cfg.branches) {
      carvePath(grid, branch.points, branch.code || cfg.pathCode || ',', branch.radius || 0);
    }
  }
  if (cfg.pockets) {
    for (const p of cfg.pockets) carveRect(grid, p.x, p.y, p.w, p.h, p.code || ':');
  }
  if (cfg.decor) {
    for (const d of cfg.decor) scatterTiles(grid, d);
  }
  return grid.map(row => row.join(''));
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
      { species:'flitwing',    minL:2, maxL:4, weight:4 },
      { species:'crawlbug',    minL:2, maxL:3, weight:3 },
      { species:'zapret',      minL:3, maxL:5, weight:2 },
      { species:'cinderpup',   minL:3, maxL:5, weight:2 },
      { species:'fernsprout',  minL:3, maxL:5, weight:2 },
      { species:'voltkit',     minL:3, maxL:5, weight:2 },
      { species:'bumblesting', minL:2, maxL:4, weight:2 },
      { species:'galewing',    minL:3, maxL:5, weight:2 },
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
      { species:'geistmite', minL:10, maxL:14, weight:4 },
      { species:'cavewing',  minL:10, maxL:14, weight:4 },
      { species:'stoneworm', minL:11, maxL:15, weight:3 },
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
      { species:'geistmite', minL:14, maxL:18, weight:5 },
      { species:'cavewing',  minL:14, maxL:18, weight:4 },
      { species:'stoneworm', minL:14, maxL:18, weight:3 },
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
      { species:'frostpup',  minL:14, maxL:18, weight:5 },
      { species:'snowox',    minL:14, maxL:18, weight:3 },
      { species:'glimkit',   minL:14, maxL:18, weight:3 },
      { species:'crysthorn', minL:15, maxL:19, weight:2 },
      { species:'galewing',  minL:14, maxL:18, weight:3 }
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
    id:'searoute', name:'Searoute',
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
      { species:'cavewing',  minL:18, maxL:22, weight:2 }
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
      { species:'snowox',    minL:18, maxL:22, weight:2 }
    ],
    edges: {
      west: { x:0, to:'crestrock', tx:18, ty:15 }
    }
  }
};

window.PR_MAPS = { MAPS, TILE_PROPS, tileAt };
