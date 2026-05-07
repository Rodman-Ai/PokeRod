// PokeRod data: original creatures, types, moves.
'use strict';

const TYPES = [
  'NORMAL','FIRE','WATER','ELECTRIC','GRASS','ICE','FIGHTING','POISON',
  'GROUND','FLYING','PSYCHIC','BUG','ROCK','GHOST','DRAGON','DARK',
  'STEEL','FAIRY'
];

const TYPE_COLOR = {
  NORMAL:'#a8a878', FIRE:'#f08030', WATER:'#6890f0', ELECTRIC:'#f8d030',
  GRASS:'#78c850', ICE:'#98d8d8', FIGHTING:'#c03028', POISON:'#a040a0',
  GROUND:'#e0c068', FLYING:'#a890f0', PSYCHIC:'#f85888', BUG:'#a8b820',
  ROCK:'#b8a038', GHOST:'#705898', DRAGON:'#7038f8', DARK:'#705848',
  STEEL:'#b8b8d0', FAIRY:'#ee99ac'
};

// effectiveness[atk][def] = multiplier; defaults to 1 if missing.
const TYPE_CHART = {
  NORMAL:  { ROCK:0.5, STEEL:0.5, GHOST:0 },
  FIRE:    { GRASS:2, ICE:2, BUG:2, STEEL:2, FIRE:0.5, WATER:0.5, ROCK:0.5, DRAGON:0.5 },
  WATER:   { FIRE:2, GROUND:2, ROCK:2, WATER:0.5, GRASS:0.5, DRAGON:0.5 },
  ELECTRIC:{ WATER:2, FLYING:2, ELECTRIC:0.5, GRASS:0.5, DRAGON:0.5, GROUND:0 },
  GRASS:   { WATER:2, GROUND:2, ROCK:2, FIRE:0.5, GRASS:0.5, POISON:0.5, FLYING:0.5, BUG:0.5, DRAGON:0.5, STEEL:0.5 },
  ICE:     { GRASS:2, GROUND:2, FLYING:2, DRAGON:2, FIRE:0.5, WATER:0.5, ICE:0.5, STEEL:0.5 },
  FIGHTING:{ NORMAL:2, ICE:2, ROCK:2, DARK:2, STEEL:2, POISON:0.5, FLYING:0.5, PSYCHIC:0.5, BUG:0.5, FAIRY:0.5, GHOST:0 },
  POISON:  { GRASS:2, FAIRY:2, POISON:0.5, GROUND:0.5, ROCK:0.5, GHOST:0.5, STEEL:0 },
  GROUND:  { FIRE:2, ELECTRIC:2, POISON:2, ROCK:2, STEEL:2, GRASS:0.5, BUG:0.5, FLYING:0 },
  FLYING:  { GRASS:2, FIGHTING:2, BUG:2, ELECTRIC:0.5, ROCK:0.5, STEEL:0.5 },
  PSYCHIC: { FIGHTING:2, POISON:2, PSYCHIC:0.5, STEEL:0.5, DARK:0 },
  BUG:     { GRASS:2, PSYCHIC:2, DARK:2, FIRE:0.5, FIGHTING:0.5, POISON:0.5, FLYING:0.5, GHOST:0.5, STEEL:0.5, FAIRY:0.5 },
  ROCK:    { FIRE:2, ICE:2, FLYING:2, BUG:2, FIGHTING:0.5, GROUND:0.5, STEEL:0.5 },
  GHOST:   { PSYCHIC:2, GHOST:2, DARK:0.5, NORMAL:0 },
  DRAGON:  { DRAGON:2, STEEL:0.5, FAIRY:0 },
  DARK:    { PSYCHIC:2, GHOST:2, FIGHTING:0.5, DARK:0.5, FAIRY:0.5 },
  STEEL:   { ICE:2, ROCK:2, FAIRY:2, FIRE:0.5, WATER:0.5, ELECTRIC:0.5, STEEL:0.5 },
  FAIRY:   { FIGHTING:2, DRAGON:2, DARK:2, FIRE:0.5, POISON:0.5, STEEL:0.5 }
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
  ironswipe: { name:'Iron Swipe',type:'STEEL',    power:45, accuracy:100, kind:'physical', pp:25 },
  chromebash:{ name:'Chrome Bash',type:'STEEL',   power:65, accuracy:90,  kind:'physical', pp:15 },
  focusjab:  { name:'Focus Jab', type:'FIGHTING', power:45, accuracy:100, kind:'physical', pp:25 },
  palmstrike:{ name:'Palm Strike',type:'FIGHTING',power:65, accuracy:95,  kind:'physical', pp:15 },
  shimmer:   { name:'Shimmer',   type:'PSYCHIC',  power:50, accuracy:100, kind:'special',  pp:25, confuseChance:0.1 },
  dazzle:    { name:'Dazzle',    type:'PSYCHIC',  power:0,  accuracy:90,  kind:'status',   pp:15, confuseChance:1.0 },
  freezewind:{ name:'Freeze Wind',type:'ICE',     power:55, accuracy:95,  kind:'special',  pp:20, freezeChance:0.1 },
  lullaby:   { name:'Lullaby',   type:'NORMAL',   power:0,  accuracy:75,  kind:'status',   pp:15, sleepChance:1.0 },
  hypnoray:  { name:'Hypnoray',  type:'PSYCHIC',  power:0,  accuracy:60,  kind:'status',   pp:20, sleepChance:1.0 },
  harden:    { name:'Harden',    type:'NORMAL',   power:0,  accuracy:100, kind:'status',   pp:30, statChange:{target:'self', stat:'def', stages:1} },
  agility:   { name:'Agility',   type:'PSYCHIC',  power:0,  accuracy:100, kind:'status',   pp:30, statChange:{target:'self', stat:'spe', stages:2} },
  sandattack:{ name:'Sand Attack',type:'GROUND',  power:0,  accuracy:100, kind:'status',   pp:15, statChange:{target:'foe',  stat:'acc', stages:-1} },
  screech:   { name:'Screech',   type:'NORMAL',   power:0,  accuracy:85,  kind:'status',   pp:40, statChange:{target:'foe',  stat:'def', stages:-2} },
  toxicspike:{ name:'Toxic Spike',type:'POISON',  power:50, accuracy:100, kind:'physical', pp:20, poisonChance:0.3 },
  shockwave: { name:'Shockwave', type:'ELECTRIC', power:60, accuracy:100, kind:'special',  pp:20, paralyzeChance:0.1 },
  splash:    { name:'Splash',    type:'NORMAL',   power:0,  accuracy:100, kind:'status',   pp:40, dud:true }
};

