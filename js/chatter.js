// Per-species chatter lines used when the player talks to a wandering
// creature in town. Lines are short flavour text or a cute cry, picked
// randomly. Falls back to a generic line for any species missing here.
'use strict';

(function(){
  const CHATTER = {
    // Starters and their lines.
    emberkit: [
      "*Emberkit's tail-flame brightens a touch.*",
      "Em-em! *sniffs your hand for snacks*",
      "*A puff of warm smoke curls from its nose.*"
    ],
    flarebound: [
      "*Flarebound paces in a tight, hot circle.*",
      "Vrrr-haaah! *the air around it wavers*",
      "*It dips its head, accepting a pat.*"
    ],
    infernarok: [
      "*Infernarok lowers its great brow in greeting.*",
      "Krrhhh-aam.",
      "*Its beard crackles with embers as it nods.*"
    ],
    aquapup: [
      "Bork! *a tiny splash from its shell*",
      "*Aquapup tilts its head, water sloshing softly.*",
      "Aq-pup! Pup!"
    ],
    tideturtle: [
      "*Tideturtle hums a low, steady note.*",
      "Tiii-deee.",
      "*Cool droplets bead along the edge of its shell.*"
    ],
    maelstroth: [
      "*Maelstroth rumbles like a distant tide.*",
      "Mwooorrgh.",
      "*Its weathered beard drips with brine.*"
    ],
    sproutling: [
      "Sprout! *the bud on its head wiggles*",
      "*Sproutling brushes a leaf against your boot.*",
      "Spr-spr-sprout!"
    ],
    leafurge: [
      "*Leafurge spreads a vine in a friendly wave.*",
      "Leee-fff. Leee-fff.",
      "*A drift of pollen drifts past as it sighs happily.*"
    ],
    verdantsage: [
      "*Verdantsage closes its eyes for a long moment.*",
      "Mmm. Mmmrrr.",
      "*Its mossy beard rustles in a wind only it can feel.*"
    ],

    // Common town wildlife.
    nibblet: [
      "Nib! Nib-nib!",
      "*Nibblet darts forward, then hides behind your leg.*",
      "*It scrubs its whiskers vigorously.*"
    ],
    flitwing: [
      "*Flitwing hops twice, then preens a wing.*",
      "Flit! Flit-flit!",
      "*A single feather drifts down between you.*"
    ],
    glimkit: [
      "*Glimkit's tail glints like polished metal.*",
      "Gliiim... kit?",
      "*It rolls on its back for belly scratches.*"
    ],
    crawlbug: [
      "Crrr-aw! Crrr-aw!",
      "*Crawlbug nibbles a stray leaf with great focus.*",
      "*Its segments ripple in a tiny wave.*"
    ],
    cavewing: [
      "*Cavewing folds its wings around itself.*",
      "Eep! Eep!",
      "*Two big eyes blink at you from the shade.*"
    ],
    splashfin: [
      "*Splashfin splashes at nothing in particular.*",
      "Splaaash.",
      "*It flops once, with great enthusiasm.*"
    ],
    pebra: [
      "*Pebra clinks a small pebble in greeting.*",
      "Pe-brr.",
      "*Its stony beard rasps as it nods.*"
    ],
    boulderon: [
      "*Boulderon settles deeper into the ground.*",
      "GRMMM.",
      "*Pebbles patter loose from its mossy shoulders.*"
    ],
    geistmite: [
      "*Geistmite slips half into a shadow, then back out.*",
      "Heh. Heh-hee.",
      "*Its red eyes glint with mild mischief.*"
    ],
    shadefox: [
      "*Shadefox circles you once, silent as dusk.*",
      "Shhhf.",
      "*It vanishes - no, it sat down behind you.*"
    ],
    voltkit: [
      "Volt! *static crackles between its ears*",
      "*Voltkit's fur stands on end for a half-second.*",
      "Vvvk-kit!"
    ],
    voltlynx: [
      "*Voltlynx prowls with electric grace.*",
      "Vvvrrrnnn.",
      "*Sparks roll along its spine and fade.*"
    ],
    bumblesting: [
      "Bzz-zz!",
      "*Bumblesting hovers, then bumps your shoulder.*",
      "*Its stinger waggles in mock menace.*"
    ],
    frostpup: [
      "*Frostpup leaves a frosty paw-print on your boot.*",
      "Yip! *a puff of cold breath*",
      "*It rolls in a snow patch only it can see.*"
    ],
    snowox: [
      "*Snowox snorts a cloud of crystal mist.*",
      "Hoooomf.",
      "*Its breath gathers into delicate snowflakes.*"
    ],
    crysthorn: [
      "*Crysthorn chimes faintly when you lean close.*",
      "Tinnnk.",
      "*Its facets scatter tiny rainbows across the path.*"
    ],
    mistfin: [
      "*Mistfin trails a curl of cool fog as it swims by.*",
      "Mist... mist...",
      "*Its scales shimmer like lake-water at dawn.*"
    ],
    tidalwhal: [
      "*Tidalwhal's low boom rolls through the dock boards.*",
      "Wooommm.",
      "*A ring of mist puffs from its blowhole.*"
    ],
    fernsprout: [
      "*Fernsprout taps a vine in a four-beat rhythm.*",
      "Fer-fern!",
      "*Tiny petals drift down as it shakes its head.*"
    ],
    bramblewood: [
      "*Bramblewood lowers its thorny crown.*",
      "Brrm. Brrm.",
      "*Sap glistens at the tip of its beard.*"
    ],
    galewing: [
      "*Galewing stretches both wings - the air gusts past.*",
      "Whe-whheeen.",
      "*It lands, blinks, and ruffles its feathers.*"
    ],
    solarwing: [
      "*Solarwing spreads a wing and the day feels brighter.*",
      "Saaa-laar.",
      "*A faint ember falls and winks out before it lands.*"
    ],
    zapret: [
      "Zap! Zap!",
      "*Zapret's whiskers twitch with static.*",
      "*A tiny shock prickles your fingertip.*"
    ],
    boltbeard: [
      "*Boltbeard rumbles, beard crackling with charge.*",
      "Bzzrrrr-d.",
      "*Static dances along its red beard.*"
    ],
    pyrohound: [
      "*Pyrohound bows its head, embers raining from its mane.*",
      "Wrrf-haaa.",
      "*Heat shimmers around its paws.*"
    ],
    magmaron: [
      "*Magmaron's footsteps leave faint scorch marks.*",
      "GROOOOM.",
      "*Its lava-flecked beard glows gently.*"
    ],
    stormfangis: [
      "*Stormfangis thunders softly in greeting.*",
      "Krrrk-aaak!",
      "*Its mane stands on end and crackles.*"
    ],
    stoneworm: [
      "*Stoneworm burrows up, then back down, then up.*",
      "Stnnn?",
      "*It nudges a pebble toward you as a gift.*"
    ],
    quakeworm: [
      "*Quakeworm rumbles - a faint tremor underfoot.*",
      "Quaaaake.",
      "*Its segments ripple like tectonic plates.*"
    ],
    tectonarch: [
      "*Tectonarch's beard shakes loose a small rockslide.*",
      "Tek-toonn.",
      "*The earth steadies beneath you when it nods.*"
    ],
    hivequeen: [
      "*Hivequeen circles you once, regally.*",
      "Bzz-bzzz.",
      "*Three tiny drones bow alongside her.*"
    ],
    royalwasp: [
      "*Royalwasp hovers majestically, beard trailing pollen.*",
      "Hzzzs-bzzz.",
      "*Its court of bumblestings hums in unison.*"
    ],
    skylordan: [
      "*Skylordan tips a wing in a courtly salute.*",
      "Caw-caw!",
      "*Its plumed beard lifts in a brief wind.*"
    ],
    tempestir: [
      "*Tempestir's eyes flash like distant lightning.*",
      "Whirrr-shaaa.",
      "*Wind curls around your ankles for a heartbeat.*"
    ],
    solarcrest: [
      "*Solarcrest spreads its wings, golden light pouring out.*",
      "Saaaaan.",
      "*Warm air rolls past you in a gentle wave.*"
    ],
    glacioxen: [
      "*Glacioxen lowers its frosted horns in greeting.*",
      "Mmmrrrooo.",
      "*Snow patters down from its shaggy beard.*"
    ],
    levifin: [
      "*Levifin's eyes glint with unsettling intelligence.*",
      "Hsssss.",
      "*Tiny waves slap against the dock from nowhere.*"
    ],
    whiskaroth: [
      "*Whiskaroth's whiskers twitch in eight directions.*",
      "Whisk! Whisk!",
      "*It eyes your pockets meaningfully.*"
    ],
    lustrofox: [
      "*Lustrofox's gleaming fur reflects all of you.*",
      "Lus-tro.",
      "*Its tail plumes lift in slow, hypnotic waves.*"
    ],
    prismage: [
      "*Prismage refracts the sun into seven thin rainbows.*",
      "Hummmmm.",
      "*A whisper of psychic warmth brushes your mind.*"
    ],
    umbrasire: [
      "*Umbrasire dips its head, beard fading into shadow.*",
      "Hsssh.",
      "*The light dims a half-shade and brightens again.*"
    ],
    reverieus: [
      "*Reverieus's petals open, releasing soft starlight.*",
      "Mmmaaa-haa.",
      "*A warm dream-thought briefly crosses your mind.*"
    ],
    mothmane: [
      "*Mothmane's furry beard sheds a drift of pollen.*",
      "Fwwfff-fwff.",
      "*It bumps gently into a lantern that isn't there.*"
    ],
    dreamilly: [
      "*Dreamilly hums a tune you almost recognise.*",
      "La la la-aaa.",
      "*Petals drift up instead of down around it.*"
    ],
    cinderpup: [
      "*Cinderpup's tail-tip flickers with a brave little flame.*",
      "Yip! Yip!",
      "*It tries to bury an ember and looks confused.*"
    ],
    vampirothy: [
      "*Vampirothy hangs upside down, beard dangling proudly.*",
      "Eeep-eep!",
      "*It folds and unfolds its wings in slow approval.*"
    ]
  };

  function chatterFor(speciesId) {
    const lines = CHATTER[speciesId];
    if (lines && lines.length) {
      return lines[Math.floor(Math.random() * lines.length)];
    }
    const sp = window.PR_DATA && window.PR_DATA.CREATURES[speciesId];
    const name = (sp && sp.name) || 'It';
    const FALLBACKS = [
      '*' + name + ' watches you curiously.*',
      '*' + name + ' tilts its head and chirps.*',
      '*' + name + ' nudges your boot, then trots off.*'
    ];
    return FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
  }

  window.PR_CHATTER = { CHATTER, chatterFor };
})();
