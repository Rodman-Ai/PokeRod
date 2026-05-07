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
    // chip() auto-sizes from text width; place top-right with a 4px
    // margin so it sits clear of the screen edge and the entry banner.
    const textW = window.PR_UI.textWidth(text);
    const w = Math.max(18, textW + 8);
    const x = viewW - w - 4;
    const y = 4;
    window.PR_UI.chip(ctx, x, y, text, {
      fill:'#1a0204', border:'#f0c020', text:'#f0c020'
    });
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
    const grad = ctx.createRadialGradient(cx, by, 0, cx, by, r);
    grad.addColorStop(0, 'rgba(0,0,0,' + cAlpha + ')');
    grad.addColorStop(0.65, 'rgba(0,0,0,' + (cAlpha * 0.4) + ')');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
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
  function drawTallTileShadows(ctx, m, startTx, startTy, offX, offY, viewTx, viewTy, TS) {
    if (!tiltActive()) return;
    for (let ty = 0; ty <= viewTy; ty++) {
      for (let tx = 0; tx <= viewTx; tx++) {
        const wx = startTx + tx, wy = startTy + ty;
        if (wy < 0 || wy >= m.tiles.length) continue;
        const row = m.tiles[wy];
        if (wx < 0 || wx >= row.length) continue;
        if (!isTallTile(row[wx])) continue;
        const cx = offX + tx * TS + TS / 2;
        // Anchor the cast shadow at the bottom of the cell, slightly
        // inside so it doesn't drift onto the next row's painted
        // ground.
        const by = offY + ty * TS + TS - 3;
        drawShadow(ctx, cx, by, TS, { rxScale: 0.42, ryScale: 0.13, centerAlpha: 0.32 });
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
    const camX = Math.max(0, Math.min(m.tiles[0].length * TS - VIEW_W, px.x - VIEW_W/2 + TS/2));
    const camY = Math.max(0, Math.min(m.tiles.length * TS - VIEW_H, px.y - VIEW_H/2 + TS/2));

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
    drawTallTileShadows(ctx, m, startTx, startTy, offX, offY, VIEW_TX, VIEW_TY, TS);

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

    // DS Diamond: subtle vignette over the whole world frame (the
    // minimap, clock and banner are drawn after this so they stay
    // readable).
    if (cur && !cur.interior) drawVignette(ctx, VIEW_W, VIEW_H);

    // Minimap pip (small overview top-left).
    if (!cur.interior) drawMinimap(ctx, cur, this.player.x, this.player.y);

    // In-game clock (top-right). Always shown in the overworld so the
    // player can read the time even if the cycle is visually disabled.
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
      const x = (VIEW_W - w) / 2 | 0, y = 8, h = 30;
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
