# PokeRod

A creature-collecting RPG that plays in the browser on desktop and mobile.
Inspired by classic handheld monster-catching games, with all-original
creatures, world, art, and music slots. No copyrighted assets.

## Play

Open `index.html` in any modern browser, or serve the folder with any
static server:

```
python3 -m http.server 8000
# then visit http://localhost:8000
```

On mobile, the on-screen D-pad and A/B buttons appear automatically.

## Controls

- Arrows / WASD: move
- Z: A button (talk, confirm)
- X: B button (cancel, back)
- Enter: Start (open menu)

## Features

- Tile-based overworld with smooth movement and a follow camera
- Larger city hubs, side caves, and a looped route network from Rodport to Desert,
  with interiors for labs, homes, local buildings, every PokeRod Center, and every Mart
- Turn-based battles with an 18-type chart, STAB, crits, and accuracy
- Status effects (burn, poison, paralysis), stat stages, and priority moves
- Party of up to 6, level-up stat gains, move learning, and evolutions
- Wild encounters scaled by zone and trainer battles on every route
- Catch wild creatures with Rod, Great, Quick, Cavern, and Ultra Balls
- Heal at the PokeRod Center, save/load to localStorage
- Mobile touch controls and a handheld console skin (desktop and portrait)
- Five switchable full-atlas graphics styles: GB Red, GB Pocket,
  GBC Yellow, GBA FireRed, and DS Diamond inspired original
  PokeRod art (with era-toned UI overlays on the monochrome eras)
- Ambient wildlife - chickens, ducks, swans, sparrows and crows
  pace, paddle, perch and fly on every outdoor map
- 77 original creatures with procedural pixel-art sprites
- Procedural Web Audio music and SFX, no audio files shipped

## World

```
             rodport
          /           \
  desert hub      route1 + hollow
        |              |
   summitvale      brindale
        |              |
    searoute        route2
   + tide cave        |
        |              |
   harborside      woodfall
     /     \          |
  beach  frostpeak pebblewood + cavern
          |   |      |
    ice cave  frostmere - glimcavern - crestrock - highspire
                         \             /
                       cavern B1   mountain paths
```

## Project layout

```
index.html              Main page, mounts canvas and touch overlay
styles.css              Layout, mobile controls, responsive scaling
js/data.js              Types, moves, creatures, damage formulas
js/maps.js              Tile maps, NPCs, doors, signs, encounters
js/atlas.js             Tile / sprite atlas loader, era preset switching
js/sprites.js           Tile rendering
js/sprites_chars.js     Player and NPC sprites (4 directions, 2-frame walk)
js/sprites_mons.js      Procedural creature sprites
js/sprites_variation.js Per-creature shiny / colour-variant overlays
js/input.js             Keyboard + touch input
js/ui.js                Pixel font, dialog box, HP / XP bars
js/npc_chatter.js       Rotating banter pools for static NPC archetypes
js/chatter.js           Rotating creature chatter pools
js/world.js             Overworld state: movement, NPCs, weather, transitions
js/bottom_screen.js     DS Diamond bottom-canvas (minimap, party, battle moves)
js/battle.js            Turn-based battle state and rendering
js/move_effects.js      Per-type and per-move VFX (incl. tornado funnel)
js/items.js             Bag, shop tiers, item effects
js/quests.js            Quest assignment and turn-in
js/shop.js              Shop UI
js/story_encounters.js  Cutscene scripts for story characters
js/story.js             Story home characters, phased dialog, flag tracking
js/audio.js             Web Audio init + master gain
js/audio_sfx.js         Procedural SFX (no audio files shipped)
js/audio_music.js       Procedural music
js/save.js              localStorage save/load
js/game.js              State machine, title, main loop, settings, profile
tools/validate-progression.js  Stat/level/move-learning/evolution validator
tools/validate-type-chart.js   Offensive type-chart validator (18 types)
tools/validate-maps.js         Map shape, transitions, NPC placement
tools/validate-atlases.js      Atlas tile-code consistency
tools/validate-story.js        Story encounter + home character schema
tools/validate-quests.js       Quest giver / reward / turn-in validator
tools/validate-weather.js      Weather preset name validator
tools/smoke-test.js            Puppeteer end-to-end render check
```

## Notes

This project ships no third-party assets. Visual assets are generated from
JavaScript canvas art into four atlas families such as `assets/atlas.png`,
`assets/atlas-gb-red.png`, and matching JSON metadata; no external fonts,
images, or audio are loaded.

See `BACKLOG.md` for the prioritised feature backlog.
