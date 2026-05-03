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

  function regTile(code, name, w, h, draw) {
    TILES.push({ key: 'tile_' + name, code, w, h, draw });
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
    // Stone wall context.
    px(c, x, y, TILE, TILE, '#98908a');
    px(c, x, y, TILE, 2, '#685858');
    // Door frame (slightly recessed).
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
    // Wall under awning.
    px(c, x, y + 10, TILE, TILE - 10, '#98908a');
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

  // Window panes: '[' = left half of stone wall window, ']' = right half.
  // Each is a full 32x32 tile with stone wall background and a window
  // taking up the half closest to the centerline of a 64-wide window.
  regTile('[', 'window_left', TILE, TILE, (c, x, y) => {
    // Stone wall.
    px(c, x, y, TILE, TILE, '#98908a');
    for (let r = 0; r < TILE; r += 8) px(c, x, y + r, TILE, 1, '#685858');
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
    // Stone wall.
    px(c, x, y, TILE, TILE, '#98908a');
    for (let r = 0; r < TILE; r += 8) px(c, x, y + r, TILE, 1, '#685858');
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
  function npcPalette(seed) {
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
      shoes:'#1a1a1a'
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
    nurse:     { hat:'#e83040', shirt:'#fff',    accent:'#e8c8c8', pants:'#fff'    },
    clerk:     { hat:'#d83020', shirt:'#3858c8', accent:'#202858', pants:'#202858' }
  };

  // ---- Sprite poses ----
  // Each pose function takes (ctx, x, y, frame, p) where p is a palette object.

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
      return;
    }
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

  function drawCharDown(ctx, x, y, frame, p) {
    drawHead(ctx, x, y, p, { back: false });
    drawBody(ctx, x, y, p, 'down', frame);
  }
  function drawCharUp(ctx, x, y, frame, p) {
    drawHead(ctx, x, y, p, { back: true });
    drawBody(ctx, x, y, p, 'up', frame);
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
      const pal = npcPalette(NPC_SEEDS[kind]);
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

  // ------------------------------------------------------------------
  // Public exports for the generator page.
  // ------------------------------------------------------------------
  window.PR_ATLAS_ART = {
    TILE_SIZE: TILE,
    CREATURE_SIZE: CREATURE,
    TILES,
    CHARS,
    CREATURES,
    registerCharacters,
    registerCreatures
  };
})();

