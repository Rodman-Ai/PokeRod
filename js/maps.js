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
  'X': { walk:true, edge:true, name:'edge' }
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
      'TTTTTTTTTTTTTTTTTTTT',
      'T..................T',
      'T..RRR....RRR......T',
      'T..RRR....RRR......T',
      'T..BDB....BDB......T',
      'T..,,,....,,,......T',
      'T..,..............,T',
      'T..,...PPPP.......,T',
      'T..,...PPPP.......,T',
      'T..,...BBDB.......,T',
      'T..,...,,,,.......,T',
      'T..S..............,T',
      'T..,..............,T',
      'T..,..WW..........,T',
      'T..,..WW..........,T',
      'T..,,,,,,,,,,,,,,,,T',
      'TTTTTTT,,TTTTTTTTTTT',
      'XXXXXXX,,XXXXXXXXXXX'
    ],
    npcs: [
      { x:11, y:10, dir:'down', sprite:'npc_oak', name:'PROF. ROD',
        dialog:["Welcome to the world of POKEROD!","I'm PROF. ROD, the local researcher.","Pick a partner from the lab to begin your journey!"] },
      { x:14, y:6, dir:'down', sprite:'npc_girl', name:'LILA',
        dialog:["The tall grass north of town is full of wild creatures.","Be careful out there!"] }
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
      'XXXXXXX,,XXXXXXXXXXX',
      'TTTTTTT,,TTTTTTTTTTT',
      'T......,,..........T',
      'T...:::,,:::.......T',
      'T..::::,,::::......T',
      'T...:::,,:::.......T',
      'T..::::,,::::....S.T',
      'T...:::,,::::......T',
      'T..::::,,:::.......T',
      'T...:::,,:::.......T',
      'T....::,,::........T',
      'T...:::,,:::.......T',
      'T..::::,,:::.......T',
      'T...:::,,:::.......T',
      'T......,,..........T',
      'TTTTTTT,,TTTTTTTTTTT',
      'XXXXXXX,,XXXXXXXXXXX'
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
      { species:'nibblet', minL:2, maxL:4, weight:5 },
      { species:'flitwing', minL:2, maxL:4, weight:4 },
      { species:'crawlbug', minL:2, maxL:3, weight:3 },
      { species:'zapret',   minL:3, maxL:5, weight:1 }
    ],
    edges: {
      north: { y:0,  to:'rodport',  tx:7, ty:16 },
      south: { y:16, to:'brindale', tx:7, ty:1 }
    }
  },

  brindale: {
    id:'brindale', name:'Brindale Town',
    tiles: [
      'XXXXXXX,,XXXXXXXXXXX',
      'TTTTTTT,,TTTTTTTTTTT',
      'T......,,..........T',
      'T..PPPP...MMMM.....T',
      'T..PPPP...MMMM.....T',
      'T..BBDB...BBDB.....T',
      'T..,,,,...,,,,.....T',
      'T..,..............,T',
      'T..,...RRR........,T',
      'T..,...RRR........,T',
      'T..,...BDB........,T',
      'T..,...,,,........,T',
      'T..S..............,T',
      'T..,..............,T',
      'T..,..............,T',
      'T..,,,,,,,,,,,,,,,,T',
      'TTTTTTTTTTTTTTTTTTTT'
    ],
    npcs: [
      { x:14, y:7, dir:'down', sprite:'npc_girl', name:'TOWNSFOLK',
        dialog:["BRINDALE TOWN!","The POKEROD CENTER on the left heals your team for free.","The MART on the right sells useful items."] }
    ],
    signs: {
      '3,12': "BRINDALE TOWN — Gateway to the highlands."
    },
    doors: {
      '5,5':  { to:'pokecenter', x:4, y:6 },
      '12,5': { to:'mart',       x:4, y:6 },
      '8,10': { to:'townhouse',  x:3, y:6 }
    },
    edges: {
      north: { y:0, to:'route1', tx:7, ty:16 }
    }
  },

  pokecenter: {
    id:'pokecenter', name:'PokeRod Center', interior:true,
    tiles: [
      'BBBBBBBBB',
      'BFFFFFFFB',
      'BFFFFFFFB',
      'BFFFFFFFB',
      'BFCHCFFFB',
      'BFFFFFFFB',
      'BFFFFFFFB',
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
      'BBBBBBBBB',
      'BFFFFFFFB',
      'BFFFFFFFB',
      'BFFFFFFFB',
      'BFCCFFFFB',
      'BFFFFFFFB',
      'BFFFFFFFB',
      'BBBBDBBBB'
    ],
    npcs: [
      { x:3, y:4, dir:'down', sprite:'clerk', name:'CLERK',
        dialog:["Welcome to the MART!","We're still stocking shelves — come back later."] }
    ],
    doors: {
      '4,7': { to:'brindale', x:12, y:6 }
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
  }
};

window.PR_MAPS = { MAPS, TILE_PROPS, tileAt };
