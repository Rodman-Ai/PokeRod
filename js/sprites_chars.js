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

  function drawPlayer(ctx, sx, sy, dir, frame) {
    if (!window.PR_ATLAS || !window.PR_ATLAS.isReady()) return;
    window.PR_ATLAS.drawKey(ctx, spriteKey('player', dir, frame), sx, sy);
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
    if (preset === 'ds_diamond') {
      return { out:'#181018', body:'#c8783f', shade:'#704018', hi:'#ffd0a0', collar:'#4068d8' };
    }
    return { out:'#2a1810', body:'#b86a38', shade:'#704020', hi:'#f0c090', collar:'#d83020' };
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

  window.PR_CHARS = { drawPlayer, drawNpc, drawDog };
})();
