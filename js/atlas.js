// PokeRod atlas loader: fetches assets/atlas.png + assets/atlas.json,
// exposes window.PR_ATLAS for drawing tile/character/creature sprites by
// key. Loads asynchronously; renderers should check PR_ATLAS.ready before
// calling drawKey().
'use strict';

(function () {
  const state = {
    image: null,        // HTMLImageElement once loaded
    frames: null,       // {key: {x, y, w, h}}
    tileCodeToKey: null,// {char: key}
    tileSize: 32,
    creatureSize: 64,
    ready: false,
    error: null
  };

  // Resolve path relative to the page so it works under any host path.
  function fetchJson(url) {
    return fetch(url, { cache: 'no-cache' }).then((r) => {
      if (!r.ok) throw new Error('atlas.json fetch ' + r.status);
      return r.json();
    });
  }
  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(new Error('atlas.png load failed'));
      img.src = url;
    });
  }

  function init() {
    return Promise.all([
      fetchJson('assets/atlas.json'),
      loadImage('assets/atlas.png')
    ]).then(([json, img]) => {
      state.image = img;
      state.frames = json.frames;
      state.tileCodeToKey = json.tile_code_to_key || {};
      state.tileSize = json.tile_size || 32;
      state.creatureSize = json.creature_size || 64;
      state.ready = true;
    }).catch((e) => {
      state.error = e;
      state.ready = false;
      console.error('PR_ATLAS init failed:', e);
    });
  }

  // Draw a sprite by key at native size to (dx, dy).
  function drawKey(ctx, key, dx, dy) {
    if (!state.ready) return false;
    const f = state.frames[key];
    if (!f) return false;
    ctx.drawImage(state.image, f.x, f.y, f.w, f.h, dx | 0, dy | 0, f.w, f.h);
    return true;
  }

  // Draw a sprite by key, scaled to (dw, dh).
  function drawKeyScaled(ctx, key, dx, dy, dw, dh) {
    if (!state.ready) return false;
    const f = state.frames[key];
    if (!f) return false;
    ctx.drawImage(state.image, f.x, f.y, f.w, f.h, dx | 0, dy | 0, dw | 0, dh | 0);
    return true;
  }

  // Convenience: tile-code dispatch. If the code isn't mapped, falls back
  // to grass.
  function drawTileCode(ctx, code, dx, dy) {
    if (!state.ready) return false;
    const key = state.tileCodeToKey[code] || 'tile_grass';
    return drawKey(ctx, key, dx, dy);
  }

  // Read-only state accessor (so renderers can ask if ready).
  function isReady() { return state.ready; }
  function getError() { return state.error; }

  // Kick off loading immediately (idempotent if called again).
  const readyPromise = init();

  window.PR_ATLAS = {
    ready: readyPromise,    // Promise<void>; resolves when image+json are loaded
    isReady,
    getError,
    drawKey,
    drawKeyScaled,
    drawTileCode,
    state
  };
})();
