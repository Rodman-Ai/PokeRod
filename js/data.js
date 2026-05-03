// PokeRod data: original creatures, types, moves.
'use strict';

const TYPES = ['NORMAL','FIRE','WATER','GRASS','ELECTRIC','FLYING','BUG','POISON','GROUND','ROCK','PSYCHIC','ICE','DARK'];

const TYPE_COLOR = {
  NORMAL:'#a8a878', FIRE:'#f08030', WATER:'#6890f0', GRASS:'#78c850',
  ELECTRIC:'#f8d030', FLYING:'#a890f0', BUG:'#a8b820', POISON:'#a040a0',
  GROUND:'#e0c068', ROCK:'#b8a038', PSYCHIC:'#f85888', ICE:'#98d8d8', DARK:'#705848'
};

// effectiveness[atk][def] = multiplier; defaults to 1 if missing.
const TYPE_CHART = {
  FIRE:    { GRASS:2, ICE:2, BUG:2, WATER:0.5, FIRE:0.5, ROCK:0.5 },
  WATER:   { FIRE:2, GROUND:2, ROCK:2, WATER:0.5, GRASS:0.5 },
  GRASS:   { WATER:2, GROUND:2, ROCK:2, FIRE:0.5, GRASS:0.5, FLYING:0.5, BUG:0.5, POISON:0.5 },
  ELECTRIC:{ WATER:2, FLYING:2, GRASS:0.5, ELECTRIC:0.5, GROUND:0 },
  FLYING:  { GRASS:2, BUG:2, ELECTRIC:0.5, ROCK:0.5 },
  BUG:     { GRASS:2, PSYCHIC:2, DARK:2, FIRE:0.5, FLYING:0.5, POISON:0.5 },
  POISON:  { GRASS:2, POISON:0.5, GROUND:0.5, ROCK:0.5 },
  GROUND:  { FIRE:2, ELECTRIC:2, POISON:2, ROCK:2, GRASS:0.5, BUG:0.5, FLYING:0 },
  ROCK:    { FIRE:2, FLYING:2, BUG:2, ICE:2, GROUND:0.5 },
  PSYCHIC: { POISON:2, DARK:0, PSYCHIC:0.5 },
  ICE:     { GRASS:2, GROUND:2, FLYING:2, FIRE:0.5, WATER:0.5, ICE:0.5 },
  NORMAL:  { ROCK:0.5 },
  DARK:    { PSYCHIC:2, DARK:0.5 }
};

function effectiveness(atkType, defTypes) {
  let m = 1;
  for (const t of defTypes) {
    const row = TYPE_CHART[atkType] || {};
    if (row[t] !== undefined) m *= row[t];
  }
  return m;
}

// Moves: id -> { name, type, power, accuracy, kind: 'physical'|'special'|'status', pp, effect? }
const MOVES = {
  tackle:    { name:'Tackle',    type:'NORMAL',   power:40, accuracy:100, kind:'physical', pp:35 },
  scratch:   { name:'Scratch',   type:'NORMAL',   power:40, accuracy:100, kind:'physical', pp:35 },
  quickjab:  { name:'Quick Jab', type:'NORMAL',   power:40, accuracy:100, kind:'physical', pp:30, priority:1 },
  bite:      { name:'Bite',      type:'DARK',     power:55, accuracy:100, kind:'physical', pp:25 },
  growl:     { name:'Growl',     type:'NORMAL',   power:0,  accuracy:100, kind:'status',   pp:40, statChange:{target:'foe', stat:'atk', stages:-1} },
  tailwhip:  { name:'Tail Whip', type:'NORMAL',   power:0,  accuracy:100, kind:'status',   pp:30, statChange:{target:'foe', stat:'def', stages:-1} },
  ember:     { name:'Ember',     type:'FIRE',     power:40, accuracy:100, kind:'special',  pp:25, burnChance:0.1 },
  flamejet:  { name:'Flame Jet', type:'FIRE',     power:65, accuracy:95,  kind:'special',  pp:15, burnChance:0.1 },
  bubble:    { name:'Bubble',    type:'WATER',    power:40, accuracy:100, kind:'special',  pp:30 },
  watergun:  { name:'Water Gun', type:'WATER',    power:55, accuracy:100, kind:'special',  pp:25 },
  vinelash:  { name:'Vine Lash', type:'GRASS',    power:45, accuracy:100, kind:'physical', pp:25 },
  leafcut:   { name:'Leaf Cut',  type:'GRASS',    power:60, accuracy:95,  kind:'physical', pp:20 },
  spark:     { name:'Spark',     type:'ELECTRIC', power:40, accuracy:100, kind:'special',  pp:30, paralyzeChance:0.1 },
  zapburst:  { name:'Zap Burst', type:'ELECTRIC', power:65, accuracy:95,  kind:'special',  pp:15, paralyzeChance:0.1 },
  gust:      { name:'Gust',      type:'FLYING',   power:40, accuracy:100, kind:'special',  pp:30 },
  airslash:  { name:'Air Slash', type:'FLYING',   power:60, accuracy:95,  kind:'special',  pp:20 },
  bugbite:   { name:'Bug Bite',  type:'BUG',      power:50, accuracy:100, kind:'physical', pp:20 },
  pinmissile:{ name:'Pin Missile',type:'BUG',     power:25, accuracy:95,  kind:'physical', pp:20, multi:[2,5] },
  poisonsting:{name:'Poison Sting',type:'POISON', power:30, accuracy:100, kind:'physical', pp:35, poisonChance:0.3 },
  acidspray: { name:'Acid Spray',type:'POISON',   power:40, accuracy:100, kind:'special',  pp:20 },
  rocktoss:  { name:'Rock Toss', type:'ROCK',     power:50, accuracy:90,  kind:'physical', pp:15 },
  earthbump: { name:'Earth Bump',type:'GROUND',   power:55, accuracy:100, kind:'physical', pp:20 },
  shimmer:   { name:'Shimmer',   type:'PSYCHIC',  power:50, accuracy:100, kind:'special',  pp:25, confuseChance:0.1 },
  dazzle:    { name:'Dazzle',    type:'PSYCHIC',  power:0,  accuracy:90,  kind:'status',   pp:15, confuseChance:1.0 },
  freezewind:{ name:'Freeze Wind',type:'ICE',     power:55, accuracy:95,  kind:'special',  pp:20, freezeChance:0.1 },
  lullaby:   { name:'Lullaby',   type:'NORMAL',   power:0,  accuracy:75,  kind:'status',   pp:15, sleepChance:1.0 },
  hypnoray:  { name:'Hypnoray',  type:'PSYCHIC',  power:0,  accuracy:60,  kind:'status',   pp:20, sleepChance:1.0 },
  splash:    { name:'Splash',    type:'NORMAL',   power:0,  accuracy:100, kind:'status',   pp:40, dud:true }
};

