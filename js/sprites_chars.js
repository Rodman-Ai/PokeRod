// Player and NPC overworld sprites. Delegates to the prerendered atlas
// (assets/atlas.png). Frames are 32x32; 4 directions × 2 walk frames per
// character kind. Mapping of NPC kind to atlas key prefix matches the
// keys registered in tools/atlas-art.js.
'use strict';

(function () {
  const TS = 32;

  function spriteKey(kindPrefix, dir, frame) {
    const f = (frame | 0) & 1;
    // Atlas was generated with the side-view sprite facing right-by-default,
    // so the keys ending in `_left_*` are actually the right-facing pose
    // and `_right_*` are the flipped (left-facing) pose. Swap at lookup so
    // we don't have to regenerate the atlas.
    const d = (dir === 'right') ? 'left'
            : (dir === 'left')  ? 'right'
            : (dir === 'up')    ? 'up'
            : 'down';
    return kindPrefix + '_' + d + '_' + f;
  }

  // Player appearance: hue-rotate the pre-rendered atlas sprite by the
  // player's favourite colour so each save's avatar reads as different.
  // Falls back to no filter (the red default) when state isn't ready
  // yet or the colour string is unknown.
  const APPEARANCE_FILTER = {
    red:    null,
    orange: 'hue-rotate(25deg)',
    yellow: 'hue-rotate(50deg) saturate(1.15)',
    green:  'hue-rotate(110deg)',
    blue:   'hue-rotate(220deg)',
    purple: 'hue-rotate(270deg)',
    pink:   'hue-rotate(320deg)',
    black:  'saturate(0) brightness(0.6)'
  };
  function playerAppearanceFilter() {
    const s = window.PR_GAME && window.PR_GAME.state;
    if (!s || !s.player) return null;
    const ap = s.player.appearance;
    const key = String((ap && ap.color) || s.player.favColor || 'red').toLowerCase();
    return APPEARANCE_FILTER[key] || null;
  }

  function drawPlayer(ctx, sx, sy, dir, frame) {
    if (!window.PR_ATLAS || !window.PR_ATLAS.isReady()) return;
    const filter = playerAppearanceFilter();
    if (filter) {
      ctx.save();
      ctx.filter = filter;
    }
    window.PR_ATLAS.drawKey(ctx, spriteKey('player', dir, frame), sx, sy);
    if (filter) ctx.restore();
  }

  function drawNpc(ctx, sx, sy, kind, dir, frame /*, flipX */) {
    if (!window.PR_ATLAS || !window.PR_ATLAS.isReady()) return;
    if (kind === 'ball') {
      window.PR_ATLAS.drawKey(ctx, 'ball', sx, sy);
      return;
    }
    window.PR_ATLAS.drawKey(ctx, spriteKey(kind, dir, frame), sx, sy);
  }

  function dogPalette() {
    const preset = window.PR_ATLAS && window.PR_ATLAS.getPreset ? window.PR_ATLAS.getPreset() : 'gba_firered';
    if (preset === 'gb_red') {
      return { out:'#0f380f', body:'#306230', shade:'#8bac0f', hi:'#9bbc0f', collar:'#0f380f' };
    }
    if (preset === 'gbc_yellow') {
      return { out:'#3e3836', body:'#b8763a', shade:'#68462a', hi:'#ffe27e', collar:'#da4e42' };
    }
    if (preset === 'gb_pocket') {
      return { out:'#161618', body:'#a0a0a8', shade:'#505058', hi:'#dedee2', collar:'#222226' };
    }
    if (preset === 'ds_diamond') {
      return { out:'#181018', body:'#c8783f', shade:'#704018', hi:'#ffd0a0', collar:'#4068d8' };
    }
    return { out:'#2a1810', body:'#b86a38', shade:'#704020', hi:'#f0c090', collar:'#d83020' };
  }

  // Shared palette for procedural water-bird sprites (duck + swan).
  // Era-aware so each bird reads in every graphics mode.
  function birdPalette() {
    const preset = window.PR_ATLAS && window.PR_ATLAS.getPreset ? window.PR_ATLAS.getPreset() : 'gba_firered';
    if (preset === 'gb_red') {
      return {
        out:'#0f380f', water:'#8bac0f', white:'#9bbc0f', body:'#306230',
        belly:'#8bac0f', bill:'#306230', dark:'#0f380f', eye:'#0f380f'
      };
    }
    if (preset === 'gb_pocket') {
      return {
        out:'#1a1a1c', water:'#aeaeb4', white:'#e8e8ec', body:'#888890',
        belly:'#cacacc', bill:'#4a4a52', dark:'#222226', eye:'#0c0c10'
      };
    }
    if (preset === 'gbc_yellow') {
      return {
        out:'#3a2a18', water:'#7ab2d8', white:'#fff8e0', body:'#caa055',
        belly:'#f0e0a8', bill:'#f08c20', dark:'#382410', eye:'#1a1208'
      };
    }
    if (preset === 'ds_diamond') {
      return {
        out:'#1c1a14', water:'#6fa8d8', white:'#f8f8e8', body:'#c89548',
        belly:'#f0d896', bill:'#f08820', dark:'#3a2820', eye:'#0c0c10'
      };
    }
    return {
      out:'#2a1a10', water:'#5a90c8', white:'#f8f0d8', body:'#c08038',
      belly:'#f0d090', bill:'#f08820', dark:'#3a1a10', eye:'#1a1208'
    };
  }

  // ---- drawDuck -----------------------------------------------------
  // Small water bird, paddling. Anchored to a 32x32 tile but only the
  // upper ~16 px hold the body; lower rows are water-line shimmer.
  function drawDuck(ctx, sx, sy, dir, frame) {
    const p = birdPalette();
    const step = ((frame | 0) & 1) ? 1 : 0;
    const x0 = sx | 0, y0 = sy | 0;
    const r = (x, y, w, h, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(x0 + x, y0 + y, w, h);
    };
    // Water-line shimmer ripples beneath the body (animated by frame).
    r(8 + step, 22, 12 - step, 1, p.white);
    r(10, 24 + step, 10, 1, p.belly);
    if (dir === 'left' || dir === 'right') {
      const flip = dir === 'left';
      const rx = (x, w) => flip ? 32 - x - w : x;
      // Body silhouette + outline.
      r(rx(10, 14), 15, 14, 7, p.out);
      r(rx(11, 12), 16, 12, 5, p.body);
      r(rx(11, 12), 19, 12, 2, p.belly);
      // Tail (small triangle behind).
      r(rx(8, 3), 16, 3, 2, p.out);
      r(rx(9, 2), 16, 2, 1, p.body);
      // Head + neck.
      r(rx(20, 5), 12, 5, 5, p.out);
      r(rx(21, 4), 13, 4, 3, p.body);
      r(rx(22, 2), 14, 2, 1, p.dark);
      // Eye.
      r(rx(23, 1), 14, 1, 1, p.eye);
      // Bill.
      r(rx(24, 4), 14, 4, 2, p.out);
      r(rx(24, 3), 14, 3, 1, p.bill);
      return;
    }
    if (dir === 'up') {
      // Tail-on view: round back of duck with head poking forward (away).
      r(11, 14, 10, 8, p.out);
      r(12, 15, 8, 6, p.body);
      r(12, 19, 8, 2, p.belly);
      // Head at top (small bump).
      r(13, 11, 6, 4, p.out);
      r(14, 12, 4, 3, p.body);
      // Bill on the far side.
      r(15, 10, 2, 1, p.bill);
      return;
    }
    // dir === 'down' (default): face-toward-camera.
    r(11, 14, 10, 8, p.out);
    r(12, 15, 8, 6, p.body);
    r(12, 19, 8, 2, p.belly);
    // Head front-facing.
    r(13, 11, 6, 5, p.out);
    r(14, 12, 4, 3, p.body);
    // Eyes (two dots).
    r(14, 13, 1, 1, p.eye);
    r(17, 13, 1, 1, p.eye);
    // Bill.
    r(14, 15, 4, 2, p.out);
    r(15, 15, 2, 1, p.bill);
  }

  // ---- drawSwan -----------------------------------------------------
  // Larger water bird, white body, long curved neck. Frames pump the
  // neck slightly to convey paddling.
  function drawSwan(ctx, sx, sy, dir, frame) {
    const p = birdPalette();
    const step = ((frame | 0) & 1) ? 1 : 0;
    const x0 = sx | 0, y0 = sy | 0;
    const r = (x, y, w, h, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(x0 + x, y0 + y, w, h);
    };
    // Water-line shimmer.
    r(7 + step, 23, 18 - step, 1, p.white);
    r(9, 25 + step, 14, 1, p.belly);
    if (dir === 'left' || dir === 'right') {
      const flip = dir === 'left';
      const rx = (x, w) => flip ? 32 - x - w : x;
      // Body (large oval).
      r(rx(8, 16), 14, 16, 9, p.out);
      r(rx(9, 14), 15, 14, 7, p.white);
      r(rx(9, 14), 20, 14, 2, p.belly);
      // Tail (pointed back).
      r(rx(5, 4), 14, 4, 2, p.out);
      r(rx(6, 3), 14, 3, 1, p.white);
      // S-curve neck (3 segments).
      const neckBase = 14;
      r(rx(20, 3), neckBase, 3, 3, p.out);
      r(rx(21, 2), neckBase, 2, 2, p.white);
      r(rx(22, 3), neckBase - 3 - step, 3, 3, p.out);
      r(rx(23, 2), neckBase - 3 - step, 2, 2, p.white);
      r(rx(24, 3), neckBase - 5 - step, 3, 3, p.out);
      r(rx(25, 2), neckBase - 5 - step, 2, 2, p.white);
      // Head.
      r(rx(25, 4), neckBase - 7 - step, 4, 3, p.out);
      r(rx(26, 3), neckBase - 7 - step, 3, 2, p.white);
      // Eye.
      r(rx(27, 1), neckBase - 6 - step, 1, 1, p.eye);
      // Bill - orange with black tip.
      r(rx(28, 3), neckBase - 6 - step, 3, 2, p.out);
      r(rx(28, 2), neckBase - 6 - step, 2, 1, p.bill);
      r(rx(30, 1), neckBase - 6 - step, 1, 1, p.dark);
      return;
    }
    if (dir === 'up') {
      // Body.
      r(8, 14, 16, 9, p.out);
      r(9, 15, 14, 7, p.white);
      // Neck arching back (toward away camera).
      r(14, 11 - step, 4, 4, p.out);
      r(15, 11 - step, 2, 3, p.white);
      // Head at top.
      r(13, 8 - step, 6, 3, p.out);
      r(14, 8 - step, 4, 2, p.white);
      // Bill pointing away (small).
      r(15, 7 - step, 2, 1, p.bill);
      return;
    }
    // dir === 'down': face camera.
    r(8, 14, 16, 9, p.out);
    r(9, 15, 14, 7, p.white);
    r(9, 20, 14, 2, p.belly);
    // Neck arching toward camera.
    r(14, 10 + step, 4, 5, p.out);
    r(15, 10 + step, 2, 4, p.white);
    // Head front-facing.
    r(13, 7 + step, 6, 4, p.out);
    r(14, 7 + step, 4, 3, p.white);
    // Eyes.
    r(14, 8 + step, 1, 1, p.eye);
    r(17, 8 + step, 1, 1, p.eye);
    // Bill - orange with black tip.
    r(14, 10 + step, 4, 2, p.out);
    r(15, 10 + step, 2, 1, p.bill);
    r(16, 11 + step, 1, 1, p.dark);
  }

  function drawDog(ctx, sx, sy, dir, frame) {
    const p = dogPalette();
    const step = ((frame | 0) & 1) ? 1 : 0;
    const x0 = sx | 0, y0 = sy | 0;
    const r = (x, y, w, h, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(x0 + x, y0 + y, w, h);
    };
    r(8, 26, 17, 2, p.out);
    if (dir === 'left' || dir === 'right') {
      const flip = dir === 'left';
      const rx = (x, w) => flip ? 32 - x - w : x;
      r(rx(5, 5), 14, 5, 3, p.out);
      r(rx(6, 4), 13, 4, 2, p.body);
      r(rx(8, 16), 15, 16, 9, p.out);
      r(rx(9, 14), 16, 14, 7, p.body);
      r(rx(9, 14), 21, 14, 2, p.shade);
      r(rx(20, 8), 10, 8, 8, p.out);
      r(rx(21, 6), 11, 6, 6, p.body);
      r(rx(22, 3), 7, 3, 5, p.out);
      r(rx(23, 2), 8, 2, 4, p.shade);
      r(rx(26, 4), 15, 4, 3, p.out);
      r(rx(26, 3), 15, 3, 2, p.hi);
      r(rx(23, 1), 13, 1, 1, p.out);
      r(rx(12, 10), 16, 10, 2, p.collar);
      r(rx(10, 3), 23, 3, 4 + step, p.out);
      r(rx(20, 3), 23, 3, 5 - step, p.out);
      r(rx(11, 2), 23, 2, 3 + step, p.body);
      r(rx(21, 2), 23, 2, 4 - step, p.body);
      return;
    }
    if (dir === 'up') {
      r(13, 23, 6, 3, p.out);
      r(14, 22, 4, 3, p.body);
      r(9, 15, 14, 10, p.out);
      r(10, 16, 12, 8, p.body);
      r(10, 10, 12, 9, p.out);
      r(11, 11, 10, 7, p.body);
      r(7, 10, 4, 6, p.out);
      r(21, 10, 4, 6, p.out);
      r(8, 11, 3, 4, p.shade);
      r(21, 11, 3, 4, p.shade);
      r(10, 23, 4, 3 + step, p.out);
      r(19, 23, 4, 4 - step, p.out);
      return;
    }
    r(9, 15, 14, 10, p.out);
    r(10, 16, 12, 8, p.body);
    r(8, 8, 16, 11, p.out);
    r(10, 10, 12, 8, p.body);
    r(7, 9, 4, 7, p.out);
    r(21, 9, 4, 7, p.out);
    r(8, 10, 3, 5, p.shade);
    r(21, 10, 3, 5, p.shade);
    r(12, 15, 8, 4, p.out);
    r(13, 15, 6, 3, p.hi);
    r(12, 13, 1, 1, p.out);
    r(19, 13, 1, 1, p.out);
    r(10, 18, 12, 2, p.collar);
    r(10, 23, 4, 4 + step, p.out);
    r(18, 23, 4, 5 - step, p.out);
    r(11, 23, 2, 3 + step, p.body);
    r(19, 23, 2, 4 - step, p.body);
  }

  window.PR_CHARS = { drawPlayer, drawNpc, drawDog, drawDuck, drawSwan };
})();
