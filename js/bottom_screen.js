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

  // Battle layout - 2x2 move grid + cancel button.
  const MOVE_TILE_W = 110, MOVE_TILE_H = 36;
  const MOVE_GAP_X = 6, MOVE_GAP_Y = 4;
  const MOVE_GRID_X = (W - (MOVE_TILE_W * 2 + MOVE_GAP_X)) / 2 | 0;
  const MOVE_GRID_Y = 14;
  const CANCEL_W = 72, CANCEL_H = 14;
  const CANCEL_X = (W - CANCEL_W) / 2 | 0;
  const CANCEL_Y = H - CANCEL_H - 4;

  // Per-type chip palettes - match common gen-3 colors.
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
    } else if (z.kind === 'items') {
      // Bottom-screen ITEMS button (replaces the old CANCEL button).
      // Opens the bag from the battle main menu so phone players can
      // get to potions / balls without diving through the battle menu.
      // Keyboard X/B still cancels - this button is purely additive.
      if (!window.PR_GAME || !window.PR_GAME.openBagFromBattle) return;
      window.PR_SFX && window.PR_SFX.play('confirm');
      window.PR_GAME.openBagFromBattle();
    } else if (z.kind === 'title-new') {
      window.PR_SFX && window.PR_SFX.play('confirm');
      window.PR_GAME && window.PR_GAME.titleNewGame && window.PR_GAME.titleNewGame();
    } else if (z.kind === 'title-continue') {
      window.PR_SFX && window.PR_SFX.play('confirm');
      window.PR_GAME && window.PR_GAME.titleContinue && window.PR_GAME.titleContinue();
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
    const name = (state.player && state.player.name) || '';
    const money = (state.player && state.player.money) || 0;
    // Only draw the name when it's a custom one; the default 'YOU'
    // adds visual noise without telling the player anything new.
    if (name && name.toUpperCase() !== 'YOU') {
      window.PR_UI.drawText(ctx, name.toUpperCase().slice(0, 8), 4, PILL_ROW_Y - 8, '#1a0820');
    }
    const moneyText = '$' + money;
    const mw = window.PR_UI.textWidth(moneyText);
    window.PR_UI.drawText(ctx, moneyText, (W / 2 | 0) - (mw / 2 | 0), PILL_ROW_Y - 8, '#1a0820');
  }

  // ---- Battle layout ----------------------------------------------

  // Mirror of the top-screen move-name effectiveness palette + tag
  // (battle.js around line 1199). Same thresholds + colors so the
  // two screens read consistently. Returns null for status / 0-power
  // moves, where type matchup doesn't matter.
  function moveEffTag(def, foeTypes) {
    if (!def || !foeTypes || !window.PR_DATA || !window.PR_DATA.effectiveness) return null;
    if (def.kind === 'status' || (def.power | 0) <= 0) return null;
    const eff = window.PR_DATA.effectiveness(def.type, foeTypes);
    if (eff === 0)      return { tag:'X',  color:'#888888' };
    if (eff >= 4)       return { tag:'++', color:'#208830' };
    if (eff > 1)        return { tag:'+',  color:'#388838' };
    if (eff < 0.5)      return { tag:'--', color:'#a06030' };
    if (eff < 1)        return { tag:'-',  color:'#a08040' };
    return null;
  }

  function drawMoveTile(ctx, x, y, w, h, move, idx, active, disabled, pressed, foeTypes) {
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
    // Effectiveness tag (top-right). Mirrors the top-screen color +
    // glyph palette so player can read either screen and get the
    // same matchup signal at a glance.
    const eff = moveEffTag(def, foeTypes);
    if (eff) {
      const tw2 = window.PR_UI.textWidth(eff.tag) + 4;
      ctx.fillStyle = '#1a1426';
      ctx.fillRect(x + w - tw2 - 3, y + 2, tw2, 9);
      ctx.fillStyle = eff.color;
      ctx.fillRect(x + w - tw2 - 2, y + 3, tw2 - 2, 7);
      window.PR_UI.drawText(ctx, eff.tag, x + w - tw2, y + 4, '#1a0820');
      window.PR_UI.drawText(ctx, eff.tag, x + w - tw2, y + 3, '#fff8e0');
    }
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

    // Foe types for the effectiveness tag on each move tile (mirrors
    // the top-screen battle.js move-name preview).
    const foeSpecies = battle && battle.foe && battle.foe.species;
    const foeTypes = (foeSpecies && window.PR_DATA && window.PR_DATA.CREATURES[foeSpecies] || {}).types || [];

    for (let i = 0; i < 4; i++) {
      const col = i & 1, row = (i >> 1) & 1;
      const x = MOVE_GRID_X + col * (MOVE_TILE_W + MOVE_GAP_X);
      const y = MOVE_GRID_Y + row * (MOVE_TILE_H + MOVE_GAP_Y);
      const mv = moves[i] || null;
      const noPp = !!(mv && mv.pp <= 0);
      const active = tappable && phase === 'fight' && battle.subSelection === i;
      const id = 'move:' + i;
      const pressed = pressedTile === id;
      drawMoveTile(ctx, x, y, MOVE_TILE_W, MOVE_TILE_H, mv, i, active, noPp, pressed, foeTypes);
      if (tappable && mv && !noPp) {
        hitZones.push({ id, kind:'move', idx:i, x, y, w:MOVE_TILE_W, h:MOVE_TILE_H });
      }
    }
    // ITEMS button (replaces the old CANCEL button). Active only on
    // the main battle menu - items from the fight/party sub-menus
    // would be confusing. Keyboard X/B still cancels in those phases.
    const canItems = phase === 'menu';
    const itemsPressed = pressedTile === 'items';
    ctx.fillStyle = canItems ? '#1a2618' : '#3a4838';
    ctx.fillRect(CANCEL_X, CANCEL_Y, CANCEL_W, CANCEL_H);
    const igrd = ctx.createLinearGradient(CANCEL_X, CANCEL_Y, CANCEL_X, CANCEL_Y + CANCEL_H);
    igrd.addColorStop(0, canItems ? (itemsPressed ? '#3a8838' : '#5cb85c') : '#7090a0');
    igrd.addColorStop(1, canItems ? '#2a6028' : '#505c70');
    ctx.fillStyle = igrd;
    ctx.fillRect(CANCEL_X + 1, CANCEL_Y + 1, CANCEL_W - 2, CANCEL_H - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(CANCEL_X + 2, CANCEL_Y + 2, CANCEL_W - 4, 1);
    const itemsLabel = 'ITEMS';
    const cw = window.PR_UI.textWidth(itemsLabel);
    window.PR_UI.drawText(ctx, itemsLabel, CANCEL_X + (CANCEL_W - cw) / 2 | 0, CANCEL_Y + 3, '#fff8e0');
    if (canItems) {
      hitZones.push({ id:'items', kind:'items', x:CANCEL_X, y:CANCEL_Y, w:CANCEL_W, h:CANCEL_H });
    }
  }

  function drawOverworldLayout(ctx, state) {
    drawMinimapBlock(ctx, state);
    drawClockBlock(ctx, state);
    drawTrainerLine(ctx, state);
    drawBadgeStrip(ctx, state);
    drawPartyRow(ctx, state);
  }

  // Bottom-screen splash drawn while the title overlay is up on the
  // top screen. Mirrors the top screen's POKEROD wordmark + tagline so
  // the DS device feels coherent on first boot instead of showing the
  // empty overworld HUD (no party, no money, no badges yet).
  // Beveled title button in the bottom-screen visual language
  // (shadow + border + gradient fill + top shine, shifts down 1px
  // when pressed) - mirrors drawMoveTile so the title panel matches
  // the rest of the bottom-screen UI.
  function drawTitleButton(ctx, x, y, w, h, label, sublabel, pressed) {
    const oy = pressed ? 1 : 0;
    // Drop shadow.
    ctx.fillStyle = 'rgba(8,4,2,0.55)';
    ctx.fillRect(x + 1, y + 3, w, h);
    // Border.
    ctx.fillStyle = '#1a0e08';
    ctx.fillRect(x, y + oy, w, h);
    // Gradient fill.
    const g = ctx.createLinearGradient(x, y + oy, x, y + oy + h);
    g.addColorStop(0, pressed ? '#b8801c' : '#f0c850');
    g.addColorStop(1, pressed ? '#7a5410' : '#b07818');
    ctx.fillStyle = g;
    ctx.fillRect(x + 2, y + oy + 2, w - 4, h - 4);
    // Top shine.
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(x + 3, y + oy + 3, w - 6, 1);
    // Label (+ optional sub-label).
    const lw = window.PR_UI.textWidth(label);
    if (sublabel) {
      window.PR_UI.drawText(ctx, label, x + ((w - lw) / 2 | 0), y + oy + 4, '#2a1404');
      const sw = window.PR_UI.textWidth(sublabel);
      window.PR_UI.drawText(ctx, sublabel, x + ((w - sw) / 2 | 0), y + oy + 13, '#5a3810');
    } else {
      window.PR_UI.drawText(ctx, label, x + ((w - lw) / 2 | 0), y + oy + ((h - 7) / 2 | 0), '#2a1404');
    }
  }

  function drawTitleLayout(ctx, state) {
    // Dark theme matching the top-screen title overlay so both panels
    // read as one moody device. Solid black base with a soft red glow
    // emanating from the upper-center.
    ctx.fillStyle = '#1a0204';
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W / 2, 24, 4, W / 2, 24, 140);
    glow.addColorStop(0, 'rgba(220, 60, 30, 0.20)');
    glow.addColorStop(0.6, 'rgba(120, 20, 10, 0.06)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    function bigText(text, x, y, sx, sy, color) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(sx, sy);
      window.PR_UI.drawText(ctx, text, 0, 0, color);
      ctx.restore();
    }
    function centered(text, y, sx, sy, color) {
      const w = text.length * 6 * sx;
      bigText(text, ((W - w) / 2) | 0, y, sx, sy, color);
    }

    // Compact two-tone wordmark header (scale 2).
    const wordScale = 2, charW = 6 * wordScale;
    const total_w = ('POKE'.length + 'ROD'.length) * charW;
    const startX = ((W - total_w) / 2) | 0;
    bigText('POKE', startX, 6, wordScale, wordScale, '#f0a020');
    bigText('ROD',  startX + 4 * charW, 6, wordScale, wordScale, '#e83838');
    centered('A CREATURE-COLLECTING ADVENTURE', 22, 1, 1, '#c8a060');

    // Save context for the CONTINUE button + whether to show it.
    let hasSave = false, saveSub = '';
    if (window.PR_SAVE && window.PR_SAVE.exists && window.PR_SAVE.exists()) {
      hasSave = true;
      try {
        const slots = (window.PR_SAVE.slotInfo && window.PR_SAVE.slotInfo()) || [];
        const s = slots.find((sl) => sl && !sl.empty);
        if (s) {
          const sp = s.firstSpecies && window.PR_DATA && window.PR_DATA.CREATURES[s.firstSpecies];
          const lead = sp ? sp.name.toUpperCase() : 'PARTY';
          saveSub = lead + '  ' + (s.partyCount | 0) + ' IN PARTY';
        }
      } catch (_) { saveSub = ''; }
    }

    // Interactive buttons - this is the DS touch surface. Hit-zones
    // are registered so handleTap dispatches to invokeAction.
    const btnW = 152, btnX = ((W - btnW) / 2) | 0;
    if (hasSave) {
      const newY = 34, contY = 62;
      drawTitleButton(ctx, btnX, newY, btnW, 22, 'NEW GAME', null, pressedTile === 'title:new');
      hitZones.push({ id:'title:new', kind:'title-new', x:btnX, y:newY, w:btnW, h:22 });
      drawTitleButton(ctx, btnX, contY, btnW, 26, 'CONTINUE', saveSub, pressedTile === 'title:continue');
      hitZones.push({ id:'title:continue', kind:'title-continue', x:btnX, y:contY, w:btnW, h:26 });
    } else {
      const newY = 48;
      drawTitleButton(ctx, btnX, newY, btnW, 24, 'NEW GAME', null, pressedTile === 'title:new');
      hitZones.push({ id:'title:new', kind:'title-new', x:btnX, y:newY, w:btnW, h:24 });
    }

    // Small rod-and-bobber doodle (lower-left).
    const rx = 22, ry = 104;
    ctx.strokeStyle = '#a06030';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx + 22, ry - 11);
    ctx.stroke();
    ctx.strokeStyle = '#c8c8d0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rx + 22, ry - 11);
    ctx.lineTo(rx + 25, ry + 7);
    ctx.stroke();
    ctx.fillStyle = '#e83838';
    ctx.beginPath();
    ctx.arc(rx + 25, ry + 8, 2, 0, Math.PI * 2);
    ctx.fill();

    // Balanced sparkle accents in both lower corners.
    ctx.fillStyle = '#f0c020';
    [[206, 96], [218, 104], [200, 108], [16, 92], [30, 88]].forEach(([sx, sy]) => {
      ctx.fillRect(sx, sy, 1, 3);
      ctx.fillRect(sx - 1, sy + 1, 3, 1);
    });

    centered('TAP A BUTTON  -  OR PRESS START', H - 12, 1, 1, '#a08850');
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
    if (state.mode === 'title') {
      drawTitleLayout(ctx, state);
    } else if (state.mode === 'battle' && state.battle) {
      drawBattleLayout(ctx, state);
    } else {
      drawOverworldLayout(ctx, state);
    }
  }

  window.PR_BOTTOM = { render };
})();
