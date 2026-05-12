// Quest registry + state machine.
//
// Each quest definition is a flat object - see SCHEMA below. Quests can
// be auto-started (no giver) or NPC-given (giver:'storyId'). The status
// enum is:
//   'notstarted' - registered, hidden from the quest log, not yet picked
//                  up. NPC-given quests start here.
//   'active'     - picked up, in progress. Visible in the quest log.
//   'ready'      - completion check passed and turnIn:true; player must
//                  return to the giver to collect the reward.
//   'done'       - fully complete, reward delivered.
//
// Auto-started quests skip 'notstarted' (they begin 'active') and skip
// 'ready' (they go straight to 'done' on completion).
//
// SCHEMA:
//   {
//     id:        unique string
//     name:      display title (uppercase short)
//     desc:      one-line short description
//     longDesc:  string[] paragraphs for the detail view
//     giver:     storyId of the NPC who offers/turns it in, or null
//     category:  'fetch'|'catch'|'find'|'talk'|'battle'|'visit'|'milestone'
//     reward:    { item, count }
//     check:     (state) -> bool
//     progressFn:(state) -> string  (shown on detail view)
//     turnIn:    bool  // true → completion goes to 'ready' not 'done'
//     offerCondition: (state) -> bool  // when can the giver offer this
//     phaseGate:  number  // chains.{character.chain} >= phaseGate
//     hint:      'where to go next' string for the detail view
//   }
'use strict';

