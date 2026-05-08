// DS Diamond bottom-screen renderer.
// Renders a Pokétch-style HUD on a second canvas (#game-bottom):
// minimap mirror, in-game clock, party HP pills, badge dots.
// Only draws when graphics === 'ds_diamond'; bails out otherwise so
// the canvas stays untouched (CSS hides it in non-DS modes anyway).
'use strict';

(function () {
  const W = 240, H = 120;          // logical canvas (480x240 @ scale(2,2))
  const PILL_COUNT = 6;
  const PILL_W = 36, PILL_H = 40;
  const PILL_GAP = 4;
  const PILL_ROW_Y = H - PILL_H - 4;

  let ctxBottom = null, scaled = false;

  function getCtx() {
    if (ctxBottom) return ctxBottom;
    const c = document.getElementById('game-bottom');
    if (!c) return null;
    ctxBottom = c.getContext('2d');
    return ctxBottom;
  }

  function clear(ctx) {
    // DS-touch-screen pale wash with a faint diagonal sheen.
    ctx.fillStyle = '#d8e8f8';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    for (let i = 0; i < W; i += 8) ctx.fillRect(i, 0, 1, H);
  }

  function drawHinge(ctx) {
    // Thin gold strip across the very top, mimicking the DS hinge edge.
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
      // Fallback panel for interiors.
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
    // drawMinimap paints at (4,4); already at the right spot.
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
    // Phase icon + chip in the top-right corner.
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

  function drawPartyPill(ctx, member, x, y, w, h) {
    // Pill shell.
    ctx.fillStyle = '#1a1426';
    ctx.fillRect(x, y, w, h);
    const grd = ctx.createLinearGradient(x, y + 1, x, y + h - 1);
    grd.addColorStop(0, '#fffefa');
    grd.addColorStop(1, '#c8d0e8');
    ctx.fillStyle = grd;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    if (!member) {
      window.PR_UI.drawText(ctx, '--', x + (w / 2 | 0) - 6, y + h / 2 - 3, '#80809a');
      return;
    }
    // Species icon (top half).
    const atlas = window.PR_ATLAS;
    if (atlas && atlas.isReady && atlas.isReady()) {
      const key = 'creature_' + member.species;
      try {
        ctx.save();
        // Atlas creatures are 64x64 native; we want them to fit in ~22px.
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
    // Level chip badge (small).
    window.PR_UI.drawText(ctx, 'L' + (member.level | 0), x + 2, y + 2, '#1a0820');
    // HP bar.
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
    // Status badge (one letter).
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
      drawPartyPill(ctx, party[i] || null, x, PILL_ROW_Y, PILL_W, PILL_H);
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

  function render(state) {
    if (!window.PR_SETTINGS || window.PR_SETTINGS.graphics !== 'ds_diamond') return;
    const ctx = getCtx();
    if (!ctx || !state) return;
    if (!scaled) {
      ctx.imageSmoothingEnabled = false;
      ctx.scale(2, 2);
      scaled = true;
    }
    clear(ctx);
    drawHinge(ctx);
    drawMinimapBlock(ctx, state);
    drawClockBlock(ctx, state);
    drawTrainerLine(ctx, state);
    drawBadgeStrip(ctx, state);
    drawPartyRow(ctx, state);
  }

  window.PR_BOTTOM = { render };
})();
