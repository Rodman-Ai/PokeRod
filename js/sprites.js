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
function drawTile(ctx, code, sx, sy, context) {
  const x = sx | 0, y = sy | 0;
  let drawX = x;
  if (FOLIAGE_CODES.indexOf(code) !== -1) {
    drawX += Math.round(Math.sin((performance.now() + sx * 7 + sy * 11) / 700));
  }
  if (window.PR_ATLAS && window.PR_ATLAS.isReady()) {
    if (window.PR_ATLAS.drawTileCode(ctx, code, drawX, y, context)) return;
  }
  // Atlas not yet ready: draw a placeholder grass-coloured tile.
  px(ctx, x, y, TS, TS, '#5cae4c');
}

window.PR_TILES = { drawTile, TS, px };