// Creatures (original designs). Stats are baseStats. Sprite is drawn procedurally from "design".
// design: { palette: [primary, secondary, accent], shape, ears, eyes, mouth, accentShape }
const CREATURES = {
  emberkit: {
    id:'emberkit', name:'Emberkit', dex:1,
    types:['FIRE'],
    baseStats:{hp:39, atk:52, def:43, spa:60, spd:50, spe:65},
    learnset:[ [1,'scratch'],[1,'growl'],[7,'ember'],[13,'quickjab'],[19,'bite'],[25,'flamejet'] ],
    evolves:{ to:'flarebound', level:16 },
    catchRate:45,
    design:{ palette:['#e8552a','#f5c842','#5a1f0e'], shape:'fox', accent:'flame' }
  },
  flarebound: {
    id:'flarebound', name:'Flarebound', dex:2,
    types:['FIRE'],
    baseStats:{hp:58, atk:64, def:58, spa:80, spd:65, spe:80},
    learnset:[ [1,'scratch'],[1,'growl'],[7,'ember'],[13,'quickjab'],[19,'bite'],[27,'flamejet'] ],
    evolves:{ to:'infernarok', level:36 }, catchRate:25,
    design:{ palette:['#d63f1a','#ffb84a','#3a0e02'], shape:'fox', accent:'flame', big:true }
  },
  infernarok: {
    id:'infernarok', name:'Infernarok', dex:35,
    types:['FIRE','ROCK'],
    baseStats:{hp:78, atk:84, def:78, spa:109, spd:85, spe:100},
    learnset:[ [1,'scratch'],[1,'growl'],[7,'ember'],[13,'quickjab'],[19,'bite'],[27,'flamejet'],[36,'rocktoss'] ],
    catchRate:15,
    design:{ palette:['#a8200a','#f08020','#1a0000'], shape:'fox', accent:'flame', big:true, beard:true }
  },
  aquapup: {
    id:'aquapup', name:'Aquapup', dex:3,
    types:['WATER'],
    baseStats:{hp:44, atk:48, def:65, spa:50, spd:64, spe:43},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[7,'bubble'],[13,'bite'],[19,'watergun'],[25,'freezewind'] ],
    evolves:{ to:'tideturtle', level:16 },
    catchRate:45,
    design:{ palette:['#3d6cd1','#a8d8ff','#1a2f5c'], shape:'turtle', accent:'shell' }
  },
  tideturtle: {
    id:'tideturtle', name:'Tideturtle', dex:4,
    types:['WATER'],
    baseStats:{hp:59, atk:63, def:80, spa:65, spd:80, spe:58},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[7,'bubble'],[13,'bite'],[19,'watergun'],[27,'freezewind'] ],
    evolves:{ to:'maelstroth', level:36 }, catchRate:25,
    design:{ palette:['#2853bf','#7ec0ff','#0d1c3a'], shape:'turtle', accent:'shell', big:true }
  },
  maelstroth: {
    id:'maelstroth', name:'Maelstroth', dex:36,
    types:['WATER','ROCK'],
    baseStats:{hp:79, atk:83, def:100, spa:85, spd:105, spe:78},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[7,'bubble'],[13,'bite'],[19,'watergun'],[27,'freezewind'],[36,'rocktoss'] ],
    catchRate:15,
    design:{ palette:['#103080','#5898d8','#000a20'], shape:'turtle', accent:'shell', big:true, beard:true }
  },
  sproutling: {
    id:'sproutling', name:'Sproutling', dex:5,
    types:['GRASS','POISON'],
    baseStats:{hp:45, atk:49, def:49, spa:65, spd:65, spe:45},
    learnset:[ [1,'tackle'],[1,'growl'],[7,'vinelash'],[13,'poisonsting'],[19,'leafcut'],[25,'acidspray'] ],
    evolves:{ to:'leafurge', level:16 },
    catchRate:45,
    design:{ palette:['#5cb84a','#f08bb8','#2b5e22'], shape:'plant', accent:'bud' }
  },
  leafurge: {
    id:'leafurge', name:'Leafurge', dex:6,
    types:['GRASS','POISON'],
    baseStats:{hp:60, atk:62, def:63, spa:80, spd:80, spe:60},
    learnset:[ [1,'tackle'],[1,'growl'],[7,'vinelash'],[13,'poisonsting'],[19,'leafcut'],[27,'acidspray'] ],
    evolves:{ to:'verdantsage', level:36 }, catchRate:25,
    design:{ palette:['#3f9a30','#ff7ab0','#1a4012'], shape:'plant', accent:'bud', big:true }
  },
  verdantsage: {
    id:'verdantsage', name:'Verdantsage', dex:37,
    types:['GRASS','POISON'],
    baseStats:{hp:80, atk:82, def:83, spa:100, spd:100, spe:80},
    learnset:[ [1,'tackle'],[1,'growl'],[7,'vinelash'],[13,'poisonsting'],[19,'leafcut'],[27,'acidspray'],[36,'shimmer'] ],
    catchRate:15,
    design:{ palette:['#1c6818','#f04898','#082008'], shape:'plant', accent:'bud', big:true, beard:true }
  },
  zapret: {
    id:'zapret', name:'Zapret', dex:7,
    types:['ELECTRIC'],
    baseStats:{hp:35, atk:55, def:30, spa:50, spd:40, spe:90},
    learnset:[ [1,'quickjab'],[1,'growl'],[6,'spark'],[12,'tailwhip'],[18,'bite'],[24,'zapburst'] ],
    evolves:{ to:'boltbeard', level:30 }, catchRate:190,
    design:{ palette:['#f4d320','#3a1f00','#e85a5a'], shape:'mouse', accent:'bolt' }
  },
  boltbeard: {
    id:'boltbeard', name:'Boltbeard', dex:42, types:['ELECTRIC'],
    baseStats:{hp:60, atk:90, def:55, spa:90, spd:80, spe:110},
    learnset:[ [1,'quickjab'],[1,'growl'],[6,'spark'],[12,'tailwhip'],[18,'bite'],[24,'zapburst'],[30,'shimmer'] ],
    catchRate:60,
    design:{ palette:['#e8c008','#1a1208','#f08840'], shape:'mouse', accent:'bolt', beard:true }
  },
  pebra: {
    id:'pebra', name:'Pebra', dex:8,
    types:['ROCK','GROUND'],
    baseStats:{hp:40, atk:80, def:100, spa:30, spd:30, spe:20},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[6,'rocktoss'],[12,'earthbump'],[18,'bite'],[24,'rocktoss'] ],
    evolves:{ to:'boulderon', level:25 }, catchRate:255,
    design:{ palette:['#8a7a5c','#5a4d36','#cfc1a0'], shape:'rock', accent:'pebble' }
  },
  boulderon: {
    id:'boulderon', name:'Boulderon', dex:43,
    types:['ROCK','GROUND'],
    baseStats:{hp:80, atk:110, def:130, spa:55, spd:65, spe:45},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[6,'rocktoss'],[12,'earthbump'],[18,'bite'],[25,'rocktoss'] ],
    catchRate:60,
    design:{ palette:['#6a5a40','#382c1a','#a89870'], shape:'rock', accent:'pebble', beard:true }
  },
  flitwing: {
    id:'flitwing', name:'Flitwing', dex:9,
    types:['NORMAL','FLYING'],
    baseStats:{hp:40, atk:45, def:40, spa:35, spd:35, spe:56},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[5,'gust'],[11,'quickjab'],[17,'airslash'] ],
    evolves:{ to:'skylordan', level:24 }, catchRate:255,
    design:{ palette:['#a87a4e','#f0d8a8','#3a2210'], shape:'bird', accent:'wings' }
  },
  skylordan: {
    id:'skylordan', name:'Skylordan', dex:47, types:['NORMAL','FLYING'],
    baseStats:{hp:75, atk:85, def:75, spa:65, spd:70, spe:96},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[5,'gust'],[11,'quickjab'],[17,'airslash'],[24,'shimmer'] ],
    catchRate:60,
    design:{ palette:['#785030','#d8b878','#1a0a04'], shape:'bird', accent:'wings', beard:true }
  },
  nibblet: {
    id:'nibblet', name:'Nibblet', dex:10,
    types:['NORMAL'],
    baseStats:{hp:30, atk:56, def:35, spa:25, spd:35, spe:72},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[5,'quickjab'],[11,'bite'] ],
    evolves:{ to:'whiskaroth', level:20 }, catchRate:255,
    design:{ palette:['#a06030','#d4a36a','#1f1006'], shape:'mouse', accent:'tail' }
  },
  whiskaroth: {
    id:'whiskaroth', name:'Whiskaroth', dex:52, types:['NORMAL','DARK'],
    baseStats:{hp:55, atk:81, def:60, spa:50, spd:70, spe:97},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[5,'quickjab'],[11,'bite'],[20,'shimmer'] ],
    catchRate:127,
    design:{ palette:['#704020','#a07040','#0a0402'], shape:'mouse', accent:'tail', beard:true }
  },
  crawlbug: {
    id:'crawlbug', name:'Crawlbug', dex:11,
    types:['BUG'],
    baseStats:{hp:45, atk:30, def:35, spa:20, spd:20, spe:45},
    learnset:[ [1,'tackle'],[1,'growl'],[6,'bugbite'] ],
    evolves:{ to:'mothmane', level:18 }, catchRate:255,
    design:{ palette:['#90b85a','#3a4a18','#f0e878'], shape:'caterpillar', accent:'segments' }
  },
  mothmane: {
    id:'mothmane', name:'Mothmane', dex:44, types:['BUG','FLYING'],
    baseStats:{hp:65, atk:60, def:55, spa:80, spd:80, spe:80},
    learnset:[ [1,'tackle'],[1,'growl'],[6,'bugbite'],[18,'gust'],[24,'shimmer'] ],
    catchRate:90,
    design:{ palette:['#a8c060','#283010','#e8d860'], shape:'bat', accent:'wings', beard:true }
  },
  cavewing: {
    id:'cavewing', name:'Cavewing', dex:12,
    types:['POISON','FLYING'],
    baseStats:{hp:40, atk:45, def:35, spa:30, spd:40, spe:55},
    learnset:[ [1,'tackle'],[6,'gust'],[12,'bite'],[18,'poisonsting'],[24,'airslash'] ],
    evolves:{ to:'vampirothy', level:22 }, catchRate:255,
    design:{ palette:['#5a3a8a','#2a1a4a','#e85a8a'], shape:'bat', accent:'wings' }
  },
  vampirothy: {
    id:'vampirothy', name:'Vampirothy', dex:50, types:['POISON','FLYING'],
    baseStats:{hp:75, atk:80, def:70, spa:75, spd:75, spe:90},
    learnset:[ [1,'tackle'],[6,'gust'],[12,'bite'],[18,'poisonsting'],[24,'airslash'],[30,'shimmer'] ],
    catchRate:90,
    design:{ palette:['#3a2068','#100828','#e83878'], shape:'bat', accent:'wings', beard:true }
  },
  splashfin: {
    id:'splashfin', name:'Splashfin', dex:13,
    types:['WATER'],
    baseStats:{hp:20, atk:10, def:55, spa:15, spd:20, spe:80},
    learnset:[ [1,'splash'],[15,'tackle'] ],
    evolves:{ to:'levifin', level:20 }, catchRate:255,
    design:{ palette:['#e85a5a','#ffd070','#3a1010'], shape:'fish', accent:'fins' }
  },
  levifin: {
    id:'levifin', name:'Levifin', dex:51, types:['WATER','DARK'],
    baseStats:{hp:95, atk:125, def:79, spa:60, spd:100, spe:81},
    learnset:[ [1,'tackle'],[1,'bite'],[15,'watergun'],[20,'freezewind'],[28,'airslash'] ],
    catchRate:45,
    design:{ palette:['#9858a8','#e84020','#1a0820'], shape:'fish', accent:'fins', beard:true }
  },
  glimkit: {
    id:'glimkit', name:'Glimkit', dex:14,
    types:['NORMAL'],
    baseStats:{hp:55, atk:55, def:50, spa:45, spd:65, spe:55},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[5,'quickjab'],[11,'bite'],[17,'shimmer'] ],
    evolves:{ to:'lustrofox', level:32 }, catchRate:45,
    design:{ palette:['#d8b878','#f0d8a8','#3a2210'], shape:'fox', accent:'tail' }
  },
  lustrofox: {
    id:'lustrofox', name:'Lustrofox', dex:53, types:['NORMAL','PSYCHIC'],
    baseStats:{hp:80, atk:80, def:75, spa:90, spd:110, spe:90},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[5,'quickjab'],[11,'bite'],[17,'shimmer'],[32,'freezewind'] ],
    catchRate:30,
    design:{ palette:['#f0d8a8','#fff8e0','#a06030'], shape:'fox', accent:'tail', big:true, beard:true }
  },
  cinderpup: {
    id:'cinderpup', name:'Cinderpup', dex:15, types:['FIRE'],
    baseStats:{hp:50, atk:60, def:40, spa:55, spd:40, spe:75},
    learnset:[ [1,'scratch'],[1,'tailwhip'],[6,'ember'],[12,'quickjab'],[18,'bite'],[24,'flamejet'] ],
    evolves:{ to:'pyrohound', level:18 }, catchRate:120,
    design:{ palette:['#e84020','#f8c850','#3a0e02'], shape:'fox', accent:'flame' }
  },
  pyrohound: {
    id:'pyrohound', name:'Pyrohound', dex:16, types:['FIRE'],
    baseStats:{hp:65, atk:80, def:55, spa:70, spd:55, spe:95},
    learnset:[ [1,'scratch'],[1,'tailwhip'],[6,'ember'],[12,'quickjab'],[18,'bite'],[26,'flamejet'] ],
    evolves:{ to:'magmaron', level:34 }, catchRate:60,
    design:{ palette:['#c83018','#ffa030','#2a0602'], shape:'fox', accent:'flame', big:true }
  },
  magmaron: {
    id:'magmaron', name:'Magmaron', dex:38, types:['FIRE','GROUND'],
    baseStats:{hp:80, atk:105, def:75, spa:85, spd:70, spe:115},
    learnset:[ [1,'scratch'],[1,'tailwhip'],[6,'ember'],[12,'quickjab'],[18,'bite'],[26,'flamejet'],[34,'earthbump'] ],
    catchRate:30,
    design:{ palette:['#a01000','#f0a020','#180000'], shape:'fox', accent:'flame', big:true, beard:true }
  },
  mistfin: {
    id:'mistfin', name:'Mistfin', dex:17, types:['WATER'],
    baseStats:{hp:42, atk:40, def:42, spa:60, spd:50, spe:60},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[7,'bubble'],[13,'watergun'],[19,'freezewind'] ],
    evolves:{ to:'tidalwhal', level:20 }, catchRate:180,
    design:{ palette:['#5a98e0','#c0e8ff','#1a3868'], shape:'fish', accent:'fins' }
  },
  tidalwhal: {
    id:'tidalwhal', name:'Tidalwhal', dex:18, types:['WATER','ICE'],
    baseStats:{hp:75, atk:60, def:75, spa:85, spd:75, spe:55},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[7,'bubble'],[13,'watergun'],[20,'freezewind'] ],
    evolves:{ to:'glacierock', level:34 }, catchRate:75,
    design:{ palette:['#3868b8','#a0d0f0','#0a1a3a'], shape:'fish', accent:'fins' }
  },
  glacierock: {
    id:'glacierock', name:'Glacierock', dex:39, types:['WATER','ICE'],
    baseStats:{hp:95, atk:80, def:95, spa:105, spd:95, spe:75},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[7,'bubble'],[13,'watergun'],[20,'freezewind'],[34,'rocktoss'] ],
    catchRate:25,
    design:{ palette:['#0a3878','#80b8e8','#000820'], shape:'fish', accent:'fins', beard:true }
  },
  fernsprout: {
    id:'fernsprout', name:'Fernsprout', dex:19, types:['GRASS'],
    baseStats:{hp:50, atk:45, def:55, spa:60, spd:55, spe:50},
    learnset:[ [1,'tackle'],[1,'growl'],[6,'vinelash'],[12,'leafcut'],[18,'acidspray'] ],
    evolves:{ to:'bramblewood', level:18 }, catchRate:120,
    design:{ palette:['#68c050','#f0c020','#244818'], shape:'plant', accent:'bud' }
  },
  bramblewood: {
    id:'bramblewood', name:'Bramblewood', dex:20, types:['GRASS','ROCK'],
    baseStats:{hp:70, atk:75, def:85, spa:65, spd:70, spe:45},
    learnset:[ [1,'tackle'],[1,'growl'],[6,'vinelash'],[12,'leafcut'],[20,'rocktoss'] ],
    evolves:{ to:'thornedred', level:34 }, catchRate:60,
    design:{ palette:['#3a8030','#d8a020','#0e2c0e'], shape:'plant', accent:'bud', big:true }
  },
  thornedred: {
    id:'thornedred', name:'Thornedred', dex:40, types:['GRASS','ROCK'],
    baseStats:{hp:95, atk:100, def:110, spa:80, spd:90, spe:55},
    learnset:[ [1,'tackle'],[1,'growl'],[6,'vinelash'],[12,'leafcut'],[20,'rocktoss'],[34,'earthbump'] ],
    catchRate:25,
    design:{ palette:['#1c5818','#b88018','#040c04'], shape:'plant', accent:'bud', big:true, beard:true }
  },
  voltkit: {
    id:'voltkit', name:'Voltkit', dex:21, types:['ELECTRIC'],
    baseStats:{hp:40, atk:50, def:35, spa:65, spd:50, spe:80},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[6,'spark'],[12,'quickjab'],[18,'zapburst'] ],
    evolves:{ to:'voltlynx', level:20 }, catchRate:120,
    design:{ palette:['#f0d018','#383018','#e85a5a'], shape:'fox', accent:'tail' }
  },
  voltlynx: {
    id:'voltlynx', name:'Voltlynx', dex:22, types:['ELECTRIC'],
    baseStats:{hp:60, atk:75, def:55, spa:90, spd:70, spe:115},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[6,'spark'],[12,'quickjab'],[20,'zapburst'] ],
    evolves:{ to:'stormfangis', level:34 }, catchRate:45,
    design:{ palette:['#e8b818','#181810','#f08020'], shape:'fox', accent:'tail', big:true }
  },
  stormfangis: {
    id:'stormfangis', name:'Stormfangis', dex:41, types:['ELECTRIC','DARK'],
    baseStats:{hp:80, atk:100, def:75, spa:110, spd:85, spe:130},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[6,'spark'],[12,'quickjab'],[20,'zapburst'],[34,'bite'] ],
    catchRate:25,
    design:{ palette:['#c89008','#0a0a0a','#e84830'], shape:'fox', accent:'tail', big:true, beard:true }
  },
  stoneworm: {
    id:'stoneworm', name:'Stoneworm', dex:23, types:['GROUND'],
    baseStats:{hp:60, atk:65, def:80, spa:25, spd:35, spe:30},
    learnset:[ [1,'tackle'],[1,'growl'],[8,'rocktoss'],[14,'earthbump'] ],
    evolves:{ to:'quakeworm', level:22 }, catchRate:90,
    design:{ palette:['#a08858','#5a4830','#d8c098'], shape:'caterpillar', accent:'segments' }
  },
  quakeworm: {
    id:'quakeworm', name:'Quakeworm', dex:24, types:['GROUND','ROCK'],
    baseStats:{hp:85, atk:90, def:110, spa:35, spd:50, spe:40},
    learnset:[ [1,'tackle'],[1,'growl'],[8,'rocktoss'],[14,'earthbump'],[24,'bite'] ],
    evolves:{ to:'tectonarch', level:36 }, catchRate:45,
    design:{ palette:['#80684a','#403020','#a89070'], shape:'caterpillar', accent:'segments' }
  },
  tectonarch: {
    id:'tectonarch', name:'Tectonarch', dex:45, types:['GROUND','ROCK'],
    baseStats:{hp:110, atk:120, def:140, spa:55, spd:75, spe:50},
    learnset:[ [1,'tackle'],[1,'growl'],[8,'rocktoss'],[14,'earthbump'],[24,'bite'],[36,'flamejet'] ],
    catchRate:25,
    design:{ palette:['#604830','#201810','#988050'], shape:'caterpillar', accent:'segments', beard:true }
  },
  bumblesting: {
    id:'bumblesting', name:'Bumblesting', dex:25, types:['BUG','POISON'],
    baseStats:{hp:40, atk:55, def:35, spa:30, spd:35, spe:75},
    learnset:[ [1,'tackle'],[1,'poisonsting'],[7,'bugbite'],[13,'pinmissile'] ],
    evolves:{ to:'hivequeen', level:20 }, catchRate:150,
    design:{ palette:['#f0c020','#000000','#e85a18'], shape:'caterpillar', accent:'segments' }
  },
  hivequeen: {
    id:'hivequeen', name:'Hivequeen', dex:26, types:['BUG','POISON'],
    baseStats:{hp:65, atk:80, def:60, spa:65, spd:65, spe:95},
    learnset:[ [1,'tackle'],[1,'poisonsting'],[7,'bugbite'],[13,'pinmissile'],[22,'acidspray'] ],
    evolves:{ to:'royalwasp', level:34 }, catchRate:60,
    design:{ palette:['#d8a818','#181818','#e84030'], shape:'bat', accent:'wings' }
  },
  royalwasp: {
    id:'royalwasp', name:'Royalwasp', dex:46, types:['BUG','POISON'],
    baseStats:{hp:85, atk:105, def:80, spa:90, spd:85, spe:115},
    learnset:[ [1,'tackle'],[1,'poisonsting'],[7,'bugbite'],[13,'pinmissile'],[22,'acidspray'],[34,'airslash'] ],
    catchRate:25,
    design:{ palette:['#b88808','#080808','#e83020'], shape:'bat', accent:'wings', beard:true }
  },
  galewing: {
    id:'galewing', name:'Galewing', dex:27, types:['NORMAL','FLYING'],
    baseStats:{hp:55, atk:60, def:50, spa:50, spd:50, spe:90},
    learnset:[ [1,'tackle'],[1,'growl'],[6,'gust'],[12,'quickjab'],[18,'airslash'] ],
    evolves:{ to:'tempestir', level:30 }, catchRate:120,
    design:{ palette:['#a0a0c8','#f0f0f0','#383850'], shape:'bird', accent:'wings' }
  },
  tempestir: {
    id:'tempestir', name:'Tempestir', dex:48, types:['NORMAL','FLYING'],
    baseStats:{hp:80, atk:90, def:75, spa:80, spd:80, spe:120},
    learnset:[ [1,'tackle'],[1,'growl'],[6,'gust'],[12,'quickjab'],[18,'airslash'],[30,'spark'] ],
    catchRate:45,
    design:{ palette:['#7878a0','#e0e0e8','#181828'], shape:'bird', accent:'wings', beard:true }
  },
  solarwing: {
    id:'solarwing', name:'Solarwing', dex:28, types:['FIRE','FLYING'],
    baseStats:{hp:75, atk:85, def:70, spa:90, spd:75, spe:100},
    learnset:[ [1,'tackle'],[1,'growl'],[6,'gust'],[12,'ember'],[20,'airslash'],[28,'flamejet'] ],
    evolves:{ to:'solarcrest', level:36 }, catchRate:30,
    design:{ palette:['#f0a020','#ffe060','#a02810'], shape:'bird', accent:'wings' }
  },
  solarcrest: {
    id:'solarcrest', name:'Solarcrest', dex:49, types:['FIRE','FLYING'],
    baseStats:{hp:95, atk:105, def:85, spa:115, spd:95, spe:120},
    learnset:[ [1,'tackle'],[1,'growl'],[6,'gust'],[12,'ember'],[20,'airslash'],[28,'flamejet'],[36,'shimmer'] ],
    catchRate:15,
    design:{ palette:['#d88008','#fff080','#600800'], shape:'bird', accent:'wings', beard:true }
  },
  frostpup: {
    id:'frostpup', name:'Frostpup', dex:29, types:['ICE'],
    baseStats:{hp:50, atk:55, def:50, spa:65, spd:55, spe:60},
    learnset:[ [1,'tackle'],[1,'growl'],[6,'bite'],[12,'freezewind'] ],
    evolves:{ to:'snowox', level:20 }, catchRate:120,
    design:{ palette:['#e0f0ff','#88c8ff','#284868'], shape:'fox', accent:'tail' }
  },
  snowox: {
    id:'snowox', name:'Snowox', dex:30, types:['ICE','NORMAL'],
    baseStats:{hp:80, atk:85, def:80, spa:75, spd:75, spe:50},
    learnset:[ [1,'tackle'],[1,'growl'],[6,'bite'],[12,'freezewind'],[24,'earthbump'] ],
    evolves:{ to:'glacioxen', level:36 }, catchRate:60,
    design:{ palette:['#c8e0f0','#5898d0','#101830'], shape:'rock', accent:'pebble' }
  },
  glacioxen: {
    id:'glacioxen', name:'Glacioxen', dex:54, types:['ICE','NORMAL'],
    baseStats:{hp:110, atk:115, def:105, spa:90, spd:100, spe:65},
    learnset:[ [1,'tackle'],[1,'growl'],[6,'bite'],[12,'freezewind'],[24,'earthbump'],[36,'rocktoss'] ],
    catchRate:25,
    design:{ palette:['#a8c8e0','#3878b8','#000810'], shape:'rock', accent:'pebble', beard:true }
  },
  crysthorn: {
    id:'crysthorn', name:'Crysthorn', dex:31, types:['ROCK','PSYCHIC'],
    baseStats:{hp:60, atk:60, def:90, spa:80, spd:75, spe:55},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[7,'rocktoss'],[14,'shimmer'] ],
    evolves:{ to:'prismage', level:32 }, catchRate:60,
    design:{ palette:['#9870c8','#d8b8f0','#382048'], shape:'rock', accent:'pebble' }
  },
  prismage: {
    id:'prismage', name:'Prismage', dex:56, types:['ROCK','PSYCHIC'],
    baseStats:{hp:90, atk:80, def:120, spa:115, spd:105, spe:75},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[7,'rocktoss'],[14,'shimmer'],[24,'freezewind'],[32,'earthbump'] ],
    catchRate:25,
    design:{ palette:['#7048a0','#d0a8f8','#180830'], shape:'rock', accent:'pebble', beard:true }
  },
  geistmite: {
    id:'geistmite', name:'Geistmite', dex:32, types:['DARK'],
    baseStats:{hp:45, atk:50, def:40, spa:65, spd:50, spe:80},
    learnset:[ [1,'tackle'],[1,'growl'],[6,'bite'],[12,'shimmer'] ],
    evolves:{ to:'shadefox', level:22 }, catchRate:120,
    design:{ palette:['#383848','#181820','#e85a5a'], shape:'bat', accent:'wings' }
  },
  shadefox: {
    id:'shadefox', name:'Shadefox', dex:33, types:['DARK'],
    baseStats:{hp:65, atk:80, def:60, spa:85, spd:70, spe:105},
    learnset:[ [1,'tackle'],[1,'growl'],[6,'bite'],[12,'shimmer'],[24,'quickjab'] ],
    evolves:{ to:'umbrasire', level:36 }, catchRate:45,
    design:{ palette:['#202028','#0a0a10','#e84838'], shape:'fox', accent:'tail', big:true }
  },
  umbrasire: {
    id:'umbrasire', name:'Umbrasire', dex:55, types:['DARK','PSYCHIC'],
    baseStats:{hp:85, atk:100, def:80, spa:105, spd:90, spe:125},
    learnset:[ [1,'tackle'],[1,'growl'],[6,'bite'],[12,'shimmer'],[24,'quickjab'],[36,'airslash'] ],
    catchRate:15,
    design:{ palette:['#101018','#000004','#e83020'], shape:'fox', accent:'tail', big:true, beard:true }
  },
  dreamilly: {
    id:'dreamilly', name:'Dreamilly', dex:34, types:['PSYCHIC','GRASS'],
    baseStats:{hp:60, atk:35, def:50, spa:90, spd:90, spe:60},
    learnset:[ [1,'growl'],[1,'tailwhip'],[6,'shimmer'],[12,'vinelash'],[20,'leafcut'] ],
    evolves:{ to:'reverieus', level:32 }, catchRate:75,
    design:{ palette:['#e8a8d8','#fff0f8','#a04878'], shape:'plant', accent:'bud' }
  },
  reverieus: {
    id:'reverieus', name:'Reverieus', dex:57, types:['PSYCHIC','GRASS'],
    baseStats:{hp:80, atk:55, def:70, spa:130, spd:130, spe:80},
    learnset:[ [1,'growl'],[1,'tailwhip'],[6,'shimmer'],[12,'vinelash'],[20,'leafcut'],[32,'freezewind'] ],
    catchRate:30,
    design:{ palette:['#d878b8','#fff8ff','#702848'], shape:'plant', accent:'bud', beard:true }
  }
};

