// Tile renderer. Delegates to the prerendered atlas (assets/atlas.png)
// loaded by js/atlas.js. The detailed procedural source for the atlas
// lives in tools/atlas-art.js and is run via tools/run-generator.js.
'use strict';

const TS = 32; // tile size in source pixels (atlas tiles are 32x32)

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
}

// Draw a single tile at (sx, sy) in destination ctx. Foliage / object
// tiles get a subtle horizontal sway (+/-1 px) so neighbours don't move
// in unison. The 1-px column the tile vacates would reveal whatever the
// world layer cleared to underneath - world.js now clears to grass green
// so the gap blends in instead of showing as a black seam.
const FOLIAGE_CODES = 'TYOKJQNUVEGbceghjklmn';
const FIXTURE_CODES = 'Ddf[]';
const WALL_CODES = 'B#@$?!0';

function fixtureUnderlay(code, context) {
  if (FIXTURE_CODES.indexOf(code) === -1 || !context || !context.map) return null;
  const m = context.map;
  const x = context.tx, y = context.ty;
  const at = (xx, yy) => {
    if (yy < 0 || yy >= m.tiles.length) return null;
    const row = m.tiles[yy];
    return xx >= 0 && xx < row.length ? row[xx] : null;
  };
  const candidates = [
    at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1),
    at(x - 1, y - 1), at(x + 1, y - 1)
  ];
  for (const c of candidates) {
    if (c && WALL_CODES.indexOf(c) !== -1) return c;
  }
  for (const c of candidates) {
    if (c && FIXTURE_CODES.indexOf(c) === -1) return c;
  }
  return null;
}

function drawTile(ctx, code, sx, sy, context) {
  const x = sx | 0, y = sy | 0;
  let drawX = x;
  if (FOLIAGE_CODES.indexOf(code) !== -1) {
    drawX += Math.round(Math.sin((performance.now() + sx * 7 + sy * 11) / 700));
  }
  if (window.PR_ATLAS && window.PR_ATLAS.isReady()) {
    const under = fixtureUnderlay(code, context);
    if (under) window.PR_ATLAS.drawTileCode(ctx, under, drawX, y, context);
    if (window.PR_ATLAS.drawTileCode(ctx, code, drawX, y, context)) {
      // Stamp a per-tile detail overlay on grass/dirt/tree/bush codes
      // so the world reads as varied instead of repeating-texture. The
      // variation is hashed off the cell's (x, y, code) so it's stable
      // across frames.
      if (window.PR_VARIATION && context && context.tx != null) {
        window.PR_VARIATION.paint(ctx, code, drawX, y, context.tx, context.ty);
      }
      return;
    }
  }
  // Atlas not yet ready: draw a placeholder grass-coloured tile.
  px(ctx, x, y, TS, TS, '#5cae4c');
}

window.PR_TILES = { drawTile, TS, px };
