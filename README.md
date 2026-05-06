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
- Turn-based battles with a 13-type chart, STAB, crits, and accuracy
- Status effects (burn, poison, paralysis), stat stages, and priority moves
- Party of up to 6, level-up stat gains, move learning, and evolutions
- Wild encounters scaled by zone and trainer battles on every route
- Catch wild creatures with Rod, Great, Quick, Cavern, and Ultra Balls
- Heal at the PokeRod Center, save/load to localStorage
- Mobile touch controls and a handheld console skin (desktop and portrait)
- Original GBA-era-inspired overworld tiles with contextual roof, path, grass,
  water, sign, and city decor variants
- 57 original creatures with procedural pixel-art sprites
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
index.html          Main page, mounts canvas and touch overlay
styles.css          Layout, mobile controls, responsive scaling
js/data.js          Types, moves, creatures, damage formulas
js/maps.js          Tile maps, NPCs, doors, signs, encounters
js/sprites.js       Tile rendering
js/sprites_chars.js Player and NPC sprites (4 directions, 2-frame walk)
js/sprites_mons.js  Procedural creature sprites
js/input.js         Keyboard + touch input
js/ui.js            Pixel font, dialog box, HP / XP bars
js/world.js         Overworld state: movement, NPCs, transitions
js/battle.js        Turn-based battle state and rendering
js/save.js          localStorage save/load
js/game.js          State machine, title screen, main loop
tools/validate-maps.js  Map shape and transition validator
```

## Notes

This project ships no third-party assets. Visual assets are generated from
JavaScript canvas art into `assets/atlas.png`, `assets/atlas.json`, and
`assets/sprites/*.png`; no external fonts, images, or audio are loaded.