// XP & Level helpers (medium-fast curve).
function xpForLevel(L) { return Math.floor(Math.pow(L, 3)); }
function levelFromXp(xp) {
  let L = 1;
  while (xpForLevel(L+1) <= xp && L < 100) L++;
  return L;
}

// Build a creature instance.
function makeMon(speciesId, level, opts) {
  const sp = CREATURES[speciesId];
  if (!sp) throw new Error('unknown species ' + speciesId);
  level = Math.max(1, level|0);
  const ivs = (opts && opts.ivs) || { hp:8, atk:8, def:8, spa:8, spd:8, spe:8 };
  // Pick up to 4 most-recent moves at this level.
  const learned = sp.learnset.filter(([lv]) => lv <= level).map(([,m]) => m);
  const moves = learned.slice(-4).map(id => ({ id, pp: MOVES[id].pp, ppMax: MOVES[id].pp }));
  const stats = computeStats(sp.baseStats, ivs, level);
  return {
    species: speciesId,
    nickname: (opts && opts.nickname) || sp.name,
    level,
    xp: xpForLevel(level),
    ivs,
    moves,
    stats,
    hp: stats.hp,
    status: null,
    statStages: { atk:0, def:0, spa:0, spd:0, spe:0, acc:0, eva:0 }
  };
}

