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
    { at:80,  name:'dusk',  r:240, g:140, b:40,  a:0.20 },
    { at:160, name:'night', r:20,  g:30,  b:80,  a:0.40 },
    { at:240, name:'dawn',  r:255, g:180, b:140, a:0.18 }
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
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  function drawPhaseIcon(ctx, x, y, phaseName) {
    const W = 18, H = 16;
    // Backdrop + gold border, matching the clock chip.
    ctx.fillStyle = 'rgba(20,16,12,0.7)';
    ctx.fillRect(x, y, W, H);
    ctx.fillStyle = '#f0c020';
    ctx.fillRect(x, y, W, 1);
    ctx.fillRect(x, y + H - 1, W, 1);
    ctx.fillRect(x, y, 1, H);
    ctx.fillRect(x + W - 1, y, 1, H);
    const cx = x + 9, cy = y + 8;
    if (phaseName === 'day') {
      fillCirclePixel(ctx, cx, cy, 3, '#f8d030');
      ctx.fillStyle = '#f8d030';
      ctx.fillRect(cx - 1, y + 2, 2, 1);     // top ray
      ctx.fillRect(cx - 1, y + H - 3, 2, 1); // bottom ray
      ctx.fillRect(x + 2, cy - 1, 1, 2);     // left ray
      ctx.fillRect(x + W - 3, cy - 1, 1, 2); // right ray
    } else if (phaseName === 'night') {
      fillCirclePixel(ctx, cx, cy, 4, '#e0e0f0');
      // bite the moon to make a crescent
      ctx.fillStyle = 'rgba(20,16,12,0.95)';
      ctx.beginPath();
      ctx.arc(cx + 2, cy - 1, 3, 0, Math.PI * 2);
      ctx.fill();
      // a couple of stars
      ctx.fillStyle = '#fff';
      ctx.fillRect(x + 3, y + 4, 1, 1);
      ctx.fillRect(x + W - 4, y + H - 5, 1, 1);
    } else if (phaseName === 'dusk' || phaseName === 'dawn') {
      // Half-disc rising/setting over a dark horizon line.
      const sun = phaseName === 'dusk' ? '#f08030' : '#f8a8a8';
      ctx.fillStyle = sun;
      ctx.fillRect(cx - 3, cy - 1, 7, 4);
      ctx.fillStyle = '#a04030';
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
    ctx.fillStyle = 'rgba(20,16,12,0.55)';
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = '#f0c020';
    ctx.fillRect(x - 1, y - 1, w + 2, 1);
    ctx.fillRect(x - 1, y + h, w + 2, 1);
    ctx.fillRect(x - 1, y - 1, 1, h + 2);
    ctx.fillRect(x + w, y - 1, 1, h + 2);
    for (let ry = 0; ry < rows; ry++) {
      const row = m.tiles[ry];
      for (let rx = 0; rx < cols; rx++) {
        ctx.fillStyle = miniColorFor(row[rx]);
        ctx.fillRect(x + rx * cell, y + ry * cell, cell, cell);
      }
    }
    // Player pip blink. 2x2 square with a 1px highlight to stay visible
    // against any background tile.
    const blink = (Math.floor(performance.now() / 250) & 1);
    if (blink) {
      ctx.fillStyle = '#ffd060';
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
  // Soft elliptical drop shadow with a radial-gradient falloff so the
  // shadow has a dark centre and feathers out to nothing at the edge.
  // Saving + scaling lets us reuse the radial-gradient API for an
  // ellipse without a separate ellipse gradient API.
  function drawShadow(ctx, cx, by, w, opts) {
    opts = opts || {};
    const r = Math.max(2, w * (opts.rxScale || 0.42));
    const ry = Math.max(2, w * (opts.ryScale || 0.14));
    const cAlpha = opts.centerAlpha != null ? opts.centerAlpha : 0.45;
    const colorBase = opts.color || '0,0,0';
    const grad = ctx.createRadialGradient(cx, by, 0, cx, by, r);
    grad.addColorStop(0, 'rgba(' + colorBase + ',' + cAlpha + ')');
    grad.addColorStop(0.65, 'rgba(' + colorBase + ',' + (cAlpha * 0.4) + ')');
    grad.addColorStop(1, 'rgba(' + colorBase + ',0)');
    ctx.save();
    ctx.translate(cx, by);
    ctx.scale(1, ry / r);
    ctx.translate(-cx, -by);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, by, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Shadow-only billboard tilt: PR #8 dropped the vertical squash
  // because the canvas Y scale interpolated against the red level-tuft
  // pixels baked into atlas frames and produced pink artifacts at the
  // sprite base. The drop shadow alone keeps the 2.5D 'grounded' feel.
  function withTilt(ctx, sx, sy, sw, sh, draw) {
    if (!tiltActive()) { draw(); return; }
    drawShadow(ctx, sx + sw / 2, sy + sh - 1, sw);
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
  // The tile only casts a ground shadow if the cell directly below it
  // is walkable - that is, the shadow lands on real ground, not on the
  // wall of the same building. Roofs and second-row walls sit on top
  // of other blockers so they pass this test as 'no shadow', leaving
  // only the bottom-most blocker of any structure to cast onto the
  // path. Trees / rocks / fences with grass below still cast normally.
  function tileShouldCastShadow(map, x, y) {
    if (!isTallTile(map.tiles[y][x])) return false;
    if (y + 1 >= map.tiles.length) return false;
    const belowRow = map.tiles[y + 1];
    if (!belowRow || x >= belowRow.length) return false;
    const below = belowRow[x];
    const props = window.PR_MAPS && window.PR_MAPS.TILE_PROPS && window.PR_MAPS.TILE_PROPS[below];
    return !!(props && props.walk);
  }
  // Per-phase shadow tint: warm at sunset, cool at midnight, neutral
  // at noon. Reads as the sun shifting through the sky.
  function phaseShadowOpts(steps) {
    const t = (((steps % CYCLE_STEPS) + CYCLE_STEPS) % CYCLE_STEPS);
    let opts = { rxScale: 0.42, ryScale: 0.13, centerAlpha: 0.32, color: '0,0,0' };
    // dusk band (60..100): warm
    if (t > 60 && t < 100) opts.color = '40,10,30';
    // night (140..180): cool
    else if (t > 140 && t < 180) opts.color = '10,16,40';
    // dawn (220..260): warm-ish
    else if (t > 220 && t < 260) opts.color = '40,16,30';
    return opts;
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
    ctx.fillStyle = grad;
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
  // glow lifts darkened tiles instead of just colour-blending.
  function drawGlow(ctx, cx, cy, radius, color, alpha) {
    if (alpha <= 0) return;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, color);
    grad.addColorStop(0.6, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = grad;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    ctx.restore();
  }
  // Draws lamp halos and window-light squares for visible tiles.
  // Active only when tilt is active AND it's nighttime. Drawn AFTER
  // the day/night tint so glows can lift the darkened image.
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
        const cx = offX + tx * TS + TS / 2;
        const cy = offY + ty * TS + TS / 2;
        if (code === '|' || code === 'I') {
          // Streetlamp: tall halo from the head of the lamp downward.
          drawGlow(ctx, cx, cy - 4, TS * 1.4, 'rgba(255,224,128,1)', 0.55 * nFactor);
        } else if (code === '[' || code === ']') {
          // Window: small halo + lit interior square.
          drawGlow(ctx, cx, cy + 4, TS * 0.7, 'rgba(255,232,144,1)', 0.45 * nFactor);
        }
      }
    }
    ctx.restore();
    // Lit-window square uses normal compositing so it shows as a solid
    // golden pane rather than a pure additive bloom.
    if (nFactor < 0.1) return;
    ctx.save();
    ctx.fillStyle = 'rgba(255,232,144,' + (0.45 * nFactor).toFixed(3) + ')';
    for (let ty = 0; ty <= viewTy; ty++) {
      for (let tx = 0; tx <= viewTx; tx++) {
        const wx = startTx + tx, wy = startTy + ty;
        if (wy < 0 || wy >= m.tiles.length) continue;
        const row = m.tiles[wy];
        if (wx < 0 || wx >= row.length) continue;
        const code = row[wx];
        if (code === '[' || code === ']') {
          ctx.fillRect(offX + tx * TS + 6, offY + ty * TS + 8, TS - 12, TS - 18);
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
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
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
    ctx.fillStyle = grad;
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
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,228,160,' + (0.10 * peak).toFixed(3) + ')';
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
        // Two thin parallelograms drifting down-left.
        for (let r = 0; r < 2; r++) {
          const off = r * 8;
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
    ctx.fillStyle = 'rgba(255,240,200,0.14)';
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
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
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
      ctx.strokeStyle = 'rgba(248,224,144,' + alpha.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  // Water reflections: for each visible W tile, look at the tile
  // directly above; if it's tall, draw a vertically-flipped low-alpha
  // copy of it into the water cell so the structure 'reflects' on
  // the surface. Cheapest possible reflection without atlas regen.
  function drawWaterReflections(ctx, m, startTx, startTy, offX, offY, viewTx, viewTy, TS) {
    if (!tiltActive()) return;
    if (!window.PR_ATLAS || !window.PR_ATLAS.isReady()) return;
    const phaseOffset = Math.sin(performance.now() / 600) * 1; // gentle ripple
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
        // Paint the tile-above into the flipped frame. drawTileCode
        // returns false if the atlas has no entry for this code, in
        // which case nothing renders.
        window.PR_ATLAS.drawTileCode(ctx, above, 0, 0, { map:m, tx:wx, ty:wy - 1 });
        ctx.restore();
      }
    }
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
  // Rain particles: slanted streaks falling from off-screen-top to
  // off-screen-bottom. Rendered via drawBiomeParticles' fog-vs-pixel
  // dispatch, so they share the same particle pool.
  function spawnRainParticle(viewW) {
    return {
      kind: 'rain',
      x: Math.random() * (viewW + 80) - 40,
      y: -12,
      vx: -40,
      vy: 280,
      life: 0.9,
      maxLife: 0.9,
      color: 'rgba(180,210,240,0.55)',
      size: 1,
      spin: 0
    };
  }
  // Footstep dust particles: fade out over time, drift slightly upward.
  // Spawned by World.prototype._spawnDust on step completion when the
  // player lands on a dusty tile (sand, dirt path, gravel). Drawn
  // before the day/night tint so they read like ground particles, not
  // sparks.
  function isDustyTile(code) {
    const props = window.PR_MAPS && window.PR_MAPS.TILE_PROPS && window.PR_MAPS.TILE_PROPS[code];
    if (!props || !props.walk) return false;
    const n = props.name || '';
    return n === 'sand' || n.indexOf('path') >= 0;
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
      ctx.fillStyle = 'rgba(216,184,120,' + (0.55 * k).toFixed(3) + ')';
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
      ctx.fillStyle = 'rgba(168,232,128,' + (0.9 * k).toFixed(3) + ')';
      // Two angled slashes flanking the centre, suggesting parted blades.
      ctx.fillRect((cx - 6) | 0, (cy - 1) | 0, 4, 1);
      ctx.fillRect((cx + 2) | 0, (cy - 1) | 0, 4, 1);
      ctx.fillRect((cx - 5) | 0, (cy)     | 0, 3, 1);
      ctx.fillRect((cx + 3) | 0, (cy)     | 0, 3, 1);
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
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.spin) p.x += Math.sin(p.life * 4) * p.spin;
      if (p.life <= 0 || p.x < -20 || p.x > VIEW_W + 20 || p.y > VIEW_H + 20 || p.y < -40) {
        particles.splice(i, 1);
      }
    }
  }
  function drawBiomeParticles(ctx, particles) {
    for (const p of particles) {
      const k = Math.min(1, p.life / p.maxLife);
      // Fade tail-end so particles disappear gracefully near the edges.
      const fade = k > 0.9 ? (1 - (k - 0.9) / 0.1) : (k < 0.2 ? k / 0.2 : 1);
      ctx.save();
      if (p.kind === 'fog') {
        // Soft radial fog blob: low alpha, gradient falloff.
        const rad = p.size;
        const alpha = 0.16 * fade;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
        grad.addColorStop(0, 'rgba(220,224,232,' + alpha.toFixed(3) + ')');
        grad.addColorStop(1, 'rgba(220,224,232,0)');
        ctx.fillStyle = grad;
        ctx.fillRect((p.x - rad) | 0, (p.y - rad) | 0, (rad * 2) | 0, (rad * 2) | 0);
      } else if (p.kind === 'rain') {
        // Diagonal 1-px streak from current position back along the
        // velocity direction. ~6 px tail for visible motion blur.
        ctx.globalAlpha = fade;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + 0.6, p.y - 5);
        ctx.stroke();
      } else {
        ctx.globalAlpha = fade;
        ctx.fillStyle = p.color;
        ctx.fillRect((p.x - p.size) | 0, (p.y - p.size) | 0, p.size * 2, p.size * 2);
      }
      ctx.restore();
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
        dir: 'down',
        anim: { moving:false, t:0, duration:0.4, fromX:a.x, fromY:a.y, toX:a.x, toY:a.y },
        moveTimer: Math.random() * 2,
        nextDelay: 1.5 + Math.random() * 2,
        frame: 0, frameTimer: 0
      });
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
      return !this.npcAt(x, y);
    }
    if (props.walk === 'south' && dir === 'down') return !this.npcAt(x, y);
    // Water - walkable while surfing.
    if (code === 'W' && this.state.player.surfing) return !this.npcAt(x, y);
    return false;
  };

  World.prototype.npcAt = function(x, y) {
    const m = this.currentMap();
    if (!m.npcs) return null;
    for (const n of m.npcs) {
      if (n.x !== x || n.y !== y) continue;
      // Gate NPC vanishes once its conditions are met.
      if (n.gate && this.state.gateConditionsMet
          && this.state.gateConditionsMet(n.gate)) continue;
      return n;
    }
    return null;
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
      const blocker = this.npcAt(nx, ny);
      if (blocker) {
        if (blocker.gate && this.state.gateConditionsMet
            && !this.state.gateConditionsMet(blocker.gate)
            && this.state.onSign) {
          const msg = blocker.gate.message;
          this.state.onSign(Array.isArray(msg) ? msg[0] : (msg || 'The way is blocked.'));
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
    // Water tile: surf toggle if you have a WATER-type ally.
    if (code === 'W' && !this.state.player.surfing) {
      const hasWater = (this.state.party || []).some(m => {
        const sp = window.PR_DATA.CREATURES[m.species];
        return sp && sp.types && sp.types.includes('WATER');
      });
      if (hasWater) {
        this.state.player.surfing = true;
        if (this.state.showFlash) this.state.showFlash('Hopped onto the water!');
        if (window.PR_SFX) window.PR_SFX.play('confirm');
        return true;
      } else {
        if (this.state.onSign) this.state.onSign('You need a WATER ally to surf.');
        return true;
      }
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
    if (!props || props.walk !== true) return false;
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
    // Weather tick: rain particles + periodic lightning flash. Map's
    // `weather` property opts a map into the weather system; only
    // 'rain' is supported for now. Lightning is part of the rain
    // package - flash + audio cue every 6-14s.
    const cur2 = this.currentMap();
    const rainy = dsActive && cur2 && cur2.weather === 'rain' && !cur2.interior;
    if (rainy) {
      tickBiomeParticles(this._rainParticles, dt);
      this._rainSpawnTimer -= dt;
      while (this._rainSpawnTimer <= 0 && this._rainParticles.length < 80) {
        this._rainParticles.push(spawnRainParticle(VIEW_W));
        this._rainSpawnTimer += 0.04;
      }
      this._lightningTimer -= dt;
      if (this._lightningTimer <= 0) {
        this._lightningFlash = 1;
        this._lightningTimer = 6 + Math.random() * 9;
        if (window.PR_AUDIO && window.PR_AUDIO._internal && window.PR_AUDIO._internal.tone) {
          const A = window.PR_AUDIO._internal;
          const t = A.ctx ? A.ctx.currentTime : 0;
          A.tone(60, t,        0.18, { gain:0.18, type:'sawtooth', bend:0.3 });
          A.noiseBurst && A.noiseBurst(t + 0.05, 0.30, { gain:0.12, cutoff:1200 });
        }
      }
      if (this._lightningFlash > 0) this._lightningFlash = Math.max(0, this._lightningFlash - dt * 4);
    } else if (this._rainParticles.length) {
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
    ctx.fillStyle = '#5cae4c';
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
      const cdx = sx - 2, cdy = sy - 4 + bob;
      withTilt(ctx, cdx, cdy, 20, 20, () => {
        window.PR_MONS.drawCreature(ctx, a.species, cdx, cdy, 20, false);
      });
    }

    // NPCs
    if (m.npcs) {
      for (const n of m.npcs) {
        const sx = n.x * TS - camX;
        const sy = n.y * TS - camY;
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
        ctx.fillStyle = tint;
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
      drawBiomeParticles(ctx, this._biomeParticles);
    }

    // Rain streaks (active only when current map opts in via
    // weather:'rain'). Drawn over biome particles so falling rain
    // sits in front of fog blobs.
    if (this._rainParticles && this._rainParticles.length) {
      drawBiomeParticles(ctx, this._rainParticles);
    }

    // Lightning flash: brief screen-wide white tint that fades over
    // ~0.25s. Only fires on rainy maps.
    if (this._lightningFlash > 0) {
      ctx.fillStyle = 'rgba(255,255,240,' + (0.55 * this._lightningFlash).toFixed(3) + ')';
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

    // Minimap pip (small overview top-left).
    if (!cur.interior) drawMinimap(ctx, cur, this.player.x, this.player.y);

    // In-game clock (top-right). The phase icon now sits inside the
    // same top-right cluster (drawn by drawWorldClock) so the player
    // reads them as a single time indicator. Always shown in the
    // overworld so the time is visible even with the cycle disabled.
    drawWorldClock(ctx, VIEW_W, this.player.steps || 0);

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
      ctx.fillStyle = '#e83838';
      ctx.fillRect(x + 8, y + 19, 5, 5);
      ctx.fillStyle = '#fff8e8';
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
})();
