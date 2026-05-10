// Battle move VFX. One distinct effect per type (×18) plus a handful of
// signature moves (thunderbolt, flamejet, hydro pump, leaf cut, etc.).
//
// Each effect function receives:
//   (ctx, p, dur, tier, cx, cy, w, h)
//     p   = current time / duration (0..1)
//     dur = total duration (s)
//     tier = 'gb_red' | 'gbc_yellow' | 'gba_firered' | 'ds_diamond'
//     cx,cy = target sprite centre (in 240×160 logical px space)
//     w,h   = target bounding box (used to size offsets)
//
// Tier branching: every effect renders a "fancy" version under DS Diamond
// (gradients, halos, more particles, sub-effects) and a "basic" version
// for GB / GBC / GBA (1- to 2-pixel sprites, fewer particles, no halos).
'use strict';

(function(){

  // ---- Helpers ---------------------------------------------------------
  function px(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
  }
  function disc(ctx, cx, cy, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  function ring(ctx, cx, cy, r, color, lineW) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineW || 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Fast star (5- or 4-point) used for impact and sparkles.
  function star(ctx, cx, cy, r, color) {
    ctx.fillStyle = color;
    ctx.fillRect(cx - r,     cy,         r * 2 + 1, 1);
    ctx.fillRect(cx,         cy - r,     1,         r * 2 + 1);
    ctx.fillRect(cx - 1,     cy - 1,     3,         3);
  }
  // Diagonal streak from (x1,y1) to (x2,y2), thick-pixel rendered.
  function streak(ctx, x1, y1, x2, y2, color, w) {
    ctx.strokeStyle = color;
    ctx.lineWidth = w || 1;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  function gradientFill(ctx, cx, cy, r, c0, c1) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, c0);
    g.addColorStop(1, c1);
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  // Deterministic small RNG keyed on integer i — so particle positions
  // stay stable across frames at the same `i`.
  function rng(i) {
    const x = Math.sin(i * 999.123 + 7.91) * 43758.5453;
    return x - Math.floor(x);
  }
  function isFancy(tier) { return tier === 'ds_diamond'; }
  function isMid(tier) { return tier === 'gba_firered'; }

  // ---- Type effects ----------------------------------------------------

  function drawNormal(ctx, p, dur, tier, cx, cy, w, h) {
    // Impact star + expanding white pulse ring.
    const r = 4 + p * 22;
    if (isFancy(tier)) {
      gradientFill(ctx, cx, cy, r, 'rgba(255,255,255,' + (0.55 * (1 - p)).toFixed(2) + ')', 'rgba(255,255,255,0)');
      ring(ctx, cx, cy, r * 0.9, 'rgba(255,232,168,' + (0.85 * (1 - p)).toFixed(2) + ')', 2);
      if (p < 0.4) star(ctx, cx, cy, 4 + (1 - p / 0.4) * 4, '#fff8e0');
    } else {
      ring(ctx, cx, cy, r, '#f8f8f8', 1);
      if (p < 0.5) star(ctx, cx, cy, 3, '#fff');
    }
  }

  function drawFire(ctx, p, dur, tier, cx, cy, w, h) {
    // Rising column of embers + heat ring expanding outward.
    const ringR = 4 + p * 26;
    if (isFancy(tier)) {
      gradientFill(ctx, cx, cy, ringR, 'rgba(248,176,32,' + (0.55 * (1 - p)).toFixed(2) + ')', 'rgba(248,80,8,0)');
      ring(ctx, cx, cy, ringR, 'rgba(248,144,32,' + (0.7 * (1 - p)).toFixed(2) + ')', 2);
      // Rising embers: 12 deterministic particles.
      for (let i = 0; i < 12; i++) {
        const r = rng(i);
        const tOff = (p + r * 0.3) % 1;
        const ex = cx + (rng(i + 1) - 0.5) * 24;
        const ey = cy + 18 - tOff * 36;
        const sz = 2 + Math.floor(r * 2);
        const col = tOff < 0.5 ? 'rgba(248,80,8,' + (0.95 - tOff * 1.4).toFixed(2) + ')'
                               : 'rgba(248,200,80,' + (0.95 - tOff * 0.9).toFixed(2) + ')';
        px(ctx, ex - sz / 2, ey - sz / 2, sz, sz, col);
      }
    } else {
      // Basic: ring + 6 orange dots.
      ring(ctx, cx, cy, ringR, '#f08030', 1);
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 + p * 2;
        const r = 6 + p * 12;
        px(ctx, cx + Math.cos(ang) * r - 1, cy + Math.sin(ang) * r - 1, 2, 2, '#f08030');
      }
    }
  }

  function drawWater(ctx, p, dur, tier, cx, cy, w, h) {
    // Drops swirl in then a radial splash bursts out.
    const swirlR = 16 - p * 10;
    if (isFancy(tier)) {
      // Inward swirl: 10 droplets.
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * Math.PI * 2 + p * 4;
        const r = swirlR + Math.sin(p * 6 + i) * 2;
        const x = cx + Math.cos(ang) * r;
        const y = cy + Math.sin(ang) * r;
        gradientFill(ctx, x, y, 3, 'rgba(168,212,248,0.95)', 'rgba(80,144,224,0)');
      }
      // Splash burst on second half.
      if (p > 0.5) {
        const sp = (p - 0.5) / 0.5;
        ring(ctx, cx, cy, sp * 24, 'rgba(168,212,248,' + (0.85 * (1 - sp)).toFixed(2) + ')', 2);
        for (let i = 0; i < 8; i++) {
          const ang = i * Math.PI / 4;
          const r = sp * 24;
          px(ctx, cx + Math.cos(ang) * r - 1, cy + Math.sin(ang) * r - 1, 2, 3, 'rgba(120,168,224,0.9)');
        }
      }
    } else {
      // Basic: 6 blue dots in inward spiral.
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 + p * 3;
        const r = swirlR;
        px(ctx, cx + Math.cos(ang) * r - 1, cy + Math.sin(ang) * r - 1, 2, 2, '#6890f0');
      }
      if (p > 0.5) ring(ctx, cx, cy, (p - 0.5) * 32, '#6890f0', 1);
    }
  }

  function drawElectric(ctx, p, dur, tier, cx, cy, w, h) {
    // Forking lightning bolt from top of screen to target + sparks.
    const fromX = cx - 18 + Math.sin(p * 50) * 10;
    const fromY = 8;
    if (isFancy(tier)) {
      // Three jagged segments converging to centre. Drawn over multiple
      // frames so it appears "stuck" briefly.
      const visible = (p < 0.5);
      if (visible) {
        ctx.save();
        ctx.shadowColor = '#fff8a0';
        ctx.shadowBlur = 4;
        for (let leg = 0; leg < 2; leg++) {
          const seed = leg * 7;
          let x = fromX + leg * 8, y = fromY;
          ctx.strokeStyle = '#fff8a0';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, y);
          for (let i = 0; i < 6; i++) {
            const tx = cx + (rng(i + seed) - 0.5) * 8;
            const ty = fromY + (cy - fromY) * (i + 1) / 6;
            ctx.lineTo(tx, ty);
            x = tx; y = ty;
          }
          ctx.stroke();
        }
        ctx.restore();
      }
      // Sparks at impact.
      if (p > 0.3) {
        const sp = Math.min(1, (p - 0.3) / 0.6);
        for (let i = 0; i < 10; i++) {
          const ang = (i / 10) * Math.PI * 2;
          const r = 4 + sp * 18;
          px(ctx, cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 1, 1, '#fff8a0');
          if (i % 2 === 0) px(ctx, cx + Math.cos(ang) * r * 0.7, cy + Math.sin(ang) * r * 0.7, 2, 1, '#f8d030');
        }
      }
    } else {
      // Basic: a zigzag line.
      const visible = (p < 0.5);
      if (visible) {
        ctx.strokeStyle = '#f8d030';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        let y = fromY;
        for (let i = 0; i < 6; i++) {
          y += (cy - fromY) / 6;
          ctx.lineTo(cx + (i % 2 === 0 ? -3 : 3), y);
        }
        ctx.stroke();
      }
      if (p > 0.4) {
        for (let i = 0; i < 6; i++) {
          const ang = i * Math.PI / 3;
          const r = (p - 0.4) * 24;
          px(ctx, cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 2, 2, '#f8d030');
        }
      }
    }
  }

  function drawGrass(ctx, p, dur, tier, cx, cy, w, h) {
    // Leaves spiral inward around the target.
    const spinSpeed = 6;
    if (isFancy(tier)) {
      for (let i = 0; i < 9; i++) {
        const ang = (i / 9) * Math.PI * 2 + p * spinSpeed;
        const r = 22 - p * 14;
        const x = cx + Math.cos(ang) * r;
        const y = cy + Math.sin(ang) * r;
        // Leaf shape: triangle of 3 pixels in green.
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang + Math.PI / 2);
        px(ctx, -1, -2, 3, 1, '#48a830');
        px(ctx, -2, -1, 5, 2, '#78c850');
        px(ctx, -1,  1, 3, 1, '#48a830');
        // Vein highlight
        px(ctx, 0, -2, 1, 5, '#a8e870');
        ctx.restore();
      }
      // Burst of small petals on impact.
      if (p > 0.6) {
        const sp = (p - 0.6) / 0.4;
        for (let i = 0; i < 12; i++) {
          const ang = (i / 12) * Math.PI * 2;
          const r = sp * 22;
          px(ctx, cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 2, 2, '#a8e870');
        }
      }
    } else {
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 + p * spinSpeed;
        const r = 18 - p * 12;
        px(ctx, cx + Math.cos(ang) * r - 1, cy + Math.sin(ang) * r - 1, 3, 2, '#78c850');
      }
    }
  }

  function drawIce(ctx, p, dur, tier, cx, cy, w, h) {
    // Crystal shards converging then shattering outward.
    if (isFancy(tier)) {
      // Phase 1: shards growing inward.
      if (p < 0.5) {
        const sp = p / 0.5;
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2;
          const r = 26 * (1 - sp);
          const x = cx + Math.cos(ang) * r;
          const y = cy + Math.sin(ang) * r;
          // Diamond shape: 4 triangles.
          ctx.fillStyle = '#a8e0e8';
          ctx.beginPath();
          ctx.moveTo(x, y - 4);
          ctx.lineTo(x + 3, y);
          ctx.lineTo(x, y + 4);
          ctx.lineTo(x - 3, y);
          ctx.closePath();
          ctx.fill();
          px(ctx, x - 1, y - 2, 2, 1, '#fff8f0');
        }
        gradientFill(ctx, cx, cy, 14 * (1 - sp + 0.2), 'rgba(168,224,232,0.55)', 'rgba(168,224,232,0)');
      } else {
        // Phase 2: frost burst.
        const sp = (p - 0.5) / 0.5;
        ring(ctx, cx, cy, sp * 28, 'rgba(220,240,248,' + (0.85 * (1 - sp)).toFixed(2) + ')', 2);
        for (let i = 0; i < 14; i++) {
          const ang = (i / 14) * Math.PI * 2;
          const r = sp * 26;
          ctx.fillStyle = '#d8f0f8';
          px(ctx, cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 2, 2, '#d8f0f8');
        }
      }
    } else {
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 + p * 2;
        const r = p < 0.5 ? 22 - p * 32 : (p - 0.5) * 36;
        px(ctx, cx + Math.cos(ang) * r - 1, cy + Math.sin(ang) * r - 2, 3, 4, '#98d8d8');
      }
    }
  }

  function drawFighting(ctx, p, dur, tier, cx, cy, w, h) {
    // Impact star + dust kick from below.
    if (isFancy(tier)) {
      // Impact star at first.
      if (p < 0.4) {
        const k = 1 - p / 0.4;
        const r = 4 + k * 14;
        gradientFill(ctx, cx, cy, r, 'rgba(248,80,40,0.85)', 'rgba(248,80,40,0)');
        // Cross
        px(ctx, cx - r, cy, r * 2, 2, '#f04020');
        px(ctx, cx, cy - r, 2, r * 2, '#f04020');
      }
      // Dust kick rising from below.
      for (let i = 0; i < 8; i++) {
        const r = rng(i);
        const dx = (rng(i + 11) - 0.5) * 24;
        const dy = 14 - p * 22 - r * 6;
        const sz = 2 + Math.floor(r * 2);
        const col = 'rgba(168,144,112,' + (0.85 * (1 - p)).toFixed(2) + ')';
        px(ctx, cx + dx - sz / 2, cy + dy, sz, sz, col);
      }
    } else {
      if (p < 0.4) {
        const r = 12 - p * 18;
        px(ctx, cx - r, cy - 1, r * 2, 3, '#c03028');
        px(ctx, cx - 1, cy - r, 3, r * 2, '#c03028');
      }
      for (let i = 0; i < 4; i++) {
        px(ctx, cx + (i - 2) * 6, cy + 12 - p * 16, 2, 2, '#a08868');
      }
    }
  }

  function drawPoison(ctx, p, dur, tier, cx, cy, w, h) {
    // Bubbling green orbs rising from target + drips.
    if (isFancy(tier)) {
      for (let i = 0; i < 9; i++) {
        const r = rng(i);
        const tOff = (p + r * 0.5) % 1;
        const x = cx + (rng(i + 5) - 0.5) * 22;
        const y = cy + 10 - tOff * 28;
        const sz = 2 + Math.floor(rng(i + 9) * 3);
        gradientFill(ctx, x, y, sz + 1, 'rgba(176,80,176,0.95)', 'rgba(112,32,112,0)');
        px(ctx, x - 1, y - 1, 1, 1, '#e0a8e0');
      }
      // Faint poison cloud halo.
      gradientFill(ctx, cx, cy, 18, 'rgba(160,64,160,' + (0.35 * (1 - p)).toFixed(2) + ')', 'rgba(160,64,160,0)');
    } else {
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const x = cx + Math.cos(ang) * 8 + Math.sin(p * 4 + i) * 3;
        const y = cy + 8 - p * 20 + Math.cos(p * 4 + i) * 2;
        px(ctx, x - 1, y - 1, 3, 3, '#a040a0');
      }
    }
  }

  function drawGround(ctx, p, dur, tier, cx, cy, w, h) {
    // Rocks erupt upward from the ground line.
    if (isFancy(tier)) {
      for (let i = 0; i < 8; i++) {
        const r = rng(i);
        const dx = (rng(i + 1) - 0.5) * 28;
        const ang = (i / 8) * Math.PI * 2;
        const dy = 14 - p * (14 + r * 18);
        const sz = 3 + Math.floor(r * 2);
        ctx.save();
        ctx.translate(cx + dx, cy + dy);
        ctx.rotate(p * 4 + i);
        px(ctx, -sz / 2, -sz / 2, sz, sz, '#a08850');
        px(ctx, -sz / 2 + 1, -sz / 2, 1, 1, '#e0c878');
        ctx.restore();
      }
      // Dust pillar at base.
      gradientFill(ctx, cx, cy + 14, 18, 'rgba(168,144,112,' + (0.55 * (1 - p)).toFixed(2) + ')', 'rgba(168,144,112,0)');
    } else {
      for (let i = 0; i < 6; i++) {
        const dx = (i - 2.5) * 6;
        const dy = 14 - p * 18;
        px(ctx, cx + dx, cy + dy, 3, 3, '#e0c068');
      }
    }
  }

  function drawFlying(ctx, p, dur, tier, cx, cy, w, h) {
    // Wind streaks crossing target + feathers spinning.
    if (isFancy(tier)) {
      // Multiple horizontal streaks at different heights.
      for (let i = 0; i < 6; i++) {
        const yOff = (i - 2.5) * 6;
        const speed = 1 + rng(i) * 0.6;
        const x0 = cx - 30 + ((p * speed * 64) % 70);
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#e8e0f8';
        ctx.fillRect(x0, cy + yOff, 12, 1);
      }
      ctx.globalAlpha = 1;
      // A couple of feathers spinning at impact zone.
      for (let i = 0; i < 3; i++) {
        const ang = i * Math.PI * 2 / 3 + p * 4;
        const r = 6 + p * 4;
        const x = cx + Math.cos(ang) * r;
        const y = cy + Math.sin(ang) * r;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang);
        px(ctx, -3, -1, 6, 2, '#f0e8f8');
        px(ctx, -2, -2, 4, 1, '#a890f0');
        ctx.restore();
      }
    } else {
      for (let i = 0; i < 4; i++) {
        const yOff = (i - 1.5) * 6;
        const x0 = cx - 24 + ((p * 80 + i * 12) % 60);
        px(ctx, x0, cy + yOff, 10, 1, '#a890f0');
      }
    }
  }

  function drawPsychic(ctx, p, dur, tier, cx, cy, w, h) {
    // Concentric expanding rings + lens glow.
    if (isFancy(tier)) {
      gradientFill(ctx, cx, cy, 22, 'rgba(248,144,176,' + (0.55 * (1 - p)).toFixed(2) + ')', 'rgba(248,144,176,0)');
      for (let i = 0; i < 4; i++) {
        const offset = (p + i * 0.25) % 1;
        const r = offset * 30;
        ring(ctx, cx, cy, r, 'rgba(248,88,136,' + (0.9 * (1 - offset)).toFixed(2) + ')', 2);
      }
      // Three radiating lines.
      for (let i = 0; i < 3; i++) {
        const ang = (i / 3) * Math.PI * 2 + p * 2;
        const r = 28;
        streak(ctx, cx, cy, cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 'rgba(248,200,232,0.6)', 1);
      }
    } else {
      for (let i = 0; i < 3; i++) {
        const offset = (p + i * 0.33) % 1;
        ring(ctx, cx, cy, offset * 26, '#f85888', 1);
      }
    }
  }

  function drawBug(ctx, p, dur, tier, cx, cy, w, h) {
    // Swarm of dots circling tightly, then dispersing outward.
    if (isFancy(tier)) {
      for (let i = 0; i < 18; i++) {
        const r = rng(i);
        const ang = (i / 18) * Math.PI * 2 + p * 8;
        const baseR = 8 + Math.sin(p * 6 + i) * 4;
        const radius = baseR + p * 14;
        const x = cx + Math.cos(ang) * radius + (r - 0.5) * 4;
        const y = cy + Math.sin(ang) * radius + (rng(i + 11) - 0.5) * 4;
        const sz = (i % 3 === 0) ? 2 : 1;
        const col = (i % 4 === 0) ? '#a8b820' : '#e0e860';
        px(ctx, x, y, sz, sz, col);
      }
    } else {
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2 + p * 6;
        const r = 8 + p * 12;
        px(ctx, cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 2, 2, '#a8b820');
      }
    }
  }

  function drawRock(ctx, p, dur, tier, cx, cy, w, h) {
    // Rock chunks fall from above + dust at base.
    if (isFancy(tier)) {
      for (let i = 0; i < 6; i++) {
        const r = rng(i);
        const startY = -16 - r * 30;
        const yPos = startY + p * (cy - startY + 8);
        const xOff = (rng(i + 3) - 0.5) * 30;
        const sz = 4 + Math.floor(r * 3);
        ctx.save();
        ctx.translate(cx + xOff, yPos);
        ctx.rotate(p * 6 + i);
        px(ctx, -sz / 2, -sz / 2, sz, sz, '#b8a038');
        px(ctx, -sz / 2 + 1, -sz / 2 + 1, 1, 1, '#e8d088');
        ctx.restore();
      }
      // Impact dust at the base on second half.
      if (p > 0.5) {
        gradientFill(ctx, cx, cy + 8, 18, 'rgba(184,160,80,' + (0.65 * (1 - (p - 0.5) / 0.5)).toFixed(2) + ')', 'rgba(184,160,80,0)');
      }
    } else {
      for (let i = 0; i < 4; i++) {
        const xOff = (i - 1.5) * 8;
        const yPos = -10 + p * (cy + 14);
        px(ctx, cx + xOff, yPos, 3, 3, '#b8a038');
      }
    }
  }

  function drawGhost(ctx, p, dur, tier, cx, cy, w, h) {
    // Wisps rise + fade. Slight target outline distortion.
    if (isFancy(tier)) {
      for (let i = 0; i < 6; i++) {
        const r = rng(i);
        const tOff = (p + r * 0.4) % 1;
        const x = cx + (rng(i + 7) - 0.5) * 24 + Math.sin(tOff * 4 + i) * 6;
        const y = cy + 10 - tOff * 32;
        const radius = 4 + tOff * 4;
        const alpha = 0.85 * (1 - tOff);
        gradientFill(ctx, x, y, radius, 'rgba(168,128,200,' + alpha.toFixed(2) + ')', 'rgba(112,88,152,0)');
        px(ctx, x, y - 1, 1, 1, 'rgba(232,200,248,0.95)');
      }
      // Faint purple aura around target.
      gradientFill(ctx, cx, cy, 18, 'rgba(112,88,152,' + (0.35 * (1 - p)).toFixed(2) + ')', 'rgba(112,88,152,0)');
    } else {
      for (let i = 0; i < 4; i++) {
        const x = cx + (i - 1.5) * 6 + Math.sin(p * 5 + i) * 3;
        const y = cy + 8 - p * 20;
        px(ctx, x, y, 3, 3, '#705898');
      }
    }
  }

  function drawDragon(ctx, p, dur, tier, cx, cy, w, h) {
    // Helix of cyan/purple energy spiraling around the target axis.
    if (isFancy(tier)) {
      for (let i = 0; i < 12; i++) {
        const phase = p + i / 12;
        const ang = phase * Math.PI * 6;
        const r = 14 + Math.sin(phase * 3) * 4;
        const x = cx + Math.cos(ang) * r;
        const y = cy + (i - 6) * 3 + Math.sin(ang) * 3;
        const isUpper = (i & 1) === 0;
        const col = isUpper ? 'rgba(112,56,248,0.9)' : 'rgba(168,224,232,0.9)';
        gradientFill(ctx, x, y, 3, col, 'rgba(0,0,0,0)');
      }
      // Scale glints scattered.
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2 + p * 2;
        const r = 16 + p * 8;
        px(ctx, cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 1, 1, '#fff8e0');
      }
    } else {
      for (let i = 0; i < 8; i++) {
        const phase = p + i / 8;
        const ang = phase * Math.PI * 4;
        const r = 14;
        const x = cx + Math.cos(ang) * r;
        const y = cy + (i - 4) * 4;
        px(ctx, x, y, 2, 2, '#7038f8');
      }
    }
  }

  function drawDark(ctx, p, dur, tier, cx, cy, w, h) {
    // Three diagonal claw slashes + dark smoke.
    if (isFancy(tier)) {
      // Smoke first.
      gradientFill(ctx, cx, cy, 20, 'rgba(40,32,40,' + (0.55 * (1 - p)).toFixed(2) + ')', 'rgba(40,32,40,0)');
      // Three claws appear in sequence.
      for (let i = 0; i < 3; i++) {
        const tOff = p - i * 0.18;
        if (tOff < 0 || tOff > 0.6) continue;
        const k = 1 - tOff / 0.6;
        const offY = (i - 1) * 8;
        const x0 = cx - 16, x1 = cx + 16;
        ctx.strokeStyle = 'rgba(232,224,232,' + k.toFixed(2) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x0, cy + offY - 4);
        ctx.lineTo(x1, cy + offY + 4);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(112,88,72,' + k.toFixed(2) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x0, cy + offY - 3);
        ctx.lineTo(x1, cy + offY + 5);
        ctx.stroke();
      }
    } else {
      for (let i = 0; i < 3; i++) {
        const offY = (i - 1) * 6;
        streak(ctx, cx - 14, cy + offY - 4, cx + 14, cy + offY + 4, '#705848', 2);
      }
    }
  }

  function drawSteel(ctx, p, dur, tier, cx, cy, w, h) {
    // Metallic horizontal sweep + sparks.
    if (isFancy(tier)) {
      // Sweep band.
      const k = 1 - p;
      const sweepX = cx - 28 + p * 56;
      ctx.save();
      const grad = ctx.createLinearGradient(sweepX - 8, 0, sweepX + 8, 0);
      grad.addColorStop(0, 'rgba(232,232,248,0)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.95)');
      grad.addColorStop(1, 'rgba(168,168,184,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(sweepX - 8, cy - 14, 16, 28);
      ctx.restore();
      // Sparks.
      for (let i = 0; i < 8; i++) {
        const ang = i * Math.PI / 4;
        const r = 8 + p * 14;
        px(ctx, cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 1, 1, '#f0f0e0');
      }
    } else {
      const sweepX = cx - 24 + p * 48;
      px(ctx, sweepX - 4, cy - 12, 8, 24, '#b8b8d0');
      for (let i = 0; i < 4; i++) {
        px(ctx, cx + (i - 1.5) * 8, cy - 8 + p * 16, 1, 1, '#fff');
      }
    }
  }

  function drawFairy(ctx, p, dur, tier, cx, cy, w, h) {
    // Pink hearts spinning + glitter sparkles.
    if (isFancy(tier)) {
      // Glitter dust ring.
      for (let i = 0; i < 14; i++) {
        const ang = (i / 14) * Math.PI * 2 + p * 3;
        const r = 14 + Math.sin(p * 4 + i) * 4;
        const x = cx + Math.cos(ang) * r;
        const y = cy + Math.sin(ang) * r;
        const blink = ((p * 30 + i) | 0) % 4 < 2;
        if (blink) {
          px(ctx, x, y, 1, 1, '#ffe0f0');
          px(ctx, x - 1, y, 1, 1, '#ee99ac');
          px(ctx, x, y - 1, 1, 1, '#ee99ac');
        }
      }
      // Heart at centre.
      const hx = cx, hy = cy;
      const k = 1 - Math.abs(p - 0.5) * 2;
      ctx.fillStyle = '#ee99ac';
      ctx.beginPath();
      ctx.arc(hx - 3, hy - 1, 3, 0, Math.PI * 2);
      ctx.arc(hx + 3, hy - 1, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(hx - 6, hy);
      ctx.lineTo(hx + 6, hy);
      ctx.lineTo(hx, hy + 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,224,240,' + k.toFixed(2) + ')';
      ctx.fillRect(hx - 1, hy - 2, 2, 1);
    } else {
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 + p * 3;
        const r = 12;
        px(ctx, cx + Math.cos(ang) * r - 1, cy + Math.sin(ang) * r - 1, 3, 3, '#ee99ac');
      }
    }
  }

  // ---- Signature move overrides ----------------------------------------

  function drawThunderbolt(ctx, p, dur, tier, cx, cy, w, h) {
    // Three sequential lightning strikes to the target.
    const fancy = isFancy(tier);
    for (let s = 0; s < 3; s++) {
      const segStart = s / 3, segEnd = (s + 1) / 3;
      if (p < segStart || p > segEnd) continue;
      const localP = (p - segStart) / (segEnd - segStart);
      if (localP > 0.4) continue;
      const offsetX = (s - 1) * 12;
      const fromX = cx + offsetX;
      ctx.strokeStyle = fancy ? '#fff8a0' : '#f8d030';
      ctx.lineWidth = fancy ? 2 : 1;
      if (fancy) { ctx.shadowColor = '#fff8a0'; ctx.shadowBlur = 6; }
      ctx.beginPath();
      ctx.moveTo(fromX, 8);
      let y = 8;
      const seed = s * 23;
      for (let i = 0; i < 6; i++) {
        const tx = cx + offsetX * (1 - i / 6) + (rng(i + seed) - 0.5) * 10;
        y += (cy - 8) / 6;
        ctx.lineTo(tx, y);
      }
      ctx.stroke();
      if (fancy) ctx.shadowBlur = 0;
    }
    // Lingering sparks at impact.
    if (p > 0.5) {
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * Math.PI * 2;
        const r = (p - 0.5) * 30;
        px(ctx, cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 1, 1, fancy ? '#fff8a0' : '#f8d030');
      }
    }
  }

  function drawFlamethrower(ctx, p, dur, tier, cx, cy, w, h) {
    // Continuous beam from attacker side to target. Attacker is offscreen
    // to the left when target is the foe; mirror when target is player.
    const fromX = cx - 50, fromY = cy + 8;
    const fancy = isFancy(tier);
    const beamLen = Math.min(50, p * 80);
    // Three layered streaks: outer dark, mid orange, inner yellow.
    const colors = fancy
      ? ['rgba(248,80,8,0.85)', 'rgba(248,144,32,0.95)', 'rgba(248,224,120,0.95)']
      : ['#f08030', '#f8c030', '#fff'];
    const widths = fancy ? [6, 4, 2] : [3, 2, 1];
    for (let layer = 0; layer < colors.length; layer++) {
      ctx.strokeStyle = colors[layer];
      ctx.lineWidth = widths[layer];
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      // Slight wave on the beam for liveliness.
      const cp1x = fromX + beamLen * 0.5;
      const cp1y = fromY + Math.sin(p * 10) * 3 - 4;
      ctx.quadraticCurveTo(cp1x, cp1y, fromX + beamLen, cy);
      ctx.stroke();
    }
    // Embers rising from the target.
    if (fancy) {
      for (let i = 0; i < 8; i++) {
        const r = rng(i);
        const ex = cx + (rng(i + 1) - 0.5) * 16;
        const ey = cy - p * 14 - r * 8;
        px(ctx, ex, ey, 2, 2, 'rgba(248,144,32,' + (0.95 - p * 0.5).toFixed(2) + ')');
      }
    }
  }

  function drawHydroPump(ctx, p, dur, tier, cx, cy, w, h) {
    // Pressurised water column from attacker side.
    const fromX = cx - 50, fromY = cy + 8;
    const fancy = isFancy(tier);
    const beamLen = Math.min(50, p * 90);
    const colors = fancy
      ? ['rgba(40,80,168,0.85)', 'rgba(80,144,224,0.95)', 'rgba(168,212,248,0.95)']
      : ['#3858a8', '#6890f0', '#fff'];
    const widths = fancy ? [8, 5, 2] : [4, 3, 1];
    for (let layer = 0; layer < colors.length; layer++) {
      ctx.strokeStyle = colors[layer];
      ctx.lineWidth = widths[layer];
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      const cp1x = fromX + beamLen * 0.5;
      const cp1y = fromY + Math.sin(p * 6) * 2 - 4;
      ctx.quadraticCurveTo(cp1x, cp1y, fromX + beamLen, cy);
      ctx.stroke();
    }
    // Splash droplets at impact.
    if (p > 0.4 && fancy) {
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const r = (p - 0.4) * 26;
        px(ctx, cx + Math.cos(ang) * r - 1, cy + Math.sin(ang) * r - 1, 2, 2, 'rgba(168,212,248,0.95)');
      }
    }
  }

  function drawLeafCut(ctx, p, dur, tier, cx, cy, w, h) {
    // Single curving slash arc with a leaf-green colour.
    const fancy = isFancy(tier);
    const cw = 32; // slash width
    if (p < 0.6) {
      const sp = p / 0.6;
      const ang = -Math.PI / 4 + sp * Math.PI / 1.5;
      const x1 = cx + Math.cos(ang) * cw;
      const y1 = cy + Math.sin(ang) * cw;
      ctx.strokeStyle = fancy ? '#a8e870' : '#78c850';
      ctx.lineWidth = fancy ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(cx - Math.cos(ang) * cw, cy - Math.sin(ang) * cw);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      if (fancy) {
        ctx.strokeStyle = 'rgba(248,255,232,0.9)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    // Petals fall.
    if (fancy) {
      for (let i = 0; i < 6; i++) {
        const r = rng(i);
        const x = cx + (rng(i + 1) - 0.5) * 28;
        const y = cy - 8 + p * (16 + r * 8);
        if (y > cy + 14) continue;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p * 6 + i);
        px(ctx, -1, -1, 3, 2, '#a8e870');
        ctx.restore();
      }
    }
  }

  function drawIronTail(ctx, p, dur, tier, cx, cy, w, h) {
    // Big arc swing + impact star.
    const fancy = isFancy(tier);
    if (p < 0.5) {
      const sp = p / 0.5;
      const ang = Math.PI - sp * Math.PI;
      const r = 22;
      const x1 = cx + Math.cos(ang) * r;
      const y1 = cy + Math.sin(ang) * r;
      ctx.strokeStyle = fancy ? '#e8e0f0' : '#b8b8d0';
      ctx.lineWidth = fancy ? 4 : 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI, ang, false);
      ctx.stroke();
      // Tail tip flash.
      if (fancy) gradientFill(ctx, x1, y1, 4, 'rgba(255,255,255,0.95)', 'rgba(184,184,208,0)');
    } else {
      // Impact: large star.
      const sp = (p - 0.5) / 0.5;
      const r = 4 + sp * 18;
      ctx.fillStyle = fancy ? 'rgba(255,255,255,' + (0.85 * (1 - sp)).toFixed(2) + ')' : '#fff';
      px(ctx, cx - r, cy, r * 2 + 1, 2, ctx.fillStyle);
      px(ctx, cx, cy - r, 2, r * 2 + 1, ctx.fillStyle);
    }
  }

  function drawDragonClaw(ctx, p, dur, tier, cx, cy, w, h) {
    // Three diagonal slashes drawn left→right with a violet/cyan trail.
    const fancy = isFancy(tier);
    for (let i = 0; i < 3; i++) {
      const tOff = p - i * 0.18;
      if (tOff < 0 || tOff > 0.5) continue;
      const k = 1 - tOff / 0.5;
      const offY = (i - 1) * 7;
      const x0 = cx - 18, x1 = cx + 18;
      ctx.strokeStyle = fancy ? 'rgba(168,224,232,' + k.toFixed(2) + ')' : '#a8e0e8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x0, cy + offY - 4);
      ctx.lineTo(x1, cy + offY + 4);
      ctx.stroke();
      ctx.strokeStyle = fancy ? 'rgba(112,56,248,' + k.toFixed(2) + ')' : '#7038f8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0, cy + offY - 3);
      ctx.lineTo(x1, cy + offY + 5);
      ctx.stroke();
    }
  }

  function drawMoonbeam(ctx, p, dur, tier, cx, cy, w, h) {
    // Moonlight beam from above + sparkles.
    const fancy = isFancy(tier);
    if (p < 0.7) {
      const sp = p / 0.7;
      const beamW = 10 + sp * 6;
      const grad = ctx.createLinearGradient(cx, 0, cx, cy + 14);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(1, fancy ? 'rgba(248,224,248,0.85)' : 'rgba(238,153,172,0.6)');
      ctx.fillStyle = grad;
      ctx.fillRect(cx - beamW / 2, 0, beamW, cy + 14);
    }
    if (fancy) {
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const r = 14 + p * 6;
        const x = cx + Math.cos(ang) * r;
        const y = cy + Math.sin(ang) * r;
        if (((p * 20 + i) | 0) % 3 === 0) px(ctx, x, y, 1, 1, '#ffe0f0');
      }
    }
  }

  function drawShockwave(ctx, p, dur, tier, cx, cy, w, h) {
    // Expanding ring of yellow/white sparks.
    const fancy = isFancy(tier);
    for (let i = 0; i < 3; i++) {
      const offset = p + i * 0.18;
      if (offset < 0 || offset > 1) continue;
      const r = offset * 30;
      const k = 1 - offset;
      ring(ctx, cx, cy, r, fancy ? 'rgba(255,248,160,' + (k * 0.95).toFixed(2) + ')' : '#f8d030', 2);
    }
    if (fancy) {
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2 + p * 4;
        const r = p * 28;
        px(ctx, cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 1, 1, '#fff8a0');
      }
    }
  }

  // ---- Registry --------------------------------------------------------

  const TYPE_EFFECTS = {
    NORMAL:   drawNormal,
    FIRE:     drawFire,
    WATER:    drawWater,
    ELECTRIC: drawElectric,
    GRASS:    drawGrass,
    ICE:      drawIce,
    FIGHTING: drawFighting,
    POISON:   drawPoison,
    GROUND:   drawGround,
    FLYING:   drawFlying,
    PSYCHIC:  drawPsychic,
    BUG:      drawBug,
    ROCK:     drawRock,
    GHOST:    drawGhost,
    DRAGON:   drawDragon,
    DARK:     drawDark,
    STEEL:    drawSteel,
    FAIRY:    drawFairy
  };

  // ---------- Tornado funnel (reused from the retired tornado weather)
  // Stacked thin ellipses growing narrower toward the bottom, with debris
  // motes orbiting the center. Used by FLYING signature moves (gust /
  // airslash) — fits any "twister" / "cyclone" feel.
  function drawTornadoFunnel(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = tier !== 'gb_red';
    const t = p * dur * 8; // walltime-ish driver for shimmer
    // Build the funnel a bit above the target so it looks like the
    // creature is being lifted/buffeted by wind from above.
    const topY = cy - 26;
    const layers = fancy ? 14 : 8;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    for (let i = 0; i < layers; i++) {
      const f = i / layers;
      const fx = cx + Math.sin(t * 0.5 + i * 0.6) * (3 + f * 6);
      const fy = topY + i * (44 / layers);
      const rx = Math.max(2, 30 - i * (30 / layers));
      const ry = 4;
      ctx.fillStyle = 'rgba(60,52,40,' +
        (0.30 + 0.06 * Math.sin(t * 0.75 + i)).toFixed(3) + ')';
      ctx.beginPath();
      ctx.ellipse(fx, fy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (!fancy) return;
    // Orbiting debris motes — spiral inward as p grows.
    ctx.save();
    const motes = 7;
    for (let i = 0; i < motes; i++) {
      const ang = t * 1.6 + i * (Math.PI * 2 / motes);
      const rad = 28 * (1 - 0.45 * p) + Math.sin(t + i) * 2;
      const mx = cx + Math.cos(ang) * rad;
      const my = (topY + 22) + Math.sin(ang) * rad * 0.5;
      ctx.fillStyle = i & 1 ? 'rgba(120,108,80,0.75)' : 'rgba(80,68,52,0.85)';
      ctx.fillRect(mx | 0, my | 0, 2, 2);
    }
    ctx.restore();
  }

  const MOVE_EFFECTS = {
    spark:        drawShockwave,    // tier-1 electric uses simpler ring
    gust:         drawTornadoFunnel,
    airslash:     drawTornadoFunnel,
    zapburst:     drawThunderbolt,  // multi-strike
    shockwave:    drawShockwave,
    flamejet:     drawFlamethrower,
    watergun:     drawHydroPump,
    bubble:       drawHydroPump,
    leafcut:      drawLeafCut,
    chromebash:   drawIronTail,
    ironswipe:    drawIronTail,
    dragonclaw:   drawDragonClaw,
    moonbeam:     drawMoonbeam
  };

  // Move-id overrides may want a longer / shorter timeline than the
  // type default. Defaults to 0.7s for type effects, 0.85s for signature
  // overrides — long enough for the multi-stage anims to read.
  const DURATIONS = {
    zapburst:    0.95,
    gust:        0.90,
    airslash:    0.95,
    flamejet:    0.85,
    watergun:    0.75,
    bubble:      0.65,
    leafcut:     0.65,
    chromebash:  0.85,
    ironswipe:   0.75,
    dragonclaw:  0.85,
    moonbeam:    0.85,
    shockwave:   0.80
  };

  function drawFor(ctx, anim, tier, tx, ty, tw, th) {
    if (!anim) return;
    const cx = tx + (tw >> 1);
    const cy = ty + (th >> 1);
    const p = Math.min(1, anim.t / anim.duration);
    const fn = (anim.moveId && MOVE_EFFECTS[anim.moveId]) || TYPE_EFFECTS[anim.type] || drawNormal;
    ctx.save();
    try { fn(ctx, p, anim.duration, tier || 'ds_diamond', cx, cy, tw, th); }
    catch (e) { /* ignore so a single bad effect doesn't kill the battle */ }
    ctx.restore();
  }

  function durationFor(moveId, type) {
    if (moveId && DURATIONS[moveId]) return DURATIONS[moveId];
    return 0.7;
  }

  window.PR_MOVE_FX = {
    TYPE_EFFECTS, MOVE_EFFECTS, DURATIONS,
    drawFor, durationFor,
    px, disc, ring, star, streak, gradientFill
  };
})();
