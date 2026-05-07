// PokeRod atlas art module: high-detail 32x32 tile/character art and 64x64
// creature art used to generate assets/atlas.png + assets/atlas.json. The
// runtime game does not load this file - it loads the resulting PNG.
//
// Self-contained: no dependencies on the runtime game code, except optional
// access to window.PR_DATA at gen time to enumerate creatures.
'use strict';

(function () {
  const TILE = 32;        // tile/character native size
  const CREATURE = 64;    // creature native size
  const STYLE_PRESETS = [
    { id:'gb_red', label:'GB RED', image:'atlas-gb-red.png', json:'atlas-gb-red.json', spritesDir:'sprites-gb-red' },
    { id:'gbc_yellow', label:'GBC YELLOW', image:'atlas-gbc-yellow.png', json:'atlas-gbc-yellow.json', spritesDir:'sprites-gbc-yellow' },
    { id:'gba_firered', label:'GBA FIRERED', image:'atlas.png', json:'atlas.json', spritesDir:'sprites' },
    { id:'ds_diamond', label:'DS DIAMOND', image:'atlas-ds-diamond.png', json:'atlas-ds-diamond.json', spritesDir:'sprites-ds-diamond' }
  ];

  // ------------------------------------------------------------------
  // Pixel helpers
  // ------------------------------------------------------------------
  function px(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
  }

  // 3-tone shaded rectangle: base + darker top/left edge + lighter bottom-right.
  function shaded(ctx, x, y, w, h, base, dark, light) {
    px(ctx, x, y, w, h, base);
    px(ctx, x, y, w, 1, dark);
    px(ctx, x, y, 1, h, dark);
    px(ctx, x, y + h - 1, w, 1, light);
    px(ctx, x + w - 1, y, 1, h, light);
  }

  // Filled circle (Bresenham-ish, span fill).
  function disc(ctx, cx, cy, r, color) {
    for (let dy = -r; dy <= r; dy++) {
      const w = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy)));
      if (w <= 0) continue;
      px(ctx, cx - w, cy + dy, w * 2 + 1, 1, color);
    }
  }

  // Stippled noise dots within a rect, deterministic from seed.
  function stipple(ctx, x, y, w, h, color, count, seed) {
    let s = seed | 0;
    for (let i = 0; i < count; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const dx = s % w;
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const dy = s % h;
      px(ctx, x + dx, y + dy, 1, 1, color);
    }
  }

  // ------------------------------------------------------------------
  // Atlas registry. Each entry: { key, w, h, draw(ctx, x, y) }.
  // The generator iterates this list and packs into a sheet.
  // ------------------------------------------------------------------
  const TILES = [];     // 32x32 entries (and a few 32x64 for tall objects)
  const CHARS = [];     // 32x32 entries
  const CREATURES = []; // 64x64 entries (added at gen time when PR_DATA loaded)
  const TILE_VARIANTS = {}; // { tileCode: { random:[], context:{} } }

  function regTile(code, name, w, h, draw) {
    TILES.push({ key: 'tile_' + name, code, w, h, draw });
  }
  // Decoration: an atlas key drawn on a transparent background, placed
  // via map.decorations = [{x,y,key}] at runtime. Use for furniture
  // and props that sit on top of an existing ground tile.
  function regDecor(name, w, h, draw) {
    TILES.push({ key: 'decor_' + name, code: null, w, h, draw });
  }
  function regTileVariant(code, name, draw, opts) {
    opts = opts || {};
    const key = 'tile_' + name;
    TILES.push({ key, code:null, variantFor:code, w:TILE, h:TILE, draw });
    if (!TILE_VARIANTS[code]) TILE_VARIANTS[code] = { random:[], context:{} };
    if (opts.context) TILE_VARIANTS[code].context[opts.context] = key;
    else TILE_VARIANTS[code].random.push(key);
  }
  function regChar(name, draw) {
    CHARS.push({ key: name, w: TILE, h: TILE, draw });
  }

  // ------------------------------------------------------------------
  // === TERRAIN TILES ================================================
  // ------------------------------------------------------------------

  // Common grass base used by many tiles. 32x32 dense pattern with three
  // tones, scattered short blades, and a few tiny flowers.
  function grassBase(ctx, x, y, opts) {
    const o = opts || {};
    const base = o.base || '#5cae4c';
    const dark = o.dark || '#3a8030';
    const light = o.light || '#82c870';
    px(ctx, x, y, TILE, TILE, base);
    // Soft tone bands (subtle horizontal variation).
    for (let i = 0; i < TILE; i += 4) px(ctx, x, y + i, TILE, 1, dark);
    px(ctx, x, y, TILE, TILE, base); // re-cover, leaves only natural texture
    // Scattered blades (short vertical 2px lines).
    const seed = ((x * 13) ^ (y * 7)) | 0;
    let s = seed;
    for (let i = 0; i < 14; i++) {
      s = (s * 1664525 + 1013904223) & 0x7fffffff;
      const bx = (s % (TILE - 2)) | 0;
      s = (s * 1664525 + 1013904223) & 0x7fffffff;
      const by = (s % (TILE - 3)) | 0;
      const c = (s & 1) ? dark : light;
      px(ctx, x + bx, y + by, 1, 2, c);
    }
    // Highlight tufts.
    px(ctx, x + 6, y + 10, 2, 1, light);
    px(ctx, x + 22, y + 18, 2, 1, light);
    px(ctx, x + 14, y + 26, 2, 1, light);
    if (o.flowers) {
      px(ctx, x + 4,  y + 6,  1, 1, '#f04860');
      px(ctx, x + 20, y + 12, 1, 1, '#f8d030');
      px(ctx, x + 9,  y + 22, 1, 1, '#f8f0c0');
      px(ctx, x + 26, y + 24, 1, 1, '#f04860');
    }
  }

  regTile('.', 'grass',       TILE, TILE, (c, x, y) => grassBase(c, x, y));
  regTile('X', 'grass_alt',   TILE, TILE, (c, x, y) => grassBase(c, x, y));
  regTile('1', 'grass_flower',TILE, TILE, (c, x, y) => grassBase(c, x, y, { flowers: true }));
  regTile('2', 'grass_light', TILE, TILE, (c, x, y) => grassBase(c, x, y, { base: '#7cc85c', dark: '#5cae4c', light: '#a8e078' }));
  regTile('3', 'grass_dry',   TILE, TILE, (c, x, y) => grassBase(c, x, y, { base: '#c8a868', dark: '#9a7838', light: '#e8d090' }));
  regTile('4', 'grass_lush',  TILE, TILE, (c, x, y) => grassBase(c, x, y, { base: '#2a7028', dark: '#1c4818', light: '#48a838' }));

  // Tall grass: dense vertical blades, taller, with subtle paint of short
  // blades behind them.
  regTile(':', 'tallgrass', TILE, TILE, (c, x, y) => {
    grassBase(c, x, y, { base: '#3a8030', dark: '#2a6020', light: '#5cae4c' });
    for (let i = 0; i < 8; i++) {
      const bx = x + 2 + i * 4;
      const by = y + 6 + ((i & 1) ? 4 : 0);
      px(c, bx, by + 8, 3, 12, '#1c4818');
      px(c, bx + 1, by + 6, 1, 14, '#2a6020');
      px(c, bx + 1, by + 4, 1, 4, '#5cae4c');
      px(c, bx, by + 4, 1, 1, '#82c870');
    }
  });

  // Solid sand patch.
  regTile('s', 'sand', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#e8d090');
    stipple(c, x, y, TILE, TILE, '#c8a868', 22, x * 31 + y * 17);
    stipple(c, x, y, TILE, TILE, '#f8e8b8', 12, x * 17 + y * 31);
  });

  // ------------------------------------------------------------------
  // === PATHS ========================================================
  // Each path is a 32x32 tile. Most have a base + texture + accents.
  // ------------------------------------------------------------------

  // Generic dirt path.
  regTile(',', 'path', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#d8b878');
    stipple(c, x, y, TILE, TILE, '#b89858', 28, x * 7 + y * 11);
    stipple(c, x, y, TILE, TILE, '#f0d098', 14, x * 11 + y * 7);
    px(c, x + 5, y + 8, 3, 1, '#a88838');
    px(c, x + 22, y + 18, 4, 1, '#a88838');
  });

  // Cobblestone: 4 columns × 4 rows of brick-shaped stones with mortar.
  regTile('_', 'path_cobble', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#605850'); // mortar
    for (let r = 0; r < 4; r++) {
      const yy = y + r * 8;
      const off = (r & 1) ? 4 : 0;
      for (let i = 0; i < 5; i++) {
        const xx = x + i * 8 - off;
        if (xx + 7 <= x || xx >= x + TILE) continue;
        const sx = Math.max(xx, x);
        const ex = Math.min(xx + 8, x + TILE);
        // Stone body.
        px(c, sx, yy + 1, ex - sx, 6, '#a09890');
        // Top highlight.
        px(c, sx, yy + 1, ex - sx, 1, '#c8c0b8');
        // Right shadow.
        if (ex < x + TILE) px(c, ex - 1, yy + 1, 1, 6, '#807870');
        // Bottom shadow line.
        px(c, sx, yy + 6, ex - sx, 1, '#807870');
      }
    }
  });

  // Loose dirt path with darker pebbles and lighter highlights.
  regTile('^', 'path_dirt', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#9a6838');
    stipple(c, x, y, TILE, TILE, '#603810', 30, x * 13 + y * 19);
    stipple(c, x, y, TILE, TILE, '#c08858', 18, x * 19 + y * 13);
    // A few visible pebbles.
    disc(c, x + 8,  y + 10, 1, '#382008');
    disc(c, x + 22, y + 18, 1, '#382008');
    disc(c, x + 14, y + 24, 1, '#c8a878');
  });

  // Stepping stones in dirt: large oval flagstones.
  regTile('o', 'path_stepstone', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#9a6838');
    stipple(c, x, y, TILE, TILE, '#603810', 16, x * 5 + y * 3);
    const stones = [[6, 4, 10, 8], [18, 10, 10, 8], [10, 20, 10, 8]];
    for (const [sx, sy, sw, sh] of stones) {
      // Soft oval body.
      disc(c, x + sx + (sw >> 1), y + sy + (sh >> 1), Math.min(sw, sh) >> 1, '#a8a098');
      px(c, x + sx + 1, y + sy + 1, sw - 2, 1, '#d0c8c0');
      px(c, x + sx + 1, y + sy + sh - 2, sw - 2, 1, '#807870');
    }
  });

  // Gravel: dense small stones.
  regTile(';', 'path_gravel', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#a8a098');
    for (let i = 0; i < 60; i++) {
      const s = ((i * 1103515245 + (x * 7) + (y * 5)) >>> 0) & 0x7fffffff;
      const dx = s % TILE;
      const dy = (s >> 8) % TILE;
      const c2 = (s & 3) === 0 ? '#d8d0c8' : ((s & 3) === 1 ? '#605850' : '#807870');
      px(c, x + dx, y + dy, 1, 1, c2);
    }
  });

  // Brick pattern helper used by path_redbrick, path_yellowbrick and walls.
  function brickPattern(c, x, y, base, mortar, hi) {
    px(c, x, y, TILE, TILE, base);
    // Horizontal mortar lines every 8px.
    for (let r = 0; r < TILE; r += 8) px(c, x, y + r + 7, TILE, 1, mortar);
    // Vertical seams: alternating offset rows.
    for (let r = 0; r < TILE; r += 8) {
      const off = ((r >> 3) & 1) ? 8 : 0;
      for (let i = off; i < TILE; i += 16) {
        px(c, x + i, y + r, 1, 7, mortar);
      }
    }
    // Highlights on top edge of each brick.
    for (let r = 0; r < TILE; r += 8) {
      const off = ((r >> 3) & 1) ? 8 : 0;
      for (let i = off; i < TILE; i += 16) {
        px(c, x + i + 1, y + r, 4, 1, hi);
      }
    }
  }

  regTile('i', 'path_redbrick', TILE, TILE, (c, x, y) => {
    brickPattern(c, x, y, '#a83838', '#602820', '#c85048');
  });

  regTile('y', 'path_yellowbrick', TILE, TILE, (c, x, y) => {
    brickPattern(c, x, y, '#e0b830', '#806818', '#f8d870');
  });

  // Park path: cream surface with mowed-grass borders.
  regTile('p', 'path_park', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#e8d8a8');
    px(c, x, y, TILE, 2, '#c8b888');
    px(c, x, y + TILE - 2, TILE, 2, '#c8b888');
    stipple(c, x + 2, y + 4, TILE - 4, TILE - 8, '#d0c098', 18, x * 11 + y * 7);
    // Tiny coloured pebbles / petals.
    px(c, x + 6, y + 8, 1, 1, '#5cae4c');
    px(c, x + 22, y + 6, 1, 1, '#5cae4c');
    px(c, x + 12, y + 18, 1, 1, '#a83820');
    px(c, x + 24, y + 24, 1, 1, '#f0c020');
  });

  // Mosaic: 4-color checker squares with white grout.
  regTile('q', 'path_mosaic', TILE, TILE, (c, x, y) => {
    const cs = ['#a83838', '#3060a8', '#c8a020', '#208828'];
    for (let r = 0; r < 4; r++) {
      for (let cc = 0; cc < 4; cc++) {
        const idx = (r + cc) % cs.length;
        const xx = x + cc * 8;
        const yy = y + r * 8;
        px(c, xx, yy, 8, 8, cs[idx]);
        // Inner glow.
        px(c, xx + 2, yy + 2, 4, 4, '#fff');
        px(c, xx + 3, yy + 3, 2, 2, cs[idx]);
        // Grout.
        px(c, xx, yy, 8, 1, '#f0f0f0');
        px(c, xx, yy, 1, 8, '#f0f0f0');
      }
    }
    px(c, x, y + TILE - 1, TILE, 1, '#f0f0f0');
    px(c, x + TILE - 1, y, 1, TILE, '#f0f0f0');
  });

  // Boardwalk planks running horizontally.
  regTile('t', 'path_boardwalk', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#806038');
    for (let r = 0; r < TILE; r += 8) {
      // Plank highlight.
      px(c, x, y + r + 1, TILE, 1, '#a08858');
      // Plank shadow / seam.
      px(c, x, y + r + 7, TILE, 1, '#382008');
    }
    // Knots.
    px(c, x + 6,  y + 4,  2, 1, '#382008');
    px(c, x + 22, y + 12, 2, 1, '#382008');
    px(c, x + 14, y + 20, 2, 1, '#382008');
    px(c, x + 26, y + 28, 2, 1, '#382008');
  });

  // Sand path - lighter than grass-bordered path.
  regTile('u', 'path_sand', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#f0d8a0');
    stipple(c, x, y, TILE, TILE, '#d8b870', 24, x * 5 + y * 9);
    stipple(c, x, y, TILE, TILE, '#a88838', 8, x * 9 + y * 5);
    px(c, x + 6,  y + 8,  3, 1, '#d8b870');
    px(c, x + 18, y + 22, 4, 1, '#d8b870');
  });

  // Rocky path: large angular stones embedded in dirt.
  regTile('v', 'path_rocky', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#787068');
    const stones = [[2, 4, 10, 8], [16, 2, 12, 10], [6, 18, 14, 10], [22, 18, 8, 10]];
    for (const [sx, sy, sw, sh] of stones) {
      px(c, x + sx, y + sy, sw, sh, '#a8a098');
      px(c, x + sx, y + sy, sw, 1, '#c8c0b8');
      px(c, x + sx, y + sy, 1, sh, '#c8c0b8');
      px(c, x + sx + sw - 1, y + sy, 1, sh, '#605850');
      px(c, x + sx, y + sy + sh - 1, sw, 1, '#605850');
    }
    // Specks of grit.
    stipple(c, x, y, TILE, TILE, '#383028', 8, x * 3 + y * 7);
  });

  // Wet stone: like cobble but blue-grey with shines.
  regTile('w', 'path_wetstone', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#202830');
    for (let r = 0; r < 4; r++) {
      const yy = y + r * 8;
      const off = (r & 1) ? 4 : 0;
      for (let i = 0; i < 5; i++) {
        const xx = x + i * 8 - off;
        const sxx = Math.max(xx, x);
        const exx = Math.min(xx + 8, x + TILE);
        if (exx <= sxx) continue;
        px(c, sxx, yy + 1, exx - sxx, 6, '#588898');
        px(c, sxx, yy + 1, exx - sxx, 1, '#a8c8d8');
        px(c, sxx, yy + 6, exx - sxx, 1, '#384858');
      }
    }
    // Wet shines.
    px(c, x + 6,  y + 4,  3, 1, '#d8e8f0');
    px(c, x + 22, y + 20, 3, 1, '#d8e8f0');
  });

  // Crossroads: dirt with a + shape of lighter path.
  regTile('x', 'path_crossroads', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#9a6838');
    stipple(c, x, y, TILE, TILE, '#603810', 18, x * 5 + y * 11);
    px(c, x + 12, y, 8, TILE, '#d8b878');
    px(c, x, y + 12, TILE, 8, '#d8b878');
    px(c, x + 12, y + 12, 8, 8, '#f0d098');
    // Faint wheel ruts.
    px(c, x + 14, y + 1, 1, 30, '#c8a868');
    px(c, x + 17, y + 1, 1, 30, '#c8a868');
    px(c, x + 1, y + 14, 30, 1, '#c8a868');
    px(c, x + 1, y + 17, 30, 1, '#c8a868');
  });

  // Moss-stone path: stones in mossy patches.
  regTile('z', 'path_moss', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#a89858');
    // Moss patches.
    disc(c, x + 6,  y + 7,  4, '#588838');
    disc(c, x + 22, y + 10, 4, '#588838');
    disc(c, x + 12, y + 22, 5, '#588838');
    px(c, x + 4,  y + 6,  2, 1, '#a8d878');
    px(c, x + 21, y + 9,  2, 1, '#a8d878');
    px(c, x + 11, y + 21, 2, 1, '#a8d878');
    // Stones.
    px(c, x + 14, y + 4,  6, 6, '#88807a');
    px(c, x + 14, y + 4,  6, 1, '#a8a098');
    px(c, x + 14, y + 9,  6, 1, '#605850');
    px(c, x + 4,  y + 18, 6, 6, '#88807a');
    px(c, x + 4,  y + 18, 6, 1, '#a8a098');
    px(c, x + 22, y + 22, 7, 6, '#88807a');
    px(c, x + 22, y + 22, 7, 1, '#a8a098');
  });

  // Autumn path: fallen leaves over earthy base.
  regTile('a', 'path_autumn', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#b89858');
    stipple(c, x, y, TILE, TILE, '#a88838', 16, x * 7 + y * 11);
    // Leaves (small 3x3 with vein).
    const leaves = [
      [4, 6, '#e87838'], [22, 8, '#a83820'], [10, 18, '#f0c020'],
      [25, 22, '#e87838'], [16, 26, '#a83820'], [6, 24, '#f0c020']
    ];
    for (const [lx, ly, col] of leaves) {
      px(c, x + lx, y + ly, 3, 2, col);
      px(c, x + lx + 1, y + ly + 2, 1, 1, col);
      px(c, x + lx + 1, y + ly + 1, 1, 1, '#5a3818');
    }
  });

  // Wooden bridge with rails on top/bottom.
  regTile('A', 'path_bridge', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#88807a');
    // Top rail (thick).
    px(c, x, y, TILE, 4, '#5a3818');
    px(c, x, y + 1, TILE, 1, '#806838');
    px(c, x, y + 3, TILE, 1, '#382008');
    // Bottom rail.
    px(c, x, y + TILE - 4, TILE, 4, '#5a3818');
    px(c, x, y + TILE - 4, TILE, 1, '#382008');
    px(c, x, y + TILE - 3, TILE, 1, '#806838');
    // Plank seams in walking surface.
    for (let i = 4; i < TILE; i += 6) px(c, x + i, y + 5, 1, TILE - 9, '#605850');
    // Subtle highlights between seams.
    for (let i = 6; i < TILE; i += 6) px(c, x + i, y + 6, 1, TILE - 11, '#a8a098');
  });

  // Zen garden: raked sand with concentric horizontal strokes.
  regTile('Z', 'path_zen', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#e8d8a0');
    for (let r = 3; r < TILE; r += 5) {
      px(c, x + 1, y + r, TILE - 2, 1, '#c8b870');
      // Subtle wave dots.
      px(c, x + 4,  y + r + 2, 1, 1, '#a89838');
      px(c, x + 14, y + r + 2, 1, 1, '#a89838');
      px(c, x + 24, y + r + 2, 1, 1, '#a89838');
    }
    // Accent stone.
    px(c, x + 22, y + 22, 6, 4, '#605850');
    px(c, x + 22, y + 22, 6, 1, '#88807a');
  });

  // Lantern path: dark stones lit by tiny lantern in upper-right.
  regTile('I', 'path_lantern', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#383028');
    // Stones.
    px(c, x + 2,  y + 4,  6, 4, '#88807a');
    px(c, x + 2,  y + 4,  6, 1, '#a8a098');
    px(c, x + 22, y + 22, 6, 4, '#88807a');
    px(c, x + 22, y + 22, 6, 1, '#a8a098');
    px(c, x + 12, y + 14, 7, 5, '#605850');
    // Lantern post in upper-right.
    px(c, x + 22, y + 1,  2, 10, '#5a3818');
    // Lantern body.
    px(c, x + 19, y + 1,  9, 5,  '#a83820');
    px(c, x + 20, y + 2,  7, 3,  '#f8e040');
    px(c, x + 20, y + 1,  7, 1,  '#382008');
    // Glow on stones.
    px(c, x + 5,  y + 14, 2, 1, '#f0c020');
    px(c, x + 18, y + 24, 2, 1, '#f0c020');
    px(c, x + 12, y + 28, 2, 1, '#f0c020');
  });

  // Desert: dunes, ripples, pebbles.
  regTile('5', 'path_desert', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#f0d870');
    // Dune contours.
    px(c, x + 1,  y + 8,  10, 1, '#d8b840');
    px(c, x + 14, y + 16, 14, 1, '#d8b840');
    px(c, x + 4,  y + 26, 12, 1, '#d8b840');
    // Ripples.
    for (let r = 4; r < TILE; r += 4) {
      for (let i = 0; i < TILE; i += 6) {
        px(c, x + i + ((r >> 2) & 1) * 3, y + r, 1, 1, '#e8c860');
      }
    }
    // Pebbles.
    px(c, x + 20, y + 4,  1, 1, '#a88838');
    px(c, x + 8,  y + 20, 1, 1, '#a88838');
    px(c, x + 26, y + 24, 1, 1, '#a88838');
  });

  // Snow path: white with faint blue tracks.
  regTile('6', 'path_snow', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#f8f8ff');
    stipple(c, x, y, TILE, TILE, '#d8e0f0', 28, x * 11 + y * 5);
    stipple(c, x, y, TILE, TILE, '#fff', 14, x * 5 + y * 11);
    // Footprint pairs.
    px(c, x + 6,  y + 10, 3, 2, '#a8b8d8');
    px(c, x + 11, y + 10, 3, 2, '#a8b8d8');
    px(c, x + 18, y + 20, 3, 2, '#a8b8d8');
    px(c, x + 23, y + 20, 3, 2, '#a8b8d8');
  });

  // ------------------------------------------------------------------
  // === TREES & BUSHES ===============================================
  // Trees occupy the full 32x32 tile; a grass base is painted under them
  // so they composite cleanly onto any grass biome.
  // ------------------------------------------------------------------

  // Generic round-canopy tree, parameterized by palette.
  function roundTree(c, x, y, palette) {
    const [trunkA, trunkB, leafA, leafB, leafC, accent] = palette;
    grassBase(c, x, y);
    // Trunk.
    px(c, x + 13, y + 22, 6, 10, trunkA);
    px(c, x + 13, y + 22, 1, 10, trunkB);
    px(c, x + 18, y + 22, 1, 10, '#382008');
    px(c, x + 14, y + 28, 4, 1, trunkB);
    // Canopy: layered ovals (large dark, mid mid-tone, small highlight).
    disc(c, x + 16, y + 13, 12, leafA);
    disc(c, x + 14, y + 11, 10, leafB);
    disc(c, x + 18, y + 9,  6,  leafC);
    // Accent specks (flowers/bright leaves).
    if (accent) {
      px(c, x + 9,  y + 8,  2, 2, accent);
      px(c, x + 22, y + 14, 2, 2, accent);
      px(c, x + 14, y + 4,  1, 1, accent);
    }
    // Drop shadow on grass below trunk.
    px(c, x + 11, y + 30, 11, 1, '#3a6028');
  }

  regTile('T', 'tree',         TILE, TILE, (c, x, y) => roundTree(c, x, y, ['#5a3818', '#382008', '#1c4818', '#2a6824', '#48a838', null]));
  regTile('Y', 'tree_oak',     TILE, TILE, (c, x, y) => roundTree(c, x, y, ['#5a3818', '#382008', '#1c5018', '#2a7028', '#5cae4c', '#a8d878']));
  regTile('K', 'tree_cherry',  TILE, TILE, (c, x, y) => roundTree(c, x, y, ['#5a3818', '#382008', '#a8487a', '#f088b0', '#fff0f8', '#ffd8e8']));
  regTile('E', 'tree_autumn',  TILE, TILE, (c, x, y) => roundTree(c, x, y, ['#5a3818', '#382008', '#a83820', '#e87838', '#f0c020', '#f8e040']));
  regTile('G', 'tree_ancient', TILE, TILE, (c, x, y) => roundTree(c, x, y, ['#3a2410', '#1a0a04', '#0e3010', '#1c4818', '#3a8030', '#5cae4c']));

  // Palm tree: tall trunk with curved fronds at top.
  regTile('O', 'tree_palm', TILE, TILE, (c, x, y) => {
    grassBase(c, x, y);
    // Trunk segments.
    px(c, x + 14, y + 12, 4, 20, '#604018');
    for (let i = 14; i < 32; i += 4) px(c, x + 14, y + i, 4, 1, '#382008');
    px(c, x + 14, y + 12, 1, 20, '#382008');
    px(c, x + 17, y + 12, 1, 20, '#a08858');
    // Fronds (5 spokes radiating from top).
    const frondTip = [[2, 8], [29, 8], [4, 4], [27, 4], [16, 1]];
    for (const [tx, ty] of frondTip) {
      // Line from trunk top (16,12) to tip.
      const x0 = x + 16, y0 = y + 12;
      const x1 = x + tx, y1 = y + ty;
      const dx = x1 - x0, dy = y1 - y0;
      const steps = Math.max(Math.abs(dx), Math.abs(dy));
      for (let i = 0; i <= steps; i++) {
        const fx = x0 + Math.round(dx * i / steps);
        const fy = y0 + Math.round(dy * i / steps);
        px(c, fx,     fy,     2, 1, '#3a8830');
        if (i > 1) px(c, fx, fy + 1, 2, 1, '#1c5018');
      }
      // Tip leaflet.
      px(c, x1 - 1, y1, 3, 1, '#48a838');
    }
    // Coconuts.
    disc(c, x + 13, y + 14, 1, '#5a3818');
    disc(c, x + 19, y + 14, 1, '#5a3818');
  });

  // Dead bare tree.
  regTile('J', 'tree_dead', TILE, TILE, (c, x, y) => {
    grassBase(c, x, y);
    // Trunk.
    px(c, x + 14, y + 14, 4, 18, '#383028');
    px(c, x + 14, y + 14, 1, 18, '#5a4838');
    px(c, x + 17, y + 14, 1, 18, '#1a1410');
    // Branches splitting up.
    px(c, x + 10, y + 8,  3, 1, '#383028'); px(c, x + 10, y + 9,  1, 5, '#383028');
    px(c, x + 19, y + 8,  3, 1, '#383028'); px(c, x + 21, y + 9,  1, 5, '#383028');
    px(c, x + 14, y + 4,  1, 11, '#5a4838');
    px(c, x + 17, y + 2,  1, 13, '#5a4838');
    px(c, x + 12, y + 6,  1, 1, '#383028');
    px(c, x + 19, y + 5,  1, 1, '#383028');
    // Twiggy ends.
    px(c, x + 13, y + 1,  1, 1, '#5a4838');
    px(c, x + 18, y,      1, 1, '#5a4838');
    // Drop shadow.
    px(c, x + 12, y + 30, 9, 1, '#3a6028');
  });

  // Snowy pine: triangular silhouette with snow caps.
  regTile('Q', 'tree_snowypine', TILE, TILE, (c, x, y) => {
    grassBase(c, x, y, { base: '#dce8ff', dark: '#a8c0e0', light: '#f0f8ff' });
    // Trunk.
    px(c, x + 14, y + 26, 4, 6, '#5a3818');
    // Triangle layers (top to bottom).
    for (let r = 0; r < 24; r++) {
      const w = Math.max(2, ((r + 2) * 24 / 24) | 0);
      const half = w >> 1;
      const yy = y + 2 + r;
      px(c, x + 16 - half, yy, w, 1, r < 8 ? '#1c4818' : (r < 16 ? '#2a6824' : '#1c5018'));
    }
    // Snow tips on each layer.
    px(c, x + 15, y + 2,  2, 1, '#fff');
    px(c, x + 12, y + 8,  3, 1, '#e8f0ff');
    px(c, x + 17, y + 8,  3, 1, '#e8f0ff');
    px(c, x + 9,  y + 14, 4, 1, '#e8f0ff');
    px(c, x + 19, y + 14, 4, 1, '#e8f0ff');
    px(c, x + 6,  y + 20, 4, 1, '#fff');
    px(c, x + 22, y + 20, 4, 1, '#fff');
    // Mound shadow.
    px(c, x + 12, y + 30, 9, 1, '#a8c0e0');
  });

  // Birch: slim white trunk with horizontal black stripes.
  regTile('N', 'tree_birch', TILE, TILE, (c, x, y) => {
    grassBase(c, x, y);
    // Trunk.
    px(c, x + 14, y + 14, 4, 18, '#f0f0e8');
    px(c, x + 14, y + 14, 1, 18, '#a0a098');
    px(c, x + 17, y + 14, 1, 18, '#c0c0b8');
    for (let r = 16; r < 32; r += 4) px(c, x + 14, y + r, 4, 1, '#202020');
    // Canopy.
    disc(c, x + 16, y + 9,  10, '#3a8030');
    disc(c, x + 14, y + 7,  8,  '#5cae4c');
    disc(c, x + 19, y + 5,  4,  '#a8d878');
    px(c, x + 12, y + 5, 1, 1, '#a8d878');
    // Drop shadow.
    px(c, x + 12, y + 30, 9, 1, '#3a6028');
  });

  // Mushroom tree: red cap with white spots and thick stem.
  regTile('U', 'tree_mushroom', TILE, TILE, (c, x, y) => {
    grassBase(c, x, y);
    // Stem.
    px(c, x + 12, y + 18, 8, 14, '#f0e8d0');
    px(c, x + 12, y + 18, 1, 14, '#c8c0b0');
    px(c, x + 19, y + 18, 1, 14, '#807868');
    // Cap (gradient half-ellipse).
    for (let r = 0; r < 16; r++) {
      const w = Math.max(2, Math.round(Math.sqrt(Math.max(0, 256 - r * r)) - r * 0.2));
      const yy = y + 16 - r;
      px(c, x + 16 - w, yy, w * 2, 1, r < 4 ? '#a02020' : (r < 12 ? '#d83020' : '#f04830'));
    }
    // Cap underside.
    px(c, x + 4,  y + 16, 24, 2, '#5a1010');
    px(c, x + 4,  y + 17, 24, 1, '#a02020');
    // White spots.
    disc(c, x + 8,  y + 10, 2, '#fff');
    disc(c, x + 22, y + 8,  2, '#fff');
    disc(c, x + 16, y + 4,  2, '#fff');
    disc(c, x + 13, y + 14, 1, '#fff');
    disc(c, x + 25, y + 14, 1, '#fff');
    // Drop shadow.
    px(c, x + 10, y + 30, 13, 1, '#3a6028');
  });

  // Willow: short trunk with drooping fronds.
  regTile('V', 'tree_willow', TILE, TILE, (c, x, y) => {
    grassBase(c, x, y);
    // Trunk.
    px(c, x + 14, y + 22, 4, 10, '#604018');
    px(c, x + 14, y + 22, 1, 10, '#382008');
    // Crown.
    disc(c, x + 16, y + 8, 11, '#3a7028');
    disc(c, x + 14, y + 6, 8, '#5cae4c');
    // Drooping strands.
    const strands = [1, 4, 7, 12, 18, 24, 27, 30];
    for (const sx of strands) {
      const len = 8 + ((sx * 5) % 6);
      px(c, x + sx, y + 12, 1, len, '#3a7028');
      px(c, x + sx, y + 11, 1, 1, '#5cae4c');
      px(c, x + sx, y + 12 + len, 1, 1, '#a8d878');
    }
    // Drop shadow.
    px(c, x + 10, y + 30, 13, 1, '#3a6028');
  });

  // Generic small bush.
  function bushShape(c, x, y, leafA, leafB, leafC, accents) {
    grassBase(c, x, y);
    // Bush body (lower 2/3 of tile).
    disc(c, x + 16, y + 22, 12, leafA);
    disc(c, x + 14, y + 20, 10, leafB);
    disc(c, x + 19, y + 18, 5,  leafC);
    // Outline shadow under bush.
    px(c, x + 6, y + 30, 21, 1, '#1c4818');
    if (accents && accents.length) {
      for (const [ax, ay, col] of accents) px(c, x + ax, y + ay, 1, 1, col);
    }
  }

  regTile('b', 'bush',          TILE, TILE, (c, x, y) => bushShape(c, x, y, '#1c5018', '#2a7028', '#48a838', [[10, 18, '#5cae4c'], [22, 22, '#5cae4c']]));
  regTile('c', 'bush_flower',   TILE, TILE, (c, x, y) => bushShape(c, x, y, '#1c5018', '#2a7028', '#48a838', [[8, 18, '#fff8e0'], [16, 20, '#fff8e0'], [22, 24, '#fff8e0'], [12, 24, '#fff8e0']]));
  regTile('e', 'bush_berry',    TILE, TILE, (c, x, y) => bushShape(c, x, y, '#1c5018', '#2a7028', '#48a838', [[10, 20, '#e83020'], [18, 22, '#e83020'], [22, 18, '#e83020'], [14, 24, '#f86040']]));
  regTile('g', 'bush_thorn',    TILE, TILE, (c, x, y) => bushShape(c, x, y, '#0e2c0e', '#1c4818', '#2a6824', [[6, 16, '#0e2c0e'], [14, 14, '#0e2c0e'], [22, 16, '#0e2c0e'], [26, 20, '#0e2c0e']]));
  regTile('j', 'bush_autumn',   TILE, TILE, (c, x, y) => bushShape(c, x, y, '#a83820', '#e87838', '#f0c020', [[10, 22, '#f0c020'], [22, 24, '#f0c020']]));
  regTile('k', 'bush_snowy',    TILE, TILE, (c, x, y) => {
    bushShape(c, x, y, '#1c5018', '#2a7028', '#48a838', null);
    // Snow on top.
    px(c, x + 6, y + 14, 21, 4, '#fff');
    px(c, x + 8, y + 13, 17, 1, '#e8f0ff');
    disc(c, x + 12, y + 18, 1, '#fff');
    disc(c, x + 22, y + 22, 1, '#fff');
  });
  regTile('l', 'bush_blueflower',   TILE, TILE, (c, x, y) => bushShape(c, x, y, '#1c5018', '#2a7028', '#48a838', [[10, 20, '#5878e8'], [18, 22, '#a8c8ff'], [22, 18, '#5878e8'], [14, 24, '#5878e8']]));
  regTile('m', 'bush_purpleflower', TILE, TILE, (c, x, y) => bushShape(c, x, y, '#1c5018', '#2a7028', '#48a838', [[10, 20, '#a040c0'], [18, 22, '#d088f0'], [22, 18, '#a040c0'], [14, 24, '#a040c0']]));

  regTile('n', 'thorn_cluster', TILE, TILE, (c, x, y) => {
    grassBase(c, x, y);
    // Three thorn tufts.
    const tufts = [[8, 22], [16, 20], [24, 22]];
    for (const [tx, ty] of tufts) {
      px(c, x + tx,     y + ty,     1, 6, '#383028');
      px(c, x + tx - 2, y + ty + 4, 5, 1, '#383028');
      px(c, x + tx + 1, y + ty - 1, 1, 1, '#5a4838');
    }
  });

  regTile('h', 'hedge', TILE, TILE, (c, x, y) => {
    grassBase(c, x, y);
    // Tall flat-top hedge filling lower 22 px.
    px(c, x + 1,  y + 10, TILE - 2, 22, '#1c5018');
    px(c, x + 1,  y + 10, TILE - 2, 1,  '#0e2c0e');
    px(c, x + 2,  y + 11, TILE - 4, 20, '#2a7028');
    // Texture leaflets.
    for (let r = 0; r < 6; r++) {
      const yy = y + 12 + r * 3;
      px(c, x + 4 + ((r & 1) ? 4 : 0),  yy, 1, 1, '#48a838');
      px(c, x + 12 + ((r & 1) ? 4 : 0), yy, 1, 1, '#48a838');
      px(c, x + 22 + ((r & 1) ? 4 : 0), yy, 1, 1, '#48a838');
    }
    px(c, x + 1,  y + 30, TILE - 2, 1, '#0e2c0e');
  });

  // ------------------------------------------------------------------
  // === WATER & INTERIOR FLOOR ======================================
  // ------------------------------------------------------------------
  regTile('W', 'water', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#4878d8');
    // Subtle horizontal bands of darker/lighter water.
    for (let r = 0; r < TILE; r += 4) {
      px(c, x, y + r, TILE, 1, (r & 4) ? '#3060b0' : '#5888e0');
    }
    // Highlights / wave shimmers.
    px(c, x + 4,  y + 8,  10, 1, '#a8d8f8');
    px(c, x + 18, y + 22, 10, 1, '#a8d8f8');
    px(c, x + 2,  y + 24, 5, 1, '#88b8e8');
    px(c, x + 14, y + 14, 5, 1, '#88b8e8');
    // Sparkle dots.
    px(c, x + 6,  y + 4,  1, 1, '#fff');
    px(c, x + 22, y + 18, 1, 1, '#fff');
  });

  // Interior wood floor: parquet planks running horizontally.
  regTile('F', 'floor', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#d8c098');
    // Plank seams every 8 px.
    for (let r = 0; r < TILE; r += 8) {
      px(c, x, y + r, TILE, 1, '#a88858');
      px(c, x, y + r + 1, TILE, 1, '#e8d0a8');
    }
    // Vertical board ends, alternating.
    for (let r = 0; r < TILE; r += 8) {
      const off = ((r >> 3) & 1) ? 16 : 0;
      px(c, x + off, y + r + 1, 1, 7, '#a88858');
    }
    // Highlights.
    stipple(c, x + 1, y + 1, TILE - 2, TILE - 2, '#f0d8b0', 8, x * 7 + y * 5);
  });

  // ------------------------------------------------------------------
  // === ROOFS ========================================================
  // ------------------------------------------------------------------

  // Tiled roof helper: rows of overlapping curved tiles.
  function tiledRoof(c, x, y, base, dark, light) {
    px(c, x, y, TILE, TILE, base);
    px(c, x, y, TILE, 4, dark);          // ridge
    px(c, x, y + TILE - 3, TILE, 3, dark);// eave
    // Tile rows: each row 6 px tall, half-offset.
    for (let r = 4; r < TILE - 3; r += 6) {
      const off = (((r - 4) / 6) & 1) ? 4 : 0;
      for (let i = -off; i < TILE; i += 8) {
        const xx = x + i;
        if (xx + 7 <= x || xx >= x + TILE) continue;
        const sx = Math.max(xx, x);
        const ex = Math.min(xx + 8, x + TILE);
        // Tile body (rounded cap).
        px(c, sx, y + r,     ex - sx, 5, base);
        px(c, sx + 1, y + r, Math.max(0, ex - sx - 2), 1, light);
        // Tile shadow line.
        px(c, sx, y + r + 5, ex - sx, 1, dark);
        // Tile right edge shadow.
        if (ex < x + TILE) px(c, ex - 1, y + r, 1, 5, dark);
      }
    }
  }

  regTile('+', 'roof_blue',       TILE, TILE, (c, x, y) => tiledRoof(c, x, y, '#4878d8', '#2050a8', '#88c0f0'));
  regTile('=', 'roof_terracotta', TILE, TILE, (c, x, y) => tiledRoof(c, x, y, '#c84818', '#802018', '#f08838'));
  regTile('&', 'roof_slate',      TILE, TILE, (c, x, y) => tiledRoof(c, x, y, '#383848', '#181828', '#585870'));

  regTile('-', 'roof_thatched', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#c8a838');
    px(c, x, y, TILE, 3, '#604818');
    px(c, x, y + TILE - 3, TILE, 3, '#604818');
    // Vertical thatch streaks.
    for (let i = 0; i < TILE; i += 2) {
      px(c, x + i, y + 3, 1, TILE - 6, '#806818');
    }
    // Bright wisps.
    px(c, x + 4,  y + 8,  1, 4, '#f0d870');
    px(c, x + 18, y + 12, 1, 5, '#f0d870');
    px(c, x + 26, y + 6,  1, 4, '#f0d870');
  });

  regTile('*', 'roof_dome', TILE, TILE, (c, x, y) => {
    // Dome = circular section with vertical highlights.
    px(c, x, y, TILE, TILE, '#6840a8');
    // Curved top with gradient bands.
    for (let r = 0; r < 14; r++) {
      const w = Math.round(Math.sqrt(Math.max(0, 196 - (r - 7) * (r - 7) * 2)));
      const yy = y + r;
      const half = Math.min(15, w);
      const col = r < 4 ? '#a878d0' : (r < 9 ? '#8858c0' : '#6840a8');
      px(c, x + 16 - half, yy, half * 2, 1, col);
    }
    // Highlight streak.
    px(c, x + 12, y + 2, 2, 10, '#e0c0f8');
    px(c, x + 14, y + 4, 1, 6,  '#fff');
    // Pinnacle.
    px(c, x + 14, y, 4, 2, '#f0c020');
    px(c, x + 15, y - 1 < 0 ? y : y - 1, 2, 1, '#f8e040');
    // Dark eave.
    px(c, x, y + TILE - 3, TILE, 3, '#381860');
  });

  regTile('%', 'roof_snow', TILE, TILE, (c, x, y) => {
    // Wood roof under snow blanket.
    px(c, x, y + 12, TILE, TILE - 12, '#5a3818');
    for (let r = 14; r < TILE; r += 4) px(c, x, y + r, TILE, 1, '#3a2410');
    // Snow blanket on top half.
    px(c, x, y, TILE, 13, '#fff');
    // Soft scalloped lower edge.
    for (let i = 0; i < TILE; i += 4) {
      px(c, x + i,     y + 13, 2, 1, '#fff');
      px(c, x + i + 2, y + 12, 2, 1, '#fff');
    }
    // Drip icicles.
    px(c, x + 4,  y + 14, 1, 3, '#e8f0ff');
    px(c, x + 12, y + 14, 1, 4, '#e8f0ff');
    px(c, x + 22, y + 13, 1, 3, '#e8f0ff');
    // Eave.
    px(c, x, y + TILE - 2, TILE, 2, '#3a2410');
  });

  regTile('7', 'roof_moss', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#487830');
    px(c, x, y, TILE, 3, '#284818');
    px(c, x, y + TILE - 3, TILE, 3, '#284818');
    // Moss patches.
    disc(c, x + 6,  y + 10, 4, '#78a850');
    disc(c, x + 22, y + 12, 4, '#78a850');
    disc(c, x + 14, y + 22, 5, '#78a850');
    px(c, x + 4,  y + 8,  2, 1, '#a8c878');
    px(c, x + 21, y + 10, 2, 1, '#a8c878');
    // Subtle shingle hint.
    for (let r = 6; r < TILE - 4; r += 6) px(c, x, y + r, TILE, 1, '#3a6028');
  });

  regTile('8', 'roof_leaf', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#208828');
    // Layered leaf rows.
    for (let r = 0; r < TILE; r += 8) {
      px(c, x, y + r,     TILE, 5, '#50c050');
      px(c, x, y + r + 5, TILE, 1, '#103810');
      // Leaf vein dots.
      for (let i = 0; i < TILE; i += 4) {
        px(c, x + i + ((r >> 3) & 1) * 2, y + r + 2, 1, 1, '#103810');
      }
    }
    px(c, x, y + TILE - 2, TILE, 2, '#103810');
  });

  // ------------------------------------------------------------------
  // === WALLS ========================================================
  // ------------------------------------------------------------------

  regTile('#', 'wall_stone', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#98908a');
    // 8x8 cell grid with offset rows for staggered blocks.
    for (let r = 0; r < TILE; r += 8) {
      px(c, x, y + r, TILE, 1, '#685858');
      const off = ((r >> 3) & 1) ? 8 : 0;
      for (let i = off; i < TILE; i += 16) {
        px(c, x + i, y + r + 1, 1, 7, '#685858');
      }
    }
    // Highlight tops of stones.
    for (let r = 0; r < TILE; r += 8) {
      const off = ((r >> 3) & 1) ? 8 : 0;
      for (let i = off; i < TILE; i += 16) {
        px(c, x + i + 1, y + r + 1, 14, 1, '#b8b0aa');
      }
    }
    // Speckles.
    stipple(c, x, y, TILE, TILE, '#605850', 14, x * 5 + y * 3);
  });

  regTile('@', 'wall_timber', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#806038');
    // Vertical planks.
    for (let i = 0; i < TILE; i += 4) {
      px(c, x + i,     y, 1, TILE, '#604020');
      px(c, x + i + 1, y + 2, 1, TILE - 4, '#a08858');
    }
    // Top/bottom trim.
    px(c, x, y, TILE, 2, '#382008');
    px(c, x, y + TILE - 2, TILE, 2, '#382008');
    // Knots.
    px(c, x + 5,  y + 12, 1, 1, '#382008');
    px(c, x + 21, y + 22, 1, 1, '#382008');
  });

  regTile('$', 'wall_brick', TILE, TILE, (c, x, y) => {
    brickPattern(c, x, y, '#a83838', '#602820', '#c85048');
  });

  regTile('?', 'wall_log', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#806838');
    // Horizontal log seams every 8 px.
    for (let r = 0; r < TILE; r += 8) {
      px(c, x, y + r,     TILE, 1, '#604018');
      px(c, x, y + r + 7, TILE, 1, '#382008');
      // Highlight.
      px(c, x, y + r + 1, TILE, 1, '#a08858');
    }
    // Log knots (round darker).
    disc(c, x + 6,  y + 4,  1, '#382008');
    disc(c, x + 22, y + 12, 1, '#382008');
    disc(c, x + 14, y + 28, 1, '#382008');
  });

  regTile('!', 'wall_white', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#f0e8d8');
    // Subtle vertical seams.
    for (let i = 8; i < TILE; i += 8) px(c, x + i, y + 1, 1, TILE - 2, '#c8c0b0');
    // Sparkles.
    stipple(c, x, y, TILE, TILE, '#fff', 12, x * 7 + y * 3);
    // Trim.
    px(c, x, y, TILE, 1, '#a8a098');
    px(c, x, y + TILE - 1, TILE, 1, '#a8a098');
  });

  regTile('0', 'wall_lattice', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#80582a');
    // Diagonal lattice strands both ways.
    for (let i = -TILE; i < TILE * 2; i += 6) {
      for (let j = 0; j < TILE; j++) {
        const xx1 = i + j, yy1 = j;
        if (xx1 >= 0 && xx1 < TILE) px(c, x + xx1, y + yy1, 1, 1, '#403018');
        const xx2 = i + j, yy2 = TILE - 1 - j;
        if (xx2 >= 0 && xx2 < TILE && yy2 >= 0) px(c, x + xx2, y + yy2, 1, 1, '#403018');
      }
    }
    // Border.
    px(c, x, y, TILE, 1, '#403020');
    px(c, x, y + TILE - 1, TILE, 1, '#403020');
    px(c, x, y, 1, TILE, '#403020');
    px(c, x + TILE - 1, y, 1, TILE, '#403020');
  });

  // ------------------------------------------------------------------
  // === DOORS / WINDOWS / CHIMNEYS ==================================
  // ------------------------------------------------------------------

  regTile('d', 'door_blue', TILE, TILE, (c, x, y) => {
    // Door frame (slightly recessed); wall material is supplied by the map tile beneath.
    px(c, x + 5,  y + 3,  22, 28, '#382410');
    // Door body.
    px(c, x + 7,  y + 5,  18, 26, '#4878d8');
    // Vertical panel grooves.
    px(c, x + 16, y + 5,  1, 26, '#2050a8');
    // Top/bottom panel highlights.
    px(c, x + 8,  y + 6,  16, 1, '#88c0f0');
    px(c, x + 8,  y + 28, 16, 1, '#2050a8');
    // Inset panel lines.
    px(c, x + 9,  y + 12, 14, 1, '#2050a8');
    px(c, x + 9,  y + 20, 14, 1, '#2050a8');
    px(c, x + 9,  y + 13, 14, 1, '#88c0f0');
    px(c, x + 9,  y + 21, 14, 1, '#88c0f0');
    // Knob.
    disc(c, x + 22, y + 18, 1, '#f0c020');
    px(c, x + 22, y + 17, 1, 1, '#fff8a0');
  });

  regTile('f', 'door_shop', TILE, TILE, (c, x, y) => {
    // Striped awning across top.
    for (let i = 0; i < TILE; i += 4) {
      px(c, x + i,     y, 2, 8, '#a83838');
      px(c, x + i + 2, y, 2, 8, '#f0d8d0');
    }
    // Awning bottom edge scallops.
    for (let i = 0; i < TILE; i += 4) {
      px(c, x + i,     y + 8, 2, 1, '#a83838');
      px(c, x + i + 2, y + 8, 2, 1, '#f0d8d0');
    }
    // Awning trim.
    px(c, x, y, TILE, 1, '#382008');
    px(c, x, y + 9, TILE, 1, '#382008');
    // Door frame.
    px(c, x + 5, y + 11, 22, 21, '#382410');
    // Door body.
    px(c, x + 7, y + 13, 18, 19, '#a86838');
    px(c, x + 7, y + 13, 18, 1,  '#f0d8a8');
    px(c, x + 7, y + 31, 18, 1,  '#604028');
    // Glass panel (top half of door).
    px(c, x + 9, y + 15, 14, 8, '#88c0f0');
    px(c, x + 9, y + 15, 14, 1, '#382410');
    px(c, x + 9, y + 22, 14, 1, '#382410');
    px(c, x + 15, y + 15, 1, 8, '#382410');
    // Knob.
    disc(c, x + 22, y + 27, 1, '#f0c020');
  });

  // Window panes: '[' = left half of a window, ']' = right half.
  // The wall material is transparent so the renderer can match the host building.
  regTile('[', 'window_left', TILE, TILE, (c, x, y) => {
    // Window: occupies right half of tile (so paired with windowR forms one window).
    px(c, x + 16, y + 6,  16, 18, '#382410');
    px(c, x + 18, y + 8,  14, 14, '#88c0f0');
    // Cross mullion.
    px(c, x + 24, y + 8,  1, 14, '#382410');
    px(c, x + 18, y + 14, 14, 1, '#382410');
    // Glass shine in upper-left pane.
    px(c, x + 19, y + 9,  3, 1, '#fff');
    px(c, x + 19, y + 10, 1, 2, '#fff');
    // Sill (extends below).
    px(c, x + 14, y + 24, 18, 2, '#5a3818');
    px(c, x + 14, y + 24, 18, 1, '#806838');
  });

  regTile(']', 'window_right', TILE, TILE, (c, x, y) => {
    // Window: occupies left half of tile.
    px(c, x,      y + 6,  16, 18, '#382410');
    px(c, x,      y + 8,  14, 14, '#88c0f0');
    // Cross mullion.
    px(c, x + 7,  y + 8,  1, 14, '#382410');
    px(c, x,      y + 14, 14, 1, '#382410');
    // Glass shine.
    px(c, x + 1,  y + 9,  3, 1, '#fff');
    px(c, x + 1,  y + 10, 1, 2, '#fff');
    // Sill.
    px(c, x,      y + 24, 18, 2, '#5a3818');
    px(c, x,      y + 24, 18, 1, '#806838');
  });

  regTile('(', 'chimney', TILE, TILE, (c, x, y) => {
    // Sky / wall background (transparent-ish gray).
    px(c, x, y, TILE, TILE, '#a8b8d0');
    // Brick chimney body in lower 26px.
    px(c, x + 10, y + 10, 12, 22, '#a83838');
    px(c, x + 10, y + 10, 12, 1,  '#382008');
    // Mortar courses.
    for (let r = 14; r < TILE; r += 6) px(c, x + 10, y + r, 12, 1, '#602820');
    // Vertical seams alternating.
    for (let r = 8; r < TILE; r += 6) {
      const off = ((r / 6) & 1) ? 6 : 0;
      px(c, x + 14 + off, y + r, 1, 5, '#602820');
    }
    // Chimney cap.
    px(c, x + 8,  y + 8,  16, 4, '#4a3a30');
    px(c, x + 8,  y + 8,  16, 1, '#1a0e08');
    // Smoke puffs above.
    disc(c, x + 16, y + 4,  3, '#c8c8c8');
    disc(c, x + 21, y + 1,  2, '#a8a8a8');
    disc(c, x + 12, y + 1,  2, '#888888');
  });

  regTile(')', 'smokestack', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#a8b8d0');
    // Industrial smokestack: tall narrow column.
    px(c, x + 12, y + 4, 8, 28, '#585858');
    px(c, x + 12, y + 4, 1, 28, '#383838');
    px(c, x + 19, y + 4, 1, 28, '#787878');
    // Bands (red).
    px(c, x + 12, y + 10, 8, 2, '#a83838');
    px(c, x + 12, y + 20, 8, 2, '#a83838');
    // Cap.
    px(c, x + 10, y + 4,  12, 2, '#383838');
    // Smoke plume.
    disc(c, x + 16, y + 1,  3, '#c8c8c8');
    disc(c, x + 21, y - 1 < 0 ? y : y - 1, 2, '#a8a8a8');
    disc(c, x + 11, y - 1 < 0 ? y : y - 1, 2, '#a8a8a8');
  });

  // ------------------------------------------------------------------
  // === DECORATIONS ==================================================
  // ------------------------------------------------------------------

  regTile('<', 'bench', TILE, TILE, (c, x, y) => {
    grassBase(c, x, y);
    // Backrest slats.
    px(c, x + 3,  y + 6,  TILE - 6, 1, '#a08858');
    px(c, x + 3,  y + 7,  TILE - 6, 1, '#806038');
    px(c, x + 4,  y + 8,  1, 8, '#806038');
    px(c, x + TILE - 5, y + 8, 1, 8, '#806038');
    // Seat plank.
    px(c, x + 2,  y + 14, TILE - 4, 4, '#806038');
    px(c, x + 2,  y + 14, TILE - 4, 1, '#a08858');
    px(c, x + 2,  y + 17, TILE - 4, 1, '#382008');
    // Stone legs.
    px(c, x + 4,  y + 18, 3, 8, '#88807a');
    px(c, x + TILE - 7, y + 18, 3, 8, '#88807a');
    px(c, x + 4,  y + 18, 3, 1, '#c8c0b8');
    px(c, x + TILE - 7, y + 18, 3, 1, '#c8c0b8');
  });

  regTile('|', 'street_lamp', TILE, TILE, (c, x, y) => {
    grassBase(c, x, y);
    // Tall post.
    px(c, x + 15, y + 8,  2, 22, '#383028');
    px(c, x + 15, y + 30, 2, 1, '#1a1410');
    // Base.
    px(c, x + 12, y + 28, 8, 3, '#383028');
    px(c, x + 12, y + 28, 8, 1, '#585048');
    // Cross-arm cap.
    px(c, x + 11, y + 5,  10, 3, '#1a1410');
    px(c, x + 12, y + 5,  8, 1, '#383028');
    // Lamp head (warm glow).
    px(c, x + 12, y + 1,  8, 6, '#383028');
    px(c, x + 13, y + 2,  6, 4, '#f8e040');
    px(c, x + 14, y + 3,  4, 2, '#fff8a0');
    // Light halo (subtle).
    px(c, x + 11, y + 4, 1, 1, '#f8d040');
    px(c, x + 20, y + 4, 1, 1, '#f8d040');
  });

  regTile('~', 'hydrant', TILE, TILE, (c, x, y) => {
    grassBase(c, x, y);
    // Body.
    px(c, x + 11, y + 12, 10, 16, '#c01818');
    px(c, x + 9,  y + 16, 14, 8,  '#c01818');
    // Top dome.
    disc(c, x + 16, y + 11, 4, '#c01818');
    px(c, x + 11, y + 12, 10, 1, '#5a0808');
    // Highlight stripe.
    px(c, x + 13, y + 14, 1, 10, '#e84030');
    // Side caps.
    px(c, x + 7,  y + 18, 2, 5, '#a01010');
    px(c, x + 23, y + 18, 2, 5, '#a01010');
    px(c, x + 7,  y + 19, 2, 1, '#f8d030');
    px(c, x + 23, y + 19, 2, 1, '#f8d030');
    // Bolts.
    disc(c, x + 16, y + 13, 1, '#f8d030');
    // Base.
    px(c, x + 10, y + 28, 12, 3, '#5a0808');
    px(c, x + 10, y + 28, 12, 1, '#383028');
  });

  regTile('{', 'flower_pot', TILE, TILE, (c, x, y) => {
    grassBase(c, x, y);
    // Pot.
    px(c, x + 9,  y + 18, 14, 12, '#a04830');
    px(c, x + 7,  y + 18, 18, 4,  '#a04830');
    px(c, x + 7,  y + 18, 18, 2,  '#5a2818');
    px(c, x + 11, y + 22, 10, 2,  '#c87038');
    // Soil rim.
    px(c, x + 11, y + 17, 10, 1, '#3a2410');
    // Stems.
    px(c, x + 12, y + 8,  1, 10, '#3a8830');
    px(c, x + 18, y + 6,  1, 12, '#3a8830');
    px(c, x + 14, y + 10, 1, 8,  '#3a8830');
    // Blossoms.
    disc(c, x + 11, y + 6,  2, '#e83838');
    disc(c, x + 12, y + 5,  1, '#f8a8a8');
    disc(c, x + 18, y + 4,  2, '#f8d030');
    disc(c, x + 19, y + 3,  1, '#fff080');
    disc(c, x + 22, y + 9,  2, '#a040c0');
    px(c, x + 22, y + 8, 1, 1, '#d088f0');
  });

  regTile('>', 'shelf', TILE, TILE, (c, x, y) => {
    // Base floor under shelf.
    px(c, x, y, TILE, TILE, '#d8c098');
    // Shelf frame.
    px(c, x + 1,  y + 1,  TILE - 2, TILE - 2, '#a06840');
    px(c, x + 1,  y + 1,  TILE - 2, 2, '#604018');
    px(c, x + 1,  y + TILE - 3, TILE - 2, 2, '#604018');
    px(c, x + 1,  y + 1,  2, TILE - 2, '#604018');
    px(c, x + TILE - 3, y + 1, 2, TILE - 2, '#604018');
    // Shelf rails (3 levels).
    px(c, x + 3,  y + 11, TILE - 6, 1, '#604018');
    px(c, x + 3,  y + 21, TILE - 6, 1, '#604018');
    // Items level 1: bottles.
    px(c, x + 4,  y + 5,  3, 5, '#3050a8'); px(c, x + 4, y + 5, 3, 1, '#88a8e8');
    px(c, x + 9,  y + 5,  3, 5, '#a02828'); px(c, x + 9, y + 5, 3, 1, '#e85060');
    px(c, x + 14, y + 5,  3, 5, '#48a838'); px(c, x + 14, y + 5, 3, 1, '#88e068');
    px(c, x + 19, y + 5,  3, 5, '#f0c020'); px(c, x + 19, y + 5, 3, 1, '#fff080');
    px(c, x + 24, y + 5,  3, 5, '#a040c0'); px(c, x + 24, y + 5, 3, 1, '#d088f0');
    // Items level 2: poké-balls.
    for (let i = 0; i < 5; i++) {
      const bx = x + 4 + i * 5;
      const by = y + 14;
      disc(c, bx + 1, by + 2, 2, '#e0e0e0');
      px(c, bx, by, 4, 2, '#e83838');
      px(c, bx + 1, by + 2, 2, 1, '#202020');
      px(c, bx + 1, by + 1, 1, 1, '#fff');
    }
    // Items level 3: boxes.
    px(c, x + 4,  y + 24, 6, 5, '#806838');
    px(c, x + 4,  y + 24, 6, 1, '#a08858');
    px(c, x + 12, y + 24, 8, 5, '#806838');
    px(c, x + 12, y + 24, 8, 1, '#a08858');
    px(c, x + 22, y + 24, 6, 5, '#806838');
    px(c, x + 22, y + 24, 6, 1, '#a08858');
  });

  // ------------------------------------------------------------------
  // === SIGNS, LEDGES, COLORED MARKERS ===============================
  // ------------------------------------------------------------------

  regTile('S', 'sign', TILE, TILE, (c, x, y) => {
    grassBase(c, x, y);
    // Post.
    px(c, x + 14, y + 22, 4, 10, '#604028');
    px(c, x + 14, y + 22, 1, 10, '#382008');
    // Board.
    px(c, x + 4,  y + 8,  24, 14, '#604028');
    px(c, x + 5,  y + 9,  22, 12, '#a87038');
    px(c, x + 5,  y + 9,  22, 1,  '#d8a868');
    px(c, x + 5,  y + 20, 22, 1,  '#382008');
    // Text-like marks.
    px(c, x + 8,  y + 12, 4, 1, '#fff');
    px(c, x + 14, y + 12, 6, 1, '#fff');
    px(c, x + 22, y + 12, 3, 1, '#fff');
    px(c, x + 8,  y + 16, 12, 1, '#fff');
    px(c, x + 22, y + 16, 3, 1, '#fff');
    // Nail studs.
    px(c, x + 6,  y + 10, 1, 1, '#382008');
    px(c, x + 25, y + 10, 1, 1, '#382008');
  });

  // Grass + ledge: walkable grass tile with a clear visible ledge band
  // along its bottom edge (drop-down boundary).
  regTile('L', 'grass_ledge', TILE, TILE, (c, x, y) => {
    grassBase(c, x, y);
    // Dirt drop band.
    px(c, x, y + TILE - 6, TILE, 6, '#604028');
    px(c, x, y + TILE - 6, TILE, 1, '#3a2410');
    // Lighter face.
    for (let i = 0; i < TILE; i += 4) {
      px(c, x + i, y + TILE - 5, 2, 1, '#806848');
    }
    // Cast shadow at base.
    px(c, x, y + TILE - 1, TILE, 1, '#3a2410');
  });

  // Generic dark interior door (e.g. cave/building entrance).
  regTile('D', 'door_dark', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#2a1a10');
    px(c, x + 4,  y + 4,  24, 26, '#604028');
    px(c, x + 6,  y + 6,  20, 22, '#a86838');
    px(c, x + 6,  y + 6,  20, 1,  '#d8a868');
    px(c, x + 6,  y + 27, 20, 1,  '#382008');
    // Vertical seam.
    px(c, x + 16, y + 6, 1, 22, '#604028');
    // Studs.
    disc(c, x + 10, y + 10, 1, '#f0c020');
    disc(c, x + 22, y + 10, 1, '#f0c020');
    disc(c, x + 10, y + 24, 1, '#f0c020');
    disc(c, x + 22, y + 24, 1, '#f0c020');
    // Knob.
    disc(c, x + 22, y + 17, 1, '#f0d030');
  });

  // Solid colored markers (used for region/place colour coding).
  // Each is just a shaded solid block with a top contrast band.
  function markerTile(c, x, y, base, top) {
    px(c, x, y, TILE, TILE, base);
    px(c, x, y, TILE, 6, top);
    px(c, x, y + 5, TILE, 1, '#0008');
    // Subtle pixel texture.
    stipple(c, x + 1, y + 7, TILE - 2, TILE - 8, top, 16, x * 11 + y * 5);
  }
  regTile('R', 'marker_red',    TILE, TILE, (c, x, y) => markerTile(c, x, y, '#c84848', '#a02828'));
  regTile('B', 'marker_brown',  TILE, TILE, (c, x, y) => markerTile(c, x, y, '#a08068', '#705038'));
  regTile('P', 'marker_pink',   TILE, TILE, (c, x, y) => markerTile(c, x, y, '#e070a0', '#b04878'));
  regTile('M', 'marker_blue',   TILE, TILE, (c, x, y) => markerTile(c, x, y, '#4878d8', '#3050a8'));
  regTile('C', 'marker_tan',    TILE, TILE, (c, x, y) => markerTile(c, x, y, '#c89858', '#604028'));
  regTile('r', 'marker_redalt', TILE, TILE, (c, x, y) => markerTile(c, x, y, '#c05858', '#a04848'));

  // Hospital tile: pink with white cross.
  regTile('H', 'hospital', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#e8a8c8');
    px(c, x, y, TILE, 6, '#c87898');
    px(c, x, y + 5, TILE, 1, '#0008');
    // White cross.
    px(c, x + 8,  y + 10, 16, 16, '#fff');
    px(c, x + 8,  y + 10, 16, 1, '#e0c0d0');
    // Red plus.
    px(c, x + 14, y + 12, 4, 12, '#e85a5a');
    px(c, x + 10, y + 16, 12, 4, '#e85a5a');
    px(c, x + 14, y + 12, 1, 12, '#a82828');
    px(c, x + 10, y + 16, 12, 1, '#a82828');
  });

  // ------------------------------------------------------------------
  // === BUILDING / DECORATION TILES (deployed branch additions) ======
  // Codes R B P M C H D ( ) were colour markers in the earlier draft of
  // this file but are dedicated tiles in the v0.14.3 deployed branch.
  // Because regTile pushes to the end of TILES, these later registrations
  // win in the tile_code_to_key map emitted by the generator.
  // ------------------------------------------------------------------

  regTile('R', 'house_roof', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#a8c0e8');
    px(c, x, y + 4, TILE, 4, '#7a1f1f');
    px(c, x, y + 8, TILE, 18, '#c84848');
    px(c, x, y + 8, TILE, 2, '#e06868');
    for (let row = 0; row < 4; row++) {
      const oy = y + 12 + row * 3;
      const off = (row & 1) * 4;
      for (let i = -1; i < 5; i++) {
        const xx = x + i * 8 + off;
        const sxx = Math.max(xx, x);
        const exx = Math.min(xx + 6, x + TILE);
        if (exx > sxx) px(c, sxx, oy, exx - sxx, 2, '#a02828');
      }
    }
    px(c, x, y + 26, TILE, 2, '#5a1010');
    px(c, x, y + 28, TILE, 4, '#3a0a0a');
  });

  regTile('B', 'house_wall', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#e8d8b0');
    for (let r = 6; r < TILE; r += 7) px(c, x, y + r, TILE, 1, '#c8b070');
    for (let i = 8; i < TILE; i += 16) px(c, x + i, y, 1, TILE, '#c8b070');
    px(c, x, y, TILE, 2, '#a08858');
    px(c, x, y + TILE - 2, TILE, 2, '#806838');
    stipple(c, x, y, TILE, TILE, '#fff8e0', 12, x * 5 + y * 11);
    stipple(c, x, y, TILE, TILE, '#a08858', 8, x * 11 + y * 5);
  });

  regTile('P', 'center_roof', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#a8c0e8');
    px(c, x, y + 4, TILE, 4, '#a02858');
    px(c, x, y + 8, TILE, 18, '#e070a0');
    px(c, x, y + 8, TILE, 2, '#f898c0');
    for (let row = 0; row < 4; row++) {
      const oy = y + 12 + row * 3;
      const off = (row & 1) * 4;
      for (let i = -1; i < 5; i++) {
        const xx = x + i * 8 + off;
        const sxx = Math.max(xx, x);
        const exx = Math.min(xx + 6, x + TILE);
        if (exx > sxx) px(c, sxx, oy, exx - sxx, 2, '#b04878');
      }
    }
    px(c, x, y + 26, TILE, 2, '#7a1f48');
    px(c, x, y + 28, TILE, 4, '#5a103a');
  });

  regTile('M', 'mart_roof', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#a8c0e8');
    px(c, x, y + 4, TILE, 4, '#1a2860');
    px(c, x, y + 8, TILE, 18, '#4878d8');
    px(c, x, y + 8, TILE, 2, '#88b8f0');
    for (let row = 0; row < 4; row++) {
      const oy = y + 12 + row * 3;
      const off = (row & 1) * 4;
      for (let i = -1; i < 5; i++) {
        const xx = x + i * 8 + off;
        const sxx = Math.max(xx, x);
        const exx = Math.min(xx + 6, x + TILE);
        if (exx > sxx) px(c, sxx, oy, exx - sxx, 2, '#2050a8');
      }
    }
    px(c, x, y + 26, TILE, 2, '#1a2860');
    px(c, x, y + 28, TILE, 4, '#101840');
  });

  regTile('C', 'counter', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#d8c098');
    px(c, x, y + 10, TILE, 14, '#a83838');
    px(c, x, y + 10, TILE, 2, '#7a1f1f');
    px(c, x, y + 22, TILE, 2, '#5a1010');
    px(c, x, y + 24, TILE, 1, '#382008');
    px(c, x, y + 6, TILE, 4, '#c8a868');
    px(c, x, y + 6, TILE, 1, '#f0d8a8');
    for (let i = 4; i < TILE; i += 8) px(c, x + i, y + 12, 1, 8, '#7a1f1f');
  });

  regTile('H', 'heal_pad', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#d8c098');
    px(c, x + 2, y + 6, TILE - 4, TILE - 12, '#e8a8c8');
    px(c, x + 2, y + 6, TILE - 4, 1, '#fff');
    px(c, x + 2, y + 6, 1, TILE - 12, '#fff');
    px(c, x + TILE - 3, y + 6, 1, TILE - 12, '#a06888');
    px(c, x + 2, y + TILE - 7, TILE - 4, 1, '#a06888');
    disc(c, x + 11, y + 16, 3, '#a06888');
    disc(c, x + 11, y + 16, 2, '#fff');
    disc(c, x + 11, y + 16, 1, '#e83838');
    disc(c, x + 21, y + 16, 3, '#a06888');
    disc(c, x + 21, y + 16, 2, '#fff');
    disc(c, x + 21, y + 16, 1, '#e83838');
  });

  regTile('D', 'house_door', TILE, TILE, (c, x, y) => {
    px(c, x + 4, y + 2, 24, 30, '#604028');
    px(c, x + 6, y + 4, 20, 28, '#a86838');
    px(c, x + 6, y + 4, 20, 2, '#d8a868');
    px(c, x + 15, y + 6, 2, 24, '#604028');
    px(c, x + 8, y + 8, 6, 8, '#c08858');
    px(c, x + 18, y + 8, 6, 8, '#c08858');
    px(c, x + 8, y + 18, 6, 10, '#c08858');
    px(c, x + 18, y + 18, 6, 10, '#c08858');
    px(c, x + 8, y + 8, 6, 1, '#604028');
    px(c, x + 18, y + 8, 6, 1, '#604028');
    px(c, x + 8, y + 15, 6, 1, '#604028');
    px(c, x + 18, y + 15, 6, 1, '#604028');
    disc(c, x + 22, y + 19, 1, '#f0c020');
  });

  regTile('(', 'small_rock', TILE, TILE, (c, x, y) => {
    grassBase(c, x, y);
    disc(c, x + 16, y + 22, 5, '#88807a');
    disc(c, x + 14, y + 20, 4, '#a8a098');
    px(c, x + 12, y + 19, 2, 1, '#c8c0b8');
    px(c, x + 14, y + 22, 1, 1, '#605850');
    px(c, x + 18, y + 24, 1, 1, '#605850');
  });

  regTile(')', 'large_rock', TILE, TILE, (c, x, y) => {
    grassBase(c, x, y);
    disc(c, x + 16, y + 22, 9, '#605850');
    disc(c, x + 14, y + 20, 8, '#88807a');
    disc(c, x + 13, y + 19, 4, '#a8a098');
    px(c, x + 9, y + 18, 4, 1, '#c8c0b8');
    px(c, x + 12, y + 24, 5, 1, '#383028');
    px(c, x + 18, y + 26, 4, 1, '#383028');
    px(c, x + 20, y + 18, 1, 3, '#383028');
  });

  regTile('`', 'fence_h', TILE, TILE, (c, x, y) => {
    grassBase(c, x, y);
    px(c, x, y + 12, TILE, 3, '#a07840');
    px(c, x, y + 12, TILE, 1, '#d8a868');
    px(c, x, y + 14, TILE, 1, '#604018');
    px(c, x, y + 20, TILE, 3, '#a07840');
    px(c, x, y + 20, TILE, 1, '#d8a868');
    px(c, x, y + 22, TILE, 1, '#604018');
    for (const xx of [4, 16, 28]) {
      px(c, x + xx, y + 6, 3, 24, '#604028');
      px(c, x + xx, y + 6, 1, 24, '#382008');
      px(c, x + xx + 2, y + 6, 1, 24, '#806840');
      px(c, x + xx, y + 5, 3, 1, '#382008');
    }
  });

  regTile('"', 'fence_v', TILE, TILE, (c, x, y) => {
    grassBase(c, x, y);
    px(c, x + 14, y, 4, TILE, '#604028');
    px(c, x + 14, y, 1, TILE, '#382008');
    px(c, x + 17, y, 1, TILE, '#806840');
    px(c, x + 13, y + 2, 6, 1, '#382008');
    px(c, x + 6, y + 12, 20, 3, '#a07840');
    px(c, x + 6, y + 12, 20, 1, '#d8a868');
    px(c, x + 6, y + 20, 20, 3, '#a07840');
    px(c, x + 6, y + 20, 20, 1, '#d8a868');
  });

  regTile('\\', 'mailbox', TILE, TILE, (c, x, y) => {
    grassBase(c, x, y);
    px(c, x + 14, y + 18, 4, 14, '#604028');
    px(c, x + 14, y + 18, 1, 14, '#382008');
    px(c, x + 6, y + 8, 20, 12, '#3050a8');
    px(c, x + 6, y + 8, 20, 1, '#88a8e8');
    px(c, x + 6, y + 19, 20, 1, '#1a2860');
    px(c, x + 6, y + 8, 20, 2, '#5878c8');
    px(c, x + 9, y + 11, 14, 7, '#1a2860');
    px(c, x + 11, y + 13, 10, 4, '#3050a8');
    px(c, x + 12, y + 14, 8, 1, '#000');
    px(c, x + 24, y + 6, 4, 4, '#e83838');
    px(c, x + 24, y + 6, 4, 1, '#a01818');
    px(c, x + 26, y + 10, 1, 4, '#383028');
  });

  regTile('/', 'pc_terminal', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#d8c098');
    px(c, x + 4, y + 4, 24, 16, '#383028');
    px(c, x + 4, y + 4, 24, 1, '#585048');
    px(c, x + 4, y + 19, 24, 1, '#1a1410');
    px(c, x + 6, y + 6, 20, 12, '#88c0f0');
    px(c, x + 8, y + 8, 4, 1, '#fff');
    px(c, x + 8, y + 10, 8, 1, '#fff');
    px(c, x + 8, y + 12, 6, 1, '#fff');
    px(c, x + 18, y + 8, 3, 3, '#e83838');
    px(c, x + 18, y + 14, 6, 1, '#3a8030');
    px(c, x + 14, y + 20, 4, 4, '#383028');
    px(c, x + 8, y + 24, 16, 4, '#383028');
    px(c, x + 8, y + 24, 16, 1, '#585048');
    px(c, x + 24, y + 18, 1, 1, '#48f060');
  });

  regTile('9', 'vending', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#d8c098');
    px(c, x + 4, y + 2, 24, 28, '#a83838');
    px(c, x + 4, y + 2, 24, 2, '#5a1010');
    px(c, x + 4, y + 28, 24, 2, '#5a1010');
    px(c, x + 4, y + 2, 1, 28, '#7a1f1f');
    px(c, x + 27, y + 2, 1, 28, '#7a1f1f');
    px(c, x + 6, y + 5, 20, 8, '#88c0f0');
    px(c, x + 6, y + 5, 20, 1, '#1a2860');
    px(c, x + 8, y + 7, 3, 5, '#3050a8');
    px(c, x + 13, y + 7, 3, 5, '#48a838');
    px(c, x + 18, y + 7, 3, 5, '#f0c020');
    px(c, x + 22, y + 7, 3, 5, '#a040c0');
    for (let r = 0; r < 3; r++) {
      for (let cc = 0; cc < 4; cc++) {
        px(c, x + 6 + cc * 5, y + 15 + r * 4, 4, 3, '#fff');
        px(c, x + 7 + cc * 5, y + 16 + r * 4, 2, 1, '#202020');
      }
    }
    px(c, x + 8, y + 27, 16, 1, '#000');
  });

  regTile('}', 'potted_plant', TILE, TILE, (c, x, y) => {
    px(c, x, y, TILE, TILE, '#d8c098');
    px(c, x + 9, y + 18, 14, 12, '#a04830');
    px(c, x + 7, y + 18, 18, 4, '#a04830');
    px(c, x + 7, y + 18, 18, 2, '#5a2818');
    px(c, x + 11, y + 22, 10, 2, '#c87038');
    px(c, x + 11, y + 17, 10, 1, '#3a2410');
    disc(c, x + 12, y + 12, 5, '#3a8030');
    disc(c, x + 20, y + 10, 5, '#3a8030');
    disc(c, x + 16, y + 6, 5, '#3a8030');
    disc(c, x + 11, y + 11, 3, '#5cae4c');
    disc(c, x + 19, y + 9, 3, '#5cae4c');
    disc(c, x + 16, y + 5, 3, '#5cae4c');
    px(c, x + 16, y + 10, 1, 8, '#5a3818');
    px(c, x + 12, y + 9, 3, 1, '#a8d878');
    px(c, x + 18, y + 7, 3, 1, '#a8d878');
  });

  // Gardenbed (apostrophe '): tilled-soil patch with sprout rows. Used by
  // maps.js as a walkable decorative tile alongside flower pots. Without
  // this registration the runtime atlas falls back to plain grass.
  regTile("'", 'gardenbed', TILE, TILE, (c, x, y) => {
    // Surrounding grass margin so the bed sits on a green tile context.
    grassBase(c, x, y);
    // Tilled-soil rectangle.
    px(c, x + 2,  y + 4,  TILE - 4, TILE - 8, '#7a4824');
    // Bevel: lighter top + left edge, darker bottom + right.
    px(c, x + 2,  y + 4,  TILE - 4, 1, '#a8683a');
    px(c, x + 2,  y + 4,  1, TILE - 8, '#a8683a');
    px(c, x + 2,  y + TILE - 5, TILE - 4, 1, '#3a2410');
    px(c, x + TILE - 3, y + 4, 1, TILE - 8, '#3a2410');
    // Soil texture stipple.
    stipple(c, x + 3, y + 5, TILE - 6, TILE - 10, '#5a3818', 14, x * 11 + y * 7);
    stipple(c, x + 3, y + 5, TILE - 6, TILE - 10, '#a8683a', 8,  x * 7  + y * 11);
    // Sprout rows: three columns of small leaf clusters across two rows.
    const sproutXs = [8, 16, 24];
    const sproutYs = [10, 20];
    for (const sy of sproutYs) {
      for (const sx of sproutXs) {
        // Stem.
        px(c, x + sx,     y + sy,     1, 3, '#3a8030');
        // Pair of leaves.
        px(c, x + sx - 2, y + sy,     2, 1, '#5cae4c');
        px(c, x + sx + 1, y + sy,     2, 1, '#5cae4c');
        // Highlight.
        px(c, x + sx - 1, y + sy - 1, 1, 1, '#a8d878');
      }
    }
  });

  // ------------------------------------------------------------------
  // === GBA-INSPIRED OVERWORLD TILE REDO ==============================
  // These registrations intentionally come after the older art. The
  // generator keeps the last non-variant registration for each tile code,
  // so the runtime maps stay compatible while the atlas art is replaced.
  // ------------------------------------------------------------------

  const GBA = {
    outline:'#243018',
    grass:'#6fc45a', grassDark:'#3d8b3e', grassLight:'#a8e67a',
    dry:'#d6bd6c', dryDark:'#a8843d', dryLight:'#f0d78e',
    snow:'#edf8ff', snowBlue:'#b8d8e8', snowShadow:'#7ea6c4',
    dirt:'#c99b5b', dirtDark:'#8d6534', dirtLight:'#e7c47e',
    stone:'#aaa49a', stoneDark:'#716a63', stoneLight:'#d5d0c8',
    water:'#4f9ee8', waterDark:'#2670c4', waterLight:'#b8efff',
    cave:'#77635b', caveDark:'#423634', caveLight:'#a58f82',
    wallCream:'#f0d8a8', wallShadow:'#b98d58'
  };

  function gbaGrass(c, x, y, tone, opts) {
    opts = opts || {};
    const base = tone && tone.base || GBA.grass;
    const dark = tone && tone.dark || GBA.grassDark;
    const light = tone && tone.light || GBA.grassLight;
    px(c, x, y, TILE, TILE, base);
    for (let yy = 0; yy < TILE; yy += 8) px(c, x, y + yy, TILE, 1, dark);
    for (let i = 0; i < 18; i++) {
      const sx = (i * 11 + x * 3 + y) % 30;
      const sy = (i * 7 + x + y * 5) % 30;
      px(c, x + sx, y + sy, 2, 1, (i & 1) ? dark : light);
      if ((i % 4) === 0) px(c, x + sx + 1, y + sy - 1, 1, 1, light);
    }
    if (opts.flowers) {
      const cols = opts.flowerCols || ['#f06a8a', '#fff2a0', '#ffffff'];
      for (let i = 0; i < 5; i++) {
        const fx = x + 4 + ((i * 7) % 23);
        const fy = y + 5 + ((i * 11) % 22);
        px(c, fx, fy, 1, 1, cols[i % cols.length]);
      }
    }
  }

  function gbaTall(c, x, y) {
    gbaGrass(c, x, y, { base:'#4eaa43', dark:'#2f7834', light:'#84d16b' });
    for (let i = 0; i < 8; i++) {
      const bx = x + 2 + i * 4;
      const top = y + 8 + (i & 1) * 2;
      px(c, bx, top + 5, 3, 15, '#296c2e');
      px(c, bx + 1, top + 2, 1, 18, '#3f963f');
      px(c, bx + 1, top, 1, 4, '#9bea77');
      px(c, bx, top + 3, 1, 1, '#bdf19a');
    }
    px(c, x, y + 28, TILE, 2, '#2b6d30');
  }

  function gbaWater(c, x, y, alt) {
    px(c, x, y, TILE, TILE, alt ? '#5aaef0' : GBA.water);
    for (let yy = 0; yy < TILE; yy += 8) px(c, x, y + yy, TILE, 3, GBA.waterDark);
    const off = alt ? 5 : 0;
    for (let yy = 4; yy < TILE; yy += 8) {
      for (let xx = -8; xx < TILE; xx += 16) {
        px(c, x + xx + off, y + yy, 8, 1, GBA.waterLight);
        px(c, x + xx + off + 2, y + yy + 1, 5, 1, '#82d4ff');
      }
    }
  }

  function gbaSand(c, x, y, wet) {
    px(c, x, y, TILE, TILE, wet ? '#d7b26e' : '#e6c879');
    stipple(c, x + 1, y + 1, 30, 30, '#b98b45', 26, x * 5 + y * 13);
    stipple(c, x + 1, y + 1, 30, 30, '#fff0ae', 12, x * 13 + y * 5);
    px(c, x + 5, y + 9, 5, 1, '#bd8d47');
    px(c, x + 21, y + 22, 4, 1, '#bd8d47');
  }

  function gbaPath(c, x, y, pal, style) {
    pal = pal || { base:GBA.dirt, dark:GBA.dirtDark, light:GBA.dirtLight };
    px(c, x, y, TILE, TILE, pal.base);
    if (style === 'brick') {
      brickPattern(c, x, y, pal.base, pal.dark, pal.light);
      return;
    }
    if (style === 'plank') {
      px(c, x, y, TILE, TILE, pal.base);
      for (let yy = 0; yy < TILE; yy += 8) {
        px(c, x, y + yy + 7, TILE, 1, pal.dark);
        px(c, x, y + yy, TILE, 1, pal.light);
      }
      for (let xx = 8; xx < TILE; xx += 8) px(c, x + xx, y, 1, TILE, pal.dark);
      return;
    }
    if (style === 'stone') {
      px(c, x, y, TILE, TILE, pal.dark);
      for (let yy = 0; yy < TILE; yy += 8) {
        const off = (yy & 8) ? 4 : 0;
        for (let xx = -off; xx < TILE; xx += 8) {
          const sx = Math.max(0, xx);
          const ex = Math.min(TILE, xx + 8);
          if (ex <= sx) continue;
          px(c, x + sx, y + yy + 1, ex - sx - 1, 6, pal.base);
          px(c, x + sx, y + yy + 1, ex - sx - 1, 1, pal.light);
          px(c, x + sx, y + yy + 6, ex - sx - 1, 1, pal.dark);
        }
      }
      return;
    }
    stipple(c, x + 1, y + 1, 30, 30, pal.dark, 22, x * 3 + y * 7);
    stipple(c, x + 1, y + 1, 30, 30, pal.light, 12, x * 7 + y * 3);
    px(c, x + 6, y + 8, 4, 1, pal.dark);
    px(c, x + 20, y + 20, 6, 1, pal.dark);
  }

  function gbaTree(c, x, y, leaf, trunk, snow) {
    gbaGrass(c, x, y);
    px(c, x + 13, y + 18, 6, 12, trunk || '#765036');
    px(c, x + 13, y + 18, 2, 12, '#4d2f20');
    disc(c, x + 16, y + 10, 11, leaf);
    disc(c, x + 9, y + 15, 8, leaf);
    disc(c, x + 23, y + 15, 8, leaf);
    disc(c, x + 16, y + 18, 9, leaf);
    px(c, x + 9, y + 8, 7, 2, '#b7ef86');
    px(c, x + 6, y + 16, 4, 1, '#2d6e2f');
    px(c, x + 22, y + 20, 5, 1, '#2d6e2f');
    if (snow) {
      px(c, x + 8, y + 7, 16, 3, '#ffffff');
      px(c, x + 4, y + 15, 10, 2, '#ffffff');
      px(c, x + 18, y + 15, 10, 2, '#ffffff');
    }
    px(c, x + 6, y + 27, 20, 2, '#2f7834');
  }

  function gbaPalm(c, x, y) {
    gbaSand(c, x, y);
    for (let i = 0; i < 15; i++) px(c, x + 14 + (i >> 2), y + 14 + i, 4, 1, '#8b6038');
    const leaves = [[16,9,0], [10,12,0], [22,12,0], [8,8,0], [24,8,0]];
    for (const l of leaves) {
      disc(c, x + l[0], y + l[1], 7, '#2f9b4b');
      px(c, x + l[0] - 2, y + l[1] - 2, 6, 1, '#8ee46f');
    }
  }

  function gbaBush(c, x, y, pal, flowers) {
    gbaGrass(c, x, y);
    pal = pal || ['#286c2e', '#3f963f', '#8ee46f'];
    disc(c, x + 10, y + 20, 7, pal[1]);
    disc(c, x + 20, y + 20, 8, pal[1]);
    disc(c, x + 16, y + 16, 8, pal[1]);
    px(c, x + 6, y + 18, 4, 1, pal[2]);
    px(c, x + 17, y + 14, 5, 1, pal[2]);
    px(c, x + 8, y + 25, 17, 2, pal[0]);
    if (flowers) {
      const cols = flowers === 'berry' ? ['#d82d2d', '#ff7a4a'] :
        flowers === 'blue' ? ['#386ee8', '#cfe4ff'] :
        flowers === 'purple' ? ['#9c42c7', '#e0a8ff'] :
        ['#fff7b0', '#f26b8a'];
      px(c, x + 9, y + 18, 1, 1, cols[0]);
      px(c, x + 17, y + 16, 1, 1, cols[1]);
      px(c, x + 23, y + 22, 1, 1, cols[0]);
    }
  }

  function roofPalette(base, dark, light, eave) {
    return { base, dark, light, eave:eave || dark };
  }

  function gbaRoof(c, x, y, pal, pos, emblem) {
    px(c, x, y, TILE, TILE, pal.base);
    for (let yy = 3; yy < TILE - 4; yy += 6) {
      const off = ((yy / 6) | 0) & 1 ? 4 : 0;
      for (let xx = -off; xx < TILE; xx += 8) {
        px(c, x + xx, y + yy, 7, 4, pal.base);
        px(c, x + xx + 1, y + yy, 5, 1, pal.light);
        px(c, x + xx, y + yy + 4, 7, 1, pal.dark);
      }
    }
    if (pos.indexOf('top') !== -1) {
      px(c, x, y, TILE, 5, pal.dark);
      px(c, x, y + 1, TILE, 1, pal.light);
    }
    if (pos.indexOf('bottom') !== -1) {
      px(c, x, y + 24, TILE, 4, pal.eave);
      px(c, x, y + 28, TILE, 4, '#302820');
    }
    if (pos.indexOf('left') !== -1) px(c, x, y, 4, TILE, pal.dark);
    if (pos.indexOf('right') !== -1) px(c, x + 28, y, 4, TILE, pal.dark);
    if (emblem && (pos === 'center' || pos.indexOf('bottom') !== -1)) {
      px(c, x + 8, y + 10, 16, 9, '#fff8e8');
      px(c, x + 8, y + 10, 16, 1, '#403020');
      px(c, x + 8, y + 18, 16, 1, '#403020');
      if (emblem === 'center') {
        px(c, x + 14, y + 12, 4, 5, '#e94c5f');
        px(c, x + 11, y + 14, 10, 2, '#e94c5f');
      } else if (emblem === 'mart') {
        px(c, x + 11, y + 12, 2, 5, '#2f62c9');
        px(c, x + 14, y + 12, 4, 5, '#2f62c9');
        px(c, x + 19, y + 12, 2, 5, '#2f62c9');
      } else if (emblem === 'gym') {
        px(c, x + 11, y + 12, 10, 2, '#c48a24');
        px(c, x + 14, y + 14, 4, 3, '#c48a24');
      }
    }
  }

  function registerRoofSet(code, name, pal, emblem) {
    const draw = (pos) => (c, x, y) => gbaRoof(c, x, y, pal, pos, emblem);
    regTile(code, 'gba_' + name + '_roof', TILE, TILE, draw('center'));
    for (const pos of ['center','top','bottom','left','right','top_left','top_right','bottom_left','bottom_right']) {
      regTileVariant(code, 'gba_' + name + '_roof_' + pos, draw(pos), { context:pos });
    }
  }

  function gbaWall(c, x, y, pal, style, mark) {
    pal = pal || { base:GBA.wallCream, dark:GBA.wallShadow, light:'#fff0c8' };
    px(c, x, y, TILE, TILE, pal.base);
    if (style === 'brick') brickPattern(c, x, y, pal.base, pal.dark, pal.light);
    else if (style === 'wood') {
      for (let xx = 0; xx < TILE; xx += 6) {
        px(c, x + xx, y, 1, TILE, pal.dark);
        px(c, x + xx + 1, y + 2, 1, TILE - 4, pal.light);
      }
    } else if (style === 'log') {
      for (let yy = 0; yy < TILE; yy += 8) {
        px(c, x, y + yy, TILE, 1, pal.dark);
        px(c, x, y + yy + 1, TILE, 1, pal.light);
        px(c, x, y + yy + 7, TILE, 1, '#5f4327');
      }
    } else {
      for (let yy = 7; yy < TILE; yy += 8) px(c, x, y + yy, TILE, 1, pal.dark);
      for (let xx = 8; xx < TILE; xx += 16) px(c, x + xx, y, 1, TILE, pal.dark);
      stipple(c, x, y, TILE, TILE, pal.light, 8, x * 9 + y * 5);
    }
    px(c, x, y, TILE, 2, pal.dark);
    px(c, x, y + 30, TILE, 2, '#6e4d2f');
    if (mark) {
      px(c, x + 5, y + 9, 22, 9, '#fff8e8');
      px(c, x + 5, y + 9, 22, 1, '#403020');
      if (mark === 'center') {
        px(c, x + 14, y + 11, 4, 5, '#e94c5f');
        px(c, x + 11, y + 13, 10, 2, '#e94c5f');
      } else if (mark === 'mart') {
        px(c, x + 10, y + 11, 12, 5, '#2f62c9');
        px(c, x + 13, y + 12, 2, 4, '#fff8e8');
        px(c, x + 18, y + 12, 2, 4, '#fff8e8');
      }
    }
  }

  function gbaDoor(c, x, y, kind) {
    if (kind === 'shop') {
      for (let xx = 0; xx < TILE; xx += 4) px(c, x + xx, y + 2, 2, 8, (xx & 4) ? '#fff8e8' : '#e94c5f');
      px(c, x, y + 10, TILE, 2, '#403020');
    }
    px(c, x + 6, y + 8, 20, 24, '#5b3826');
    px(c, x + 8, y + 10, 16, 22, kind === 'dark' ? '#33251f' : '#9b633a');
    px(c, x + 10, y + 12, 12, 8, kind === 'shop' ? '#8fd8ff' : '#c9905d');
    px(c, x + 15, y + 10, 2, 22, '#5b3826');
    disc(c, x + 22, y + 22, 1, '#ffd45a');
  }

  function gbaWindow(c, x, y, side) {
    const wx = side === 'left' ? 15 : 1;
    px(c, x + wx, y + 8, 16, 14, '#3d2a20');
    px(c, x + wx + 2, y + 10, 12, 10, '#79c8ef');
    px(c, x + wx + 7, y + 10, 1, 10, '#3d2a20');
    px(c, x + wx + 2, y + 15, 12, 1, '#3d2a20');
    px(c, x + wx + 3, y + 11, 4, 1, '#ffffff');
    px(c, x + wx - 1, y + 22, 18, 2, '#8d6534');
  }

  function gbaSign(c, x, y, kind) {
    gbaGrass(c, x, y);
    px(c, x + 14, y + 22, 4, 10, '#6b442b');
    const colors = kind === 'mart' ? ['#2f62c9', '#fff8e8'] :
      kind === 'center' ? ['#e94c5f', '#fff8e8'] :
      kind === 'gym' ? ['#c48a24', '#fff8e8'] :
      ['#9b6a3a', '#fff0c8'];
    px(c, x + 4, y + 8, 24, 14, '#3d2a20');
    px(c, x + 5, y + 9, 22, 12, colors[0]);
    px(c, x + 6, y + 10, 20, 2, colors[1]);
    px(c, x + 8, y + 15, 16, 1, colors[1]);
    if (kind === 'center') {
      px(c, x + 14, y + 13, 4, 5, colors[1]);
      px(c, x + 11, y + 15, 10, 2, colors[1]);
    } else if (kind === 'mart') {
      px(c, x + 10, y + 13, 2, 5, colors[1]);
      px(c, x + 14, y + 13, 4, 5, colors[1]);
      px(c, x + 20, y + 13, 2, 5, colors[1]);
    }
  }

  function gbaFloor(c, x, y, base) {
    px(c, x, y, TILE, TILE, base || '#d8c18f');
    for (let yy = 0; yy < TILE; yy += 8) px(c, x, y + yy, TILE, 1, '#b99b65');
    for (let xx = 0; xx < TILE; xx += 8) px(c, x + xx, y, 1, TILE, '#b99b65');
    px(c, x + 1, y + 1, 6, 1, '#ecd7a5');
  }

  function gbaObjectBase(c, x, y, ground) {
    if (ground === 'floor') gbaFloor(c, x, y);
    else if (ground === 'sand') gbaSand(c, x, y);
    else gbaGrass(c, x, y);
  }

  // Terrain and path overrides.
  regTile('.', 'gba_grass', TILE, TILE, (c, x, y) => gbaGrass(c, x, y));
  regTile('X', 'gba_edge_grass', TILE, TILE, (c, x, y) => gbaGrass(c, x, y, { base:'#63b951', dark:'#36843a', light:'#97dc72' }));
  regTile('1', 'gba_flower_grass', TILE, TILE, (c, x, y) => gbaGrass(c, x, y, null, { flowers:true }));
  regTile('2', 'gba_light_grass', TILE, TILE, (c, x, y) => gbaGrass(c, x, y, { base:'#82d464', dark:'#5bae4e', light:'#b9ef8f' }));
  regTile('3', 'gba_dry_grass', TILE, TILE, (c, x, y) => gbaGrass(c, x, y, { base:GBA.dry, dark:GBA.dryDark, light:GBA.dryLight }));
  regTile('4', 'gba_lush_grass', TILE, TILE, (c, x, y) => gbaGrass(c, x, y, { base:'#3f963f', dark:'#286c2e', light:'#80d566' }));
  regTile(':', 'gba_tallgrass', TILE, TILE, gbaTall);
  regTile('s', 'gba_sand', TILE, TILE, (c, x, y) => gbaSand(c, x, y));
  regTile('W', 'gba_water', TILE, TILE, (c, x, y) => gbaWater(c, x, y));
  regTile('F', 'gba_floor', TILE, TILE, (c, x, y) => gbaFloor(c, x, y));
  regTile('r', 'gba_rug', TILE, TILE, (c, x, y) => { gbaFloor(c, x, y); px(c, x + 3, y + 5, 26, 22, '#c44d58'); px(c, x + 6, y + 8, 20, 16, '#e27b75'); px(c, x + 8, y + 10, 16, 1, '#fff0c8'); });
  regTile(',', 'gba_path_dirt_clean', TILE, TILE, (c, x, y) => gbaPath(c, x, y));
  regTile('_', 'gba_path_cobble_clean', TILE, TILE, (c, x, y) => gbaPath(c, x, y, { base:'#aaa49a', dark:'#716a63', light:'#d5d0c8' }, 'stone'));
  regTile('^', 'gba_path_dirt_deep', TILE, TILE, (c, x, y) => gbaPath(c, x, y, { base:'#a87442', dark:'#6c4528', light:'#d4a56b' }));
  regTile('o', 'gba_path_stepstone_clean', TILE, TILE, (c, x, y) => { gbaGrass(c, x, y); disc(c, x + 9, y + 10, 5, '#aaa49a'); disc(c, x + 22, y + 17, 5, '#aaa49a'); disc(c, x + 14, y + 25, 5, '#aaa49a'); });
  regTile(';', 'gba_path_gravel_clean', TILE, TILE, (c, x, y) => gbaPath(c, x, y, { base:'#b7b0a6', dark:'#746d65', light:'#e2ddd5' }));
  regTile('i', 'gba_path_redbrick_clean', TILE, TILE, (c, x, y) => gbaPath(c, x, y, { base:'#b54d42', dark:'#70332e', light:'#de7869' }, 'brick'));
  regTile('y', 'gba_path_yellowbrick_clean', TILE, TILE, (c, x, y) => gbaPath(c, x, y, { base:'#e0bd4d', dark:'#987330', light:'#ffe28a' }, 'brick'));
  regTile('p', 'gba_path_park_clean', TILE, TILE, (c, x, y) => gbaPath(c, x, y, { base:'#ead9a4', dark:'#b9a26d', light:'#fff2bf' }));
  regTile('q', 'gba_path_mosaic_clean', TILE, TILE, (c, x, y) => { gbaPath(c, x, y, { base:'#f0e8d8', dark:'#9d9489', light:'#ffffff' }, 'stone'); px(c, x + 7, y + 7, 6, 6, '#d65a5a'); px(c, x + 19, y + 7, 6, 6, '#5a8de8'); px(c, x + 7, y + 19, 6, 6, '#65b95a'); px(c, x + 19, y + 19, 6, 6, '#e0bd4d'); });
  regTile('t', 'gba_path_boardwalk_clean', TILE, TILE, (c, x, y) => gbaPath(c, x, y, { base:'#b77c45', dark:'#674223', light:'#e1ae70' }, 'plank'));
  regTile('u', 'gba_path_beach_clean', TILE, TILE, (c, x, y) => gbaSand(c, x, y));
  regTile('v', 'gba_path_rocky_clean', TILE, TILE, (c, x, y) => gbaPath(c, x, y, { base:'#91877d', dark:'#5f5650', light:'#c7beb2' }, 'stone'));
  regTile('w', 'gba_path_wetstone_clean', TILE, TILE, (c, x, y) => gbaPath(c, x, y, { base:'#7aa7ad', dark:'#4d747d', light:'#b8e2e8' }, 'stone'));
  regTile('x', 'gba_path_crossroads_clean', TILE, TILE, (c, x, y) => { gbaPath(c, x, y); px(c, x + 13, y, 6, TILE, '#e1b978'); px(c, x, y + 13, TILE, 6, '#e1b978'); });
  regTile('z', 'gba_path_moss_clean', TILE, TILE, (c, x, y) => gbaPath(c, x, y, { base:'#789954', dark:'#466832', light:'#a9cf78' }, 'stone'));
  regTile('a', 'gba_path_autumn_clean', TILE, TILE, (c, x, y) => gbaPath(c, x, y, { base:'#c88448', dark:'#8a4f28', light:'#eeb16d' }));
  regTile('A', 'gba_path_bridge_clean', TILE, TILE, (c, x, y) => gbaPath(c, x, y, { base:'#a36f3e', dark:'#5c3922', light:'#d69d5f' }, 'plank'));
  regTile('Z', 'gba_path_zen_clean', TILE, TILE, (c, x, y) => gbaPath(c, x, y, { base:'#d7d0bd', dark:'#9c9280', light:'#fff8e6' }, 'stone'));
  regTile('I', 'gba_path_lantern_clean', TILE, TILE, (c, x, y) => { gbaPath(c, x, y, { base:'#ead9a4', dark:'#b9a26d', light:'#fff2bf' }); px(c, x + 14, y + 7, 4, 9, '#403020'); px(c, x + 13, y + 6, 6, 3, '#f3d45c'); });
  regTile('5', 'gba_path_desert_clean', TILE, TILE, (c, x, y) => gbaSand(c, x, y));
  regTile('6', 'gba_path_snow_clean', TILE, TILE, (c, x, y) => { px(c, x, y, TILE, TILE, GBA.snow); stipple(c, x + 1, y + 1, 30, 30, GBA.snowBlue, 18, x * 7 + y * 11); px(c, x + 4, y + 12, 7, 1, '#ffffff'); px(c, x + 20, y + 22, 6, 1, '#ffffff'); });

  for (const code of ['.', 'X']) {
    regTileVariant(code, 'gba_' + code.charCodeAt(0) + '_grass_a', (c, x, y) => gbaGrass(c, x, y, null, { flowers:true, flowerCols:['#ffffff'] }));
    regTileVariant(code, 'gba_' + code.charCodeAt(0) + '_grass_b', (c, x, y) => gbaGrass(c, x, y, { base:'#66bc53', dark:'#3b873b', light:'#9fe078' }));
    regTileVariant(code, 'gba_' + code.charCodeAt(0) + '_grass_c', (c, x, y) => gbaGrass(c, x, y, { base:'#73c85f', dark:'#408f40', light:'#b4ec86' }));
  }
  for (const code of [',','^',';','p','a']) {
    regTileVariant(code, 'gba_path_var_' + code.charCodeAt(0) + '_a', (c, x, y) => gbaPath(c, x, y));
    regTileVariant(code, 'gba_path_var_' + code.charCodeAt(0) + '_b', (c, x, y) => { gbaPath(c, x, y); px(c, x + 8, y + 23, 5, 1, '#8d6534'); });
  }
  regTileVariant('_', 'gba_path_var_95_a', (c, x, y) => gbaPath(c, x, y, { base:'#a9a39b', dark:'#6f6963', light:'#d4cdc4' }, 'stone'));
  regTileVariant('_', 'gba_path_var_95_b', (c, x, y) => { gbaPath(c, x, y, { base:'#b4aea6', dark:'#77716a', light:'#dfd8ce' }, 'stone'); px(c, x + 8, y + 24, 8, 1, '#6f6963'); });
  regTileVariant('u', 'gba_path_var_117_a', (c, x, y) => gbaSand(c, x, y));
  regTileVariant('u', 'gba_path_var_117_b', (c, x, y) => { gbaSand(c, x, y); px(c, x + 8, y + 22, 9, 1, '#c99142'); });
  regTileVariant('v', 'gba_path_var_118_a', (c, x, y) => gbaPath(c, x, y, { base:'#8c8f82', dark:'#575c55', light:'#c5c8bb' }, 'stone'));
  regTileVariant('v', 'gba_path_var_118_b', (c, x, y) => { gbaPath(c, x, y, { base:'#989b8d', dark:'#5f645c', light:'#d1d4c5' }, 'stone'); px(c, x + 19, y + 20, 5, 1, '#575c55'); });
  regTileVariant('z', 'gba_path_var_122_a', (c, x, y) => gbaPath(c, x, y, { base:'#789954', dark:'#466832', light:'#a9cf78' }, 'stone'));
  regTileVariant('z', 'gba_path_var_122_b', (c, x, y) => { gbaPath(c, x, y, { base:'#84a55e', dark:'#4c7137', light:'#b8dd87' }, 'stone'); px(c, x + 9, y + 17, 7, 1, '#466832'); });
  regTileVariant('5', 'gba_path_var_53_a', (c, x, y) => gbaSand(c, x, y));
  regTileVariant('5', 'gba_path_var_53_b', (c, x, y) => { gbaSand(c, x, y); px(c, x + 7, y + 20, 12, 1, '#c99142'); });
  regTileVariant('6', 'gba_path_var_54_a', (c, x, y) => { px(c, x, y, TILE, TILE, GBA.snow); stipple(c, x + 1, y + 1, 30, 30, GBA.snowBlue, 12, x * 13 + y * 5); });
  regTileVariant('6', 'gba_path_var_54_b', (c, x, y) => { px(c, x, y, TILE, TILE, '#eef9ff'); stipple(c, x + 1, y + 1, 30, 30, '#bdd9e8', 14, x * 17 + y * 3); px(c, x + 9, y + 22, 8, 1, '#ffffff'); });
  regTileVariant('W', 'gba_water_alt_a', (c, x, y) => gbaWater(c, x, y, true));
  regTileVariant('W', 'gba_water_alt_b', (c, x, y) => { gbaWater(c, x, y); px(c, x + 7, y + 13, 10, 1, '#d8f8ff'); });

  // Trees, bushes, and blockers.
  regTile('T', 'gba_tree_green', TILE, TILE, (c, x, y) => gbaTree(c, x, y, '#3f963f'));
  regTile('Y', 'gba_tree_oak', TILE, TILE, (c, x, y) => gbaTree(c, x, y, '#3f963f'));
  regTile('K', 'gba_tree_cherry', TILE, TILE, (c, x, y) => gbaTree(c, x, y, '#ee88b5'));
  regTile('E', 'gba_tree_autumn', TILE, TILE, (c, x, y) => gbaTree(c, x, y, '#de7b3b'));
  regTile('G', 'gba_tree_ancient', TILE, TILE, (c, x, y) => gbaTree(c, x, y, '#2f6d35', '#5f4327'));
  regTile('O', 'gba_tree_palm', TILE, TILE, gbaPalm);
  regTile('J', 'gba_tree_dead', TILE, TILE, (c, x, y) => { gbaSand(c, x, y); px(c, x + 15, y + 8, 5, 22, '#6b4a30'); px(c, x + 8, y + 13, 11, 3, '#6b4a30'); px(c, x + 17, y + 17, 10, 3, '#6b4a30'); });
  regTile('Q', 'gba_tree_snowpine', TILE, TILE, (c, x, y) => gbaTree(c, x, y, '#4c9e50', '#765036', true));
  regTile('N', 'gba_tree_birch', TILE, TILE, (c, x, y) => gbaTree(c, x, y, '#6abf55', '#f2efe1'));
  regTile('U', 'gba_tree_mushroom', TILE, TILE, (c, x, y) => { gbaGrass(c, x, y); px(c, x + 13, y + 16, 6, 14, '#f0d8a8'); disc(c, x + 16, y + 13, 12, '#d64e66'); px(c, x + 10, y + 10, 3, 2, '#fff8e8'); px(c, x + 20, y + 15, 4, 2, '#fff8e8'); });
  regTile('V', 'gba_tree_willow', TILE, TILE, (c, x, y) => { gbaTree(c, x, y, '#4da24b'); for (let xx = 8; xx <= 24; xx += 4) px(c, x + xx, y + 13, 1, 13, '#2f7834'); });
  regTile('b', 'gba_bush', TILE, TILE, (c, x, y) => gbaBush(c, x, y));
  regTile('c', 'gba_bush_flower', TILE, TILE, (c, x, y) => gbaBush(c, x, y, null, 'flower'));
  regTile('e', 'gba_bush_berry', TILE, TILE, (c, x, y) => gbaBush(c, x, y, null, 'berry'));
  regTile('g', 'gba_bush_thorn', TILE, TILE, (c, x, y) => gbaBush(c, x, y, ['#1f4b25','#2f6d35','#5d9b55']));
  regTile('j', 'gba_bush_autumn', TILE, TILE, (c, x, y) => gbaBush(c, x, y, ['#8a4f28','#de7b3b','#f3c15d']));
  regTile('k', 'gba_bush_snow', TILE, TILE, (c, x, y) => { gbaBush(c, x, y); px(c, x + 8, y + 14, 16, 3, '#ffffff'); px(c, x + 6, y + 21, 20, 2, '#ffffff'); });
  regTile('l', 'gba_bush_blueflower', TILE, TILE, (c, x, y) => gbaBush(c, x, y, null, 'blue'));
  regTile('m', 'gba_bush_purpleflower', TILE, TILE, (c, x, y) => gbaBush(c, x, y, null, 'purple'));
  regTile('n', 'gba_thorn_cluster', TILE, TILE, (c, x, y) => { gbaBush(c, x, y, ['#204020','#305a28','#6b8a45']); for (let i = 0; i < 5; i++) px(c, x + 7 + i * 4, y + 15 + (i & 1) * 4, 3, 1, '#f0e0b0'); });
  regTile('h', 'gba_hedge', TILE, TILE, (c, x, y) => { gbaGrass(c, x, y); px(c, x + 1, y + 8, 30, 19, '#2f7834'); px(c, x + 1, y + 8, 30, 3, '#7ed66d'); px(c, x + 1, y + 25, 30, 2, '#1e5a2b'); });

  // Building roofs and walls.
  registerRoofSet('R', 'house_red', roofPalette('#d95a52', '#943334', '#ff9a86', '#6b2428'));
  registerRoofSet('P', 'center', roofPalette('#e971a1', '#a53667', '#ffafcc', '#752345'), 'center');
  registerRoofSet('M', 'mart', roofPalette('#4f84df', '#2952a8', '#9ac4ff', '#1a346f'), 'mart');
  registerRoofSet('+', 'blue', roofPalette('#4f84df', '#2952a8', '#9ac4ff', '#1a346f'));
  registerRoofSet('-', 'thatch', roofPalette('#d3b44d', '#8d6d23', '#f2d879', '#654818'));
  registerRoofSet('=', 'terra', roofPalette('#d95a36', '#87351f', '#ffa066', '#612418'));
  registerRoofSet('*', 'dome', roofPalette('#8a62c8', '#533582', '#c4a0ff', '#3b235f'), 'gym');
  registerRoofSet('%', 'snow', roofPalette('#f4fbff', '#9fc5dc', '#ffffff', '#6c91ad'));
  registerRoofSet('&', 'slate', roofPalette('#565a72', '#2c3045', '#858aa6', '#1b1d2c'));
  registerRoofSet('7', 'moss', roofPalette('#699b46', '#3f642c', '#9ac875', '#29451f'));
  registerRoofSet('8', 'leaf', roofPalette('#3fa34c', '#23672f', '#8de06e', '#17471f'));
  regTile('B', 'gba_wall_house', TILE, TILE, (c, x, y) => gbaWall(c, x, y));
  regTile('#', 'gba_wall_stone', TILE, TILE, (c, x, y) => gbaWall(c, x, y, { base:'#aaa49a', dark:'#716a63', light:'#d5d0c8' }, 'brick'));
  regTile('@', 'gba_wall_timber', TILE, TILE, (c, x, y) => gbaWall(c, x, y, { base:'#9b6a3a', dark:'#5b3826', light:'#d49a5f' }, 'wood'));
  regTile('$', 'gba_wall_brick', TILE, TILE, (c, x, y) => gbaWall(c, x, y, { base:'#b54d42', dark:'#70332e', light:'#de7869' }, 'brick'));
  regTile('?', 'gba_wall_log', TILE, TILE, (c, x, y) => gbaWall(c, x, y, { base:'#9b6a3a', dark:'#5b3826', light:'#d49a5f' }, 'log'));
  regTile('!', 'gba_wall_white', TILE, TILE, (c, x, y) => gbaWall(c, x, y, { base:'#f5eedc', dark:'#b8aa92', light:'#ffffff' }));
  regTile('0', 'gba_wall_lattice', TILE, TILE, (c, x, y) => { gbaWall(c, x, y, { base:'#b9834d', dark:'#674223', light:'#e1ae70' }, 'wood'); for (let i = -32; i < 64; i += 6) for (let j = 0; j < 32; j++) { const xx = i + j; if (xx >= 0 && xx < 32) px(c, x + xx, y + j, 1, 1, '#46301e'); } });
  regTile('d', 'gba_door_blue', TILE, TILE, (c, x, y) => gbaDoor(c, x, y));
  regTile('f', 'gba_door_shop', TILE, TILE, (c, x, y) => gbaDoor(c, x, y, 'shop'));
  regTile('D', 'gba_door_dark', TILE, TILE, (c, x, y) => gbaDoor(c, x, y, 'dark'));
  regTile('[', 'gba_window_left', TILE, TILE, (c, x, y) => gbaWindow(c, x, y, 'left'));
  regTile(']', 'gba_window_right', TILE, TILE, (c, x, y) => gbaWindow(c, x, y, 'right'));

  // Objects, signs, caves, and interiors.
  regTile('S', 'gba_sign', TILE, TILE, (c, x, y) => gbaSign(c, x, y));
  regTileVariant('S', 'gba_sign_center', (c, x, y) => gbaSign(c, x, y, 'center'), { context:'sign_center' });
  regTileVariant('S', 'gba_sign_mart', (c, x, y) => gbaSign(c, x, y, 'mart'), { context:'sign_mart' });
  regTileVariant('S', 'gba_sign_gym', (c, x, y) => gbaSign(c, x, y, 'gym'), { context:'sign_gym' });
  regTile('L', 'gba_ledge', TILE, TILE, (c, x, y) => { gbaGrass(c, x, y); px(c, x, y + 22, TILE, 4, '#9b6a3a'); px(c, x, y + 26, TILE, 5, '#5b3826'); for (let xx = 0; xx < TILE; xx += 4) px(c, x + xx, y + 22, 2, 1, '#d49a5f'); });
  regTile('C', 'gba_counter', TILE, TILE, (c, x, y) => { gbaFloor(c, x, y); px(c, x, y + 9, TILE, 15, '#b54d42'); px(c, x, y + 9, TILE, 2, '#70332e'); px(c, x, y + 23, TILE, 2, '#5b2420'); px(c, x + 3, y + 6, 26, 4, '#e0bd83'); });
  regTile('H', 'gba_heal_pad', TILE, TILE, (c, x, y) => { gbaFloor(c, x, y); px(c, x + 3, y + 7, 26, 18, '#f3a1bd'); px(c, x + 3, y + 7, 26, 2, '#ffffff'); disc(c, x + 11, y + 16, 4, '#ffffff'); disc(c, x + 21, y + 16, 4, '#ffffff'); px(c, x + 9, y + 15, 4, 2, '#e94c5f'); px(c, x + 19, y + 15, 4, 2, '#e94c5f'); });
  regTile('(', 'gba_small_rock', TILE, TILE, (c, x, y) => { gbaGrass(c, x, y); disc(c, x + 16, y + 22, 6, '#858079'); disc(c, x + 14, y + 20, 4, '#b4aca4'); px(c, x + 12, y + 19, 4, 1, '#ffffff'); });
  regTile(')', 'gba_large_rock', TILE, TILE, (c, x, y) => { gbaGrass(c, x, y); disc(c, x + 16, y + 21, 10, '#6f6963'); disc(c, x + 14, y + 18, 7, '#a9a19a'); px(c, x + 10, y + 16, 6, 1, '#ffffff'); px(c, x + 15, y + 25, 8, 1, '#443e3a'); });
  regTile('<', 'gba_bench', TILE, TILE, (c, x, y) => { gbaGrass(c, x, y); px(c, x + 4, y + 10, 24, 4, '#9b6a3a'); px(c, x + 4, y + 17, 24, 5, '#9b6a3a'); px(c, x + 4, y + 10, 24, 1, '#d49a5f'); px(c, x + 6, y + 22, 3, 7, '#5b3826'); px(c, x + 23, y + 22, 3, 7, '#5b3826'); });
  regTile('|', 'gba_street_lamp', TILE, TILE, (c, x, y) => { gbaGrass(c, x, y); px(c, x + 15, y + 8, 2, 22, '#403020'); px(c, x + 11, y + 5, 10, 4, '#403020'); px(c, x + 13, y + 2, 6, 5, '#ffd861'); px(c, x + 14, y + 3, 4, 2, '#fff3a3'); px(c, x + 11, y + 29, 10, 2, '#403020'); });
  regTile('~', 'gba_hydrant', TILE, TILE, (c, x, y) => { gbaGrass(c, x, y); disc(c, x + 16, y + 12, 5, '#d83b32'); px(c, x + 11, y + 12, 10, 16, '#d83b32'); px(c, x + 8, y + 17, 16, 5, '#b92325'); px(c, x + 13, y + 14, 1, 10, '#ff7b65'); px(c, x + 10, y + 27, 12, 3, '#6f1517'); });
  regTile('{', 'gba_flower_pot', TILE, TILE, (c, x, y) => { gbaGrass(c, x, y); px(c, x + 9, y + 19, 14, 10, '#b85f3a'); px(c, x + 7, y + 18, 18, 3, '#7b3a25'); px(c, x + 12, y + 10, 1, 8, '#3f963f'); px(c, x + 18, y + 8, 1, 10, '#3f963f'); disc(c, x + 12, y + 8, 2, '#e94c5f'); disc(c, x + 18, y + 6, 2, '#ffd861'); });
  regTile('>', 'gba_shelf', TILE, TILE, (c, x, y) => { gbaFloor(c, x, y); px(c, x + 2, y + 2, 28, 28, '#9b6a3a'); px(c, x + 2, y + 2, 28, 2, '#5b3826'); px(c, x + 4, y + 11, 24, 1, '#5b3826'); px(c, x + 4, y + 21, 24, 1, '#5b3826'); for (let i = 0; i < 5; i++) { px(c, x + 5 + i * 5, y + 6, 3, 4, ['#e94c5f','#4f84df','#6fc45a','#ffd861','#8a62c8'][i]); disc(c, x + 6 + i * 5, y + 16, 2, '#ffffff'); px(c, x + 4 + i * 5, y + 14, 4, 2, '#e94c5f'); } });
  regTile('`', 'gba_fence_h', TILE, TILE, (c, x, y) => { gbaGrass(c, x, y); px(c, x, y + 12, TILE, 3, '#9b6a3a'); px(c, x, y + 21, TILE, 3, '#9b6a3a'); for (const xx of [4,16,28]) px(c, x + xx, y + 7, 4, 22, '#6b442b'); });
  regTile('"', 'gba_fence_v', TILE, TILE, (c, x, y) => { gbaGrass(c, x, y); px(c, x + 14, y, 4, TILE, '#6b442b'); px(c, x + 7, y + 10, 18, 3, '#9b6a3a'); px(c, x + 7, y + 21, 18, 3, '#9b6a3a'); });
  regTile('\\', 'gba_mailbox', TILE, TILE, (c, x, y) => { gbaGrass(c, x, y); px(c, x + 15, y + 16, 3, 14, '#6b442b'); px(c, x + 8, y + 9, 16, 9, '#4f84df'); px(c, x + 8, y + 9, 16, 1, '#9ac4ff'); px(c, x + 22, y + 10, 2, 7, '#2952a8'); });
  regTile('/', 'gba_pc_terminal', TILE, TILE, (c, x, y) => { gbaFloor(c, x, y); px(c, x + 7, y + 4, 18, 18, '#49566a'); px(c, x + 9, y + 6, 14, 10, '#79c8ef'); px(c, x + 10, y + 23, 12, 5, '#3a4657'); px(c, x + 13, y + 25, 6, 1, '#edf8ff'); });
  regTile('9', 'gba_vending', TILE, TILE, (c, x, y) => { gbaFloor(c, x, y); px(c, x + 7, y + 2, 18, 28, '#d83b32'); px(c, x + 9, y + 5, 10, 10, '#79c8ef'); px(c, x + 20, y + 6, 3, 14, '#ffd861'); for (let yy = 18; yy < 27; yy += 4) px(c, x + 10, y + yy, 8, 1, '#fff8e8'); });
  regTile('}', 'gba_potted_plant', TILE, TILE, (c, x, y) => { gbaFloor(c, x, y); px(c, x + 9, y + 19, 14, 10, '#b85f3a'); px(c, x + 7, y + 18, 18, 3, '#7b3a25'); disc(c, x + 12, y + 12, 5, '#3f963f'); disc(c, x + 20, y + 11, 5, '#3f963f'); disc(c, x + 16, y + 7, 5, '#6fc45a'); });
  regTile("'", 'gba_gardenbed', TILE, TILE, (c, x, y) => { gbaGrass(c, x, y); px(c, x + 3, y + 5, 26, 22, '#8d5b32'); px(c, x + 3, y + 5, 26, 1, '#d49a5f'); px(c, x + 3, y + 26, 26, 1, '#4c2d1c'); for (const yy of [11,20]) for (const xx of [9,16,23]) { px(c, x + xx, y + yy, 1, 4, '#3f963f'); px(c, x + xx - 2, y + yy, 2, 1, '#6fc45a'); px(c, x + xx + 1, y + yy, 2, 1, '#6fc45a'); } });

  // ------------------------------------------------------------------
  // === DECORATIONS ===================================================
  // Furniture / props rendered on a transparent background, placed in
  // maps via map.decorations = [{ x, y, key }]. Drawn by world.js
  // between the tile pass and the sprite layer so movable sprites
  // occlude items they walk past correctly. ~100 items here, mostly
  // 32x32 single-tile sprites; the healing pod is a 2-tile structure.
  // ------------------------------------------------------------------

  // ----- BENCHES (8) --------------------------------------------------
  function decorBench(c, x, y, plank, plankShade, leg, legShade, accent) {
    // Backrest slats
    px(c, x + 4,  y + 4,  TILE - 8, 1, plankShade);
    px(c, x + 4,  y + 5,  TILE - 8, 2, plank);
    px(c, x + 5,  y + 7,  1, 8, plankShade);
    px(c, x + TILE - 6, y + 7, 1, 8, plankShade);
    // Seat plank
    px(c, x + 3,  y + 14, TILE - 6, 4, plank);
    px(c, x + 3,  y + 14, TILE - 6, 1, accent || plank);
    px(c, x + 3,  y + 17, TILE - 6, 1, plankShade);
    // Legs
    px(c, x + 5,  y + 18, 3, 8, leg);
    px(c, x + TILE - 8, y + 18, 3, 8, leg);
    px(c, x + 5,  y + 18, 1, 8, legShade);
    px(c, x + TILE - 8, y + 18, 1, 8, legShade);
  }
  regDecor('bench_park_brown',  TILE, TILE, (c, x, y) => decorBench(c, x, y, '#a06838', '#704a20', '#382010', '#1a0a04', '#c89058'));
  regDecor('bench_park_green',  TILE, TILE, (c, x, y) => decorBench(c, x, y, '#388a40', '#1c4818', '#202020', '#0a0a0a', '#5cae4c'));
  regDecor('bench_marble_white',TILE, TILE, (c, x, y) => decorBench(c, x, y, '#f0f0f0', '#a0a0a0', '#a0a0a0', '#606060', '#fff'));
  regDecor('bench_stone_grey',  TILE, TILE, (c, x, y) => decorBench(c, x, y, '#808078', '#403838', '#303028', '#181810', '#a0a098'));
  regDecor('bench_picnic_red',  TILE, TILE, (c, x, y) => decorBench(c, x, y, '#d83838', '#7a1408', '#a06838', '#704a20', '#f08080'));
  regDecor('bench_log',         TILE, TILE, (c, x, y) => {
    px(c, x + 2, y + 14, TILE - 4, 6, '#7a4818');
    px(c, x + 2, y + 14, TILE - 4, 1, '#a06838');
    px(c, x + 2, y + 19, TILE - 4, 1, '#3a2010');
    for (let i = 4; i < TILE - 4; i += 6) px(c, x + i, y + 16, 1, 2, '#3a2010');
    px(c, x + 6, y + 20, 4, 6, '#3a2010');
    px(c, x + TILE - 10, y + 20, 4, 6, '#3a2010');
  });
  regDecor('bench_garden_iron', TILE, TILE, (c, x, y) => {
    px(c, x + 2, y + 6, TILE - 4, 1, '#202028');
    for (let i = 0; i < 6; i++) px(c, x + 4 + i*4, y + 7, 1, 7, '#181820');
    px(c, x + 2, y + 14, TILE - 4, 3, '#383848');
    px(c, x + 2, y + 14, TILE - 4, 1, '#5860a0');
    px(c, x + 5, y + 17, 2, 9, '#181820');
    px(c, x + TILE - 7, y + 17, 2, 9, '#181820');
  });
  regDecor('bench_pier_wood',   TILE, TILE, (c, x, y) => decorBench(c, x, y, '#c8a060', '#806838', '#604030', '#3a2410', '#e8c890'));

  // ----- SHELVES & MART DISPLAYS (10) --------------------------------
  function shelfBack(c, x, y, frame, shelfShade) {
    px(c, x + 2, y + 2,  TILE - 4, TILE - 4, frame);
    px(c, x + 2, y + 2,  TILE - 4, 1, shelfShade);
    px(c, x + 2, y + TILE - 3, TILE - 4, 1, shelfShade);
    for (const ly of [11, 19]) px(c, x + 3, y + ly, TILE - 6, 1, shelfShade);
  }
  regDecor('shelf_books', TILE, TILE, (c, x, y) => {
    shelfBack(c, x, y, '#604028', '#a06838');
    const books = ['#d83838','#3878d8','#48a040','#f0c020','#a040a0'];
    for (const sy of [4, 12, 20]) for (let i = 0; i < 6; i++) {
      px(c, x + 3 + i*4, y + sy, 3, 6, books[(i + sy) % books.length]);
    }
  });
  regDecor('shelf_potions', TILE, TILE, (c, x, y) => {
    shelfBack(c, x, y, '#383848', '#787890');
    const colors = ['#e83838','#f0c020','#48a040','#5898d8','#a040a0'];
    for (const sy of [4, 12, 20]) for (let i = 0; i < 5; i++) {
      px(c, x + 4 + i*5, y + sy + 1, 3, 5, colors[i]);
      px(c, x + 4 + i*5, y + sy, 3, 1, '#80c0e8');
    }
  });
  regDecor('shelf_pokeballs', TILE, TILE, (c, x, y) => {
    shelfBack(c, x, y, '#382020', '#806060');
    for (const sy of [4, 12, 20]) for (let i = 0; i < 5; i++) {
      const cx = x + 5 + i*5, cy = y + sy + 2;
      disc(c, cx, cy, 2, '#e83838');
      px(c, cx - 2, cy + 1, 5, 1, '#202020');
      px(c, cx - 1, cy + 2, 3, 1, '#fff');
    }
  });
  regDecor('shelf_berries', TILE, TILE, (c, x, y) => {
    shelfBack(c, x, y, '#604028', '#a06838');
    const berries = ['#e83020','#a040a0','#f0c020','#48a040','#f098c0'];
    for (const sy of [4, 12, 20]) for (let i = 0; i < 6; i++) {
      const cx = x + 4 + i*4, cy = y + sy + 2;
      disc(c, cx, cy, 2, berries[(i + sy) % berries.length]);
      px(c, cx - 1, cy - 2, 1, 1, '#3a6028');
    }
  });
  regDecor('shelf_tms', TILE, TILE, (c, x, y) => {
    shelfBack(c, x, y, '#202028', '#5060a0');
    for (const sy of [4, 12, 20]) for (let i = 0; i < 4; i++) {
      px(c, x + 4 + i*6, y + sy, 5, 6, '#5860a0');
      px(c, x + 5 + i*6, y + sy + 2, 3, 1, '#fff');
      px(c, x + 5 + i*6, y + sy + 4, 3, 1, '#a0c8f0');
    }
  });
  regDecor('shelf_souvenirs', TILE, TILE, (c, x, y) => {
    shelfBack(c, x, y, '#604028', '#a06838');
    px(c, x + 4,  y + 4,  4, 5, '#f0c020');
    disc(c, x + 11, y + 6, 2, '#f098c0');
    px(c, x + 16, y + 4, 4, 5, '#5898d8');
    disc(c, x + 24, y + 6, 2, '#48a040');
    for (let i = 0; i < 5; i++) px(c, x + 4 + i*5, y + 13, 4, 5, ['#e83838','#48a040','#5898d8','#f0c020','#a040a0'][i]);
    for (let i = 0; i < 6; i++) px(c, x + 4 + i*4, y + 21, 3, 5, ['#a06838','#704a20','#604028','#a06838','#704a20','#a06838'][i]);
  });
  regDecor('shelf_clothing', TILE, TILE, (c, x, y) => {
    shelfBack(c, x, y, '#604028', '#a06838');
    const colors = ['#e83838','#f0c020','#48a040','#5898d8','#a040a0','#604028'];
    for (const sy of [4, 12, 20]) for (let i = 0; i < 5; i++) {
      px(c, x + 4 + i*5, y + sy, 4, 6, colors[(i + sy) % colors.length]);
      px(c, x + 4 + i*5, y + sy, 4, 1, '#fff8e0');
    }
  });
  regDecor('shelf_food', TILE, TILE, (c, x, y) => {
    shelfBack(c, x, y, '#604028', '#a06838');
    for (let i = 0; i < 6; i++) px(c, x + 3 + i*4, y + 4, 3, 5, ['#a06038','#3a8030','#e83838','#f0c020','#704020','#48a040'][i]);
    for (let i = 0; i < 6; i++) disc(c, x + 4 + i*4, y + 14, 1, ['#e83838','#f0c020','#48a040','#a040a0','#5898d8','#704020'][i]);
    for (let i = 0; i < 5; i++) px(c, x + 4 + i*5, y + 21, 4, 5, ['#fff8e0','#f0c020','#fff8e0','#704020','#48a040'][i]);
  });
  regDecor('shelf_displays_glass', TILE, TILE, (c, x, y) => {
    shelfBack(c, x, y, '#a0a0b0', '#e8e8f0');
    px(c, x + 3, y + 3, TILE - 6, TILE - 6, 'rgba(160,200,232,0.30)');
    for (const sy of [4, 12, 20]) for (let i = 0; i < 5; i++) {
      px(c, x + 4 + i*5, y + sy, 3, 5, ['#f098c0','#5898d8','#48a040','#f0c020','#fff8e0'][i]);
    }
    px(c, x + 2, y + 2, 1, TILE - 4, '#fff8e0');
  });
  regDecor('shelf_empty_wooden', TILE, TILE, (c, x, y) => shelfBack(c, x, y, '#604028', '#a06838'));

  // ----- SIGNS (8) ----------------------------------------------------
  regDecor('sign_post_arrow', TILE, TILE, (c, x, y) => {
    px(c, x + 14, y + 14, 4, 16, '#604028');
    px(c, x + 4, y + 6, 22, 8, '#c89058');
    px(c, x + 4, y + 6, 22, 1, '#f0c890');
    px(c, x + 4, y + 13, 22, 1, '#604028');
    for (let i = 0; i < 6; i++) px(c, x + 22, y + 4 + i, 1 + Math.min(i, 6 - i), 1, '#604028');
  });
  regDecor('sign_post_wood', TILE, TILE, (c, x, y) => {
    px(c, x + 14, y + 14, 4, 16, '#604028');
    px(c, x + 4, y + 4, 24, 12, '#a06838');
    px(c, x + 4, y + 4, 24, 1, '#c89058');
    px(c, x + 4, y + 15, 24, 1, '#604028');
    px(c, x + 8, y + 8, 16, 1, '#3a2010');
    px(c, x + 8, y + 11, 14, 1, '#3a2010');
  });
  regDecor('sign_billboard_yellow', TILE, TILE, (c, x, y) => {
    px(c, x + 14, y + 18, 4, 12, '#604028');
    px(c, x + 1, y + 2, 30, 16, '#f0c020');
    px(c, x + 1, y + 2, 30, 1, '#fff080');
    px(c, x + 1, y + 17, 30, 1, '#806010');
    px(c, x + 1, y + 2, 1, 16, '#806010');
    px(c, x + 30, y + 2, 1, 16, '#806010');
    px(c, x + 4, y + 6, 24, 1, '#604028');
    px(c, x + 4, y + 9, 22, 1, '#604028');
    px(c, x + 4, y + 12, 26, 1, '#604028');
  });
  regDecor('sign_billboard_blue', TILE, TILE, (c, x, y) => {
    px(c, x + 14, y + 18, 4, 12, '#604028');
    px(c, x + 1, y + 2, 30, 16, '#3878d8');
    px(c, x + 1, y + 2, 30, 1, '#80b8f0');
    px(c, x + 1, y + 17, 30, 1, '#1a3868');
    px(c, x + 4, y + 6, 24, 1, '#fff8e0');
    px(c, x + 4, y + 9, 22, 1, '#fff8e0');
    px(c, x + 4, y + 12, 26, 1, '#fff8e0');
  });
  regDecor('sign_gym_red', TILE, TILE, (c, x, y) => {
    px(c, x + 13, y + 16, 6, 14, '#3a2410');
    px(c, x + 4, y + 4, 24, 12, '#a01828');
    px(c, x + 4, y + 4, 24, 1, '#e85060');
    px(c, x + 4, y + 15, 24, 1, '#400810');
    px(c, x + 14, y + 6, 4, 8, '#fff8e0');
    px(c, x + 12, y + 8, 8, 4, '#fff8e0');
  });
  regDecor('sign_gym_blue', TILE, TILE, (c, x, y) => {
    px(c, x + 13, y + 16, 6, 14, '#3a2410');
    px(c, x + 4, y + 4, 24, 12, '#1a3868');
    px(c, x + 4, y + 4, 24, 1, '#5898d8');
    px(c, x + 4, y + 15, 24, 1, '#0a1830');
    px(c, x + 14, y + 6, 4, 8, '#fff8e0');
    px(c, x + 12, y + 8, 8, 4, '#fff8e0');
  });
  regDecor('sign_warning', TILE, TILE, (c, x, y) => {
    px(c, x + 14, y + 16, 4, 14, '#604028');
    px(c, x + 8, y + 4, 16, 12, '#f0c020');
    px(c, x + 7, y + 5, 18, 10, '#f0c020');
    px(c, x + 7, y + 5, 18, 1, '#fff080');
    px(c, x + 7, y + 14, 18, 1, '#806010');
    px(c, x + 15, y + 7, 2, 5, '#202020');
    px(c, x + 15, y + 13, 2, 1, '#202020');
  });
  regDecor('sign_marker_stone', TILE, TILE, (c, x, y) => {
    px(c, x + 8, y + 4, 16, 24, '#787870');
    px(c, x + 8, y + 4, 16, 1, '#a0a098');
    px(c, x + 8, y + 27, 16, 1, '#404038');
    px(c, x + 7, y + 5, 1, 22, '#404038');
    px(c, x + 24, y + 5, 1, 22, '#404038');
    px(c, x + 11, y + 8, 10, 1, '#404038');
    px(c, x + 11, y + 12, 10, 1, '#404038');
    px(c, x + 11, y + 16, 8, 1, '#404038');
  });

  // ----- TRASH CANS (6) -----------------------------------------------
  regDecor('trash_grey_lid', TILE, TILE, (c, x, y) => {
    px(c, x + 8, y + 8, 16, 22, '#605850');
    px(c, x + 8, y + 8, 16, 1, '#80786a');
    px(c, x + 8, y + 29, 16, 1, '#302820');
    px(c, x + 7, y + 5, 18, 4, '#383028');
    px(c, x + 7, y + 5, 18, 1, '#605850');
    px(c, x + 14, y + 3, 4, 2, '#605850');
    for (let i = 0; i < 3; i++) px(c, x + 10 + i*5, y + 16, 1, 8, '#80786a');
  });
  regDecor('trash_blue_recycle', TILE, TILE, (c, x, y) => {
    px(c, x + 8, y + 8, 16, 22, '#3878d8');
    px(c, x + 8, y + 8, 16, 1, '#80b8f0');
    px(c, x + 8, y + 29, 16, 1, '#1a3868');
    px(c, x + 7, y + 5, 18, 4, '#1a3868');
    px(c, x + 14, y + 14, 4, 4, '#fff8e0');
    px(c, x + 13, y + 16, 6, 1, '#fff8e0');
    px(c, x + 14, y + 21, 4, 1, '#fff8e0');
  });
  regDecor('trash_green_compost', TILE, TILE, (c, x, y) => {
    px(c, x + 8, y + 8, 16, 22, '#388a40');
    px(c, x + 8, y + 8, 16, 1, '#5cae4c');
    px(c, x + 8, y + 29, 16, 1, '#1c4818');
    px(c, x + 7, y + 5, 18, 4, '#1c4818');
    disc(c, x + 16, y + 18, 3, '#5cae4c');
    px(c, x + 14, y + 16, 4, 1, '#a8d878');
  });
  regDecor('trash_dumpster', TILE, TILE, (c, x, y) => {
    px(c, x + 2, y + 12, 28, 16, '#383830');
    px(c, x + 2, y + 12, 28, 1, '#605850');
    px(c, x + 2, y + 27, 28, 1, '#181810');
    px(c, x + 4, y + 8, 24, 5, '#202020');
    px(c, x + 4, y + 8, 24, 1, '#404038');
    px(c, x + 8, y + 16, 8, 8, '#605850');
    px(c, x + 18, y + 16, 8, 8, '#605850');
  });
  regDecor('trash_basket_wicker', TILE, TILE, (c, x, y) => {
    px(c, x + 8, y + 10, 16, 20, '#a06838');
    px(c, x + 8, y + 10, 16, 1, '#c89058');
    for (let i = 0; i < 5; i++) px(c, x + 9, y + 13 + i*4, 14, 1, '#704a20');
    for (let i = 0; i < 4; i++) px(c, x + 11 + i*3, y + 11, 1, 18, '#704a20');
    px(c, x + 8, y + 8, 16, 2, '#3a2010');
  });
  regDecor('trash_urn_park', TILE, TILE, (c, x, y) => {
    px(c, x + 10, y + 14, 12, 16, '#605850');
    px(c, x + 8, y + 12, 16, 4, '#383028');
    px(c, x + 9, y + 8, 14, 4, '#605850');
    px(c, x + 9, y + 8, 14, 1, '#80786a');
    px(c, x + 11, y + 28, 10, 2, '#202020');
  });

  // ----- FLOWERPOTS (8) -----------------------------------------------
  function potBase(c, x, y, potColor, potShade, lipColor) {
    px(c, x + 9, y + 18, 14, 12, potColor);
    px(c, x + 9, y + 18, 14, 1, lipColor);
    px(c, x + 9, y + 29, 14, 1, potShade);
    px(c, x + 8, y + 19, 1, 10, potShade);
    px(c, x + 23, y + 19, 1, 10, potShade);
  }
  regDecor('pot_terracotta_red', TILE, TILE, (c, x, y) => {
    potBase(c, x, y, '#c8704c', '#7a2810', '#e89070');
    disc(c, x + 12, y + 12, 3, '#5cae4c');
    disc(c, x + 20, y + 11, 3, '#5cae4c');
    disc(c, x + 16, y + 8, 3, '#48a040');
    disc(c, x + 13, y + 8, 2, '#e83838');
    disc(c, x + 19, y + 9, 2, '#f0c020');
  });
  regDecor('pot_ceramic_blue', TILE, TILE, (c, x, y) => {
    potBase(c, x, y, '#3878d8', '#1a3868', '#80b8f0');
    px(c, x + 12, y + 22, 8, 1, '#fff8e0');
    disc(c, x + 12, y + 12, 3, '#48a040');
    disc(c, x + 20, y + 11, 3, '#48a040');
    disc(c, x + 16, y + 8, 3, '#5cae4c');
    disc(c, x + 14, y + 9, 2, '#f098c0');
  });
  regDecor('pot_painted_yellow', TILE, TILE, (c, x, y) => {
    potBase(c, x, y, '#f0c020', '#806010', '#fff080');
    for (let i = 0; i < 3; i++) px(c, x + 12 + i*4, y + 23, 2, 2, '#e83838');
    disc(c, x + 16, y + 12, 4, '#5cae4c');
    disc(c, x + 12, y + 11, 3, '#48a040');
    disc(c, x + 20, y + 11, 3, '#48a040');
    disc(c, x + 16, y + 8, 2, '#fff8e0');
  });
  regDecor('pot_marble_white', TILE, TILE, (c, x, y) => {
    potBase(c, x, y, '#e8e8e8', '#a0a0a0', '#fff');
    for (let i = 0; i < 4; i++) px(c, x + 10 + i*4, y + 22, 1, 6, 'rgba(120,120,120,0.5)');
    disc(c, x + 16, y + 10, 5, '#a040a0');
    disc(c, x + 12, y + 12, 3, '#a040a0');
    disc(c, x + 20, y + 12, 3, '#a040a0');
    disc(c, x + 16, y + 8, 2, '#f098c0');
  });
  regDecor('pot_hanging_basket', TILE, TILE, (c, x, y) => {
    px(c, x + 16, y + 0, 1, 6, '#383028');
    px(c, x + 14, y + 6, 1, 4, '#383028');
    px(c, x + 18, y + 6, 1, 4, '#383028');
    px(c, x + 9, y + 10, 14, 8, '#a06838');
    px(c, x + 9, y + 10, 14, 1, '#c89058');
    px(c, x + 9, y + 17, 14, 1, '#3a2010');
    disc(c, x + 12, y + 14, 4, '#5cae4c');
    disc(c, x + 20, y + 14, 4, '#5cae4c');
    disc(c, x + 14, y + 18, 3, '#48a040');
    disc(c, x + 19, y + 19, 3, '#48a040');
    disc(c, x + 13, y + 8, 2, '#e83838');
    disc(c, x + 19, y + 8, 2, '#f0c020');
  });
  regDecor('pot_window_box', TILE, TILE, (c, x, y) => {
    px(c, x + 4, y + 16, 24, 14, '#a06838');
    px(c, x + 4, y + 16, 24, 1, '#c89058');
    px(c, x + 4, y + 29, 24, 1, '#3a2010');
    for (let i = 0; i < 5; i++) {
      const px_ = x + 6 + i*5;
      disc(c, px_, y + 12, 3, '#5cae4c');
      disc(c, px_, y + 9, 2, ['#e83838','#f0c020','#a040a0','#5898d8','#fff8e0'][i]);
    }
  });
  regDecor('pot_succulent_small', TILE, TILE, (c, x, y) => {
    px(c, x + 12, y + 22, 8, 8, '#a06838');
    px(c, x + 12, y + 22, 8, 1, '#c89058');
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      const dx = Math.round(Math.cos(a) * 3);
      const dy = Math.round(Math.sin(a) * 3) - 1;
      px(c, x + 16 + dx, y + 16 + dy, 2, 2, '#48a040');
      px(c, x + 16 + dx, y + 16 + dy, 1, 1, '#a8d878');
    }
    px(c, x + 16, y + 14, 1, 1, '#f098c0');
  });
  regDecor('pot_tall_lily', TILE, TILE, (c, x, y) => {
    px(c, x + 11, y + 22, 10, 8, '#c8704c');
    px(c, x + 11, y + 22, 10, 1, '#e89070');
    px(c, x + 16, y + 8, 1, 14, '#388a40');
    for (let i = 0; i < 4; i++) px(c, x + 12 + i*2, y + 14 + i, 4, 1, '#48a040');
    disc(c, x + 16, y + 6, 3, '#fff8e0');
    px(c, x + 16, y + 7, 1, 1, '#f0c020');
  });

  // ----- PLANTERS (6) -------------------------------------------------
  regDecor('planter_hedge_round', TILE, TILE, (c, x, y) => {
    px(c, x + 6, y + 22, 20, 8, '#3a2010');
    px(c, x + 6, y + 22, 20, 1, '#604028');
    disc(c, x + 16, y + 14, 8, '#388a40');
    disc(c, x + 11, y + 16, 4, '#5cae4c');
    disc(c, x + 21, y + 14, 4, '#5cae4c');
    disc(c, x + 16, y + 10, 3, '#a8d878');
  });
  regDecor('planter_hedge_long', TILE, TILE, (c, x, y) => {
    px(c, x + 1, y + 22, 30, 8, '#3a2010');
    px(c, x + 1, y + 22, 30, 1, '#604028');
    px(c, x + 1, y + 12, 30, 10, '#388a40');
    px(c, x + 1, y + 12, 30, 1, '#5cae4c');
    for (let i = 0; i < 6; i++) px(c, x + 3 + i*5, y + 10, 3, 2, '#5cae4c');
    for (let i = 0; i < 4; i++) px(c, x + 5 + i*7, y + 14, 2, 2, '#a8d878');
  });
  regDecor('planter_herb_box', TILE, TILE, (c, x, y) => {
    px(c, x + 4, y + 18, 24, 12, '#a06838');
    px(c, x + 4, y + 18, 24, 1, '#c89058');
    px(c, x + 4, y + 29, 24, 1, '#3a2010');
    px(c, x + 6, y + 22, 20, 4, '#604028');
    for (let i = 0; i < 5; i++) {
      const px_ = x + 7 + i*4;
      px(c, px_, y + 16, 2, 6, '#388a40');
      px(c, px_, y + 14, 2, 2, '#5cae4c');
    }
  });
  regDecor('planter_flowerbed_oval', TILE, TILE, (c, x, y) => {
    px(c, x + 4, y + 22, 24, 6, '#604028');
    px(c, x + 6, y + 21, 20, 1, '#a06838');
    px(c, x + 6, y + 28, 20, 1, '#3a2010');
    for (let i = 0; i < 5; i++) {
      disc(c, x + 6 + i*5, y + 16, 2, '#388a40');
      px(c, x + 6 + i*5, y + 12, 1, 1, ['#e83838','#f0c020','#a040a0','#5898d8','#f098c0'][i]);
    }
  });
  regDecor('planter_raised_wood', TILE, TILE, (c, x, y) => {
    px(c, x + 2, y + 14, 28, 16, '#a06838');
    px(c, x + 2, y + 14, 28, 1, '#c89058');
    px(c, x + 2, y + 29, 28, 1, '#3a2010');
    for (let i = 0; i < 4; i++) px(c, x + 7 + i*6, y + 14, 1, 16, '#604028');
    px(c, x + 4, y + 16, 24, 6, '#388a40');
    for (let i = 0; i < 4; i++) disc(c, x + 8 + i*5, y + 12, 2, ['#e83838','#f0c020','#5898d8','#f098c0'][i]);
  });
  regDecor('planter_zen_stone', TILE, TILE, (c, x, y) => {
    px(c, x + 2, y + 18, 28, 12, '#787870');
    px(c, x + 2, y + 18, 28, 1, '#a0a098');
    px(c, x + 2, y + 29, 28, 1, '#383830');
    for (let i = 0; i < 6; i++) px(c, x + 4, y + 22 + (i & 1), 24, 1, 'rgba(255,255,255,0.20)');
    disc(c, x + 9, y + 14, 4, '#403838');
    disc(c, x + 16, y + 12, 5, '#503838');
    disc(c, x + 23, y + 13, 4, '#403838');
  });

  // ----- TABLES (10) --------------------------------------------------
  function tableSurface(c, x, y, top, edge, leg) {
    px(c, x + 2, y + 8, 28, 8, top);
    px(c, x + 2, y + 8, 28, 1, edge);
    px(c, x + 2, y + 15, 28, 1, edge);
    px(c, x + 6, y + 16, 3, 14, leg);
    px(c, x + TILE - 9, y + 16, 3, 14, leg);
  }
  regDecor('table_wood_round', TILE, TILE, (c, x, y) => {
    disc(c, x + 16, y + 12, 12, '#a06838');
    disc(c, x + 16, y + 12, 11, '#c89058');
    px(c, x + 14, y + 16, 4, 14, '#604028');
  });
  regDecor('table_wood_square', TILE, TILE, (c, x, y) => tableSurface(c, x, y, '#a06838', '#604028', '#604028'));
  regDecor('table_marble_round', TILE, TILE, (c, x, y) => {
    disc(c, x + 16, y + 12, 12, '#a0a0a0');
    disc(c, x + 16, y + 12, 11, '#e8e8e8');
    px(c, x + 13, y + 9, 6, 1, 'rgba(120,120,120,0.6)');
    px(c, x + 14, y + 16, 4, 14, '#606060');
  });
  regDecor('table_glass_modern', TILE, TILE, (c, x, y) => {
    px(c, x + 2, y + 8, 28, 6, 'rgba(180,220,240,0.4)');
    px(c, x + 2, y + 8, 28, 1, '#fff');
    px(c, x + 2, y + 13, 28, 1, '#5898d8');
    px(c, x + 5, y + 14, 3, 16, '#a0a0a0');
    px(c, x + TILE - 8, y + 14, 3, 16, '#a0a0a0');
  });
  regDecor('table_dining_long', TILE, TILE, (c, x, y) => {
    px(c, x + 1, y + 10, 30, 6, '#a06838');
    px(c, x + 1, y + 10, 30, 1, '#c89058');
    px(c, x + 1, y + 15, 30, 1, '#604028');
    for (let i = 0; i < 4; i++) px(c, x + 3 + i*8, y + 16, 2, 14, '#604028');
  });
  regDecor('table_picnic_red_check', TILE, TILE, (c, x, y) => {
    tableSurface(c, x, y, '#fff', '#202020', '#604028');
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      if ((i + j) & 1) px(c, x + 4 + i*7, y + 9 + j*2, 5, 1, '#e83838');
    }
  });
  regDecor('table_workbench', TILE, TILE, (c, x, y) => {
    tableSurface(c, x, y, '#704a20', '#3a2010', '#3a2010');
    for (let i = 0; i < 4; i++) px(c, x + 5 + i*6, y + 11, 2, 1, '#202020');
    px(c, x + 22, y + 11, 6, 2, '#a0a0a0');
    px(c, x + 6, y + 13, 8, 1, '#a0a098');
  });
  regDecor('table_round_chess', TILE, TILE, (c, x, y) => {
    disc(c, x + 16, y + 12, 12, '#a06838');
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      if ((i + j) & 1) px(c, x + 9 + i*4, y + 5 + j*4, 4, 4, '#3a2010');
      else px(c, x + 9 + i*4, y + 5 + j*4, 4, 4, '#fff8e0');
    }
    disc(c, x + 16, y + 12, 12, 'rgba(0,0,0,0)'); // outline trick
    disc(c, x + 16, y + 12, 12, 'rgba(255,255,255,0.05)');
    px(c, x + 14, y + 16, 4, 14, '#604028');
  });
  regDecor('table_low_tea', TILE, TILE, (c, x, y) => {
    px(c, x + 4, y + 18, 24, 4, '#a06838');
    px(c, x + 4, y + 18, 24, 1, '#c89058');
    px(c, x + 4, y + 21, 24, 1, '#604028');
    px(c, x + 6, y + 22, 2, 8, '#604028');
    px(c, x + 24, y + 22, 2, 8, '#604028');
    disc(c, x + 12, y + 16, 2, '#fff8e0');
    disc(c, x + 20, y + 16, 2, '#fff8e0');
  });
  regDecor('table_long_buffet', TILE, TILE, (c, x, y) => {
    px(c, x + 1, y + 6, 30, 12, '#604028');
    px(c, x + 1, y + 6, 30, 1, '#a06838');
    px(c, x + 1, y + 17, 30, 1, '#3a2010');
    px(c, x + 3, y + 8, 8, 8, '#fff8e0');
    px(c, x + 13, y + 9, 6, 6, '#e83838');
    px(c, x + 21, y + 8, 8, 8, '#5898d8');
    for (let i = 0; i < 3; i++) px(c, x + 8 + i*8, y + 18, 2, 12, '#3a2010');
  });

  // ----- MART SHOP DISPLAYS (8) --------------------------------------
  regDecor('display_potions_counter', TILE, TILE, (c, x, y) => {
    px(c, x + 1, y + 12, 30, 18, '#a06838');
    px(c, x + 1, y + 12, 30, 1, '#c89058');
    px(c, x + 1, y + 29, 30, 1, '#3a2010');
    for (let i = 0; i < 5; i++) {
      const px_ = x + 4 + i*5;
      px(c, px_, y + 6, 4, 6, ['#e83838','#5898d8','#48a040','#f0c020','#a040a0'][i]);
      px(c, px_, y + 4, 4, 2, '#80c0e8');
    }
  });
  regDecor('display_pokeballs_rack', TILE, TILE, (c, x, y) => {
    px(c, x + 2, y + 4, 28, 26, '#604028');
    px(c, x + 2, y + 4, 28, 1, '#a06838');
    for (const sy of [6, 14, 22]) for (let i = 0; i < 4; i++) {
      const cx = x + 6 + i*7, cy = y + sy + 1;
      disc(c, cx, cy, 3, '#e83838');
      px(c, cx - 3, cy + 1, 7, 1, '#202020');
      px(c, cx - 1, cy + 2, 3, 1, '#fff');
    }
  });
  regDecor('display_clothing_rack', TILE, TILE, (c, x, y) => {
    px(c, x + 2, y + 4, 1, 26, '#202020');
    px(c, x + 29, y + 4, 1, 26, '#202020');
    px(c, x + 2, y + 4, 28, 1, '#202020');
    for (let i = 0; i < 5; i++) {
      px(c, x + 4 + i*5, y + 6, 4, 14, ['#e83838','#5898d8','#f0c020','#48a040','#a040a0'][i]);
      px(c, x + 4 + i*5, y + 6, 4, 1, 'rgba(255,255,255,0.4)');
    }
    px(c, x + 4, y + 28, 24, 2, '#604028');
  });
  regDecor('display_food_counter', TILE, TILE, (c, x, y) => {
    px(c, x + 1, y + 14, 30, 16, '#fff8e0');
    px(c, x + 1, y + 14, 30, 1, '#f0c020');
    px(c, x + 1, y + 29, 30, 1, '#806010');
    px(c, x + 2, y + 4, 28, 10, 'rgba(180,220,240,0.5)');
    px(c, x + 2, y + 4, 28, 1, '#fff');
    px(c, x + 2, y + 13, 28, 1, '#5898d8');
    for (let i = 0; i < 4; i++) {
      px(c, x + 4 + i*7, y + 6, 5, 6, ['#e83838','#48a040','#f0c020','#a06838'][i]);
    }
  });
  regDecor('display_register', TILE, TILE, (c, x, y) => {
    px(c, x + 4, y + 16, 24, 14, '#383830');
    px(c, x + 4, y + 16, 24, 1, '#605850');
    px(c, x + 4, y + 29, 24, 1, '#181810');
    px(c, x + 8, y + 4, 16, 12, '#202020');
    px(c, x + 9, y + 5, 14, 8, '#48a040');
    for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) {
      px(c, x + 8 + j*5, y + 18 + i*4, 4, 3, '#787068');
      px(c, x + 8 + j*5, y + 18 + i*4, 4, 1, '#a8a098');
    }
  });
  regDecor('display_souvenir', TILE, TILE, (c, x, y) => {
    px(c, x + 2, y + 8, 28, 22, '#a06838');
    px(c, x + 2, y + 8, 28, 1, '#c89058');
    px(c, x + 2, y + 17, 28, 1, '#604028');
    px(c, x + 2, y + 26, 28, 1, '#604028');
    for (let i = 0; i < 5; i++) {
      px(c, x + 4 + i*5, y + 10, 3, 5, ['#a040a0','#5898d8','#f0c020','#48a040','#e83838'][i]);
    }
    for (let i = 0; i < 5; i++) {
      disc(c, x + 6 + i*5, y + 22, 2, ['#f0c020','#a06838','#fff','#f098c0','#5898d8'][i]);
    }
  });
  regDecor('display_glass_case', TILE, TILE, (c, x, y) => {
    px(c, x + 1, y + 4, 30, 26, 'rgba(180,220,240,0.30)');
    px(c, x + 1, y + 4, 30, 1, '#fff');
    px(c, x + 1, y + 4, 1, 26, '#80b8f0');
    px(c, x + 30, y + 4, 1, 26, '#80b8f0');
    px(c, x + 1, y + 29, 30, 1, '#5898d8');
    px(c, x + 4, y + 16, 24, 4, '#604028');
    disc(c, x + 10, y + 12, 3, '#f0c020');
    disc(c, x + 16, y + 13, 4, '#a040a0');
    disc(c, x + 23, y + 11, 3, '#5898d8');
  });
  regDecor('display_basket', TILE, TILE, (c, x, y) => {
    px(c, x + 4, y + 18, 24, 12, '#a06838');
    px(c, x + 4, y + 18, 24, 1, '#c89058');
    for (let i = 0; i < 5; i++) px(c, x + 5, y + 20 + i*2, 22, 1, '#704a20');
    for (let i = 0; i < 5; i++) px(c, x + 6 + i*5, y + 18, 1, 12, '#704a20');
    for (let i = 0; i < 4; i++) {
      disc(c, x + 8 + i*5, y + 14, 3, ['#e83838','#f0c020','#a040a0','#48a040'][i]);
    }
  });

  // ----- HEALING POD (6 keys; pod is 2 tiles wide) -------------------
  function podBase(c, x, y, glowColor, glowIntensity) {
    // Pod bed with ergonomic curve
    px(c, x + 2, y + 14, 28, 14, '#787890');
    px(c, x + 2, y + 14, 28, 1, '#a0a8c0');
    px(c, x + 2, y + 27, 28, 1, '#383848');
    // Glass canopy
    px(c, x + 2, y + 4, 28, 10, 'rgba(180,220,240,0.4)');
    px(c, x + 2, y + 4, 28, 1, '#fff');
    px(c, x + 2, y + 13, 28, 1, '#80b8f0');
    px(c, x + 2, y + 4, 1, 10, '#80b8f0');
    px(c, x + 30, y + 4, 1, 10, '#80b8f0');
    // Cushion (where mons would lie)
    px(c, x + 6, y + 18, 20, 6, '#383848');
    px(c, x + 6, y + 18, 20, 1, '#5860a0');
    // Side accents
    px(c, x + 6, y + 28, 20, 2, '#181820');
    // Glow if requested
    if (glowIntensity > 0) {
      const a = Math.min(1, glowIntensity);
      px(c, x + 4, y + 8, 24, 2, 'rgba(' + glowColor + ',' + (a * 0.5) + ')');
      px(c, x + 6, y + 18, 20, 4, 'rgba(' + glowColor + ',' + (a * 0.4) + ')');
    }
  }
  regDecor('pod_healing_idle',     TILE, TILE, (c, x, y) => podBase(c, x, y, '255,200,128', 0.0));
  regDecor('pod_healing_glow1',    TILE, TILE, (c, x, y) => podBase(c, x, y, '255,176,200', 0.6));
  regDecor('pod_healing_glow2',    TILE, TILE, (c, x, y) => podBase(c, x, y, '255,232,160', 0.9));
  regDecor('pod_healing_complete', TILE, TILE, (c, x, y) => podBase(c, x, y, '160,232,176', 0.5));
  regDecor('pod_console', TILE, TILE, (c, x, y) => {
    px(c, x + 4, y + 14, 24, 16, '#383848');
    px(c, x + 4, y + 14, 24, 1, '#5860a0');
    px(c, x + 6, y + 8, 20, 8, '#202028');
    px(c, x + 7, y + 9, 18, 6, '#48a040');
    for (let i = 0; i < 3; i++) px(c, x + 9 + i*6, y + 11, 4, 1, '#a8d878');
    for (let i = 0; i < 4; i++) {
      disc(c, x + 8 + i*5, y + 22, 2, ['#e83838','#f0c020','#48a040','#5898d8'][i]);
    }
  });
  regDecor('pod_bed_left', TILE, TILE, (c, x, y) => {
    // Left half of a 2-wide pod (mirror image of pod_healing_idle's left side)
    px(c, x + 12, y + 14, 20, 14, '#787890');
    px(c, x + 12, y + 14, 20, 1, '#a0a8c0');
    px(c, x + 12, y + 27, 20, 1, '#383848');
    px(c, x + 12, y + 4, 20, 10, 'rgba(180,220,240,0.4)');
    px(c, x + 12, y + 4, 20, 1, '#fff');
    px(c, x + 12, y + 13, 20, 1, '#80b8f0');
    px(c, x + 12, y + 4, 1, 10, '#80b8f0');
    px(c, x + 14, y + 18, 18, 6, '#383848');
    px(c, x + 14, y + 18, 18, 1, '#5860a0');
    px(c, x + 14, y + 28, 18, 2, '#181820');
  });

  // ----- LAMPS & LIGHTS (6) ------------------------------------------
  regDecor('lamp_ornate_gold', TILE, TILE, (c, x, y) => {
    px(c, x + 14, y + 16, 4, 14, '#806010');
    px(c, x + 12, y + 28, 8, 2, '#f0c020');
    px(c, x + 10, y + 6, 12, 10, '#806010');
    px(c, x + 10, y + 6, 12, 1, '#f0c020');
    px(c, x + 11, y + 7, 10, 8, '#fff080');
    px(c, x + 13, y + 9, 6, 4, '#fff8e0');
    px(c, x + 14, y + 4, 4, 2, '#806010');
  });
  regDecor('lamp_oil_brass', TILE, TILE, (c, x, y) => {
    px(c, x + 12, y + 18, 8, 12, '#a06838');
    px(c, x + 12, y + 18, 8, 1, '#c89058');
    px(c, x + 12, y + 29, 8, 1, '#3a2010');
    px(c, x + 14, y + 8, 4, 10, '#604028');
    px(c, x + 12, y + 4, 8, 6, '#a06838');
    px(c, x + 13, y + 5, 6, 4, '#fff080');
    px(c, x + 14, y + 6, 4, 2, '#fff8e0');
  });
  regDecor('lamp_modern_chrome', TILE, TILE, (c, x, y) => {
    px(c, x + 14, y + 4, 4, 26, '#a0a0b0');
    px(c, x + 14, y + 4, 4, 1, '#e8e8f0');
    px(c, x + 8, y + 28, 16, 2, '#383848');
    px(c, x + 10, y + 4, 12, 6, '#383848');
    px(c, x + 11, y + 5, 10, 4, '#fff080');
    px(c, x + 12, y + 6, 8, 2, '#fff8e0');
  });
  regDecor('lamp_paper_lantern', TILE, TILE, (c, x, y) => {
    px(c, x + 16, y + 0, 1, 8, '#202020');
    disc(c, x + 16, y + 14, 8, '#e83838');
    disc(c, x + 16, y + 14, 7, '#f08080');
    px(c, x + 16, y + 7, 1, 14, 'rgba(255,200,200,0.55)');
    px(c, x + 9, y + 14, 14, 1, 'rgba(0,0,0,0.4)');
    px(c, x + 16, y + 22, 1, 4, '#202020');
    px(c, x + 14, y + 26, 4, 1, '#202020');
  });
  regDecor('lamp_table_brass', TILE, TILE, (c, x, y) => {
    px(c, x + 12, y + 24, 8, 6, '#a06838');
    px(c, x + 12, y + 24, 8, 1, '#c89058');
    px(c, x + 15, y + 14, 2, 10, '#a06838');
    px(c, x + 9, y + 6, 14, 10, '#604028');
    px(c, x + 9, y + 6, 14, 1, '#a06838');
    px(c, x + 11, y + 8, 10, 6, '#fff080');
    px(c, x + 13, y + 10, 6, 2, '#fff8e0');
  });
  regDecor('lamp_floor_tall', TILE, TILE, (c, x, y) => {
    px(c, x + 10, y + 28, 12, 2, '#604028');
    px(c, x + 15, y + 8, 2, 22, '#383028');
    px(c, x + 8, y + 4, 16, 8, '#604028');
    px(c, x + 10, y + 5, 12, 6, '#fff080');
    px(c, x + 12, y + 6, 8, 4, '#fff8e0');
    px(c, x + 8, y + 4, 16, 1, '#a06838');
  });

  // ----- MISC INDOOR (12) --------------------------------------------
  regDecor('bookshelf_tall', TILE, TILE, (c, x, y) => {
    px(c, x + 2, y + 0, 28, 30, '#604028');
    px(c, x + 2, y + 0, 28, 1, '#a06838');
    px(c, x + 2, y + 29, 28, 1, '#3a2010');
    for (const sy of [3, 11, 19, 27]) px(c, x + 3, y + sy, 26, 1, '#3a2010');
    const books = ['#d83838','#3878d8','#48a040','#f0c020','#a040a0','#704020'];
    for (const sy of [4, 12, 20]) for (let i = 0; i < 6; i++) {
      px(c, x + 4 + i*4, y + sy, 3, 7, books[(i + sy) % books.length]);
    }
  });
  regDecor('dresser_wood', TILE, TILE, (c, x, y) => {
    px(c, x + 2, y + 6, 28, 24, '#a06838');
    px(c, x + 2, y + 6, 28, 1, '#c89058');
    px(c, x + 2, y + 29, 28, 1, '#3a2010');
    for (const sy of [10, 18, 26]) px(c, x + 3, y + sy, 26, 1, '#3a2010');
    for (const sy of [8, 16, 24]) {
      px(c, x + 14, y + sy, 4, 1, '#383028');
      px(c, x + 14, y + sy + 1, 4, 1, '#383028');
    }
  });
  regDecor('nightstand', TILE, TILE, (c, x, y) => {
    px(c, x + 8, y + 12, 16, 18, '#a06838');
    px(c, x + 8, y + 12, 16, 1, '#c89058');
    px(c, x + 8, y + 29, 16, 1, '#3a2010');
    px(c, x + 9, y + 19, 14, 1, '#3a2010');
    px(c, x + 14, y + 16, 4, 2, '#383028');
    px(c, x + 14, y + 23, 4, 2, '#383028');
    disc(c, x + 16, y + 8, 3, '#fff8a0');
    px(c, x + 14, y + 6, 4, 2, '#a06838');
  });
  regDecor('bed_single_blue', TILE, TILE, (c, x, y) => {
    px(c, x + 2, y + 12, 28, 16, '#604028');
    px(c, x + 2, y + 12, 28, 1, '#a06838');
    px(c, x + 2, y + 27, 28, 1, '#3a2010');
    px(c, x + 4, y + 14, 24, 8, '#3878d8');
    px(c, x + 4, y + 14, 24, 1, '#80b8f0');
    px(c, x + 4, y + 8, 8, 8, '#fff8e0');
    px(c, x + 4, y + 8, 8, 1, '#a0a0a0');
  });
  regDecor('bed_single_pink', TILE, TILE, (c, x, y) => {
    px(c, x + 2, y + 12, 28, 16, '#604028');
    px(c, x + 2, y + 12, 28, 1, '#a06838');
    px(c, x + 2, y + 27, 28, 1, '#3a2010');
    px(c, x + 4, y + 14, 24, 8, '#f098c0');
    px(c, x + 4, y + 14, 24, 1, '#fff0f8');
    px(c, x + 4, y + 8, 8, 8, '#fff8e0');
    px(c, x + 4, y + 8, 8, 1, '#a0a0a0');
  });
  regDecor('rug_round_red', TILE, TILE, (c, x, y) => {
    disc(c, x + 16, y + 16, 13, '#a01828');
    disc(c, x + 16, y + 16, 11, '#d83838');
    disc(c, x + 16, y + 16, 8, '#f0c020');
    disc(c, x + 16, y + 16, 5, '#a01828');
    disc(c, x + 16, y + 16, 2, '#fff');
  });
  regDecor('rug_long_persian', TILE, TILE, (c, x, y) => {
    px(c, x + 1, y + 8, 30, 16, '#a01828');
    px(c, x + 1, y + 8, 30, 1, '#604018');
    px(c, x + 1, y + 23, 30, 1, '#604018');
    for (let i = 0; i < 4; i++) {
      const cx = x + 5 + i*7;
      px(c, cx, y + 12, 4, 8, '#f0c020');
      px(c, cx + 1, y + 14, 2, 4, '#a01828');
    }
    for (let i = 0; i < 7; i++) px(c, x + 1 + i*5, y + 6, 1, 1, '#fff8e0');
    for (let i = 0; i < 7; i++) px(c, x + 1 + i*5, y + 25, 1, 1, '#fff8e0');
  });
  regDecor('picture_frame_landscape', TILE, TILE, (c, x, y) => {
    px(c, x + 2, y + 4, 28, 20, '#a06838');
    px(c, x + 4, y + 6, 24, 16, '#5898d8');
    px(c, x + 4, y + 16, 24, 6, '#48a040');
    px(c, x + 4, y + 18, 24, 4, '#388a40');
    disc(c, x + 22, y + 9, 3, '#fff080');
    for (let i = 0; i < 4; i++) px(c, x + 6 + i*4, y + 13, 2, 1, '#fff8e0');
  });
  regDecor('wall_clock_round', TILE, TILE, (c, x, y) => {
    disc(c, x + 16, y + 16, 12, '#604028');
    disc(c, x + 16, y + 16, 11, '#fff8e0');
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6 - Math.PI / 2;
      const cx = Math.round(x + 16 + Math.cos(a) * 9);
      const cy = Math.round(y + 16 + Math.sin(a) * 9);
      px(c, cx, cy, 1, 1, '#202020');
    }
    px(c, x + 16, y + 10, 1, 7, '#202020');
    px(c, x + 16, y + 16, 6, 1, '#202020');
    disc(c, x + 16, y + 16, 1, '#202020');
  });
  regDecor('calendar_wall', TILE, TILE, (c, x, y) => {
    px(c, x + 4, y + 4, 24, 24, '#fff8e0');
    px(c, x + 4, y + 4, 24, 1, '#a0a0a0');
    px(c, x + 4, y + 27, 24, 1, '#3a2010');
    px(c, x + 4, y + 4, 24, 6, '#a01828');
    for (let r = 0; r < 4; r++) for (let c2 = 0; c2 < 7; c2++) {
      px(c, x + 5 + c2*3, y + 11 + r*4, 2, 2, ((r+c2) & 1) ? '#fff8e0' : '#e8e0c8');
    }
  });
  regDecor('coat_rack', TILE, TILE, (c, x, y) => {
    px(c, x + 8, y + 28, 16, 2, '#3a2010');
    px(c, x + 15, y + 6, 2, 22, '#604028');
    px(c, x + 8, y + 4, 16, 4, '#604028');
    px(c, x + 11, y + 8, 4, 8, '#3878d8');
    px(c, x + 18, y + 9, 4, 6, '#a01828');
    px(c, x + 12, y + 14, 8, 1, '#202020');
  });
  regDecor('umbrella_stand', TILE, TILE, (c, x, y) => {
    px(c, x + 11, y + 18, 10, 12, '#a06838');
    px(c, x + 11, y + 18, 10, 1, '#c89058');
    px(c, x + 11, y + 29, 10, 1, '#3a2010');
    px(c, x + 13, y + 6, 1, 14, '#383028');
    px(c, x + 18, y + 8, 1, 12, '#383028');
    disc(c, x + 13, y + 5, 4, '#3878d8');
    disc(c, x + 18, y + 7, 4, '#e83838');
  });

  // ----- MISC OUTDOOR (12) -------------------------------------------
  regDecor('vending_drinks_blue', TILE, TILE, (c, x, y) => {
    px(c, x + 4, y + 2, 24, 28, '#3878d8');
    px(c, x + 4, y + 2, 24, 1, '#80b8f0');
    px(c, x + 4, y + 29, 24, 1, '#1a3868');
    px(c, x + 6, y + 5, 20, 12, '#202020');
    px(c, x + 7, y + 6, 18, 10, '#80c0f8');
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
      const cx = x + 9 + i*7, cy = y + 7 + j*4;
      px(c, cx, cy, 4, 3, ['#e83838','#48a040','#f0c020'][i]);
    }
    px(c, x + 6, y + 19, 20, 8, '#1a3868');
    px(c, x + 8, y + 21, 16, 1, '#fff8e0');
  });
  regDecor('vending_snacks_red', TILE, TILE, (c, x, y) => {
    px(c, x + 4, y + 2, 24, 28, '#a01828');
    px(c, x + 4, y + 2, 24, 1, '#e85060');
    px(c, x + 4, y + 29, 24, 1, '#400810');
    px(c, x + 6, y + 5, 20, 16, '#202020');
    px(c, x + 7, y + 6, 18, 14, 'rgba(180,220,240,0.4)');
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      px(c, x + 9 + i*6, y + 7 + j*4, 4, 3, ['#f0c020','#48a040','#a040a0'][(i+j)%3]);
    }
    px(c, x + 6, y + 22, 20, 6, '#400810');
    px(c, x + 14, y + 24, 4, 2, '#fff8e0');
  });
  regDecor('water_fountain_round', TILE, TILE, (c, x, y) => {
    disc(c, x + 16, y + 18, 12, '#787870');
    disc(c, x + 16, y + 18, 10, '#a0a098');
    disc(c, x + 16, y + 18, 9, '#5898d8');
    px(c, x + 14, y + 8, 4, 12, '#a0a098');
    disc(c, x + 16, y + 6, 3, '#787870');
    for (let i = 0; i < 6; i++) px(c, x + 13 + i, y + 4 + (i&1)*2, 1, 2, 'rgba(180,220,240,0.7)');
  });
  regDecor('wishing_well', TILE, TILE, (c, x, y) => {
    px(c, x + 4, y + 12, 24, 16, '#787870');
    px(c, x + 4, y + 12, 24, 1, '#a0a098');
    px(c, x + 4, y + 27, 24, 1, '#383830');
    for (let i = 0; i < 5; i++) px(c, x + 4 + i*5, y + 16, 1, 12, '#383830');
    px(c, x + 7, y + 20, 18, 4, '#202028');
    px(c, x + 6, y + 6, 20, 6, '#704a20');
    px(c, x + 6, y + 6, 20, 1, '#a06838');
    px(c, x + 14, y + 4, 4, 8, '#604028');
  });
  regDecor('basketball_hoop', TILE, TILE, (c, x, y) => {
    px(c, x + 14, y + 14, 4, 16, '#383028');
    px(c, x + 6, y + 4, 20, 6, '#fff8e0');
    px(c, x + 6, y + 4, 20, 1, '#a0a0a0');
    px(c, x + 6, y + 9, 20, 1, '#3a2010');
    px(c, x + 13, y + 11, 6, 1, '#a01828');
    for (let i = 0; i < 5; i++) px(c, x + 12 + i, y + 11 + (i&1), 1, 4, '#fff');
  });
  regDecor('pedestal_statue', TILE, TILE, (c, x, y) => {
    px(c, x + 6, y + 22, 20, 8, '#787870');
    px(c, x + 6, y + 22, 20, 1, '#a0a098');
    px(c, x + 6, y + 29, 20, 1, '#383830');
    px(c, x + 12, y + 8, 8, 14, '#a0a098');
    px(c, x + 13, y + 9, 6, 13, '#e8e8e8');
    px(c, x + 14, y + 4, 4, 4, '#a0a098');
    disc(c, x + 16, y + 6, 2, '#fff');
    px(c, x + 12, y + 14, 8, 1, '#a0a098');
  });
  regDecor('street_clock', TILE, TILE, (c, x, y) => {
    px(c, x + 14, y + 14, 4, 16, '#383028');
    px(c, x + 12, y + 28, 8, 2, '#202020');
    disc(c, x + 16, y + 8, 7, '#383028');
    disc(c, x + 16, y + 8, 6, '#fff8e0');
    px(c, x + 16, y + 4, 1, 5, '#202020');
    px(c, x + 16, y + 8, 4, 1, '#202020');
    disc(c, x + 16, y + 8, 1, '#202020');
  });
  regDecor('bus_stop_sign', TILE, TILE, (c, x, y) => {
    px(c, x + 14, y + 14, 4, 16, '#383028');
    px(c, x + 4, y + 4, 24, 12, '#3878d8');
    px(c, x + 4, y + 4, 24, 1, '#80b8f0');
    px(c, x + 4, y + 15, 24, 1, '#1a3868');
    px(c, x + 12, y + 6, 8, 8, '#fff8e0');
    px(c, x + 14, y + 8, 4, 4, '#3878d8');
  });
  regDecor('bike_rack', TILE, TILE, (c, x, y) => {
    px(c, x + 4, y + 24, 24, 6, '#604028');
    for (let i = 0; i < 4; i++) {
      px(c, x + 6 + i*6, y + 8, 1, 16, '#a0a098');
      px(c, x + 6 + i*6, y + 8, 4, 1, '#a0a098');
      px(c, x + 9 + i*6, y + 8, 1, 16, '#a0a098');
    }
  });
  regDecor('parking_meter', TILE, TILE, (c, x, y) => {
    px(c, x + 14, y + 16, 4, 14, '#383028');
    px(c, x + 12, y + 28, 8, 2, '#202020');
    px(c, x + 11, y + 8, 10, 10, '#604028');
    px(c, x + 11, y + 8, 10, 1, '#a06838');
    px(c, x + 13, y + 10, 6, 6, '#fff8e0');
    px(c, x + 14, y + 12, 4, 1, '#202020');
    px(c, x + 14, y + 14, 4, 1, '#202020');
  });
  regDecor('bollard', TILE, TILE, (c, x, y) => {
    px(c, x + 13, y + 28, 6, 2, '#202020');
    px(c, x + 13, y + 12, 6, 18, '#a0a098');
    px(c, x + 13, y + 12, 6, 1, '#e8e8e8');
    px(c, x + 13, y + 16, 6, 1, '#e83838');
    disc(c, x + 16, y + 11, 3, '#a0a098');
  });
  regDecor('streetlamp_ornate_double', TILE, TILE, (c, x, y) => {
    px(c, x + 15, y + 14, 2, 16, '#202020');
    px(c, x + 12, y + 28, 8, 2, '#383028');
    px(c, x + 6, y + 12, 20, 2, '#202020');
    px(c, x + 6, y + 4, 6, 8, '#604028');
    px(c, x + 7, y + 5, 4, 6, '#fff080');
    px(c, x + 8, y + 6, 2, 4, '#fff8e0');
    px(c, x + 20, y + 4, 6, 8, '#604028');
    px(c, x + 21, y + 5, 4, 6, '#fff080');
    px(c, x + 22, y + 6, 2, 4, '#fff8e0');
  });

  // ------------------------------------------------------------------
  // === CHARACTERS ===================================================
  // 32x32 trainer-style sprites with outlined silhouette, multi-tone
  // shading. Uses a parameterised palette per character type.
  //
  // Palette object fields: outline, hat, hatShade, hair (optional, for
  // NPCs without hats), skin, skinShade, shirt, shirtShade, accent
  // (chest stripe / collar), pants, pantsShade, shoes.
  // ------------------------------------------------------------------

  const PAL_PLAYER = {
    outline:'#1a1a1a', hat:'#d83020', hatShade:'#a01818',
    skin:'#f0c898', skinShade:'#c89868',
    shirt:'#d83838', shirtShade:'#a01818',
    accent:'#f0c020',
    pants:'#3050a8', pantsShade:'#1a2860',
    shoes:'#1a1a1a'
  };

  // Variant factory for NPCs from a 4-color seed mirroring NPC_PALETTES.
  // seed: { hat, hair, shirt, accent }
  function npcPalette(seed, kind) {
    const dim = (hex) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const f = (v) => Math.max(0, (v * 0.65) | 0).toString(16).padStart(2, '0');
      return '#' + f(r) + f(g) + f(b);
    };
    return {
      outline:'#1a1a1a',
      hat: seed.hat,
      hatShade: dim(seed.hat),
      skin:'#f0c898', skinShade:'#c89868',
      shirt: seed.shirt,
      shirtShade: dim(seed.shirt),
      accent: seed.accent,
      pants: seed.pants || '#383028',
      pantsShade: seed.pants ? dim(seed.pants) : '#1a1410',
      shoes:'#1a1a1a',
      gear: seed.gear || null,
      kind: kind || null
    };
  }

  // Mapping of NPC kinds to palette seeds (visually distinct types).
  const NPC_SEEDS = {
    player:    { hat:'#d83020', shirt:'#d83838', accent:'#f0c020', pants:'#3050a8' },
    npc_oak:   { hat:'#a0a0a0', shirt:'#fff',    accent:'#a06030', pants:'#5a4838' },
    npc_mom:   { hat:'#e84838', shirt:'#e0a0c0', accent:'#a02858', pants:'#a02858' },
    npc_sis:   { hat:'#f04830', shirt:'#5898d8', accent:'#3060a0', pants:'#3060a0' },
    npc_rival: { hat:'#c02020', shirt:'#404040', accent:'#202020', pants:'#202020' },
    npc_girl:  { hat:'#e84030', shirt:'#f08080', accent:'#c04040', pants:'#a02040' },
    npc_youth: { hat:'#d83020', shirt:'#f0d020', accent:'#a08818', pants:'#383028' },
    npc_old:   { hat:'#b03020', shirt:'#587858', accent:'#283828', pants:'#382820' },
    nurse:     { hat:'#fff8e8', shirt:'#fff8f8', accent:'#f098c0', pants:'#fff8f8' },
    clerk:     { hat:'#d83020', shirt:'#3858c8', accent:'#202858', pants:'#202858' },
    trainer_bug_catcher: { hat:'#4fa83a', shirt:'#7ac65a', accent:'#f0e060', pants:'#284820', gear:'net' },
    trainer_picnicker:   { hat:'#f060a0', shirt:'#ffd070', accent:'#d84070', pants:'#4068b0', gear:'flower' },
    trainer_camper:      { hat:'#d87828', shirt:'#58a068', accent:'#f0d060', pants:'#685030', gear:'pack' },
    trainer_ranger:      { hat:'#287848', shirt:'#3fa070', accent:'#d8e878', pants:'#304830', gear:'leaf' },
    trainer_miner:       { hat:'#f0c020', shirt:'#6f6858', accent:'#f8f0a0', pants:'#383838', gear:'lamp' },
    trainer_hiker:       { hat:'#a06030', shirt:'#b87848', accent:'#f0c890', pants:'#504038', gear:'pick' },
    trainer_skier:       { hat:'#70b8e8', shirt:'#e8f8ff', accent:'#e84858', pants:'#4868a8', gear:'scarf' },
    trainer_sailor:      { hat:'#f8f8f8', shirt:'#3868d8', accent:'#ffffff', pants:'#202858', gear:'anchor' },
    trainer_ace:         { hat:'#7030c0', shirt:'#383848', accent:'#f0d060', pants:'#181828', gear:'star' },
    trainer_ruin_maniac: { hat:'#d8b068', shirt:'#c89050', accent:'#705038', pants:'#584030', gear:'goggles' }
  };

  // ---- Sprite poses ----
  // Each pose function takes (ctx, x, y, frame, p) where p is a palette object.

  // Nurse hat overlay: a small red cross, plus pink hair tufts at the
  // brim line. Called after the base hat has been painted in `p.hat`
  // (which is white for the nurse palette).
  function drawNurseHatFront(ctx, x, y, p) {
    // Red cross centered on the hat front (vertical bar + horizontal bar).
    const red = '#e02838';
    const redShade = '#a01828';
    px(ctx, x + 15, y + 3, 2, 4, red);
    px(ctx, x + 14, y + 4, 4, 2, red);
    // 1px shadow under the cross for legibility on white.
    px(ctx, x + 14, y + 6, 4, 1, redShade);
    px(ctx, x + 15, y + 7, 2, 1, p.outline);
    // Pink hair tufts on either side of the brim.
    const hair = p.accent || '#f098c0';
    const hairShade = '#c8688c';
    px(ctx, x + 7,  y + 7, 2, 3, hair);
    px(ctx, x + 23, y + 7, 2, 3, hair);
    px(ctx, x + 7,  y + 9, 2, 1, hairShade);
    px(ctx, x + 23, y + 9, 2, 1, hairShade);
    px(ctx, x + 6,  y + 7, 1, 3, p.outline);
    px(ctx, x + 25, y + 7, 1, 3, p.outline);
  }
  function drawNurseHatBack(ctx, x, y, p) {
    // Smaller red cross visible on the rear of the cap.
    const red = '#e02838';
    px(ctx, x + 15, y + 4, 2, 3, red);
    px(ctx, x + 14, y + 5, 4, 1, red);
    // Hair tufts on either side.
    const hair = p.accent || '#f098c0';
    const hairShade = '#c8688c';
    px(ctx, x + 7,  y + 7, 2, 3, hair);
    px(ctx, x + 23, y + 7, 2, 3, hair);
    px(ctx, x + 7,  y + 9, 2, 1, hairShade);
    px(ctx, x + 23, y + 9, 2, 1, hairShade);
    px(ctx, x + 6,  y + 7, 1, 3, p.outline);
    px(ctx, x + 25, y + 7, 1, 3, p.outline);
  }
  function drawNurseHatSide(ctx, x, y, p) {
    // Side view: a 2px red bar across the side of the cap.
    const red = '#e02838';
    px(ctx, x + 14, y + 3, 4, 1, red);
    px(ctx, x + 14, y + 4, 4, 2, red);
    // Hair tuft visible behind the brim.
    const hair = p.accent || '#f098c0';
    px(ctx, x + 9,  y + 7, 2, 3, hair);
    px(ctx, x + 8,  y + 7, 1, 3, p.outline);
  }

  // Helper: draw an outlined head with hat (used by all front-facing poses).
  function drawHead(ctx, x, y, p, opts) {
    opts = opts || {};
    const back = opts.back; // true if back of head (no face)
    // Hat top.
    px(ctx, x + 10, y + 2, 12, 1, p.outline);
    px(ctx, x + 9,  y + 3, 14, 1, p.outline);
    px(ctx, x + 9,  y + 3, 14, 1, p.hat); // overwrite: actual hat color top row
    px(ctx, x + 10, y + 3, 12, 1, p.hat);
    px(ctx, x + 8,  y + 4, 16, 3, p.hat);
    // Hat highlight band.
    px(ctx, x + 9,  y + 4, 14, 1, '#ffffff22');
    // Hat brim shadow on front.
    px(ctx, x + 8,  y + 6, 16, 1, p.hatShade);
    // Hat outline edges.
    px(ctx, x + 8,  y + 4, 1, 3, p.outline);
    px(ctx, x + 23, y + 4, 1, 3, p.outline);
    // Brim line (1px below hat).
    px(ctx, x + 8,  y + 7, 16, 1, p.outline);
    if (back) {
      // Back of head: hair-color block.
      px(ctx, x + 9,  y + 8,  14, 6, p.hat);
      px(ctx, x + 9,  y + 13, 14, 1, p.hatShade);
      px(ctx, x + 8,  y + 8,  1, 6, p.outline);
      px(ctx, x + 23, y + 8,  1, 6, p.outline);
      px(ctx, x + 9,  y + 14, 14, 1, p.outline);
      if (p.kind === 'nurse') drawNurseHatBack(ctx, x, y, p);
      return;
    }
    if (p.kind === 'nurse') drawNurseHatFront(ctx, x, y, p);
    // Face skin block.
    px(ctx, x + 9,  y + 8,  14, 6, p.skin);
    // Skin shadow on right cheek.
    px(ctx, x + 21, y + 9,  2, 4, p.skinShade);
    // Outline sides.
    px(ctx, x + 8,  y + 8,  1, 6, p.outline);
    px(ctx, x + 23, y + 8,  1, 6, p.outline);
    // Chin.
    px(ctx, x + 9,  y + 14, 14, 1, p.outline);
    // Eyes.
    px(ctx, x + 11, y + 10, 2, 2, p.outline);
    px(ctx, x + 19, y + 10, 2, 2, p.outline);
    px(ctx, x + 11, y + 10, 1, 1, '#fff');
    px(ctx, x + 19, y + 10, 1, 1, '#fff');
    // Mouth.
    px(ctx, x + 15, y + 13, 2, 1, p.outline);
  }

  // Helper: draw torso/legs/shoes given frame (0 or 1).
  // direction is 'down', 'up', or 'side'. For side, the pose is asymmetric.
  function drawBody(ctx, x, y, p, dir, frame) {
    const f = frame & 1;
    if (dir === 'side') {
      // Side-facing torso: arms swing alternately.
      // Shirt body.
      px(ctx, x + 11, y + 14, 10, 8, p.shirt);
      px(ctx, x + 11, y + 14, 10, 1, p.outline);
      px(ctx, x + 10, y + 15, 1, 7, p.outline);
      px(ctx, x + 21, y + 15, 1, 7, p.outline);
      px(ctx, x + 11, y + 21, 10, 1, p.shirtShade);
      px(ctx, x + 11, y + 22, 10, 1, p.outline);
      // Sleeve / arm forward.
      const armForward = f ? -1 : 1;
      px(ctx, x + 12 + armForward, y + 17, 3, 5, p.shirt);
      px(ctx, x + 13 + armForward, y + 21, 2, 1, p.skin);
      // Belt accent.
      px(ctx, x + 11, y + 18, 10, 1, p.accent);
      // Pants - one leg forward.
      const legA = f ? 0 : 2;
      const legB = f ? 2 : 0;
      px(ctx, x + 11 + legA, y + 23, 5, 5, p.pants);
      px(ctx, x + 13 + legB, y + 24, 4, 4, p.pantsShade);
      px(ctx, x + 11, y + 23, 10, 1, p.outline);
      px(ctx, x + 11, y + 28, 10, 1, p.outline);
      // Shoes.
      px(ctx, x + 11 + legA, y + 28, 6, 2, p.shoes);
      px(ctx, x + 13 + legB, y + 28, 5, 2, p.shoes);
      return;
    }

    // Front/back-facing torso.
    // Shirt body.
    px(ctx, x + 9,  y + 14, 14, 8, p.shirt);
    px(ctx, x + 8,  y + 15, 1, 7, p.outline);
    px(ctx, x + 23, y + 15, 1, 7, p.outline);
    px(ctx, x + 9,  y + 14, 14, 1, p.outline);
    // Shirt highlight band.
    px(ctx, x + 9,  y + 15, 14, 1, p.shirtShade);
    // Centre accent stripe / collar (front only).
    if (dir === 'down') {
      px(ctx, x + 14, y + 14, 4, 3, p.accent);
      px(ctx, x + 14, y + 14, 4, 1, p.outline);
    } else {
      // Up: collar visible from behind — narrow band.
      px(ctx, x + 13, y + 14, 6, 1, p.skin);
    }
    // Sleeves.
    px(ctx, x + 8,  y + 15, 2, 5, p.shirtShade);
    px(ctx, x + 22, y + 15, 2, 5, p.shirtShade);
    // Hands.
    if (dir === 'down') {
      px(ctx, x + 8,  y + 19, 2, 2, p.skin);
      px(ctx, x + 22, y + 19, 2, 2, p.skin);
    } else {
      px(ctx, x + 8,  y + 19, 2, 2, p.shirtShade);
      px(ctx, x + 22, y + 19, 2, 2, p.shirtShade);
    }
    // Belt line.
    px(ctx, x + 9,  y + 22, 14, 1, p.outline);
    // Pants.
    px(ctx, x + 9,  y + 23, 14, 5, p.pants);
    px(ctx, x + 9,  y + 23, 14, 1, p.outline);
    px(ctx, x + 8,  y + 23, 1, 5, p.outline);
    px(ctx, x + 23, y + 23, 1, 5, p.outline);
    // Inseam.
    px(ctx, x + 15, y + 23, 2, 5, p.outline);
    // Pant shadow.
    px(ctx, x + 9,  y + 27, 14, 1, p.pantsShade);
    // Shoes (alternating with frame).
    px(ctx, x + 9,  y + 28, 14, 1, p.outline);
    if (f === 0) {
      px(ctx, x + 9,  y + 28, 6, 3, p.shoes);
      px(ctx, x + 17, y + 28, 6, 3, p.shoes);
      px(ctx, x + 8,  y + 30, 7, 1, p.outline);
      px(ctx, x + 17, y + 30, 7, 1, p.outline);
    } else {
      px(ctx, x + 8,  y + 28, 7, 3, p.shoes);
      px(ctx, x + 18, y + 28, 6, 3, p.shoes);
      px(ctx, x + 8,  y + 31, 7, 1, p.outline);
      px(ctx, x + 18, y + 31, 6, 1, p.outline);
    }
  }

  function drawTrainerAccessory(ctx, x, y, p) {
    const g = p.gear;
    if (!g) return;
    const o = p.outline;
    const a = p.accent;
    const s = p.shirtShade;
    if (g === 'net') {
      px(ctx, x + 24, y + 12, 2, 16, o);
      px(ctx, x + 25, y + 13, 1, 14, a);
      px(ctx, x + 20, y + 7, 9, 7, o);
      px(ctx, x + 21, y + 8, 7, 5, '#e8f8d8');
      px(ctx, x + 23, y + 8, 1, 5, a);
      px(ctx, x + 21, y + 10, 7, 1, a);
    } else if (g === 'flower') {
      for (const [dx, dy] of [[0,1],[1,0],[1,2],[2,1]]) px(ctx, x + 21 + dx, y + 4 + dy, 1, 1, '#ffd0e0');
      px(ctx, x + 22, y + 5, 1, 1, '#f0d020');
    } else if (g === 'pack') {
      px(ctx, x + 6, y + 16, 3, 10, o);
      px(ctx, x + 7, y + 17, 2, 8, '#704820');
      px(ctx, x + 23, y + 17, 3, 8, o);
      px(ctx, x + 23, y + 18, 2, 6, '#704820');
    } else if (g === 'leaf') {
      px(ctx, x + 18, y + 5, 5, 3, '#e0f080');
      px(ctx, x + 19, y + 4, 3, 5, '#4fa83a');
      px(ctx, x + 21, y + 6, 3, 1, o);
    } else if (g === 'lamp') {
      px(ctx, x + 14, y + 2, 5, 2, o);
      px(ctx, x + 15, y + 3, 3, 3, '#fff090');
      px(ctx, x + 16, y + 3, 1, 1, '#ffffff');
    } else if (g === 'pick') {
      px(ctx, x + 22, y + 11, 2, 15, o);
      px(ctx, x + 20, y + 10, 8, 2, '#c0b090');
      px(ctx, x + 26, y + 12, 2, 2, o);
    } else if (g === 'scarf') {
      px(ctx, x + 9, y + 14, 14, 2, '#e84858');
      px(ctx, x + 20, y + 16, 3, 6, '#b82030');
    } else if (g === 'anchor') {
      px(ctx, x + 15, y + 16, 2, 5, a);
      px(ctx, x + 13, y + 18, 6, 1, a);
      px(ctx, x + 12, y + 19, 2, 2, a);
      px(ctx, x + 18, y + 19, 2, 2, a);
    } else if (g === 'star') {
      px(ctx, x + 16, y + 16, 1, 5, a);
      px(ctx, x + 14, y + 18, 5, 1, a);
      px(ctx, x + 15, y + 17, 3, 3, '#fff090');
    } else if (g === 'goggles') {
      px(ctx, x + 10, y + 6, 12, 2, o);
      px(ctx, x + 11, y + 6, 4, 2, '#80d8f8');
      px(ctx, x + 17, y + 6, 4, 2, '#80d8f8');
      px(ctx, x + 15, y + 7, 2, 1, s);
    }
  }

  function drawCharDown(ctx, x, y, frame, p) {
    drawHead(ctx, x, y, p, { back: false });
    drawBody(ctx, x, y, p, 'down', frame);
    drawTrainerAccessory(ctx, x, y, p);
  }
  function drawCharUp(ctx, x, y, frame, p) {
    drawHead(ctx, x, y, p, { back: true });
    drawBody(ctx, x, y, p, 'up', frame);
    drawTrainerAccessory(ctx, x, y, p);
  }
  function drawCharSide(ctx, x, y, frame, p) {
    // Side-view head: hat brim slants slightly; one eye visible.
    px(ctx, x + 12, y + 2, 12, 1, p.outline);
    px(ctx, x + 11, y + 3, 14, 1, p.hat);
    px(ctx, x + 10, y + 4, 16, 3, p.hat);
    px(ctx, x + 11, y + 4, 14, 1, '#ffffff22');
    px(ctx, x + 10, y + 6, 16, 1, p.hatShade);
    px(ctx, x + 10, y + 4, 1, 3, p.outline);
    px(ctx, x + 25, y + 4, 1, 3, p.outline);
    px(ctx, x + 10, y + 7, 16, 1, p.outline);
    if (p.kind === 'nurse') drawNurseHatSide(ctx, x, y, p);
    // Face.
    px(ctx, x + 11, y + 8,  14, 6, p.skin);
    px(ctx, x + 23, y + 9,  2, 4, p.skinShade);
    px(ctx, x + 10, y + 8, 1, 6, p.outline);
    px(ctx, x + 25, y + 8, 1, 6, p.outline);
    px(ctx, x + 11, y + 14, 14, 1, p.outline);
    // Single visible eye.
    px(ctx, x + 19, y + 10, 2, 2, p.outline);
    px(ctx, x + 19, y + 10, 1, 1, '#fff');
    // Mouth.
    px(ctx, x + 17, y + 13, 1, 1, p.outline);
    // Body.
    drawBody(ctx, x, y, p, 'side', frame);
    drawTrainerAccessory(ctx, x, y, p);
  }

  // Mirrored side draw: paint to a temp 32x32 buffer then flip horizontally
  // when copying into the atlas. Implemented at gen time via canvas.
  function drawCharSideFlip(ctx, x, y, frame, p) {
    // Render into an offscreen 32x32 then drawImage flipped.
    const off = document.createElement('canvas');
    off.width = TILE; off.height = TILE;
    const oc = off.getContext('2d');
    drawCharSide(oc, 0, 0, frame, p);
    ctx.save();
    ctx.translate(x + TILE, y);
    ctx.scale(-1, 1);
    ctx.drawImage(off, 0, 0);
    ctx.restore();
  }

  // Register all character frames.
  function registerCharacters() {
    // Player frames.
    for (let f = 0; f < 2; f++) {
      regChar('player_down_'  + f, ((ff) => (c, x, y) => drawCharDown    (c, x, y, ff, PAL_PLAYER))(f));
      regChar('player_up_'    + f, ((ff) => (c, x, y) => drawCharUp      (c, x, y, ff, PAL_PLAYER))(f));
      regChar('player_left_'  + f, ((ff) => (c, x, y) => drawCharSide    (c, x, y, ff, PAL_PLAYER))(f));
      regChar('player_right_' + f, ((ff) => (c, x, y) => drawCharSideFlip(c, x, y, ff, PAL_PLAYER))(f));
    }
    // Each NPC kind (except 'ball'): 4 dirs × 2 frames.
    for (const kind of Object.keys(NPC_SEEDS)) {
      if (kind === 'player') continue;
      const pal = npcPalette(NPC_SEEDS[kind], kind);
      for (let f = 0; f < 2; f++) {
        regChar(kind + '_down_'  + f, ((ff, pp) => (c, x, y) => drawCharDown    (c, x, y, ff, pp))(f, pal));
        regChar(kind + '_up_'    + f, ((ff, pp) => (c, x, y) => drawCharUp      (c, x, y, ff, pp))(f, pal));
        regChar(kind + '_left_'  + f, ((ff, pp) => (c, x, y) => drawCharSide    (c, x, y, ff, pp))(f, pal));
        regChar(kind + '_right_' + f, ((ff, pp) => (c, x, y) => drawCharSideFlip(c, x, y, ff, pp))(f, pal));
      }
    }
    // Pokeball pickup.
    regChar('ball', drawBallSprite);
  }

  function drawBallSprite(c, x, y) {
    // Centered 18px ball.
    const cx = x + 16, cy = y + 18;
    // Outline.
    disc(c, cx, cy, 9, '#1a1a1a');
    // White lower hemisphere.
    disc(c, cx, cy, 8, '#e8e8e8');
    // Red upper hemisphere.
    px(c, x + 8, y + 11, 18, 7, '#1a1a1a');
    px(c, x + 9, y + 11, 16, 6, '#e83838');
    px(c, x + 9, y + 11, 16, 1, '#f08080');
    // Equator band.
    px(c, x + 7, y + 17, 20, 2, '#1a1a1a');
    // Center button.
    px(c, x + 14, y + 16, 4, 4, '#1a1a1a');
    px(c, x + 15, y + 17, 2, 2, '#fff');
    // Highlight (glossy).
    px(c, x + 11, y + 13, 2, 1, '#fff');
    // Shadow.
    px(c, x + 9, y + 27, 14, 1, '#0006');
  }

  // ------------------------------------------------------------------
  // === CREATURES (64x64) ============================================
  // Reuses the existing 32x32 logical creature shapes from
  // js/sprites_mons.js but renders them at 2x logical -> 64px native and
  // adds an outline / shading pass for FRLG-style detail.
  // ------------------------------------------------------------------

  // Convenience darken / lighten.
  function shade(hex, factor) {
    if (!hex || hex[0] !== '#' || hex.length !== 7) return hex;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const f = (v) => Math.max(0, Math.min(255, (v * factor) | 0)).toString(16).padStart(2, '0');
    return '#' + f(r) + f(g) + f(b);
  }

  // Render a creature into a 64x64 cell. We render into an offscreen 64x64,
  // then scan its pixel data to add a 1px black outline anywhere a non-
  // transparent pixel meets a transparent pixel. This produces a clean
  // FRLG-style silhouette.
  function drawCreatureSprite(ctx, x, y, species) {
    const off = document.createElement('canvas');
    off.width = 64; off.height = 64;
    const oc = off.getContext('2d');
    // Use existing renderer if available (game-time generation context).
    if (typeof window !== 'undefined' && window.PR_MONS && window.PR_DATA &&
        window.PR_DATA.CREATURES && window.PR_DATA.CREATURES[species]) {
      // Render at 64x64 using PR_MONS (which already supports any size).
      window.PR_MONS.drawCreature(oc, species, 0, 0, 64, false);
      // Add detail pass: outline + light/dark edge highlights from upper-left.
      addOutlineAndShade(oc);
    } else {
      // Fallback placeholder.
      px(oc, 0, 0, 64, 64, '#444');
      px(oc, 16, 16, 32, 32, '#888');
    }
    ctx.drawImage(off, x, y);
  }

  function addOutlineAndShade(oc) {
    const w = oc.canvas.width, h = oc.canvas.height;
    const img = oc.getImageData(0, 0, w, h);
    const d = img.data;
    const isOpaque = (i) => d[i + 3] > 8;
    // Pass 1: collect outline cells (transparent pixel adjacent to opaque).
    const outline = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (isOpaque(i)) continue;
        // Check 4-neighbors.
        const up    = y > 0     ? ((y - 1) * w + x) * 4 : -1;
        const down  = y < h - 1 ? ((y + 1) * w + x) * 4 : -1;
        const left  = x > 0     ? (y * w + (x - 1)) * 4 : -1;
        const right = x < w - 1 ? (y * w + (x + 1)) * 4 : -1;
        if ((up    !== -1 && isOpaque(up))    ||
            (down  !== -1 && isOpaque(down))  ||
            (left  !== -1 && isOpaque(left))  ||
            (right !== -1 && isOpaque(right))) {
          outline[y * w + x] = 1;
        }
      }
    }
    // Pass 2: write outline pixels (black).
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (outline[y * w + x]) {
          const i = (y * w + x) * 4;
          d[i] = 16; d[i + 1] = 16; d[i + 2] = 16; d[i + 3] = 255;
        }
      }
    }
    // Pass 3: subtle edge shading. For each opaque pixel, if the pixel
    // up-and-left is transparent or outline, lighten it by 1.18; if the
    // pixel down-and-right is transparent or outline, darken by 0.78.
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = (y * w + x) * 4;
        if (!isOpaque(i)) continue;
        const ul = ((y - 1) * w + (x - 1)) * 4;
        const dr = ((y + 1) * w + (x + 1)) * 4;
        if (d[ul + 3] < 128 || outline[(y - 1) * w + (x - 1)]) {
          d[i]     = Math.min(255, (d[i]     * 1.18) | 0);
          d[i + 1] = Math.min(255, (d[i + 1] * 1.18) | 0);
          d[i + 2] = Math.min(255, (d[i + 2] * 1.18) | 0);
        } else if (d[dr + 3] < 128 || outline[(y + 1) * w + (x + 1)]) {
          d[i]     = (d[i]     * 0.78) | 0;
          d[i + 1] = (d[i + 1] * 0.78) | 0;
          d[i + 2] = (d[i + 2] * 0.78) | 0;
        }
      }
    }
    oc.putImageData(img, 0, 0);
  }

  // Register every creature in window.PR_DATA.CREATURES at gen time.
  function registerCreatures() {
    if (typeof window === 'undefined' || !window.PR_DATA || !window.PR_DATA.CREATURES) return;
    const list = Object.keys(window.PR_DATA.CREATURES);
    for (const species of list) {
      CREATURES.push({
        key: 'creature_' + species,
        w: CREATURE,
        h: CREATURE,
        draw: ((sp) => (c, x, y) => drawCreatureSprite(c, x, y, sp))(species)
      });
    }
  }

  function clampByte(v) {
    return Math.max(0, Math.min(255, v | 0));
  }

  function nearestPaletteColor(r, g, b, palette) {
    let best = palette[0], bestDist = Infinity;
    for (const p of palette) {
      const dr = r - p[0], dg = g - p[1], db = b - p[2];
      const dist = dr * dr * 0.8 + dg * dg * 1.2 + db * db;
      if (dist < bestDist) {
        bestDist = dist;
        best = p;
      }
    }
    return best;
  }

  function applyGbRed(data) {
    const palette = [
      [15, 56, 15],
      [48, 98, 48],
      [139, 172, 15],
      [155, 188, 15]
    ];
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 8) continue;
      const lum = data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
      const idx = lum < 66 ? 0 : lum < 128 ? 1 : lum < 190 ? 2 : 3;
      const p = palette[idx];
      data[i] = p[0]; data[i + 1] = p[1]; data[i + 2] = p[2];
    }
  }

  function applyGbcYellow(data) {
    const palette = [
      [24, 24, 32], [42, 42, 48], [62, 56, 54], [84, 74, 64],
      [112, 96, 72], [145, 122, 82], [178, 146, 90], [212, 174, 96],
      [238, 204, 108], [255, 226, 126], [255, 238, 164], [255, 248, 212],
      [70, 48, 34], [104, 70, 42], [142, 92, 48], [184, 118, 58],
      [222, 154, 74], [245, 190, 102], [90, 40, 40], [132, 48, 44],
      [176, 62, 54], [218, 78, 66], [244, 114, 82], [255, 166, 114],
      [42, 72, 46], [58, 104, 52], [78, 136, 58], [104, 170, 70],
      [140, 202, 86], [184, 226, 120], [30, 58, 86], [42, 82, 124],
      [58, 112, 166], [82, 146, 206], [122, 184, 232], [174, 220, 246],
      [76, 52, 106], [104, 68, 146], [134, 84, 178], [168, 108, 204],
      [206, 136, 218], [238, 178, 232], [42, 92, 88], [58, 130, 116],
      [78, 166, 146], [112, 202, 172], [164, 228, 198], [214, 246, 226],
      [72, 72, 82], [102, 102, 112], [136, 136, 144], [170, 170, 172],
      [202, 202, 194], [230, 230, 212], [250, 250, 232]
    ];
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 8) continue;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const p = nearestPaletteColor(r, g, b, palette);
      data[i] = p[0]; data[i + 1] = p[1]; data[i + 2] = p[2];
    }
  }

  function applyDsDiamond(data) {
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 8) continue;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const lum = r * 0.2126 + g * 0.7152 + b * 0.0722;
      let nr = lum + (r - lum) * 1.2;
      let ng = lum + (g - lum) * 1.16;
      let nb = lum + (b - lum) * 1.24;
      nr = (nr - 128) * 1.08 + 143;
      ng = (ng - 128) * 1.08 + 143;
      nb = (nb - 128) * 1.08 + 150;
      if (lum > 185) {
        nr += 10; ng += 12; nb += 16;
      } else if (lum < 70) {
        nr -= 8; ng -= 7; nb -= 4;
      }
      data[i] = clampByte(nr);
      data[i + 1] = clampByte(ng);
      data[i + 2] = clampByte(nb);
    }
  }

  function applyAtlasStyle(ctx, styleId, x, y, w, h) {
    if (!styleId || styleId === 'gba_firered') return;
    x = x || 0; y = y || 0; w = w || ctx.canvas.width; h = h || ctx.canvas.height;
    const img = ctx.getImageData(x, y, w, h);
    if (styleId === 'gb_red') applyGbRed(img.data);
    else if (styleId === 'gbc_yellow') applyGbcYellow(img.data);
    else if (styleId === 'ds_diamond') applyDsDiamond(img.data);
    ctx.putImageData(img, x, y);
  }

  // ------------------------------------------------------------------
  // Public exports for the generator page.
  // ------------------------------------------------------------------
  window.PR_ATLAS_ART = {
    TILE_SIZE: TILE,
    CREATURE_SIZE: CREATURE,
    STYLE_PRESETS,
    applyAtlasStyle,
    TILES,
    TILE_VARIANTS,
    CHARS,
    CREATURES,
    registerCharacters,
    registerCreatures
  };
})();

