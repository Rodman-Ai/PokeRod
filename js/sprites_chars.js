// Player and NPC overworld sprites. Delegates to the prerendered atlas
// (assets/atlas.png). Frames are 32x32; 4 directions × 2 walk frames per
// character kind. Mapping of NPC kind to atlas key prefix matches the
// keys registered in tools/atlas-art.js.
'use strict';

(function () {
  const TS = 32;

  function spriteKey(kindPrefix, dir, frame) {
    const f = (frame | 0) & 1;
    const d = (dir === 'right') ? 'right'
            : (dir === 'left')  ? 'left'
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

  window.PR_CHARS = { drawPlayer, drawNpc };
})();