function computeStats(base, ivs, level) {
  const calc = (b, iv) => Math.floor(((2*b + iv) * level) / 100) + 5;
  const calcHp = (b, iv) => Math.floor(((2*b + iv) * level) / 100) + level + 10;
  return {
    hp:  calcHp(base.hp, ivs.hp),
    atk: calc(base.atk, ivs.atk),
    def: calc(base.def, ivs.def),
    spa: calc(base.spa, ivs.spa),
    spd: calc(base.spd, ivs.spd),
    spe: calc(base.spe, ivs.spe)
  };
}

// XP yield on defeat.
function xpYield(loserSpecies, loserLevel) {
  return Math.max(1, Math.floor(loserLevel * 7));
}

// XP share ratio for a party member: full for the active battler, half
// for bench mons (standard exp-share-on behaviour).
function xpShareRatio(isActive) { return isActive ? 1.0 : 0.5; }

// Combined XP multiplier from the player's worn trinket and this mon's
// held item (e.g. Lucky Egg). Each contributes its own xpMult; missing
// items / unknown ids are treated as 1.0. PR_ITEMS may not be loaded
// during early bootstrap so it's looked up lazily.
function xpMultiplier(state, mon) {
  let m = 1.0;
  const items = window.PR_ITEMS;
  if (!items || !state || !state.player) return m;
  const eq = state.player.equipment || null;
  if (eq && eq.trinket) {
    const def = items.byId(eq.trinket);
    if (def && def.xpMult) m *= def.xpMult;
  }
  if (mon && mon.held) {
    const def = items.byId(mon.held);
    if (def && def.xpMult) m *= def.xpMult;
  }
  return m;
}

