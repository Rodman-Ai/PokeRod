// PokeRod atlas loader: fetches assets/atlas.png + assets/atlas.json,
// exposes window.PR_ATLAS for drawing tile/character/creature sprites by
// key. Loads asynchronously; renderers should check PR_ATLAS.ready before
// calling drawKey().
'use strict';

(function () {
  const DEFAULT_PRESET = 'gba_firered';
  const PRESETS = {
    gb_red: { label:'GB RED', json:'assets/atlas-gb-red.json', image:'assets/atlas-gb-red.png' },
    gbc_yellow: { label:'GBC YELLOW', json:'assets/atlas-gbc-yellow.json', image:'assets/atlas-gbc-yellow.png' },
    gba_firered: { label:'GBA FIRERED', json:'assets/atlas.json', image:'assets/atlas.png' },
    ds_diamond: { label:'DS DIAMOND', json:'assets/atlas-ds-diamond.json', image:'assets/atlas-ds-diamond.png' }
  };

  const state = {
    image: null,        // HTMLImageElement once loaded
    frames: null,       // {key: {x, y, w, h}}
    tileCodeToKey: null,// {char: key}
    tileVariants: null, // {char: {random:[], context:{}}}
    tileSize: 32,
    creatureSize: 64,
    activePreset: null,
    loadingPreset: null,
    ready: false,
    error: null
  };
  let loadToken = 0;

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
      img.onerror = () => reject(new Error(url + ' load failed'));
      img.src = url;
    });
  }

  function init() {
    return setPreset(DEFAULT_PRESET, true);
  }

  function setPreset(presetId, initial) {
    const id = PRESETS[presetId] ? presetId : DEFAULT_PRESET;
    if (!initial && state.ready && state.activePreset === id) return Promise.resolve(true);
    const preset = PRESETS[id];
    const token = ++loadToken;
    state.loadingPreset = id;
    state.error = null;
    return Promise.all([
      fetchJson(preset.json),
      loadImage(preset.image)
    ]).then(([json, img]) => {
      if (token !== loadToken) return false;
      state.image = img;
      state.frames = json.frames;
      state.tileCodeToKey = json.tile_code_to_key || {};
      state.tileVariants = json.tile_variants || {};
      state.tileSize = json.tile_size || 32;
      state.creatureSize = json.creature_size || 64;
      state.activePreset = id;
      state.loadingPreset = null;
      state.ready = true;
      return true;
    }).catch((e) => {
      if (token !== loadToken) return false;
      state.error = e;
      state.loadingPreset = null;
      if (initial || !state.image) state.ready = false;
      console.error('PR_ATLAS init failed:', e);
      return false;
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
  function contextKey(code, context) {
    if (!context || !context.map) return null;
    const m = context.map;
    const x = context.tx, y = context.ty;
    if (code === 'S' && m.signKinds) {
      const kind = m.signKinds[x + ',' + y];
      if (kind) return 'sign_' + kind;
    }
    const row = (yy) => (yy >= 0 && yy < m.tiles.length) ? m.tiles[yy] : '';
    const at = (xx, yy) => {
      const r = row(yy);
      return xx >= 0 && xx < r.length ? r[xx] : null;
    };
    const same = (xx, yy) => at(xx, yy) === code;
    const up = same(x, y - 1), down = same(x, y + 1);
    const left = same(x - 1, y), right = same(x + 1, y);
    if (!up && !left) return 'top_left';
    if (!up && !right) return 'top_right';
    if (!down && !left) return 'bottom_left';
    if (!down && !right) return 'bottom_right';
    if (!up) return 'top';
    if (!down) return 'bottom';
    if (!left) return 'left';
    if (!right) return 'right';
    return 'center';
  }

  function hashTile(code, context, dx, dy) {
    const tx = context && context.tx !== undefined ? context.tx : ((dx / state.tileSize) | 0);
    const ty = context && context.ty !== undefined ? context.ty : ((dy / state.tileSize) | 0);
    let h = (code ? code.charCodeAt(0) : 17) * 73856093;
    h ^= tx * 19349663;
    h ^= ty * 83492791;
    return (h >>> 0);
  }

  function variantKey(code, base, dx, dy, context) {
    const v = state.tileVariants && state.tileVariants[code];
    if (!v) return base;
    const cKey = contextKey(code, context);
    if (cKey && v.context && v.context[cKey]) return v.context[cKey];
    if (v.random && v.random.length) {
      return v.random[hashTile(code, context, dx, dy) % v.random.length];
    }
    return base;
  }

  function drawTileCode(ctx, code, dx, dy, context) {
    if (!state.ready) return false;
    const key = state.tileCodeToKey[code] || 'tile_grass';
    return drawKey(ctx, variantKey(code, key, dx, dy, context), dx, dy);
  }

  // Read-only state accessor (so renderers can ask if ready).
  function isReady() { return state.ready; }
  function getError() { return state.error; }
  function getPreset() { return state.activePreset || DEFAULT_PRESET; }
  function getPresets() { return Object.keys(PRESETS).map((id) => ({ id, label:PRESETS[id].label })); }

  // Kick off loading immediately (idempotent if called again).
  const readyPromise = init();

  window.PR_ATLAS = {
    ready: readyPromise,    // Promise<void>; resolves when image+json are loaded
    isReady,
    getError,
    getPreset,
    getPresets,
    setPreset,
    drawKey,
    drawKeyScaled,
    drawTileCode,
    state
  };
})();
