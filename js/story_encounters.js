// Story encounter registry. Each entry is matched by PR_STORY against
// the active progression event; the first eligible (highest-priority,
// chain-step-aligned) encounter fires a walk-up cutscene.
//
// Six core recurring characters carry the story:
//   - BLAINE the rival          (chain `rival`,       8 encounters, 5 battles)
//   - PEARL the apprentice      (chain `apprentice`,  8 encounters, 2 battles)
//   - NICO the dex journalist   (chain `journalist`,  6 encounters)
//   - MEEK the loser trainer    (chain `meek`,        6 encounters, all battles)
//   - OMA the grandparent       (chain `oma`,         6 encounters, gifts)
//   - DR. KEL the economist     (chain `economist`,   6 encounters)
// Plus two short chains (TANK x3 whiteouts, NIM x3 caves) and a few
// memorable one-offs (MARLA, FAYE, WRYN, AKIRA).
'use strict';

(function(){

  // Build a rival team scaled to the player's lead level. The rival picks
  // the starter that beats yours — pure flavour, since type advantage in
  // PokeRod is loose.
  function rivalStarterChain(state) {
    const yours = state.party && state.party[0] && state.party[0].species;
    if (yours === 'emberkit' || yours === 'flarebound' || yours === 'infernarok') return 'aquapup';
    if (yours === 'aquapup'  || yours === 'tideturtle' || yours === 'maelstroth') return 'sproutling';
    return 'emberkit';
  }
  function rivalEvoFor(species, level) {
    const C = window.PR_DATA && window.PR_DATA.CREATURES;
    if (!C) return species;
    let cur = species;
    while (true) {
      const sp = C[cur];
      if (!sp || !sp.evolves || level < sp.evolves.level) return cur;
      cur = sp.evolves.to;
    }
  }
  function rivalTeam(targetLevel, extras) {
    const lvl = Math.max(5, targetLevel | 0);
    const out = [[null, lvl + 1]];
    if (extras) for (const e of extras) out.push(e);
    return (state) => {
      const starter = rivalStarterChain(state);
      out[0][0] = rivalEvoFor(starter, lvl + 1);
      return out.map(([sp, l]) => [sp, l]);
    };
  }

  function partyAvg(state) {
    const ps = state.party || [];
    if (!ps.length) return 5;
    let total = 0;
    for (const m of ps) total += m.level | 0;
    return Math.max(5, Math.round(total / ps.length));
  }

  // Build a fixed-team battle generator used by minor recurring trainers.
  function staticTeamFn(team) { return () => team.map(([sp, l]) => [sp, l]); }

  // ------------------------------------------------------------------
  // BLAINE — Deep arc #1 (rival). 8 encounters; 5 are battles.
  // ------------------------------------------------------------------
  const RIVAL_BLAINE = { name:'BLAINE', sprite:'npc_blaine' };

  const blaine = [
    { id:'rival_00_start', chain:'rival', chainStep:0,
      character: RIVAL_BLAINE, priority:100,
      trigger:{ type:'starter' },
      condition: (s) => s.flags && s.flags.starterChosen,
      scene: [
        { kind:'line', text:'You actually picked one. Pathetic choice.' },
        { kind:'choice', prompt:'How do you reply?', options:[
          { label:'Yeah. Problem?', set:{ rivalTone:'rude' } },
          { label:'It\'s a great partner!', set:{ rivalTone:'soft' } },
          { label:'Why are you here?', set:{ rivalTone:'aloof' } }
        ]},
        { kind:'line', text:'Whatever. See you on the road.' }
      ]
    },
    { id:'rival_01_route1', chain:'rival', chainStep:1,
      character: RIVAL_BLAINE, priority:100,
      trigger:{ type:'firstVisit', map:'route1' },
      scene: [
        { kind:'line', text:'You took your time. Battle me — let\'s see if you wasted it.' },
        { kind:'battle', team:null,
          rivalTeamFn:(s) => rivalTeam(Math.max(5, partyAvg(s) + 1))(s),
          reward:120, defeat:['Hmph. Lucky.'] },
        { kind:'line', text:'You got faster, at least.' }
      ],
      rivalTeamFn:(s) => rivalTeam(Math.max(5, partyAvg(s) + 1))(s)
    },
    { id:'rival_02_woodfall', chain:'rival', chainStep:2,
      character: RIVAL_BLAINE, priority:100,
      trigger:{ type:'badge', count:1 },
      scene: [
        { kind:'line', text:'One badge. The gym leader must have been in a giving mood.' },
        { kind:'choice', prompt:'?', options:[
          { label:'Hard work, not luck.' },
          { label:'You can do better?' },
          { label:'(say nothing)' }
        ]},
        { kind:'line', text:'Sure, sure. Forest gym next. Don\'t embarrass me.' }
      ]
    },
    { id:'rival_03_pebblewood', chain:'rival', chainStep:3,
      character: RIVAL_BLAINE, priority:100,
      trigger:{ type:'firstVisit', map:'pebblewood' },
      scene: [
        { kind:'line', text:'I waited an hour for you. Battle. Now.' },
        { kind:'battle', team:null,
          rivalTeamFn:(s) => rivalTeam(Math.max(10, partyAvg(s) + 2),
            [['flitwing', Math.max(8, partyAvg(s))]])(s),
          reward:340, defeat:['Tch.'] },
        { kind:'line', text:'You\'re actually keeping up. Annoying.' }
      ]
    },
    { id:'rival_04_frostmere', chain:'rival', chainStep:4,
      character: RIVAL_BLAINE, priority:100,
      trigger:{ type:'firstVisit', map:'frostmere' },
      scene: [
        { kind:'line', text:'Cold up here, isn\'t it.' },
        { kind:'choice', prompt:'?', options:[
          { label:'Brought a scarf.', goto:'soft_branch' },
          { label:'Toughens you up.', goto:'rude_branch' }
        ]},
        { kind:'line', label:'soft_branch', text:'Heh. Take this — I had a spare.' },
        { kind:'gift', item:'superpotion', count:1, text:'A SUPER POTION for the trail.' },
        { kind:'line', text:'Don\'t make me regret it.' },
        { kind:'line', label:'rude_branch', text:'Spoken like someone who hasn\'t frostbitten yet.' }
      ]
    },
    { id:'rival_05_summit', chain:'rival', chainStep:5,
      character: RIVAL_BLAINE, priority:100,
      trigger:{ type:'firstVisit', map:'mountain' },
      scene: [
        { kind:'line', text:'The summit. Fitting place to put you in your place.' },
        { kind:'battle', team:null,
          rivalTeamFn:(s) => rivalTeam(Math.max(26, partyAvg(s) + 2),
            [['galewing', Math.max(24, partyAvg(s))],
             ['boltbeard', Math.max(24, partyAvg(s))]])(s),
          reward:1100, defeat:['You — what?'] },
        { kind:'line', text:'I\'m starting to think I should train more, not less.' }
      ]
    },
    { id:'rival_06_searoute', chain:'rival', chainStep:6,
      character: RIVAL_BLAINE, priority:100,
      trigger:{ type:'badge', count:5 },
      scene: [
        { kind:'line', text:'Five badges. You\'re really doing this.' },
        { kind:'battle', team:null,
          rivalTeamFn:(s) => rivalTeam(Math.max(38, partyAvg(s) + 2),
            [['stormfangis', Math.max(36, partyAvg(s))],
             ['tempestir', Math.max(36, partyAvg(s))],
             ['levifin', Math.max(36, partyAvg(s))]])(s),
          reward:2400, defeat:['Tch... again?'] },
        { kind:'line', text:'Two more badges. Then it\'s the league. See you at the top.' }
      ]
    },
    { id:'rival_07_finale', chain:'rival', chainStep:7,
      character: RIVAL_BLAINE, priority:100,
      trigger:{ type:'badge', count:7 },
      scene: [
        { kind:'line', text:'Seven badges. You actually pulled it off.' },
        { kind:'battle', team:null,
          rivalTeamFn:(s) => rivalTeam(Math.max(48, partyAvg(s) + 2),
            [['stormfangis', Math.max(48, partyAvg(s))],
             ['tempestir', Math.max(48, partyAvg(s))],
             ['levifin', Math.max(48, partyAvg(s))],
             ['umbrasire', Math.max(48, partyAvg(s))]])(s),
          reward:5200, defeat:['That was... a real fight.'] },
        { kind:'line', text:'You\'ve grown. I think... I have too.' },
        { kind:'line', text:'Go take the league. I\'ll be right behind you.' }
      ]
    }
  ];

  // ------------------------------------------------------------------
  // PEARL — Deep arc #2 (apprentice). 8 encounters; 2 friendly battles.
  // ------------------------------------------------------------------
  const PEARL = { name:'PEARL', sprite:'npc_pearl' };

  const pearl = [
    { id:'pearl_00', chain:'apprentice', chainStep:0,
      character: PEARL, priority:90,
      trigger:{ type:'starter' },
      condition: (s) => s.flags && s.flags.starterChosen && (s.flags.chains.rival || 0) >= 1,
      scene: [
        { kind:'line', text:'Hi! I\'m PEARL — PROF. ROD\'s other apprentice.' },
        { kind:'line', text:'I picked the third starter. We\'re a journey class of two!' },
        { kind:'choice', prompt:'?', options:[
          { label:'Nice to meet you.' },
          { label:'A rival, then?', set:{ pearlTone:'spark' } },
          { label:'Hands off my dex.' }
        ]},
        { kind:'line', text:'See you on the road. Be safe!' }
      ]
    },
    { id:'pearl_01', chain:'apprentice', chainStep:1,
      character: PEARL, priority:90,
      trigger:{ type:'badge', count:1 },
      scene: [
        { kind:'line', text:'You got a badge already? Take this — I have a few.' },
        { kind:'gift', item:'rodball', count:5, text:'Five ROD BALLS for your travels.' }
      ]
    },
    { id:'pearl_02', chain:'apprentice', chainStep:2,
      character: PEARL, priority:90,
      trigger:{ type:'evolve', count:1 },
      scene: [
        { kind:'line', text:'It evolved! Look at it!' },
        { kind:'gift', item:'antidote', count:2, text:'Take some antidotes — they grow up fast.' }
      ]
    },
    { id:'pearl_03', chain:'apprentice', chainStep:3,
      character: PEARL, priority:90,
      trigger:{ type:'caughtSpecies', count:10 },
      scene: [
        { kind:'line', text:'Ten species? Show me your team!' },
        { kind:'battle', team:null,
          rivalTeamFn:(s) => [
            [rivalEvoFor('sproutling', Math.max(12, partyAvg(s))), Math.max(12, partyAvg(s))],
            ['budling', Math.max(11, partyAvg(s) - 1)]
          ],
          reward:280, defeat:['Wow — you really worked at it!'] },
        { kind:'line', text:'That was fun. See you out there!' }
      ]
    },
    { id:'pearl_04', chain:'apprentice', chainStep:4,
      character: PEARL, priority:90,
      trigger:{ type:'badge', count:3 },
      scene: [
        { kind:'line', text:'Three badges! Your team is glowing.' },
        { kind:'gift', item:'oranberry', count:3, text:'ORAN BERRIES, fresh from the garden.' }
      ]
    },
    { id:'pearl_05', chain:'apprentice', chainStep:5,
      character: PEARL, priority:90,
      trigger:{ type:'caughtSpecies', count:25 },
      scene: [
        { kind:'line', text:'Twenty-five! Your dex is bigger than mine.' },
        { kind:'gift', item:'rodball', count:5, text:'More ROD BALLS — fill that thing up.' }
      ]
    },
    { id:'pearl_06', chain:'apprentice', chainStep:6,
      character: PEARL, priority:90,
      trigger:{ type:'badge', count:5 },
      scene: [
        { kind:'line', text:'I want one more battle before the league swallows you whole.' },
        { kind:'battle', team:null,
          rivalTeamFn:(s) => [
            [rivalEvoFor('sproutling', Math.max(34, partyAvg(s))), Math.max(34, partyAvg(s))],
            ['budling', Math.max(33, partyAvg(s) - 1)],
            ['mantilux', Math.max(32, partyAvg(s) - 2)]
          ],
          reward:1900, defeat:['You\'re going to win it all, I think.'] },
        { kind:'line', text:'Go win it. I\'ll cheer the loudest.' }
      ]
    },
    { id:'pearl_07', chain:'apprentice', chainStep:7,
      character: PEARL, priority:90,
      trigger:{ type:'badge', count:7 },
      scene: [
        { kind:'line', text:'Seven badges. You\'re really at the gates.' },
        { kind:'gift', item:'ultraball', count:1, text:'An ULTRA BALL — I saved it for you.' },
        { kind:'line', text:'Go on. Don\'t look back.' }
      ]
    }
  ];

  // ------------------------------------------------------------------
  // NICO — journalist. 6 encounters tied to caught-species milestones.
  // ------------------------------------------------------------------
  const NICO = { name:'NICO', sprite:'npc_nico' };

  const nico = [
    { id:'nico_00', chain:'journalist', chainStep:0,
      character: NICO, priority:80,
      trigger:{ type:'firstVisit', map:'brindale' },
      scene: [
        { kind:'line', text:'You\'re the new dex-keeper, aren\'t you? NICO. Roving reporter.' },
        { kind:'line', text:'I write about every dex that gets above 5 species. I\'ll find you.' }
      ]
    },
    { id:'nico_01', chain:'journalist', chainStep:1,
      character: NICO, priority:80,
      trigger:{ type:'caughtSpecies', count:5 },
      scene: [
        { kind:'line', text:'Five species. A start! Got a quote for me?' },
        { kind:'choice', prompt:'?', options:[
          { label:'"Just the start."', set:{ nicoTone:'cool' } },
          { label:'"Catch \'em all!"', set:{ nicoTone:'eager' } },
          { label:'"No comment."',  set:{ nicoTone:'aloof' } }
        ]},
        { kind:'line', text:'Thanks. I\'ll work that in. Keep at it.' }
      ]
    },
    { id:'nico_02', chain:'journalist', chainStep:2,
      character: NICO, priority:80,
      trigger:{ type:'caughtSpecies', count:15 },
      scene: [
        { kind:'line', text:'Fifteen species. PART ONE of my series went up last week.' },
        { kind:'gift', item:'greatball', count:1, text:'A GREAT BALL, on the house.' }
      ]
    },
    { id:'nico_03', chain:'journalist', chainStep:3,
      character: NICO, priority:80,
      trigger:{ type:'caughtSpecies', count:30 },
      scene: [
        { kind:'line', text:'Thirty! My editor wants the rare ones. Got a wraithlet yet?' },
        { kind:'choice', prompt:'?', options:[
          { label:'Working on it.' },
          { label:'Press too pushy.', set:{ nicoTone:'aloof' } },
          { label:'Tell him no.' }
        ]},
        { kind:'line', text:'Right, right. I\'ll give you breathing room.' }
      ]
    },
    { id:'nico_04', chain:'journalist', chainStep:4,
      character: NICO, priority:80,
      trigger:{ type:'caughtSpecies', count:50 },
      scene: [
        { kind:'line', text:'Fifty species. Front page. Want to see the headline?' },
        { kind:'gift', item:'ultraball', count:1, text:'And an ULTRA BALL — newsroom budget.' }
      ]
    },
    { id:'nico_05', chain:'journalist', chainStep:5,
      character: NICO, priority:80,
      trigger:{ type:'caughtSpecies', count:70 },
      scene: [
        { kind:'line', text:'Seventy. I\'m writing your biography next.' },
        { kind:'line', text:'Working title: "POKEROD CHAMPION."' },
        { kind:'gift', item:'maxrevive', count:1, text:'A MAX REVIVE for the road ahead.' }
      ]
    }
  ];

  // ------------------------------------------------------------------
  // MEEK — perpetual loser. 6 encounters, all battles.
  // ------------------------------------------------------------------
  const MEEK = { name:'MEEK', sprite:'npc_meek' };

  const meek = [
    { id:'meek_00', chain:'meek', chainStep:0,
      character: MEEK, priority:70,
      trigger:{ type:'firstVisit', map:'route1' },
      condition: (s) => (s.flags.chains.rival || 0) >= 2,
      scene: [
        { kind:'line', text:'I-I\'m gonna be a champion! Battle me!' },
        { kind:'battle', team:[['nibblet', 4]], reward:60, defeat:['NO! ...I\'ll get stronger!'] },
        { kind:'line', text:'I\'ll find you. I\'ll be ready next time.' }
      ]
    },
    { id:'meek_01', chain:'meek', chainStep:1,
      character: MEEK, priority:70,
      trigger:{ type:'firstVisit', map:'route2' },
      scene: [
        { kind:'line', text:'I trained! See, I have TWO now!' },
        { kind:'battle', team:[['nibblet', 8],['flitwing', 7]], reward:140, defeat:['So close...'] },
        { kind:'line', text:'I\'ll get there. Watch.' }
      ]
    },
    { id:'meek_02', chain:'meek', chainStep:2,
      character: MEEK, priority:70,
      trigger:{ type:'badge', count:2 },
      scene: [
        { kind:'line', text:'You got a second badge?? So did I — well, I tried.' },
        { kind:'battle', team:[['flitwing', 14],['cinderpup', 13]], reward:340,
          defeat:['I keep getting closer!'] }
      ]
    },
    { id:'meek_03', chain:'meek', chainStep:3,
      character: MEEK, priority:70,
      trigger:{ type:'badge', count:4 },
      scene: [
        { kind:'line', text:'I almost quit. Almost.' },
        { kind:'battle', team:[['flitwing', 24],['cinderpup', 23],['voltkit', 24]], reward:920,
          defeat:['Don\'t give up on me!'] }
      ]
    },
    { id:'meek_04', chain:'meek', chainStep:4,
      character: MEEK, priority:70,
      trigger:{ type:'badge', count:6 },
      scene: [
        { kind:'line', text:'Six badges?! I\'m at four. Battle me — I\'ll close the gap!' },
        { kind:'battle', team:[['galewing', 36],['cinderpup', 35],['voltkit', 35],['venipip', 35]],
          reward:2400, defeat:['I FELT it. Next time. Next time!'] }
      ]
    },
    { id:'meek_05', chain:'meek', chainStep:5,
      character: MEEK, priority:70,
      trigger:{ type:'badge', count:7 },
      scene: [
        { kind:'line', text:'Last battle before the league. Win or lose, I had to try.' },
        { kind:'battle', team:[['skylordan', 48],['pyrohound', 48],['voltlynx', 48],['vampirothy', 48]],
          reward:4800, defeat:['Thanks for keeping me going. Really.'] },
        { kind:'line', text:'Go win it. I\'ll be cheering somewhere in the stands.' }
      ]
    }
  ];

  // ------------------------------------------------------------------
  // OMA — grandparent. 6 encounters, gifts.
  // ------------------------------------------------------------------
  const OMA = { name:'OMA', sprite:'npc_oma' };

  const oma = [
    { id:'oma_00', chain:'oma', chainStep:0,
      character: OMA, priority:60,
      trigger:{ type:'firstVisit', map:'brindale' },
      scene: [
        { kind:'line', text:'My, look at you. Trainer through and through.' },
        { kind:'gift', item:'oranberry', count:3, text:'Three ORAN BERRIES — eat one yourself if you must.' }
      ]
    },
    { id:'oma_01', chain:'oma', chainStep:1,
      character: OMA, priority:60,
      trigger:{ type:'level', level:10 },
      scene: [
        { kind:'line', text:'Level ten already? You blink and they grow up.' },
        { kind:'gift', item:'antidote', count:2, text:'Antidotes for the journey.' }
      ]
    },
    { id:'oma_02', chain:'oma', chainStep:2,
      character: OMA, priority:60,
      trigger:{ type:'evolve', count:1 },
      scene: [
        { kind:'line', text:'It evolved! I knew that one had heart.' },
        { kind:'gift', item:'potion', count:3, text:'Some potions — and a knit scarf cosmetic.' },
        { kind:'set', flags:{ omaScarf:true } }
      ]
    },
    { id:'oma_03', chain:'oma', chainStep:3,
      character: OMA, priority:60,
      trigger:{ type:'level', level:25 },
      scene: [
        { kind:'line', text:'Level twenty-five. In my day we walked uphill...' },
        { kind:'gift', item:'superpotion', count:3, text:'SUPER POTIONS — I overpacked.' }
      ]
    },
    { id:'oma_04', chain:'oma', chainStep:4,
      character: OMA, priority:60,
      trigger:{ type:'whiteout', count:1 },
      scene: [
        { kind:'line', text:'Oh my dear. Sit a moment. Drink some tea.' },
        { kind:'gift', item:'revive', count:1, text:'Take this REVIVE. Don\'t lose heart.' }
      ]
    },
    { id:'oma_05', chain:'oma', chainStep:5,
      character: OMA, priority:60,
      trigger:{ type:'level', level:40 },
      scene: [
        { kind:'line', text:'Level forty. You\'re a real trainer now.' },
        { kind:'gift', item:'ultraball', count:1, text:'An ULTRA BALL and my old recipe book.' },
        { kind:'set', flags:{ omaBook:true } },
        { kind:'line', text:'Go on. Make us proud.' }
      ]
    }
  ];

  // ------------------------------------------------------------------
  // DR. KEL — economist. 6 encounters tied to spending.
  // ------------------------------------------------------------------
  const KEL = { name:'DR. KEL', sprite:'npc_kel' };

  const kel = [
    { id:'kel_00', chain:'economist', chainStep:0,
      character: KEL, priority:50,
      trigger:{ type:'spend', total:1 },
      scene: [
        { kind:'line', text:'Excuse me. DR. KEL, regional economist.' },
        { kind:'line', text:'Every transaction tells a story. I\'ll be tracking yours.' }
      ]
    },
    { id:'kel_01', chain:'economist', chainStep:1,
      character: KEL, priority:50,
      trigger:{ type:'spend', total:200 },
      scene: [
        { kind:'line', text:'Your first 200 currency in motion. Capital efficiency: questionable.' },
        { kind:'choice', prompt:'?', options:[
          { label:'I needed those potions.' },
          { label:'Spend to win.' },
          { label:'(roll eyes)' }
        ]},
        { kind:'line', text:'A common refrain. Carry on.' }
      ]
    },
    { id:'kel_02', chain:'economist', chainStep:2,
      character: KEL, priority:50,
      trigger:{ type:'spend', total:1000 },
      scene: [
        { kind:'line', text:'A thousand. You\'ve crossed into "regular customer" territory.' },
        { kind:'gift', item:'rodball', count:3, text:'Take these — call it volume rebate.' },
        { kind:'set', flags:{ kelDiscount:5 } }
      ]
    },
    { id:'kel_03', chain:'economist', chainStep:3,
      character: KEL, priority:50,
      trigger:{ type:'spend', total:5000 },
      scene: [
        { kind:'line', text:'Five thousand. The shopkeepers know your name now.' },
        { kind:'gift', item:'greatball', count:2, text:'Two GREAT BALLS, with my compliments.' },
        { kind:'set', flags:{ kelDiscount:10 } }
      ]
    },
    { id:'kel_04', chain:'economist', chainStep:4,
      character: KEL, priority:50,
      trigger:{ type:'spend', total:15000 },
      scene: [
        { kind:'line', text:'Fifteen thousand. You\'ve become a one-trainer stimulus package.' },
        { kind:'gift', item:'ultraball', count:1, text:'An ULTRA BALL. Spend wisely.' }
      ]
    },
    { id:'kel_05', chain:'economist', chainStep:5,
      character: KEL, priority:50,
      trigger:{ type:'spend', total:40000 },
      scene: [
        { kind:'line', text:'Forty thousand. I\'ll write a paper about you.' },
        { kind:'gift', item:'maxpotion', count:2, text:'Two MAX POTIONS — late-game bracket.' },
        { kind:'line', text:'See me when you\'ve spent the next forty.' }
      ]
    }
  ];

  // ------------------------------------------------------------------
  // TANK — short whiteout chain (3 encounters).
  // ------------------------------------------------------------------
  const TANK = { name:'TANK', sprite:'npc_tank' };

  const tank = [
    { id:'tank_00', chain:'tank', chainStep:0,
      character: TANK, priority:75,
      trigger:{ type:'whiteout', count:1 },
      scene: [
        { kind:'line', text:'Took a beating, did you. Happens to all of us.' },
        { kind:'gift', item:'revive', count:1, text:'Take a REVIVE. Don\'t come back without one.' }
      ]
    },
    { id:'tank_01', chain:'tank', chainStep:1,
      character: TANK, priority:75,
      trigger:{ type:'whiteout', count:3 },
      scene: [
        { kind:'line', text:'Third loss. You\'re building scars now. Good.' },
        { kind:'gift', item:'maxrevive', count:1, text:'A MAX REVIVE. Use it on the one that mattered.' }
      ]
    },
    { id:'tank_02', chain:'tank', chainStep:2,
      character: TANK, priority:75,
      trigger:{ type:'whiteout', count:6 },
      scene: [
        { kind:'line', text:'Six wipes. You haven\'t quit. That counts for everything.' },
        { kind:'gift', item:'maxrevive', count:2, text:'Two MAX REVIVES. Don\'t make me come back here.' }
      ]
    }
  ];

  // ------------------------------------------------------------------
  // NIM — short caves chain (3 encounters).
  // ------------------------------------------------------------------
  const NIM = { name:'NIM', sprite:'npc_nim' };

  const nim = [
    { id:'nim_00', chain:'nim', chainStep:0,
      character: NIM, priority:65,
      trigger:{ type:'firstVisit', map:'pebblewood_cavern' },
      scene: [
        { kind:'line', text:'Welcome to the dark. The bugs love it down here.' },
        { kind:'gift', item:'cavernball', count:2, text:'Two CAVERN BALLS — they catch better in the dark.' }
      ]
    },
    { id:'nim_01', chain:'nim', chainStep:1,
      character: NIM, priority:65,
      trigger:{ type:'firstVisit', map:'glimcavern_b1' },
      scene: [
        { kind:'line', text:'Glimcavern hides a sub-floor most trainers miss. You found it.' },
        { kind:'gift', item:'cavernball', count:3, text:'Three more CAVERN BALLS. Use \'em.' }
      ]
    },
    { id:'nim_02', chain:'nim', chainStep:2,
      character: NIM, priority:65,
      trigger:{ type:'firstVisit', map:'frostpeak_ice_cave' },
      scene: [
        { kind:'line', text:'A cave inside a snowstorm. My favourite kind.' },
        { kind:'gift', item:'ultraball', count:1, text:'An ULTRA BALL — for whatever lives at the bottom.' }
      ]
    }
  ];

  // ------------------------------------------------------------------
  // One-offs: MARLA, FAYE, WRYN, AKIRA.
  // ------------------------------------------------------------------
  const MARLA = { name:'MARLA', sprite:'npc_marla' };
  const FAYE  = { name:'FAYE',  sprite:'npc_faye' };
  const WRYN  = { name:'WRYN',  sprite:'npc_wryn' };
  const AKIRA = { name:'AKIRA', sprite:'npc_akira' };

  const oneOffs = [
    { id:'marla_first_hidden', character: MARLA, priority:55,
      trigger:{ type:'hiddenItem', count:1 },
      scene: [
        { kind:'line', text:'You\'ve got an explorer\'s eye. I knew it.' },
        { kind:'gift', item:'rodball', count:3, text:'Three ROD BALLS to keep you searching.' }
      ]
    },
    { id:'faye_first_water_catch', character: FAYE, priority:55,
      trigger:{ type:'catch' },
      condition: (s) => {
        const C = window.PR_DATA && window.PR_DATA.CREATURES;
        if (!C || !s.dex || !s.dex.caught) return false;
        for (const sp of s.dex.caught) {
          const c = C[sp];
          if (c && c.types && c.types.includes('WATER')) return true;
        }
        return false;
      },
      scene: [
        { kind:'line', text:'A water companion! The tide takes care of trainers like you.' },
        { kind:'gift', item:'rodball', count:2, text:'Surfer\'s gift — two ROD BALLS.' }
      ]
    },
    { id:'wryn_first_dragon', character: WRYN, priority:55,
      trigger:{ type:'catch' },
      condition: (s) => {
        const C = window.PR_DATA && window.PR_DATA.CREATURES;
        if (!C || !s.dex || !s.dex.caught) return false;
        for (const sp of s.dex.caught) {
          const c = C[sp];
          if (c && c.types && c.types.includes('DRAGON')) return true;
        }
        return false;
      },
      scene: [
        { kind:'line', text:'A draekit. They almost never let themselves be seen.' },
        { kind:'gift', item:'oranberry', count:5, text:'Five ORAN BERRIES from the high temple.' }
      ]
    },
    { id:'akira_finale', character: AKIRA, priority:55,
      trigger:{ type:'badge', count:7 },
      condition: (s) => (s.flags.chains.rival || 0) >= 7,
      scene: [
        { kind:'line', text:'AKIRA, league recruiter. Seven badges. Time to talk.' },
        { kind:'gift', item:'ultraball', count:2, text:'Two ULTRA BALLS. The league will need them.' },
        { kind:'line', text:'See you at the gates. Don\'t keep us waiting.' }
      ]
    }
  ];

  const ENCOUNTERS = []
    .concat(blaine)
    .concat(pearl)
    .concat(nico)
    .concat(meek)
    .concat(oma)
    .concat(kel)
    .concat(tank)
    .concat(nim)
    .concat(oneOffs);

  window.PR_STORY_ENCOUNTERS = { ENCOUNTERS };
})();
