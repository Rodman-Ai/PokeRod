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
        { kind:'line', text:'You actually picked one, {name}. Pathetic choice.' },
        { kind:'choice', prompt:'How do you reply?', options:[
          { label:'Yeah. Problem?', set:{ rivalTone:'rude' } },
          { label:'It\'s a great partner!', set:{ rivalTone:'soft' } },
          { label:'Why are you here?', set:{ rivalTone:'aloof' } }
        ]},
        { kind:'line', text:'Whatever. See you on the road, {name}.' }
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
        { kind:'line', text:'Hi {name}! I\'m PEARL — PROF. ROD\'s other apprentice.' },
        { kind:'line', text:'I picked the third starter. We\'re a journey class of two!' },
        { kind:'choice', prompt:'?', options:[
          { label:'Nice to meet you.' },
          { label:'A rival, then?', set:{ pearlTone:'spark' } },
          { label:'Hands off my dex.' }
        ]},
        { kind:'line', text:'Oh — {color}, right? Same! See you on the road, {name}.' }
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
        { kind:'line', text:'You\'re the new dex-keeper, aren\'t you? {name}. Got it.' },
        { kind:'line', text:'NICO. Roving reporter. I\'ll find you when you hit 5 species.' }
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
        { kind:'line', text:'I-I\'m gonna be a champion, {name}! Battle me!' },
        { kind:'battle', team:[['nibblet', 4]], reward:60, defeat:['NO! ...I\'ll get stronger!'] },
        { kind:'line', text:'I\'ll find you, {name}. I\'ll be ready next time.' }
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
        { kind:'line', text:'My, look at you, {name}. Trainer through and through.' },
        { kind:'gift', item:'oranberry', count:3, text:'Three ORAN BERRIES, dear. I\'ll bring {food} next time.' }
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
        { kind:'line', text:'Excuse me. {name}? DR. KEL, regional economist.' },
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
        { kind:'line', text:'Took a beating, did you, {name}. Happens to all of us.' },
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
        { kind:'line', text:'Welcome to the dark, {name}. The bugs love it down here.' },
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
        { kind:'line', text:'You\'ve got an explorer\'s eye, {name}. I knew it.' },
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
        { kind:'line', text:'A water companion, {name}! The tide takes care of trainers like you.' },
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
        { kind:'line', text:'A draekit, {name}. They almost never let themselves be seen.' },
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

  // ------------------------------------------------------------------
  // STORY_CHARACTERS — home locations + phased dialog trees.
  //
  // Each character lives at a fixed (map, x, y) tile when not actively
  // running a cutscene. PR_STORY installs them as regular NPCs at world
  // boot. Their `dialog` is state-aware: PR_STORY.npcDialog picks a phase
  // by chain progress, then a script by visit count (first / second /
  // third), with `idle` rotation lines for visits 4+. Visit count resets
  // when the chain advances so post-cutscene dialog always opens fresh.
  //
  // Schema:
  //   id, name, sprite, chain (or null), home:{ map, x, y, dir, replaceExisting? }
  //   phases: [
  //     { upTo: <chainStep cap (exclusive)>,
  //       first:    [string, string, ...]   // first interaction within this phase
  //       second:   [string, string, ...]   // 2nd interaction
  //       third:    [string, string, ...]   // 3rd interaction
  //       idle:     [[string, ...], ...]    // rotation for visits 4+
  //       firstFn:  (state) -> string[]     // optional, overrides `first` if returned
  //     },
  //     ...
  //   ]
  //
  // Lines render through the dialog box; PR_STORY.npcDialog auto-prefixes
  // them with "<NAME>: " unless the line already includes a colon.
  // Lines should fit ≤30 chars per row when wrapped (PR_UI.wrap handles it).
  // ------------------------------------------------------------------

  function fmtMoney(n) { return '$' + (n | 0); }
  function speciesName(sp) {
    const C = window.PR_DATA && window.PR_DATA.CREATURES;
    return (C && C[sp] && C[sp].name) || sp || 'one';
  }
  function lastCaught(state) {
    if (!state.dex || !state.dex.caught) return null;
    const arr = Array.from(state.dex.caught);
    return arr.length ? arr[arr.length - 1] : null;
  }
  function partyHasType(state, type) {
    const C = window.PR_DATA && window.PR_DATA.CREATURES;
    if (!C) return false;
    for (const p of state.party || []) {
      const sp = p && C[p.species];
      if (sp && sp.types && sp.types.includes(type)) return true;
    }
    return false;
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

  const STORY_CHARACTERS = [
    // ----------------------------------------------------------------
    // BLAINE — the rival. Lives in his bedroom in the rival_house.
    // Replaces the existing static BLAINE NPC at (8, 5).
    // 4 phases keyed on chains.rival.
    // ----------------------------------------------------------------
    {
      id:'blaine', name:'BLAINE', sprite:'npc_blaine', chain:'rival',
      home:{ map:'rival_house', x:3, y:4, dir:'down', replaceExisting:true },
      phases: [
        { upTo: 2, // before the route1 first battle
          first:[
            'Hmph. {name}, you hover at the door like a stray.',
            'Don\'t lose to anything embarrassing on Route 1, {name}.',
            'I\'ll be there. I\'ll be watching.'
          ],
          second:[
            'Still here?',
            'Either go train or close the door behind you.'
          ],
          third:[
            'Fine. Marvel at the bookshelf.',
            'There\'s nothing on it you can read.'
          ],
          idle:[
            ['...'],
            ['Go away.'],
            ['Are you still here.', 'Why are you still here.']
          ]
        },
        { upTo: 5, // post-route1, mid-arc battles still ahead
          first:[
            'You won one. Bigger trees ahead.',
            'I\'m not going easy at PEBBLEWOOD.',
            'See you in the leaves.'
          ],
          second:[
            'My team beats yours on a rainy day.',
            'Hopefully PEBBLEWOOD has weather.'
          ],
          third:[
            'GRAMPS keeps asking about you.',
            'I keep changing the subject.'
          ],
          idle:[
            ['Tch.'],
            ['Don\'t touch the trophies.'],
            ['I\'ll see you on the road.']
          ]
        },
        { upTo: 7, // late-game; took multiple beatings
          first:[
            'I\'ve been training all night.',
            'Don\'t take that as a compliment to you.',
            'It is.'
          ],
          second:[
            'Five badges out of seven. Tch.',
            'I would have stopped at three.'
          ],
          third:[
            'Did you actually use the SUPER POTION I gave you?',
            'Don\'t answer.'
          ],
          idle:[
            ['SEAROUTE smells weird.', 'Doesn\'t it.'],
            ['I read your dex page.','Yes, I know NICO.'],
            ['Get out, I\'m thinking.']
          ]
        },
        { upTo: Infinity, // post-finale (chains.rival === 8): retired-rival warmth
          first:[
            'You took the league.',
            'I\'m... happy for you. Don\'t tell anyone I said that.',
            'Champion.'
          ],
          second:[
            'I keep finding excuses to come back here.',
            'It\'s a good house.'
          ],
          third:[
            'GRAMPS asked if you\'d teach the new class.',
            'I told him you would. Don\'t embarrass me.'
          ],
          idle:[
            ['Quiet, isn\'t it.'],
            ['Maybe I\'ll travel.','Maybe.'],
            ['Don\'t be a stranger.']
          ]
        }
      ]
    },

    // ----------------------------------------------------------------
    // PEARL — apprentice. Lives in PROF. ROD's lab at a study desk.
    // 4 phases keyed on chains.apprentice. firstFn quotes current dex.
    // ----------------------------------------------------------------
    {
      id:'pearl', name:'PEARL', sprite:'npc_pearl', chain:'apprentice',
      home:{ map:'lab', x:4, y:5, dir:'down' },
      phases: [
        { upTo: 1,
          firstFn:(state) => [
            'Welcome to the lab, {name}! I\'m PEARL.',
            'I started a week before you, so I\'m basically your senior.',
            'Don\'t look at me like that.'
          ],
          second:[
            'PROF. ROD says we should team up sometimes.',
            'I\'m not sure he means it as advice.'
          ],
          third:[
            'I picked the third starter, by the way.',
            'It naps a lot. I love it.'
          ],
          idle:[
            ['I\'m organising the dex shelf.'],
            ['Don\'t move the books.', 'They\'re in catch-order.'],
            ['You can borrow a notebook if you want.']
          ]
        },
        { upTo: 3,
          firstFn:(state) => {
            const n = (state.dex && state.dex.caught && state.dex.caught.size) || 0;
            return [
              'Back already!',
              'Your dex is at ' + n + '. Mine\'s at ' + Math.max(0, n - 1) + '.',
              'Quietly competitive. That\'s our brand.'
            ];
          },
          second:[
            'The lab smells different when I\'m alone.',
            'I think it\'s the books getting older.'
          ],
          third:[
            'I made tea. It\'s probably cold by now.',
            'Take some.'
          ],
          idle:[
            ['Catch a budling for me.', 'Please.'],
            ['You\'re moving so fast.','I\'m glad.'],
            ['PROF. ROD asked about you again.','He always does.']
          ]
        },
        { upTo: 6,
          firstFn:(state) => {
            const n = (state.dex && state.dex.caught && state.dex.caught.size) || 0;
            return [
              'Look at you. Dex of ' + n + '.',
              'I caught up — barely. We\'re neck and neck.',
              'Do me a favour: don\'t pull ahead too fast.'
            ];
          },
          second:[
            'I\'m studying type matchups again.',
            'I should have done this at week one.'
          ],
          third:[
            'I keep my notes in this drawer.',
            'Don\'t read them.'
          ],
          idle:[
            ['One day we\'ll both be PROF.','Imagine.'],
            ['I dreamed about a Frostbloom.','It was raining inside.'],
            ['Tea\'s on the heater.', 'Help yourself.']
          ]
        },
        { upTo: Infinity,
          first:[
            'CHAMPION! In my lab!',
            'I haven\'t cleaned. I\'m sorry.',
            'Forget that — tell me everything.'
          ],
          second:[
            'I want to write a book.',
            'Working title: "I knew them when".'
          ],
          third:[
            'Take this. From my dex shelf.',
            'A pressed flower from PEBBLEWOOD.',
            'Keep it.'
          ],
          idle:[
            ['Stay as long as you want.'],
            ['I\'m still cataloguing. Forever, probably.'],
            ['Bring more stories next time.']
          ]
        }
      ]
    },

    // ----------------------------------------------------------------
    // NICO — journalist. At a press desk inside brindale_school.
    // 4 phases by chains.journalist. firstFn names your last catch.
    // ----------------------------------------------------------------
    {
      id:'nico', name:'NICO', sprite:'npc_nico', chain:'journalist',
      home:{ map:'brindale_school', x:5, y:5, dir:'down' },
      phases: [
        { upTo: 1,
          first:[
            'Roving correspondent. Always running out of paper.',
            'I started a column on new dex-keepers.',
            'You\'re my section A.'
          ],
          second:[
            'My editor wants quotes. I have ellipses.',
            'Help me out.'
          ],
          third:[
            'My pencil is dead.',
            'Why are pencils never alive when I need them.'
          ],
          idle:[
            ['Tap, tap.'],
            ['I\'m working.'],
            ['Press relations. Famously easy.']
          ]
        },
        { upTo: 3,
          firstFn:(state) => {
            const last = lastCaught(state);
            const name = last ? speciesName(last) : 'one';
            return [
              'Back from the field, eh?',
              'A ' + name + ', I see in my notes.',
              'Mind if I write you up?'
            ];
          },
          second:[
            'Ten species in a week.',
            'This is going on the front page.'
          ],
          third:[
            'My editor wants the rare ones.',
            'Bring me a wraithlet, hero.'
          ],
          idle:[
            ['Tap.', 'Tap. Tap.'],
            ['I file copy at six.','Always six.'],
            ['Don\'t touch the typewriter.']
          ]
        },
        { upTo: 5,
          firstFn:(state) => {
            const n = (state.dex && state.dex.caught && state.dex.caught.size) || 0;
            return [
              'Front page. Page two. Insert ad.',
              'Your dex is at ' + n + '. Mine\'s at three.',
              'I\'m a journalist, not a trainer.'
            ];
          },
          second:[
            'My readers want to know what you eat.',
            'I tell them ORAN BERRIES. Good?'
          ],
          third:[
            'I sketched your starter for the Sunday edition.',
            'Don\'t tell PEARL.'
          ],
          idle:[
            ['Filing, filing.'],
            ['You\'re a slow news day made gold.'],
            ['Did the rival give you a quote yet?', 'Of course not.']
          ]
        },
        { upTo: Infinity,
          first:[
            'CHAMPION column. Writing it now.',
            'The headline writes itself.',
            'Stand still — I\'m taking your photo.'
          ],
          second:[
            'I quit the daily column.',
            'I\'m writing your biography. Two volumes.'
          ],
          third:[
            'Working title: POKEROD CHAMPION.',
            'Subtitle: "How a Quiet Trainer Saved Us".',
            'Yes, I know you didn\'t save anyone. It sells better.'
          ],
          idle:[
            ['Tap. Tap. Tap.'],
            ['I keep your old dex pages.','Sentimental.'],
            ['Stay for tea?', 'It\'s NICOFFEE.', '...sorry.']
          ]
        }
      ]
    },

    // ----------------------------------------------------------------
    // MEEK — perpetual loser. Recovers in Brindale's Pokemon Center.
    // 4 phases by chains.meek.
    // ----------------------------------------------------------------
    {
      id:'meek', name:'MEEK', sprite:'npc_meek', chain:'meek',
      home:{ map:'pokecenter', x:2, y:2, dir:'right' },
      phases: [
        { upTo: 1,
          first:[
            'I — I\'m here a lot.',
            'NURSE ROSY says I should pace myself.',
            'I will. Tomorrow.'
          ],
          second:[
            'I have one Pokerod.',
            'It\'s napping. Don\'t startle it.'
          ],
          third:[
            'Sometimes I sit here and just watch the door.',
            'Trainers come in confident. Leave humbled.',
            'Comforting.'
          ],
          idle:[
            ['Hi. Again.'],
            ['Have you seen ROUTE 1?', 'I\'m headed there.'],
            ['I\'ll battle you. Eventually.']
          ]
        },
        { upTo: 3,
          first:[
            'You beat me twice now.',
            'I\'m taking notes. Hate notes.',
            'But notes.'
          ],
          second:[
            'My team is at level eight.',
            'I think.'
          ],
          third:[
            'NURSE ROSY heals my whole team in twenty seconds.',
            'I get a battle in two minutes.',
            'The math is humbling.'
          ],
          idle:[
            ['Tap, tap. (You realise that\'s his sneaker.)'],
            ['Don\'t take pity.','I prefer rage.'],
            ['Watch the door for me.','I owe you.']
          ]
        },
        { upTo: 5,
          first:[
            'I almost quit.',
            'I made a list of reasons.',
            'I tore it up.'
          ],
          second:[
            'Maybe I\'m supposed to lose.',
            'Maybe the world needs people who lose.'
          ],
          third:[
            'My grandmother lost forty-two times to her sister.',
            'They were thrilled.',
            'Generations of losing. We\'re a tradition.'
          ],
          idle:[
            ['I bought new sneakers.','See?'],
            ['You smell like a route.','I miss routes.'],
            ['I\'m here. I\'m here.']
          ]
        },
        { upTo: Infinity,
          first:[
            'I came to say goodbye.',
            'I\'m heading to the league.',
            'Not to compete. To watch.'
          ],
          second:[
            'I\'ll be in the stands.',
            'I\'ll have a flag.',
            'You.'
          ],
          third:[
            'NURSE ROSY hugged me.',
            'I cried.',
            'I\'m okay.'
          ],
          idle:[
            ['You did good.'],
            ['I did okay.'],
            ['That\'s enough.']
          ]
        }
      ]
    },

    // ----------------------------------------------------------------
    // OMA — grandparent. At her kitchen in Brindale's townhouse.
    // 4 phases by chains.oma. firstFn references party top level.
    // ----------------------------------------------------------------
    {
      id:'oma', name:'OMA', sprite:'npc_oma', chain:'oma',
      home:{ map:'townhouse', x:1, y:2, dir:'right' },
      phases: [
        { upTo: 1,
          first:[
            'Look who came through the door — {name}!',
            'Sit down, {name}. Eat something.',
            'I made too much {food}, on purpose.'
          ],
          second:[
            'Don\'t mind the OLD MAN by the porch.',
            'He hates leaving the porch.'
          ],
          third:[
            'When I was your age, my partner was a nibblet.',
            'He bit my cousin.',
            'A romance.'
          ],
          idle:[
            ['Eat a berry.'],
            ['You look tired.', 'And taller.'],
            ['Tea\'s in the kettle.', 'Always.']
          ]
        },
        { upTo: 3,
          firstFn:(state) => {
            let lv = 0; for (const p of state.party || []) if (p.level > lv) lv = p.level | 0;
            return [
              'Level ' + lv + '! In my day we walked uphill—',
              'Both ways. Through tall grass.',
              'Sit. Eat. I\'m kidding.'
            ];
          },
          second:[
            'I knit a scarf for the team.',
            'For all of them. Even the BUG ones.'
          ],
          third:[
            'When you evolve a partner, do you tell them?',
            'I think you should.',
            'They\'re proud, even when they don\'t look it.'
          ],
          idle:[
            ['Stay for soup.'],
            ['Let me see your dex.'],
            ['Don\'t forget your scarf.']
          ]
        },
        { upTo: 5,
          first:[
            'You\'re a different person every time.',
            'Bigger. Quieter.',
            'Sit. I\'ve been baking.'
          ],
          second:[
            'I used to be a ranger.',
            'In the OLD WOODS, before they were Pebblewood.',
            'I had a partner like yours. He\'s still with me.'
          ],
          third:[
            'I keep a photo book in the drawer.',
            'You\'re in chapter three now.',
            'Don\'t look. Until you\'re ready.'
          ],
          idle:[
            ['Eat. Sit. Eat.'],
            ['The OLD MAN says hello.','He doesn\'t.'],
            ['Tea?', 'Yes.', 'Always tea.']
          ]
        },
        { upTo: Infinity,
          first:[
            'My champion.',
            'You don\'t need to come visit.',
            'I\'ll always be here.'
          ],
          second:[
            'Take this recipe book.',
            'It\'s mostly soups.',
            'Some of them are good for evolved partners.'
          ],
          third:[
            'I\'m proud of you.',
            'I\'ve been proud since you walked in.',
            'Now I get to say it loud.'
          ],
          idle:[
            ['Soup\'s on.'],
            ['Rest a moment.'],
            ['You don\'t have to leave yet.']
          ]
        }
      ]
    },

    // ----------------------------------------------------------------
    // DR. KEL — economist. At his ledger desk in Crestrock workshop.
    // 4 phases by chains.economist. Quotes live totalSpent.
    // ----------------------------------------------------------------
    {
      id:'kel', name:'DR. KEL', sprite:'npc_kel', chain:'economist',
      home:{ map:'crestrock_workshop', x:4, y:5, dir:'down' },
      phases: [
        { upTo: 1,
          first:[
            'Welcome. Don\'t touch the ledger.',
            'I track regional currency velocity.',
            'You\'re a data point now.'
          ],
          second:[
            'A satisfied customer is a recurring customer.',
            'A frustrated one writes a letter.',
            'I read all of them.'
          ],
          third:[
            'See this column? Total currency in motion.',
            'See this column? You.'
          ],
          idle:[
            ['(scribbles)'],
            ['Quietly please.'],
            ['Don\'t bump the desk.']
          ]
        },
        { upTo: 2,
          firstFn:(state) => [
            'Your spend so far: ' + fmtMoney(state.flags && state.flags.totalSpent || 0) + '.',
            'Modest. Promising velocity.',
            'Keep buying potions. Carefully.'
          ],
          second:[
            'A regional MART runs on POTION sales.',
            'You are personally subsidising NURSE ROSY\'s coffee budget.'
          ],
          third:[
            'If you sell back to me you lose 50%.',
            'It\'s how stores work.',
            'Cruel, briefly.'
          ],
          idle:[
            ['(scribbles)'],
            ['Carry on.'],
            ['Mind the inkwell.']
          ]
        },
        { upTo: 4,
          firstFn:(state) => [
            'Your running total: ' + fmtMoney(state.flags && state.flags.totalSpent || 0) + '.',
            'You\'ve crossed the velocity threshold.',
            'Apply the discount card I gave you. Go.'
          ],
          second:[
            'You still buy POTIONS in singles.',
            'Buy in tens. The math improves.'
          ],
          third:[
            'I\'m writing a footnote about you.',
            'Footnote 14. Page 86.',
            'Don\'t ask to read it.'
          ],
          idle:[
            ['Velocity steady.'],
            ['Velocity rising.'],
            ['Steady.']
          ]
        },
        { upTo: Infinity,
          firstFn:(state) => [
            'Champion. Total spend: ' + fmtMoney(state.flags && state.flags.totalSpent || 0) + '.',
            'You moved an entire regional GDP through MARTS.',
            'Take this voucher. Don\'t make me invoice it.'
          ],
          second:[
            'I\'m being interviewed about your spending.',
            'It\'ll be in NICO\'s next column.',
            'I asked for editorial control. Denied.'
          ],
          third:[
            'Retiring soon.',
            'I\'ll watch the league with my ledger.',
            'I\'ll close it sometimes. To watch.'
          ],
          idle:[
            ['(scribbles, smiles slightly)'],
            ['Velocity: legend.'],
            ['Carry on.']
          ]
        }
      ]
    },

    // ----------------------------------------------------------------
    // TANK — recovery veteran. Bench in Frostmere's Pokemon Center.
    // 4 phases by chains.tank. firstFn references whiteout count.
    // ----------------------------------------------------------------
    {
      id:'tank', name:'TANK', sprite:'npc_tank', chain:'tank',
      home:{ map:'frostmere_center', x:2, y:5, dir:'right' },
      phases: [
        { upTo: 1,
          first:[
            'Hey, {name}.',
            'Sit if you need to.',
            'No questions.'
          ],
          second:[
            'I sit here on long days.',
            'NURSE PIPPA brings me cocoa.'
          ],
          third:[
            'My team is older than yours.',
            'They sleep through ice storms.',
            'Lucky them.'
          ],
          idle:[
            ['...'],
            ['Cold out there.'],
            ['Sit.']
          ]
        },
        { upTo: 2,
          firstFn:(state) => [
            'Took a beating, did you?',
            'Whiteouts: ' + ((state.flags && state.flags.whiteouts) || 0) + '.',
            'Good. Proves you tried.'
          ],
          second:[
            'There\'s a bench in every CENTER.',
            'You\'ll sit on most of them. That\'s the job.'
          ],
          third:[
            'Don\'t cry in the lobby.',
            'Wait till the BACK ROOM.',
            'I\'ve been in there twice this week.'
          ],
          idle:[
            ['Sit.'],
            ['Cocoa\'s on.'],
            ['Cold out there.']
          ]
        },
        { upTo: 3,
          first:[
            'Three down. Tougher than the second.',
            'Your face has changed.',
            'Anyway.'
          ],
          second:[
            'You should hear what champions say after a wipe.',
            'They say nothing.',
            'They eat.'
          ],
          third:[
            'I lost to a cinderpup once.',
            'Don\'t laugh.',
            'I\'m kidding. Laugh.'
          ],
          idle:[
            ['Eat.'],
            ['Sit. Eat.'],
            ['Cocoa\'s warm.']
          ]
        },
        { upTo: Infinity,
          firstFn:(state) => [
            'Six wipes. You haven\'t quit.',
            'I\'ve been counting since the second one.',
            'That\'s respect, kid.'
          ],
          second:[
            'I have a photo from my last loss.',
            'I\'ll show you sometime.',
            'Today\'s not sometime.'
          ],
          third:[
            'When you win the league, I\'ll be in the back row.',
            'I always sit in the back row.',
            'Better view of the door.'
          ],
          idle:[
            ['Sit.'],
            ['Eat.'],
            ['I\'m proud.']
          ]
        }
      ]
    },

    // ----------------------------------------------------------------
    // NIM — cave researcher. On the sand path inside glimcavern.
    // 4 phases by chains.nim. References next unvisited cave.
    // ----------------------------------------------------------------
    {
      id:'nim', name:'NIM', sprite:'npc_nim', chain:'nim',
      home:{ map:'glimcavern', x:15, y:5, dir:'down' },
      phases: [
        { upTo: 1,
          first:[
            'Don\'t startle the lichen, {name}.',
            'It thinks.',
            'Slowly. But it thinks.'
          ],
          second:[
            'I sleep in the dark for science.',
            'I miss soup.'
          ],
          third:[
            'The CAVERN BALLS catch better in the dark.',
            'I made the discovery on accident.',
            'Most discoveries are accidents.'
          ],
          idle:[
            ['Hush.','Lichen.'],
            ['(scribbles by lamp)'],
            ['Walk softly.']
          ]
        },
        { upTo: 2,
          first:[
            'Glimcavern\'s deeper floors call to you.',
            'I\'ve been mapping them in red ink.',
            'Bring a friend. Or three.'
          ],
          second:[
            'Did you know there\'s a sub-floor?',
            'I just told you. I\'m saying again. It\'s exciting.'
          ],
          third:[
            'I lost a sandwich here once.',
            'I\'m not joking.',
            'I think the lichen took it.'
          ],
          idle:[
            ['Quiet.'],
            ['Tap, tap.','(pencil on slate)'],
            ['Watch your lamp.']
          ]
        },
        { upTo: 3,
          first:[
            'You\'ve seen B1.',
            'Now find the FROSTPEAK ICE CAVE.',
            'Bring warmer socks.'
          ],
          second:[
            'Ice caves are caves with grudges.',
            'Don\'t rush them.'
          ],
          third:[
            'I have ice samples in my pack.',
            'They\'re currently puddles.',
            'Science is hard.'
          ],
          idle:[
            ['Hush.'],
            ['Lamp\'s low.'],
            ['(scribbles)']
          ]
        },
        { upTo: Infinity,
          first:[
            'Champion of caves and surface.',
            'Both kinds of darkness.',
            'I\'m honoured to share a cave with you.'
          ],
          second:[
            'I named a sub-floor after you.',
            'It\'s small. So are you. So am I.',
            'It fits.'
          ],
          third:[
            'The lichen knows your name now.',
            'Don\'t worry. It forgets fast.'
          ],
          idle:[
            ['Walk softly.'],
            ['(content scribbling)'],
            ['Welcome back.']
          ]
        }
      ]
    },

    // ----------------------------------------------------------------
    // MARLA — explorer. On the moss path through Pebblewood.
    // 4 phases by hidden-item count.
    // ----------------------------------------------------------------
    {
      id:'marla', name:'MARLA', sprite:'npc_marla',
      home:{ map:'pebblewood', x:7, y:4, dir:'down' },
      phases: [
        { upTo: 0,  // gated by encountersDone via firstFn
          firstFn:(state) => {
            const n = (state.flags && state.flags.totalHidden) || 0;
            if (n === 0) return [
              'Eyes up.',
              'Most people walk past hidden things.',
              'Be most people, or don\'t.'
            ];
            return [
              'You\'ve found ' + n + ' hidden items so far.',
              'I\'m keeping count. So is the forest.',
              'Look harder.'
            ];
          },
          second:[
            'I dig for sport.',
            'Pebblewood gives, if you ask.'
          ],
          third:[
            'My boots are older than my MAP.',
            'Both have been around the region twice.'
          ],
          idle:[
            ['Eyes up.'],
            ['Quiet steps.'],
            ['Look at the roots.']
          ]
        },
        { upTo: 5,  // hidden item count >= 5 by condition; we'll gate by phase fn
          condition:(state) => (state.flags && state.flags.totalHidden) >= 5,
          firstFn:(state) => [
            'Five hidden, eh?',
            'You\'ve learned to read the forest.',
            'Now read it harder.'
          ],
          second:[
            'I have a map you can\'t buy.',
            'Bring me ten more and I\'ll show you a corner of it.'
          ],
          third:[
            'Most explorers stop at three.',
            'Most are wrong about most things.'
          ],
          idle:[
            ['Eyes.'],
            ['Roots.'],
            ['Quiet.']
          ]
        },
        { upTo: 15,
          condition:(state) => (state.flags && state.flags.totalHidden) >= 15,
          firstFn:(state) => [
            'Fifteen.',
            'You\'ve found things even I missed.',
            'I\'ll learn from you for once.'
          ],
          second:[
            'My MAP is yours when you\'re done.',
            'Fair trade.'
          ],
          third:[
            'I dreamed of a sandbar last night.',
            'Bring me anything weird from coastal mud.'
          ],
          idle:[
            ['Carry on.'],
            ['Look behind the rock.','Always behind the rock.'],
            ['(scribbles in margin)']
          ]
        },
        { upTo: Infinity,
          condition:(state) => (state.flags && state.flags.totalHidden) >= 30,
          first:[
            'Thirty hidden. The forest is yours.',
            'I\'ll find new ones.',
            'You\'ll find them too. We\'ll race.'
          ],
          second:[
            'I never thought I\'d apprentice an explorer.',
            'Don\'t tell anyone.'
          ],
          third:[
            'You\'re officially in my MAP NOTES.',
            'Page 14. Margin sketch.'
          ],
          idle:[
            ['Race you.'],
            ['(grins)'],
            ['Ten more by sundown.']
          ]
        }
      ]
    },

    // ----------------------------------------------------------------
    // FAYE — surfer. On the beach boardwalk.
    // 4 phases — by water catch + surf use.
    // ----------------------------------------------------------------
    {
      id:'faye', name:'FAYE', sprite:'npc_faye',
      home:{ map:'beach', x:8, y:11, dir:'down' },
      phases: [
        { upTo: 0,
          condition:(state) => !dexHasType(state, 'WATER'),
          first:[
            'Hi, traveler.',
            'The tide\'s shy today.',
            'It\'ll come around.'
          ],
          second:[
            'I\'ve surfed every shore from here to RODPORT.',
            'They all taste like salt.'
          ],
          third:[
            'You don\'t have a WATER partner yet.',
            'You\'ll feel it when you do.'
          ],
          idle:[
            ['(watches the tide)'],
            ['Salt.', 'Always salt.'],
            ['Wait for it.']
          ]
        },
        { upTo: 0,
          condition:(state) => dexHasType(state, 'WATER') && !state.player.surfing && !partyHasType(state, 'WATER'),
          first:[
            'You\'ve seen one in the wild.',
            'Catching one is a feeling. Riding one is a religion.',
            'Take your time.'
          ],
          second:[
            'Tides are friends if you ask.',
            'They\'ve never told me off.'
          ],
          third:[
            'I have a board in my locker.',
            'You\'ll need a partner to use it.'
          ],
          idle:[
            ['(watches the tide)'],
            ['Salt and patience.'],
            ['Soon.']
          ]
        },
        { upTo: 0,
          condition:(state) => partyHasType(state, 'WATER') && !((state.flags && state.flags.surfedOnce)),
          first:[
            'You have a WATER partner!',
            'Press B at the water\'s edge.',
            'They\'ll know what to do.'
          ],
          second:[
            'I learned by falling off twice.',
            'Don\'t skip the falling part.'
          ],
          third:[
            'Sandbar opens up after low tide.',
            'There\'s a lighthouse out there. Visit.'
          ],
          idle:[
            ['Press B.'],
            ['Trust the partner.'],
            ['(grins)']
          ]
        },
        { upTo: Infinity,
          first:[
            'Surfer.',
            'You feel different now, don\'t you?',
            'Welcome.'
          ],
          second:[
            'I was a champion once.',
            'On a different sea.',
            'Don\'t ask which.'
          ],
          third:[
            'Take the long way home.',
            'Always.'
          ],
          idle:[
            ['(watches the tide, smiling)'],
            ['Salt and victories.'],
            ['Stay a while.']
          ]
        }
      ]
    },

    // ----------------------------------------------------------------
    // WRYN — dragon sage. On a high rocky path of the mountain.
    // 4 phases — by chains.rival progress + dragon catch.
    // ----------------------------------------------------------------
    {
      id:'wryn', name:'WRYN', sprite:'npc_wryn',
      home:{ map:'mountain', x:15, y:7, dir:'down' },
      phases: [
        { upTo: 0,
          condition:(state) => !dexHasType(state, 'DRAGON'),
          first:[
            'The wind speaks, {name}.',
            'It says you walked far for this view.',
            'It also shows me {animal}-shaped clouds. You picked well.'
          ],
          second:[
            'Dragons sleep in high quiet places.',
            'You haven\'t found one yet.'
          ],
          third:[
            'There is a draekit who watches the climbers.',
            'It is shyer than the wind.'
          ],
          idle:[
            ['(stares at the horizon)'],
            ['Wind.'],
            ['Patience.']
          ]
        },
        { upTo: 0,
          condition:(state) => dexHasType(state, 'DRAGON') && !((state.flags && state.flags.wrynBlessed)),
          first:[
            'You have met a dragon.',
            'I felt it from here.',
            'Bow when you next see one.'
          ],
          second:[
            'Take this charm.',
            'It is small. Like the wind near a draekit.',
            'It will warm in the right hand.'
          ],
          third:[
            'I once climbed this mountain three times.',
            'I forgot why on the second.',
            'I remembered on the third.'
          ],
          idle:[
            ['(closes eyes)'],
            ['Wind. Always wind.'],
            ['Listen.']
          ]
        },
        { upTo: 0,
          condition:(state) => state.flags && (state.flags.chains || {}).rival >= 5,
          first:[
            'You climbed past your shadow on the summit.',
            'Few do.',
            'You may keep coming back, if you wish.'
          ],
          second:[
            'The rival was here before you.',
            'He stared at the wind. He left angry.',
            'You stare differently.'
          ],
          third:[
            'A pebble fell from the cliff yesterday.',
            'It thought of you.',
            'I am told this is unusual.'
          ],
          idle:[
            ['(smiles slightly)'],
            ['Wind, wind.'],
            ['Carry on.']
          ]
        },
        { upTo: Infinity,
          condition:(state) => state.flags && (state.flags.chains || {}).rival >= 8,
          first:[
            'Champion.',
            'The mountain knows.',
            'It hummed all yesterday.'
          ],
          second:[
            'You may sleep here.',
            'The wind asks for nothing.'
          ],
          third:[
            'I will move on someday.',
            'Not today.'
          ],
          idle:[
            ['(content silence)'],
            ['Wind.'],
            ['Welcome.']
          ]
        }
      ]
    },

    // ----------------------------------------------------------------
    // AKIRA — league recruiter. Outdoor in Summitvale.
    // 4 phases by badge count.
    // ----------------------------------------------------------------
    {
      id:'akira', name:'AKIRA', sprite:'npc_akira',
      home:{ map:'summitvale', x:22, y:18, dir:'down' },
      phases: [
        { upTo: 0,
          condition:(state) => ((state.player && state.player.badges) || []).length < 4,
          first:[
            'AKIRA. League recruiter. {name}, right?',
            'I watch trainers. I take notes.',
            'You have my attention.'
          ],
          second:[
            'Get me four badges.',
            'Then we\'ll have a real conversation.'
          ],
          third:[
            'My ledger keeps your record.',
            'It\'s blank-ish.',
            'Fix that.'
          ],
          idle:[
            ['(taps ledger)'],
            ['Train.'],
            ['Walk well.']
          ]
        },
        { upTo: 0,
          condition:(state) => {
            const b = ((state.player && state.player.badges) || []).length;
            return b >= 4 && b < 6;
          },
          firstFn:(state) => {
            const b = ((state.player && state.player.badges) || []).length;
            return [
              b + ' badges. Sturdy.',
              'You\'re in my notes now.',
              'Page 47, line 9.'
            ];
          },
          second:[
            'Six badges. That\'s when I start to ask names.',
            'I already know yours.'
          ],
          third:[
            'You\'ll meet other recruiters.',
            'They\'re not as nice.',
            'Don\'t sign anything yet.'
          ],
          idle:[
            ['(taps ledger)'],
            ['Carry on.'],
            ['Train hard.']
          ]
        },
        { upTo: 0,
          condition:(state) => {
            const b = ((state.player && state.player.badges) || []).length;
            return b >= 6 && b < 8;
          },
          firstFn:(state) => {
            const b = ((state.player && state.player.badges) || []).length;
            return [
              b + ' badges. Real territory now.',
              'I have a contract drafted.',
              'Sign nothing else.'
            ];
          },
          second:[
            'The league sends a town crier when a champion arrives.',
            'I\'ll be there. Ahead of him.'
          ],
          third:[
            'Last year a trainer quit at seven badges.',
            'I still can\'t look at the eighth gym without flinching.'
          ],
          idle:[
            ['(taps ledger)'],
            ['Almost.'],
            ['Train.']
          ]
        },
        { upTo: Infinity,
          condition:(state) => ((state.player && state.player.badges) || []).length >= 8,
          first:[
            'Eight.',
            'Champion-track.',
            'Get to the gates. I\'ll go ahead.'
          ],
          second:[
            'I\'ve already informed the LEAGUE.',
            'They\'re excited. Quietly.',
            'Excitement at the LEAGUE is always quiet.'
          ],
          third:[
            'Don\'t lose. We have a flag with your name on it.',
            'It\'s in a closet right now.',
            'Don\'t make us put it back.'
          ],
          idle:[
            ['(taps ledger)'],
            ['Move.'],
            ['I\'ll see you there.']
          ]
        }
      ]
    }
  ];

  window.PR_STORY_ENCOUNTERS = { ENCOUNTERS, STORY_CHARACTERS };
})();