// Creatures (original designs). Stats are baseStats. Sprite is drawn procedurally from "design".
// design: { palette: [primary, secondary, accent], shape, ears, eyes, mouth, accentShape }
const CREATURES = {
  emberkit: {
    id:'emberkit', name:'Emberkit', dex:1,
    types:['FIRE'],
    baseStats:{hp:39, atk:52, def:43, spa:60, spd:50, spe:65},
    learnset:[ [1,'scratch'],[1,'growl'],[5,'ember'],[10,'sandattack'],[15,'quickjab'],[20,'bite'],[27,'flamejet'] ],
    evolves:{ to:'flarebound', level:16 },
    catchRate:45,
    design:{ palette:['#e8552a','#f5c842','#5a1f0e'], shape:'fox', accent:'flame' },
    description:'A spirited cub whose tail flame brightens with mood. Bold trainers learn to read its flicker.'
  },
  flarebound: {
    id:'flarebound', name:'Flarebound', dex:2,
    types:['FIRE'],
    baseStats:{hp:58, atk:64, def:58, spa:80, spd:65, spe:80},
    learnset:[ [1,'scratch'],[1,'growl'],[5,'ember'],[10,'sandattack'],[15,'quickjab'],[20,'bite'],[27,'flamejet'],[33,'screech'],[40,'agility'] ],
    evolves:{ to:'infernarok', level:36 }, catchRate:25,
    design:{ palette:['#d63f1a','#ffb84a','#3a0e02'], shape:'fox', accent:'flame', big:true },
    description:'Embers ride its flank like a banner. It races ahead of forest fires and laughs at the heat.'
  },
  infernarok: {
    id:'infernarok', name:'Infernarok', dex:35,
    types:['FIRE','ROCK'],
    baseStats:{hp:78, atk:84, def:78, spa:109, spd:85, spe:100},
    learnset:[ [1,'scratch'],[1,'growl'],[5,'ember'],[15,'quickjab'],[20,'bite'],[27,'flamejet'],[33,'screech'],[40,'agility'],[45,'rocktoss'],[50,'shockwave'] ],
    catchRate:15,
    design:{ palette:['#a8200a','#f08020','#1a0000'], shape:'fox', accent:'flame', big:true, beard:true },
    description:'Veins of magma run beneath its scales. Old maps warn travelers of the cliffs where it sleeps.'
  },
  aquapup: {
    id:'aquapup', name:'Aquapup', dex:3,
    types:['WATER'],
    baseStats:{hp:44, atk:48, def:65, spa:50, spd:64, spe:43},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[5,'bubble'],[11,'harden'],[15,'bite'],[19,'watergun'],[25,'freezewind'] ],
    evolves:{ to:'tideturtle', level:16 },
    catchRate:45,
    design:{ palette:['#3d6cd1','#a8d8ff','#1a2f5c'], shape:'turtle', accent:'shell' },
    description:'Quick to splash, slow to leave. Its shell hides a coiled spring of pure spray.'
  },
  tideturtle: {
    id:'tideturtle', name:'Tideturtle', dex:4,
    types:['WATER'],
    baseStats:{hp:59, atk:63, def:80, spa:65, spd:80, spe:58},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[5,'bubble'],[11,'harden'],[15,'bite'],[19,'watergun'],[27,'freezewind'],[33,'screech'] ],
    evolves:{ to:'maelstroth', level:36 }, catchRate:25,
    design:{ palette:['#2853bf','#7ec0ff','#0d1c3a'], shape:'turtle', accent:'shell', big:true },
    description:'It rides storm fronts inland to hunt. Sailors leave pebbles on its shell for luck.'
  },
  maelstroth: {
    id:'maelstroth', name:'Maelstroth', dex:36,
    types:['WATER','ROCK'],
    baseStats:{hp:79, atk:83, def:100, spa:85, spd:105, spe:78},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[5,'bubble'],[11,'harden'],[19,'watergun'],[27,'freezewind'],[33,'screech'],[40,'rocktoss'],[46,'agility'] ],
    catchRate:15,
    design:{ palette:['#103080','#5898d8','#000a20'], shape:'turtle', accent:'shell', big:true, beard:true },
    description:'Its shell hosts a small, perpetual storm. Approaching boats lose their compasses.'
  },
  sproutling: {
    id:'sproutling', name:'Sproutling', dex:5,
    types:['GRASS','POISON'],
    baseStats:{hp:45, atk:49, def:49, spa:65, spd:65, spe:45},
    learnset:[ [1,'tackle'],[1,'growl'],[5,'vinelash'],[10,'poisonsting'],[15,'leafcut'],[20,'acidspray'],[26,'sandattack'] ],
    evolves:{ to:'leafurge', level:16 },
    catchRate:45,
    design:{ palette:['#5cb84a','#f08bb8','#2b5e22'], shape:'plant', accent:'bud' },
    description:'A walking cutting that sprouts where it sleeps. Its sap stings the careless.'
  },
  leafurge: {
    id:'leafurge', name:'Leafurge', dex:6,
    types:['GRASS','POISON'],
    baseStats:{hp:60, atk:62, def:63, spa:80, spd:80, spe:60},
    learnset:[ [1,'tackle'],[1,'growl'],[5,'vinelash'],[10,'poisonsting'],[15,'leafcut'],[20,'acidspray'],[27,'sandattack'],[33,'toxicspike'] ],
    evolves:{ to:'verdantsage', level:36 }, catchRate:25,
    design:{ palette:['#3f9a30','#ff7ab0','#1a4012'], shape:'plant', accent:'bud', big:true },
    description:'Its leaves taste rain hours before it falls. Old gardens follow it for advice.'
  },
  verdantsage: {
    id:'verdantsage', name:'Verdantsage', dex:37,
    types:['GRASS','POISON'],
    baseStats:{hp:80, atk:82, def:83, spa:100, spd:100, spe:80},
    learnset:[ [1,'tackle'],[1,'growl'],[5,'vinelash'],[15,'leafcut'],[20,'acidspray'],[27,'sandattack'],[33,'toxicspike'],[38,'shimmer'],[44,'lullaby'] ],
    catchRate:15,
    design:{ palette:['#1c6818','#f04898','#082008'], shape:'plant', accent:'bud', big:true, beard:true },
    description:'Centuries of pollen cling to its shoulders. It is said to remember every garden it has seen.'
  },
  zapret: {
    id:'zapret', name:'Zapret', dex:7,
    types:['ELECTRIC'],
    baseStats:{hp:35, atk:55, def:30, spa:50, spd:40, spe:90},
    learnset:[ [1,'quickjab'],[1,'growl'],[5,'spark'],[10,'tailwhip'],[15,'bite'],[21,'zapburst'],[26,'agility'] ],
    evolves:{ to:'boltbeard', level:30 }, catchRate:190,
    design:{ palette:['#f4d320','#3a1f00','#e85a5a'], shape:'mouse', accent:'bolt' },
    description:'Cheek pouches store crackling charge. It lights its own way through deep fields.'
  },
  boltbeard: {
    id:'boltbeard', name:'Boltbeard', dex:42, types:['ELECTRIC'],
    baseStats:{hp:60, atk:90, def:55, spa:90, spd:80, spe:110},
    learnset:[ [1,'quickjab'],[1,'growl'],[5,'spark'],[10,'tailwhip'],[15,'bite'],[21,'zapburst'],[28,'agility'],[34,'shockwave'],[40,'shimmer'] ],
    catchRate:60,
    design:{ palette:['#e8c008','#1a1208','#f08840'], shape:'mouse', accent:'bolt', beard:true },
    description:'Its whiskers double as lightning rods. It enjoys storms more than meals.'
  },
  pebra: {
    id:'pebra', name:'Pebra', dex:8,
    types:['ROCK','GROUND'],
    baseStats:{hp:40, atk:80, def:100, spa:30, spd:30, spe:20},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[5,'rocktoss'],[10,'harden'],[14,'earthbump'],[20,'bite'],[26,'screech'] ],
    evolves:{ to:'boulderon', level:25 }, catchRate:255,
    design:{ palette:['#8a7a5c','#5a4d36','#cfc1a0'], shape:'rock', accent:'pebble' },
    description:'A patient stone with curious eyes. It travels slowly, but always arrives.'
  },
  boulderon: {
    id:'boulderon', name:'Boulderon', dex:43,
    types:['ROCK','GROUND'],
    baseStats:{hp:80, atk:110, def:130, spa:55, spd:65, spe:45},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[5,'rocktoss'],[10,'harden'],[14,'earthbump'],[20,'bite'],[26,'screech'],[33,'sandattack'],[40,'flamejet'] ],
    catchRate:60,
    design:{ palette:['#6a5a40','#382c1a','#a89870'], shape:'rock', accent:'pebble', beard:true },
    description:'Mountains shed boulders and they walk away. So claims a very old children’s tale.'
  },
  flitwing: {
    id:'flitwing', name:'Flitwing', dex:9,
    types:['NORMAL','FLYING'],
    baseStats:{hp:40, atk:45, def:40, spa:35, spd:35, spe:56},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[5,'gust'],[10,'sandattack'],[14,'quickjab'],[18,'airslash'] ],
    evolves:{ to:'skylordan', level:24 }, catchRate:255,
    design:{ palette:['#a87a4e','#f0d8a8','#3a2210'], shape:'bird', accent:'wings' },
    description:'A flutter of feathers and curiosity. It steals shiny coins for nest decor.'
  },
  skylordan: {
    id:'skylordan', name:'Skylordan', dex:47, types:['NORMAL','FLYING'],
    baseStats:{hp:75, atk:85, def:75, spa:65, spd:70, spe:96},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[5,'gust'],[10,'sandattack'],[14,'quickjab'],[18,'airslash'],[24,'shimmer'],[30,'agility'] ],
    catchRate:60,
    design:{ palette:['#785030','#d8b878','#1a0a04'], shape:'bird', accent:'wings', beard:true },
    description:'Hunters call its silhouette the courier of dawn. It rarely lands twice in the same field.'
  },
  nibblet: {
    id:'nibblet', name:'Nibblet', dex:10,
    types:['NORMAL'],
    baseStats:{hp:30, atk:56, def:35, spa:25, spd:35, spe:72},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[4,'quickjab'],[8,'sandattack'],[12,'bite'],[18,'screech'] ],
    evolves:{ to:'whiskaroth', level:20 }, catchRate:255,
    design:{ palette:['#a06030','#d4a36a','#1f1006'], shape:'mouse', accent:'tail' },
    description:'A pocket-sized nibbler with bottomless courage. It dreams of being huge.'
  },
  whiskaroth: {
    id:'whiskaroth', name:'Whiskaroth', dex:52, types:['NORMAL','DARK'],
    baseStats:{hp:55, atk:81, def:60, spa:50, spd:70, spe:97},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[4,'quickjab'],[8,'sandattack'],[12,'bite'],[18,'screech'],[22,'shimmer'],[28,'agility'] ],
    catchRate:127,
    design:{ palette:['#704020','#a07040','#0a0402'], shape:'mouse', accent:'tail', beard:true },
    description:'Older nibblets that learned to keep secrets. Their whiskers map the shadows.'
  },
  crawlbug: {
    id:'crawlbug', name:'Crawlbug', dex:11,
    types:['BUG'],
    baseStats:{hp:45, atk:30, def:35, spa:20, spd:20, spe:45},
    learnset:[ [1,'tackle'],[1,'growl'],[3,'bugbite'],[7,'harden'],[11,'pinmissile'],[16,'poisonsting'] ],
    evolves:{ to:'mothmane', level:18 }, catchRate:255,
    design:{ palette:['#90b85a','#3a4a18','#f0e878'], shape:'caterpillar', accent:'segments' },
    description:'A leaf with too many legs. Its slow chewing is a meditation.'
  },
  mothmane: {
    id:'mothmane', name:'Mothmane', dex:44, types:['BUG','FLYING'],
    baseStats:{hp:65, atk:60, def:55, spa:80, spd:80, spe:80},
    learnset:[ [1,'tackle'],[1,'growl'],[3,'bugbite'],[7,'harden'],[11,'pinmissile'],[16,'poisonsting'],[19,'gust'],[24,'shimmer'],[30,'lullaby'] ],
    catchRate:90,
    design:{ palette:['#a8c060','#283010','#e8d860'], shape:'bat', accent:'wings', beard:true },
    description:'Its mane scatters dreams when stirred. Sleepless travelers seek its company.'
  },
  cavewing: {
    id:'cavewing', name:'Cavewing', dex:12,
    types:['POISON','FLYING'],
    baseStats:{hp:40, atk:45, def:35, spa:30, spd:40, spe:55},
    learnset:[ [1,'tackle'],[1,'growl'],[5,'gust'],[10,'screech'],[14,'bite'],[18,'poisonsting'],[24,'airslash'] ],
    evolves:{ to:'vampirothy', level:22 }, catchRate:255,
    design:{ palette:['#5a3a8a','#2a1a4a','#e85a8a'], shape:'bat', accent:'wings' },
    description:'Lives upside-down in damp halls. Its calls echo through tunnels for miles.'
  },
  vampirothy: {
    id:'vampirothy', name:'Vampirothy', dex:50, types:['POISON','FLYING'],
    baseStats:{hp:75, atk:80, def:70, spa:75, spd:75, spe:90},
    learnset:[ [1,'tackle'],[1,'growl'],[5,'gust'],[10,'screech'],[14,'bite'],[18,'poisonsting'],[24,'airslash'],[30,'shimmer'],[36,'toxicspike'] ],
    catchRate:90,
    design:{ palette:['#3a2068','#100828','#e83878'], shape:'bat', accent:'wings', beard:true },
    description:'It drinks moonlight off pond surfaces. Forest stories confuse it with the moon itself.'
  },
  splashfin: {
    id:'splashfin', name:'Splashfin', dex:13,
    types:['WATER'],
    baseStats:{hp:20, atk:10, def:55, spa:15, spd:20, spe:80},
    learnset:[ [1,'splash'],[7,'tackle'],[12,'tailwhip'],[15,'bubble'],[18,'bite'] ],
    evolves:{ to:'levifin', level:20 }, catchRate:255,
    design:{ palette:['#e85a5a','#ffd070','#3a1010'], shape:'fish', accent:'fins' },
    description:'A hopeful little fish. It splashes loudly because it cannot do much else.'
  },
  levifin: {
    id:'levifin', name:'Levifin', dex:51, types:['WATER','DARK'],
    baseStats:{hp:95, atk:125, def:79, spa:60, spd:100, spe:81},
    learnset:[ [1,'tackle'],[1,'bite'],[12,'bubble'],[15,'watergun'],[20,'freezewind'],[27,'screech'],[34,'airslash'],[40,'agility'] ],
    catchRate:45,
    design:{ palette:['#9858a8','#e84020','#1a0820'], shape:'fish', accent:'fins', beard:true },
    description:'From a fish nothing wanted, a leviathan. The lake remembers what it used to be.'
  },
  glimkit: {
    id:'glimkit', name:'Glimkit', dex:14,
    types:['NORMAL'],
    baseStats:{hp:55, atk:55, def:50, spa:45, spd:65, spe:55},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[5,'quickjab'],[10,'sandattack'],[14,'bite'],[20,'shimmer'] ],
    evolves:{ to:'lustrofox', level:32 }, catchRate:45,
    design:{ palette:['#d8b878','#f0d8a8','#3a2210'], shape:'fox', accent:'tail' },
    description:'Its coat catches and bends light. Photographers chase it in the afternoon.'
  },
  lustrofox: {
    id:'lustrofox', name:'Lustrofox', dex:53, types:['NORMAL','PSYCHIC'],
    baseStats:{hp:80, atk:80, def:75, spa:90, spd:110, spe:90},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[5,'quickjab'],[10,'sandattack'],[14,'bite'],[20,'shimmer'],[28,'dazzle'],[34,'freezewind'],[40,'agility'] ],
    catchRate:30,
    design:{ palette:['#f0d8a8','#fff8e0','#a06030'], shape:'fox', accent:'tail', big:true, beard:true },
    description:'It steps lightly from one thought to the next. Old shrines burn lamps for its return.'
  },
  cinderpup: {
    id:'cinderpup', name:'Cinderpup', dex:15, types:['FIRE'],
    baseStats:{hp:50, atk:60, def:40, spa:55, spd:40, spe:75},
    learnset:[ [1,'scratch'],[1,'tailwhip'],[5,'ember'],[10,'sandattack'],[14,'quickjab'],[20,'bite'],[26,'flamejet'] ],
    evolves:{ to:'pyrohound', level:18 }, catchRate:120,
    design:{ palette:['#e84020','#f8c850','#3a0e02'], shape:'fox', accent:'flame' },
    description:'A puppy stoked with embers. Its yawn lights the room.'
  },
  pyrohound: {
    id:'pyrohound', name:'Pyrohound', dex:16, types:['FIRE'],
    baseStats:{hp:65, atk:80, def:55, spa:70, spd:55, spe:95},
    learnset:[ [1,'scratch'],[1,'tailwhip'],[5,'ember'],[10,'sandattack'],[14,'quickjab'],[20,'bite'],[27,'flamejet'],[33,'screech'] ],
    evolves:{ to:'magmaron', level:34 }, catchRate:60,
    design:{ palette:['#c83018','#ffa030','#2a0602'], shape:'fox', accent:'flame', big:true },
    description:'Hounds the embers of dying campfires. Its growl is warmer than its bark.'
  },
  magmaron: {
    id:'magmaron', name:'Magmaron', dex:38, types:['FIRE','GROUND'],
    baseStats:{hp:80, atk:105, def:75, spa:85, spd:70, spe:115},
    learnset:[ [1,'scratch'],[1,'tailwhip'],[5,'ember'],[14,'quickjab'],[20,'bite'],[27,'flamejet'],[33,'screech'],[39,'earthbump'],[45,'agility'] ],
    catchRate:30,
    design:{ palette:['#a01000','#f0a020','#180000'], shape:'fox', accent:'flame', big:true, beard:true },
    description:'Tracks of cooled lava trail behind it. It paces the rims of old volcanoes.'
  },
  mistfin: {
    id:'mistfin', name:'Mistfin', dex:17, types:['WATER'],
    baseStats:{hp:42, atk:40, def:42, spa:60, spd:50, spe:60},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[5,'bubble'],[10,'harden'],[15,'watergun'],[21,'freezewind'] ],
    evolves:{ to:'tidalwhal', level:20 }, catchRate:180,
    design:{ palette:['#5a98e0','#c0e8ff','#1a3868'], shape:'fish', accent:'fins' },
    description:'A fish that breathes fog. It surfaces to gossip with herons.'
  },
  tidalwhal: {
    id:'tidalwhal', name:'Tidalwhal', dex:18, types:['WATER','ICE'],
    baseStats:{hp:75, atk:60, def:75, spa:85, spd:75, spe:55},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[5,'bubble'],[10,'harden'],[15,'watergun'],[21,'freezewind'],[28,'screech'] ],
    evolves:{ to:'glacierock', level:34 }, catchRate:75,
    design:{ palette:['#3868b8','#a0d0f0','#0a1a3a'], shape:'fish', accent:'fins' },
    description:'Its songs slow the tides. Whalers respect its wake.'
  },
  glacierock: {
    id:'glacierock', name:'Glacierock', dex:39, types:['WATER','ICE'],
    baseStats:{hp:95, atk:80, def:95, spa:105, spd:95, spe:75},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[5,'bubble'],[15,'watergun'],[21,'freezewind'],[28,'screech'],[34,'rocktoss'],[40,'shimmer'],[46,'agility'] ],
    catchRate:25,
    design:{ palette:['#0a3878','#80b8e8','#000820'], shape:'fish', accent:'fins', beard:true },
    description:'An iceberg with eyes. It lets its passengers off at quiet shores.'
  },
  fernsprout: {
    id:'fernsprout', name:'Fernsprout', dex:19, types:['GRASS'],
    baseStats:{hp:50, atk:45, def:55, spa:60, spd:55, spe:50},
    learnset:[ [1,'tackle'],[1,'growl'],[5,'vinelash'],[10,'harden'],[14,'leafcut'],[20,'acidspray'] ],
    evolves:{ to:'bramblewood', level:18 }, catchRate:120,
    design:{ palette:['#68c050','#f0c020','#244818'], shape:'plant', accent:'bud' },
    description:'A sprout that hums in the morning. It tilts its frond toward kind voices.'
  },
  bramblewood: {
    id:'bramblewood', name:'Bramblewood', dex:20, types:['GRASS','ROCK'],
    baseStats:{hp:70, atk:75, def:85, spa:65, spd:70, spe:45},
    learnset:[ [1,'tackle'],[1,'growl'],[5,'vinelash'],[10,'harden'],[14,'leafcut'],[20,'acidspray'],[24,'rocktoss'],[30,'sandattack'] ],
    evolves:{ to:'thornedred', level:34 }, catchRate:60,
    design:{ palette:['#3a8030','#d8a020','#0e2c0e'], shape:'plant', accent:'bud', big:true },
    description:'Old growth wrapped around a stubborn stone. It blocks paths it does not want walked.'
  },
  thornedred: {
    id:'thornedred', name:'Thornedred', dex:40, types:['GRASS','ROCK'],
    baseStats:{hp:95, atk:100, def:110, spa:80, spd:90, spe:55},
    learnset:[ [1,'tackle'],[1,'growl'],[5,'vinelash'],[14,'leafcut'],[20,'acidspray'],[24,'rocktoss'],[30,'sandattack'],[36,'earthbump'],[42,'screech'] ],
    catchRate:25,
    design:{ palette:['#1c5818','#b88018','#040c04'], shape:'plant', accent:'bud', big:true, beard:true },
    description:'Its thorn crown predates the road. Travelers carve respectful detours.'
  },
  voltkit: {
    id:'voltkit', name:'Voltkit', dex:21, types:['ELECTRIC'],
    baseStats:{hp:40, atk:50, def:35, spa:65, spd:50, spe:80},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[5,'spark'],[10,'sandattack'],[14,'quickjab'],[20,'zapburst'] ],
    evolves:{ to:'voltlynx', level:20 }, catchRate:120,
    design:{ palette:['#f0d018','#383018','#e85a5a'], shape:'fox', accent:'tail' },
    description:'Static makes its tail tuft puff. It greets friends by zapping them.'
  },
  voltlynx: {
    id:'voltlynx', name:'Voltlynx', dex:22, types:['ELECTRIC'],
    baseStats:{hp:60, atk:75, def:55, spa:90, spd:70, spe:115},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[5,'spark'],[10,'sandattack'],[14,'quickjab'],[22,'zapburst'],[28,'shockwave'],[34,'agility'] ],
    evolves:{ to:'stormfangis', level:34 }, catchRate:45,
    design:{ palette:['#e8b818','#181810','#f08020'], shape:'fox', accent:'tail', big:true },
    description:'Quick as a thunderclap, twice as loud. It travels in pairs along power lines.'
  },
  stormfangis: {
    id:'stormfangis', name:'Stormfangis', dex:41, types:['ELECTRIC','DARK'],
    baseStats:{hp:80, atk:100, def:75, spa:110, spd:85, spe:130},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[5,'spark'],[14,'quickjab'],[22,'zapburst'],[28,'shockwave'],[34,'agility'],[40,'bite'],[46,'screech'] ],
    catchRate:25,
    design:{ palette:['#c89008','#0a0a0a','#e84830'], shape:'fox', accent:'tail', big:true, beard:true },
    description:'It runs ahead of storm fronts. Lightning seems to follow its pawprints.'
  },
  stoneworm: {
    id:'stoneworm', name:'Stoneworm', dex:23, types:['GROUND'],
    baseStats:{hp:60, atk:65, def:80, spa:25, spd:35, spe:30},
    learnset:[ [1,'tackle'],[1,'growl'],[5,'rocktoss'],[10,'harden'],[15,'earthbump'],[20,'sandattack'] ],
    evolves:{ to:'quakeworm', level:22 }, catchRate:90,
    design:{ palette:['#a08858','#5a4830','#d8c098'], shape:'caterpillar', accent:'segments' },
    description:'It tunnels in slow, patient curves. The earth seems to thank it as it passes.'
  },
  quakeworm: {
    id:'quakeworm', name:'Quakeworm', dex:24, types:['GROUND','ROCK'],
    baseStats:{hp:85, atk:90, def:110, spa:35, spd:50, spe:40},
    learnset:[ [1,'tackle'],[1,'growl'],[5,'rocktoss'],[10,'harden'],[15,'earthbump'],[20,'sandattack'],[26,'bite'],[32,'screech'] ],
    evolves:{ to:'tectonarch', level:36 }, catchRate:45,
    design:{ palette:['#80684a','#403020','#a89070'], shape:'caterpillar', accent:'segments' },
    description:'Soil settles after it moves. Farmers welcome it before the planting season.'
  },
  tectonarch: {
    id:'tectonarch', name:'Tectonarch', dex:45, types:['GROUND','ROCK'],
    baseStats:{hp:110, atk:120, def:140, spa:55, spd:75, spe:50},
    learnset:[ [1,'tackle'],[1,'growl'],[5,'rocktoss'],[15,'earthbump'],[20,'sandattack'],[26,'bite'],[32,'screech'],[38,'flamejet'],[44,'agility'] ],
    catchRate:25,
    design:{ palette:['#604830','#201810','#988050'], shape:'caterpillar', accent:'segments', beard:true },
    description:'It sleeps beneath foundations and counsels with old stones. Earthquakes are its sighs.'
  },
  bumblesting: {
    id:'bumblesting', name:'Bumblesting', dex:25, types:['BUG','POISON'],
    baseStats:{hp:40, atk:55, def:35, spa:30, spd:35, spe:75},
    learnset:[ [1,'tackle'],[1,'poisonsting'],[5,'bugbite'],[10,'harden'],[14,'pinmissile'] ],
    evolves:{ to:'hivequeen', level:20 }, catchRate:150,
    design:{ palette:['#f0c020','#000000','#e85a18'], shape:'caterpillar', accent:'segments' },
    description:'A stripe of warning on tiny wings. It guards its hive with grim cheer.'
  },
  hivequeen: {
    id:'hivequeen', name:'Hivequeen', dex:26, types:['BUG','POISON'],
    baseStats:{hp:65, atk:80, def:60, spa:65, spd:65, spe:95},
    learnset:[ [1,'tackle'],[1,'poisonsting'],[5,'bugbite'],[10,'harden'],[14,'pinmissile'],[22,'acidspray'],[28,'toxicspike'] ],
    evolves:{ to:'royalwasp', level:34 }, catchRate:60,
    design:{ palette:['#d8a818','#181818','#e84030'], shape:'bat', accent:'wings' },
    description:'Hive royalty by sting and patience. Workers hush when she enters the comb.'
  },
  royalwasp: {
    id:'royalwasp', name:'Royalwasp', dex:46, types:['BUG','POISON'],
    baseStats:{hp:85, atk:105, def:80, spa:90, spd:85, spe:115},
    learnset:[ [1,'tackle'],[1,'poisonsting'],[5,'bugbite'],[14,'pinmissile'],[22,'acidspray'],[28,'toxicspike'],[34,'airslash'],[40,'agility'],[46,'screech'] ],
    catchRate:25,
    design:{ palette:['#b88808','#080808','#e83020'], shape:'bat', accent:'wings', beard:true },
    description:'Crowned in drone-wing iridescence. The hive’s roads bend to her path.'
  },
  galewing: {
    id:'galewing', name:'Galewing', dex:27, types:['NORMAL','FLYING'],
    baseStats:{hp:55, atk:60, def:50, spa:50, spd:50, spe:90},
    learnset:[ [1,'tackle'],[1,'growl'],[5,'gust'],[10,'sandattack'],[14,'quickjab'],[20,'airslash'] ],
    evolves:{ to:'tempestir', level:30 }, catchRate:120,
    design:{ palette:['#a0a0c8','#f0f0f0','#383850'], shape:'bird', accent:'wings' },
    description:'It rides thermals with a gambler’s grin. It bets it can catch any updraft.'
  },
  tempestir: {
    id:'tempestir', name:'Tempestir', dex:48, types:['NORMAL','FLYING'],
    baseStats:{hp:80, atk:90, def:75, spa:80, spd:80, spe:120},
    learnset:[ [1,'tackle'],[1,'growl'],[5,'gust'],[10,'sandattack'],[14,'quickjab'],[20,'airslash'],[28,'spark'],[34,'shockwave'],[40,'agility'] ],
    catchRate:45,
    design:{ palette:['#7878a0','#e0e0e8','#181828'], shape:'bird', accent:'wings', beard:true },
    description:'It tugs storm fronts on a string. Forecasts grow accurate when it appears.'
  },
  solarwing: {
    id:'solarwing', name:'Solarwing', dex:28, types:['FIRE','FLYING'],
    baseStats:{hp:75, atk:85, def:70, spa:90, spd:75, spe:100},
    learnset:[ [1,'tackle'],[1,'growl'],[5,'gust'],[10,'ember'],[15,'quickjab'],[20,'airslash'],[28,'flamejet'] ],
    evolves:{ to:'solarcrest', level:36 }, catchRate:30,
    design:{ palette:['#f0a020','#ffe060','#a02810'], shape:'bird', accent:'wings' },
    description:'Its feathers catch the dawn. Farmers say it pulls the sun into the sky.'
  },
  solarcrest: {
    id:'solarcrest', name:'Solarcrest', dex:49, types:['FIRE','FLYING'],
    baseStats:{hp:95, atk:105, def:85, spa:115, spd:95, spe:120},
    learnset:[ [1,'tackle'],[1,'growl'],[5,'gust'],[15,'quickjab'],[20,'airslash'],[28,'flamejet'],[34,'shimmer'],[40,'agility'],[46,'screech'] ],
    catchRate:15,
    design:{ palette:['#d88008','#fff080','#600800'], shape:'bird', accent:'wings', beard:true },
    description:'Its crest is a small sunrise. Old kings carved it onto their banners.'
  },
  frostpup: {
    id:'frostpup', name:'Frostpup', dex:29, types:['ICE'],
    baseStats:{hp:50, atk:55, def:50, spa:65, spd:55, spe:60},
    learnset:[ [1,'tackle'],[1,'growl'],[5,'bite'],[10,'harden'],[14,'freezewind'] ],
    evolves:{ to:'snowox', level:20 }, catchRate:120,
    design:{ palette:['#e0f0ff','#88c8ff','#284868'], shape:'fox', accent:'tail' },
    description:'A puppy of fresh frost. Its breath sketches winter on your sleeve.'
  },
  snowox: {
    id:'snowox', name:'Snowox', dex:30, types:['ICE','NORMAL'],
    baseStats:{hp:80, atk:85, def:80, spa:75, spd:75, spe:50},
    learnset:[ [1,'tackle'],[1,'growl'],[5,'bite'],[10,'harden'],[14,'freezewind'],[22,'earthbump'],[28,'sandattack'] ],
    evolves:{ to:'glacioxen', level:36 }, catchRate:60,
    design:{ palette:['#c8e0f0','#5898d0','#101830'], shape:'rock', accent:'pebble' },
    description:'It plows roads open without a road in mind. Mountain villages set out treats.'
  },
  glacioxen: {
    id:'glacioxen', name:'Glacioxen', dex:54, types:['ICE','NORMAL'],
    baseStats:{hp:110, atk:115, def:105, spa:90, spd:100, spe:65},
    learnset:[ [1,'tackle'],[1,'growl'],[5,'bite'],[14,'freezewind'],[22,'earthbump'],[28,'sandattack'],[34,'rocktoss'],[40,'screech'] ],
    catchRate:25,
    design:{ palette:['#a8c8e0','#3878b8','#000810'], shape:'rock', accent:'pebble', beard:true },
    description:'Glaciers take its shape, not the other way around. It will outwait any spring.'
  },
  crysthorn: {
    id:'crysthorn', name:'Crysthorn', dex:31, types:['ROCK','PSYCHIC'],
    baseStats:{hp:60, atk:60, def:90, spa:80, spd:75, spe:55},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[5,'rocktoss'],[10,'harden'],[14,'shimmer'],[20,'sandattack'] ],
    evolves:{ to:'prismage', level:32 }, catchRate:60,
    design:{ palette:['#9870c8','#d8b8f0','#382048'], shape:'rock', accent:'pebble' },
    description:'A geode that paid attention. Its facets bend nearby thoughts.'
  },
  prismage: {
    id:'prismage', name:'Prismage', dex:56, types:['ROCK','PSYCHIC'],
    baseStats:{hp:90, atk:80, def:120, spa:115, spd:105, spe:75},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[5,'rocktoss'],[14,'shimmer'],[20,'sandattack'],[26,'freezewind'],[32,'earthbump'],[38,'agility'],[44,'dazzle'] ],
    catchRate:25,
    design:{ palette:['#7048a0','#d0a8f8','#180830'], shape:'rock', accent:'pebble', beard:true },
    description:'Light through it reveals memory. Sages keep it for unanswered questions.'
  },
  geistmite: {
    id:'geistmite', name:'Geistmite', dex:32, types:['DARK'],
    baseStats:{hp:45, atk:50, def:40, spa:65, spd:50, spe:80},
    learnset:[ [1,'tackle'],[1,'growl'],[5,'bite'],[10,'screech'],[14,'shimmer'] ],
    evolves:{ to:'shadefox', level:22 }, catchRate:120,
    design:{ palette:['#383848','#181820','#e85a5a'], shape:'bat', accent:'wings' },
    description:'A shadow that learned to hover. It startles, then apologizes in dreams.'
  },
  shadefox: {
    id:'shadefox', name:'Shadefox', dex:33, types:['DARK'],
    baseStats:{hp:65, atk:80, def:60, spa:85, spd:70, spe:105},
    learnset:[ [1,'tackle'],[1,'growl'],[5,'bite'],[10,'screech'],[14,'shimmer'],[22,'quickjab'],[28,'sandattack'] ],
    evolves:{ to:'umbrasire', level:36 }, catchRate:45,
    design:{ palette:['#202028','#0a0a10','#e84838'], shape:'fox', accent:'tail', big:true },
    description:'It moves between two shadows like a cat between rooms. You see it last, never first.'
  },
  umbrasire: {
    id:'umbrasire', name:'Umbrasire', dex:55, types:['DARK','PSYCHIC'],
    baseStats:{hp:85, atk:100, def:80, spa:105, spd:90, spe:125},
    learnset:[ [1,'tackle'],[1,'growl'],[5,'bite'],[14,'shimmer'],[22,'quickjab'],[28,'sandattack'],[34,'airslash'],[40,'agility'],[46,'dazzle'] ],
    catchRate:15,
    design:{ palette:['#101018','#000004','#e83020'], shape:'fox', accent:'tail', big:true, beard:true },
    description:'It is the question your light asks. Towns leave one lamp lit, just in case.'
  },
  dreamilly: {
    id:'dreamilly', name:'Dreamilly', dex:34, types:['PSYCHIC','GRASS'],
    baseStats:{hp:60, atk:35, def:50, spa:90, spd:90, spe:60},
    learnset:[ [1,'growl'],[1,'tailwhip'],[5,'shimmer'],[10,'vinelash'],[14,'dazzle'],[20,'leafcut'] ],
    evolves:{ to:'reverieus', level:32 }, catchRate:75,
    design:{ palette:['#e8a8d8','#fff0f8','#a04878'], shape:'plant', accent:'bud' },
    description:'Petals soft as a half-remembered nap. It blooms where someone almost wept.'
  },
  reverieus: {
    id:'reverieus', name:'Reverieus', dex:57, types:['PSYCHIC','GRASS'],
    baseStats:{hp:80, atk:55, def:70, spa:130, spd:130, spe:80},
    learnset:[ [1,'growl'],[1,'tailwhip'],[5,'shimmer'],[14,'dazzle'],[20,'leafcut'],[26,'lullaby'],[32,'hypnoray'],[38,'freezewind'],[44,'agility'] ],
    catchRate:30,
    design:{ palette:['#d878b8','#fff8ff','#702848'], shape:'plant', accent:'bud', beard:true },
    description:'It lives in a long, tender afternoon. Most who meet it call it home.'
  },
  rivettot: {
    id:'rivettot', name:'Rivettot', dex:58, types:['STEEL'],
    baseStats:{hp:46, atk:60, def:72, spa:35, spd:48, spe:42},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[6,'ironswipe'],[10,'harden'],[14,'rocktoss'],[20,'chromebash'],[26,'screech'] ],
    catchRate:190,
    design:{ palette:['#b8bcc8','#687080','#303844'], shape:'mouse', accent:'tail', tuftX:15, tuftY:8 },
    description:'Tiny tinker of latches and locks. It collects bolts the way others gather acorns.'
  },
  mindrop: {
    id:'mindrop', name:'Mindrop', dex:59, types:['PSYCHIC'],
    baseStats:{hp:42, atk:30, def:40, spa:72, spd:60, spe:56},
    learnset:[ [1,'growl'],[1,'tailwhip'],[5,'shimmer'],[10,'dazzle'],[15,'hypnoray'],[20,'lullaby'],[26,'freezewind'] ],
    catchRate:170,
    design:{ palette:['#d898e8','#fff0ff','#704088'], shape:'blob', accent:'glow', tuftX:16, tuftY:10 },
    description:'A bead of dreaming made flesh. Its hum makes onlookers misplace their car keys.'
  },
  pugpaw: {
    id:'pugpaw', name:'Pugpaw', dex:60, types:['FIGHTING'],
    baseStats:{hp:50, atk:68, def:45, spa:30, spd:42, spe:65},
    learnset:[ [1,'tackle'],[1,'focusjab'],[5,'quickjab'],[10,'tailwhip'],[14,'palmstrike'],[20,'screech'],[26,'agility'] ],
    catchRate:180,
    design:{ palette:['#c07848','#f0c090','#502818'], shape:'mouse', accent:'tail', tuftX:16, tuftY:8 },
    description:'A polite brawler with sturdy paws. It bows before each match and after.'
  },
  joltlet: {
    id:'joltlet', name:'Joltlet', dex:61, types:['ELECTRIC'],
    baseStats:{hp:38, atk:48, def:36, spa:68, spd:48, spe:82},
    learnset:[ [1,'quickjab'],[1,'tailwhip'],[5,'spark'],[10,'sandattack'],[14,'bite'],[18,'zapburst'],[24,'agility'],[30,'shockwave'] ],
    catchRate:180,
    design:{ palette:['#f0d838','#403010','#f07838'], shape:'mouse', accent:'bolt', tuftX:16, tuftY:8 },
    description:'A spark dressed up as a kitten. It sleeps with one eye on the outlets.'
  },
  breezlet: {
    id:'breezlet', name:'Breezlet', dex:62, types:['FLYING'],
    baseStats:{hp:44, atk:50, def:42, spa:58, spd:48, spe:76},
    learnset:[ [1,'tackle'],[1,'growl'],[5,'gust'],[10,'sandattack'],[14,'quickjab'],[20,'airslash'],[26,'agility'] ],
    catchRate:190,
    design:{ palette:['#88b8e8','#f8f8ff','#304870'], shape:'bird', accent:'wings', tuftX:16, tuftY:6 },
    description:'It lifts in any breeze, including imaginary ones. Children clap to keep it aloft.'
  },
  silkuttle: {
    id:'silkuttle', name:'Silkuttle', dex:63, types:['BUG'],
    baseStats:{hp:48, atk:42, def:50, spa:35, spd:42, spe:45},
    learnset:[ [1,'tackle'],[1,'growl'],[3,'bugbite'],[7,'harden'],[12,'pinmissile'],[18,'shimmer'] ],
    catchRate:220,
    design:{ palette:['#b8d868','#486820','#fff0a0'], shape:'caterpillar', accent:'segments', tuftX:9, tuftY:16 },
    description:'Spins a soft thread that mends torn cloth. Tailors have a quiet truce with it.'
  },
  venipip: {
    id:'venipip', name:'Venipip', dex:64, types:['POISON'],
    baseStats:{hp:42, atk:50, def:38, spa:58, spd:48, spe:66},
    learnset:[ [1,'tackle'],[1,'poisonsting'],[5,'growl'],[10,'acidspray'],[14,'bite'],[20,'toxicspike'],[26,'screech'] ],
    catchRate:180,
    design:{ palette:['#8a58b8','#302050','#e878a8'], shape:'bat', accent:'wings', tuftX:16, tuftY:10 },
    description:'Tiny vials of caution on small wings. It warns before it stings, mostly.'
  },
  mudmote: {
    id:'mudmote', name:'Mudmote', dex:65, types:['GROUND'],
    baseStats:{hp:56, atk:60, def:72, spa:25, spd:38, spe:30},
    learnset:[ [1,'tackle'],[1,'growl'],[5,'earthbump'],[10,'harden'],[14,'rocktoss'],[20,'bite'],[26,'sandattack'] ],
    catchRate:190,
    design:{ palette:['#a87848','#604020','#d8b878'], shape:'caterpillar', accent:'segments', tuftX:12, tuftY:15 },
    description:'A clump of rich soil with hopes. It is welcome in any garden.'
  },
  frostnip: {
    id:'frostnip', name:'Frostnip', dex:66, types:['ICE'],
    baseStats:{hp:44, atk:48, def:46, spa:66, spd:58, spe:58},
    learnset:[ [1,'tackle'],[1,'growl'],[5,'freezewind'],[10,'harden'],[14,'bite'],[20,'shimmer'],[26,'agility'] ],
    catchRate:180,
    design:{ palette:['#d8f0ff','#80c8f0','#284860'], shape:'fox', accent:'tail', tuftX:16, tuftY:8 },
    description:'A nip of cold packed in fluff. It tags travelers’ boots with little snowflakes.'
  },
  craglet: {
    id:'craglet', name:'Craglet', dex:67, types:['ROCK'],
    baseStats:{hp:52, atk:64, def:84, spa:28, spd:40, spe:24},
    learnset:[ [1,'tackle'],[1,'tailwhip'],[5,'rocktoss'],[10,'harden'],[14,'earthbump'],[20,'screech'],[26,'sandattack'] ],
    catchRate:190,
    design:{ palette:['#9a8870','#5a4a38','#c8b898'], shape:'rock', accent:'pebble', tuftX:16, tuftY:9 },
    description:'A stubborn shard with stubborn eyes. It has plans, and they are slow.'
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
    sleepTurns: 0,
    confusionTurns: 0,
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
