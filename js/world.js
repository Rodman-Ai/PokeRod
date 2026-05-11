// Overworld: tile-by-tile movement, NPCs, encounters, transitions.
'use strict';

(function(){
  const TS = 32;
  const VIEW_W = 480, VIEW_H = 320;
  const VIEW_TX = VIEW_W / TS; // 15
  const VIEW_TY = VIEW_H / TS; // 10

  // Day -> Dusk -> Night -> Dawn -> Day. 80 steps per phase, 320 per
  // full cycle. The anchor colours below are blended continuously
  // every frame (see currentTint) so transitions are gradual rather
  // than four hard cuts.
  const PHASES = [
    { name:'day',   tint:null },
    { name:'dusk',  tint:'rgba(240,140,40,0.20)' },
    { name:'night', tint:'rgba(20,30,80,0.40)' },
    { name:'dawn',  tint:'rgba(255,180,140,0.18)' }
  ];
  const CYCLE_STEPS = 320;
  const ANCHOR_TINTS = [
    { at:0,   name:'day',   r:0,   g:0,   b:0,   a:0    },
    { at:80,  name:'dusk',  r:240, g:120, b:50,  a:0.30 },
    { at:160, name:'night', r:14,  g:22,  b:62,  a:0.62 },
    { at:240, name:'dawn',  r:255, g:170, b:130, a:0.26 }
  ];
  function phaseForSteps(s) {
    // Snap to the nearest anchor for callers that branch on phase
    // name (chatter, shop greetings). Smooth visual blending is done
    // separately in currentTint.
    const t = (((s % CYCLE_STEPS) + CYCLE_STEPS) % CYCLE_STEPS);
    let best = ANCHOR_TINTS[0];
    let bestDist = CYCLE_STEPS;
    for (const a of ANCHOR_TINTS) {
      const d = Math.min(Math.abs(t - a.at), CYCLE_STEPS - Math.abs(t - a.at));
      if (d < bestDist) { bestDist = d; best = a; }
    }
    return PHASES.find(p => p.name === best.name) || PHASES[0];
  }
  function currentTint(steps) {
    const t = (((steps % CYCLE_STEPS) + CYCLE_STEPS) % CYCLE_STEPS);
    // Find segment [a, b] whose at-range contains t.
    let i = 0;
    for (let j = 0; j < ANCHOR_TINTS.length; j++) {
      if (ANCHOR_TINTS[j].at <= t) i = j;
    }
    const a = ANCHOR_TINTS[i];
    const b = ANCHOR_TINTS[(i + 1) % ANCHOR_TINTS.length];
    const span = b.at > a.at ? b.at - a.at : (CYCLE_STEPS - a.at) + b.at;
    const k = span > 0 ? (t - a.at) / span : 0;
    const r  = Math.round(a.r + (b.r - a.r) * k);
    const g  = Math.round(a.g + (b.g - a.g) * k);
    const bl = Math.round(a.b + (b.b - a.b) * k);
    const al = a.a + (b.a - a.a) * k;
    if (al < 0.005) return null;
    return 'rgba(' + r + ',' + g + ',' + bl + ',' + al.toFixed(3) + ')';
  }
  // 320 steps = 24 in-game hours. Step 0 starts at noon so the cycle
  // anchors line up with intuitive times: day=12:00, dusk=18:00,
  // night=00:00, dawn=06:00.
  function clockHM(steps) {
    const t = (((steps % CYCLE_STEPS) + CYCLE_STEPS) % CYCLE_STEPS);
    const hours24 = (t / CYCLE_STEPS) * 24 + 12;
    const total = hours24 % 24;
    const h = Math.floor(total);
    const m = Math.floor((total - h) * 60);
    return { h, m };
  }
  const PHASE_LABEL = { day:'DAY', dusk:'DSK', night:'NIT', dawn:'DWN' };
  function drawWorldClock(ctx, viewW, steps) {
    const hm = clockHM(steps);
    const phase = phaseForSteps(steps);
    const pad = (n) => (n < 10 ? '0' : '') + n;
    const text = pad(hm.h) + ':' + pad(hm.m) + ' ' + (PHASE_LABEL[phase.name] || phase.name.toUpperCase());
    const textW = window.PR_UI.textWidth(text);
    const w = Math.max(18, textW + 8);
    // Phase icon + clock chip share the top-right corner. Icon hugs
    // the chip on its left so the player reads them as a single
    // 'time of day' indicator instead of two separate badges.
    const iconW = 18, gap = 2, margin = 4;
    const iconX = viewW - margin - w - gap - iconW;
    drawPhaseIcon(ctx, iconX, 3, phase.name);
    window.PR_UI.chip(ctx, iconX + iconW + gap, 4, text, {
      fill:'#1a0204', border:'#f0c020', text:'#f0c020'
    });
  }
  // Phase icon, drawn top-left below the minimap (or at 4,4 on
  // interior maps). Pure pixel-art via fillRect so it matches the
  // rest of the HUD and doesn't require atlas regen.
  function fillCirclePixel(ctx, cx, cy, r, color) {
    ctx.fillStyle = window.PR_UI.pf(color);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  function drawPhaseIcon(ctx, x, y, phaseName) {
    const W = 18, H = 16;
    // Backdrop + gold border, matching the clock chip.
    ctx.fillStyle = window.PR_UI.pf('rgba(20,16,12,0.7)');
    ctx.fillRect(x, y, W, H);
    ctx.fillStyle = window.PR_UI.pf('#f0c020');
    ctx.fillRect(x, y, W, 1);
    ctx.fillRect(x, y + H - 1, W, 1);
    ctx.fillRect(x, y, 1, H);
    ctx.fillRect(x + W - 1, y, 1, H);
    const cx = x + 9, cy = y + 8;
    if (phaseName === 'day') {
      fillCirclePixel(ctx, cx, cy, 3, '#f8d030');
      ctx.fillStyle = window.PR_UI.pf('#f8d030');
      ctx.fillRect(cx - 1, y + 2, 2, 1);     // top ray
      ctx.fillRect(cx - 1, y + H - 3, 2, 1); // bottom ray
      ctx.fillRect(x + 2, cy - 1, 1, 2);     // left ray
      ctx.fillRect(x + W - 3, cy - 1, 1, 2); // right ray
    } else if (phaseName === 'night') {
      fillCirclePixel(ctx, cx, cy, 4, '#e0e0f0');
      // bite the moon to make a crescent
      ctx.fillStyle = window.PR_UI.pf('rgba(20,16,12,0.95)');
      ctx.beginPath();
      ctx.arc(cx + 2, cy - 1, 3, 0, Math.PI * 2);
      ctx.fill();
      // a couple of stars
      ctx.fillStyle = window.PR_UI.pf('#fff');
      ctx.fillRect(x + 3, y + 4, 1, 1);
      ctx.fillRect(x + W - 4, y + H - 5, 1, 1);
    } else if (phaseName === 'dusk' || phaseName === 'dawn') {
      // Half-disc rising/setting over a dark horizon line.
      const sun = phaseName === 'dusk' ? '#f08030' : '#f8a8a8';
      ctx.fillStyle = window.PR_UI.pf(sun);
      ctx.fillRect(cx - 3, cy - 1, 7, 4);
      ctx.fillStyle = window.PR_UI.pf('#a04030');
      ctx.fillRect(x + 2, cy + 3, W - 4, 1);
    }
  }

  // Minimap colors by tile category, derived from TILE_PROPS so every
  // tile code resolves to a sensible color (the previous lookup table
  // covered ~17 of 80+ tile codes; everything else fell through to
  // dark gray, which made most maps look like noise).
  const MINI_FALLBACK_WALK = '#9cd078';
  const MINI_FALLBACK_BLOCK = '#605040';
  function miniColorFor(code) {
    const props = window.PR_MAPS && window.PR_MAPS.TILE_PROPS && window.PR_MAPS.TILE_PROPS[code];
    if (!props) return code === 'X' ? '#000000' : MINI_FALLBACK_BLOCK;
    const n = props.name || '';
    if (n === 'water')              return '#4878d8';
    if (n === 'tallgrass')          return '#388830';
    if (n === 'sand' || n.indexOf('sand') >= 0) return '#e8d090';
    if (n === 'ledge')              return '#8a6a40';
    if (n.indexOf('path') >= 0)     return '#d8b878';
    if (props.door)                 return '#a86038';
    if (n.indexOf('rock') >= 0)     return '#888070';
    if (n.indexOf('fence') >= 0)    return '#806848';
    if (n.indexOf('roof') >= 0 || n === 'roof')   return '#a04848';
    if (n.indexOf('wall') >= 0 || n === 'mart' || n === 'center' || n === 'healer' || n === 'counter')
                                    return '#806848';
    if (n.indexOf('window') >= 0)   return '#a8c8e8';
    if (n.indexOf('tree') >= 0 || n === 'oak' || n === 'palm' || n === 'cherry' ||
        n === 'birch' || n === 'willow' || n === 'mushroomtree')
                                    return '#1c4818';
    if (n.indexOf('bush') >= 0 || n === 'hedge' || n === 'thorncluster')
                                    return '#3a703a';
    if (n.indexOf('grass') >= 0)    return '#5cae4c';
    if (n === 'floor' || n === 'rug') return '#e8d8b8';
    return props.walk ? MINI_FALLBACK_WALK : MINI_FALLBACK_BLOCK;
  }
  function drawMinimap(ctx, m, px, py) {
    if (!m.tiles || !m.tiles.length) return;
    const cols = m.tiles[0].length, rows = m.tiles.length;
    // 2px cells per tile keep the minimap legible. Earlier we tried 1px
    // for compactness, but that made small interior maps unreadably
    // tiny. The category-based palette below means even at 2px the
    // minimap is no longer the noise-blob it used to be.
    const cell = 2;
    const w = cols * cell, h = rows * cell;
    const x = 4, y = 4;
    // Translucent backdrop + 1px border for legibility against the
    // world below.
    ctx.fillStyle = window.PR_UI.pf('rgba(20,16,12,0.55)');
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = window.PR_UI.pf('#f0c020');
    ctx.fillRect(x - 1, y - 1, w + 2, 1);
    ctx.fillRect(x - 1, y + h, w + 2, 1);
    ctx.fillRect(x - 1, y - 1, 1, h + 2);
    ctx.fillRect(x + w, y - 1, 1, h + 2);
    for (let ry = 0; ry < rows; ry++) {
      const row = m.tiles[ry];
      for (let rx = 0; rx < cols; rx++) {
        ctx.fillStyle = window.PR_UI.pf(miniColorFor(row[rx]));
        ctx.fillRect(x + rx * cell, y + ry * cell, cell, cell);
      }
    }
    // Player pip blink. 2x2 square with a 1px highlight to stay visible
    // against any background tile.
    const blink = (Math.floor(performance.now() / 250) & 1);
    if (blink) {
      ctx.fillStyle = window.PR_UI.pf('#ffd060');
      ctx.fillRect(x + px * cell - 1, y + py * cell - 1, cell + 2, cell + 2);
    }
  }
  window.PR_TIME = { phaseForSteps, current: () => {
    const s = window.PR_GAME && window.PR_GAME.state && window.PR_GAME.state.player.steps || 0;
    return phaseForSteps(s).name;
  }};

  // Billboard-tilt + drop-shadow effect for the DS Diamond style.
  // Active only when the user has selected that graphics preset, and
  // only on movable sprites (player, NPCs, follower, ambient
  // creatures) where the sprite background is transparent so the
  // vertical squash doesn't reveal grass underneath. Tile sprites
  // (trees, buildings, etc.) stay flat because their cells are fully
  // painted and any squash would show the ground-clear color through
  // the gap at the top of the cell.
  function tiltActive() {
    return window.PR_SETTINGS && window.PR_SETTINGS.graphics === 'ds_diamond';
  }
  // Resolves the active graphics preset to one of the four tier ids:
  //   'gb_red' | 'gbc_yellow' | 'gba_firered' | 'ds_diamond'
  // Default: ds_diamond.
  function graphicsTier() {
    return (window.PR_SETTINGS && window.PR_SETTINGS.graphics) || 'ds_diamond';
  }

  // ---- Weather schema ---------------------------------------------------
  // Maps opt into weather via map.weather. Accepted forms:
  //   weather: 'rain'              alias for 'medium-rain'
  //   weather: 'light-rain' | 'medium-rain' | 'heavy-rain' (+ 10 variants)
  //   weather: 'sleet'
  //   weather: 'light-snow' | 'medium-snow' | 'blizzard' (+ 10 variants)
  //   weather: 'hail' | 'thunder' | 'hurricane' | 'overcast'
  //   weather: 'light-fog' | 'heavy-fog' | 'sea-fog' | 'morning-haze' | 'smog'
  //   weather: { kind:'rain', intensity:0.7, wind:0.3 }
  // parseWeather() always returns { kind, intensity, wind } or null when
  // the value is unset / unknown.
  //
  // Rain / snow variants all share the same render path but differ in
  // intensity + wind so map authors can pick a mood without coding new
  // particle behaviour. Fog is its own kind with horizontal-band
  // rendering (see drawWeatherOverlay).
  //
  // Tornado was retired as a weather kind in v0.49.0 — its funnel render
  // is now a reusable battle-move effect (see js/move_effects.js
  // drawTornadoFunnel, wired to FLYING moves gust / airslash).
  const WEATHER_PRESETS = {
    // --- core rain (kept for backwards compat) ---
    'rain':           { kind:'rain',     intensity:0.55, wind:0.30 },
    'light-rain':     { kind:'rain',     intensity:0.30, wind:0.20 },
    'medium-rain':    { kind:'rain',     intensity:0.55, wind:0.30 },
    'heavy-rain':     { kind:'rain',     intensity:0.95, wind:0.50 },
    // --- 10 new rain variants ---
    'drizzle':        { kind:'rain',     intensity:0.18, wind:0.10 },
    'shower':         { kind:'rain',     intensity:0.45, wind:0.25 },
    'monsoon':        { kind:'rain',     intensity:1.00, wind:0.60 },
    'downpour':       { kind:'rain',     intensity:0.90, wind:0.25 },
    'sprinkles':      { kind:'rain',     intensity:0.22, wind:0.05 },
    'sun-shower':     { kind:'rain',     intensity:0.35, wind:0.15 },
    'evening-rain':   { kind:'rain',     intensity:0.40, wind:0.30 },
    'cold-rain':      { kind:'rain',     intensity:0.55, wind:0.20 },
    'wind-rain':      { kind:'rain',     intensity:0.65, wind:0.85 },
    'driving-rain':   { kind:'rain',     intensity:0.85, wind:0.90 },
    // --- sleet ---
    'sleet':          { kind:'sleet',    intensity:0.65, wind:0.40 },
    // --- core snow (kept for backwards compat) ---
    'light-snow':     { kind:'snow',     intensity:0.30, wind:0.15 },
    'medium-snow':    { kind:'snow',     intensity:0.55, wind:0.25 },
    'blizzard':       { kind:'snow',     intensity:1.00, wind:0.95 },
    // --- 10 new snow variants ---
    'flurries':       { kind:'snow',     intensity:0.22, wind:0.10 },
    'snowfall':       { kind:'snow',     intensity:0.45, wind:0.15 },
    'lake-effect':    { kind:'snow',     intensity:0.85, wind:0.40 },
    'powdery-snow':   { kind:'snow',     intensity:0.40, wind:0.05 },
    'wet-snow':       { kind:'snow',     intensity:0.65, wind:0.20 },
    'snow-shower':    { kind:'snow',     intensity:0.35, wind:0.30 },
    'whiteout':       { kind:'snow',     intensity:1.00, wind:1.00 },
    'graupel':        { kind:'snow',     intensity:0.70, wind:0.10 },
    'sideways-snow':  { kind:'snow',     intensity:0.60, wind:0.90 },
    'snow-squall':    { kind:'snow',     intensity:0.95, wind:0.75 },
    // --- atmospheric ---
    'hail':           { kind:'hail',     intensity:0.80, wind:0.10 },
    'thunder':        { kind:'thunder',  intensity:0.95, wind:0.55 },
    'hurricane':      { kind:'hurricane',intensity:1.00, wind:1.00 },
    'overcast':       { kind:'overcast', intensity:0.45, wind:0.20 },
    // --- 5 fog / haze variants (new 'fog' kind) ---
    'light-fog':      { kind:'fog',      intensity:0.30, wind:0.10 },
    'heavy-fog':      { kind:'fog',      intensity:0.85, wind:0.05 },
    'sea-fog':        { kind:'fog',      intensity:0.55, wind:0.25 },
    'morning-haze':   { kind:'fog',      intensity:0.25, wind:0.05 },
    'smog':           { kind:'fog',      intensity:0.65, wind:0.02 }
  };
  const WEATHER_KINDS = new Set([
    'rain','sleet','snow','hail','thunder','hurricane','overcast','fog'
  ]);
  function parseWeather(value) {
    if (!value) return null;
    if (typeof value === 'string') {
      const p = WEATHER_PRESETS[value];
      return p ? { kind:p.kind, intensity:p.intensity, wind:p.wind } : null;
    }
    if (typeof value === 'object' && value.kind && WEATHER_KINDS.has(value.kind)) {
      const i = Math.max(0, Math.min(1, +value.intensity || 0.5));
      const w = Math.max(0, Math.min(1, +value.wind || 0));
      return { kind: value.kind, intensity: i, wind: w };
    }
    return null;
  }
  // Per-tier maximum particle budget. The basic tiers cap aggressively so
  // the look stays consistent with the hardware they emulate. DS Diamond
  // gets the full count.
  function tierParticleCap(tier) {
    if (tier === 'gb_red') return 16;
    if (tier === 'gbc_yellow') return 24;
    if (tier === 'gba_firered') return 56;
    return 140; // ds_diamond
  }
  // Spawn-rate multiplier (lower = slower spawn). Basic tiers rain less.
  function tierSpawnMul(tier) {
    if (tier === 'gb_red') return 0.30;
    if (tier === 'gbc_yellow') return 0.42;
    if (tier === 'gba_firered') return 0.70;
    return 1.0;
  }
  window.PR_WEATHER = { parseWeather, WEATHER_PRESETS };
  // Soft elliptical drop shadow with a radial-gradient falloff. Two
  // layers (tight inner core + softer outer halo) give an
  // atmospheric-looking shadow without doubling cost. opts.offsetX /
  // offsetY shift the shadow center in the sun-projection direction;
  // opts.lengthScale stretches the major axis so shadows elongate at
  // low sun; opts.alphaScale fades them out at deep night.
  function drawShadow(ctx, cx, by, w, opts) {
    opts = opts || {};
    const ox = opts.offsetX || 0;
    const oy = opts.offsetY || 0;
    const len = opts.lengthScale != null ? opts.lengthScale : 1;
    const aMul = opts.alphaScale != null ? opts.alphaScale : 1;
    const r = Math.max(2, w * (opts.rxScale || 0.42) * len);
    const ry = Math.max(2, w * (opts.ryScale || 0.14));
    const cAlpha = (opts.centerAlpha != null ? opts.centerAlpha : 0.45) * aMul;
    if (cAlpha <= 0.01) return;
    const colorBase = opts.color || '0,0,0';
    const sx = cx + ox, sy = by + oy;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(1, ry / r);
    ctx.translate(-sx, -sy);
    // Outer halo — wider, very soft. Goes first so the inner core
    // paints over it without lightening from the gradient overlap.
    const haloR = r * 1.32;
    const haloGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, haloR);
    haloGrad.addColorStop(0,   'rgba(' + colorBase + ',' + (cAlpha * 0.30) + ')');
    haloGrad.addColorStop(0.6, 'rgba(' + colorBase + ',' + (cAlpha * 0.12) + ')');
    haloGrad.addColorStop(1,   'rgba(' + colorBase + ',0)');
    ctx.fillStyle = window.PR_UI.pf(haloGrad);
    ctx.beginPath();
    ctx.arc(sx, sy, haloR, 0, Math.PI * 2);
    ctx.fill();
    // Inner core — tighter, darker.
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
    grad.addColorStop(0,    'rgba(' + colorBase + ',' + cAlpha + ')');
    grad.addColorStop(0.55, 'rgba(' + colorBase + ',' + (cAlpha * 0.55) + ')');
    grad.addColorStop(1,    'rgba(' + colorBase + ',0)');
    ctx.fillStyle = window.PR_UI.pf(grad);
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Shadow-only billboard tilt: PR #8 dropped the vertical squash
  // because the canvas Y scale interpolated against the red level-tuft
  // pixels baked into atlas frames and produced pink artifacts at the
  // sprite base. The drop shadow alone keeps the 2.5D 'grounded' feel.
  //
  // Character sprites are 32x32 frames but the art only fills the
  // upper ~26 px (head + body + feet at y≈22-26, transparent below).
  // Smaller sprites (followers / creatures at 20x20) similarly have
  // their feet around y≈14-15 of their frame. Without compensation
  // the shadow drops at the FRAME edge — visibly far below the feet.
  // The feet-up offset scales with sprite height (~22% of sh) so it
  // lands roughly where the character is standing.
  function withTilt(ctx, sx, sy, sw, sh, draw) {
    if (!tiltActive()) { draw(); return; }
    const feetUp = Math.max(3, Math.round(sh * 0.22));
    drawShadow(ctx, sx + sw / 2, sy + sh - feetUp, sw, spriteShadowOpts());
    draw();
  }
  // Tall-tile shadow: drops a soft elliptical shadow at the base of
  // every tile that's a vertical structure (tree, building, fence,
  // rock). Skips ground tiles (W water, L ledge, X edge) so we don't
  // shadow the open ground.
  function isTallTile(code) {
    const props = window.PR_MAPS && window.PR_MAPS.TILE_PROPS && window.PR_MAPS.TILE_PROPS[code];
    if (!props || props.walk) return false;
    if (code === 'W' || code === 'L' || code === 'X') return false;
    return true;
  }
  // Explicit shadow-caster set, replacing the earlier 'tile-below-is-
  // walkable' heuristic. That heuristic was too clever in practice:
  //  - It hid shadows for stacked trees in dense forests (only the
  //    bottom row of a vertical cluster cast, the rest looked
  //    floating).
  //  - It still allowed a wall sitting on top of a door to cast a
  //    soft round 'puddle' shadow that bled onto the door tile.
  // Walls, roofs, windows, doors, fences and fixtures are flat
  // structural surfaces - they shouldn't drop a round elliptical
  // shadow on the ground. Trees, hostile foliage and large rocks
  // are organic / round shapes whose silhouette reads as a circular
  // ground footprint. Limit casting to that explicit set.
  const SHADOW_CASTER_TREES = 'TYOKJQNUVEG';
  const SHADOW_CASTER_HOSTILE = 'gh';   // thornbush, hedge
  const SHADOW_CASTER_ROCKS = ')';      // large_rock
  function tileShouldCastShadow(map, x, y) {
    const code = map.tiles[y][x];
    if (SHADOW_CASTER_TREES.indexOf(code) !== -1) return true;
    if (SHADOW_CASTER_HOSTILE.indexOf(code) !== -1) return true;
    if (SHADOW_CASTER_ROCKS.indexOf(code) !== -1) return true;
    return false;
  }
  // Per-phase shadow tint AND sun vector. The cycle starts at noon
  // (step 0) so:
  //   t=0   noon       — sun overhead, short shadow, no x-offset
  //   t=80  sunset     — sun west, long shadow, +x offset (eastward)
  //   t=160 midnight   — no sun, alphaScale -> 0
  //   t=240 sunrise    — sun east, long shadow, -x offset (westward)
  // offsetY is always positive (shadow projects toward bottom of
  // screen, matching the 2.5D top-down camera convention). lengthScale
  // is the rx multiplier — short at noon, long at low sun.
  function phaseShadowOpts(steps) {
    const t = (((steps % CYCLE_STEPS) + CYCLE_STEPS) % CYCLE_STEPS);
    // sunHeight: 1 at noon, 0 at midnight, ~0.4 at dusk/dawn.
    // Use cosine over the full cycle so the curve is smooth.
    const phase = (t / CYCLE_STEPS) * Math.PI * 2; // 0 at noon, PI at midnight
    const sunHeight = Math.max(0, Math.cos(phase));   // 1 noon -> 0 night
    // sunAzimuth: sin(phase). Negative in morning (sun east), positive
    // in afternoon (sun west). Multiply by 2.4 px to bias the shadow
    // east (-) or west (+) accordingly. Capped to small values so
    // sprites don't drift too far from their feet.
    const azim = Math.sin(phase);
    const opts = {
      rxScale: 0.42,
      ryScale: 0.13,
      centerAlpha: 0.36,
      color: '0,0,0',
      offsetX: -azim * 2.4,                 // -ve early, +ve late
      offsetY: 0.5 + (1 - sunHeight) * 1.5,  // 0.5 at noon, 2.0 at low sun
      lengthScale: 0.85 + (1 - sunHeight) * 0.95,  // 0.85 noon, 1.8 dusk
      alphaScale: 0.25 + sunHeight * 0.85   // 0.25 night, 1.10 noon
    };
    // dusk band (60..100): warm
    if (t > 60 && t < 100) opts.color = '40,10,30';
    // night (140..180): cool
    else if (t > 140 && t < 180) opts.color = '10,16,40';
    // dawn (220..260): warm-ish
    else if (t > 220 && t < 260) opts.color = '40,16,30';
    return opts;
  }
  // Sprite-style shadow under a billboard tile: pulls the latest sun
  // vector so player / NPC / ambient / follower shadows all follow the
  // same direction as tall-tile and decoration shadows. Stored on the
  // World instance so we recompute once per frame, not per sprite.
  function spriteShadowOpts() {
    const game = window.PR_GAME && window.PR_GAME.state;
    const steps = (game && game.player && game.player.steps) || 0;
    return phaseShadowOpts(steps);
  }
  function drawTallTileShadows(ctx, m, startTx, startTy, offX, offY, viewTx, viewTy, TS, steps) {
    if (!tiltActive()) return;
    const opts = phaseShadowOpts(steps);
    for (let ty = 0; ty <= viewTy; ty++) {
      for (let tx = 0; tx <= viewTx; tx++) {
        const wx = startTx + tx, wy = startTy + ty;
        if (wy < 0 || wy >= m.tiles.length) continue;
        const row = m.tiles[wy];
        if (wx < 0 || wx >= row.length) continue;
        if (!tileShouldCastShadow(m, wx, wy)) continue;
        const cx = offX + tx * TS + TS / 2;
        // Anchor the cast shadow at the bottom of the cell, slightly
        // inside so it doesn't drift onto the next row's painted
        // ground.
        const by = offY + ty * TS + TS - 3;
        drawShadow(ctx, cx, by, TS, opts);
      }
    }
  }

  // Per-decoration-key shadow shape. Returns null for items that
  // shouldn't cast a shadow (rugs, wall mounts, hanging items).
  function decorShadowSpec(key) {
    if (!key) return null;
    if (key.indexOf('rug_') === 0) return null;
    if (key.indexOf('wall_') === 0) return null;
    if (key.indexOf('picture_frame') === 0) return null;
    if (key.indexOf('lamp_') === 0 || key.indexOf('streetlamp_') === 0 || key.indexOf('paper_lantern') >= 0 || key.indexOf('lantern') >= 0) {
      return { rxScale: 0.30, ryScale: 0.10, alphaBoost: 1.10 };
    }
    if (key === 'pedestal_statue' || key === 'water_fountain_round' || key === 'wishing_well' || key.indexOf('pod_') === 0) {
      return { rxScale: 0.46, ryScale: 0.16, alphaBoost: 1.0 };
    }
    if (key.indexOf('bench_') === 0 || key.indexOf('bed_') === 0 || key.indexOf('table_') === 0 || key.indexOf('display_') === 0 || key.indexOf('shelf_') === 0) {
      return { rxScale: 0.50, ryScale: 0.13, alphaBoost: 0.9 };
    }
    if (key.indexOf('pot_') === 0 || key.indexOf('planter_') === 0 || key.indexOf('trash_') === 0) {
      return { rxScale: 0.32, ryScale: 0.13, alphaBoost: 0.95 };
    }
    if (key.indexOf('vending_') === 0 || key.indexOf('bus_stop') === 0 || key.indexOf('sign_') === 0 || key === 'parking_meter' || key === 'bollard' || key === 'bike_rack' || key === 'street_clock') {
      return { rxScale: 0.36, ryScale: 0.12, alphaBoost: 1.0 };
    }
    // Fall back to a small generic ground-plant shadow for unknown
    // keys that aren't explicitly excluded.
    return { rxScale: 0.34, ryScale: 0.12, alphaBoost: 0.9 };
  }
  function drawDecorationShadows(ctx, m, offX, offY, startTx, startTy, viewTx, viewTy, TS, steps) {
    if (!tiltActive()) return;
    if (!m.decorations || !m.decorations.length) return;
    const baseOpts = phaseShadowOpts(steps);
    for (const d of m.decorations) {
      const spec = decorShadowSpec(d.key);
      if (!spec) continue;
      const tx = d.x - startTx, ty = d.y - startTy;
      if (tx < -1 || tx > viewTx + 1 || ty < -1 || ty > viewTy + 1) continue;
      const cx = offX + tx * TS + TS / 2;
      const by = offY + ty * TS + TS - 3;
      drawShadow(ctx, cx, by, TS, {
        rxScale: spec.rxScale,
        ryScale: spec.ryScale,
        centerAlpha: (baseOpts.centerAlpha || 0.36) * (spec.alphaBoost || 1),
        color: baseOpts.color,
        offsetX: baseOpts.offsetX,
        offsetY: baseOpts.offsetY,
        lengthScale: baseOpts.lengthScale,
        alphaScale: baseOpts.alphaScale
      });
    }
  }
  // Building-base shadow strip: rectangular soft strip painted on
  // the ground tile directly south of any structural tile (wall,
  // roof, door, window, fence). Replaces the old round 'puddle'
  // shadow under buildings (PR #19) with the architectural projection
  // a real DS game would draw.
  function isStructuralTile(props) {
    if (!props) return false;
    if (props.walk) return false;
    const n = props.name || '';
    if (n.indexOf('roof') >= 0) return true;
    if (n.indexOf('wall') >= 0) return true;
    if (n.indexOf('door') >= 0) return true;
    if (n.indexOf('window') >= 0) return true;
    if (n.indexOf('fence') >= 0) return true;
    if (n === 'mart' || n === 'center' || n === 'healer' || n === 'counter') return true;
    return false;
  }
  function drawBuildingShadows(ctx, m, startTx, startTy, offX, offY, viewTx, viewTy, TS, steps) {
    if (!tiltActive()) return;
    const baseOpts = phaseShadowOpts(steps);
    // Skip in deep night — no sun, no architectural shadow.
    if ((baseOpts.alphaScale || 0) < 0.25) return;
    const props = window.PR_MAPS && window.PR_MAPS.TILE_PROPS;
    if (!props) return;
    // Strip height grows from 3px at noon to 9px at low sun.
    // baseOpts.lengthScale ranges 0.85..1.8, so this lerps 3..9.
    const stripH = Math.max(2, Math.min(10, 1.5 + (baseOpts.lengthScale || 1) * 4));
    const alpha = 0.30 * (baseOpts.alphaScale || 1);
    if (alpha < 0.04) return;
    const colorBase = baseOpts.color || '0,0,0';
    ctx.save();
    for (let ty = 0; ty <= viewTy; ty++) {
      for (let tx = 0; tx <= viewTx; tx++) {
        const wx = startTx + tx, wy = startTy + ty;
        if (wy < 0 || wy >= m.tiles.length - 1) continue;
        const row = m.tiles[wy];
        const below = m.tiles[wy + 1];
        if (!row || !below) continue;
        if (wx < 0 || wx >= row.length || wx >= below.length) continue;
        const here = props[row[wx]];
        const beneath = props[below[wx]];
        if (!isStructuralTile(here)) continue;
        if (!beneath || !beneath.walk) continue;
        // Paint a soft rectangular strip on the ground tile beneath.
        const sx = offX + tx * TS + 1;
        const baseY = offY + (ty + 1) * TS;
        const grad = ctx.createLinearGradient(0, baseY, 0, baseY + stripH);
        grad.addColorStop(0,    'rgba(' + colorBase + ',' + alpha.toFixed(3) + ')');
        grad.addColorStop(0.55, 'rgba(' + colorBase + ',' + (alpha * 0.55).toFixed(3) + ')');
        grad.addColorStop(1,    'rgba(' + colorBase + ',0)');
        ctx.fillStyle = window.PR_UI.pf(grad);
        ctx.fillRect(sx, baseY, TS - 2, stripH);
      }
    }
    ctx.restore();
  }
  // Soft vignette applied at the very end of overworld render. Subtle
  // - just enough to round the corners and give the screen a touch of
  // cinematic framing.
  function drawVignette(ctx, viewW, viewH) {
    if (!tiltActive()) return;
    const grad = ctx.createRadialGradient(
      viewW / 2, viewH / 2, viewH * 0.42,
      viewW / 2, viewH / 2, viewH * 0.78
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(8,4,16,0.38)');
    ctx.fillStyle = window.PR_UI.pf(grad);
    ctx.fillRect(0, 0, viewW, viewH);
  }

  // 0 at noon, peaks at 1 around midnight. Used to gate / scale night-
  // only effects (window glow, lamp halos). Steps 80..240 are the
  // dusk-night-dawn band; we ramp up, peak at 160, ramp down.
  function nightness(steps) {
    const t = (((steps % CYCLE_STEPS) + CYCLE_STEPS) % CYCLE_STEPS);
    if (t <= 80 || t >= 240) return 0;
    const dist = Math.abs(t - 160);
    return Math.max(0, 1 - dist / 80);
  }
  // Soft additive radial glow. Used for lamp halos and window light.
  // Set globalCompositeOperation to 'lighter' before calling so the
  // glow lifts darkened tiles instead of just colour-blending. The
  // gradient has a small bright core (~25% radius) and a long soft
  // falloff so multiple overlapping glows don't immediately saturate
  // to pure white under additive composite.
  function drawGlow(ctx, cx, cy, radius, color, alpha) {
    if (alpha <= 0) return;
    // Pull the alpha out of the rgba(...) string so we can taper it
    // down through the falloff instead of holding solid color until
    // the outer ~40%.
    const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(color || '');
    const r = m ? m[1] : '255', g = m ? m[2] : '255', b = m ? m[3] : '255';
    const c = (a) => 'rgba(' + r + ',' + g + ',' + b + ',' + a.toFixed(3) + ')';
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0,    c(1.00));
    grad.addColorStop(0.20, c(0.85));
    grad.addColorStop(0.50, c(0.40));
    grad.addColorStop(0.80, c(0.10));
    grad.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = window.PR_UI.pf(grad);
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    ctx.restore();
  }

  // Names of decoration keys that should emit warm light at night.
  function decorIsLamp(key) {
    if (!key) return false;
    return key.indexOf('lamp_') === 0
        || key.indexOf('streetlamp_') === 0
        || key.indexOf('lantern') >= 0
        || key === 'street_clock';
  }
  // Draws lamp halos and window-light squares for visible tiles.
  // Active only when tilt is active AND it's nighttime. Drawn AFTER
  // the day/night tint so glows can lift the darkened image.
  // Window pane geometry — must match gbaWindow() in tools/atlas-art.js
  // so the glow halo and lit square line up with the actual glass.
  // '[' (window_left) — pane on the right half of the tile.
  // ']' (window_right) — pane on the left half of the tile.
  // For each: pane at (paneX, y+10) size 12x10, glass center at
  // (paneX+6, y+15).
  function drawNightLights(ctx, m, startTx, startTy, offX, offY, viewTx, viewTy, TS, steps) {
    if (!tiltActive()) return;
    const nFactor = nightness(steps);
    if (nFactor < 0.05) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let ty = 0; ty <= viewTy; ty++) {
      for (let tx = 0; tx <= viewTx; tx++) {
        const wx = startTx + tx, wy = startTy + ty;
        if (wy < 0 || wy >= m.tiles.length) continue;
        const row = m.tiles[wy];
        if (wx < 0 || wx >= row.length) continue;
        const code = row[wx];
        const tileX = offX + tx * TS, tileY = offY + ty * TS;
        const cx = tileX + TS / 2;
        const cy = tileY + TS / 2;
        if (code === '|' || code === 'I') {
          // Streetlamp: tall halo from the head of the lamp downward.
          drawGlow(ctx, cx, cy - 4, TS * 1.15, 'rgba(255,224,128,1)', 0.42 * nFactor);
        } else if (code === '[' || code === ']') {
          // Window: halo centered on the actual glass pane (off-tile-center).
          const gx = tileX + (code === '[' ? 23 : 9);
          const gy = tileY + 15;
          drawGlow(ctx, gx, gy, TS * 0.70, 'rgba(255,232,144,1)', 0.42 * nFactor);
        }
      }
    }
    // Decoration-based lamps (post-content-drop). Many cities now place
    // lamps as decoration keys (lamp_ornate_gold, streetlamp_ornate_*,
    // lamp_paper_lantern, etc.) instead of '|' tile codes — without this
    // pass they sit dark at night even though the visible sprite is a lit
    // lantern. Iterate the visible window of the decorations array and
    // cast a soft glow from each one.
    if (m.decorations && m.decorations.length) {
      for (const d of m.decorations) {
        if (!decorIsLamp(d.key)) continue;
        const sx = offX + (d.x - startTx) * TS;
        const sy = offY + (d.y - startTy) * TS;
        if (sx < -TS * 2 || sx > offX + (viewTx + 2) * TS) continue;
        if (sy < -TS * 2 || sy > offY + (viewTy + 2) * TS) continue;
        const cx = sx + TS / 2;
        const cy = sy + TS / 2 - 4;
        // Big lamps (streetlamps + lanterns) glow further than table/floor lamps.
        const big = d.key.indexOf('streetlamp_') === 0 || d.key.indexOf('lantern') >= 0 || d.key === 'lamp_floor_tall';
        const radius = big ? TS * 1.15 : TS * 0.80;
        const alpha = (big ? 0.38 : 0.28) * nFactor;
        drawGlow(ctx, cx, cy, radius, 'rgba(255,224,128,1)', alpha);
      }
    }
    ctx.restore();
    // Lit-window square uses normal compositing so it shows as a solid
    // golden pane rather than a pure additive bloom.
    if (nFactor < 0.1) return;
    ctx.save();
    ctx.fillStyle = window.PR_UI.pf('rgba(255,232,144,' + (0.55 * nFactor).toFixed(3) + ')');
    for (let ty = 0; ty <= viewTy; ty++) {
      for (let tx = 0; tx <= viewTx; tx++) {
        const wx = startTx + tx, wy = startTy + ty;
        if (wy < 0 || wy >= m.tiles.length) continue;
        const row = m.tiles[wy];
        if (wx < 0 || wx >= row.length) continue;
        const code = row[wx];
        if (code === '[' || code === ']') {
          const tileX = offX + tx * TS, tileY = offY + ty * TS;
          const paneX = tileX + (code === '[' ? 17 : 3);
          ctx.fillRect(paneX, tileY + 10, 12, 10);
        }
      }
    }
    ctx.restore();
  }
  // Player-attached lantern: a soft warm radial glow around the player
  // at night. Reuses drawGlow under additive composite so the cone
  // 'lifts' the darkened image. Falls off to nothing during the day.
  function drawPlayerLantern(ctx, px, py, steps) {
    if (!tiltActive()) return;
    const n = nightness(steps);
    if (n < 0.1) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, px, py, 88, 'rgba(255,200,128,1)', 0.34 * n);
    ctx.restore();
  }
  // Subtle 1-2 pixel sparkle on water tiles. Cycle is driven by wall-
  // clock time so the shimmer keeps moving even when the player is
  // stationary. Skipped on non-DS presets.
  function drawWaterShimmer(ctx, m, startTx, startTy, offX, offY, viewTx, viewTy, TS) {
    if (!tiltActive()) return;
    const phase = (performance.now() / 280) | 0;
    ctx.fillStyle = window.PR_UI.pf('rgba(255,255,255,0.55)');
    for (let ty = 0; ty <= viewTy; ty++) {
      for (let tx = 0; tx <= viewTx; tx++) {
        const wx = startTx + tx, wy = startTy + ty;
        if (wy < 0 || wy >= m.tiles.length) continue;
        const row = m.tiles[wy];
        if (wx < 0 || wx >= row.length) continue;
        if (row[wx] !== 'W') continue;
        const seed = (wx * 7 + wy * 13 + phase) & 7;
        if (seed < 2) {
          const px = offX + tx * TS + 4 + seed * 4;
          const py = offY + ty * TS + 8 + (seed % 3) * 8;
          ctx.fillRect(px, py, 2, 1);
        }
        const seed2 = (wx * 11 + wy * 5 + phase + 3) & 7;
        if (seed2 === 0) {
          const px = offX + tx * TS + 18;
          const py = offY + ty * TS + 22;
          ctx.fillRect(px, py, 1, 1);
        }
      }
    }
  }
  // Cinematic color grade: warm-on-top / cool-on-bottom split tone
  // applied at low alpha during the dawn/dusk bands. Skipped at noon
  // so the daytime brightness isn't flattened.
  function drawColorGrade(ctx, viewW, viewH, steps) {
    if (!tiltActive()) return;
    const t = (((steps % CYCLE_STEPS) + CYCLE_STEPS) % CYCLE_STEPS);
    const peakDawn = 1 - Math.min(1, Math.abs(t - 240) / 40);
    const peakDusk = 1 - Math.min(1, Math.abs(t - 80)  / 40);
    const intensity = Math.max(peakDawn, peakDusk, 0);
    if (intensity < 0.1) return;
    const grad = ctx.createLinearGradient(0, 0, 0, viewH);
    const isDawn = peakDawn > peakDusk;
    if (isDawn) {
      grad.addColorStop(0, 'rgba(255,200,180,' + (0.18 * intensity).toFixed(3) + ')');
      grad.addColorStop(1, 'rgba(120,140,200,' + (0.16 * intensity).toFixed(3) + ')');
    } else {
      grad.addColorStop(0, 'rgba(255,160,90,'  + (0.20 * intensity).toFixed(3) + ')');
      grad.addColorStop(1, 'rgba(80,80,140,'   + (0.18 * intensity).toFixed(3) + ')');
    }
    ctx.fillStyle = window.PR_UI.pf(grad);
    ctx.fillRect(0, 0, viewW, viewH);
  }
  // God-ray shafts: thin diagonal yellow stripes drifting down-left
  // from the top edge of tall tiles during the dawn/dusk band.
  // Sparse - only every 3rd tall tile gets rays so the count stays
  // bounded.
  function drawGodRays(ctx, m, startTx, startTy, offX, offY, viewTx, viewTy, TS, steps) {
    if (!tiltActive()) return;
    const t = (((steps % CYCLE_STEPS) + CYCLE_STEPS) % CYCLE_STEPS);
    const peakDawn = 1 - Math.min(1, Math.abs(t - 240) / 30);
    const peakDusk = 1 - Math.min(1, Math.abs(t - 80)  / 30);
    const peak = Math.max(peakDawn, peakDusk);
    if (peak < 0.15) return;
    // Wall-clock animation so the rays sway / pulse continuously, even
    // when the player is standing still. The dawn/dusk peak (above) is
    // still steps-based so the rays only appear during the right time of
    // "day"; this just gives them visible motion within that window.
    const wallTime = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
    const drift = Math.sin(wallTime * 0.5) * 4;
    const alphaPulse = 0.85 + Math.sin(wallTime * 3) * 0.15;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = window.PR_UI.pf('rgba(255,228,160,' + (0.10 * peak * alphaPulse).toFixed(3) + ')');
    for (let ty = 0; ty <= viewTy; ty++) {
      for (let tx = 0; tx <= viewTx; tx++) {
        const wx = startTx + tx, wy = startTy + ty;
        if (wy < 0 || wy >= m.tiles.length) continue;
        const row = m.tiles[wy];
        if (wx < 0 || wx >= row.length) continue;
        if (!isTallTile(row[wx])) continue;
        // Only the topmost tile of a structure casts rays - skip the
        // tile when there's another tall tile directly above it.
        const above = (wy > 0) ? m.tiles[wy - 1][wx] : null;
        if (above && isTallTile(above)) continue;
        // Sparse: hash of the tile coord picks ~1 in 3 for rays.
        if (((wx * 13 + wy * 7) & 3) !== 0) continue;
        const sx0 = offX + tx * TS;
        const sy0 = offY + ty * TS;
        // Per-tile phase offset so rays don't all sway in lockstep.
        const tileDrift = drift + Math.sin(wallTime * 0.7 + (wx + wy) * 0.3) * 1.5;
        // Two thin parallelograms drifting down-left.
        for (let r = 0; r < 2; r++) {
          const off = r * 8 + tileDrift;
          ctx.beginPath();
          ctx.moveTo(sx0 + 6 + off, sy0);
          ctx.lineTo(sx0 + 9 + off, sy0);
          ctx.lineTo(sx0 - 18 + off, sy0 + 56);
          ctx.lineTo(sx0 - 21 + off, sy0 + 56);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }
  // Heat shimmer: a few wavy horizontal bands in the lower half of
  // the screen on desert maps during the day. Sub-pixel sine drift
  // makes the bands feel like atmospheric distortion.
  function drawHeatShimmer(ctx, m, viewW, viewH, steps) {
    if (!tiltActive()) return;
    if (biomeFor(m) !== 'desert') return;
    const t = (((steps % CYCLE_STEPS) + CYCLE_STEPS) % CYCLE_STEPS);
    const isDay = t < 60 || t > 280;
    if (!isDay) return;
    const phase = performance.now() / 1000;
    ctx.save();
    ctx.fillStyle = window.PR_UI.pf('rgba(255,240,200,0.14)');
    for (let i = 0; i < 5; i++) {
      const y = (viewH * 0.55) + i * 12 + Math.sin(phase * 1.5 + i * 0.7) * 2;
      ctx.fillRect(0, y | 0, viewW, 1);
    }
    ctx.restore();
  }
  // Snow caps: 1-2 px white bar on the top edge of every tall tile in
  // a snow-biome map, suggesting accumulated snow. Cheap.
  function drawSnowCaps(ctx, m, startTx, startTy, offX, offY, viewTx, viewTy, TS) {
    if (!tiltActive()) return;
    if (biomeFor(m) !== 'snow') return;
    ctx.save();
    ctx.fillStyle = window.PR_UI.pf('rgba(255,255,255,0.78)');
    for (let ty = 0; ty <= viewTy; ty++) {
      for (let tx = 0; tx <= viewTx; tx++) {
        const wx = startTx + tx, wy = startTy + ty;
        if (wy < 0 || wy >= m.tiles.length) continue;
        const row = m.tiles[wy];
        if (wx < 0 || wx >= row.length) continue;
        if (!isTallTile(row[wx])) continue;
        // Only the topmost tile of a stack accumulates snow.
        const above = (wy > 0) ? m.tiles[wy - 1][wx] : null;
        if (above && isTallTile(above)) continue;
        const sx = offX + tx * TS;
        const sy = offY + ty * TS;
        ctx.fillRect(sx + 4, sy + 2, TS - 8, 1);
        ctx.fillRect(sx + 6, sy + 1, TS - 12, 1);
      }
    }
    ctx.restore();
  }
  // Pulse around uncollected hidden items so a perceptive player can
  // spot them (tiles already lookup as hidden in the map data, but
  // they had no visual hint until now). Brighter at night.
  function drawHiddenPulses(ctx, m, camX, camY, viewW, viewH, steps, foundItems) {
    if (!tiltActive()) return;
    const hidden = m.hidden;
    if (!hidden) return;
    const phase = (performance.now() % 1500) / 1500;
    const nFactor = nightness(steps);
    const baseAlpha = 0.32 + 0.28 * nFactor;
    ctx.save();
    ctx.lineWidth = 1;
    for (const key of Object.keys(hidden)) {
      const found = foundItems && foundItems.has && foundItems.has(m.id + ':' + key);
      if (found) continue;
      const parts = key.split(',');
      const hx = parts[0] | 0, hy = parts[1] | 0;
      const sx = hx * 32 - camX + 16;
      const sy = hy * 32 - camY + 16;
      if (sx < -32 || sx > viewW + 32 || sy < -32 || sy > viewH + 32) continue;
      const r = phase * 12 + 2;
      const alpha = (1 - phase) * baseAlpha;
      ctx.strokeStyle = window.PR_UI.pf('rgba(248,224,144,' + alpha.toFixed(3) + ')');
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  // Water animation. Three tiers of fanciness:
  //   ds_diamond  — full reflections + scrolling ripple bands + sparkle
  //   gba_firered — 2-frame palette toggle on water tiles
  //   gbc_yellow / gb_red — static water (intentional, matches the era)
  // Reflections for tall tiles directly above water are still DS-only
  // because they require atlas reads.
  function drawWaterAnimation(ctx, m, startTx, startTy, offX, offY, viewTx, viewTy, TS) {
    const tier = graphicsTier();
    const reduced = window.PR_SETTINGS && window.PR_SETTINGS.reducedMotion;
    const wallMs = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (tier === 'gb_red' || tier === 'gbc_yellow') return;
    if (tier === 'gba_firered') {
      // 2-frame swap: every ~700ms toggle a slightly lighter overlay
      // across all visible water tiles. Faint, but visible motion.
      const phase = ((wallMs / 700) | 0) % 2;
      if (phase === 0) return;
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = window.PR_UI.pf('#a8d4f0');
      for (let ty = 0; ty <= viewTy; ty++) {
        for (let tx = 0; tx <= viewTx; tx++) {
          const wx = startTx + tx, wy = startTy + ty;
          if (wy < 0 || wy >= m.tiles.length) continue;
          const row = m.tiles[wy];
          if (wx < 0 || wx >= row.length) continue;
          if (row[wx] !== 'W') continue;
          const sx = offX + tx * TS;
          const sy = offY + ty * TS;
          ctx.fillRect(sx, sy, TS, TS);
        }
      }
      ctx.restore();
      return;
    }
    // DS Diamond from here.
    if (!window.PR_ATLAS || !window.PR_ATLAS.isReady()) return;
    const phaseOffset = Math.sin(wallMs / 600) * 1; // gentle reflection ripple
    // Reflections pass.
    for (let ty = 0; ty <= viewTy; ty++) {
      for (let tx = 0; tx <= viewTx; tx++) {
        const wx = startTx + tx, wy = startTy + ty;
        if (wy < 1 || wy >= m.tiles.length) continue;
        const row = m.tiles[wy];
        if (wx < 0 || wx >= row.length) continue;
        if (row[wx] !== 'W') continue;
        const aboveRow = m.tiles[wy - 1];
        if (!aboveRow || wx >= aboveRow.length) continue;
        const above = aboveRow[wx];
        if (!isTallTile(above)) continue;
        const sx = offX + tx * TS;
        const sy = offY + ty * TS;
        ctx.save();
        ctx.globalAlpha = 0.32;
        // Flip vertically: scale(1,-1) about the tile's TOP edge so
        // the flipped image sits below it (in the water cell).
        ctx.translate(sx + phaseOffset, sy + TS);
        ctx.scale(1, -1);
        window.PR_ATLAS.drawTileCode(ctx, above, 0, 0, { map:m, tx:wx, ty:wy - 1 });
        ctx.restore();
      }
    }
    if (reduced) return;
    // Scrolling ripple bands + sparkles. Drawn on every visible water
    // tile, in tile-aligned modulo so adjacent tiles seam together.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const scroll = (wallMs / 200) % TS;
    for (let ty = 0; ty <= viewTy; ty++) {
      for (let tx = 0; tx <= viewTx; tx++) {
        const wx = startTx + tx, wy = startTy + ty;
        if (wy < 0 || wy >= m.tiles.length) continue;
        const row = m.tiles[wy];
        if (wx < 0 || wx >= row.length) continue;
        if (row[wx] !== 'W') continue;
        const sx = offX + tx * TS;
        const sy = offY + ty * TS;
        // Two thin lighter bands scroll right across the tile. Their
        // y-positions are tied to (wy * 8 + scroll) so the bands appear
        // continuous between vertically-adjacent water tiles.
        ctx.fillStyle = window.PR_UI.pf('rgba(180,220,248,0.18)');
        const band1y = ((wy * 11 + (scroll | 0)) % TS);
        const band2y = ((wy * 11 + (scroll | 0) + 14) % TS);
        ctx.fillRect(sx, sy + band1y, TS, 1);
        ctx.fillRect(sx, sy + band2y, TS, 1);
        // Per-tile sparkle: a single pixel that blinks every ~1.2s
        // based on a deterministic seed from the tile coordinate.
        const seed = (wx * 73 ^ wy * 41) & 7;
        const blink = ((wallMs / 1200 + seed) % 1);
        if (blink < 0.07) {
          const spx = sx + ((wx * 17) & 31);
          const spy = sy + ((wy * 23) & 31);
          ctx.fillStyle = window.PR_UI.pf('rgba(255,255,255,0.85)');
          ctx.fillRect(spx, spy, 1, 1);
        }
      }
    }
    ctx.restore();
  }
  // Backwards-compat alias.
  function drawWaterReflections(ctx, m, startTx, startTy, offX, offY, viewTx, viewTy, TS) {
    drawWaterAnimation(ctx, m, startTx, startTy, offX, offY, viewTx, viewTy, TS);
  }
  // Tilt-shift bands: blur the top and bottom strips of the rendered
  // canvas to suggest depth-of-field. Cached offscreen canvas keeps
  // alloc cost bounded; ctx.filter does the actual blur.
  let _tiltShiftCache = null;
  function drawTiltShift(ctx, viewW, viewH) {
    if (!tiltActive()) return;
    if (typeof ctx.filter !== 'string') return; // unsupported browser
    if (!_tiltShiftCache) _tiltShiftCache = document.createElement('canvas');
    if (_tiltShiftCache.width !== viewW || _tiltShiftCache.height !== viewH) {
      _tiltShiftCache.width = viewW;
      _tiltShiftCache.height = viewH;
    }
    const oc = _tiltShiftCache.getContext('2d');
    oc.clearRect(0, 0, viewW, viewH);
    oc.drawImage(ctx.canvas, 0, 0);
    ctx.save();
    ctx.filter = 'blur(1.5px)';
    ctx.globalAlpha = 0.45;
    // Top strip
    ctx.drawImage(_tiltShiftCache, 0, 0, viewW, 36, 0, 0, viewW, 36);
    // Bottom strip
    ctx.drawImage(_tiltShiftCache, 0, viewH - 36, viewW, 36, 0, viewH - 36, viewW, 36);
    ctx.restore();
  }
  // Weather particle factory. Returns a particle object suited to the
  // requested kind / intensity / wind. Hurricane spawns extreme-wind
  // rain (with occasional debris flecks). Fog/overcast spawn nothing —
  // their visuals come from drawWeatherOverlay sheets. Overcast
  // spawns nothing (the look is overlay-based, not particle-based).
  function spawnWeatherParticle(kind, intensity, viewW, wind) {
    const widerW = viewW + 80;
    if (kind === 'rain' || kind === 'thunder') {
      const heavy = (kind === 'thunder' || intensity > 0.7);
      const slant = -40 - 80 * wind;
      return {
        kind: 'rain',
        x: Math.random() * widerW - 40,
        y: -12,
        vx: slant,
        vy: 240 + 120 * intensity,
        life: 0.9,
        maxLife: 0.9,
        color: heavy ? 'rgba(160,196,232,0.70)' : 'rgba(180,210,240,0.55)',
        size: 1,
        tail: 4 + Math.round(intensity * 6),
        spin: 0
      };
    }
    if (kind === 'snow') {
      const shake = 8 + 12 * intensity;
      return {
        kind: 'snow',
        x: Math.random() * widerW - 40,
        y: -8,
        vx: -10 - 30 * wind + (Math.random() - 0.5) * 10,
        vy: 24 + 40 * intensity,
        life: 6 + Math.random() * 2,
        maxLife: 8,
        color: 'rgba(248,252,255,0.95)',
        size: intensity > 0.7 ? 2 : 1,
        spin: shake * 0.2,  // sideways wobble amplitude
        seed: Math.random() * 6.28
      };
    }
    if (kind === 'sleet') {
      // Half-and-half: roughly 60% rain, 40% snow, with slightly higher
      // velocity than pure snow.
      if (Math.random() < 0.6) {
        return spawnWeatherParticle('rain', intensity, viewW, wind);
      }
      const sf = spawnWeatherParticle('snow', intensity, viewW, wind);
      sf.vy *= 1.6;
      sf.color = 'rgba(220,232,240,0.85)';
      return sf;
    }
    if (kind === 'hail') {
      return {
        kind: 'hail',
        x: Math.random() * widerW - 40,
        y: -10,
        vx: -8 - 16 * wind,
        vy: 320 + 120 * intensity,
        life: 0.8,
        maxLife: 0.8,
        color: 'rgba(232,240,248,0.95)',
        size: 1.5 + Math.random() * 0.5,
        spin: 0
      };
    }
    if (kind === 'hurricane') {
      // Extreme rain at a steeper angle. Plus occasional debris flecks.
      if (Math.random() < 0.05) {
        return {
          kind: 'debris',
          x: Math.random() * widerW - 40,
          y: -8,
          vx: -180,
          vy: 180,
          life: 1.0,
          maxLife: 1.0,
          color: 'rgba(80,72,56,0.85)',
          size: 1.5,
          spin: 0
        };
      }
      const r = spawnWeatherParticle('rain', 1.0, viewW, 1.0);
      r.vx = -160; r.vy = 360; r.tail = 8;
      return r;
    }
    // Fog spawns slow-moving horizontal sheets rendered later by the
    // overlay; no particles needed here, return null and let the
    // overlay handle the look entirely.
    return null;
  }
  // Backwards-compat alias for any legacy callers.
  function spawnRainParticle(viewW) {
    return spawnWeatherParticle('rain', 0.55, viewW, 0.3);
  }
  // Footstep dust particles: fade out over time, drift slightly upward.
  // Spawned by World.prototype._spawnDust on step completion when the
  // player lands on a dusty tile (sand, dirt path, gravel). Drawn
  // before the day/night tint so they read like ground particles, not
  // sparks.
  // Footstep-dust eligibility. The dust particle is tan/amber and looks
  // out of place on cobble, red brick, snow, boardwalk, moss, etc. — so
  // restrict to actually dirt-textured surfaces. Originally any tile
  // with 'path' in its name kicked dust, which painted dirty blobs on
  // frostmere's snowy paths and other paved town paths.
  const DUSTY_TILE_NAMES = new Set([
    'sand', 'path', 'path_sand', 'path_dirt', 'path_desert',
    'path_gravel', 'path_dust'
  ]);
  function isDustyTile(code) {
    const props = window.PR_MAPS && window.PR_MAPS.TILE_PROPS && window.PR_MAPS.TILE_PROPS[code];
    if (!props || !props.walk) return false;
    return DUSTY_TILE_NAMES.has(props.name || '');
  }
  function tickDust(particles, dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      p.y += p.vy * dt;
      p.vy *= 0.96; // gentle deceleration
      if (p.life <= 0) particles.splice(i, 1);
    }
  }
  function drawDust(ctx, particles, camX, camY) {
    for (const p of particles) {
      const sx = p.x - camX, sy = p.y - camY;
      if (sx < -8 || sx > VIEW_W + 8 || sy < -8 || sy > VIEW_H + 8) continue;
      const k = p.life / p.maxLife;
      ctx.fillStyle = window.PR_UI.pf('rgba(216,184,120,' + (0.55 * k).toFixed(3) + ')');
      ctx.fillRect((sx - 1) | 0, (sy - 1) | 0, 3, 2);
    }
  }
  // Sweep overlay for tallgrass cells the player just walked through:
  // two short slashes at the cell base that fade out as the timer
  // counts down. Placed under NPCs/player so the player covers the
  // marks at their current location.
  function drawSweptGrass(ctx, swept, camX, camY) {
    for (const s of swept) {
      const cx = s.x * TS - camX + TS / 2;
      const cy = s.y * TS - camY + TS - 10;
      if (cx < -TS || cx > VIEW_W + TS || cy < -TS || cy > VIEW_H + TS) continue;
      const k = Math.max(0, Math.min(1, s.t / 0.35));
      ctx.fillStyle = window.PR_UI.pf('rgba(168,232,128,' + (0.9 * k).toFixed(3) + ')');
      // Two angled slashes flanking the centre, suggesting parted blades.
      ctx.fillRect((cx - 6) | 0, (cy - 1) | 0, 4, 1);
      ctx.fillRect((cx + 2) | 0, (cy - 1) | 0, 4, 1);
      ctx.fillRect((cx - 5) | 0, (cy)     | 0, 3, 1);
      ctx.fillRect((cx + 3) | 0, (cy)     | 0, 3, 1);
    }
  }
  // Foreground tall grass: when a movable sprite (player, NPC, ambient
  // creature) stands on a `:` tile, paint a row of grass blades OVER
  // the sprite's lower half so the sprite reads as wading through.
  // Classic Pokemon-style 2.5D look. Active only in DS Diamond.
  function drawForegroundTallgrass(ctx, tx, ty, camX, camY) {
    if (!tiltActive()) return;
    const sx = tx * TS - camX;
    const sy = ty * TS - camY;
    if (sx < -TS || sx > VIEW_W || sy < -TS || sy > VIEW_H) return;
    // Front row of darker blades (closer to camera).
    ctx.fillStyle = window.PR_UI.pf('rgba(36,86,40,0.95)');
    for (let i = 0; i < 8; i++) {
      const bx = sx + 1 + i * 4 + (i & 1);
      const by = sy + TS - 8;
      ctx.fillRect(bx | 0, by | 0, 1, 5);
      ctx.fillRect((bx + 1) | 0, (by + 1) | 0, 1, 4);
    }
    // Mid row of brighter blade tips peeking through.
    ctx.fillStyle = window.PR_UI.pf('rgba(108,196,72,0.92)');
    for (let i = 0; i < 6; i++) {
      const bx = sx + 4 + i * 5;
      const by = sy + TS - 6;
      ctx.fillRect(bx | 0, by | 0, 1, 3);
    }
    // Highlight pixels at the tips.
    ctx.fillStyle = window.PR_UI.pf('rgba(196,240,144,0.85)');
    for (let i = 0; i < 4; i++) {
      const bx = sx + 6 + i * 7;
      const by = sy + TS - 7;
      ctx.fillRect(bx | 0, by | 0, 1, 1);
    }
  }

  // Biome ambient particles. Each visible map gets a thin scattering of
  // biome-appropriate particles drifting across the view: leaves in
  // forests, snowflakes on cold maps, sand grains in deserts, faint
  // sparkles in caves. Active only in DS Diamond mode and capped so a
  // long session can't slowly leak particles. Each particle owns its
  // own colour, drift vector, and life so we can mix biome behaviours
  // cheaply.
  function biomeFor(map) {
    if (!map) return null;
    const tags = map.tags || [];
    const id = map.id || '';
    const name = (map.name || '').toLowerCase();
    if (tags.indexOf('snow') !== -1 || /frost|snow/.test(id) || /frost|snow/.test(name)) return 'snow';
    if (tags.indexOf('desert') !== -1 || /desert|ruin/.test(id) || /desert|sandy|ruin/.test(name)) return 'desert';
    if (tags.indexOf('forest') !== -1 || /pebblewood|woodfall|route1|route2/.test(id) || /forest|wood/.test(name)) return 'forest';
    if (tags.indexOf('cave') !== -1 || /cavern|cave/.test(id) || /cavern|cave/.test(name)) return 'cave';
    if (tags.indexOf('mountain') !== -1 || /mountain|highspire/.test(id) || /mountain|highspire/.test(name)) return 'mountain';
    return null;
  }
  function spawnBiomeParticle(biome, viewW, viewH, steps) {
    // Forests at night swap leaves for fireflies — slow yellow-green
    // sparkles that drift upward instead of drifting down.
    const n = steps != null ? nightness(steps) : 0;
    if (biome === 'forest' && n > 0.3) {
      return {
        x: Math.random() * viewW,
        y: viewH - 8 + Math.random() * 12,
        vx: -4 + Math.random() * 8,
        vy: -6 - Math.random() * 8,
        life: 4.5 + Math.random() * 2,
        maxLife: 6,
        color: '#f8f0a0',
        size: 1,
        spin: 0
      };
    }
    if (biome === 'snow') {
      return {
        x: Math.random() * (viewW + 60) - 30,
        y: -8,
        vx: -10 - Math.random() * 8,
        vy: 18 + Math.random() * 14,
        life: 5.5, maxLife: 5.5,
        color: '#f8f8ff',
        size: Math.random() < 0.3 ? 2 : 1,
        spin: 0
      };
    }
    if (biome === 'desert') {
      return {
        x: viewW + 8,
        y: 20 + Math.random() * (viewH - 40),
        vx: -50 - Math.random() * 30,
        vy: -2 + Math.random() * 4,
        life: viewW / 50,
        maxLife: viewW / 50,
        color: 'rgba(232,200,140,0.85)',
        size: 1,
        spin: 0
      };
    }
    if (biome === 'forest') {
      const palette = ['#88c060', '#c8a040', '#e08038', '#a0c870'];
      return {
        x: Math.random() * (viewW + 40) - 20,
        y: -10,
        vx: -6 + Math.random() * 4,
        vy: 14 + Math.random() * 8,
        life: 6.5, maxLife: 6.5,
        color: palette[Math.floor(Math.random() * palette.length)],
        size: 2,
        spin: Math.random() * 0.4 - 0.2
      };
    }
    if (biome === 'cave') {
      return {
        x: Math.random() * viewW,
        y: viewH + 4,
        vx: -2 + Math.random() * 4,
        vy: -10 - Math.random() * 6,
        life: 3.5, maxLife: 3.5,
        color: '#f0e898',
        size: 1,
        spin: 0
      };
    }
    if (biome === 'mountain') {
      // Slow horizontal fog blobs - large, soft, alpha-pulsing.
      // We keep `size` larger than other particles and use a special
      // 'fog' kind so drawBiomeParticles can render them as soft
      // alpha rects rather than crisp pixels.
      return {
        kind: 'fog',
        x: viewW + 30,
        y: viewH * 0.4 + Math.random() * (viewH * 0.4),
        vx: -8 - Math.random() * 6,
        vy: 0,
        life: 12, maxLife: 12,
        color: 'rgba(200,210,224,1)',
        size: 22 + Math.random() * 14,
        spin: 0
      };
    }
    return null;
  }
  function tickBiomeParticles(particles, dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.kind === 'snow' && p.spin) {
          // Snowflakes wobble sideways using their own seed so they
          // don't all sway in lockstep.
          p.x += Math.sin(p.life * 1.6 + (p.seed || 0)) * p.spin * dt * 12;
        } else if (p.spin) {
          p.x += Math.sin(p.life * 4) * p.spin;
        }
      }
      if (p.life <= 0 || p.x < -40 || p.x > VIEW_W + 40 || p.y > VIEW_H + 30 || p.y < -60) {
        particles.splice(i, 1);
      }
    }
  }
  function drawBiomeParticles(ctx, particles, tier) {
    tier = tier || 'ds_diamond';
    const fancy = (tier === 'ds_diamond');
    const wallMs = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    for (const p of particles) {
      const k = Math.min(1, p.life / p.maxLife);
      // Fade tail-end so particles disappear gracefully near the edges.
      const fade = k > 0.9 ? (1 - (k - 0.9) / 0.1) : (k < 0.2 ? k / 0.2 : 1);
      ctx.save();
      if (p.kind === 'fog') {
        // Soft radial fog blob: low alpha, gradient falloff.
        const rad = p.size;
        const alpha = 0.16 * fade;
        if (fancy) {
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
          grad.addColorStop(0, 'rgba(220,224,232,' + alpha.toFixed(3) + ')');
          grad.addColorStop(1, 'rgba(220,224,232,0)');
          ctx.fillStyle = window.PR_UI.pf(grad);
          ctx.fillRect((p.x - rad) | 0, (p.y - rad) | 0, (rad * 2) | 0, (rad * 2) | 0);
        } else {
          ctx.fillStyle = window.PR_UI.pf('rgba(220,224,232,' + (alpha * 0.7).toFixed(3) + ')');
          ctx.fillRect((p.x - rad * 0.5) | 0, (p.y - rad * 0.5) | 0, rad | 0, rad | 0);
        }
      } else if (p.kind === 'rain') {
        // Diagonal streak. Tail length scales with intensity; basic
        // tiers get a 1-pixel dot instead of a streak.
        ctx.globalAlpha = fade;
        if (fancy || tier === 'gba_firered') {
          ctx.strokeStyle = window.PR_UI.pf(p.color);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          const tailLen = p.tail || 5;
          // Tail follows the velocity vector so heavy rain looks more
          // diagonal than light rain.
          const len = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1;
          ctx.lineTo(p.x - p.vx / len * tailLen, p.y - p.vy / len * tailLen);
          ctx.stroke();
        } else {
          ctx.fillStyle = window.PR_UI.pf(p.color);
          ctx.fillRect((p.x) | 0, (p.y) | 0, 1, 2);
        }
      } else if (p.kind === 'snow') {
        ctx.globalAlpha = fade;
        if (fancy && p.size >= 2) {
          // Six-spoke flake: a bright centre + 6 thin radial spokes.
          const cx = p.x | 0, cy = p.y | 0;
          ctx.fillStyle = window.PR_UI.pf(p.color);
          ctx.fillRect(cx - 1, cy, 3, 1);
          ctx.fillRect(cx, cy - 1, 1, 3);
          ctx.fillStyle = window.PR_UI.pf('rgba(248,252,255,0.55)');
          ctx.fillRect(cx - 2, cy - 1, 1, 1);
          ctx.fillRect(cx + 2, cy + 1, 1, 1);
          ctx.fillRect(cx + 2, cy - 1, 1, 1);
          ctx.fillRect(cx - 2, cy + 1, 1, 1);
          // Time-based twinkle dot.
          if (((wallMs * 0.01 + (p.seed || 0)) | 0) % 7 === 0) {
            ctx.fillStyle = window.PR_UI.pf('rgba(255,255,255,0.95)');
            ctx.fillRect(cx, cy, 1, 1);
          }
        } else {
          // Basic flake: single white pixel (or 2x2 for higher intensity)
          ctx.fillStyle = window.PR_UI.pf(p.color);
          const s = p.size | 0 || 1;
          ctx.fillRect((p.x - s/2) | 0, (p.y - s/2) | 0, s, s);
        }
      } else if (p.kind === 'hail') {
        ctx.globalAlpha = fade;
        const cx = p.x | 0, cy = p.y | 0;
        if (fancy) {
          // Round white pellet with a darker shadow underneath.
          ctx.fillStyle = window.PR_UI.pf('rgba(180,196,212,0.85)');
          ctx.fillRect(cx - 1, cy + 1, 3, 1);
          ctx.fillStyle = window.PR_UI.pf(p.color);
          ctx.fillRect(cx - 1, cy, 3, 1);
          ctx.fillRect(cx, cy - 1, 1, 3);
          ctx.fillStyle = window.PR_UI.pf('rgba(255,255,255,0.95)');
          ctx.fillRect(cx, cy - 1, 1, 1);
        } else {
          ctx.fillStyle = window.PR_UI.pf(p.color);
          ctx.fillRect(cx, cy, 2, 2);
        }
      } else if (p.kind === 'debris') {
        ctx.globalAlpha = fade;
        ctx.fillStyle = window.PR_UI.pf(p.color);
        const s = Math.max(1, Math.round(p.size));
        ctx.fillRect((p.x - s/2) | 0, (p.y - s/2) | 0, s, s);
      } else {
        ctx.globalAlpha = fade;
        ctx.fillStyle = window.PR_UI.pf(p.color);
        ctx.fillRect((p.x - p.size) | 0, (p.y - p.size) | 0, p.size * 2, p.size * 2);
      }
      ctx.restore();
    }
  }
  // Full-screen weather overlays drawn AFTER the world is rendered:
  // - overcast: dark gray dim + cloud parallax (DS) / just dim (basic)
  // - fog: drifting translucent horizontal sheets
  // - hurricane: a subtle cyclonic shading + windswept streaks
  function drawWeatherOverlay(ctx, weather, viewW, viewH, tier) {
    if (!weather) return;
    const fancy = (tier === 'ds_diamond');
    const wallTime = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
    if (weather.kind === 'overcast') {
      const dim = 0.18 + 0.10 * weather.intensity;
      ctx.fillStyle = window.PR_UI.pf('rgba(60,68,84,' + dim.toFixed(3) + ')');
      ctx.fillRect(0, 0, viewW, viewH);
      if (fancy) {
        // Two big soft cloud blobs drifting L→R at different speeds.
        for (let i = 0; i < 2; i++) {
          const speed = 6 + i * 4;
          const period = (viewW + 120);
          const cx = ((wallTime * speed) % period) - 60 + i * 110;
          const cy = 24 + i * 28;
          const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 90);
          grad.addColorStop(0, 'rgba(40,48,62,0.30)');
          grad.addColorStop(1, 'rgba(40,48,62,0)');
          ctx.fillStyle = window.PR_UI.pf(grad);
          ctx.fillRect(cx - 90, cy - 60, 180, 120);
        }
      }
    } else if (weather.kind === 'fog') {
      // Slow-drifting horizontal sheets of translucent grey. Higher
      // intensity = denser layers (more sheets + higher alpha). Wind
      // controls drift speed. No particles — fog is overlay-only.
      ctx.save();
      const sheets = fancy ? 6 : 3;
      const baseAlpha = 0.10 + 0.22 * weather.intensity;
      const driftMul = 6 + 30 * weather.wind;
      for (let i = 0; i < sheets; i++) {
        const f = i / Math.max(1, sheets - 1);
        const drift = (wallTime * driftMul + i * 73) % (viewW + 240) - 120;
        const y = viewH * (0.18 + 0.60 * f);
        const sheetH = 22 + 14 * f;
        const grad = ctx.createLinearGradient(0, y, 0, y + sheetH);
        grad.addColorStop(0,   'rgba(216,222,232,0)');
        grad.addColorStop(0.5, 'rgba(216,222,232,' + baseAlpha.toFixed(3) + ')');
        grad.addColorStop(1,   'rgba(216,222,232,0)');
        ctx.fillStyle = window.PR_UI.pf(grad);
        ctx.fillRect(-120 + drift, y, viewW + 240, sheetH);
      }
      ctx.restore();
    } else if (weather.kind === 'hurricane' && fancy) {
      // Subtle cyclonic gradient: vignette darker on edges + a slow
      // sweeping band of brighter spray top-to-bottom.
      ctx.save();
      ctx.fillStyle = window.PR_UI.pf('rgba(36,44,56,0.20)');
      ctx.fillRect(0, 0, viewW, viewH);
      const sweepY = ((wallTime * 60) % (viewH + 80)) - 40;
      const grad = ctx.createLinearGradient(0, sweepY - 30, 0, sweepY + 30);
      grad.addColorStop(0, 'rgba(180,196,220,0)');
      grad.addColorStop(0.5, 'rgba(180,196,220,0.18)');
      grad.addColorStop(1, 'rgba(180,196,220,0)');
      ctx.fillStyle = window.PR_UI.pf(grad);
      ctx.fillRect(0, sweepY - 30, viewW, 60);
      ctx.restore();
    }
    // A subtle desaturating dim is shared by ALL precipitation weathers
    // (rain / snow / sleet / hail / thunder / hurricane) so the world
    // reads as cloudy underneath. Intensity-scaled, capped low. Fog
    // and overcast handle their own atmospheric look so they skip this.
    if (weather.kind !== 'overcast' && weather.kind !== 'fog') {
      const dim = Math.min(0.18, 0.05 + 0.10 * weather.intensity);
      ctx.fillStyle = window.PR_UI.pf('rgba(40,48,62,' + dim.toFixed(3) + ')');
      ctx.fillRect(0, 0, viewW, viewH);
    }
  }

  function World(state) {
    this.state = state;
    this.player = state.player;
    this.anim = { moving:false, fromX:0, fromY:0, t:0, duration:0.16 };
    this.frame = 0;            // walk anim frame
    this.frameTimer = 0;
    this.npcFrameTimer = 0;
    this.npcFrame = 0;
    this.encounterCooldown = 0;
    this.justEntered = true;
    this._ambient = [];
    this._initAmbient();
    this._initNpcWander();
    this._birds = [];
    this._initBirds();
    this.follower = null;
    this._resetFollower();
    this._dust = [];
    // Recently-swept tallgrass tiles. Each entry is
    // { x, y, t } where t counts down to 0 over ~0.35s after which
    // the tile renders normally again.
    this._sweptGrass = [];
    // Biome ambient particles (snow/leaves/sand/sparkles). Reset
    // when the map changes so a forest doesn't leak leaves into the
    // next desert.
    this._biomeParticles = [];
    this._biomeSpawnTimer = 0;
    // Weather state. _rainParticles share lifetime with the map;
    // _lightningTimer counts down to the next flash, _lightningFlash
    // is the brief 0..1 fade of the active flash.
    this._rainParticles = [];
    this._rainSpawnTimer = 0;
    this._lightningTimer = 6 + Math.random() * 8;
    this._lightningFlash = 0;
  }

  World.prototype._initAmbient = function() {
    const m = this.currentMap();
    this._ambient = [];
    if (!m || !m.ambient) return;
    for (const a of m.ambient) {
      this._ambient.push({
        species: a.species,
        x: a.x, y: a.y,
        homeX: a.x, homeY: a.y,
        range: a.range || 2,
        // Swimmers (ducks / swan) live on water tiles instead of
        // walkable ground. _isAmbientWalkable honours this per-ambient
        // flag so a duck can't wander onto a path and a chicken can't
        // wander onto a pond.
        swim: !!a.swim,
        dir: 'down',
        anim: { moving:false, t:0, duration:0.4, fromX:a.x, fromY:a.y, toX:a.x, toY:a.y },
        moveTimer: Math.random() * 2,
        nextDelay: 1.5 + Math.random() * 2,
        frame: 0, frameTimer: 0
      });
    }
  };

  // Bird wildlife. Birds perch on roofs / trees (non-walkable
  // tiles) and periodically fly to a new perch within `range`.
  // m.birds = [{ kind:'sparrow'|'pigeon'|'crow', x, y, range }].
  const PERCH_TILES = 'TYOKJQNUVEG+-=*%&78PMghn';
  World.prototype._isPerchable = function(x, y) {
    const m = this.currentMap();
    if (!m || !m.tiles) return false;
    if (y < 0 || y >= m.tiles.length) return false;
    const row = m.tiles[y];
    if (!row || x < 0 || x >= row.length) return false;
    const code = row[x];
    return PERCH_TILES.indexOf(code) >= 0;
  };
  // Pick the first perch tile inside a given rectangular region of
  // the current map. Returns [x, y] or null. Used by the auto-spawn
  // path below so every outdoor map gets at least one crow + one
  // sparrow without having to hand-edit each map's birds array.
  World.prototype._findPerchInRegion = function(x0, y0, x1, y1) {
    const m = this.currentMap();
    if (!m || !m.tiles) return null;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        if (this._isPerchable(x, y)) return [x, y];
      }
    }
    return null;
  };
  World.prototype._initBirds = function() {
    const m = this.currentMap();
    this._birds = [];
    if (!m) return;
    // Auto-seed: every outdoor map gets at least one sparrow + one
    // crow at perch tiles in opposite quadrants. Honours the
    // existing m.birds list — only fills in what's missing.
    const wantList = (m.birds || []).slice();
    if (!m.interior && m.tiles && m.tiles.length) {
      const W = m.tiles[0].length;
      const H = m.tiles.length;
      const hasKind = k => wantList.some(b => b.kind === k);
      if (!hasKind('sparrow')) {
        const tl = this._findPerchInRegion(1, 1, Math.floor(W * 0.5), Math.floor(H * 0.5)) ||
                   this._findPerchInRegion(1, 1, W - 1, H - 1);
        if (tl) wantList.push({ kind:'sparrow', x:tl[0], y:tl[1], range:8 });
      }
      if (!hasKind('crow')) {
        const br = this._findPerchInRegion(Math.floor(W * 0.5), Math.floor(H * 0.5), W - 1, H - 1) ||
                   this._findPerchInRegion(1, 1, W - 1, H - 1);
        if (br) wantList.push({ kind:'crow', x:br[0], y:br[1], range:8 });
      }
    }
    if (!wantList.length) return;
    for (const b of wantList) {
      // If the configured home tile isn't perchable, scan outward
      // (Manhattan radius) for the nearest perchable tile so the
      // bird doesn't spawn floating on a path or grass.
      let hx = b.x, hy = b.y;
      if (!this._isPerchable(hx, hy)) {
        const r = b.range || 8;
        outer: for (let d = 1; d <= r; d++) {
          for (let dy = -d; dy <= d; dy++) {
            for (let dx = -d; dx <= d; dx++) {
              if (Math.abs(dx) + Math.abs(dy) !== d) continue;
              if (this._isPerchable(b.x + dx, b.y + dy)) {
                hx = b.x + dx; hy = b.y + dy;
                break outer;
              }
            }
          }
        }
      }
      this._birds.push({
        kind: b.kind || 'sparrow',
        x: hx, y: hy,
        homeX: hx, homeY: hy,
        range: b.range || 8,
        mode: 'perched',
        perchTimer: 2 + Math.random() * 6,
        anim: { moving:false, t:0, duration:1.2,
                fromX:hx, fromY:hy, toX:hx, toY:hy },
        flapTimer: 0, flapFrame: 0
      });
    }
  };
  World.prototype._updateBirds = function(dt) {
    if (!this._birds || !this._birds.length) return;
    for (const b of this._birds) {
      b.flapTimer += dt;
      const flapRate = b.mode === 'flying' ? 0.08 : 0.45;
      if (b.flapTimer > flapRate) { b.flapTimer = 0; b.flapFrame ^= 1; }
      if (b.mode === 'flying') {
        b.anim.t += dt;
        if (b.anim.t >= b.anim.duration) {
          b.x = b.anim.toX; b.y = b.anim.toY;
          b.anim.moving = false;
          b.mode = 'perched';
          b.perchTimer = 4 + Math.random() * 8;
        }
        continue;
      }
      // Perched — countdown to next flight.
      b.perchTimer -= dt;
      if (b.perchTimer > 0) continue;
      // Try a few random perch tiles within range, fly to first that
      // is perchable and not the current spot.
      const tries = 12;
      let target = null;
      for (let i = 0; i < tries; i++) {
        const dx = Math.floor(Math.random() * (b.range * 2 + 1)) - b.range;
        const dy = Math.floor(Math.random() * (b.range * 2 + 1)) - b.range;
        const nx = b.homeX + dx, ny = b.homeY + dy;
        if (nx === b.x && ny === b.y) continue;
        if (!this._isPerchable(nx, ny)) continue;
        target = { x: nx, y: ny };
        break;
      }
      if (!target) {
        b.perchTimer = 1 + Math.random() * 2;
        continue;
      }
      b.mode = 'flying';
      b.anim.moving = true;
      b.anim.t = 0;
      b.anim.duration = 0.9 + Math.random() * 0.5;
      b.anim.fromX = b.x; b.anim.fromY = b.y;
      b.anim.toX = target.x; b.anim.toY = target.y;
    }
  };
  World.prototype._renderBirds = function(ctx, camX, camY) {
    if (!this._birds || !this._birds.length) return;
    const atlas = window.PR_ATLAS;
    if (!atlas || !atlas.isReady()) return;
    for (const b of this._birds) {
      let bx = b.x, by = b.y;
      let liftY = 0;
      if (b.mode === 'flying') {
        const k = Math.min(1, b.anim.t / b.anim.duration);
        bx = b.anim.fromX + (b.anim.toX - b.anim.fromX) * k;
        by = b.anim.fromY + (b.anim.toY - b.anim.fromY) * k;
        // Parabolic lift: sin gives 0 at endpoints, peaks at mid-flight.
        liftY = -10 * Math.sin(k * Math.PI);
      }
      const sx = bx * TS - camX;
      const sy = by * TS - camY + liftY;
      if (sx < -TS || sx > VIEW_W + TS || sy < -TS || sy > VIEW_H + TS) continue;
      const key = 'decor_wildlife_' + b.kind + '_' + (b.mode === 'flying'
        ? 'flying'
        : (b.flapFrame ? 'perched' : 'perched')); // perched anim reuses single sprite
      atlas.drawKey(ctx, key, sx, sy);
    }
  };

  // Attach wander-state to any NPC that has a `wander` flag. Idempotent —
  // safe to call on every transitionTo. NPCs keep their (possibly
  // wandered) position between visits.
  World.prototype._initNpcWander = function() {
    const m = this.currentMap();
    if (!m || !m.npcs) return;
    for (const n of m.npcs) {
      if (!n.wander) continue;
      if (n._homeX === undefined) { n._homeX = n.x; n._homeY = n.y; }
      if (!n.anim) n.anim = { moving:false, t:0, duration:0.4, fromX:n.x, fromY:n.y, toX:n.x, toY:n.y };
      if (n._range === undefined) n._range = (n.wander && n.wander.range) || 2;
      if (n._moveTimer === undefined) n._moveTimer = Math.random() * 2;
      if (n._nextDelay === undefined) n._nextDelay = 1.5 + Math.random() * 2;
    }
  };

  // Tick wander movement. Mirrors _updateAmbient but operates on m.npcs
  // and respects npc collision (no two NPCs on same tile).
  World.prototype._updateNpcWander = function(dt) {
    const m = this.currentMap();
    if (!m || !m.npcs) return;
    for (const n of m.npcs) {
      if (!n.wander || !n.anim) continue;
      // Defeated trainers and gated NPCs still pace; that's fine.
      if (n.anim.moving) {
        n.anim.t += dt;
        if (n.anim.t >= n.anim.duration) {
          n.x = n.anim.toX; n.y = n.anim.toY;
          n.anim.moving = false;
          n._moveTimer = 0;
          n._nextDelay = 1.5 + Math.random() * 2;
        }
        continue;
      }
      n._moveTimer += dt;
      if (n._moveTimer < n._nextDelay) continue;
      const dirs = ['up','down','left','right'];
      for (let i = dirs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = dirs[i]; dirs[i] = dirs[j]; dirs[j] = t;
      }
      let moved = false;
      for (const d of dirs) {
        let nx = n.x, ny = n.y;
        if (d === 'up') ny--;
        else if (d === 'down') ny++;
        else if (d === 'left') nx--;
        else if (d === 'right') nx++;
        if (Math.abs(nx - n._homeX) > n._range) continue;
        if (Math.abs(ny - n._homeY) > n._range) continue;
        const code = this.tileAt(nx, ny);
        const props = window.PR_MAPS.TILE_PROPS[code];
        if (!props || props.walk !== true) continue;
        if (this.player.x === nx && this.player.y === ny) continue;
        if (this.anim.moving && this.anim.toX === nx && this.anim.toY === ny) continue;
        // Block on other NPCs (current pos OR moving-into-target).
        let blocked = false;
        for (const other of m.npcs) {
          if (other === n) continue;
          if (other.x === nx && other.y === ny) { blocked = true; break; }
          if (other.anim && other.anim.moving && other.anim.toX === nx && other.anim.toY === ny) { blocked = true; break; }
        }
        if (blocked) continue;
        if (this._ambientAt && this._ambientAt(nx, ny, null)) continue;
        n.dir = d;
        n.anim.moving = true;
        n.anim.t = 0;
        n.anim.fromX = n.x; n.anim.fromY = n.y;
        n.anim.toX = nx;    n.anim.toY = ny;
        moved = true;
        break;
      }
      if (!moved) {
        n.dir = dirs[0];
        n._moveTimer = 0;
        n._nextDelay = 1.0 + Math.random() * 1.5;
      }
    }
  };

  const DIR_STEP = {
    up: { x:0, y:-1 },
    down: { x:0, y:1 },
    left: { x:-1, y:0 },
    right: { x:1, y:0 }
  };

  function dirBetween(fx, fy, tx, ty, fallback) {
    const dx = tx - fx, dy = ty - fy;
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
    if (dy !== 0) return dy > 0 ? 'down' : 'up';
    return fallback || 'down';
  }

  World.prototype._spawnDustAtPlayer = function() {
    // 2 small puffs at the player's feet, drifting slightly opposite
    // the direction of travel so they read as "kicked up".
    const dir = this.player.dir;
    const dx = dir === 'left' ? 4 : dir === 'right' ? -4 : 0;
    const dy = dir === 'up' ? 4 : dir === 'down' ? -2 : 0;
    const px = this.player.x * TS + 16;
    const py = this.player.y * TS + 28;
    for (let i = 0; i < 2; i++) {
      this._dust.push({
        x: px + dx + (Math.random() * 6 - 3),
        y: py + dy + (Math.random() * 2 - 1),
        vy: -8 - Math.random() * 6,
        life: 0.5 + Math.random() * 0.2,
        maxLife: 0.7
      });
    }
    if (this._dust.length > 24) this._dust.splice(0, this._dust.length - 24);
  };

  World.prototype._followerWalkable = function(x, y) {
    const code = this.tileAt(x, y);
    const props = window.PR_MAPS.TILE_PROPS[code];
    const walkable = (props && props.walk === true) || code === 'W';
    if (!walkable) return false;
    if (this.npcAt(x, y)) return false;
    if (this.player.x === x && this.player.y === y) return false;
    if (this._ambientAt && this._ambientAt(x, y, null)) return false;
    return true;
  };

  World.prototype._resetFollower = function() {
    const p = this.player;
    const dir = p.dir || 'down';
    const step = DIR_STEP[dir] || DIR_STEP.down;
    const candidates = [
      { x:p.x - step.x, y:p.y - step.y },
      { x:p.x, y:p.y + 1 },
      { x:p.x - 1, y:p.y },
      { x:p.x + 1, y:p.y },
      { x:p.x, y:p.y - 1 }
    ];
    let spot = null;
    for (const c of candidates) {
      if (this._followerWalkable(c.x, c.y)) { spot = c; break; }
    }
    if (!spot) spot = { x:p.x, y:p.y };
    this.follower = {
      x: spot.x,
      y: spot.y,
      dir: dir,
      frame: 0,
      frameTimer: 0,
      anim: { moving:false, t:0, duration:0.16, fromX:spot.x, fromY:spot.y, toX:spot.x, toY:spot.y }
    };
  };

  World.prototype._startFollowerMove = function(tx, ty, dur) {
    if (!this.follower) this._resetFollower();
    const f = this.follower;
    f.dir = dirBetween(f.x, f.y, tx, ty, f.dir);
    if (f.x === tx && f.y === ty) {
      f.anim.moving = false;
      f.anim.t = 0;
      return;
    }
    f.anim.moving = true;
    f.anim.fromX = f.x; f.anim.fromY = f.y;
    f.anim.toX = tx;   f.anim.toY = ty;
    f.anim.t = 0;
    f.anim.duration = dur || this.anim.duration || 0.16;
  };

  World.prototype._updateFollower = function(dt) {
    const f = this.follower;
    if (!f) return;
    f.frameTimer += dt;
    if (f.frameTimer > 0.3) {
      f.frameTimer = 0;
      f.frame ^= 1;
    }
    if (!f.anim.moving) return;
    f.anim.t += dt;
    if (f.anim.t >= f.anim.duration) {
      f.x = f.anim.toX;
      f.y = f.anim.toY;
      f.anim.moving = false;
      f.anim.t = f.anim.duration;
    }
  };

  World.prototype.currentMap = function() {
    return window.PR_MAPS.MAPS[this.player.map];
  };

  World.prototype.tileAt = function(x, y) {
    const m = this.currentMap();
    return window.PR_MAPS.tileAt(m, x, y);
  };

  World.prototype.canWalk = function(x, y, dir) {
    const code = this.tileAt(x, y);
    const props = window.PR_MAPS.TILE_PROPS[code];
    if (!props) return false;
    if (props.walk === true) {
      return !this.npcBlockerAt(x, y);
    }
    if (props.walk === 'south' && dir === 'down') return !this.npcBlockerAt(x, y);
    // Water - walkable while surfing.
    if (code === 'W' && this.state.player.surfing) return !this.npcBlockerAt(x, y);
    return false;
  };

  World.prototype.npcAt = function(x, y) {
    const m = this.currentMap();
    if (!m.npcs) return null;
    for (const n of m.npcs) {
      // For a wandering NPC mid-step, count both the from-tile and the
      // destination-tile as "occupied" so collision and interaction
      // both feel right.
      const matches = (n.x === x && n.y === y)
        || (n.anim && n.anim.moving && n.anim.toX === x && n.anim.toY === y);
      if (!matches) continue;
      // Gate NPC vanishes once its conditions are met.
      if (n.gate && this.state.gateConditionsMet
          && this.state.gateConditionsMet(n.gate)) continue;
      return n;
    }
    return null;
  };

  // Door-adjacency helper. Returns true if any door tile (or edge
  // transition) in the current map is within Manhattan distance 2
  // of (x, y). Used to let the player squeeze past chatter NPCs
  // who happen to wander up to a doorway — without this, a baker
  // wandering near the mart entrance can lock the player out.
  World.prototype._isNearDoor = function(x, y) {
    const m = this.currentMap();
    if (m.doors) {
      for (const key in m.doors) {
        if (!Object.prototype.hasOwnProperty.call(m.doors, key)) continue;
        const i = key.indexOf(',');
        if (i < 0) continue;
        const dx = parseInt(key.slice(0, i), 10);
        const dy = parseInt(key.slice(i + 1), 10);
        if (Math.abs(dx - x) + Math.abs(dy - y) <= 2) return true;
      }
    }
    // Edge transition tiles count as doors too (so an NPC idling
    // next to a route exit doesn't trap the player on the city
    // side of the boundary).
    if (m.edges) {
      for (const side of Object.keys(m.edges)) {
        const e = m.edges[side];
        if (!e) continue;
        const ex = (side === 'east' || side === 'west') ? e.x : x;
        const ey = (side === 'north' || side === 'south') ? e.y : y;
        if (Math.abs(ex - x) + Math.abs(ey - y) <= 2) return true;
      }
    }
    return false;
  };

  // Like npcAt but returns null for NPCs the player should be allowed
  // to walk through. Only loitering chatter NPCs near a door are
  // pass-through; gate NPCs, trainers, healers, shopkeepers, starters
  // and ball pickups always block so the existing engagement and
  // gate-message flows still fire when the player tries to enter.
  World.prototype.npcBlockerAt = function(x, y) {
    const n = this.npcAt(x, y);
    if (!n) return null;
    if (n.gate) return n;
    if (n.trainer) return n;
    if (n.healer || n.shop || n.starter || n.ballSlot !== undefined) return n;
    if (this._isNearDoor(n.x, n.y)) return null;
    return n;
  };

  // True when the only walkable neighbour the player has is the one
  // currently occupied by `blocker`. Used by tryMove to allow swap-past
  // when the player would otherwise be trapped in a building pocket.
  World.prototype._playerEscapingThrough = function(blocker) {
    const p = this.player;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const ax = p.x + dx, ay = p.y + dy;
      if (ax === blocker.x && ay === blocker.y) continue;
      const code = this.tileAt(ax, ay);
      const props = window.PR_MAPS.TILE_PROPS[code];
      if (!props) continue;
      if (props.walk !== true && props.walk !== 'south') continue;
      if (this.npcBlockerAt(ax, ay)) continue;
      return false; // there's another open neighbour — not trapped
    }
    return true;
  };

  World.prototype.tryMove = function(dir) {
    if (this.anim.moving) return;
    const p = this.player;
    p.dir = dir;
    let nx = p.x, ny = p.y;
    if (dir === 'up') ny--;
    else if (dir === 'down') ny++;
    else if (dir === 'left') nx--;
    else if (dir === 'right') nx++;

    const code = this.tileAt(nx, ny);
    const props = window.PR_MAPS.TILE_PROPS[code];

    // Edge transition: either the destination tile is the X edge marker,
    // OR we walked off the side of the map onto an edge boundary even if
    // a path tile cuts through the X row.
    if (code === 'X' || this._atMapEdge(nx, ny)) {
      this.tryEdgeTransition(nx, ny);
      return;
    }

    const surfOK = (code === 'W' && this.state.player.surfing);
    if (!surfOK && (!props || (!props.walk && props.walk !== 'south'))) {
      this.frameTimer = 0; // bump
      window.PR_SFX && window.PR_SFX.play('bump');
      return;
    }
    if (!surfOK && props.walk === 'south' && dir !== 'down') return;
    // Auto-disembark when stepping from water onto land.
    if (this.state.player.surfing && code !== 'W') {
      this.state.player.surfing = false;
    }
    {
      const blocker = this.npcBlockerAt(nx, ny);
      if (blocker) {
        if (blocker.gate && this.state.gateConditionsMet
            && !this.state.gateConditionsMet(blocker.gate)
            && this.state.onSign) {
          const msg = blocker.gate.message;
          this.state.onSign(Array.isArray(msg) ? msg[0] : (msg || 'The way is blocked.'));
          return;
        }
        // Trap escape: if the only direction the player can step from
        // their current tile is *into* this NPC (every other neighbour
        // is non-walkable or blocked by another NPC), let them push
        // past — the NPC swaps to the player's tile so the player can
        // get out of the pocket. Gates / trainers / shop NPCs above
        // already returned, so this only applies to ordinary villagers
        // and story home characters.
        if (this._playerEscapingThrough(blocker)) {
          if (blocker.anim) blocker.anim.moving = false;
          blocker.x = p.x;
          blocker.y = p.y;
          // Face the NPC back the way the player came so the displacement
          // looks intentional rather than a bug.
          const opp = { up:'down', down:'up', left:'right', right:'left' };
          blocker.dir = opp[dir] || blocker.dir;
          this.startMove(p.x, p.y, nx, ny, 0.16);
          return;
        }
        return;
      }
    }

    // Ledge: jump 2 tiles south.
    if (code === 'L') {
      const after = this.tileAt(nx, ny + 1);
      const afterProps = window.PR_MAPS.TILE_PROPS[after];
      const canLand = !!afterProps && (
        afterProps.walk === true ||
        (after === 'W' && this.state.player.surfing)
      );
      if (canLand) {
        this.startMove(p.x, p.y, nx, ny + 1, 0.28);
        return;
      }
    }

    this.startMove(p.x, p.y, nx, ny, this.anim.duration);
  };

  World.prototype.startMove = function(fx, fy, tx, ty, dur) {
    this._startFollowerMove(fx, fy, dur || this.anim.duration);
    this.anim.moving = true;
    this.anim.fromX = fx; this.anim.fromY = fy;
    this.anim.toX = tx;   this.anim.toY = ty;
    this.anim.t = 0;
    this.anim.duration = dur || 0.16;
  };

  World.prototype._atMapEdge = function(nx, ny) {
    const m = this.currentMap();
    if (!m || !m.edges) return false;
    for (const side of Object.keys(m.edges)) {
      const e = m.edges[side];
      if (edgeMatches(side, e, nx, ny)) return true;
    }
    return false;
  };

  World.prototype.tryEdgeTransition = function(nx, ny) {
    const m = this.currentMap();
    if (!m.edges) return;
    for (const side of Object.keys(m.edges)) {
      const e = m.edges[side];
      if (edgeMatches(side, e, nx, ny)) {
        if (e.gate && this.state.gateConditionsMet
            && !this.state.gateConditionsMet(e.gate)) {
          const msg = e.gate.message || 'The way is blocked.';
          if (this.state.onSign) this.state.onSign(Array.isArray(msg) ? msg[0] : msg);
          else window.PR_SFX && window.PR_SFX.play('bump');
          return;
        }
        this.transitionTo(e.to, e.tx, e.ty);
        return;
      }
    }
  };

  function edgeMatches(side, e, nx, ny) {
    if (!e) return false;
    const ex = e.x !== undefined ? e.x : e.y;
    if (side === 'north') return ny <= e.y;
    if (side === 'south') return ny >= e.y;
    if (side === 'east')  return nx >= ex;
    if (side === 'west')  return nx <= ex;
    return false;
  }

  World.prototype.tryDoorAt = function(x, y) {
    const m = this.currentMap();
    if (!m.doors) return false;
    const key = x + ',' + y;
    const door = m.doors[key];
    if (!door) return false;
    this.transitionTo(door.to, door.x, door.y);
    return true;
  };

  World.prototype.transitionTo = function(mapId, x, y) {
    this.player.map = mapId;
    this.player.x = x;
    this.player.y = y;
    this.anim.moving = false;
    this.justEntered = true;
    this._initAmbient();
    this._initNpcWander();
    this._initBirds();
    this._resetFollower();
    // Reset biome particles so a forest's leaves don't drift into the
    // next desert; new biome will start spawning on the next tick.
    this._biomeParticles = [];
    this._biomeSpawnTimer = 0;
    this._rainParticles = [];
    this._rainSpawnTimer = 0;
    this._lightningTimer = 6 + Math.random() * 8;
    this._lightningFlash = 0;
    if (this.state.onMapChange) this.state.onMapChange();
    if (window.PR_GAME && window.PR_GAME.tickQuests) window.PR_GAME.tickQuests('mapchange');
    // Story system: a map entry is the most common encounter trigger.
    // Fires after the world state has settled so the cutscene NPC can
    // path on the new map.
    if (window.PR_STORY) {
      setTimeout(() => window.PR_STORY.emit(this.state, 'enter_map', { mapId }), 60);
    }
  };

  World.prototype.tryInteract = function() {
    const p = this.player;
    let ix = p.x, iy = p.y;
    if (p.dir === 'up') iy--;
    else if (p.dir === 'down') iy++;
    else if (p.dir === 'left') ix--;
    else if (p.dir === 'right') ix++;

    const npc = this.npcAt(ix, iy);
    if (npc) {
      // Snap a wandering NPC to a tile so dialog renders against a
      // grid-aligned sprite, and pause their pacing during the chat.
      if (npc.anim && npc.anim.moving) {
        npc.x = npc.anim.toX; npc.y = npc.anim.toY;
        npc.anim.moving = false; npc.anim.t = 0;
      }
      if (npc.wander) {
        npc._moveTimer = 0;
        npc._nextDelay = 2.0 + Math.random() * 2;
      }
      // Face the player.
      const opp = { up:'down', down:'up', left:'right', right:'left' };
      npc.dir = opp[p.dir] || npc.dir;
      this.state.onNpcInteract(npc);
      return true;
    }
    // Ambient creature on the facing tile (or its lerp destination).
    const amb = this._ambientAt && this._ambientAt(ix, iy, null);
    if (amb && this.state.onAmbient) {
      const opp2 = { up:'down', down:'up', left:'right', right:'left' };
      amb.dir = opp2[p.dir] || amb.dir;
      // Pause this ambient briefly so it stays put for the chat.
      amb.moveTimer = 0;
      amb.nextDelay = 1.5 + Math.random() * 1.5;
      this.state.onAmbient(amb);
      return true;
    }
    const m = this.currentMap();
    const code = this.tileAt(ix, iy);
    if (code === 'S' && m.signs) {
      const text = m.signs[ix + ',' + iy];
      if (text) { this.state.onSign(text); return true; }
    }
    if (code === 'H') {
      this.state.onHealer();
      return true;
    }
    // Water tile (A): cast a line. Surfing lives on B (trySurfToggle).
    // Without an OLD ROD the player gets a hint instead of silently
    // bumping the water.
    if (code === 'W' && !this.state.player.surfing) {
      const hasRod = !!(this.state.player.bag && this.state.player.bag.old_rod);
      if (hasRod && window.PR_GAME && window.PR_GAME.startFishing) {
        window.PR_GAME.startFishing();
        return true;
      }
      if (this.state.onSign) this.state.onSign('You need an OLD ROD to fish here.');
      return true;
    }
    // Hidden item at this tile?
    if (m.hidden && this.state.onHidden) {
      const key = ix + ',' + iy;
      const found = this.state.player && this.state.player.foundItems;
      const id = m.id + ':' + key;
      if (m.hidden[key] && !(found && found.has(id))) {
        this.state.onHidden(m.hidden[key], id);
        return true;
      }
    }
    return false;
  };

  // B-press surf toggle. From land facing water with a WATER ally, hop on.
  // While surfing, B hops back off onto adjacent land if available.
  // Separate from tryInteract (A press) so the water tile can host both
  // the fishing minigame (A) and the surf toggle (B).
  World.prototype.trySurfToggle = function() {
    const p = this.player;
    let ix = p.x, iy = p.y;
    if (p.dir === 'up') iy--;
    else if (p.dir === 'down') iy++;
    else if (p.dir === 'left') ix--;
    else if (p.dir === 'right') ix++;
    const facing = this.tileAt(ix, iy);
    if (p.surfing) {
      // Already on water: B steps back onto facing land tile if walkable.
      const props = window.PR_MAPS.TILE_PROPS[facing];
      if (props && props.walk === true && facing !== 'W') {
        p.surfing = false;
        if (this.state.showFlash) this.state.showFlash('Back on dry land.');
        if (window.PR_SFX) window.PR_SFX.play('confirm');
        return true;
      }
      return false;
    }
    if (facing !== 'W') return false;
    const hasWater = (this.state.party || []).some(m => {
      const sp = window.PR_DATA.CREATURES[m.species];
      return sp && sp.types && sp.types.includes('WATER');
    });
    if (!hasWater) {
      if (this.state.onSign) this.state.onSign('You need a WATER ally to surf.');
      return true;
    }
    p.surfing = true;
    if (this.state.showFlash) this.state.showFlash('Hopped onto the water!');
    if (window.PR_SFX) window.PR_SFX.play('confirm');
    return true;
  };

  World.prototype._ambientAt = function(x, y, exclude) {
    if (!this._ambient) this._ambient = [];
    for (const a of this._ambient) {
      if (a === exclude) continue;
      // Block both source and destination tiles while lerping.
      if ((a.x === x && a.y === y) ||
          (a.anim.moving && a.anim.toX === x && a.anim.toY === y)) return a;
    }
    return null;
  };

  World.prototype._isAmbientWalkable = function(x, y, a) {
    const code = this.tileAt(x, y);
    const props = window.PR_MAPS.TILE_PROPS[code];
    if (!props) return false;
    if (a && a.swim) {
      // Swimmers paddle only on water tiles, never on regular ground.
      // Water is currently keyed by name (TILE_PROPS['W'].name === 'water')
      // rather than a dedicated walk flag, so check the name string.
      if (!/water/i.test(props.name || '')) return false;
    } else {
      if (props.walk !== true) return false;
    }
    if (this.npcAt(x, y)) return false;
    if (this.player.x === x && this.player.y === y) return false;
    if (this.anim.moving && this.anim.toX === x && this.anim.toY === y) return false;
    if (this._ambientAt(x, y, a)) return false;
    return true;
  };

  World.prototype._updateAmbient = function(dt) {
    for (const a of this._ambient) {
      a.frameTimer += dt;
      if (a.frameTimer > 0.35) { a.frameTimer = 0; a.frame ^= 1; }
      if (a.anim.moving) {
        a.anim.t += dt;
        if (a.anim.t >= a.anim.duration) {
          a.x = a.anim.toX; a.y = a.anim.toY;
          a.anim.moving = false;
          a.moveTimer = 0;
          a.nextDelay = 1.5 + Math.random() * 2;
        }
        continue;
      }
      a.moveTimer += dt;
      if (a.moveTimer < a.nextDelay) continue;
      // Try a random cardinal step within range from home.
      const dirs = ['up','down','left','right'];
      // Shuffle so we don't bias direction.
      for (let i = dirs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = dirs[i]; dirs[i] = dirs[j]; dirs[j] = t;
      }
      let moved = false;
      for (const d of dirs) {
        let nx = a.x, ny = a.y;
        if (d === 'up') ny--;
        else if (d === 'down') ny++;
        else if (d === 'left') nx--;
        else if (d === 'right') nx++;
        if (Math.abs(nx - a.homeX) > a.range) continue;
        if (Math.abs(ny - a.homeY) > a.range) continue;
        if (!this._isAmbientWalkable(nx, ny, a)) continue;
        a.dir = d;
        a.anim.moving = true;
        a.anim.t = 0;
        a.anim.fromX = a.x; a.anim.fromY = a.y;
        a.anim.toX = nx;    a.anim.toY = ny;
        moved = true;
        break;
      }
      if (!moved) {
        // Idle - look around occasionally.
        a.dir = dirs[0];
        a.moveTimer = 0;
        a.nextDelay = 1.0 + Math.random() * 1.5;
      }
    }
  };

  World.prototype.update = function(dt) {
    this.frameTimer += dt;
    this.npcFrameTimer += dt;
    if (this.npcFrameTimer > 0.5) { this.npcFrameTimer = 0; this.npcFrame ^= 1; }
    if (this._ambient && this._ambient.length) {
      try { this._updateAmbient(dt); }
      catch (err) {
        console.error('[PokeRod] ambient tick error:', err);
        this._ambient = [];
      }
    }
    try { this._updateNpcWander(dt); }
    catch (err) { console.error('[PokeRod] npc wander tick error:', err); }
    try { this._updateBirds(dt); }
    catch (err) { console.error('[PokeRod] bird tick error:', err); }
    this._updateFollower(dt);

    if (this._dust && this._dust.length) tickDust(this._dust, dt);
    if (this._sweptGrass && this._sweptGrass.length) {
      for (let i = this._sweptGrass.length - 1; i >= 0; i--) {
        const s = this._sweptGrass[i];
        s.t -= dt;
        if (s.t <= 0) this._sweptGrass.splice(i, 1);
      }
    }
    // Biome ambient particles: tick existing, spawn at a low rate.
    // Active only in DS Diamond mode; reduced-motion users opt out.
    const dsActive = tiltActive() && !(window.PR_SETTINGS && window.PR_SETTINGS.reducedMotion);
    if (dsActive) {
      tickBiomeParticles(this._biomeParticles, dt);
      const cur = this.currentMap();
      const biome = biomeFor(cur);
      if (biome && !cur.interior) {
        this._biomeSpawnTimer -= dt;
        if (this._biomeSpawnTimer <= 0 && this._biomeParticles.length < 18) {
          const p = spawnBiomeParticle(biome, VIEW_W, VIEW_H, this.player.steps || 0);
          if (p) this._biomeParticles.push(p);
          this._biomeSpawnTimer = 0.15 + Math.random() * 0.25;
        }
      }
    } else if (this._biomeParticles.length) {
      // Snap to empty when the player toggles back to a non-DS preset.
      this._biomeParticles.length = 0;
    }
    // Weather tick. parseWeather() resolves 'medium-snow' / explicit
    // {kind, intensity, wind} / etc. into a normalised triple.
    // Particle spawn / lightning / overlay are all driven from there.
    // Reduced motion gates the entire system so the player can opt
    // out and the world stays calm.
    const cur2 = this.currentMap();
    const reducedM2 = window.PR_SETTINGS && window.PR_SETTINGS.reducedMotion;
    const tier = graphicsTier();
    const weather = (cur2 && !cur2.interior && !reducedM2) ? parseWeather(cur2.weather) : null;
    this._weather = weather;
    if (weather) {
      tickBiomeParticles(this._rainParticles, dt);
      const cap = Math.max(8, Math.floor(tierParticleCap(tier) * weather.intensity));
      const spawnInterval = (weather.kind === 'snow' ? 0.10 : 0.04) /
                            Math.max(0.05, weather.intensity * tierSpawnMul(tier));
      this._rainSpawnTimer -= dt;
      let spawnsThisFrame = 0;
      while (this._rainSpawnTimer <= 0 && this._rainParticles.length < cap && spawnsThisFrame < 6) {
        const p = spawnWeatherParticle(weather.kind, weather.intensity, VIEW_W, weather.wind);
        if (p) this._rainParticles.push(p);
        this._rainSpawnTimer += spawnInterval;
        spawnsThisFrame++;
      }
      // Lightning: rain (heavy) / thunder / hurricane fire. Frequency
      // scales on intensity.
      const wantsLightning = (weather.kind === 'thunder' ||
                              weather.kind === 'hurricane' ||
                              (weather.kind === 'rain' && weather.intensity >= 0.7));
      if (wantsLightning) {
        this._lightningTimer -= dt;
        if (this._lightningTimer <= 0) {
          this._lightningFlash = 1;
          // Thunder fires more often than heavy rain.
          const baseGap = (weather.kind === 'thunder') ? 2.5 : 6;
          const jitter  = (weather.kind === 'thunder') ? 4 : 9;
          this._lightningTimer = baseGap + Math.random() * jitter;
          if (window.PR_AUDIO && window.PR_AUDIO._internal && window.PR_AUDIO._internal.tone) {
            const A = window.PR_AUDIO._internal;
            const t = A.ctx ? A.ctx.currentTime : 0;
            A.tone(60, t,        0.18, { gain:0.18, type:'sawtooth', bend:0.3 });
            A.noiseBurst && A.noiseBurst(t + 0.05, 0.30, { gain:0.12, cutoff:1200 });
          }
        }
      }
      if (this._lightningFlash > 0) this._lightningFlash = Math.max(0, this._lightningFlash - dt * 4);
    } else if (this._rainParticles.length || this._lightningFlash > 0) {
      this._rainParticles.length = 0;
      this._lightningFlash = 0;
    }

    if (this.anim.moving) {
      this.anim.t += dt;
      const k = Math.min(1, this.anim.t / this.anim.duration);
      if (k >= 1) {
        const wasOnLedge = false;
        this.player.x = this.anim.toX;
        this.player.y = this.anim.toY;
        this.anim.moving = false;
        this.player.steps = (this.player.steps || 0) + 1;
        this.frame ^= 1;
        // Check for door / encounter / edge after step.
        const code = this.tileAt(this.player.x, this.player.y);
        // Footstep dust on dusty surfaces. Skipped when reduced motion
        // is on so we don't add unnecessary motion for that audience.
        const reducedM = window.PR_SETTINGS && window.PR_SETTINGS.reducedMotion;
        if (tiltActive() && !reducedM && isDustyTile(code)) {
          this._spawnDustAtPlayer();
        }
        // Reactive tallgrass: when the player lands on tallgrass, mark
        // the cell as "swept" for ~0.35s. The render layer draws a
        // small disturbance overlay until the timer expires.
        if (!reducedM && code === ':') {
          this._sweptGrass.push({ x: this.player.x, y: this.player.y, t: 0.35 });
          // Cap the swept list so a long walk doesn't accumulate.
          if (this._sweptGrass.length > 12) this._sweptGrass.splice(0, this._sweptGrass.length - 12);
        }
        if (code === 'X' || this._atMapEdge(this.player.x, this.player.y)) {
          this.tryEdgeTransition(this.player.x, this.player.y);
          return;
        }
        if (this.tryDoorAt(this.player.x, this.player.y)) return;

        const props = window.PR_MAPS.TILE_PROPS[code];
        if (props && props.encounter && this.encounterCooldown <= 0) {
          if (Math.random() < 0.12) {
            this.state.onWildEncounter();
          }
        }
        if (this.encounterCooldown > 0) this.encounterCooldown -= 1;
      }
      return;
    }

    // Read input for movement / interaction.
    const I = window.PR_INPUT;
    if (this.state.onPause && I.consumePressed('Enter')) {
      this.state.onPause();
      return;
    }
    if (I.consumePressed('z')) {
      if (this.tryInteract()) return;
    }
    if (I.consumePressed('x')) {
      if (this.trySurfToggle()) return;
    }
    const dir = I.dirHeld();
    if (dir) {
      this.tryMove(dir);
    }
  };

  // --- Rendering ---
  World.prototype.render = function(ctx) {
    const m = this.currentMap();
    const px = this.getPlayerPx();
    const targetCamX = Math.max(0, Math.min(m.tiles[0].length * TS - VIEW_W, px.x - VIEW_W/2 + TS/2));
    const targetCamY = Math.max(0, Math.min(m.tiles.length * TS - VIEW_H, px.y - VIEW_H/2 + TS/2));
    // Cinematic camera: lerp toward the target instead of snapping.
    // Tile rendering already handles fractional offsets, so the camera
    // can sit at sub-pixel positions and drift smoothly into place.
    // Bypassed for non-DS presets and reduced-motion users so retro
    // styles keep their tile-snapped look.
    const reducedM = window.PR_SETTINGS && window.PR_SETTINGS.reducedMotion;
    if (!tiltActive() || reducedM) {
      this._camX = targetCamX;
      this._camY = targetCamY;
    } else {
      if (this._camX === undefined) { this._camX = targetCamX; this._camY = targetCamY; }
      this._camX += (targetCamX - this._camX) * 0.22;
      this._camY += (targetCamY - this._camY) * 0.22;
    }
    const camX = this._camX;
    const camY = this._camY;

    // Clear to grass green rather than black so the 1-px gap that the
    // foliage sway leaves behind blends in instead of showing as a black
    // seam alongside trees and bushes.
    ctx.fillStyle = window.PR_UI.pf('#5cae4c');
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    const startTx = Math.floor(camX / TS);
    const startTy = Math.floor(camY / TS);
    const offX = -(camX - startTx * TS);
    const offY = -(camY - startTy * TS);

    for (let ty = 0; ty <= VIEW_TY; ty++) {
      for (let tx = 0; tx <= VIEW_TX; tx++) {
        const wx = startTx + tx, wy = startTy + ty;
        if (wy < 0 || wy >= m.tiles.length) continue;
        const row = m.tiles[wy];
        if (wx < 0 || wx >= row.length) continue;
        const code = row[wx];
        window.PR_TILES.drawTile(ctx, code, offX + tx*TS, offY + ty*TS, { map:m, tx:wx, ty:wy });
      }
    }

    // DS Diamond: cast a ground shadow at the base of every tall
    // tile (trees, buildings, fences, rocks). Drawn after the tile
    // pass so the shadow falls onto the next row's already-painted
    // ground without being clobbered.
    drawTallTileShadows(ctx, m, startTx, startTy, offX, offY, VIEW_TX, VIEW_TY, TS, this.player.steps || 0);

    // Building-base shadow strips: rectangular soft strip along the
    // south edge of every wall/roof/door/window/fence footprint. Runs
    // after tall-tile shadows so trees still puddle and only buildings
    // get the architectural strip projection.
    drawBuildingShadows(ctx, m, startTx, startTy, offX, offY, VIEW_TX, VIEW_TY, TS, this.player.steps || 0);

    // Snow caps along the tops of tall tiles in snow-biome maps.
    drawSnowCaps(ctx, m, startTx, startTy, offX, offY, VIEW_TX, VIEW_TY, TS);

    // Water reflections: flipped silhouettes of tall tiles directly
    // above any visible water tile. Drawn before the shimmer so the
    // sparkles sit on top of the reflection.
    drawWaterReflections(ctx, m, startTx, startTy, offX, offY, VIEW_TX, VIEW_TY, TS);

    // Animated water shimmer. Subtle 1-2 px sparkles cycling per
    // frame on water tiles; sells movement when the player isn't.
    drawWaterShimmer(ctx, m, startTx, startTy, offX, offY, VIEW_TX, VIEW_TY, TS);

    // Hidden item pulse: faint expanding ring around uncollected
    // hidden items so a careful player can spot them. Active on
    // exterior maps; interior caves still get them since they often
    // contain hidden items.
    drawHiddenPulses(ctx, m, camX, camY, VIEW_W, VIEW_H, this.player.steps || 0,
      this.state.player && this.state.player.foundItems);

    // Tallgrass disturbance: the cells the player just walked through
    // briefly show parted-blade marks. Drawn after tiles so the marks
    // sit on top of the grass texture, but before NPCs/player so a
    // sprite standing on a swept cell still occludes it.
    if (this._sweptGrass && this._sweptGrass.length) {
      drawSweptGrass(ctx, this._sweptGrass, camX, camY);
    }

    // Decoration layer: arbitrary atlas keys placed via
    // map.decorations = [{ x, y, key }]. Drawn between the tile pass
    // and the sprite layer so movable sprites occlude items they
    // walk past correctly. Soft shadow pass first so the shadow sits
    // under the decoration sprite, not on top.
    drawDecorationShadows(ctx, m, offX, offY, startTx, startTy, VIEW_TX, VIEW_TY, TS, this.player.steps || 0);
    if (m.decorations && window.PR_ATLAS && window.PR_ATLAS.isReady()) {
      const healAnim = this.state && this.state.healAnim;
      for (const d of m.decorations) {
        const sx = d.x * TS - camX;
        const sy = d.y * TS - camY;
        if (sx < -TS * 2 || sx > VIEW_W + TS || sy < -TS * 2 || sy > VIEW_H + TS) continue;
        let key = d.key;
        if (d.anim === 'pod' && healAnim) {
          if (healAnim.t >= healAnim.duration) {
            key = 'pod_healing_complete';
          } else {
            key = (Math.floor(healAnim.t * 6) & 1) ? 'pod_healing_glow1' : 'pod_healing_glow2';
          }
        }
        window.PR_ATLAS.drawKey(ctx, 'decor_' + key, sx, sy);
        if (d.anim === 'pod' && healAnim && healAnim.t < healAnim.duration) {
          const pulse = 0.45 + 0.35 * Math.sin(healAnim.t * 8);
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = pulse;
          const grd = ctx.createRadialGradient(sx + TS / 2, sy + TS / 2, 2, sx + TS / 2, sy + TS / 2, TS);
          grd.addColorStop(0, '#ffe8a0');
          grd.addColorStop(1, 'rgba(255,200,128,0)');
          ctx.fillStyle = window.PR_UI.pf(grd);
          ctx.fillRect(sx - TS / 2, sy - TS / 2, TS * 2, TS * 2);
          ctx.restore();
        }
      }
    }

    // Wildlife birds — perch on roofs/trees, occasionally fly.
    // Drawn after decorations / before ambient creatures so the
    // player walks in front of low-perched birds.
    this._renderBirds(ctx, camX, camY);

    // Ambient roaming creatures (drawn under NPCs/player).
    for (const a of this._ambient) {
      let ax = a.x, ay = a.y;
      if (a.anim.moving) {
        const k = Math.min(1, a.anim.t / a.anim.duration);
        ax = a.anim.fromX + (a.anim.toX - a.anim.fromX) * k;
        ay = a.anim.fromY + (a.anim.toY - a.anim.fromY) * k;
      }
      const sx = ax * TS - camX;
      const sy = ay * TS - camY;
      if (sx < -TS || sx > VIEW_W || sy < -TS || sy > VIEW_H) continue;
      const bob = a.anim.moving
        ? -Math.round(Math.sin(Math.min(1, a.anim.t / a.anim.duration) * Math.PI))
        : (a.frame ? -1 : 0);
      // Chickens use the NPC character pipeline (4 dirs × 2 frames)
      // instead of the creature renderer; ducks and swans are
      // procedurally drawn via PR_CHARS so they work in every era
      // without needing atlas frames; everything else falls through
      // to the existing PR_MONS.drawCreature path.
      if (a.species === 'chicken') {
        const sxC = sx + bob, syC = sy + bob;
        withTilt(ctx, sxC, syC, TS, TS, () => {
          window.PR_CHARS.drawNpc(ctx, sxC, syC, 'chicken', a.dir || 'down', a.frame || 0);
        });
      } else if (a.species === 'duck') {
        const sxC = sx + bob, syC = sy + bob;
        withTilt(ctx, sxC, syC, TS, TS, () => {
          window.PR_CHARS.drawDuck(ctx, sxC, syC, a.dir || 'down', a.frame || 0);
        });
      } else if (a.species === 'swan') {
        const sxC = sx + bob, syC = sy + bob;
        withTilt(ctx, sxC, syC, TS, TS, () => {
          window.PR_CHARS.drawSwan(ctx, sxC, syC, a.dir || 'down', a.frame || 0);
        });
      } else {
        const cdx = sx - 2, cdy = sy - 4 + bob;
        withTilt(ctx, cdx, cdy, 20, 20, () => {
          window.PR_MONS.drawCreature(ctx, a.species, cdx, cdy, 20, false);
        });
      }
    }

    // NPCs
    if (m.npcs) {
      for (const n of m.npcs) {
        let nx = n.x, ny = n.y;
        if (n.anim && n.anim.moving) {
          const k = Math.min(1, n.anim.t / n.anim.duration);
          nx = n.anim.fromX + (n.anim.toX - n.anim.fromX) * k;
          ny = n.anim.fromY + (n.anim.toY - n.anim.fromY) * k;
        }
        const sx = nx * TS - camX;
        const sy = ny * TS - camY;
        if (sx < -TS || sx > VIEW_W || sy < -TS || sy > VIEW_H) continue;
        if (n.sprite === 'ball') {
          // Hide ball if starter taken.
          if (this.state.flags.starterChosen && n.ballSlot !== undefined) continue;
        }
        withTilt(ctx, sx, sy, TS, TS, () => {
          window.PR_CHARS.drawNpc(ctx, sx, sy, n.sprite, n.dir, this.npcFrame);
        });
      }
    }

    // Cutscene NPC (story system) — drawn in the same pass so tilt and
    // outlines look identical to map-defined NPCs.
    const cs = this.state.cutscene;
    if (cs && cs.active && cs.npc) {
      const sx = cs.npc.x * TS - camX;
      const sy = cs.npc.y * TS - camY;
      if (sx > -TS - 8 && sx < VIEW_W + 8 && sy > -TS - 8 && sy < VIEW_H + 8) {
        withTilt(ctx, sx, sy, TS, TS, () => {
          window.PR_CHARS.drawNpc(ctx, sx, sy, cs.npc.sprite, cs.npc.dir, this.npcFrame);
        });
      }
    }

    const dogPx = this.getFollowerPx();
    if (dogPx && window.PR_CHARS && window.PR_CHARS.drawDog) {
      const f = this.follower;
      const sx = dogPx.x - camX;
      const sy = dogPx.y - camY;
      if (sx >= -TS && sx <= VIEW_W && sy >= -TS && sy <= VIEW_H) {
        let p = 0;
        if (f.anim.moving) p = Math.min(1, f.anim.t / f.anim.duration);
        const reduced = window.PR_SETTINGS && window.PR_SETTINGS.reducedMotion;
        const bob = f.anim.moving && !reduced ? -Math.round(Math.sin(p * Math.PI)) : (f.frame ? -1 : 0);
        const dogFrame = f.frame ^ (p > 0.5 ? 1 : 0);
        const dy = sy + bob;
        withTilt(ctx, sx, dy, TS, TS, () => {
          window.PR_CHARS.drawDog(ctx, sx, dy, f.dir, dogFrame);
        });
      }
    }

    // Player (with mid-step bob + half-step leg swap for a 4-pose walk).
    let bobY = 0, walkFrame = 0;
    if (this.anim.moving) {
      const p = Math.min(1, this.anim.t / this.anim.duration);
      const reduced = window.PR_SETTINGS && window.PR_SETTINGS.reducedMotion;
      bobY = reduced ? 0 : -Math.round(Math.sin(p * Math.PI));
      walkFrame = this.frame ^ (p > 0.5 ? 1 : 0);
    }
    {
      const psx = px.x - camX, psy = (px.y - camY) + bobY;
      withTilt(ctx, psx, psy, TS, TS, () => {
        window.PR_CHARS.drawPlayer(ctx, psx, psy, this.player.dir, walkFrame);
      });
    }

    // Foreground tall grass: paint a row of blades OVER any movable
    // sprite that's currently standing on a `:` tile so the sprite
    // looks like it's wading through. Player first, then ambient
    // creatures, then NPCs - any of which might be in tall grass.
    if (tiltActive()) {
      if (this.tileAt(this.player.x, this.player.y) === ':') {
        drawForegroundTallgrass(ctx, this.player.x, this.player.y, camX, camY);
      }
      for (const a of this._ambient) {
        if (this.tileAt(a.x, a.y) === ':') {
          drawForegroundTallgrass(ctx, a.x, a.y, camX, camY);
        }
      }
      if (m.npcs) {
        for (const n of m.npcs) {
          if (this.tileAt(n.x, n.y) === ':') {
            drawForegroundTallgrass(ctx, n.x, n.y, camX, camY);
          }
        }
      }
    }

    // Footstep dust under the player. Drawn before the day/night
    // tint so the dust gets darkened along with the rest of the
    // ground, reading like a particle and not a spark.
    if (this._dust && this._dust.length) drawDust(ctx, this._dust, camX, camY);

    // Smoothly interpolated day/night tint overlay. Skipped entirely
    // when the player has disabled the cycle in settings, in which
    // case the world stays at a flat noon look.
    const cur = this.currentMap();
    const cycleOn = !(window.PR_SETTINGS && window.PR_SETTINGS.dayNightCycle === false);
    if (cycleOn && (!cur || !cur.interior)) {
      const tint = currentTint(this.player.steps || 0);
      if (tint) {
        ctx.fillStyle = window.PR_UI.pf(tint);
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      }
    }

    // DS Diamond, night phase: lamp halos and lit windows. Drawn
    // AFTER the day/night tint so the additive glows lift the
    // darkened image, mimicking how lamps pierce the gloom.
    if (cur && !cur.interior && cycleOn) {
      drawNightLights(ctx, m, startTx, startTy, offX, offY, VIEW_TX, VIEW_TY, TS, this.player.steps || 0);
    }

    // Player lantern: warm cone around the player at night. Drawn
    // alongside the lamp halos so the player has their own portable
    // light source.
    if (cur && !cur.interior && cycleOn) {
      drawPlayerLantern(ctx, px.x - camX + TS / 2, px.y - camY + TS / 2, this.player.steps || 0);
    }

    // God-ray shafts at dawn/dusk: thin diagonal beams down-left from
    // the tops of tall tiles. Cinematic accent for the warm bands of
    // the day/night cycle.
    if (cur && !cur.interior && cycleOn) {
      drawGodRays(ctx, m, startTx, startTy, offX, offY, VIEW_TX, VIEW_TY, TS, this.player.steps || 0);
    }

    // Heat shimmer for desert maps during the day band. Skipped at
    // night and on non-desert maps.
    if (cur && !cur.interior && cycleOn) {
      drawHeatShimmer(ctx, m, VIEW_W, VIEW_H, this.player.steps || 0);
    }

    // Cinematic colour grade: warm-on-top / cool-on-bottom split tone
    // applied during the dawn / dusk bands. Skipped at noon to keep
    // the daytime look bright.
    if (cycleOn) drawColorGrade(ctx, VIEW_W, VIEW_H, this.player.steps || 0);

    // Biome ambient particles. Drawn after night lights so leaves
    // catch the warm glow of nearby lamps, but before the vignette
    // and HUD so the corner darkening still frames everything.
    if (this._biomeParticles && this._biomeParticles.length) {
      drawBiomeParticles(ctx, this._biomeParticles, graphicsTier());
    }

    // Weather: full-screen overlay first (overcast dim, tornado funnel,
    // hurricane sweep), then particles (rain / snow / sleet / hail /
    // debris) on top. Drawn before vignette + HUD.
    if (this._weather) {
      drawWeatherOverlay(ctx, this._weather, VIEW_W, VIEW_H, graphicsTier());
    }
    if (this._rainParticles && this._rainParticles.length) {
      drawBiomeParticles(ctx, this._rainParticles, graphicsTier());
    }

    // Lightning flash: brief screen-wide white tint that fades over
    // ~0.25s. Only fires on rainy maps.
    if (this._lightningFlash > 0) {
      ctx.fillStyle = window.PR_UI.pf('rgba(255,255,240,' + (0.55 * this._lightningFlash).toFixed(3) + ')');
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    // Tilt-shift band blur: blurs the top and bottom 36 px of the
    // canvas to suggest depth-of-field. Drawn before vignette so the
    // vignette darkens the (now-blurred) edges further.
    if (cur && !cur.interior) drawTiltShift(ctx, VIEW_W, VIEW_H);

    // DS Diamond: subtle vignette over the whole world frame (the
    // minimap, clock and banner are drawn after this so they stay
    // readable).
    if (cur && !cur.interior) drawVignette(ctx, VIEW_W, VIEW_H);

    // Minimap pip (small overview top-left). Hidden in DS Diamond
    // because the bottom screen already shows the same minimap.
    if (!cur.interior && !tiltActive()) drawMinimap(ctx, cur, this.player.x, this.player.y);

    // In-game clock (top-right). The phase icon sits inside the same
    // top-right cluster (drawn by drawWorldClock) so the player reads
    // them as a single time indicator. In DS Diamond mode the bottom
    // screen already displays the time + phase, so we skip the
    // top-screen overlay to keep the world view clean.
    if (!tiltActive()) drawWorldClock(ctx, VIEW_W, this.player.steps || 0);

    // Map name banner on entry.
    if (this.justEntered) {
      this.bannerTimer = 1.6;
      this.bannerName = m.name;
      this.justEntered = false;
    }
    if (this.bannerTimer > 0) {
      this.bannerTimer -= 1/60;
      const label = String(this.bannerName || '');
      const w = Math.min(VIEW_W - 20, Math.max(116, label.length * 6 + 42));
      // Animated slide-in / slide-out: ease the banner Y offset from
      // above the screen down into place over the first 0.3s, hold,
      // then ease back up out of view in the final 0.3s. Reduced-
      // motion users get an instant pop instead.
      const reducedB = window.PR_SETTINGS && window.PR_SETTINGS.reducedMotion;
      const elapsed = 1.6 - this.bannerTimer;
      let yOffset = 0;
      if (!reducedB && tiltActive()) {
        if (elapsed < 0.3) {
          const k = elapsed / 0.3;
          // ease-out cubic: faster at start, settles at end
          const e = 1 - Math.pow(1 - k, 3);
          yOffset = -42 * (1 - e);
        } else if (this.bannerTimer < 0.3) {
          const k = this.bannerTimer / 0.3;
          const e = Math.pow(k, 3); // ease-in cubic
          yOffset = -42 * (1 - e);
        }
      }
      const x = (VIEW_W - w) / 2 | 0, y = 8 + yOffset, h = 30;
      window.PR_UI.panel(ctx, x, y, w, h, {
        fill:'#fff8e8', border:'#202020', shadow:'#b0702c', highlight:'#fff8f0'
      });
      window.PR_UI.header(ctx, 'NOW ENTERING', x + 4, y + 4, w - 8, {
        fill:'#1a0204', line:'#f0c020', text:'#f0c020'
      });
      ctx.fillStyle = window.PR_UI.pf('#e83838');
      ctx.fillRect(x + 8, y + 19, 5, 5);
      ctx.fillStyle = window.PR_UI.pf('#fff8e8');
      ctx.fillRect(x + 10, y + 20, 1, 3);
      window.PR_UI.drawText(ctx, label.slice(0, Math.floor((w - 24) / 6)), x + 17, y + 19, '#202020');
    }
  };

  World.prototype.getPlayerPx = function() {
    const p = this.player;
    if (this.anim.moving) {
      const k = Math.min(1, this.anim.t / this.anim.duration);
      const fx = this.anim.fromX + (this.anim.toX - this.anim.fromX) * k;
      const fy = this.anim.fromY + (this.anim.toY - this.anim.fromY) * k;
      return { x: fx * TS, y: fy * TS };
    }
    return { x: p.x * TS, y: p.y * TS };
  };

  World.prototype.getFollowerPx = function() {
    const f = this.follower;
    if (!f) return null;
    if (f.anim.moving) {
      const k = Math.min(1, f.anim.t / f.anim.duration);
      const fx = f.anim.fromX + (f.anim.toX - f.anim.fromX) * k;
      const fy = f.anim.fromY + (f.anim.toY - f.anim.fromY) * k;
      return { x: fx * TS, y: fy * TS };
    }
    return { x: f.x * TS, y: f.y * TS };
  };

  window.PR_WORLD = { World };
  window.PR_HUD = { drawMinimap, drawWorldClock, drawPhaseIcon, miniColorFor, phaseForSteps, clockHM };
})();