(function(){

  // ---- Helpers used inside quest checks ---------------------------------

  function bagCount(state, itemId) {
    return (state.player && state.player.bag && (state.player.bag[itemId] || 0)) | 0;
  }
  function dexCaughtCount(state) {
    return (state.dex && state.dex.caught && state.dex.caught.size) | 0;
  }
  function dexSeenCount(state) {
    return (state.dex && state.dex.seen && state.dex.seen.size) | 0;
  }
  function partyMaxLevel(state) {
    let m = 0;
    for (const p of state.party || []) if (p && (p.level | 0) > m) m = p.level | 0;
    return m;
  }
  function flag(state, key) {
    return (state.flags && state.flags[key]) | 0;
  }
  function chain(state, key) {
    return (state.flags && state.flags.chains && state.flags.chains[key]) | 0;
  }
  function badgeCount(state) {
    return ((state.player && state.player.badges) || []).length | 0;
  }
  function dexHasType(state, type) {
    const C = window.PR_DATA && window.PR_DATA.CREATURES;
    if (!C || !state.dex || !state.dex.caught) return false;
    for (const sp of state.dex.caught) {
      const c = C[sp];
      if (c && c.types && c.types.includes(type)) return true;
    }
    return false;
  }
  function dexHasSpecies(state, sp) {
    return state.dex && state.dex.caught && state.dex.caught.has(sp);
  }
  function ratio(have, need) {
    return Math.min(have, need) + '/' + need;
  }
  function visitCount(state, mapId) {
    return (state.flags && state.flags.visitCount && state.flags.visitCount[mapId]) | 0;
  }
  function visitedAny(state, mapIds) {
    if (!state.flags || !state.flags.firstVisited) return false;
    for (const id of mapIds) if (state.flags.firstVisited[id]) return true;
    return false;
  }
  function visitedAll(state, mapIds) {
    if (!state.flags || !state.flags.firstVisited) return false;
    for (const id of mapIds) if (!state.flags.firstVisited[id]) return false;
    return true;
  }
  function visitedCount(state, mapIds) {
    let n = 0;
    for (const id of mapIds) if (state.flags && state.flags.firstVisited && state.flags.firstVisited[id]) n++;
    return n;
  }
  function npcVisitsTo(state, storyId) {
    return (state.flags && state.flags.npcVisits && state.flags.npcVisits[storyId]) | 0;
  }

  // Fetch quest factory: bring N of itemId to giver.
  function fetchQuest(o) {
    return {
      id: o.id,
      name: o.name,
      desc: o.desc,
      longDesc: o.longDesc,
      giver: o.giver,
      category: 'fetch',
      reward: o.reward,
      turnIn: true,
      target: { item: o.item, count: o.count },
      offerCondition: o.offerCondition || (() => true),
      check: (s) => bagCount(s, o.item) >= o.count,
      progressFn: (s) => ratio(bagCount(s, o.item), o.count) + ' ' + (window.PR_ITEMS && window.PR_ITEMS.ITEMS[o.item] ? window.PR_ITEMS.ITEMS[o.item].name : o.item),
      hint: o.hint || 'Find the item in the wild or buy it at MARTS.',
      consumeOnTurnIn: o.consumeOnTurnIn !== false
    };
  }

  // Talk-to-NPC factory: visit a different story character to satisfy.
  function talkQuest(o) {
    return {
      id: o.id,
      name: o.name,
      desc: o.desc,
      longDesc: o.longDesc,
      giver: o.giver,
      category: 'talk',
      reward: o.reward,
      turnIn: true,
      target: { talkTo: o.talkTo },
      offerCondition: o.offerCondition || (() => true),
      check: (s) => npcVisitsTo(s, o.talkTo) > 0,
      progressFn: (s) => npcVisitsTo(s, o.talkTo) > 0 ? 'spoke with target' : 'have not spoken yet',
      hint: o.hint || 'Visit them at their home tile.'
    };
  }

  // Catch quest factory: catch a creature with a particular type or species.
  function catchTypeQuest(o) {
    return {
      id: o.id,
      name: o.name,
      desc: o.desc,
      longDesc: o.longDesc,
      giver: o.giver,
      category: 'catch',
      reward: o.reward,
      turnIn: true,
      target: { type: o.type },
      offerCondition: o.offerCondition || (() => true),
      check: (s) => dexHasType(s, o.type),
      progressFn: (s) => dexHasType(s, o.type) ? 'TYPE ' + o.type + ' caught!' : 'NO ' + o.type + ' yet',
      hint: o.hint || 'Catch a creature of this type anywhere.'
    };
  }
  function catchSpeciesQuest(o) {
    return {
      id: o.id,
      name: o.name,
      desc: o.desc,
      longDesc: o.longDesc,
      giver: o.giver,
      category: 'catch',
      reward: o.reward,
      turnIn: true,
      target: { species: o.species },
      offerCondition: o.offerCondition || (() => true),
      check: (s) => dexHasSpecies(s, o.species),
      progressFn: (s) => dexHasSpecies(s, o.species) ? 'caught the target!' : 'have not seen yet',
      hint: o.hint || 'It lives in the wild somewhere.'
    };
  }

  // Visit-map factory: reach a list of maps.
  function visitQuest(o) {
    return {
      id: o.id,
      name: o.name,
      desc: o.desc,
      longDesc: o.longDesc,
      giver: o.giver,
      category: 'visit',
      reward: o.reward,
      turnIn: true,
      target: { maps: o.maps, mode: o.mode || 'all' },
      offerCondition: o.offerCondition || (() => true),
      check: (s) => o.mode === 'any' ? visitedAny(s, o.maps) : visitedAll(s, o.maps),
      progressFn: (s) => visitedCount(s, o.maps) + '/' + o.maps.length + ' visited',
      hint: o.hint || 'Travel to those locations.'
    };
  }

  // Milestone factories (auto-start, immediate reward on completion).
  function milestoneQuest(o) {
    return {
      id: o.id,
      name: o.name,
      desc: o.desc,
      longDesc: o.longDesc,
      giver: null,
      category: o.category || 'milestone',
      reward: o.reward,
      turnIn: false,
      offerCondition: () => true,
      check: o.check,
      progressFn: o.progressFn || (() => '...'),
      hint: o.hint || 'It will complete automatically.'
    };
  }

  // ---- The 50 quests ----------------------------------------------------

  const ALL = [];

  // === Original 4 quests preserved (auto-start, classic) ================
  ALL.push({
    id:'first_catch', name:'FIRST CATCH', desc:'Catch your first wild creature.',
    longDesc:['Every trainer remembers their first.','Throw a ROD BALL on a wild encounter.'],
    giver:null, category:'catch', reward:{ item:'superpotion', count:1 }, turnIn:false,
    check: (s) => dexCaughtCount(s) >= 1,
    progressFn: (s) => ratio(dexCaughtCount(s), 1) + ' caught',
    hint:'Step into tall grass and try a ROD BALL.'
  });
  ALL.push({
    id:'seen_ten', name:'KEEN OBSERVER', desc:'See ten different creatures.',
    longDesc:['You don\'t have to catch them all to know them.','Just step on enough patches of grass.'],
    giver:null, category:'milestone', reward:{ item:'rodball', count:5 }, turnIn:false,
    check: (s) => dexSeenCount(s) >= 10,
    progressFn: (s) => ratio(dexSeenCount(s), 10) + ' seen',
    hint:'Wander any route - encounters count even if they flee.'
  });
  ALL.push({
    id:'visit_brindale', name:'OUT OF TOWN', desc:'Reach Brindale Town.',
    longDesc:['The road north out of Rodport leads to Brindale.','Lots of new faces there.'],
    giver:null, category:'visit', reward:{ item:'potion', count:3 }, turnIn:false,
    check: (s) => s.player && s.player.map === 'brindale',
    progressFn: (s) => (s.player && s.player.map === 'brindale') ? 'arrived' : 'not yet',
    hint:'Head north from Rodport, then through Route 1.'
  });
  ALL.push({
    id:'full_party', name:'FRIENDS FOR DAYS', desc:'Fill your party with six creatures.',
    longDesc:['Six is the magic number.','Catch them. Don\'t deposit any.'],
    giver:null, category:'milestone', reward:{ item:'hyperpotion', count:1 }, turnIn:false,
    check: (s) => (s.party || []).length >= 6,
    progressFn: (s) => ratio((s.party || []).length, 6) + ' partners',
    hint:'Catch four more if you have two; don\'t send them to PC storage.'
  });

  // === BLAINE chain: 4 quests ==========================================
  ALL.push(catchSpeciesQuest({
    id:'blaine_wraithlet', name:'BRING ME A WRAITHLET',
    desc:'BLAINE wants a wraithlet on his desk.',
    longDesc:['"Most trainers chicken out of ghost types," he says.','"Prove you didn\'t."','He won\'t admit he\'s been looking for one all month.'],
    giver:'blaine', species:'wraithlet',
    reward:{ item:'ultraball', count:1 },
    offerCondition: (s) => chain(s, 'rival') >= 2,
    hint:'Wraithlets sometimes appear at night in caves.'
  }));
  ALL.push({
    id:'blaine_perfect_streak', name:'DON\'T LOSE PRETTY',
    desc:'Win 5 trainer battles without whitening out.',
    longDesc:['BLAINE is keeping score. Five trainer wins in a row, no wipes.','He counts the wipes from this point forward.'],
    giver:'blaine', category:'battle', reward:{ item:'lucky_egg', count:1 }, turnIn:true,
    target:{ trainerWins:5, baseline:0 },
    offerCondition: (s) => chain(s, 'rival') >= 3,
    check: (s) => {
      const baseline = (s.quests && s.quests.blaine_perfect_streak && s.quests.blaine_perfect_streak.baselineTrainerWins) || 0;
      const wipeBaseline = (s.quests && s.quests.blaine_perfect_streak && s.quests.blaine_perfect_streak.baselineWipes) || 0;
      const tw = (s.player && s.player.stats && s.player.stats.trainerWins) || 0;
      const wo = (s.flags && s.flags.whiteouts) || 0;
      return (tw - baseline) >= 5 && (wo - wipeBaseline) === 0;
    },
    progressFn: (s) => {
      const baseline = (s.quests && s.quests.blaine_perfect_streak && s.quests.blaine_perfect_streak.baselineTrainerWins) || 0;
      const tw = (s.player && s.player.stats && s.player.stats.trainerWins) || 0;
      return ratio(tw - baseline, 5) + ' trainer wins';
    },
    hint:'Don\'t take any whiteouts until you finish.',
    onAssign: (s) => {
      const q = s.quests.blaine_perfect_streak;
      q.baselineTrainerWins = (s.player.stats && s.player.stats.trainerWins) || 0;
      q.baselineWipes = (s.flags && s.flags.whiteouts) || 0;
    }
  });
  ALL.push({
    id:'blaine_meek_thrice', name:'OUT-WALK THE RIVAL',
    desc:'Beat MEEK three times so BLAINE feels better.',
    longDesc:['"He keeps challenging you. Just say yes," BLAINE says.','"Make it three times. He needs the practice. So do you."'],
    giver:'blaine', category:'battle', reward:{ item:'greatball', count:3 }, turnIn:true,
    offerCondition: (s) => chain(s, 'rival') >= 4 && chain(s, 'meek') >= 1,
    check: (s) => chain(s, 'meek') >= 4,
    progressFn: (s) => ratio(chain(s, 'meek'), 4) + ' MEEK encounters'
  });
  ALL.push(catchTypeQuest({
    id:'blaine_dragon_bow', name:'BOW IF YOU MUST',
    desc:'Catch a DRAGON type and report to BLAINE.',
    longDesc:['"They sleep in high places," he says.','"Bring me one. Briefly. I\'ll give it back."'],
    giver:'blaine', type:'DRAGON',
    reward:{ item:'maxrevive', count:1 },
    offerCondition: (s) => chain(s, 'rival') >= 5
  }));

  // === PEARL chain: 5 quests ==========================================
  ALL.push(fetchQuest({
    id:'pearl_oran_5', name:'ORAN ERRAND',
    desc:'Bring PEARL 5 ORAN BERRIES.',
    longDesc:['She\'s drying them for tea.','"Five is plenty for a small batch," she says.'],
    giver:'pearl', item:'oranberry', count:5,
    reward:{ item:'rodball', count:3 },
    offerCondition: (s) => chain(s, 'apprentice') >= 1,
    hint:'Find ORAN BERRIES on grass routes or buy them.'
  }));
  ALL.push({
    id:'pearl_dex_sampler', name:'DEX SAMPLER',
    desc:'Catch one each of GRASS, WATER, and FIRE type.',
    longDesc:['PEARL\'s "starter triangle" project.','One per type. She\'ll release them after admiring.'],
    giver:'pearl', category:'catch', reward:{ item:'greatball', count:2 }, turnIn:true,
    offerCondition: (s) => chain(s, 'apprentice') >= 2,
    check: (s) => dexHasType(s, 'GRASS') && dexHasType(s, 'WATER') && dexHasType(s, 'FIRE'),
    progressFn: (s) => {
      let n = 0;
      if (dexHasType(s, 'GRASS')) n++;
      if (dexHasType(s, 'WATER')) n++;
      if (dexHasType(s, 'FIRE')) n++;
      return ratio(n, 3) + ' types caught';
    },
    hint:'GRASS in routes, WATER on the beach, FIRE in caves and routes.'
  });
  ALL.push(talkQuest({
    id:'pearl_meet_oma', name:'SHELF DUTY',
    desc:'PEARL wants you to introduce yourself to OMA.',
    longDesc:['"You should meet my favourite reader," PEARL says.','"OMA. She lives in BRINDALE. Go say hi."'],
    giver:'pearl', talkTo:'oma',
    reward:{ item:'oranberry', count:3 },
    offerCondition: (s) => chain(s, 'apprentice') >= 2
  }));
  ALL.push({
    id:'pearl_evolution_show', name:'PRESSED FLOWERS',
    desc:'Evolve a partner so PEARL can sketch it.',
    longDesc:['She wants to draw an evolution from life.','"Just one. I\'ll be quick. I promise."'],
    giver:'pearl', category:'milestone', reward:{ item:'sitrusberry', count:3 }, turnIn:true,
    offerCondition: (s) => chain(s, 'apprentice') >= 3,
    check: (s) => flag(s, 'evolutions') >= 1,
    progressFn: (s) => flag(s, 'evolutions') >= 1 ? 'evolved!' : 'no evolutions yet',
    hint:'Levelling up past evo thresholds triggers it automatically.'
  });
  ALL.push({
    id:'pearl_full_dex', name:'APPRENTICE EXAM',
    desc:'PEARL\'s final test: 30 species caught.',
    longDesc:['"Catch thirty species and I will write your name in the book," she says.','"My book. The one I am writing about you."'],
    giver:'pearl', category:'catch', reward:{ item:'lucky_egg', count:1 }, turnIn:true,
    offerCondition: (s) => chain(s, 'apprentice') >= 4,
    check: (s) => dexCaughtCount(s) >= 30,
    progressFn: (s) => ratio(dexCaughtCount(s), 30) + ' species caught'
  });

  // === NICO chain: 4 quests ==========================================
  ALL.push(catchTypeQuest({
    id:'nico_flying_photo', name:'PHOTO SESSION',
    desc:'Catch a FLYING type for NICO\'s column.',
    longDesc:['He needs a profile shot for the Sunday edition.','"They cock their heads better in captivity."'],
    giver:'nico', type:'FLYING',
    reward:{ item:'greatball', count:1 },
    offerCondition: (s) => chain(s, 'journalist') >= 1
  }));
  ALL.push(catchTypeQuest({
    id:'nico_dragon_scoop', name:'DRAGON SCOOP',
    desc:'NICO wants the DRAGON-type story.',
    longDesc:['"Front page," he says.','"You catch one, I write the headline."'],
    giver:'nico', type:'DRAGON',
    reward:{ item:'ultraball', count:1 },
    offerCondition: (s) => chain(s, 'journalist') >= 2
  }));
  ALL.push({
    id:'nico_seen_50', name:'PAGE SEVEN',
    desc:'See 50 species for NICO\'s anniversary issue.',
    longDesc:['"Just SEE them, you don\'t have to catch.","Step into more grass. The grass knows."'],
    giver:'nico', category:'milestone', reward:{ item:'maxpotion', count:1 }, turnIn:true,
    offerCondition: (s) => chain(s, 'journalist') >= 2,
    check: (s) => dexSeenCount(s) >= 50,
    progressFn: (s) => ratio(dexSeenCount(s), 50) + ' seen'
  });
  ALL.push({
    id:'nico_battle_three', name:'ON THE RECORD',
    desc:'Beat 3 trainer battles for NICO\'s column.',
    longDesc:['He\'s writing a piece on "the daily life of a champion-track."','He needs three trainer wins to quote.'],
    giver:'nico', category:'battle', reward:{ item:'rodball', count:3 }, turnIn:true,
    offerCondition: (s) => chain(s, 'journalist') >= 3,
    check: (s) => {
      const q = s.quests && s.quests.nico_battle_three;
      const baseline = (q && q.baseline) || 0;
      const tw = (s.player.stats && s.player.stats.trainerWins) || 0;
      return (tw - baseline) >= 3;
    },
    progressFn: (s) => {
      const q = s.quests && s.quests.nico_battle_three;
      const baseline = (q && q.baseline) || 0;
      const tw = (s.player.stats && s.player.stats.trainerWins) || 0;
      return ratio(tw - baseline, 3) + ' trainer wins';
    },
    onAssign: (s) => { s.quests.nico_battle_three.baseline = (s.player.stats && s.player.stats.trainerWins) || 0; }
  });

  // === MEEK chain: 3 quests ==========================================
  ALL.push(fetchQuest({
    id:'meek_potions', name:'LEND ME A POTION',
    desc:'Bring MEEK 3 SUPER POTIONS.',
    longDesc:['"My team gets through three a week," he says.','"I should buy them, I know. I don\'t have the money."'],
    giver:'meek', item:'superpotion', count:3,
    reward:{ item:'maxpotion', count:1 },
    offerCondition: (s) => chain(s, 'meek') >= 1
  }));
  ALL.push({
    id:'meek_visit_five', name:'CHEER ME ON',
    desc:'Visit MEEK five times at the Pokemon Center.',
    longDesc:['"It helps. I don\'t know why. It just helps."','He keeps a tally on a napkin.'],
    giver:'meek', category:'talk', reward:{ item:'sitrusberry', count:2 }, turnIn:true,
    offerCondition: (s) => chain(s, 'meek') >= 2,
    check: (s) => npcVisitsTo(s, 'meek') >= 5,
    progressFn: (s) => ratio(npcVisitsTo(s, 'meek'), 5) + ' visits'
  });
  ALL.push({
    id:'meek_sparring', name:'SPARRING PARTNER',
    desc:'Beat MEEK twice - he says it helps.',
    longDesc:['He\'s using your wins to recalibrate.','"Two more, please. I\'m close to something."'],
    giver:'meek', category:'battle', reward:{ item:'revive', count:2 }, turnIn:true,
    offerCondition: (s) => chain(s, 'meek') >= 3,
    check: (s) => chain(s, 'meek') >= 5,
    progressFn: (s) => ratio(chain(s, 'meek'), 5) + ' MEEK rounds'
  });

  // === OMA chain: 4 quests ==========================================
  ALL.push(fetchQuest({
    id:'oma_berry_pie', name:'BERRY PIE',
    desc:'OMA needs 3 ORAN + 3 SITRUS for a pie.',
    longDesc:['She\'s baking for the whole street.','"And one for you. Don\'t argue."'],
    giver:'oma', item:'oranberry', count:3,
    reward:{ item:'sitrusberry', count:3 },
    offerCondition: (s) => chain(s, 'oma') >= 1,
    hint:'OMA also takes SITRUS - bring those too in your bag.'
  }));
  // Variant: also requires sitrus, custom check.
  ALL[ALL.length - 1].check = (s) => bagCount(s, 'oranberry') >= 3 && bagCount(s, 'sitrusberry') >= 3;
  ALL[ALL.length - 1].progressFn = (s) => ratio(bagCount(s, 'oranberry'), 3) + ' ORAN, ' + ratio(bagCount(s, 'sitrusberry'), 3) + ' SITRUS';
  ALL.push({
    id:'oma_full_berries', name:'DON\'T BE HUNGRY',
    desc:'Carry ten berries (any kind) at once.',
    longDesc:['"You eat too little on the road, dear."','OMA wants to see your bag heavy with berries before you leave.'],
    giver:'oma', category:'fetch', reward:{ item:'fullheal', count:1 }, turnIn:true,
    offerCondition: (s) => chain(s, 'oma') >= 2,
    check: (s) => bagCount(s, 'oranberry') + bagCount(s, 'sitrusberry') + bagCount(s, 'pechaberry') >= 10,
    progressFn: (s) => ratio(bagCount(s, 'oranberry') + bagCount(s, 'sitrusberry') + bagCount(s, 'pechaberry'), 10) + ' berries'
  });
  ALL.push(talkQuest({
    id:'oma_visit_blaine', name:'VISIT THE FAMILY',
    desc:'OMA wants you to check on BLAINE.',
    longDesc:['"He\'s lonely. He\'d never say it."','"Just go say hello and let me know."'],
    giver:'oma', talkTo:'blaine',
    reward:{ item:'oranberry', count:5 },
    offerCondition: (s) => chain(s, 'oma') >= 3
  }));
  ALL.push({
    id:'oma_level_25', name:'GROWING UP',
    desc:'Get a partner to level 25 - OMA wants to see.',
    longDesc:['"They\'re not a baby anymore at twenty-five."','"Bring them by. I\'ll knit them something."'],
    giver:'oma', category:'milestone', reward:{ item:'lucky_charm', count:1 }, turnIn:true,
    offerCondition: (s) => chain(s, 'oma') >= 3,
    check: (s) => partyMaxLevel(s) >= 25,
    progressFn: (s) => 'TOP LV ' + partyMaxLevel(s) + '/25'
  });

  // === DR. KEL chain: 3 quests ==========================================
  ALL.push({
    id:'kel_big_spender', name:'BIG SPENDER',
    desc:'Cumulative spend reaches $1500.',
    longDesc:['"Velocity is a virtue," DR. KEL says.','"Spend $1500. I\'ll log it."'],
    giver:'kel', category:'milestone', reward:{ item:'greatball', count:3 }, turnIn:true,
    offerCondition: (s) => chain(s, 'economist') >= 1,
    check: (s) => flag(s, 'totalSpent') >= 1500,
    progressFn: (s) => '$' + flag(s, 'totalSpent') + ' / $1500'
  });
  ALL.push({
    id:'kel_velocity', name:'VELOCITY BONUS',
    desc:'Buy 10 ROD BALLS in a single visit to a MART.',
    longDesc:['He wants the receipt.','"Walk in, walk out, ten balls. Don\'t shop around."'],
    giver:'kel', category:'fetch', reward:{ item:'rodball', count:5 }, turnIn:true,
    offerCondition: (s) => chain(s, 'economist') >= 2,
    check: (s) => bagCount(s, 'rodball') >= 10,
    progressFn: (s) => ratio(bagCount(s, 'rodball'), 10) + ' ROD BALLS'
  });
  ALL.push({
    id:'kel_total_5k', name:'CAPITAL CITIZEN',
    desc:'Cumulative spend reaches $5000.',
    longDesc:['He wants you in his next paper.','"$5000. We\'ll round up."'],
    giver:'kel', category:'milestone', reward:{ item:'ultraball', count:1 }, turnIn:true,
    offerCondition: (s) => chain(s, 'economist') >= 3,
    check: (s) => flag(s, 'totalSpent') >= 5000,
    progressFn: (s) => '$' + flag(s, 'totalSpent') + ' / $5000'
  });

  // === TANK chain: 3 quests ==========================================
  ALL.push(fetchQuest({
    id:'tank_revives', name:'REFILL',
    desc:'Bring TANK 3 REVIVES.',
    longDesc:['"Stockpile," he says.','"Center\'s low, and I don\'t trust the courier."'],
    giver:'tank', item:'revive', count:3,
    reward:{ item:'maxrevive', count:1 },
    offerCondition: (s) => chain(s, 'tank') >= 1
  }));
  ALL.push({
    id:'tank_survivor', name:'SURVIVOR',
    desc:'White out once and come back.',
    longDesc:['"You\'ll learn more from one wipe than from ten wins," TANK says.','"Come find me after."'],
    giver:'tank', category:'milestone', reward:{ item:'fullheal', count:2 }, turnIn:true,
    offerCondition: (s) => chain(s, 'tank') >= 1,
    check: (s) => flag(s, 'whiteouts') >= 1,
    progressFn: (s) => flag(s, 'whiteouts') >= 1 ? 'survived!' : 'no whiteouts yet'
  });
  ALL.push(visitQuest({
    id:'tank_climb_again', name:'CLIMB AGAIN',
    desc:'Visit FROSTPEAK after a whiteout.',
    longDesc:['"The mountain doesn\'t care if you fell," TANK says.','"Go back. Stand on it. Once is enough."'],
    giver:'tank', maps:['frostpeak'], mode:'any',
    reward:{ item:'maxpotion', count:1 },
    offerCondition: (s) => chain(s, 'tank') >= 2 && flag(s, 'whiteouts') >= 1
  }));

  // === NIM chain: 3 quests ==========================================
  ALL.push(visitQuest({
    id:'nim_cave_map', name:'CAVE MAP',
    desc:'Visit pebblewood_cavern, glimcavern_b1, frostpeak_ice_cave.',
    longDesc:['NIM is mapping all three caves but his ankle is bad.','"Walk all three for me. I\'ll write the legend."'],
    giver:'nim', maps:['pebblewood_cavern','glimcavern_b1','frostpeak_ice_cave'], mode:'all',
    reward:{ item:'cavernball', count:5 },
    offerCondition: (s) => chain(s, 'nim') >= 1
  }));
  ALL.push({
    id:'nim_cave_catch', name:'CAVERN CATCH',
    desc:'Catch a creature in any cave.',
    longDesc:['"They\'re different in the dark," NIM says.','"Bring me a dex page from down here."'],
    giver:'nim', category:'catch', reward:{ item:'cavernball', count:3 }, turnIn:true,
    offerCondition: (s) => chain(s, 'nim') >= 1,
    check: (s) => visitedAny(s, ['pebblewood_cavern','glimcavern_b1','frostpeak_ice_cave']) && dexCaughtCount(s) >= 1,
    progressFn: (s) => visitedAny(s, ['pebblewood_cavern','glimcavern_b1','frostpeak_ice_cave']) ? 'cave entered' : 'no cave yet'
  });
  ALL.push(visitQuest({
    id:'nim_glim_b1', name:'SUB-FLOOR EXPRESS',
    desc:'Find Glimcavern B1.',
    longDesc:['"Most trainers miss it," NIM says.','"There\'s a stair behind the southern rock cluster."'],
    giver:'nim', maps:['glimcavern_b1'], mode:'any',
    reward:{ item:'maxrevive', count:1 },
    offerCondition: (s) => chain(s, 'nim') >= 2
  }));

  // === MARLA chain: 4 quests ==========================================
  ALL.push({
    id:'marla_five', name:'FIVE HIDDEN',
    desc:'Find 5 hidden items.',
    longDesc:['MARLA collects them with you.','"Five is a respectable start."'],
    giver:'marla', category:'find', reward:{ item:'rodball', count:5 }, turnIn:true,
    offerCondition: () => true,
    check: (s) => flag(s, 'totalHidden') >= 5,
    progressFn: (s) => ratio(flag(s, 'totalHidden'), 5) + ' hidden items'
  });
  ALL.push({
    id:'marla_fifteen', name:'FIFTEEN HIDDEN',
    desc:'Find 15 hidden items.',
    longDesc:['"You\'re a real explorer now," MARLA says.','"Fifteen is the threshold."'],
    giver:'marla', category:'find', reward:{ item:'lucky_charm', count:1 }, turnIn:true,
    offerCondition: (s) => flag(s, 'totalHidden') >= 5,
    check: (s) => flag(s, 'totalHidden') >= 15,
    progressFn: (s) => ratio(flag(s, 'totalHidden'), 15) + ' hidden items'
  });
  ALL.push(visitQuest({
    id:'marla_four_routes', name:'MAP MARGIN',
    desc:'Visit four distinct routes for MARLA\'s map.',
    longDesc:['"I draw routes for the next traveller," MARLA says.','"You\'ve already done some of my work."'],
    giver:'marla', maps:['route1','route2','searoute','beach'], mode:'all',
    reward:{ item:'greatball', count:2 },
    offerCondition: (s) => flag(s, 'totalHidden') >= 5
  }));
  ALL.push(fetchQuest({
    id:'marla_charm', name:'BRING ME A CHARM',
    desc:'Deliver a LUCKY CHARM to MARLA.',
    longDesc:['"I lost mine in a sandstorm," MARLA says.','"You\'ll find another one before I do."'],
    giver:'marla', item:'lucky_charm', count:1,
    reward:{ item:'sitrusberry', count:5 },
    offerCondition: (s) => flag(s, 'totalHidden') >= 10
  }));

  // === FAYE chain: 3 quests ==========================================
  ALL.push(catchTypeQuest({
    id:'faye_water', name:'TIDE CHASER',
    desc:'Catch a WATER type for FAYE.',
    longDesc:['"They sing better in your bag," FAYE says.','"Catch one. I\'ll teach you how to listen."'],
    giver:'faye', type:'WATER',
    reward:{ item:'rodball', count:3 }
  }));
  ALL.push({
    id:'faye_surf', name:'SURF COACH',
    desc:'Use surf for the first time.',
    longDesc:['"Press B at the water\'s edge with a WATER partner.","You\'ll know when it works."'],
    giver:'faye', category:'milestone', reward:{ item:'lucky_charm', count:1 }, turnIn:true,
    offerCondition: (s) => dexHasType(s, 'WATER'),
    check: (s) => !!(s.flags && s.flags.surfedOnce),
    progressFn: (s) => (s.flags && s.flags.surfedOnce) ? 'surfed!' : 'have not surfed'
  });
  ALL.push(visitQuest({
    id:'faye_searoute', name:'SEAROUTE TRIP',
    desc:'Surf to the SEAROUTE for FAYE.',
    longDesc:['"It\'s the longest stretch of open water in the region," FAYE says.','"You\'ll meet things out there."'],
    giver:'faye', maps:['searoute'], mode:'any',
    reward:{ item:'ultraball', count:1 },
    offerCondition: (s) => !!(s.flags && s.flags.surfedOnce)
  }));

  // === WRYN chain: 3 quests ==========================================
  ALL.push(visitQuest({
    id:'wryn_summit', name:'HIGH WIND',
    desc:'Reach the mountain summit.',
    longDesc:['"You\'ve climbed half-way," WRYN says.','"The summit is half a step further."'],
    giver:'wryn', maps:['mountain'], mode:'any',
    reward:{ item:'maxpotion', count:1 }
  }));
  ALL.push(catchTypeQuest({
    id:'wryn_dragon', name:'BOW WHEN YOU SEE ONE',
    desc:'Catch a DRAGON type.',
    longDesc:['"They are quieter than you think," WRYN says.','"You\'ll know when you meet one."'],
    giver:'wryn', type:'DRAGON',
    reward:{ item:'ultraball', count:1 },
    offerCondition: (s) => visitedAny(s, ['mountain'])
  }));
  ALL.push(fetchQuest({
    id:'wryn_oran_gift', name:'SAGE\'S GIFT',
    desc:'Bring WRYN 5 ORAN BERRIES from below.',
    longDesc:['"I have run out," WRYN says, smiling slightly.','"They do not grow this high."'],
    giver:'wryn', item:'oranberry', count:5,
    reward:{ item:'sitrusberry', count:3 },
    offerCondition: (s) => visitedAny(s, ['mountain'])
  }));

  // === AKIRA chain: 3 quests ==========================================
  ALL.push({
    id:'akira_six_badges', name:'SIX BADGES',
    desc:'Earn six badges for AKIRA\'s ledger.',
    longDesc:['"Six is the line," AKIRA says.','"Cross it and we have a real conversation."'],
    giver:'akira', category:'milestone', reward:{ item:'greatball', count:5 }, turnIn:true,
    offerCondition: () => true,
    check: (s) => badgeCount(s) >= 6,
    progressFn: (s) => ratio(badgeCount(s), 6) + ' badges'
  });
  ALL.push({
    id:'akira_eight_badges', name:'EIGHT BADGES',
    desc:'Earn all eight badges.',
    longDesc:['"Show me," AKIRA says.','"All eight. Then we head to the league together."'],
    giver:'akira', category:'milestone', reward:{ item:'maxrevive', count:2 }, turnIn:true,
    offerCondition: (s) => badgeCount(s) >= 6,
    check: (s) => badgeCount(s) >= 8,
    progressFn: (s) => ratio(badgeCount(s), 8) + ' badges'
  });
  ALL.push({
    id:'akira_league_prep', name:'LEAGUE PREP',
    desc:'Get a party member to level 40.',
    longDesc:['"You\'ll be eaten alive at the league below 40," AKIRA says.','"At least one. More if you\'re smart."'],
    giver:'akira', category:'milestone', reward:{ item:'maxpotion', count:2 }, turnIn:true,
    offerCondition: (s) => badgeCount(s) >= 6,
    check: (s) => partyMaxLevel(s) >= 40,
    progressFn: (s) => 'TOP LV ' + partyMaxLevel(s) + '/40'
  });

  // === Auto-milestone quests (no giver, classic auto-complete) =========
  ALL.push(milestoneQuest({
    id:'first_evolution', name:'FIRST EVOLUTION',
    desc:'Evolve your first partner.',
    longDesc:['Evolutions happen at level thresholds.','Just keep training.'],
    reward:{ item:'sitrusberry', count:2 },
    check: (s) => flag(s, 'evolutions') >= 1,
    progressFn: (s) => flag(s, 'evolutions') >= 1 ? 'evolved!' : 'no evolutions'
  }));
  ALL.push(milestoneQuest({
    id:'auto_fire', name:'FIRE ENTHUSIAST',
    desc:'Catch any FIRE type.',
    longDesc:['Fire types appear in dry routes and the desert.'],
    reward:{ item:'burnheal', count:2 },
    category:'catch',
    check: (s) => dexHasType(s, 'FIRE'),
    progressFn: (s) => dexHasType(s, 'FIRE') ? 'caught!' : 'no FIRE yet'
  }));
  ALL.push(milestoneQuest({
    id:'auto_ghost', name:'GHOST WHISPERER',
    desc:'Catch any GHOST type.',
    longDesc:['Ghost types favour caves and night.'],
    reward:{ item:'cavernball', count:3 },
    category:'catch',
    check: (s) => dexHasType(s, 'GHOST'),
    progressFn: (s) => dexHasType(s, 'GHOST') ? 'caught!' : 'no GHOST yet'
  }));
  ALL.push(milestoneQuest({
    id:'auto_10_trainers', name:'CAREER TRAINER',
    desc:'Defeat 10 trainers.',
    longDesc:['Battle every trainer in your path.','It adds up faster than you\'d think.'],
    reward:{ item:'hyperpotion', count:1 },
    category:'battle',
    check: (s) => ((s.player.stats && s.player.stats.trainerWins) || 0) >= 10,
    progressFn: (s) => ratio(((s.player.stats && s.player.stats.trainerWins) || 0), 10) + ' trainer wins'
  }));
  ALL.push(milestoneQuest({
    id:'auto_5000_steps', name:'WANDERER',
    desc:'Walk 5000 steps.',
    longDesc:['Step count rises every tile you cross.','Tall grass counts. Sand counts. Cobble counts.'],
    reward:{ item:'oranberry', count:5 },
    category:'milestone',
    check: (s) => (s.player.steps || 0) >= 5000,
    progressFn: (s) => ratio((s.player.steps || 0), 5000) + ' steps'
  }));
  ALL.push(milestoneQuest({
    id:'auto_5k_money', name:'PURSE STRINGS',
    desc:'Reach $5000 in cash.',
    longDesc:['Hoard or earn - either works.'],
    reward:{ item:'greatball', count:1 },
    category:'milestone',
    check: (s) => (s.player.money || 0) >= 5000,
    progressFn: (s) => '$' + (s.player.money || 0) + ' / $5000'
  }));
  ALL.push(milestoneQuest({
    id:'auto_25_caught', name:'COLLECTOR',
    desc:'Catch 25 species.',
    longDesc:['Twenty-five is one and a half cases of dex pages.'],
    reward:{ item:'lucky_egg', count:1 },
    category:'catch',
    check: (s) => dexCaughtCount(s) >= 25,
    progressFn: (s) => ratio(dexCaughtCount(s), 25) + ' species'
  }));
  ALL.push(milestoneQuest({
    id:'auto_first_whiteout', name:'HUMBLE PIE',
    desc:'White out for the first time.',
    longDesc:['It happens. Don\'t let it stop you.','Come back stronger.'],
    reward:{ item:'revive', count:1 },
    category:'survive',
    check: (s) => flag(s, 'whiteouts') >= 1,
    progressFn: (s) => flag(s, 'whiteouts') >= 1 ? 'survived' : '-'
  }));

  // ---- Build the QUESTS map indexed by id ------------------------------
  const QUESTS = {};
  for (const q of ALL) QUESTS[q.id] = q;

  // ---- State machine ---------------------------------------------------

  function ensure(state) {
    if (!state.quests) state.quests = {};
    for (const id of Object.keys(QUESTS)) {
      const def = QUESTS[id];
      if (!state.quests[id]) {
        // NPC-given quests start hidden until the player accepts them.
        // Auto-start quests (no giver) start active.
        state.quests[id] = { status: def.giver ? 'notstarted' : 'active' };
      }
      // Normalise legacy saves: a quest pre-update with `status:'active'`
      // for an NPC-given def is fine, leave it. If `status:'done'` was
      // already there, leave it.
    }
  }

  // Mark an NPC-given quest as accepted. Called after the giver dialog.
  function assignQuest(state, id) {
    ensure(state);
    const def = QUESTS[id];
    const s = state.quests[id];
    if (!def || !s) return false;
    if (s.status !== 'notstarted') return false;
    s.status = 'active';
    s.assignedAt = Date.now();
    if (typeof def.onAssign === 'function') {
      try { def.onAssign(state); } catch (e) { console.warn('[quests] onAssign threw', e); }
    }
    return true;
  }

  // Turn a 'ready' quest in to its giver. Delivers the reward, moves to
  // 'done', returns the def for the caller to announce.
  function turnInQuest(state, id) {
    ensure(state);
    const def = QUESTS[id];
    const s = state.quests[id];
    if (!def || !s) return null;
    if (s.status !== 'ready') return null;
    s.status = 'done';
    if (window.PR_ACHV) window.PR_ACHV.unlock(state, 'first_quest');
    if (def.consumeOnTurnIn && def.target && def.target.item && window.PR_ITEMS && window.PR_ITEMS.take) {
      window.PR_ITEMS.take(state, def.target.item, def.target.count || 1);
    }
    if (def.reward && def.reward.item && window.PR_ITEMS && window.PR_ITEMS.add) {
      window.PR_ITEMS.add(state, def.reward.item, def.reward.count || 1);
    }
    return def;
  }

  // Re-evaluate; auto-complete any quest whose check passes. For
  // turnIn:true quests this transitions to 'ready' (player must visit
  // the giver). For others it goes straight to 'done' and the reward is
  // delivered. Returns the list of quests that completed (ready or done)
  // so the caller can announce.
  function tick(state) {
    ensure(state);
    const completed = [];
    for (const id of Object.keys(QUESTS)) {
      const def = QUESTS[id];
      const s = state.quests[id];
      if (!s || s.status !== 'active') continue;
      try {
        if (def.check && def.check(state)) {
          if (def.turnIn) {
            s.status = 'ready';
            completed.push({ def, status:'ready' });
          } else {
            s.status = 'done';
            if (window.PR_ACHV) window.PR_ACHV.unlock(state, 'first_quest');
            if (def.reward && def.reward.item && window.PR_ITEMS && window.PR_ITEMS.add) {
              window.PR_ITEMS.add(state, def.reward.item, def.reward.count || 1);
            }
            completed.push({ def, status:'done' });
          }
        }
      } catch (e) { /* ignore broken check */ }
    }
    return completed;
  }

  function status(state, id) {
    ensure(state);
    return state.quests[id] && state.quests[id].status;
  }

  // List quests for the menu. Hides 'notstarted' (the giver hasn't
  // offered them yet - and even if they have, accepting moves to
  // 'active' so it'll show then).
  function list(state) {
    ensure(state);
    const out = [];
    for (const id of Object.keys(QUESTS)) {
      const s = state.quests[id];
      if (!s || s.status === 'notstarted') continue;
      out.push({ def:QUESTS[id], status: s.status });
    }
    return out;
  }

  // Find an offerable quest from a particular giver: the first
  // 'notstarted' quest whose offerCondition(state) returns true.
  function offerableQuest(state, giverStoryId) {
    ensure(state);
    for (const id of Object.keys(QUESTS)) {
      const def = QUESTS[id];
      if (def.giver !== giverStoryId) continue;
      const s = state.quests[id];
      if (!s || s.status !== 'notstarted') continue;
      try { if (def.offerCondition && !def.offerCondition(state)) continue; }
      catch (_) { continue; }
      return def;
    }
    return null;
  }

  // Find a quest ready to turn in to a giver.
  function readyQuest(state, giverStoryId) {
    ensure(state);
    for (const id of Object.keys(QUESTS)) {
      const def = QUESTS[id];
      if (def.giver !== giverStoryId) continue;
      const s = state.quests[id];
      if (!s || s.status !== 'ready') continue;
      return def;
    }
    return null;
  }

  function counts(state) {
    ensure(state);
    let active = 0, ready = 0, done = 0, total = 0;
    for (const id of Object.keys(QUESTS)) {
      total++;
      const s = state.quests[id];
      if (!s) continue;
      if (s.status === 'active') active++;
      else if (s.status === 'ready') ready++;
      else if (s.status === 'done') done++;
    }
    return { active, ready, done, total };
  }

  window.PR_QUESTS = {
    QUESTS, ensure, tick, status, list,
    assignQuest, turnInQuest, offerableQuest, readyQuest, counts
  };
})();
