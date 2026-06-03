// Item definitions and effects.
'use strict';

(function(){
  const ITEMS = {
    rodball: {
      id:'rodball', name:'ROD BALL',
      desc:'A trusty starter ball with a bright little snap.',
      detail:'A cheerful standard ball. It clicks shut like it is proud of you.',
      kind:'ball', icon:'ball', color:'#e84848', accent:'#ffd060',
      battleOnly:true, price:200
    },
    greatball: {
      id:'greatball', name:'GREAT BALL',
      desc:'A stronger clasp for wilder finds.',
      detail:'Blue shell, red fins, and a catch grip that feels ready for trouble.',
      kind:'ball', icon:'ball', color:'#4878d8', accent:'#e84848',
      battleOnly:true, price:600, catchBonus:1.5
    },
    ultraball: {
      id:'ultraball', name:'ULTRA BALL',
      desc:'Heavy-duty gear for stubborn stars.',
      detail:'Black-and-gold hardware for catches that refuse to be ordinary.',
      kind:'ball', icon:'ball', color:'#202020', accent:'#f0c020',
      battleOnly:true, price:1200, catchBonus:2.0
    },
    quickball: {
      id:'quickball', name:'QUICK BALL',
      desc:'Loves a dramatic first turn.',
      detail:'A fast little flash-bolt ball. Throw it early while everyone is surprised.',
      kind:'ball', icon:'ball', color:'#58c8f0', accent:'#f0d030',
      battleOnly:true, price:900, catchBonus:1.0, firstTurnBonus:2.5
    },
    cavernball: {
      id:'cavernball', name:'CAVERN BALL',
      desc:'Glows warmly in caves and ruins.',
      detail:'A mossy stone ball that hums when the ceiling gets rocky.',
      kind:'ball', icon:'ball', color:'#807070', accent:'#58c878',
      battleOnly:true, price:800, catchBonus:1.0, tagBonus:2.2, tagAny:['cave','ruins']
    },
    heavy_ball: {
      id:'heavy_ball', name:'HEAVY BALL',
      desc:'Better against high-HP foes.',
      detail:'Iron-cored ball that bites onto a tough opponent. 2x bonus when the foe is above 80% HP.',
      kind:'ball', icon:'ball', color:'#404040', accent:'#a0a0a0',
      battleOnly:true, price:1000, catchBonus:1.0, hpThresholdBonus:2.0, hpThreshold:0.8
    },
    friend_ball: {
      id:'friend_ball', name:'FRIEND BALL',
      desc:'Caught creature starts at 200 friendship.',
      detail:'A warm green ball that bonds instantly. Anything caught with it starts at 200/255 friendship - already at the damage-bonus threshold.',
      kind:'ball', icon:'ball', color:'#58a850', accent:'#f0c020',
      battleOnly:true, price:1500, catchBonus:1.0, friendshipOnCatch:200
    },
    dusk_ball: {
      id:'dusk_ball', name:'DUSK BALL',
      desc:'Better at night.',
      detail:'A deep-violet ball with a moonglow finish. 2x bonus during the night and dusk phases.',
      kind:'ball', icon:'ball', color:'#403868', accent:'#a888d0',
      battleOnly:true, price:1000, catchBonus:1.0, nightBonus:2.0
    },
    // ---- Apricorn-crafted balls (idea #46) ----
    heal_ball: {
      id:'heal_ball', name:'HEAL BALL',
      desc:'Restores the caught creature to full HP.',
      detail:'A pale-pink ball that mends as it captures. Status and HP are restored when the creature emerges.',
      kind:'ball', icon:'ball', color:'#d878a8', accent:'#fff0c8',
      battleOnly:true, price:0, catchBonus:1.0, healOnCatch:true
    },
    net_ball: {
      id:'net_ball', name:'NET BALL',
      desc:'1.5x catch rate vs BUG or WATER.',
      detail:'A latticed teal ball especially attuned to chitin and scales. Excellent against bugs and aquatics.',
      kind:'ball', icon:'ball', color:'#388898', accent:'#a8e8d0',
      battleOnly:true, price:0, catchBonus:1.0, typeBonus:1.5, typeBonusTypes:['BUG','WATER']
    },
    timer_ball: {
      id:'timer_ball', name:'TIMER BALL',
      desc:'Better the longer the battle has run.',
      detail:'Marked with rings that fill as the fight drags on. Grows to 4x catch rate after about ten turns.',
      kind:'ball', icon:'ball', color:'#a08068', accent:'#e8c8a0',
      battleOnly:true, price:0, catchBonus:1.0, timerStep:0.3, timerCap:4.0
    },
    luxury_ball: {
      id:'luxury_ball', name:'LUXURY BALL',
      desc:'Caught creatures start with a friendship boost.',
      detail:'Lined with velvet. Caught creatures emerge already fond of you (friendship 120).',
      kind:'ball', icon:'ball', color:'#984848', accent:'#f0c8a8',
      battleOnly:true, price:0, catchBonus:1.0, friendshipOnCatch:120
    },
    apricorn: {
      id:'apricorn', name:'APRICORN',
      desc:'Coloured fruit-pit. The craftsman shapes them into special balls.',
      detail:'A hard, dye-tinted pit shed by certain trees. Worthless on its own, prized by ball-makers.',
      kind:'apricorn', icon:'rod', color:'#a04030', accent:'#f0c020',
      price:200
    },
    potion: {
      id:'potion', name:'POTION',
      desc:'Fizzy red medicine. Restores 20 HP.',
      detail:'Smells like cherries and brave decisions. Restores 20 HP to one ally.',
      kind:'heal', icon:'bottle', color:'#e84848', accent:'#fff0c8',
      amount:20, target:'ally', price:200
    },
    superpotion: {
      id:'superpotion', name:'SUPER POTION',
      desc:'Bigger bottle, bigger bounce-back. 50 HP.',
      detail:'A cool blue tonic with a tiny foam cap. Restores 50 HP.',
      kind:'heal', icon:'bottle', color:'#5898e8', accent:'#e8f8ff',
      amount:50, target:'ally', price:700
    },
    hyperpotion: {
      id:'hyperpotion', name:'HYPER POTION',
      desc:'Gold tonic for heavy scrapes. 120 HP.',
      detail:'A rich honey-gold draught for the sort of scrape with a story.',
      kind:'heal', icon:'bottle', color:'#f0b840', accent:'#fff8d8',
      amount:120, target:'ally', price:1500
    },
    maxpotion: {
      id:'maxpotion', name:'MAX POTION',
      desc:'A full-health miracle in one bright gulp.',
      detail:'The fancy bottle you save for a real cliffhanger. Fully restores HP.',
      kind:'heal', icon:'bottle', color:'#f070b8', accent:'#fff0f8',
      amount:9999, target:'ally', price:2500
    },
    antidote: {
      id:'antidote', name:'ANTIDOTE',
      desc:'Minty drops that clear poison.',
      detail:'A tiny green vial with a leaf on the label. Cures poison.',
      kind:'status', icon:'vial', color:'#48b860', accent:'#d8ffe0',
      cures:['poisoned'], target:'ally', price:100
    },
    awakening: {
      id:'awakening', name:'AWAKENING',
      desc:'Tiny sunrise scent for sleepy allies.',
      detail:'One sniff and nap-time packs its blanket. Wakes a sleeping ally.',
      kind:'status', icon:'vial', color:'#f0c020', accent:'#fff8d8',
      cures:['asleep'], target:'ally', price:250
    },
    burnheal: {
      id:'burnheal', name:'BURN HEAL',
      desc:'Cool blue gel for hot mistakes.',
      detail:'A chilly salve that takes the sting out of a bad matchup. Cures burns.',
      kind:'status', icon:'vial', color:'#58b8f0', accent:'#e0f8ff',
      cures:['burned'], target:'ally', price:250
    },
    paralyzeheal: {
      id:'paralyzeheal', name:'PARLYZ HEAL',
      desc:'Static-smoothing citrus spray.',
      detail:'A crackly yellow remedy that gets stiff legs moving again.',
      kind:'status', icon:'spray', color:'#f0d030', accent:'#fff8c0',
      cures:['paralyzed'], target:'ally', price:200
    },
    fullheal: {
      id:'fullheal', name:'FULL HEAL',
      desc:'One shiny fix for every weird condition.',
      detail:'The all-purpose sparkle bottle. Cures any status condition.',
      kind:'status', icon:'spray', color:'#f080c8', accent:'#80e8f0',
      cures:['poisoned','asleep','burned','paralyzed','frozen','confused'], target:'ally', price:600
    },
    revive: {
      id:'revive', name:'REVIVE',
      desc:'A bright shard that brings an ally back.',
      detail:'A star-shaped pulse of courage. Revives a fainted ally to half HP.',
      kind:'revive', icon:'star', color:'#f0d030', accent:'#fff8d8',
      ratio:0.5, target:'fainted', price:1500
    },
    maxrevive: {
      id:'maxrevive', name:'MAX REVIVE',
      desc:'The big comeback star. Full HP.',
      detail:'A golden burst that turns the music back up. Revives to full HP.',
      kind:'revive', icon:'star', color:'#f8e870', accent:'#e85050',
      ratio:1.0, target:'fainted', price:4000
    },
    oranberry: {
      id:'oranberry', name:'ORAN BERRY',
      desc:'A held berry with a dependable snack crunch.',
      detail:'Holder munches it below half HP to restore 20 HP.',
      kind:'berry', icon:'berry', color:'#4f82df', accent:'#75c45e',
      berry:true, heal:20, atRatio:0.5, holdable:true, price:150
    },
    sitrusberry: {
      id:'sitrusberry', name:'SITRUS BERRY',
      desc:'A zesty held berry for scary moments.',
      detail:'Holder eats it below quarter HP to restore 50 HP.',
      kind:'berry', icon:'berry', color:'#f0a030', accent:'#65b850',
      berry:true, heal:50, atRatio:0.25, holdable:true, price:400
    },
    pechaberry: {
      id:'pechaberry', name:'PECHA BERRY',
      desc:'A sweet pink held berry that hates poison.',
      detail:'Holder eats it automatically to cure poison.',
      kind:'berry', icon:'berry', color:'#f078b8', accent:'#65b850',
      berry:true, cures:['poisoned'], holdable:true, price:200
    },
    pokeflute: {
      id:'pokeflute', name:'POKE FLUTE',
      desc:'A bright tune for impossible naps.',
      detail:'A polished flute whose song wakes any sleeping creature.',
      kind:'key', icon:'flute', color:'#d8b070', accent:'#fff0c0',
      key:true, price:0
    },
    old_rod: {
      id:'old_rod', name:'OLD ROD',
      desc:'A simple rod for fishing in any water.',
      detail:'Weathered cane rod with a red bobber. Face water - A casts a line, B surfs (with a WATER ally).',
      kind:'key', icon:'rod', color:'#c08040', accent:'#e84848',
      key:true, price:0
    },
    // ---- Trainer equipment (worn by the player; one per slot) ----
    lucky_charm: {
      id:'lucky_charm', name:'LUCKY CHARM',
      desc:'A warm little charm. Party XP +10%.',
      detail:'Trainer gear with a lucky jingle. All party Pokerod gain 10% more XP.',
      kind:'trainer_gear', icon:'charm', color:'#f0c020', accent:'#e85050',
      slot:'trinket', xpMult:1.10, price:1500
    },
    scholars_glasses: {
      id:'scholars_glasses', name:'SCHOLAR GLASS',
      desc:'Smart frames. Party XP +25%.',
      detail:'Trainer gear with careful lenses. All party Pokerod gain 25% more XP.',
      kind:'trainer_gear', icon:'glasses', color:'#385890', accent:'#e8f8ff',
      slot:'trinket', xpMult:1.25, price:5000
    },
    masters_pendant: {
      id:'masters_pendant', name:'MASTER PENDANT',
      desc:'A boss-level pendant. Party XP +50%.',
      detail:'Trainer gear with a deep shine. All party Pokerod gain 50% more XP.',
      kind:'trainer_gear', icon:'pendant', color:'#8050c8', accent:'#f0d060',
      slot:'trinket', xpMult:1.50, price:15000
    },
    // ---- Pokerod held equipment (one per creature; shares mon.held slot) ----
    soothe_bell: {
      id:'soothe_bell', name:'SOOTHE BELL',
      desc:'A gentle held bell. Holder XP +10%.',
      detail:'Held gear that rings softly after each victory. Holder XP +10%.',
      kind:'held_gear', icon:'bell', color:'#d8b060', accent:'#fff0c8',
      holdable:true, xpMult:1.10, price:1200
    },
    lucky_egg: {
      id:'lucky_egg', name:'LUCKY EGG',
      desc:'A speckled held egg. Holder XP +50%.',
      detail:'Held gear with mysterious warmth. Holder gains 50% more XP.',
      kind:'held_gear', icon:'egg', color:'#f8f0d8', accent:'#f0c020',
      holdable:true, xpMult:1.50, price:4000
    },
    // ---- Outdoor-vendor exclusives (one per town, not stocked at Marts) ----
    wave_charm: {
      id:'wave_charm', name:'WAVE CHARM',
      desc:'Shore-side trinket. Party XP +15%.',
      detail:'Rodport vendor exclusive. A salt-polished charm that hums with shore luck.',
      kind:'trainer_gear', icon:'charm', color:'#3878d8', accent:'#a8e0ff',
      slot:'trinket', xpMult:1.15, price:800
    },
    farm_lunch: {
      id:'farm_lunch', name:'FARM LUNCH',
      desc:'A wrapped country lunch. Restores 80 HP.',
      detail:'Brindale vendor exclusive. Warm bread and a hand-picked apple.',
      kind:'heal', icon:'bottle', color:'#c8a050', accent:'#f0c890',
      amount:80, target:'ally', price:350
    },
    wood_totem: {
      id:'wood_totem', name:'WOOD TOTEM',
      desc:'A held wooden totem. Holder XP +30%.',
      detail:'Woodfall vendor exclusive. Carved from a single weathered branch.',
      kind:'held_gear', icon:'bell', color:'#805030', accent:'#c89858',
      holdable:true, xpMult:1.30, price:1200
    },
    mountain_kit: {
      id:'mountain_kit', name:'MOUNTAIN KIT',
      desc:'A climber’s kit. Party XP +20%.',
      detail:'Crestrock vendor exclusive. Compass, flint and worn rope.',
      kind:'trainer_gear', icon:'pendant', color:'#7a6048', accent:'#d0a878',
      slot:'trinket', xpMult:1.20, price:1000
    },
    frost_charm: {
      id:'frost_charm', name:'FROST CHARM',
      desc:'A held frost charm. Holder XP +40%.',
      detail:'Frostmere vendor exclusive. Always cold to the touch, never thaws.',
      kind:'held_gear', icon:'egg', color:'#a8c8e8', accent:'#ffffff',
      holdable:true, xpMult:1.40, price:1500
    },
    pearl_bauble: {
      id:'pearl_bauble', name:'PEARL BAUBLE',
      desc:'A sea-pearl draught. Restores 120 HP.',
      detail:'Harborside vendor exclusive. Bottled with a single dockside pearl.',
      kind:'heal', icon:'bottle', color:'#f0e8d0', accent:'#a8d0e0',
      amount:120, target:'ally', price:600
    },
    summit_brew: {
      id:'summit_brew', name:'SUMMIT BREW',
      desc:'A peak-air revive. Full HP back.',
      detail:'Summitvale vendor exclusive. Distilled from thin mountain air.',
      kind:'revive', icon:'star', color:'#d8b860', accent:'#fff0a0',
      ratio:1.0, target:'fainted', price:3500
    },
    // ---- Battle-active held items (one per creature; shares mon.held slot) ----
    charcoal: {
      id:'charcoal', name:'CHARCOAL',
      desc:'Held charcoal lump. FIRE moves +20%.',
      detail:'Dry black chunk that smoulders during battle.',
      kind:'held_gear', icon:'bell', color:'#383028', accent:'#e84020',
      holdable:true, boostType:'FIRE', boostMult:1.2, price:1000
    },
    mystic_water: {
      id:'mystic_water', name:'MYSTIC WATER',
      desc:'Held vial of pure water. WATER moves +20%.',
      detail:'A teardrop bottle full of strangely cold dew.',
      kind:'held_gear', icon:'bottle', color:'#4878d8', accent:'#a8e0ff',
      holdable:true, boostType:'WATER', boostMult:1.2, price:1000
    },
    miracle_seed: {
      id:'miracle_seed', name:'MIRACLE SEED',
      desc:'Held seed of legend. GRASS moves +20%.',
      detail:'A sun-warm seed that rattles softly.',
      kind:'held_gear', icon:'berry', color:'#58a850', accent:'#d0f0a0',
      holdable:true, boostType:'GRASS', boostMult:1.2, price:1000
    },
    magnet: {
      id:'magnet', name:'MAGNET',
      desc:'Held magnetic stone. ELECTRIC moves +20%.',
      detail:'A heavy red-and-blue magnet that hums.',
      kind:'held_gear', icon:'pendant', color:'#d0d0d8', accent:'#e83838',
      holdable:true, boostType:'ELECTRIC', boostMult:1.2, price:1000
    },
    soft_sand: {
      id:'soft_sand', name:'SOFT SAND',
      desc:'Held pouch of soft sand. GROUND moves +20%.',
      detail:'A warm cloth pouch full of golden dune sand.',
      kind:'held_gear', icon:'charm', color:'#d8b870', accent:'#f0e0a0',
      holdable:true, boostType:'GROUND', boostMult:1.2, price:1000
    },
    leftovers: {
      id:'leftovers', name:'LEFTOVERS',
      desc:'Holder recovers 1/16 max HP each turn.',
      detail:'A small foil-wrapped snack the holder nibbles between turns.',
      kind:'held_gear', icon:'bottle', color:'#c89858', accent:'#fff0c8',
      holdable:true, leftovers:true, price:2500
    },
    focus_sash: {
      id:'focus_sash', name:'FOCUS SASH',
      desc:'Survive a one-shot from full HP. Single use.',
      detail:'A woven sash that takes the hit so the holder doesn\'t. Consumed when it saves you.',
      kind:'held_gear', icon:'charm', color:'#a05030', accent:'#f0c020',
      holdable:true, focusSash:true, price:2000
    },
    // ---- Held items expansion (idea #16) ----
    eviolite: {
      id:'eviolite', name:'EVIOLITE',
      desc:'Boosts DEF & SP.DEF if the holder can still evolve.',
      detail:'A chunk of fossilised evolutionary potential. Strengthens defences while the holder is unevolved.',
      kind:'held_gear', icon:'charm', color:'#284060', accent:'#a0c8e8',
      holdable:true, eviolite:true, price:2400
    },
    quick_claw: {
      id:'quick_claw', name:'QUICK CLAW',
      desc:'May let the holder strike first regardless of speed.',
      detail:'A sharpened claw that lashes out at the first opening - about a one-in-five chance each turn.',
      kind:'held_gear', icon:'charm', color:'#806040', accent:'#f0d870',
      holdable:true, quickClaw:true, quickClawChance:0.20, price:1800
    },
    wide_lens: {
      id:'wide_lens', name:'WIDE LENS',
      desc:"Improves the holder's move accuracy by 10%.",
      detail:'A polished lens that helps the holder line up shaky shots.',
      kind:'held_gear', icon:'charm', color:'#308060', accent:'#c0f0d0',
      holdable:true, wideLens:true, wideLensBonus:10, price:1500
    },
    expert_belt: {
      id:'expert_belt', name:'EXPERT BELT',
      desc:'Boosts super-effective moves by 20%.',
      detail:'A worn leather belt awarded to type specialists. Bites harder when the matchup is right.',
      kind:'held_gear', icon:'charm', color:'#8a4a18', accent:'#f0c020',
      holdable:true, expertBelt:true, price:2200
    },
    choice_band: {
      id:'choice_band', name:'CHOICE BAND',
      desc:'Boosts ATK +50% but locks the holder to one move.',
      detail:'A leather band that focuses the holder\'s fury. Once they pick a move, they\'re committed to it for the battle.',
      kind:'held_gear', icon:'charm', color:'#a02020', accent:'#f0c020',
      holdable:true, choiceBand:true, choiceMult:1.5, price:2400
    },
    power_gem: {
      id:'power_gem', name:'POWER GEM',
      desc:'Press M in FIGHT to surge ATK + SP.ATK by 1 stage. Once per battle.',
      detail:'A crystal that channels the holder\'s resolve into a one-time burst. Glows faintly when the holder is in trouble.',
      kind:'held_gear', icon:'charm', color:'#a020a0', accent:'#f0c8ff',
      holdable:true, powerGem:true, price:6000
    },
    tera_orb: {
      id:'tera_orb', name:'TERA ORB',
      desc:'Press T in FIGHT to swap the holder to a chosen type. Once per battle.',
      detail:'A prismatic orb that locks the holder into a single chosen type for the rest of the battle. Stacks with Power Gem.',
      kind:'held_gear', icon:'charm', color:'#3088c8', accent:'#fff8e0',
      holdable:true, teraOrb:true, price:7500
    },
    shinycharm: {
      id:'shinycharm', name:'SHINY CHARM',
      desc:'Doubles wild shiny odds. Granted at full Pokedex.',
      detail:'A glittering badge the Professor mails when every species has been seen and caught.',
      kind:'key', icon:'charm', color:'#f0c020', accent:'#fff8e0',
      key:true, shinyCharm:true, shinyMult:2, price:0
    },
    // ---- Evolution stones (idea #14) ----
    // Each carries a `stone` tag matched against CREATURES[species].evolves.stone.
    firestone: {
      id:'firestone', name:'FIRE STONE',
      desc:'Triggers some FIRE-aligned evolutions.',
      detail:'A blazing chunk of red crystal. Some creatures lock into a new form when held to it.',
      kind:'evostone', icon:'charm', color:'#e84818', accent:'#f0c020',
      stone:'firestone', price:2100
    },
    thunderstone: {
      id:'thunderstone', name:'THUNDER STONE',
      desc:'Triggers some ELECTRIC-aligned evolutions.',
      detail:'A jagged green crystal that crackles with stored lightning.',
      kind:'evostone', icon:'charm', color:'#88c020', accent:'#f0e840',
      stone:'thunderstone', price:2100
    },
    icestone: {
      id:'icestone', name:'ICE STONE',
      desc:'Triggers some ICE-aligned evolutions.',
      detail:'A frozen shard that never melts. Cold even through a glove.',
      kind:'evostone', icon:'charm', color:'#8898d8', accent:'#e0f0ff',
      stone:'icestone', price:2100
    },
    leafstone: {
      id:'leafstone', name:'LEAF STONE',
      desc:'Triggers some GRASS-aligned evolutions.',
      detail:'A leaf-veined chunk of green agate. Smells faintly of meadows.',
      kind:'evostone', icon:'charm', color:'#388838', accent:'#a0e068',
      stone:'leafstone', price:2100
    },
    moonstone: {
      id:'moonstone', name:'MOON STONE',
      desc:'Triggers some nocturnal evolutions.',
      detail:'A silvery pebble that glows faintly at night. Soft to the touch.',
      kind:'evostone', icon:'charm', color:'#a0a0c8', accent:'#fff8e0',
      stone:'moonstone', price:2100
    },
    // ---- Technical Machines (idea #21) ----
    // Reusable across the playthrough (Gen 8+ model); any species can
    // learn any TM as long as it has a free move slot. The bag's USE
    // path checks `reusable` and skips the take() that would consume.
    tm_solarbeam: {
      id:'tm_solarbeam', name:'TM01 SOLARBEAM',
      desc:'Teaches SOLAR BEAM. Reusable.',
      detail:'A reusable disc that imprints the SOLAR BEAM move on any creature with a free slot.',
      kind:'tm', icon:'charm', color:'#388838', accent:'#a0e068',
      teaches:'solarbeam', tmNum:1, reusable:true, price:5000
    },
    tm_thunderclap: {
      id:'tm_thunderclap', name:'TM02 THUNDERCLAP',
      desc:'Teaches THUNDERCLAP. Reusable.',
      detail:'A reusable disc that imprints the THUNDERCLAP move on any creature with a free slot.',
      kind:'tm', icon:'charm', color:'#c8a020', accent:'#fff8e0',
      teaches:'thunderclap', tmNum:2, reusable:true, price:4000
    },
    tm_icebeam: {
      id:'tm_icebeam', name:'TM03 ICE BEAM',
      desc:'Teaches ICE BEAM. Reusable.',
      detail:'A reusable disc that imprints the ICE BEAM move on any creature with a free slot.',
      kind:'tm', icon:'charm', color:'#88c8d8', accent:'#e0f0ff',
      teaches:'icebeam', tmNum:3, reusable:true, price:4000
    },
    tm_earthquake: {
      id:'tm_earthquake', name:'TM04 QUAKE',
      desc:'Teaches EARTHQUAKE. Reusable.',
      detail:'A reusable disc that imprints the EARTHQUAKE move on any creature with a free slot.',
      kind:'tm', icon:'charm', color:'#a06030', accent:'#f0c020',
      teaches:'earthquake', tmNum:4, reusable:true, price:5500
    },
    tm_hyperbeam: {
      id:'tm_hyperbeam', name:'TM05 HYPRBEAM',
      desc:'Teaches HYPER BEAM. Reusable.',
      detail:'A reusable disc that imprints the HYPER BEAM move on any creature with a free slot.',
      kind:'tm', icon:'charm', color:'#c83838', accent:'#f0c020',
      teaches:'hyperbeam', tmNum:5, reusable:true, price:7000
    },
    // ---- Sandwich buffs (brainstorm #2) ----
    // Use from bag to apply a temporary encounter / shiny buff.
    shiny_sandwich: {
      id:'shiny_sandwich', name:'SHINY SANDWICH',
      desc:'Doubles shiny encounter odds for 60 steps.',
      detail:'A glittery picnic sandwich. Eat in the field for a temporary shiny-luck boost.',
      kind:'sandwich', icon:'bottle', color:'#d8a830', accent:'#fff8c8',
      buff:'shiny', buffMult:2, buffSteps:60, price:1800
    },
    bug_sandwich: {
      id:'bug_sandwich', name:'BUG SANDWICH',
      desc:'Doubles BUG-type encounters for 60 steps.',
      detail:'Crunchy herb wrap that bug-types love. Biases encounters toward BUGs.',
      kind:'sandwich', icon:'bottle', color:'#88a838', accent:'#e8f0a0',
      buff:'type', buffType:'BUG', buffMult:2, buffSteps:60, price:900
    },
    rare_sandwich: {
      id:'rare_sandwich', name:'RARE SANDWICH',
      desc:'Doubles rare-mon weights for 60 steps.',
      detail:'A truffle-stuffed wrap. Weighted-low spawns get a serious bump.',
      kind:'sandwich', icon:'bottle', color:'#984848', accent:'#f0c8a0',
      buff:'rare', buffMult:2, buffSteps:60, price:2200
    },
    // ---- Bait lures (brainstorm #30) ----
    // Each biases the wild-encounter pool toward its tagged type for
    // 30 steps. Stacks with itself; HUD chip mirrors the REPEL slot.
    bait_bug: {
      id:'bait_bug', name:'BUG LURE',
      desc:'Lures BUG-type wild creatures for 30 steps.',
      detail:'A sticky paste that mimics flower-sap. Biases the next encounters toward BUGs.',
      kind:'lure', icon:'bottle', color:'#88a830', accent:'#e8f098',
      lureType:'BUG', steps:30, price:600
    },
    bait_water: {
      id:'bait_water', name:'WATER LURE',
      desc:'Lures WATER-type wild creatures for 30 steps.',
      detail:'Briny chum on a string. Biases the next encounters toward WATER mons.',
      kind:'lure', icon:'bottle', color:'#3070b0', accent:'#a0d0f0',
      lureType:'WATER', steps:30, price:600
    },
    bait_fire: {
      id:'bait_fire', name:'FIRE LURE',
      desc:'Lures FIRE-type wild creatures for 30 steps.',
      detail:'A smoking sachet of chillies. Biases the next encounters toward FIRE mons.',
      kind:'lure', icon:'bottle', color:'#c83030', accent:'#f0c080',
      lureType:'FIRE', steps:30, price:600
    },
    // ---- Overworld utility ----
    repel: {
      id:'repel', name:'REPEL',
      desc:'Drives off wild creatures for 100 steps.',
      detail:'A sharp herbal mist that wild creatures dislike. Suppresses encounters until the counter runs out.',
      kind:'repel', icon:'spray', color:'#d8b870', accent:'#f0e0a0',
      steps:100, price:350
    },
    super_repel: {
      id:'super_repel', name:'SUPER REPEL',
      desc:'A stronger Repel - 200 steps.',
      detail:'Twice the mist, twice the calm.',
      kind:'repel', icon:'spray', color:'#a08060', accent:'#f0d870',
      steps:200, price:700
    },
    bicycle: {
      id:'bicycle', name:'BICYCLE',
      desc:'A folding bicycle. Use to ride/walk.',
      detail:'A red folding bike. While riding, every step takes half the time. Auto-stows when surfing or indoors.',
      kind:'key', icon:'rod', color:'#e84848', accent:'#f0e0a0',
      key:true, price:0
    },
    stew: {
      id:'stew', name:'STEW',
      desc:"MOM's berry stew. Restores 120 HP.",
      detail:"A bowl of warm berry stew. Slow-cooked with care. Restores 120 HP to one ally.",
      kind:'heal', icon:'bottle', color:'#a06030', accent:'#f0c020',
      amount:120, target:'ally', price:0
    }
  };

  function kindLabel(it) {
    if (!it) return 'ITEM';
    if (it.kind === 'ball') return 'BALL';
    if (it.kind === 'heal') return 'HEAL';
    if (it.kind === 'status') return 'CARE';
    if (it.kind === 'revive') return 'REVIVE';
    if (it.kind === 'berry') return 'BERRY';
    if (it.kind === 'trainer_gear') return 'GEAR';
    if (it.kind === 'held_gear') return 'HELD';
    if (it.kind === 'key') return 'KEY';
    if (it.kind === 'repel') return 'REPEL';
    if (it.kind === 'tm') return 'TM';
    if (it.kind === 'evostone') return 'STONE';
    return 'ITEM';
  }

  function detailText(it) {
    return (it && (it.detail || it.desc)) || '';
  }

  function drawIcon(ctx, itemId, x, y, size) {
    const it = ITEMS[itemId];
    if (!it || !ctx) return false;
    const s = Math.max(12, size || 24) / 16;
    const main = it.color || '#d85050';
    const accent = it.accent || '#fff0c0';
    const dark = '#202020';
    const light = '#fff8e8';
    const r = (rx, ry, rw, rh, color) => {
      ctx.fillStyle = color;
      ctx.fillRect((x + rx * s) | 0, (y + ry * s) | 0, Math.max(1, (rw * s) | 0), Math.max(1, (rh * s) | 0));
    };
    const icon = it.icon || 'item';
    if (icon === 'ball') {
      r(4,1,8,2,dark); r(2,3,12,3,dark); r(1,6,14,4,dark); r(2,10,12,3,dark); r(4,13,8,2,dark);
      r(4,2,8,2,accent); r(3,4,10,3,main); r(2,7,12,1,main);
      r(2,8,12,2,light); r(4,11,8,2,light);
      r(6,6,4,4,dark); r(7,7,2,2,light);
      return true;
    }
    if (icon === 'bottle') {
      r(6,1,4,2,dark); r(5,3,6,2,dark); r(4,5,8,9,dark);
      r(7,2,2,2,accent); r(6,4,4,2,light); r(5,6,6,7,main); r(6,6,4,2,accent); r(6,10,4,2,'rgba(255,255,255,0.45)');
      return true;
    }
    if (icon === 'vial' || icon === 'spray') {
      r(5,1,6,2,dark); r(6,3,4,2,dark); r(4,5,8,8,dark);
      r(6,2,4,1,accent); r(5,6,6,6,main); r(6,5,4,2,light);
      if (icon === 'spray') { r(10,3,4,1,dark); r(12,2,1,1,accent); r(13,1,1,1,accent); }
      return true;
    }
    if (icon === 'berry') {
      r(7,1,3,2,'#307838'); r(4,4,8,8,dark); r(3,6,10,6,dark);
      r(5,4,6,8,main); r(4,7,8,4,main); r(6,5,2,2,accent); r(9,8,1,1,light);
      r(9,2,4,2,'#58a848'); r(11,1,2,2,'#7ed060');
      return true;
    }
    if (icon === 'star' || icon === 'charm') {
      r(7,1,2,4,accent); r(5,5,6,2,dark); r(3,7,10,2,dark); r(5,9,6,2,dark); r(6,11,4,3,dark);
      r(7,3,2,3,main); r(5,7,6,2,main); r(7,9,2,4,accent);
      if (icon === 'charm') { r(6,0,4,1,dark); r(7,13,2,2,dark); }
      return true;
    }
    if (icon === 'flute') {
      r(2,8,12,3,dark); r(3,7,3,1,dark); r(4,8,10,1,accent); r(3,9,11,1,main);
      r(6,7,1,1,dark); r(8,7,1,1,dark); r(10,7,1,1,dark); r(13,6,1,2,dark);
      return true;
    }
    if (icon === 'rod') {
      // Diagonal rod from top-right grip to bottom-left tip, with a line + bobber.
      r(11,1,3,2,dark); r(12,2,2,1,accent);                 // grip
      r(10,3,2,2,main); r(8,5,2,2,main);                    // shaft (upper)
      r(6,7,2,2,main); r(4,9,2,2,main); r(3,11,2,2,main);   // shaft (lower)
      r(2,13,1,1,dark);                                     // rod tip
      r(3,13,1,2,dark); r(4,15,1,1,accent);                 // line
      r(5,13,2,2,accent); r(5,12,2,1,dark); r(6,15,1,1,dark); // bobber
      return true;
    }
    if (icon === 'glasses') {
      r(2,6,5,5,dark); r(9,6,5,5,dark); r(7,8,2,1,dark);
      r(3,7,3,3,accent); r(10,7,3,3,accent); r(4,8,1,1,light); r(11,8,1,1,light);
      return true;
    }
    if (icon === 'pendant') {
      r(7,1,2,4,dark); r(5,5,6,2,dark); r(4,7,8,5,dark); r(6,12,4,2,dark);
      r(7,2,2,3,accent); r(6,6,4,1,accent); r(5,8,6,3,main); r(7,11,2,2,accent);
      return true;
    }
    if (icon === 'bell') {
      r(6,2,4,2,dark); r(4,4,8,8,dark); r(3,11,10,2,dark); r(7,13,2,2,dark);
      r(7,3,2,2,accent); r(5,5,6,6,main); r(4,11,8,1,accent); r(8,13,1,1,accent);
      return true;
    }
    if (icon === 'egg') {
      r(5,2,6,2,dark); r(4,4,8,8,dark); r(5,12,6,2,dark);
      r(6,3,4,2,light); r(5,5,6,7,it.color || '#fff8e8'); r(6,8,2,1,accent); r(9,6,1,1,accent);
      return true;
    }
    r(4,4,8,8,dark); r(5,5,6,6,main); r(7,7,2,2,accent);
    return true;
  }

  function drawCard(ctx, itemId, x, y, w, h, opts) {
    opts = opts || {};
    const it = ITEMS[itemId];
    if (!it || !ctx || !window.PR_UI) return false;
    window.PR_UI.panel(ctx, x, y, w, h, {
      fill:opts.fill || '#fff8e8',
      border:opts.border || '#202020',
      shadow:opts.shadow || '#c89048',
      highlight:'#fff8f0'
    });
    drawIcon(ctx, itemId, x + 7, y + 9, opts.iconSize || 26);
    const nameMax = Math.max(6, ((w - 44) / 6) | 0);
    window.PR_UI.drawText(ctx, it.name.slice(0, nameMax), x + 39, y + 7, '#202020');
    window.PR_UI.chip(ctx, x + 39, y + 18, kindLabel(it), { fill:'#e8f0ff', border:'#385890' });
    if (opts.count !== undefined) window.PR_UI.drawText(ctx, 'x' + opts.count, x + w - 24, y + 20, '#385890');
    if (opts.price !== undefined) window.PR_UI.drawText(ctx, '$' + opts.price, x + w - 42, y + 32, '#385890');
    const lines = window.PR_UI.wrap(detailText(it), Math.max(10, ((w - 14) / 6) | 0));
    const textY = y + (opts.compact ? 39 : 44);
    for (let i = 0; i < Math.min(lines.length, opts.lines || 4); i++) {
      window.PR_UI.drawText(ctx, lines[i], x + 7, textY + i * 9, '#604830');
    }
    if (opts.footer) window.PR_UI.drawText(ctx, opts.footer, x + 7, y + h - 10, '#806040');
    return true;
  }

  // Apply an item to a target mon. Returns { ok, message }.
  function apply(itemId, target) {
    const it = ITEMS[itemId];
    if (!it) return { ok:false, message:'Unknown item.' };
    if (!target) return { ok:false, message:'No target.' };
    if (it.kind === 'heal') {
      if (target.hp <= 0) return { ok:false, message:target.nickname + ' is fainted.' };
      if (target.hp >= target.stats.hp) return { ok:false, message:'HP is already full.' };
      const before = target.hp;
      target.hp = Math.min(target.stats.hp, target.hp + it.amount);
      return { ok:true, message:target.nickname + ' recovered ' + (target.hp - before) + ' HP!' };
    }
    if (it.kind === 'status') {
      if (target.hp <= 0) return { ok:false, message:target.nickname + ' is fainted.' };
      if (!target.status || !it.cures.includes(target.status)) {
        return { ok:false, message:'No effect on ' + target.nickname + '.' };
      }
      target.status = null;
      return { ok:true, message:target.nickname + ' was cured!' };
    }
    if (it.kind === 'revive') {
      if (target.hp > 0) return { ok:false, message:target.nickname + " isn't fainted." };
      target.hp = Math.max(1, Math.floor(target.stats.hp * (it.ratio || 0.5)));
      target.status = null;
      return { ok:true, message:target.nickname + ' was revived!' };
    }
    // Evolution stone (idea #14). Matches against the species' opt-in
    // `evolves: { to:X, stone:Y }`. Stats / sprite update inline so we
    // don't have to drag the battle-side evolution logic into items.
    // TM (idea #21). Teaches a move if the target has a free slot;
    // refuses cleanly otherwise. The disc itself is reusable - the
    // bag flow checks `reusable` before consuming.
    if (it.kind === 'tm') {
      const D = (typeof window !== 'undefined') && window.PR_DATA;
      const moveId = it.teaches;
      const mv = D && moveId && D.MOVES[moveId];
      if (!mv) return { ok:false, message:'It had no effect.' };
      if (target.moves.find(m => m.id === moveId)) {
        return { ok:false, message:target.nickname + ' already knows it.' };
      }
      if (target.moves.length >= 4) {
        return { ok:false, message:target.nickname + ' needs a free move slot.' };
      }
      target.moves.push({ id: moveId, pp: mv.pp, ppMax: mv.pp });
      return { ok:true, message:target.nickname + ' learned ' + mv.name + '!' };
    }
    if (it.kind === 'evostone') {
      const D = (typeof window !== 'undefined') && window.PR_DATA;
      const sp = D && D.CREATURES[target.species];
      if (!sp || !sp.evolves || sp.evolves.stone !== it.stone) {
        return { ok:false, message:'It had no effect on ' + target.nickname + '.' };
      }
      const evoId = sp.evolves.to;
      const evoSp = D.CREATURES[evoId];
      if (!evoSp) return { ok:false, message:'It had no effect.' };
      const oldName = sp.name;
      target.species = evoId;
      const newStats = D.computeStats(evoSp.baseStats, target.ivs, target.level, target.nature);
      const dHp = newStats.hp - target.stats.hp;
      target.stats = newStats;
      target.hp = Math.min(target.stats.hp, target.hp + Math.max(0, dHp));
      if (target.nickname === oldName) target.nickname = evoSp.name;
      return { ok:true, message:target.nickname + ' evolved into ' + evoSp.name + '!' };
    }
    return { ok:false, message:'Cannot use that.' };
  }

  // Helpers for the bag.
  function ensureBag(state) {
    if (!state.player.bag) state.player.bag = {};
    // Migrate legacy `balls` field once.
    if (state.player.balls && !state.player.bag.rodball) {
      state.player.bag.rodball = state.player.balls;
    }
    state.player.balls = state.player.bag.rodball || 0;
  }

  function add(state, itemId, count) {
    ensureBag(state);
    state.player.bag[itemId] = (state.player.bag[itemId] || 0) + (count|0);
    if (itemId === 'rodball') state.player.balls = state.player.bag.rodball;
  }

  function take(state, itemId, count) {
    ensureBag(state);
    if (!state.player.bag[itemId]) return false;
    if ((count|0) <= 0) count = 1;
    if (state.player.bag[itemId] < count) return false;
    state.player.bag[itemId] -= count;
    if (state.player.bag[itemId] <= 0) delete state.player.bag[itemId];
    if (itemId === 'rodball') state.player.balls = state.player.bag.rodball || 0;
    return true;
  }

  function listOwned(state) {
    ensureBag(state);
    const out = [];
    for (const id of Object.keys(state.player.bag)) {
      const it = ITEMS[id];
      if (!it) continue;
      out.push({ id, count: state.player.bag[id], def: it });
    }
    // Stable order roughly by category.
    const order = ['rodball','greatball','quickball','cavernball','heavy_ball','friend_ball','dusk_ball','ultraball','potion','superpotion','hyperpotion','maxpotion','stew','antidote','burnheal','paralyzeheal','awakening','fullheal','revive','maxrevive','oranberry','sitrusberry','pechaberry','soothe_bell','lucky_egg','lucky_charm','scholars_glasses','masters_pendant','old_rod','pokeflute','bicycle','repel','super_repel'];
    out.sort((a,b) => {
      const ai = order.indexOf(a.id), bi = order.indexOf(b.id);
      return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
    });
    return out;
  }

  // Look up an item def by id. Returns null if unknown so callers can
  // safely chain `(byId(x) || {}).xpMult` style patterns.
  function byId(id) { return ITEMS[id] || null; }

  function getCatchBonus(itemId, context) {
    const it = ITEMS[itemId];
    if (!it || it.kind !== 'ball') return 1;
    let bonus = it.catchBonus || 1;
    const battle = context && context.battle;
    if (it.firstTurnBonus && (!battle || (battle.turnCount || 0) === 0)) {
      bonus = Math.max(bonus, it.firstTurnBonus);
    }
    if (it.tagBonus && it.tagAny && it.tagAny.length) {
      const state = context && context.state;
      const map = (context && context.map) ||
        (state && state.world && state.world.currentMap && state.world.currentMap());
      const tags = map && Array.isArray(map.tags) ? map.tags : [];
      for (const tag of it.tagAny) {
        if (tags.includes(tag)) {
          bonus = Math.max(bonus, it.tagBonus);
          break;
        }
      }
    }
    // Heavy Ball: bonus while the foe is above the HP threshold.
    if (it.hpThresholdBonus && battle && battle.foe && battle.foe.stats) {
      const ratio = battle.foe.hp / Math.max(1, battle.foe.stats.hp);
      if (ratio >= (it.hpThreshold || 0.8)) {
        bonus = Math.max(bonus, it.hpThresholdBonus);
      }
    }
    // Dusk Ball: bonus during night / dusk phases.
    if (it.nightBonus && window.PR_TIME && window.PR_TIME.current) {
      const phase = window.PR_TIME.current();
      if (phase === 'night' || phase === 'dusk') {
        bonus = Math.max(bonus, it.nightBonus);
      }
    }
    // Net Ball (idea #46): bonus when the foe matches a type in the
    // ball's typeBonusTypes list.
    if (it.typeBonus && it.typeBonusTypes && it.typeBonusTypes.length && battle && battle.foe) {
      const D = window.PR_DATA;
      const foeTypes = D && D.CREATURES[battle.foe.species] && D.CREATURES[battle.foe.species].types;
      if (foeTypes) {
        for (const t of it.typeBonusTypes) {
          if (foeTypes.indexOf(t) !== -1) { bonus = Math.max(bonus, it.typeBonus); break; }
        }
      }
    }
    // Timer Ball (idea #46): bonus scales with battle.turnCount, capped.
    if (it.timerStep && battle && (battle.turnCount | 0) > 0) {
      const cap = it.timerCap || 4.0;
      const scaled = Math.min(cap, 1 + (battle.turnCount | 0) * it.timerStep);
      bonus = Math.max(bonus, scaled);
    }
    return bonus;
  }

  // Shop inventory tiered by player badge count. tier:N rows unlock
  // once the player has N badges (so tier:0 is available from the start).
  const SHOP_TIERS = [
    { tier:0, items:['rodball','potion','antidote','repel'] },
    { tier:1, items:['greatball','superpotion','paralyzeheal','awakening','super_repel'] },
    { tier:2, items:['quickball','cavernball','burnheal','oranberry','lucky_charm','soothe_bell'] },
    { tier:3, items:['sitrusberry','charcoal','mystic_water','miracle_seed','magnet','soft_sand','heavy_ball','dusk_ball','bait_bug','bait_water','bait_fire'] },
    { tier:4, items:['hyperpotion','revive','pechaberry','scholars_glasses','lucky_egg','focus_sash','friend_ball','wide_lens','firestone','thunderstone','icestone','leafstone','moonstone','apricorn'] },
    { tier:5, items:['ultraball','fullheal','leftovers','quick_claw','expert_belt','eviolite','choice_band','tm_thunderclap','tm_icebeam'] },
    { tier:6, items:['maxpotion','masters_pendant','tm_solarbeam','tm_earthquake','power_gem','tera_orb'] },
    { tier:7, items:['maxrevive','tm_hyperbeam'] }
  ];

  // Compute the visible shop list for an NPC given player state. The
  // `shop` def may pin extra items (`extraItems`) or grant a bonus
  // tier (`bonusTier`) so a particular town can stock something early.
  function computeShopInventory(shop, state) {
    const badgeCount = (state && state.player && state.player.badges
                        ? state.player.badges.length : 0);
    const tierCap = badgeCount + ((shop && shop.bonusTier) || 0);
    const seen = new Set();
    const out = [];
    for (const row of SHOP_TIERS) {
      if (row.tier > tierCap) continue;
      for (const id of row.items) {
        if (seen.has(id)) continue;
        if (!ITEMS[id]) continue;
        seen.add(id);
        out.push(id);
      }
    }
    if (shop && Array.isArray(shop.extraItems)) {
      for (const id of shop.extraItems) {
        if (seen.has(id) || !ITEMS[id]) continue;
        seen.add(id);
        out.push(id);
      }
    }
    return out;
  }

  window.PR_ITEMS = { ITEMS, apply, add, take, listOwned, ensureBag, byId, getCatchBonus,
                      kindLabel, detailText, drawIcon, drawCard,
                      SHOP_TIERS, computeShopInventory };
})();
