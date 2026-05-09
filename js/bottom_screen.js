// DS Diamond bottom-screen renderer.
// Renders a Pokétch-style HUD on a second canvas (#game-bottom):
// minimap mirror, in-game clock, party HP pills, badge dots.
// In battle, swaps to a 4-move grid (with type chips and PP) plus a
// CANCEL button so the player can tap a move directly.
// Only draws when graphics === 'ds_diamond'; bails out otherwise so
// the canvas stays untouched (CSS hides it in non-DS modes anyway).
'use strict';

(function () {
  const W = 240, H = 120;          // logical canvas (480x240 @ scale(2,2))
  const PILL_COUNT = 6;
  const PILL_W = 36, PILL_H = 40;
  const PILL_GAP = 4;
  const PILL_ROW_Y = H - PILL_H - 4;

  // Battle layout — 2x2 move grid + cancel button.
  const MOVE_TILE_W = 110, MOVE_TILE_H = 36;
  const MOVE_GAP_X = 6, MOVE_GAP_Y = 4;
  const MOVE_GRID_X = (W - (MOVE_TILE_W * 2 + MOVE_GAP_X)) / 2 | 0;
  const MOVE_GRID_Y = 14;
  const CANCEL_W = 72, CANCEL_H = 14;
  const CANCEL_X = (W - CANCEL_W) / 2 | 0;
  const CANCEL_Y = H - CANCEL_H - 4;

  // Per-type chip palettes — match common gen-3 colors.
  const TYPE_COLORS = {
    NORMAL:   ['#a8a878','#7e7e58'],
    FIRE:     ['#f08030','#9c531f'],
    WATER:    ['#6890f0','#445e9c'],
    ELECTRIC: ['#f8d030','#a89020'],
    GRASS:    ['#78c850','#4e8234'],
    ICE:      ['#98d8d8','#638d8d'],
    FIGHTING: ['#c03028','#7d1f1a'],
    POISON:   ['#a040a0','#682a68'],
    GROUND:   ['#e0c068','#927d44'],
    FLYING:   ['#a890f0','#6d5e9c'],
    PSYCHIC:  ['#f85888','#a13959'],
    BUG:      ['#a8b820','#6d7815'],
    ROCK:     ['#b8a038','#786824'],
    GHOST:    ['#705898','#493963'],
    DRAGON:   ['#7038f8','#4924a1'],
    DARK:     ['#705848','#49392f'],
    STEEL:    ['#b8b8d0','#787887'],
    FAIRY:    ['#ee99ac','#9b6470']
  };

  let canvasEl = null;
  let ctxBottom = null;
  let scaled = false;
  let inputAttached = false;
  // Hit-zones populated each frame by render(); read by the tap
  // handler so we don't recompute layout on input.
  const hitZones = [];
  let lastTapAt = 0;
  let pressedTile = null;
  let pressTimer = 0;

  function getCtx() {
    if (ctxBottom) return ctxBottom;
    canvasEl = document.getElementById('game-bottom');
    if (!canvasEl) return null;
    ctxBottom = canvasEl.getContext('2d');
    return ctxBottom;
  }

  function attachInput() {
    if (inputAttached) return;
    if (!canvasEl) return;
    canvasEl.addEventListener('click', onClick);
    canvasEl.addEventListener('touchstart', onTouch, { passive: false });
    inputAttached = true;
  }

  function logicalCoord(clientX, clientY) {
    if (!canvasEl) return null;
    const r = canvasEl.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return null;
    const x = ((clientX - r.left) / r.width) * W;
    const y = ((clientY - r.top) / r.height) * H;
    if (x < 0 || x > W || y < 0 || y > H) return null;
    return { x, y };
  }

  function onClick(e) {
    const c = logicalCoord(e.clientX, e.clientY);
    if (!c) return;
    handleTap(c.x, c.y);
  }
  function onTouch(e) {
    if (!e.touches || !e.touches[0]) return;
    const t = e.touches[0];
    const c = logicalCoord(t.clientX, t.clientY);
    if (!c) return;
    e.preventDefault();
    handleTap(c.x, c.y);
  }

  function handleTap(x, y) {
    // Debounce double-fire from click + touchstart.
    const now = performance.now();
    if (now - lastTapAt < 200) return;
    lastTapAt = now;
    for (const z of hitZones) {
      if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) {
        pressedTile = z.id;
        pressTimer = 0.12;
        invokeAction(z);
        return;
      }
    }
  }

  function invokeAction(z) {
    const state = window.PR_GAME && window.PR_GAME.state;
    if (!state) return;
    if (z.kind === 'pill') {
      window.PR_SFX && window.PR_SFX.play('select');
      window.PR_GAME && window.PR_GAME.openPartyMember && window.PR_GAME.openPartyMember(z.idx);
    } else if (z.kind === 'move') {
      const b = state.battle;
      if (!b || !b.chooseMove) return;
      window.PR_SFX && window.PR_SFX.play('confirm');
      b.chooseMove(z.idx);
    } else if (z.kind === 'cancel') {
      const b = state.battle;
      if (!b || !b.cancelMenu) return;
      window.PR_SFX && window.PR_SFX.play('cancel');
      b.cancelMenu();
    }
  }

  function clear(ctx) {
    ctx.fillStyle = '#d8e8f8';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    for (let i = 0; i < W; i += 8) ctx.fillRect(i, 0, 1, H);
  }

  function drawHinge(ctx) {
    ctx.fillStyle = '#1a1426';
    ctx.fillRect(0, 0, W, 2);
    ctx.fillStyle = '#3a2a4c';
    ctx.fillRect(0, 1, W, 1);
  }

  function drawMinimapBlock(ctx, state) {
    const HUD = window.PR_HUD;
    if (!HUD || !HUD.drawMinimap) return;
    const m = state.world && state.world.currentMap && state.world.currentMap();
    if (!m || !m.tiles || !m.tiles.length || m.interior) {
      ctx.fillStyle = 'rgba(20,16,12,0.55)';
      ctx.fillRect(2, 4, 80, 50);
      ctx.fillStyle = '#f0c020';
      ctx.fillRect(2, 4, 80, 1);
      ctx.fillRect(2, 53, 80, 1);
      ctx.fillRect(2, 4, 1, 50);
      ctx.fillRect(81, 4, 1, 50);
      window.PR_UI.drawText(ctx, 'INDOORS', 18, 24, '#f0c020');
      return;
    }
    HUD.drawMinimap(ctx, m, state.player.x, state.player.y);
  }

  function drawClockBlock(ctx, state) {
    const HUD = window.PR_HUD;
    if (!HUD || !HUD.clockHM) return;
    const steps = (state.player && state.player.steps) || 0;
    const hm = HUD.clockHM(steps);
    const phase = HUD.phaseForSteps(steps);
    const PHASE_LABEL = { day:'DAY', dusk:'DSK', night:'NIT', dawn:'DWN' };
    const pad = (n) => (n < 10 ? '0' : '') + n;
    const text = pad(hm.h) + ':' + pad(hm.m) + ' ' + (PHASE_LABEL[phase.name] || 'DAY');
    const iconW = 18, gap = 2, margin = 4;
    const textW = window.PR_UI.textWidth(text);
    const chipW = Math.max(18, textW + 8);
    const iconX = W - margin - chipW - gap - iconW;
    HUD.drawPhaseIcon(ctx, iconX, 3, phase.name);
    window.PR_UI.chip(ctx, iconX + iconW + gap, 4, text, {
      fill:'#1a0204', border:'#f0c020', text:'#f0c020'
    });
  }

  function hpColor(frac) {
    if (frac > 0.5) return '#48c060';
    if (frac > 0.2) return '#f0c020';
    return '#e83838';
  }

  function drawPartyPill(ctx, member, x, y, w, h, pressed) {
    ctx.fillStyle = '#1a1426';
    ctx.fillRect(x, y, w, h);
    const grd = ctx.createLinearGradient(x, y + 1, x, y + h - 1);
    grd.addColorStop(0, pressed ? '#e8e0f0' : '#fffefa');
    grd.addColorStop(1, pressed ? '#9098b8' : '#c8d0e8');
    ctx.fillStyle = grd;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    if (!member) {
      window.PR_UI.drawText(ctx, '--', x + (w / 2 | 0) - 6, y + h / 2 - 3, '#80809a');
      return;
    }
    const atlas = window.PR_ATLAS;
    if (atlas && atlas.isReady && atlas.isReady()) {
      const key = 'creature_' + member.species;
      try {
        ctx.save();
        const iconSize = 22;
        const sx = x + (w / 2 | 0) - iconSize / 2;
        const sy = y + 2;
        const off = document.createElement('canvas');
        off.width = 64; off.height = 64;
        atlas.drawKey(off.getContext('2d'), key, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(off, sx, sy, iconSize, iconSize);
        ctx.restore();
      } catch (_) { /* ignore */ }
    }
    window.PR_UI.drawText(ctx, 'L' + (member.level | 0), x + 2, y + 2, '#1a0820');
    const barX = x + 3, barY = y + h - 9, barW = w - 6, barH = 5;
    ctx.fillStyle = '#1a1426';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
    ctx.fillStyle = '#403850';
    ctx.fillRect(barX, barY, barW, barH);
    const maxHp = (member.stats && member.stats.hp) || 1;
    const frac = Math.max(0, Math.min(1, member.hp / maxHp));
    ctx.fillStyle = hpColor(frac);
    ctx.fillRect(barX, barY, Math.round(barW * frac), barH);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(barX, barY, Math.round(barW * frac), 1);
    if (member.status) {
      const s = String(member.status).toUpperCase()[0] || '';
      window.PR_UI.drawText(ctx, s, x + w - 8, y + 2, '#e83838');
    }
  }

  function drawPartyRow(ctx, state) {
    const party = state.party || [];
    const totalW = PILL_COUNT * PILL_W + (PILL_COUNT - 1) * PILL_GAP;
    const startX = (W - totalW) / 2 | 0;
    for (let i = 0; i < PILL_COUNT; i++) {
      const x = startX + i * (PILL_W + PILL_GAP);
      const id = 'pill:' + i;
      const pressed = pressedTile === id;
      drawPartyPill(ctx, party[i] || null, x, PILL_ROW_Y, PILL_W, PILL_H, pressed);
      if (i < party.length) {
        hitZones.push({ id, kind:'pill', idx:i, x, y:PILL_ROW_Y, w:PILL_W, h:PILL_H });
      }
    }
  }

  function drawBadgeStrip(ctx, state) {
    const badges = (state.player && state.player.badges) || [];
    const total = 8;
    const dot = 5, gap = 2;
    const stripW = total * dot + (total - 1) * gap;
    const x0 = W - stripW - 4;
    const y0 = PILL_ROW_Y - 8;
    window.PR_UI.drawText(ctx, 'BDG', x0 - 22, y0, '#1a0820');
    for (let i = 0; i < total; i++) {
      const x = x0 + i * (dot + gap);
      ctx.fillStyle = '#1a1426';
      ctx.fillRect(x, y0, dot, dot);
      ctx.fillStyle = i < badges.length ? '#f0c020' : '#a0a0b0';
      ctx.fillRect(x + 1, y0 + 1, dot - 2, dot - 2);
    }
  }

  function drawTrainerLine(ctx, state) {
    const name = (state.player && state.player.name) || 'TRAINER';
    const money = (state.player && state.player.money) || 0;
    window.PR_UI.drawText(ctx, name.toUpperCase().slice(0, 8), 4, PILL_ROW_Y - 8, '#1a0820');
    const moneyText = '$' + money;
    const mw = window.PR_UI.textWidth(moneyText);
    window.PR_UI.drawText(ctx, moneyText, (W / 2 | 0) - (mw / 2 | 0), PILL_ROW_Y - 8, '#1a0820');
  }

  // ---- Battle layout ----------------------------------------------

  function drawMoveTile(ctx, x, y, w, h, move, idx, active, disabled, pressed) {
    const def = move ? (window.PR_DATA.MOVES[move.id] || null) : null;
    const type = (def && def.type) || 'NORMAL';
    const pal = TYPE_COLORS[type] || TYPE_COLORS.NORMAL;
    // Border + drop shadow.
    ctx.fillStyle = 'rgba(8,8,24,0.40)';
    ctx.fillRect(x + 1, y + 2, w, h);
    ctx.fillStyle = '#1a1426';
    ctx.fillRect(x, y, w, h);
    // Inner gradient by type.
    const grd = ctx.createLinearGradient(x, y + 1, x, y + h - 1);
    grd.addColorStop(0, pressed ? pal[1] : pal[0]);
    grd.addColorStop(1, pal[1]);
    ctx.fillStyle = grd;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    // Top shine.
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x + 2, y + 2, w - 4, 1);
    if (active) {
      ctx.fillStyle = '#fff8a0';
      ctx.fillRect(x, y, w, 1);
      ctx.fillRect(x, y + h - 1, w, 1);
      ctx.fillRect(x, y, 1, h);
      ctx.fillRect(x + w - 1, y, 1, h);
    }
    if (!def) {
      window.PR_UI.drawText(ctx, '--', x + 4, y + h / 2 - 3, '#fff8e0');
      return;
    }
    // Move name (top-left).
    const name = (def.name || '').toUpperCase();
    window.PR_UI.drawText(ctx, name.slice(0, 14), x + 4, y + 4, '#1a0820');
    window.PR_UI.drawText(ctx, name.slice(0, 14), x + 4, y + 3, '#fff8e0');
    // Type chip (bottom-left).
    const tw = window.PR_UI.textWidth(type) + 6;
    ctx.fillStyle = '#1a1426';
    ctx.fillRect(x + 3, y + h - 12, tw, 9);
    ctx.fillStyle = '#fff8e0';
    ctx.fillRect(x + 4, y + h - 11, tw - 2, 7);
    window.PR_UI.drawText(ctx, type, x + 5, y + h - 10, '#1a0820');
    // PP (bottom-right).
    const ppText = 'PP ' + (move.pp | 0) + '/' + (move.ppMax | 0);
    const pw = window.PR_UI.textWidth(ppText);
    window.PR_UI.drawText(ctx, ppText, x + w - pw - 4, y + h - 10, '#1a0820');
    window.PR_UI.drawText(ctx, ppText, x + w - pw - 4, y + h - 11, '#fff8e0');
    if (disabled) {
      ctx.fillStyle = 'rgba(20,16,32,0.55)';
      ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
      window.PR_UI.drawText(ctx, 'NO PP', x + (w / 2 | 0) - 14, y + h / 2 - 3, '#ffd0a0');
    }
  }

  function drawBattleLayout(ctx, state) {
    const battle = state.battle;
    const me = battle && battle.me;
    const moves = (me && me.moves) || [];
    const phase = battle && battle.phase;
    const tappable = phase === 'menu' || phase === 'fight';

    // Header row: clock chip top-right, prompt top-left.
    drawClockBlock(ctx, state);
    const speciesLabel = ((me && me.species) || 'YOU').toUpperCase().slice(0, 10);
    const promptText = tappable ? 'WHAT WILL ' + speciesLabel + ' DO?' : 'BATTLE...';
    window.PR_UI.drawText(ctx, promptText, 5, 5, '#1a0820');

    for (let i = 0; i < 4; i++) {
      const col = i & 1, row = (i >> 1) & 1;
      const x = MOVE_GRID_X + col * (MOVE_TILE_W + MOVE_GAP_X);
      const y = MOVE_GRID_Y + row * (MOVE_TILE_H + MOVE_GAP_Y);
      const mv = moves[i] || null;
      const noPp = !!(mv && mv.pp <= 0);
      const active = tappable && phase === 'fight' && battle.subSelection === i;
      const id = 'move:' + i;
      const pressed = pressedTile === id;
      drawMoveTile(ctx, x, y, MOVE_TILE_W, MOVE_TILE_H, mv, i, active, noPp, pressed);
      if (tappable && mv && !noPp) {
        hitZones.push({ id, kind:'move', idx:i, x, y, w:MOVE_TILE_W, h:MOVE_TILE_H });
      }
    }
    // Cancel button (only meaningful from 'fight' phase; mirrors B/X).
    const canCancel = phase === 'fight' || phase === 'party';
    const cancelPressed = pressedTile === 'cancel';
    ctx.fillStyle = canCancel ? '#1a1426' : '#3a3848';
    ctx.fillRect(CANCEL_X, CANCEL_Y, CANCEL_W, CANCEL_H);
    const cgrd = ctx.createLinearGradient(CANCEL_X, CANCEL_Y, CANCEL_X, CANCEL_Y + CANCEL_H);
    cgrd.addColorStop(0, canCancel ? (cancelPressed ? '#3868b8' : '#5890e8') : '#7080a0');
    cgrd.addColorStop(1, canCancel ? '#284878' : '#505c70');
    ctx.fillStyle = cgrd;
    ctx.fillRect(CANCEL_X + 1, CANCEL_Y + 1, CANCEL_W - 2, CANCEL_H - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(CANCEL_X + 2, CANCEL_Y + 2, CANCEL_W - 4, 1);
    const cancelLabel = 'CANCEL';
    const cw = window.PR_UI.textWidth(cancelLabel);
    window.PR_UI.drawText(ctx, cancelLabel, CANCEL_X + (CANCEL_W - cw) / 2 | 0, CANCEL_Y + 3, '#fff8e0');
    if (canCancel) {
      hitZones.push({ id:'cancel', kind:'cancel', x:CANCEL_X, y:CANCEL_Y, w:CANCEL_W, h:CANCEL_H });
    }
  }

  function drawOverworldLayout(ctx, state) {
    drawMinimapBlock(ctx, state);
    drawClockBlock(ctx, state);
    drawTrainerLine(ctx, state);
    drawBadgeStrip(ctx, state);
    drawPartyRow(ctx, state);
  }

  function render(state) {
    if (!window.PR_SETTINGS || window.PR_SETTINGS.graphics !== 'ds_diamond') return;
    const ctx = getCtx();
    if (!ctx || !state) return;
    if (!scaled) {
      ctx.imageSmoothingEnabled = false;
      ctx.scale(2, 2);
      scaled = true;
    }
    attachInput();
    // Decay pressed-tile highlight (rough 60fps).
    if (pressedTile) {
      pressTimer -= 1 / 60;
      if (pressTimer <= 0) pressedTile = null;
    }
    hitZones.length = 0;
    clear(ctx);
    drawHinge(ctx);
    if (state.mode === 'battle' && state.battle) {
      drawBattleLayout(ctx, state);
    } else {
      drawOverworldLayout(ctx, state);
    }
  }

  window.PR_BOTTOM = { render };
})();
