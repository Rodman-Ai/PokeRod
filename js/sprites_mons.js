// Creature sprite renderer. Delegates to the prerendered atlas
// (assets/atlas.png). Each species has a 64x64 entry keyed
// 'creature_<species>'. Callers ask for any size; we scale via drawImage.
'use strict';

(function () {
  function drawCreature(ctx, species, sx, sy, sizePx /*, isBack */) {
    if (!window.PR_ATLAS || !window.PR_ATLAS.isReady()) return;
    const key = 'creature_' + species;
    window.PR_ATLAS.drawKeyScaled(ctx, key, sx, sy, sizePx, sizePx);
  }

  window.PR_MONS = { drawCreature };
})();