// Damage calc (simplified Gen 5+ style).
function calcDamage(attacker, defender, move, isCrit) {
  if (move.kind === 'status' || (move.power|0) === 0) return 0;
  const A = move.kind === 'physical' ? attacker.stats.atk : attacker.stats.spa;
  const D = move.kind === 'physical' ? defender.stats.def : defender.stats.spd;
  const stab = (CREATURES[attacker.species].types.includes(move.type)) ? 1.5 : 1;
  const eff = effectiveness(move.type, CREATURES[defender.species].types);
  // Type immunity short-circuit: 0 damage means 0 damage, not 1.
  if (eff === 0) return { dmg: 0, eff: 0, stab, crit: isCrit };
  const crit = isCrit ? 1.5 : 1;
  const rand = 0.85 + Math.random() * 0.15;
  const base = (((2*attacker.level/5 + 2) * move.power * (A/Math.max(1,D))) / 50) + 2;
  return { dmg: Math.max(1, Math.floor(base * stab * eff * crit * rand)), eff, stab, crit:isCrit };
}

window.PR_DATA = { TYPES, TYPE_COLOR, TYPE_CHART, MOVES, CREATURES, effectiveness, makeMon, computeStats, xpForLevel, levelFromXp, xpYield, xpShareRatio, xpMultiplier, calcDamage };
