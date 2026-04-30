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
  shimmer:   { name:'Shimmer',   type:'PSYCHIC',  power:50, accuracy:100, kind:'special',  pp:25 },
  freezewind:{ name:'Freeze Wind',type:'ICE',     power:55, accuracy:95,  kind:'special',  pp:20 },
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
    catchRate:25,
    design:{ palette:['#d63f1a','#ffb84a','#3a0e02'], shape:'fox', accent:'flame', big:true }
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
    catchRate:25,
    design:{ palette:['#2853bf','#7ec0ff','#0d1c3a'], shape:'turtle', accent:'shell', big:true }
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
    catchRate:25,
    design:{ palette:['#3f9a30','#ff7ab0','#1a4012'], shape:'plant', accent:'bud', big:true }
  },
  zapret: {
    id:'zapret', name:'Zapret', dex:7,
    types:['ELECTRIC'],
    baseStats:{hp:35, atk:55, def:30, spa:50, spd:40, spe:90},
    learnset:[ [1,'quickjab'],[1,'growl'],[6,'spark'],[12,'tailwhip'],[18,'bite'],[24,'zapburst'] ],
    catchRate:190,
    design:{ palette:['#f4d320','#3a1f00','#e85a5a'], shape:'mouse', accent:'bolt' }
  },
  pebra: {
    id:'pebra', name:'Pebra', dex:8,
    types:['ROCK','GROUND'],
    baseStats:{hp:40, atk:80, def:100, spa:30, spd:30, spe:20},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[6,'rocktoss'],[12,'earthbump'],[18,'bite'],[24,'rocktoss'] ],
    catchRate:255,
    design:{ palette:['#8a7a5c','#5a4d36','#cfc1a0'], shape:'rock', accent:'pebble' }
  },
  flitwing: {
    id:'flitwing', name:'Flitwing', dex:9,
    types:['NORMAL','FLYING'],
    baseStats:{hp:40, atk:45, def:40, spa:35, spd:35, spe:56},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[5,'gust'],[11,'quickjab'],[17,'airslash'] ],
    catchRate:255,
    design:{ palette:['#a87a4e','#f0d8a8','#3a2210'], shape:'bird', accent:'wings' }
  },
  nibblet: {
    id:'nibblet', name:'Nibblet', dex:10,
    types:['NORMAL'],
    baseStats:{hp:30, atk:56, def:35, spa:25, spd:35, spe:72},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[5,'quickjab'],[11,'bite'] ],
    catchRate:255,
    design:{ palette:['#a06030','#d4a36a','#1f1006'], shape:'mouse', accent:'tail' }
  },
  crawlbug: {
    id:'crawlbug', name:'Crawlbug', dex:11,
    types:['BUG'],
    baseStats:{hp:45, atk:30, def:35, spa:20, spd:20, spe:45},
    learnset:[ [1,'tackle'],[1,'growl'],[6,'bugbite'] ],
    catchRate:255,
    design:{ palette:['#90b85a','#3a4a18','#f0e878'], shape:'caterpillar', accent:'segments' }
  },
  cavewing: {
    id:'cavewing', name:'Cavewing', dex:12,
    types:['POISON','FLYING'],
    baseStats:{hp:40, atk:45, def:35, spa:30, spd:40, spe:55},
    learnset:[ [1,'tackle'],[6,'gust'],[12,'bite'],[18,'poisonsting'],[24,'airslash'] ],
    catchRate:255,
    design:{ palette:['#5a3a8a','#2a1a4a','#e85a8a'], shape:'bat', accent:'wings' }
  },
  splashfin: {
    id:'splashfin', name:'Splashfin', dex:13,
    types:['WATER'],
    baseStats:{hp:20, atk:10, def:55, spa:15, spd:20, spe:80},
    learnset:[ [1,'splash'],[15,'tackle'] ],
    catchRate:255,
    design:{ palette:['#e85a5a','#ffd070','#3a1010'], shape:'fish', accent:'fins' }
  },
  glimkit: {
    id:'glimkit', name:'Glimkit', dex:14,
    types:['NORMAL'],
    baseStats:{hp:55, atk:55, def:50, spa:45, spd:65, spe:55},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[5,'quickjab'],[11,'bite'],[17,'shimmer'] ],
    catchRate:45,
    design:{ palette:['#d8b878','#f0d8a8','#3a2210'], shape:'fox', accent:'tail' }
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

// Damage calc (simplified Gen 5+ style).
function calcDamage(attacker, defender, move, isCrit) {
  if (move.kind === 'status' || (move.power|0) === 0) return 0;
  const A = move.kind === 'physical' ? attacker.stats.atk : attacker.stats.spa;
  const D = move.kind === 'physical' ? defender.stats.def : defender.stats.spd;
  const stab = (CREATURES[attacker.species].types.includes(move.type)) ? 1.5 : 1;
  const eff = effectiveness(move.type, CREATURES[defender.species].types);
  const crit = isCrit ? 1.5 : 1;
  const rand = 0.85 + Math.random() * 0.15;
  const base = (((2*attacker.level/5 + 2) * move.power * (A/Math.max(1,D))) / 50) + 2;
  return { dmg: Math.max(1, Math.floor(base * stab * eff * crit * rand)), eff, stab, crit:isCrit };
}

window.PR_DATA = { TYPES, TYPE_COLOR, TYPE_CHART, MOVES, CREATURES, effectiveness, makeMon, computeStats, xpForLevel, levelFromXp, xpYield, calcDamage };
