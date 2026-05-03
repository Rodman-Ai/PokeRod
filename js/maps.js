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
  'b': { walk:false, name:'bush' },
  'c': { walk:false, name:'flowerbush' },
  'e': { walk:false, name:'berrybush' },
  'g': { walk:false, name:'thornbush' },
  'h': { walk:false, name:'hedge' },
  'j': { walk:false, name:'autumnbush' },
  'k': { walk:false, name:'snowybush' },
  'l': { walk:false, name:'blueflowerbush' },
  'm': { walk:false, name:'purpleflowerbush' },
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
  '(': { walk:false, name:'chimney' },
  ')': { walk:false, name:'smokestack' },
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
  // Decorations - all block.
  '<': { walk:false, name:'bench' },
  '|': { walk:false, name:'streetlamp' },
  '~': { walk:false, name:'hydrant' },
  '{': { walk:false, name:'flowerpot' },
  '>': { walk:false, name:'shelf' },
  '`': { walk:false, name:'fence_h' },
  '"': { walk:false, name:'fence_v' },
  "'": { walk:false, name:'gardenbed' },
  '\\': { walk:false, name:'mailbox' },
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
      'Y..,..WW.....1....,Y',
      'Y..,..WW..........,Y',
      'Y.|,,,,,,,,,,,,,,,,Y',
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
    },
    doors: {
      '4,4':  { to:'player_house', x:3, y:6 },
      '11,4': { to:'rival_house',  x:3, y:6 },
      '9,9':  { to:'lab',          x:5, y:8 }
    },
    edges: {
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
    tiles: [
      'XXXXXXX,,XXXXXXXXXXXXXXXX',
      'YYYYYYY,,YYYYYYYYYYYYYYYY',
      'Yc:c:Y:,,:::::Y:Y:E:e:1:Y',
      'Y::::Y:,,E:e:1:c:c:Y::::Y',
      'Y:e:1:c,,:Y::::::::Y:Y:EY',
      'YY:::::,,:Y:Y:E:e:1:c:c:Y',
      'YY:Y:E:,,1:c:c::::::::::Y',
      'Y:c,,,,,,::::::Y:Y:E:e:1Y',
      'Y::,:::,,:E:e:1:c:c:Y:::Y',
      'YE:,,1:c:c:Y::::::::Y:Y:Y',
      'Y:Y,,::::::Y:Y:E:e:1:c:cY',
      'Y:Y,,:E:e:1:c:c:Y:::::::Y',
      'Y1:,,,,,,:::::::Y:Y:E:e:Y',
      'Y::,,,,,,Y:E:e:1:c:c:Y::Y',
      'Y:E:e:1,,:c:Y::::::::Y:YY',
      'Yc:Y:::,,:::Y:Y:E:e:1:c:Y',
      'Y::Y:Y:,,e:1:c:c:Y::::::Y',
      'Y:1:c:c,,::::::::Y:Y:E:eY',
      'Y::::::,,:Y:E:e:1:c:c:Y:Y',
      'YY:E:e:,,c:c:Y::::::::Y:Y',
      'YYYYYYY,,YYYYYYYYYYYYYYYY',
      'XXXXXXX,,XXXXXXXXXXXXXXXX'
    ],
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
      '14,14': { item:'potion',     count:1 },
      '15,2':  { item:'rodball',    count:2 },
      '4,11':  { item:'antidote',   count:1 }
    },
    edges: {
      north: { y:0,  to:'rodport',  tx:7, ty:16 },
      south: { y:21, to:'brindale', tx:7, ty:1 }
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
      'K.\'.\'.,...........,K',
      'K..,..,......1c...,K',
      'K.|,,,,...........,K',
      'KKKKKKK,,KKKKKKKKKKK',
      'XXXXXXX,,XXXXXXXXXXX'
    ],
    npcs: [
      { x:14, y:7, dir:'down', sprite:'npc_girl', name:'TOWNSFOLK',
        dialog:["BRINDALE TOWN!","The POKEROD CENTER on the left heals your team for free.","The MART on the right sells useful items."] },
      { x:7, y:13, dir:'down', sprite:'npc_old', name:'GYM LEADER WAVE',
        gym: true, badge:'WAVE',
        dialog:["I am WAVE, leader of the BRINDALE GYM.","Show me you are ready and we shall battle!"],
        gymRequirement:{ minCaught:3 },
        gymLocked:["Catch a few more creatures first.","Come back when you have at least three!"],
        trainer: { team:[['mistfin',12],['aquapup',13]], reward:600,
                   defeat:["A fine showing! Take this WAVE BADGE."] } }
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
      '5,5':  { to:'pokecenter', x:4, y:6 },
      '12,5': { to:'mart',       x:5, y:9 },
      '8,10': { to:'townhouse',  x:3, y:6 }
    },
    edges: {
      north: { y:0,  to:'route1', tx:7, ty:20 },
      south: { y:17, to:'route2', tx:7, ty:1 }
    }
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
    tiles: [
      'XXXXXXX,,XXXXXXXXXXXXXXXX',
      'KKKKKKK,,KKKKKKKKKKKKKKKK',
      'Km:c:K:,,:::::::K:K:K:1:K',
      'K::::::,,K:K:1:m:c:K::::K',
      'K:K:1:m,,:K::::::::::K:KK',
      'KK:::::,,:::K:K:K:1:m:c:K',
      'K::K:K:,,,,,,,,,,:::::::K',
      'K:m:c:K,,,,,,,,,,K:K:K:1K',
      'K:::::::K:K:K:1,,:c:K:::K',
      'KK:K:1:m:c:K:::,,:::::K:K',
      'K:K::::::::::K:,,K:1:m:cK',
      'K:::K:K:K:1:m:c,,:::::::K',
      'K1:m:c:K:::::::,,:K:K:K:K',
      'K::::::,,,,,,,,,,m:c:K::K',
      'K:K:K:1,,,,,,,,,,::::::KK',
      'Kc:K:::,,:::::K:K:K:1:m:K',
      'K::::K:,,K:1:m:c:K::::::K',
      'K:1:m:c,,::::::::::K:K:KK',
      'K::::::,,:K:K:K:1:m:c:K:K',
      'KK:K:K:,,m:c:K::::::::::K',
      'KKKKKKK,,KKKKKKKKKKKKKKKK',
      'XXXXXXX,,XXXXXXXXXXXXXXXX'
    ],
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
      south: { y:21, to:'woodfall', tx:7, ty:1 }
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
      'G..,...|........~.,G',
      'G..,........c.....,G',
      'G..,...4..........,G',
      'G.\'...4.4.........,G',
      'G..,,,,,,,,,,,,,,,,G',
      'GGGGGGG,,GGGGGGGGGGG',
      'XXXXXXX,,XXXXXXXXXXX'
    ],
    npcs: [
      { x:14, y:8, dir:'down', sprite:'npc_old', name:'WOODFALL ELDER',
        dialog:["Welcome to WOODFALL.","South of here, the trees thicken into PEBBLEWOOD.","Bring a torch... or a creature with bright eyes!"] }
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
      '12,5': { to:'woodfall_mart',   x:5, y:9 }
    },
    edges: {
      north: { y:0,  to:'route2',     tx:7, ty:20 },
      south: { y:17, to:'pebblewood', tx:7, ty:1 }
    }
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
    tiles: [
      'XXXXXXX,,XXXXXXXXXXXXXXXX',
      'GGGGGGG,,GGGGGGGGGGGGGGGG',
      'G:::::G,,::::::gN::::::GG',
      'G:gN:::,,:GVU::::::gN:::G',
      'G:::::g,,:::::GVU::::::gG',
      'GGVU:::,,:gN::::::GVU:::G',
      'G::::GV,,:::::::::::::GVG',
      'GgN::::,,,,,,,,,::gN::::G',
      'G::::gN,,,,,,,,,::::::gNG',
      'GVU::::::gN:::,,:GVU::::G',
      'G:::GVU::::::g,,:::::GVUG',
      'GN::::::GVU:::,,:gN:::::G',
      'G:::gN:,,,,,,,,,:::::gN:G',
      'GU:::::,,,,,,,,,GVU:::::G',
      'G::GVU:,,:::gN::::::GVU:G',
      'G::::::,,U::::::gN::::::G',
      'G::gN::,,::GVU::::::gN::G',
      'G::::::,,::::::GVU::::::G',
      'G:GVU::,,::gN::::::GVU::G',
      'G:::::G,,::::::gN::::::GG',
      'GGGGGGG,,GGGGGGGGGGGGGGGG',
      'XXXXXXX,,XXXXXXXXXXXXXXXX'
    ],
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
      south: { y:21, to:'crestrock', tx:7, ty:1 }
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
      'V..,...|........~.,V',
      'V..,..........2...,V',
      'V..,..\'...........,V',
      'V.|,..............,V',
      'V..,,,,,,,,,,,,,,,,V',
      'VVVVVVV,,VVVVVVVVVVV',
      'XXXXXXX,,XXXXXXXXXXX'
    ],
    npcs: [
      { x:14, y:8, dir:'down', sprite:'npc_girl', name:'CRESTROCK GUIDE',
        dialog:["Welcome to CRESTROCK.","South of here lies GLIMCAVERN.","Bring along an electric or fire creature - the dark inside is no joke."] }
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
      '12,5': { to:'crestrock_mart',   x:5, y:9 }
    },
    edges: {
      north: { y:0,  to:'pebblewood', tx:7, ty:20 },
      south: { y:17, to:'glimcavern', tx:7, ty:1 }
    }
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
    tiles: [
      'XXXXXXX,,XXXXXXXXXXX',
      'TTTTTTT,,TTTTTTTTTTT',
      'TssssssTssTsssssssTT',
      'Ts:::sTsssTs::ssssTT',
      'Tss::ssssssss::sssTT',
      'TssssTsTssTsssTsssTT',
      'Ts::ssssssssss::ssTT',
      'TssssTsssTsssssssTTT',
      'Ts::sssTssDs:::sssTT',
      'TsssssTssssTsssssTTT',
      'Ts::ssssssss:::ssTTT',
      'TssssTsTssTsssssssTT',
      'Ts:::ssssss::ssssTTT',
      'TssssTssssTssTsssTTT',
      'TssssssTssTsssssssTT',
      'TTTTTTT,,TTTTTTTTTTT',
      'XXXXXXX,,XXXXXXXXXXX'
    ],
    npcs: [
      { x:6, y:8, dir:'right', sprite:'npc_youth', name:'SPELUNKER GUS',
        dialog:["I came down here looking for crystals.","Found a fight instead!"],
        trainer: { team:[['pebra',12],['geistmite',12]], reward:520,
                   defeat:["Bah! The dark always wins, eventually."] } },
      { x:15, y:12, dir:'down', sprite:'ball', name:'',
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
      '10,8': { to:'glimcavern_b1', x:10, y:1 }
    },
    edges: {
      north: { y:0,  to:'crestrock', tx:7, ty:6 },
      south: { y:16, to:'frostmere', tx:7, ty:1 }
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
      'Q..,...|........~.,Q',
      'Q..,..............,Q',
      'Q..,..............,Q',
      'Q.k,...k.k........,Q',
      'Q.|,,,,,,,,,,,,,,,,Q',
      'QQQQQQQ,,QQQQQQQQQQQ',
      'XXXXXXX,,XXXXXXXXXXX'
    ],
    npcs: [
      { x:14, y:8, dir:'down', sprite:'npc_old', name:'FROSTMERE SAGE',
        dialog:["FROSTMERE is built around a frozen lake.","Beyond, the FROSTPEAK rises into white silence."] }
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
      '12,5': { to:'frostmere_mart',   x:5, y:9 }
    },
    edges: {
      north: { y:0,  to:'glimcavern', tx:7, ty:15 },
      south: { y:17, to:'frostpeak',  tx:7, ty:1 }
    }
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
    tiles: [
      'XXXXXXX,,XXXXXXXXXXXXXXXX',
      'QQQQQQQ,,QQQQQQQQQQQQQQQQ',
      'QQ:k:Q:,,:::::::::Q:Q:k:Q',
      'Q::::::,,Q:Q:k:Q:k:Q::::Q',
      'Q:Q:k:Q,,:Q::::::::::::QQ',
      'QQ:::::,,,,,,:Q:Q:k:Q:k:Q',
      'Q::::Q:,,,,,,:::::::::::Q',
      'Q:Q:k:Q::::,,::::::Q:Q:kQ',
      'Q:::::::::Q,,:k:Q:k:Q:::Q',
      'QQ:Q:k:Q:k:,,:::::::::::Q',
      'Q:Q::::::::,,,,,,,,k:Q:kQ',
      'Q:::::Q:Q:k,,,,,,,,:::::Q',
      'Qk:Q:k:Q:::::::::,,:Q:Q:Q',
      'Q::::::::::Q:Q:k:,,k:Q::Q',
      'Q:Q:Q:k:Q:k:Q::::,,:::::Q',
      'Qk:Q:::,,,,,,,,,,,,:k:Q:Q',
      'Q::::::,,,,,,,,,,,,:::::Q',
      'Q:k:Q:k,,::::::::::::Q:QQ',
      'Q::::::,,:::Q:Q:k:Q:k:Q:Q',
      'Q::Q:Q:,,Q:k:Q::::::::::Q',
      'QQQQQQQ,,QQQQQQQQQQQQQQQQ',
      'XXXXXXX,,XXXXXXXXXXXXXXXX'
    ],
    npcs: [
      { x:14, y:6, dir:'left', sprite:'npc_old', name:'CLIMBER VAL',
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
      south: { y:21, to:'harborside', tx:7, ty:1 }
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
      'O..,...........WWWWW',
      'O..,.....<...|.WWWWW',
      'O..,..1........WWWWW',
      'O.\'............WWWWW',
      'O..,......1c...WWWWW',
      'O.|,,,,,,,,,,,,,,,,O',
      'OOOOOOO,,OOOOOOOOOOO',
      'XXXXXXX,,XXXXXXXXXXX'
    ],
    npcs: [
      { x:9, y:9, dir:'right', sprite:'npc_youth', name:'DOCKHAND TEO',
        dialog:["HARBORSIDE - last stop before the SEAROUTE.","If your creatures love the water, you'll fit right in."] }
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
      '12,5': { to:'harborside_mart',   x:5, y:9 }
    },
    edges: {
      north: { y:0,  to:'frostpeak', tx:7, ty:20 },
      south: { y:17, to:'searoute',  tx:7, ty:1 }
    }
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
    tiles: [
      'XXXXXXX,,XXXXXXXXXXXXXXXX',
      'OOOOOOO,,OOOOOOOOOOOOOOOO',
      'OO:s:O:,,:::::::::O:3:s:O',
      'O::::::,,O:3:s:O:s:O::::O',
      'O:3:s:O,,:O::::::::::::OO',
      'OO:::::,,:::::O:3:s:O:s:O',
      'O::::O:,,s:O:s:O::::::::O',
      'O:O:s:O,,::::::::::O:3:sO',
      'O::::::,,,,,,:::O:s:O:::O',
      'OO:3:s:,,,,,,,,:::::::::O',
      'O:O::::::::::,,O:3:s:O:sO',
      'O:::::O:3:s:O,,:O:::::::O',
      'Os:O:s:O:::::,,:::::O:3:O',
      'O::::::::::O:,,s:O:s:O::O',
      'O:O:3:s,,,,,,,,:::::::::O',
      'Os:O:::,,,,,,,,:O:3:s:O:O',
      'O::::::,,3:s:O:s:O::::::O',
      'O:s:O:s,,::::::::::::O:3O',
      'O::::::,,:::O:3:s:O:s:O:O',
      'O::O:3:,,O:s:O::::::::::O',
      'OOOOOOO,,OOOOOOOOOOOOOOOO',
      'XXXXXXX,,XXXXXXXXXXXXXXXX'
    ],
    npcs: [
      { x:14, y:8, dir:'left', sprite:'npc_youth', name:'FISHER LIL',
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
      south: { y:21, to:'summitvale', tx:7, ty:1 }
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
      'N.|,,,,,,,,,,,,,,,,N',
      'NNNNNNNNNNNNNNNNNNNN',
      'NNNNNNNNNNNNNNNNNNNN'
    ],
    npcs: [
      { x:14, y:8, dir:'down', sprite:'npc_oak', name:'CHAMPION ROWE',
        dialog:["You climbed all the way to SUMMITVALE!","Few trainers make it this far. Rest, and tell me your tale."] }
    ],
    ambient: [
      { species:'emberkit', x:8,  y:7,  range:2 },
      { species:'voltkit',  x:5,  y:13, range:2 },
      { species:'glimkit',  x:15, y:14, range:2 }
    ],
    signs: {
      '3,8': "SUMMITVALE - The road's end, for now."
    },
    doors: {
      '5,5':  { to:'summitvale_center', x:4, y:6 },
      '12,5': { to:'summitvale_mart',   x:5, y:9 },
      '12,11':{ to:'summitvale_house',  x:3, y:6 }
    },
    edges: {
      north: { y:0, to:'searoute', tx:7, ty:20 }
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
    tiles: [
      'JJJJJJJJJJJJJJJJJJJJJJJJJ',
      'J:::J:J,,:3:O:J:::::::::J',
      'J3:O:J:,,:::::::::J:J:5:J',
      'J::::::,,J:J:5:3:O:J::::J',
      'J:J:5:3,,:J::::::::::::JJ',
      'JJ:::::,,:::::J:J:5:3:O:J',
      'J::::J:,,,,,,,,J::::::::J',
      'J:3:O:J,,,,,,,,::::J:J:5J',
      'J:::::::::J:J,,:3:O:J:::J',
      'JJ:J:5:3:O:J:,,:::::::::J',
      'J:J::::::::::,,J:J:5:3:OJ',
      'J:::::J:J:5:3,,:J:::::::J',
      'J5:3:O:,,,,,,,,:::::J:J:J',
      'J::::::,,,,,,,,5:3:O:J::J',
      'J:J:J:5,,:O:J:::::::::::J',
      'JO:J:::,,:::::::J:J:5:3:J',
      'J::::::,,J:5:3:O:J::::::J',
      'J:5:3:O,,::::::::::::J:JJ',
      'J::::::,,:::J:J:5:3:O:J:J',
      'J::J:J:,,3:O:J::::::::::J',
      'J:O:J::,,::::::::J:J:5:3J',
      'XXXXXXX,,XXXXXXXXXXXXXXXX'
    ],
    npcs: [],
    encounters: [
      { species:'zapret',    minL:14, maxL:18, weight:4 },
      { species:'pebra',     minL:14, maxL:18, weight:5 },
      { species:'stoneworm', minL:14, maxL:18, weight:3 },
      { species:'cinderpup', minL:15, maxL:18, weight:3 },
      { species:'geistmite', minL:14, maxL:18, weight:2 }
    ],
    edges: {
      south: { y:21, to:'summitvale', tx:7, ty:6 }
    }
  },

  beach: {
    id:'beach', name:'Sunkissed Beach',
    tiles: [
      'OOOOOOOOOOOOOOOOOOOOOOOOO',
      'O:::3:O,,:W:s:O:::::::::O',
      'OW:s:O:,,:::::::::3:O:WWO',
      'O::::::,,3:O:t:W:s:O::WWO',
      'O:O:t:W,,:O:::::::::::WWO',
      'OO:::::,,:::::3:O:t:W:WWO',
      'O::::3:,,t:W:s:O::::::WWO',
      'O:W:s:O,,,,,,::::::3:OWWO',
      'O::::::,,,,,,:t:W:s:O:WWO',
      'O3:O:t:W:s:,,:::::::::WWO',
      'O:O::::::::,,::3:O:t:WWWO',
      'O:::::3:O:t,,:s:O:::::WWO',
      'Ot:W:s:O:::,,:::::::3:WWO',
      'O::::::,,,,,,O:t:W:s:OWWO',
      'O:3:O:t,,,,,,:::::::::WWO',
      'Os:O:::,,:::::::3:O:t:WWO',
      'O::::::,,O:t:W:s:O::::WWO',
      'O:t:W:s,,::::::::::::3WWO',
      'O::::::,,:::3:O:t:W:s:WWO',
      'O::3:O:,,W:s:O::::::::WWO',
      'O:s:O::,,::::::::3:O:t:WO',
      'XXXXXXX,,XXXXXXXXXXXXXXXX'
    ],
    npcs: [],
    encounters: [
      { species:'splashfin', minL:14, maxL:18, weight:5 },
      { species:'aquapup',   minL:14, maxL:18, weight:4 },
      { species:'mistfin',   minL:14, maxL:18, weight:3 },
      { species:'cavewing',  minL:14, maxL:18, weight:2 },
      { species:'galewing',  minL:14, maxL:18, weight:3 }
    ],
    edges: {
      south: { y:21, to:'harborside', tx:7, ty:16 }
    }
  },

  mountain: {
    id:'mountain', name:'Highspire Mountain',
    tiles: [
      'GGGGGGGGGGGGGGGGGGGGGGGGG',
      'G:::#:G,,:v:#:G:::::::::G',
      'Gv:#:G:,,:::::::::#:G:G:G',
      'G::::::,,#:G:G:v:#:G::::G',
      'G:G:G:v,,:G::::::::::::#G',
      'GG:::::,,,,,,,,,,:G:v:#:G',
      'G::::#:,,,,,,,,,,:::::::G',
      'G:v:#:G::::::::,,::#:G:GG',
      'G:::::::::#:G:G,,:#:G:::G',
      'G#:G:G:v:#:G:::,,:::::::G',
      'G:G::::::::::::,,G:G:v:#G',
      'G:::::#,,,,,,,,,,:::::::G',
      'GG:v:#:,,,,,,,,,,:::#:G:G',
      'G::::::,,::#:G:G:v:#:G::G',
      'G:#:G:G,,:#:G:::::::::::G',
      'G#:G:::,,:::::::#:G:G:v:G',
      'G:::,,,,,G:G:v:#:G::::::G',
      'G:G,,,,,,::::::::::::#:GG',
      'G::,,:::::::#:G:G:v:#:G:G',
      'G::,,G:G:v:#:G::::::::::G',
      'G:#:G::,,::::::::#:G:G:vG',
      'XXXXXXX,,XXXXXXXXXXXXXXXX'
    ],
    npcs: [],
    encounters: [
      { species:'pebra',     minL:16, maxL:20, weight:5 },
      { species:'stoneworm', minL:16, maxL:20, weight:4 },
      { species:'crysthorn', minL:18, maxL:22, weight:2 },
      { species:'geistmite', minL:16, maxL:20, weight:2 },
      { species:'snowox',    minL:18, maxL:22, weight:2 }
    ],
    edges: {
      south: { y:21, to:'crestrock', tx:7, ty:16 }
    }
  }
};

window.PR_MAPS = { MAPS, TILE_PROPS, tileAt };
