// Rotating chatter pools for static map NPCs.
//
// Plain villagers, kids, joggers, etc. used to say one or two scripted
// lines on every press of A — the rotation felt empty. Each archetype
// below ships with 12 generic-but-mood-matching lines; at interaction
// time game.js merges the archetype pool with the NPC's existing
// per-character `dialog` array (kept in maps.js for personality) and
// picks one at random. Result: 13-15 unique lines rotating per NPC.
//
// Trainers / shopkeepers / nurses-as-healers / starter slots / gates /
// story home characters are unaffected — their interaction branches in
// handleNpcInteract `return` before the rotation fallback runs.
'use strict';

(function(){

  const ARCHETYPES = {
    // Bouncy, playground-talk, easy enthusiasm.
    kid: [
      'I bet I could climb that tree!',
      'My favorite POKEROD is the LOUDEST one.',
      'Mom says I have to be home before the lamps come on.',
      'Wanna race? I always lose. But wanna race?',
      'I made a fort out of GRASS tiles. The grass got mad.',
      'Have you been to the SUMMIT? I dreamed I was there.',
      'I caught a NIBBLET! ...In a drawing.',
      'My friend has SIX badges. I have six STICKERS.',
      'I traded my brother my last ORAN BERRY for a rock.',
      'When I grow up I want a PARTY of just NIBBLETS.',
      'You smell like OUTSIDE. I love outside.',
      'I lost a tooth. It was already loose.'
    ],

    // Backward-looking, wry, slow-paced. Reminiscence + wisdom.
    elder: [
      'In my day, BALLS came in one colour, and we LIKED it.',
      'You walk fast. The world is wide. You will see.',
      'My grandkid sent a postcard from SEAROUTE. Smelled of salt.',
      'I caught my first POKEROD with a fishing pole.',
      'Don\'t skip the small towns. The small towns remember.',
      'I have a knee that knows the weather. Today: rain.',
      'There\'s a story in every battle scar. Even the ugly ones.',
      'Pull up a chair. ...Oh. Pull up a tile, then.',
      'Be kinder than yesterday. Stronger than next year.',
      'When my partner evolved, I cried. Don\'t tell my kids.',
      'They renamed the path twice in my lifetime. I still call it OLD WAY.',
      'You have your whole journey. Don\'t rush it.'
    ],

    // Catch-all small-talk neutral. Used for npc_youth + npc_girl
    // (the most populous sprites — needs broad voice).
    townie: [
      'Heard the gym leader\'s been training overtime.',
      'Have you tried the ROD CENTER\'s new healing chime? It\'s nice.',
      'Did you see the cloud over CRESTROCK? It looked like a SNOWOX.',
      'Watch out on ROUTE 1. The BUMBLESTINGS are extra cranky.',
      'Did you hear? The MART is out of GREAT BALLS again.',
      'I\'m walking my route to clear my head.',
      'I keep meaning to start a dex. Tomorrow, definitely.',
      'They say a CHAMPION came through here last winter.',
      'My cousin runs a stall in HARBORSIDE. Try the boiled berries.',
      'I waved at a wild GLIMKIT this morning. It waved back. I think.',
      'My team is mostly normal types. We get along.',
      'New season, new dex, new bruises.'
    ],

    // Warm, protective, family-flavoured. mom + sis.
    mom: [
      'Have you eaten? You don\'t look like you\'ve eaten.',
      'Walk safe. Heal often. Don\'t skip dinner.',
      'I packed an extra ORAN BERRY. Don\'t argue.',
      'Your SHIRT is on backwards, dear.',
      'When I was your age, I named my SPLASHFIN \'NOODLE\'. He hated it.',
      'You looked tall today. ...Did you just look tall today?',
      'Bring back something nice. A flower. A rock. A friend.',
      'My pantry is your pantry. Never starve in MY town.',
      'Stand up straight. Even at the gym leader.',
      'Be brave. Be careful. Both at once if you can.',
      'I keep a SPARE POTION in the cupboard. You know where.',
      'I love you. ...Sorry, instinct. I love anyone who looks tired.'
    ],

    // Food / kitchen / craft. Chef, baker, waiter.
    kitchen: [
      'I burned the bread. Twice. Don\'t tell BAKER OWEN.',
      'Try the soup. We\'ve perfected the recipe — this week.',
      'A pinch of SITRUS in the broth. Trust me.',
      'My oven hates me. It\'s a long story.',
      'I once cooked for a CHAMPION. They asked for ketchup.',
      'I\'m on break. Don\'t tell my boss. They\'re on break too.',
      'I\'ll be the first chef to put ORAN BERRIES in dessert.',
      'The trick to a good loaf is patience. I have none.',
      'A good meal heals a tired team almost as well as a CENTER.',
      'I dropped a tray once. Once.',
      'Hot pans, cold drinks. Watch the floor.',
      'My specialty is... well, eating my own specialty.'
    ],

    // Office / clerical / clipboard. Clerks, businesspeople, doctors,
    // paramedics, scientists, teachers, librarians, saleswomen.
    collared: [
      'I\'m seven minutes late for my own meeting.',
      'I have a pen for everything. Even a pen for finding pens.',
      'The numbers don\'t lie. The numbers also don\'t shut up.',
      'Did you fill out the form? There\'s a form for that.',
      'I keep a spreadsheet of my POKEROD\'s mood. It\'s thriving.',
      'My boss told me to \'lean in\'. I leaned out a window.',
      'I take a sip of coffee every twelve seconds. Don\'t fact-check me.',
      'Today\'s agenda: agenda.',
      'I left my meeting to come outside. Please don\'t tell.',
      'I\'m writing a paper on civic NPC happiness. Very meta.',
      'The MART\'s receipt printer ate my expense report again.',
      'You have a strong handshake. ...You didn\'t shake my hand.'
    ],

    // Arty, observational, sometimes pretentious. Artists, journalists,
    // dancers, dog walkers (read: the cool quirky ones).
    artisan: [
      'The light at this hour ruins my sketches. It\'s perfect.',
      'I\'m painting the wind. It\'s going about as well as you\'d expect.',
      'A POKEROD\'s eye holds the whole sky, if you look long enough.',
      'I write under three different pen names. None of them are me.',
      'I came outside for inspiration. The grass said hi.',
      'I sang to my BREEZLET this morning. It sang BACK.',
      'Critics say my latest piece is "moist." That\'s fine.',
      'Every artist has a phase. Mine is "stay inside."',
      'I sketch trainers I see on routes. You\'re in book three.',
      'Form is fleeting; the ROAD is forever.',
      'I dance better when no one\'s looking. So please look away.',
      'Meaning lives in the margins. So do crumbs.'
    ],

    // Hands-on, blunt, hardworking. Construction, firefighter,
    // security, police.
    labor: [
      'Be careful where you step. We just laid that.',
      'Lunchtime ended an hour ago. So did my motivation.',
      'I broke a hammer this morning. Felt great. Was expensive.',
      'You see this brick? I laid it. With my hands. I\'m proud.',
      'Watch your head. The world\'s full of low beams.',
      'I work nights. The lamps and I get along.',
      'A good worker has a good thermos. Mine is OLD.',
      'I poured this path while you were eating breakfast.',
      'My back has opinions. Loud ones.',
      'Tools, then knees, then back, then bed.',
      'I once built a wall around a bird\'s nest. It moved out anyway.',
      'Show up. Do the work. Stand still later.'
    ],

    // Outdoorsy, weather/exercise. Hikers, joggers, cyclists,
    // rollerbladers, swimmers.
    outdoor: [
      'Three more laps and I\'m done. Probably.',
      'Watch your step. The path is slicker than it looks.',
      'I lost a sock on this hill. RIP.',
      'The wind\'s with me today. Let me enjoy it.',
      'I haven\'t taken a rest day this season. My doctor disapproves.',
      'My PARTNER is faster than me. I let it win.',
      'There\'s a hidden bench up the next rise. Take it.',
      'I run for the views. Mostly the views run from me.',
      'Sweat is just exercise crying.',
      'I\'ll race you. Loser buys lunch. Lunch is BERRIES.',
      'A trainer who never gets winded never gets anywhere.',
      'I\'m training for nothing in particular. It\'s freeing.'
    ],

    // Oddball, deadpan, weird. Punks, tourists.
    eccentric: [
      'I haven\'t blinked in 14 minutes. Don\'t ask why.',
      'My wallet is full of receipts and a single, wet leaf.',
      'I think the OLD ROD is actually a young rod.',
      'Do you ever tilt? Like, on purpose?',
      'I\'m collecting all the weird signs. Don\'t tell the city.',
      'I\'m on vacation. From what? Wouldn\'t you like to know.',
      'I\'m the loudest person in this town. Voted on it.',
      'I tried to befriend a wild WRAITHLET. It declined politely.',
      'The way I see it, every road is a hallway.',
      'I hum CHAMPION theme music when I walk. Yes that one.',
      'I once won a staring contest with a NIBBLET. It cried.',
      'I have a normal-sized hat at home. This is the FUN one.'
    ],

    // Caring, clinical, soft. Nurse archetype (only when nurse is not
    // currently in the heal flow — handleNpcInteract\'s healer branch
    // returns before us).
    nurse: [
      'Your team looks tired. Mine too.',
      'A long career on my feet, but I wouldn\'t trade it.',
      'Bring your team in. We\'ll patch them up.',
      'I make a strong tea. The doctor says I make TOO strong a tea.',
      'I have stories about every trainer who passes through.',
      'Some nights I just listen to the heal chime. It\'s nice.',
      'Don\'t push past a faint. Promise me.',
      'I keep little stickers for the kids. Don\'t tell.',
      'I once revived a CRAGLET. It bit me. Worth it.',
      'Heal yourself, too. Not just the team.',
      'I can spot a tired trainer from across the lobby.',
      'Be gentle with each other out there.'
    ],

    // Lab-flavoured, curious, slightly nerdy. Used for npc_oak when not
    // running starter selection.
    professor: [
      'Did you know SHADEFOX has a dewclaw? Most people don\'t.',
      'Every dex page is a small biography.',
      'I\'m studying how POKEROD react to humming. Don\'t hum at them.',
      'My grandkid said something WISE today. I wrote it down.',
      'A clipboard is a research tool. So is a window.',
      'The lab smells like ozone today. That\'s not normal.',
      'Bring me back a PAGE someday. Of anything.',
      'Type matchups are suggestions. Friendships are facts.',
      'I can talk about DRAEKIT for six straight hours. Don\'t test me.',
      'Long ago I picked the wrong starter. I\'m fine. Mostly.',
      'I keep tea in a flask labelled \'NOT TEA.\' Throws off thieves.',
      'You might be the trainer this region has been waiting for.'
    ],

    // Special: NPCs that genuinely want a single fixed line (sign-NPCs,
    // tutorial helpers). pickLine bypasses the rotation when archetype
    // is 'fixed'. Empty pool here keeps the helper from accidentally
    // pulling in stray banter; the NPC's own dialog is the only source.
    fixed: []
  };

  // Sprite key -> archetype id. Anything not in this map (or that has
  // no `npc.archetype` override) falls back to 'townie'.
  const SPRITE_TO_ARCHETYPE = {
    npc_kid_boy:'kid', npc_kid_girl:'kid',
    npc_old:'elder', npc_old_man_alt:'elder', npc_old_woman:'elder',
    npc_youth:'townie', npc_girl:'townie',
    npc_mom:'mom', npc_sis:'mom',
    npc_chef:'kitchen', npc_baker:'kitchen', npc_waiter:'kitchen',
    clerk:'collared', npc_businessman:'collared', npc_doctor:'collared',
    npc_paramedic:'collared', npc_scientist:'collared',
    npc_teacher:'collared', npc_librarian:'collared', npc_saleswoman:'collared',
    npc_artist:'artisan', npc_journalist:'artisan',
    npc_dancer:'artisan', npc_dog_walker:'artisan',
    npc_construction:'labor', npc_firefighter:'labor',
    npc_security:'labor', npc_policeman:'labor',
    npc_hiker_alt:'outdoor', npc_jogger:'outdoor', npc_cyclist:'outdoor',
    npc_rollerblader:'outdoor',
    npc_swimmer_m:'outdoor', npc_swimmer_f:'outdoor',
    npc_punk:'eccentric', npc_tourist:'eccentric',
    nurse:'nurse',
    npc_oak:'professor'
  };

  // Build the rotation pool for an NPC and pick one line at random.
  // The merged pool is `archetype lines + npc.dialog`, so the NPC's
  // hand-written specific lines surface alongside generic banter — at
  // 1/13 to 1/15 odds per press, which keeps personality readable.
  function pickLine(npc) {
    if (!npc) return '...';
    const archetype = npc.archetype ||
      SPRITE_TO_ARCHETYPE[npc.sprite] || 'townie';
    if (archetype === 'fixed') {
      return (Array.isArray(npc.dialog) && npc.dialog[0]) || '...';
    }
    const pool = (ARCHETYPES[archetype] || ARCHETYPES.townie).slice();
    if (Array.isArray(npc.dialog)) {
      for (const l of npc.dialog) if (typeof l === 'string' && l) pool.push(l);
    }
    if (!pool.length) return '...';
    return pool[Math.floor(Math.random() * pool.length)];
  }

  window.PR_NPC_CHATTER = {
    ARCHETYPES, SPRITE_TO_ARCHETYPE, pickLine
  };
})();
