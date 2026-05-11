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

  // ---- 30 signature move effects ---------------------------------------
  // Each one is wired into MOVE_EFFECTS below. Tier-branched (fancy DS
  // version + basic GB/GBC/GBA fallback). All built on the shared
  // helpers (px, disc, ring, star, streak, gradientFill, rng, isFancy).

  // 1. tackle — shoulder-charge streak inbound, impact star + dust.
  function drawTackle(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const t = Math.min(1, p / 0.6);
    const sx = cx - 40 + 40 * t;
    if (fancy) {
      streak(ctx, sx - 16, cy - 6, sx + 2, cy + 4, 'rgba(255,255,255,0.85)', 4);
      streak(ctx, sx - 10, cy - 10, sx, cy, 'rgba(255,232,168,0.7)', 2);
    } else {
      streak(ctx, sx - 8, cy, sx, cy, '#fff', 2);
    }
    if (p > 0.55) {
      const k = (p - 0.55) / 0.45;
      const r = 4 + k * 16;
      if (fancy) {
        gradientFill(ctx, cx, cy, r, 'rgba(255,232,168,' + (0.6 * (1 - k)).toFixed(2) + ')', 'rgba(255,232,168,0)');
        ring(ctx, cx, cy, r, 'rgba(255,255,255,' + (0.9 * (1 - k)).toFixed(2) + ')', 2);
        for (let i = 0; i < 6; i++) {
          const r2 = rng(i + 1);
          const dx = (r2 - 0.5) * 28;
          const dy = 8 - k * 12;
          px(ctx, cx + dx | 0, cy + dy + (r2 * 4) | 0, 2, 2, 'rgba(200,180,140,' + (0.85 * (1 - k)).toFixed(2) + ')');
        }
      } else {
        ring(ctx, cx, cy, r, '#fff', 1);
        star(ctx, cx, cy, 3, '#fff');
      }
    }
  }

  // 2. scratch — three diagonal claw rakes appearing in sequence.
  function drawScratch(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const stages = [0, 0.18, 0.36];
    for (let i = 0; i < 3; i++) {
      const local = (p - stages[i]) / 0.4;
      if (local <= 0 || local > 1) continue;
      const a = (1 - local).toFixed(2);
      const ox = -14 + i * 12;
      const oy = -14 + i * 6;
      const len = 18;
      for (let j = 0; j < 3; j++) {
        const off = (j - 1) * 4;
        streak(ctx, cx + ox + off + local * 4, cy + oy + off,
                    cx + ox + off + len + local * 4, cy + oy + off + len,
                    fancy ? 'rgba(248,80,80,' + a + ')' : '#f88', fancy ? 2 : 1);
      }
    }
    if (fancy && p > 0.2 && p < 0.8) {
      star(ctx, cx, cy, 3, 'rgba(255,232,168,' + (0.8 * (1 - p)).toFixed(2) + ')');
    }
  }

  // 3. quickjab — three rapid jabs with afterimage trails.
  function drawQuickJab(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const stages = [0.05, 0.30, 0.55];
    for (let i = 0; i < 3; i++) {
      const local = (p - stages[i]) / 0.18;
      if (local <= 0 || local > 1) continue;
      const a = (1 - local).toFixed(2);
      const fy = cy + (i - 1) * 6;
      const fx = cx - 18 + local * 24;
      if (fancy) {
        for (let k = 0; k < 3; k++) {
          px(ctx, fx - k * 4, fy - 1, 5, 3, 'rgba(255,255,255,' + (a * (1 - k * 0.3)).toFixed(2) + ')');
        }
        streak(ctx, fx - 14, fy, fx, fy, 'rgba(255,232,168,' + a + ')', 2);
      } else {
        streak(ctx, fx - 8, fy, fx, fy, '#fff', 1);
      }
    }
    if (fancy && p > 0.6) {
      star(ctx, cx, cy, 4, 'rgba(255,255,255,' + (1 - p).toFixed(2) + ')');
    }
  }

  // 4. growl — jagged red roar shape + concentric sound rings.
  function drawGrowl(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    for (let i = 0; i < 3; i++) {
      const r = 4 + (p + i * 0.18) * 22;
      const a = Math.max(0, 0.7 - (p + i * 0.15));
      ring(ctx, cx, cy, r, fancy ? 'rgba(248,80,80,' + a.toFixed(2) + ')' : '#f44', fancy ? 2 : 1);
    }
    if (fancy) {
      const pulse = 1 + Math.sin(p * 18) * 0.15;
      ctx.fillStyle = 'rgba(248,80,80,' + (0.9 * (1 - p)).toFixed(2) + ')';
      ctx.beginPath();
      ctx.moveTo(cx - 10 * pulse, cy);
      ctx.lineTo(cx - 6, cy - 6);
      ctx.lineTo(cx - 2, cy);
      ctx.lineTo(cx + 2, cy - 6);
      ctx.lineTo(cx + 6, cy);
      ctx.lineTo(cx + 10 * pulse, cy);
      ctx.lineTo(cx + 6, cy + 6);
      ctx.lineTo(cx - 6, cy + 6);
      ctx.closePath();
      ctx.fill();
    }
  }

  // 5. tailwhip — curved warm-peach tail sweeps across target with
  // bright tip, wind swish lines, and an impact pulse at the end of
  // the swing. (Reworked in v0.52.1 — the previous version used
  // grey-on-grey particles that vanished against most battle
  // backgrounds.)
  function drawTailWhip(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const startAng = -Math.PI * 0.7;
    const endAng   =  Math.PI * 0.7;
    const a = startAng + (endAng - startAng) * p;
    // 11-segment trailing tail.
    for (let i = 10; i >= 0; i--) {
      const t = i / 10;
      const segAng = a - t * 0.9;
      const segR = 22 - t * 4;
      const sx = cx + Math.cos(segAng) * segR;
      const sy = cy + 4 + Math.sin(segAng) * segR * 0.6;
      const thickness = fancy ? Math.max(1, 5 - i * 0.35) : 2;
      const alpha = (1 - t * 0.6);
      const col = fancy
        ? 'rgba(255,184,120,' + alpha.toFixed(2) + ')'
        : '#fb8';
      if (fancy) disc(ctx, sx, sy, thickness, col);
      else px(ctx, sx | 0, sy | 0, 2, 2, col);
    }
    // Bright white-yellow tip with halo.
    const tx = cx + Math.cos(a) * 22;
    const ty = cy + 4 + Math.sin(a) * 13;
    if (fancy) {
      gradientFill(ctx, tx, ty, 6, 'rgba(255,255,200,0.95)', 'rgba(248,200,80,0)');
      disc(ctx, tx, ty, 3, 'rgba(255,255,255,0.95)');
    } else {
      px(ctx, tx - 2, ty - 2, 5, 5, '#fff');
    }
    // Wind swish lines on the leading edge during mid-swing.
    if (fancy && p > 0.3 && p < 0.85) {
      for (let i = 0; i < 3; i++) {
        const sa = a + i * 0.15;
        streak(ctx, cx + Math.cos(sa) * 24, cy + 4 + Math.sin(sa) * 15,
                     cx + Math.cos(sa) * 28, cy + 4 + Math.sin(sa) * 17,
                     'rgba(255,255,255,' + (0.6 - i * 0.15).toFixed(2) + ')', 1);
      }
    }
    // Impact pulse at end of swing.
    if (p > 0.65) {
      const k = (p - 0.65) / 0.35;
      if (fancy) gradientFill(ctx, cx, cy, 8 + k * 12,
        'rgba(255,200,120,' + (0.5 * (1 - k)).toFixed(2) + ')',
        'rgba(248,144,80,0)');
      ring(ctx, cx, cy, 4 + k * 8,
        fancy ? 'rgba(255,232,168,' + (1 - k).toFixed(2) + ')' : '#fea',
        fancy ? 2 : 1);
    }
    // Dust kicks at ground.
    if (fancy && p > 0.45) {
      for (let i = 0; i < 5; i++) {
        const r2 = rng(i + 2);
        px(ctx, cx + (r2 - 0.5) * 22 | 0, cy + 12 + r2 * 4 | 0, 2, 2,
          'rgba(200,180,140,' + (0.85 * (1 - p)).toFixed(2) + ')');
      }
    }
  }

  // 6. lullaby — floating musical notes + drifting Z.
  function drawLullaby(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const notes = fancy ? 5 : 2;
    for (let i = 0; i < notes; i++) {
      const r = rng(i + 5);
      const phase = (p + r * 0.3) % 1;
      const nx = cx + Math.sin(phase * 6 + i) * 14 + (i - 2) * 6;
      const ny = cy + 12 - phase * 30;
      const a = (1 - phase).toFixed(2);
      const col = fancy ? (i & 1 ? 'rgba(184,144,232,' + a + ')' : 'rgba(232,200,184,' + a + ')') : '#fff';
      px(ctx, nx - 2, ny - 1, 4, 3, col);
      px(ctx, nx + 2, ny - 6, 1, 6, col);
      if (fancy && (i & 1) === 0) px(ctx, nx + 3, ny - 6, 3, 1, col);
    }
    if (fancy) {
      const zy = cy - 18 + Math.sin(p * 4) * 3;
      const za = (0.8 * (1 - p)).toFixed(2);
      ctx.fillStyle = 'rgba(200,200,255,' + za + ')';
      ctx.fillRect(cx + 14, zy, 5, 1);
      ctx.fillRect(cx + 14, zy + 4, 5, 1);
      ctx.fillRect(cx + 14, zy, 1, 5);
      ctx.fillRect(cx + 18, zy, 1, 5);
    }
  }

  // 7. harden — cyan-silver hex shell locks around target with a
  // bright click-flash. (Reworked in v0.52.1 — old grey-blue palette
  // was too close to typical battle backgrounds to read.)
  function drawHarden(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const segs = 6;
    const r = fancy ? 16 - Math.min(1, p * 1.4) * 4 : 14;
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2 + p * 0.4;
      const sx = cx + Math.cos(a) * r;
      const sy = cy + Math.sin(a) * r;
      // Cyan-silver hex with bright white core for visibility.
      px(ctx, sx - 3, sy - 3, 7, 7, fancy ? 'rgba(80,144,200,0.95)' : '#48a');
      px(ctx, sx - 2, sy - 2, 5, 5, fancy ? 'rgba(168,232,255,0.95)' : '#aef');
      if (fancy) {
        px(ctx, sx - 1, sy - 1, 3, 3, 'rgba(232,248,255,0.95)');
        px(ctx, sx, sy, 1, 1, 'rgba(255,255,255,1)');
      }
    }
    if (fancy) {
      // Outer halo that brightens with shell engagement.
      gradientFill(ctx, cx, cy, r + 6,
        'rgba(168,232,255,' + (0.35 + 0.25 * Math.sin(p * 8)).toFixed(2) + ')',
        'rgba(80,144,200,0)');
    }
    if (p > 0.5) {
      const k = (p - 0.5) / 0.5;
      if (fancy) {
        // 6-spoke bright shine on lock-click.
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          streak(ctx, cx + Math.cos(a) * 4, cy + Math.sin(a) * 4,
                       cx + Math.cos(a) * (r + 6), cy + Math.sin(a) * (r + 6),
                       'rgba(232,255,255,' + (0.9 * (1 - k)).toFixed(2) + ')', 2);
        }
      }
      ring(ctx, cx, cy, r + 2,
        fancy ? 'rgba(232,255,255,' + (1 - k).toFixed(2) + ')' : '#cff',
        fancy ? 2 : 1);
      star(ctx, cx, cy, 5, fancy ? 'rgba(255,255,255,' + (1 - k).toFixed(2) + ')' : '#fff');
    }
  }

  // 8. screech — concentric jagged wave-fronts radiating outward.
  function drawScreech(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const waves = fancy ? 4 : 2;
    for (let i = 0; i < waves; i++) {
      const r = 4 + ((p + i * 0.22) % 1) * 28;
      const a = Math.max(0, 0.85 - r * 0.025);
      ctx.strokeStyle = fancy ? 'rgba(248,232,168,' + a.toFixed(2) + ')' : '#fe8';
      ctx.lineWidth = fancy ? 2 : 1;
      ctx.beginPath();
      const n = 12;
      for (let k = 0; k <= n; k++) {
        const ang = k / n * Math.PI * 2;
        const jag = (k & 1) ? 1 : 0.82;
        const x2 = cx + Math.cos(ang) * r * jag;
        const y2 = cy + Math.sin(ang) * r * jag;
        if (k === 0) ctx.moveTo(x2, y2); else ctx.lineTo(x2, y2);
      }
      ctx.stroke();
    }
  }

  // 9. ember — small puff of tumbling embers, low intensity.
  function drawEmber(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const motes = fancy ? 6 : 3;
    for (let i = 0; i < motes; i++) {
      const r = rng(i + 3);
      const dx = (r - 0.5) * 24;
      const dy = 6 - p * 16 + Math.sin(p * 6 + i) * 2;
      const a = (1 - p) * (0.85 - r * 0.2);
      const col = fancy ? (r > 0.5 ? 'rgba(248,176,32,' + a.toFixed(2) + ')' : 'rgba(248,80,8,' + a.toFixed(2) + ')')
                        : '#f80';
      px(ctx, cx + dx | 0, cy + dy | 0, fancy ? 2 : 1, fancy ? 2 : 1, col);
    }
    if (fancy) {
      gradientFill(ctx, cx, cy + 4, 12, 'rgba(248,120,16,' + (0.4 * (1 - p)).toFixed(2) + ')', 'rgba(248,80,8,0)');
    }
  }

  // 10. vinelash — three curling vines whip around target with leaf flicks.
  function drawVineLash(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const stages = [0, 0.22, 0.44];
    for (let i = 0; i < 3; i++) {
      const local = (p - stages[i]) / 0.4;
      if (local <= 0 || local > 1) continue;
      const baseAng = (i / 3) * Math.PI * 2;
      const segs = 10;
      ctx.strokeStyle = fancy ? 'rgba(72,168,72,0.95)' : '#4a8';
      ctx.lineWidth = fancy ? 3 : 1;
      ctx.beginPath();
      for (let k = 0; k <= segs; k++) {
        const t = k / segs;
        const rr = 22 * (1 - t * local);
        const ang = baseAng + t * Math.PI * 1.2 - local * 0.6;
        const x = cx + Math.cos(ang) * rr;
        const y = cy + Math.sin(ang) * rr;
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      if (fancy) {
        const ang = baseAng + Math.PI * 1.2 - local * 0.6;
        const lx = cx + Math.cos(ang) * 22 * (1 - local);
        const ly = cy + Math.sin(ang) * 22 * (1 - local);
        px(ctx, lx - 1, ly - 1, 3, 3, 'rgba(96,200,96,0.95)');
      }
    }
  }

  // 11. bugbite — wing flutter trails + mandible bite-converge.
  function drawBugBite(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    if (p < 0.6) {
      const flap = Math.sin(p * 30);
      const wy = cy - 4 + flap * 3;
      for (let s = -1; s <= 1; s += 2) {
        const wx = cx + s * 16;
        ctx.fillStyle = fancy ? 'rgba(168,200,120,0.85)' : '#aa6';
        ctx.beginPath();
        ctx.ellipse(wx, wy, 6, 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (p > 0.35) {
      const k = Math.min(1, (p - 0.35) / 0.35);
      const opn = (1 - k) * 8 + 2;
      const my = cy - 12 + k * 8;
      for (let s = -1; s <= 1; s += 2) {
        const col = fancy ? 'rgba(72,56,32,0.95)' : '#642';
        streak(ctx, cx + s * opn, my - 4, cx + s * (opn - 2), my + 2, col, fancy ? 3 : 2);
      }
      if (fancy && k > 0.6) {
        star(ctx, cx, cy - 4, 3, 'rgba(255,232,168,' + (1 - k).toFixed(2) + ')');
      }
    }
  }

  // 12. pinmissile — needle projectiles fanning inward, staggered.
  function drawPinMissile(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const n = fancy ? 6 : 3;
    for (let i = 0; i < n; i++) {
      const delay = i * 0.08;
      const local = (p - delay) / 0.5;
      if (local <= 0 || local > 1) continue;
      const ang = -Math.PI / 2 + (i - n / 2) * 0.3;
      const dist = 32 * (1 - local);
      const nx = cx + Math.cos(ang) * dist;
      const ny = cy + Math.sin(ang) * dist;
      const tipCol = fancy ? 'rgba(232,232,255,0.95)' : '#fff';
      const shaftCol = fancy ? 'rgba(120,144,168,0.85)' : '#aaa';
      streak(ctx, nx, ny, nx + Math.cos(ang) * 6, ny + Math.sin(ang) * 6, shaftCol, fancy ? 2 : 1);
      px(ctx, nx - 1, ny - 1, 2, 2, tipCol);
    }
  }

  // 13. poisonsting — sharp purple stinger thrust + droplet trail.
  function drawPoisonSting(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const k = Math.min(1, p / 0.55);
    const sx = cx - 28 + k * 28;
    streak(ctx, sx - 12, cy, sx, cy, fancy ? 'rgba(168,80,184,0.95)' : '#a4a', fancy ? 3 : 2);
    px(ctx, sx, cy - 1, fancy ? 4 : 3, fancy ? 3 : 2, fancy ? 'rgba(232,184,248,0.95)' : '#caf');
    if (fancy) {
      for (let i = 0; i < 3; i++) {
        const tx = sx - 6 - i * 5;
        const ty = cy + i * 2;
        px(ctx, tx, ty, 2, 2, 'rgba(168,80,184,' + (0.7 - i * 0.2).toFixed(2) + ')');
      }
    }
    if (p > 0.5) {
      const ik = (p - 0.5) / 0.5;
      gradientFill(ctx, cx, cy, 8 + ik * 6, 'rgba(168,80,184,' + (0.5 * (1 - ik)).toFixed(2) + ')', 'rgba(168,80,184,0)');
    }
  }

  // 14. acidspray — bubbling green corrosive spray.
  function drawAcidSpray(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    if (fancy) {
      gradientFill(ctx, cx, cy + 2, 8 + p * 14, 'rgba(120,200,80,' + (0.55 * (1 - p)).toFixed(2) + ')', 'rgba(120,200,80,0)');
    }
    const bubbles = fancy ? 8 : 3;
    for (let i = 0; i < bubbles; i++) {
      const r = rng(i + 7);
      const phase = (p + r * 0.4) % 1;
      const bx = cx + (r - 0.5) * 28;
      const by = cy + 6 - phase * 16;
      const sz = (1 - phase) * (fancy ? 4 : 2);
      if (sz < 0.8) continue;
      const col = fancy ? 'rgba(96,200,96,' + (0.9 - phase * 0.5).toFixed(2) + ')' : '#6c6';
      disc(ctx, bx, by, sz, col);
      if (fancy) px(ctx, bx - 1, by - 1, 1, 1, 'rgba(232,255,200,0.9)');
    }
  }

  // 15. toxicspike — caltrops slam from above + toxic mist.
  function drawToxicSpike(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const n = fancy ? 5 : 3;
    for (let i = 0; i < n; i++) {
      const r = rng(i + 11);
      const delay = i * 0.06;
      const local = (p - delay) / 0.55;
      if (local <= 0 || local > 1) continue;
      const sx = cx + (r - 0.5) * 28;
      const sy = cy - 24 + local * 28;
      ctx.fillStyle = fancy ? 'rgba(120,72,168,0.95)' : '#74a';
      ctx.beginPath();
      ctx.moveTo(sx, sy - 4);
      ctx.lineTo(sx + 4, sy);
      ctx.lineTo(sx, sy + 4);
      ctx.lineTo(sx - 4, sy);
      ctx.closePath();
      ctx.fill();
      if (fancy && local > 0.85) px(ctx, sx - 1, sy + 4, 3, 1, 'rgba(168,120,200,0.7)');
    }
    if (fancy && p > 0.65) {
      gradientFill(ctx, cx, cy + 4, 14, 'rgba(168,120,200,' + (0.4 * (1 - p)).toFixed(2) + ')', 'rgba(168,120,200,0)');
    }
  }

  // 16. rocktoss — rock chunks arcing in + cracks + dust on impact.
  function drawRockToss(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const n = fancy ? 5 : 3;
    for (let i = 0; i < n; i++) {
      const r = rng(i + 13);
      const delay = i * 0.05;
      const local = (p - delay) / 0.55;
      if (local <= 0 || local > 1) continue;
      const sx0 = cx + (r - 0.5) * 50;
      const sy0 = cy - 18;
      const rx = sx0 + (cx - sx0) * local;
      const ry = sy0 + (cy + 2 - sy0) * local + Math.sin(local * Math.PI) * -8;
      const sz = fancy ? 4 : 3;
      const col = fancy ? (r > 0.5 ? 'rgba(168,120,72,0.95)' : 'rgba(120,88,56,0.95)') : '#864';
      px(ctx, rx - sz / 2, ry - sz / 2, sz, sz, col);
    }
    if (p > 0.55) {
      const k = (p - 0.55) / 0.45;
      if (fancy) {
        for (let i = 0; i < 4; i++) {
          const ang = (i / 4) * Math.PI * 2;
          const r2 = 6 + k * 14;
          streak(ctx, cx, cy + 4, cx + Math.cos(ang) * r2, cy + 4 + Math.sin(ang) * r2 * 0.4, 'rgba(72,56,40,' + (0.9 * (1 - k)).toFixed(2) + ')', 2);
        }
      }
      for (let i = 0; i < 6; i++) {
        const r2 = rng(i + 17);
        px(ctx, cx + (r2 - 0.5) * 26 | 0, cy + 6 + r2 * 4 | 0, 2, 2, 'rgba(200,180,140,' + (0.7 * (1 - k)).toFixed(2) + ')');
      }
    }
  }

  // 17. earthbump — vertical earth pillar erupting from beneath.
  function drawEarthBump(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const k = Math.min(1, p / 0.6);
    const pillarH = k * 24;
    ctx.fillStyle = fancy ? 'rgba(168,120,72,0.92)' : '#864';
    ctx.fillRect(cx - 7, cy + 4 - pillarH, 14, pillarH + 4);
    if (fancy) {
      ctx.fillStyle = 'rgba(232,200,144,0.6)';
      ctx.fillRect(cx - 2, cy + 4 - pillarH, 2, pillarH + 2);
    }
    if (fancy && p > 0.3) {
      for (let i = 0; i < 6; i++) {
        const r = rng(i + 19);
        const pop = (p - 0.3) / 0.5;
        const dx = (r - 0.5) * 28 * pop;
        const dy = -pop * 20 + pop * pop * 18;
        px(ctx, cx + dx | 0, cy + 2 + dy | 0, 2, 2, 'rgba(120,88,56,' + (1 - pop).toFixed(2) + ')');
      }
    }
    if (p > 0.55 && fancy) {
      const k2 = (p - 0.55) / 0.45;
      gradientFill(ctx, cx, cy + 4 - pillarH, 10, 'rgba(232,200,144,' + (0.6 * (1 - k2)).toFixed(2) + ')', 'rgba(168,120,72,0)');
    }
  }

  // 18. sandattack — horizontal sand cloud + tan motes.
  function drawSandAttack(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    if (fancy) {
      gradientFill(ctx, cx - 4 + p * 8, cy, 14 + p * 8, 'rgba(232,200,144,' + (0.55 * (1 - p)).toFixed(2) + ')', 'rgba(232,200,144,0)');
    }
    const motes = fancy ? 12 : 5;
    for (let i = 0; i < motes; i++) {
      const r = rng(i + 23);
      const dx = -16 + (p + r * 0.4) * 36 - (r * 0.4 + 0.2) * 8;
      const dy = (r - 0.5) * 10 + Math.sin(p * 10 + i) * 2;
      const col = fancy ? (r > 0.5 ? 'rgba(232,200,144,0.95)' : 'rgba(184,160,112,0.95)') : '#dca';
      px(ctx, cx + dx | 0, cy + dy | 0, fancy ? 2 : 1, fancy ? 2 : 1, col);
    }
  }

  // 19. focusjab — concentration ring tightens, then impact starburst.
  function drawFocusJab(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    if (p < 0.55) {
      const k = p / 0.55;
      const r = 24 * (1 - k) + 6;
      ring(ctx, cx, cy, r, fancy ? 'rgba(232,144,72,' + (0.85 * k).toFixed(2) + ')' : '#fa6', fancy ? 2 : 1);
    }
    if (p > 0.5) {
      const k = (p - 0.5) / 0.5;
      if (fancy) {
        gradientFill(ctx, cx, cy, 6 + k * 10, 'rgba(248,200,80,' + (0.7 * (1 - k)).toFixed(2) + ')', 'rgba(248,80,8,0)');
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const r0 = 4, r1 = 4 + k * 12;
          streak(ctx, cx + Math.cos(a) * r0, cy + Math.sin(a) * r0,
                      cx + Math.cos(a) * r1, cy + Math.sin(a) * r1,
                      'rgba(255,232,168,' + (1 - k).toFixed(2) + ')', 2);
        }
      } else {
        ring(ctx, cx, cy, 4 + k * 8, '#fc8', 1);
        star(ctx, cx, cy, 4, '#fff');
      }
    }
  }

  // 20. palmstrike — open palm + shockwave pulse + dust ring.
  function drawPalmStrike(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    if (p < 0.45) {
      const k = p / 0.45;
      const px2 = cx - 20 + k * 18;
      ctx.fillStyle = fancy ? 'rgba(248,200,144,0.9)' : '#fc8';
      ctx.fillRect(px2 - 6, cy - 5, 6, 10);
      ctx.fillRect(px2 - 8, cy - 6, 2, 3);
    }
    if (p > 0.4) {
      const k = (p - 0.4) / 0.6;
      const r = 4 + k * 22;
      if (fancy) {
        gradientFill(ctx, cx, cy, r, 'rgba(248,232,168,' + (0.7 * (1 - k)).toFixed(2) + ')', 'rgba(248,200,80,0)');
        ring(ctx, cx, cy, r, 'rgba(255,255,255,' + (0.9 * (1 - k)).toFixed(2) + ')', 2);
      } else {
        ring(ctx, cx, cy, r, '#fff', 1);
      }
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const rr = r * 1.1;
        px(ctx, cx + Math.cos(a) * rr | 0, cy + 8 + Math.sin(a) * 2 | 0, 2, 2, 'rgba(200,180,140,' + (0.7 * (1 - k)).toFixed(2) + ')');
      }
    }
  }

  // 21. shimmer — wavy refraction lines + pastel halo.
  function drawShimmer(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    if (fancy) {
      gradientFill(ctx, cx, cy, 22, 'rgba(232,184,248,' + (0.45 * (1 - p)).toFixed(2) + ')', 'rgba(184,200,232,0)');
    }
    const lines = fancy ? 6 : 3;
    for (let i = 0; i < lines; i++) {
      const ly = cy - 12 + i * 5;
      const off = Math.sin(p * 12 + i * 0.6) * 5;
      const col = fancy ? 'rgba(248,216,232,' + (0.85 - i * 0.1).toFixed(2) + ')' : '#fcf';
      streak(ctx, cx - 14 + off, ly, cx + 14 + off, ly, col, fancy ? 2 : 1);
    }
    if (fancy && p > 0.6) {
      star(ctx, cx + 8, cy - 6, 3, 'rgba(255,255,255,' + (1 - p).toFixed(2) + ')');
    }
  }

  // 22. dazzle — twinkling stars rotating around target like a tiara.
  function drawDazzle(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const n = fancy ? 7 : 4;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + p * Math.PI * 2;
      const rOrbit = 18;
      const sx = cx + Math.cos(a) * rOrbit;
      const sy = cy + Math.sin(a) * rOrbit * 0.6;
      const twink = Math.sin(p * 18 + i) * 0.5 + 0.5;
      const sz = 2 + Math.floor(twink * 3);
      const col = fancy ? (i & 1 ? 'rgba(248,232,168,0.95)' : 'rgba(232,200,248,0.95)') : '#fef';
      star(ctx, sx, sy, sz, col);
    }
    if (fancy) {
      gradientFill(ctx, cx, cy, 16, 'rgba(248,232,200,' + (0.3 * Math.sin(p * Math.PI)).toFixed(2) + ')', 'rgba(248,200,168,0)');
    }
  }

  // 23. hypnoray — slow-rotating hypnotic spiral + concentric rings.
  function drawHypnoRay(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const arms = fancy ? 24 : 12;
    const rotation = p * Math.PI * 2;
    for (let i = 0; i < arms; i++) {
      const t = i / arms;
      const ang = rotation + t * Math.PI * 4;
      const rr = t * 18;
      const col = fancy ? (i & 1 ? 'rgba(144,96,200,0.9)' : 'rgba(232,200,255,0.9)') : '#a6c';
      const x = cx + Math.cos(ang) * rr;
      const y = cy + Math.sin(ang) * rr * 0.7;
      px(ctx, x - 1, y - 1, fancy ? 3 : 2, fancy ? 3 : 2, col);
    }
    for (let i = 0; i < 3; i++) {
      const rr = 6 + i * 6;
      ring(ctx, cx, cy, rr, fancy ? 'rgba(184,144,232,0.65)' : '#a6c', 1);
    }
  }

  // 24. agility — cyan speed-line trails radiating outward.
  function drawAgility(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const n = fancy ? 12 : 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r0 = 6 + p * 8;
      const r1 = 14 + p * 16;
      const col = fancy ? 'rgba(128,232,232,' + (0.85 * (1 - p)).toFixed(2) + ')' : '#8ee';
      streak(ctx, cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.7,
                  cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.7,
                  col, fancy ? 2 : 1);
    }
    if (fancy && p < 0.5) {
      gradientFill(ctx, cx, cy, 10, 'rgba(168,248,248,' + (0.5 * (1 - p * 2)).toFixed(2) + ')', 'rgba(128,232,232,0)');
    }
  }

  // 25. bite — two crescent fangs converge on target with dark pulse.
  function drawBite(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const k = Math.min(1, p / 0.55);
    const gap = (1 - k) * 14 + 2;
    for (let s = -1; s <= 1; s += 2) {
      const fy = cy + s * gap;
      ctx.fillStyle = fancy ? 'rgba(255,255,255,0.95)' : '#fff';
      ctx.beginPath();
      ctx.moveTo(cx - 10, fy);
      ctx.quadraticCurveTo(cx, fy + s * -6, cx + 10, fy);
      ctx.quadraticCurveTo(cx, fy + s * -3, cx - 10, fy);
      ctx.closePath();
      ctx.fill();
    }
    if (p > 0.5) {
      const ik = (p - 0.5) / 0.5;
      if (fancy) {
        gradientFill(ctx, cx, cy, 6 + ik * 12, 'rgba(40,16,32,' + (0.55 * (1 - ik)).toFixed(2) + ')', 'rgba(40,16,32,0)');
      }
      if (ik > 0.3) star(ctx, cx, cy, 4, 'rgba(255,232,168,' + (1 - ik).toFixed(2) + ')');
    }
  }

  // 26. freezewind — crystalline ice shards swirling cyclone-like.
  function drawFreezeWind(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const shards = fancy ? 10 : 4;
    for (let i = 0; i < shards; i++) {
      const r = rng(i + 29);
      const angBase = (i / shards) * Math.PI * 2;
      const ang = angBase + p * Math.PI * 3;
      const rad = 8 + r * 14;
      const sx = cx + Math.cos(ang) * rad;
      const sy = cy + Math.sin(ang) * rad * 0.6;
      ctx.fillStyle = fancy ? (r > 0.5 ? 'rgba(200,232,248,0.95)' : 'rgba(168,216,248,0.95)') : '#aef';
      ctx.beginPath();
      ctx.moveTo(sx, sy - 3);
      ctx.lineTo(sx + 2, sy);
      ctx.lineTo(sx, sy + 3);
      ctx.lineTo(sx - 2, sy);
      ctx.closePath();
      ctx.fill();
    }
    if (fancy) {
      gradientFill(ctx, cx, cy, 20, 'rgba(200,232,248,' + (0.3 * (1 - p)).toFixed(2) + ')', 'rgba(168,216,248,0)');
    }
  }

  // 27. spectralhowl — ghostly face overlay + sound waves.
  function drawSpectralHowl(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    for (let i = 0; i < 3; i++) {
      const r = 4 + ((p + i * 0.22) % 1) * 24;
      ring(ctx, cx, cy, r, fancy ? 'rgba(168,144,232,' + Math.max(0, 0.7 - r * 0.02).toFixed(2) + ')' : '#a8e', fancy ? 2 : 1);
    }
    if (fancy) {
      const wob = Math.sin(p * 14) * 2;
      const a = (0.85 * (1 - p * 0.5)).toFixed(2);
      ctx.fillStyle = 'rgba(120,96,168,' + a + ')';
      ctx.fillRect(cx - 6 + wob, cy - 4, 3, 4);
      ctx.fillRect(cx + 3 + wob, cy - 4, 3, 4);
      ctx.beginPath();
      ctx.ellipse(cx + wob, cy + 4, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 28. ghostgrip — spectral hand reaches up + grips target.
  function drawGhostGrip(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const k = Math.min(1, p / 0.55);
    const hy = cy + 18 - k * 22;
    if (fancy) {
      ctx.fillStyle = 'rgba(168,144,232,0.85)';
      ctx.beginPath();
      ctx.ellipse(cx, hy + 4, 8, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = -1; i <= 2; i++) {
        const fx = cx + i * 3 - 1;
        ctx.fillRect(fx, hy - 6, 2, 10);
      }
      ctx.fillRect(cx - 8, hy, 2, 6);
    } else {
      px(ctx, cx - 5, hy - 4, 10, 8, '#a8e');
    }
    if (p > 0.5) {
      const ik = (p - 0.5) / 0.5;
      const sh = Math.sin(p * 40) * 2;
      if (fancy) {
        ring(ctx, cx + sh, cy + sh, 12 - ik * 4, 'rgba(120,96,168,' + (0.9 * (1 - ik)).toFixed(2) + ')', 2);
        gradientFill(ctx, cx, cy, 14, 'rgba(80,56,120,' + (0.4 * (1 - ik)).toFixed(2) + ')', 'rgba(80,56,120,0)');
      }
    }
  }

  // 29. dragonbreath — multi-colour flame jet (gold envelope, purple core).
  function drawDragonBreath(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const k = Math.min(1, p / 0.5);
    const len = k * 32;
    if (fancy) {
      const grad = ctx.createLinearGradient(cx - len, cy, cx, cy);
      grad.addColorStop(0, 'rgba(248,200,80,0)');
      grad.addColorStop(0.4, 'rgba(248,200,80,0.85)');
      grad.addColorStop(1, 'rgba(168,72,200,0.95)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(cx - len, cy - 1);
      ctx.quadraticCurveTo(cx - len * 0.5, cy - 8, cx, cy - 4);
      ctx.quadraticCurveTo(cx + 4, cy, cx, cy + 4);
      ctx.quadraticCurveTo(cx - len * 0.5, cy + 8, cx - len, cy + 1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(200,120,232,0.85)';
      ctx.fillRect(cx - len * 0.7, cy - 2, len * 0.7, 4);
      for (let i = 0; i < 8; i++) {
        const r = rng(i + 31);
        const sx = cx - r * len;
        const sy = cy + (r - 0.5) * 8;
        px(ctx, sx, sy, 1, 1, 'rgba(248,232,168,' + (0.9 - r * 0.3).toFixed(2) + ')');
      }
    } else {
      streak(ctx, cx - len, cy, cx, cy, '#f8c', 3);
    }
    if (p > 0.55) {
      const ik = (p - 0.55) / 0.45;
      gradientFill(ctx, cx, cy, 8 + ik * 8, 'rgba(248,200,80,' + (0.7 * (1 - ik)).toFixed(2) + ')', 'rgba(168,72,200,0)');
    }
  }

  // 30. fairykiss — heart bloom + lip-kiss outline + sparkle ring.
  function drawFairyKiss(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const k = Math.min(1, p / 0.6);
    if (fancy) {
      const a = (1 - p * 0.5).toFixed(2);
      const sz = 4 + k * 4;
      disc(ctx, cx - sz * 0.6, cy - sz * 0.3, sz * 0.7, 'rgba(248,144,200,' + a + ')');
      disc(ctx, cx + sz * 0.6, cy - sz * 0.3, sz * 0.7, 'rgba(248,144,200,' + a + ')');
      ctx.fillStyle = 'rgba(248,144,200,' + a + ')';
      ctx.beginPath();
      ctx.moveTo(cx - sz, cy);
      ctx.lineTo(cx + sz, cy);
      ctx.lineTo(cx, cy + sz * 1.4);
      ctx.closePath();
      ctx.fill();
      px(ctx, cx - sz * 0.5, cy - sz * 0.5, 2, 2, 'rgba(255,232,248,0.95)');
    } else {
      px(ctx, cx - 3, cy - 2, 7, 5, '#f8a');
    }
    if (fancy) {
      const sparks = 6;
      for (let i = 0; i < sparks; i++) {
        const a = (i / sparks) * Math.PI * 2 + p * 2;
        const rOrb = 14;
        star(ctx, cx + Math.cos(a) * rOrb, cy + Math.sin(a) * rOrb * 0.7,
             1 + Math.floor(Math.sin(p * 16 + i) * 1.5 + 1.5),
             'rgba(255,232,248,' + (0.9 * (1 - p * 0.4)).toFixed(2) + ')');
      }
    }
    if (p > 0.5 && fancy) {
      const ik = (p - 0.5) / 0.5;
      ctx.strokeStyle = 'rgba(248,144,200,' + (1 - ik).toFixed(2) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy);
      ctx.quadraticCurveTo(cx, cy - 3, cx + 4, cy);
      ctx.quadraticCurveTo(cx, cy + 3, cx - 4, cy);
      ctx.stroke();
    }
  }

  // ---- 30 more signature move effects (v0.51.0) ------------------------
  // New moves added in tandem to js/data.js MOVES. Each follows the same
  // tier-branched pattern: rich DS Diamond render + stripped GB/GBC/GBA.

  // 31. megapunch — wind-up ring → giant glove punches in with screen flash.
  function drawMegaPunch(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    if (p < 0.45) {
      const k = p / 0.45;
      // Wind-up: focusing ring tightens.
      const r = 30 * (1 - k) + 8;
      ring(ctx, cx, cy, r, fancy ? 'rgba(232,144,72,' + (0.9 * k).toFixed(2) + ')' : '#fa6', fancy ? 2 : 1);
    }
    if (p > 0.4) {
      const k = (p - 0.4) / 0.6;
      const fx = cx - 22 + k * 22;
      // Glove (large rounded rect).
      const col = fancy ? 'rgba(232,144,72,0.95)' : '#fa6';
      ctx.fillStyle = col;
      ctx.fillRect(fx - 10, cy - 7, 12, 14);
      ctx.fillStyle = fancy ? 'rgba(255,200,144,0.9)' : '#fda';
      ctx.fillRect(fx - 8, cy - 5, 8, 10);
      // Impact flash.
      if (k > 0.6) {
        const ik = (k - 0.6) / 0.4;
        if (fancy) {
          gradientFill(ctx, cx, cy, 8 + ik * 14, 'rgba(255,232,168,' + (0.85 * (1 - ik)).toFixed(2) + ')', 'rgba(255,232,168,0)');
        }
        star(ctx, cx, cy, 5, 'rgba(255,255,255,' + (1 - ik).toFixed(2) + ')');
      }
    }
  }

  // 32. bodyslam — silhouette drops from top, dust-ring shockwave on contact.
  function drawBodySlam(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    if (p < 0.55) {
      const k = p / 0.55;
      const sy = cy - 30 + k * 28;
      // Silhouette: dark oblong shape.
      const col = fancy ? 'rgba(40,32,40,0.85)' : '#322';
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(cx, sy, 12, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      // Speed lines above.
      for (let i = 0; i < 4; i++) {
        const lx = cx + (i - 1.5) * 6;
        streak(ctx, lx, sy - 18, lx, sy - 8, fancy ? 'rgba(255,255,255,0.6)' : '#fff', 1);
      }
    } else {
      const k = (p - 0.55) / 0.45;
      // Dust shockwave.
      const r = 8 + k * 24;
      if (fancy) {
        gradientFill(ctx, cx, cy + 6, r, 'rgba(232,200,144,' + (0.7 * (1 - k)).toFixed(2) + ')', 'rgba(200,180,140,0)');
      }
      ring(ctx, cx, cy + 6, r, fancy ? 'rgba(200,180,140,' + (0.85 * (1 - k)).toFixed(2) + ')' : '#dca', fancy ? 2 : 1);
      // Dust motes.
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const dx = cx + Math.cos(a) * r;
        const dy = cy + 6 + Math.sin(a) * 2;
        px(ctx, dx | 0, dy | 0, 2, 2, 'rgba(200,180,140,' + (0.7 * (1 - k)).toFixed(2) + ')');
      }
    }
  }

  // 33. magmaburst — fire pillar erupts from the ground + lava splatter.
  function drawMagmaBurst(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const k = Math.min(1, p / 0.55);
    const pillarH = k * 30;
    // Pillar of fire.
    if (fancy) {
      const grad = ctx.createLinearGradient(0, cy + 8, 0, cy + 8 - pillarH);
      grad.addColorStop(0, 'rgba(248,80,8,0.95)');
      grad.addColorStop(0.5, 'rgba(248,176,32,0.92)');
      grad.addColorStop(1, 'rgba(255,232,168,0.6)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy + 8);
      ctx.quadraticCurveTo(cx - 4, cy + 8 - pillarH * 0.5, cx, cy + 8 - pillarH);
      ctx.quadraticCurveTo(cx + 4, cy + 8 - pillarH * 0.5, cx + 8, cy + 8);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = '#f80';
      ctx.fillRect(cx - 4, cy + 8 - pillarH, 8, pillarH);
    }
    // Lava splatter at the top + ember motes flying.
    if (p > 0.3) {
      for (let i = 0; i < (fancy ? 10 : 4); i++) {
        const r = rng(i + 33);
        const pop = (p - 0.3) / 0.7;
        const ang = (i / 10) * Math.PI * 2;
        const dist = pop * (12 + r * 18);
        const dx = Math.cos(ang) * dist;
        const dy = -pop * 14 - Math.sin(ang) * dist * 0.5;
        const col = fancy ? (r > 0.5 ? 'rgba(248,176,32,' + (1 - pop).toFixed(2) + ')' : 'rgba(248,80,8,' + (1 - pop).toFixed(2) + ')') : '#f80';
        px(ctx, cx + dx | 0, cy + 8 - pillarH + dy | 0, 2, 2, col);
      }
    }
  }

  // 34. solarflare — focused ray descends from sky-disc, scorch ring at landing.
  function drawSolarFlare(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    // Sky-disc at top.
    if (fancy) {
      const dy = cy - 36;
      gradientFill(ctx, cx, dy, 10, 'rgba(255,232,80,0.95)', 'rgba(248,200,80,0)');
      ring(ctx, cx, dy, 8, 'rgba(255,255,200,' + (0.8 - p * 0.5).toFixed(2) + ')', 2);
    }
    // Beam descending.
    if (p > 0.25) {
      const k = (p - 0.25) / 0.4;
      const beamY1 = cy - 36;
      const beamY2 = cy - 36 + k * 30;
      const grad = fancy ? ctx.createLinearGradient(cx, beamY1, cx, beamY2) : null;
      if (fancy) {
        grad.addColorStop(0, 'rgba(255,232,80,0.9)');
        grad.addColorStop(1, 'rgba(255,200,80,0.85)');
        ctx.fillStyle = grad;
        ctx.fillRect(cx - 4, beamY1, 8, beamY2 - beamY1);
      } else {
        ctx.fillStyle = '#fe4';
        ctx.fillRect(cx - 2, beamY1, 4, beamY2 - beamY1);
      }
    }
    // Scorch ring at landing.
    if (p > 0.55) {
      const k = (p - 0.55) / 0.45;
      const r = 4 + k * 18;
      if (fancy) {
        gradientFill(ctx, cx, cy + 4, r, 'rgba(248,200,80,' + (0.85 * (1 - k)).toFixed(2) + ')', 'rgba(248,80,8,0)');
        ring(ctx, cx, cy + 4, r, 'rgba(255,255,168,' + (1 - k).toFixed(2) + ')', 2);
      } else {
        ring(ctx, cx, cy + 4, r, '#fe8', 1);
      }
    }
  }

  // 35. tidalwave — full-width blue wave sweeps with foam crest.
  function drawTidalWave(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    // Wave silhouette sweeping left → right.
    const xOff = -30 + p * 70;
    if (fancy) {
      ctx.fillStyle = 'rgba(56,136,232,0.75)';
      ctx.beginPath();
      ctx.moveTo(cx - 28 + xOff, cy + 12);
      ctx.quadraticCurveTo(cx + xOff, cy - 14, cx + 28 + xOff, cy + 12);
      ctx.lineTo(cx + 28 + xOff, cy + 16);
      ctx.lineTo(cx - 28 + xOff, cy + 16);
      ctx.closePath();
      ctx.fill();
      // Foam crest.
      ctx.fillStyle = 'rgba(232,248,255,0.95)';
      for (let i = 0; i < 5; i++) {
        const fx = cx - 20 + xOff + i * 10;
        const fy = cy - 10 + Math.sin(p * 8 + i) * 3;
        px(ctx, fx, fy, 3, 2, 'rgba(232,248,255,0.95)');
      }
      // Splash droplets.
      for (let i = 0; i < 8; i++) {
        const r = rng(i + 35);
        const dx = (r - 0.5) * 50;
        const dy = -8 - r * 8;
        px(ctx, cx + dx + xOff | 0, cy + dy | 0, 1, 1, 'rgba(168,200,248,0.85)');
      }
    } else {
      ctx.fillStyle = '#48c';
      ctx.fillRect(cx - 16 + xOff, cy - 4, 28, 14);
    }
  }

  // 36. icebeam — cyan beam converges to target, crystals form on impact.
  function drawIceBeam(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    if (p < 0.55) {
      const k = p / 0.55;
      const bx1 = cx - 36 + k * 22;
      const bx2 = cx - 14 + k * 22;
      if (fancy) {
        const grad = ctx.createLinearGradient(bx1, cy, bx2, cy);
        grad.addColorStop(0, 'rgba(168,216,248,0)');
        grad.addColorStop(0.5, 'rgba(200,232,248,0.95)');
        grad.addColorStop(1, 'rgba(248,255,255,0.95)');
        ctx.fillStyle = grad;
        ctx.fillRect(bx1, cy - 2, bx2 - bx1, 4);
      } else {
        streak(ctx, bx1, cy, bx2, cy, '#aef', 2);
      }
    }
    if (p > 0.5) {
      const k = (p - 0.5) / 0.5;
      // Crystals form: 5 diamond shapes around target.
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2;
        const r = 14 - k * 4;
        const sx = cx + Math.cos(ang) * r;
        const sy = cy + Math.sin(ang) * r * 0.7;
        ctx.fillStyle = fancy ? 'rgba(200,232,248,0.95)' : '#aef';
        ctx.beginPath();
        ctx.moveTo(sx, sy - 4);
        ctx.lineTo(sx + 3, sy);
        ctx.lineTo(sx, sy + 4);
        ctx.lineTo(sx - 3, sy);
        ctx.closePath();
        ctx.fill();
      }
      if (fancy) {
        gradientFill(ctx, cx, cy, 16, 'rgba(248,255,255,' + (0.4 * (1 - k)).toFixed(2) + ')', 'rgba(168,216,248,0)');
      }
    }
  }

  // 37. avalanche — cascading ice chunks tumble in from above.
  function drawAvalanche(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const n = fancy ? 10 : 4;
    for (let i = 0; i < n; i++) {
      const r = rng(i + 37);
      const delay = i * 0.04;
      const local = (p - delay) / 0.7;
      if (local <= 0 || local > 1) continue;
      const sx = cx + (r - 0.5) * 40;
      const sy = cy - 28 + local * 36;
      const sz = fancy ? (3 + r * 3 | 0) : 3;
      const col = fancy ? (r > 0.5 ? 'rgba(232,248,255,0.95)' : 'rgba(168,216,248,0.95)') : '#aef';
      // Tumbling chunk rotates: alternate diamond vs square.
      if ((i & 1) === 0) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(sx, sy - sz);
        ctx.lineTo(sx + sz, sy);
        ctx.lineTo(sx, sy + sz);
        ctx.lineTo(sx - sz, sy);
        ctx.closePath();
        ctx.fill();
      } else {
        px(ctx, sx - sz / 2, sy - sz / 2, sz, sz, col);
      }
    }
    if (fancy && p > 0.6) {
      const k = (p - 0.6) / 0.4;
      gradientFill(ctx, cx, cy + 8, 16, 'rgba(232,248,255,' + (0.4 * (1 - k)).toFixed(2) + ')', 'rgba(168,216,248,0)');
    }
  }

  // 38. thunderclap — two angular forks crack from corners + screen flash.
  function drawThunderclap(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    if (p > 0.1 && p < 0.55) {
      const k = (p - 0.1) / 0.45;
      // Two zigzag forks: top-left and top-right.
      const forks = [{ x: cx - 30, y: cy - 22 }, { x: cx + 30, y: cy - 22 }];
      for (const f of forks) {
        const points = [
          [f.x, f.y],
          [f.x + (cx - f.x) * 0.3 + 4, f.y + (cy - f.y) * 0.3],
          [f.x + (cx - f.x) * 0.55 - 4, f.y + (cy - f.y) * 0.55],
          [f.x + (cx - f.x) * 0.8 + 2, f.y + (cy - f.y) * 0.8],
          [cx, cy]
        ];
        ctx.strokeStyle = fancy ? 'rgba(255,232,80,' + (0.95 * k).toFixed(2) + ')' : '#fe4';
        ctx.lineWidth = fancy ? 3 : 2;
        ctx.beginPath();
        for (let j = 0; j < points.length; j++) {
          if (j === 0) ctx.moveTo(points[j][0], points[j][1]);
          else ctx.lineTo(points[j][0], points[j][1]);
        }
        ctx.stroke();
      }
    }
    if (p > 0.4) {
      const k = (p - 0.4) / 0.6;
      if (fancy) {
        gradientFill(ctx, cx, cy, 12 + k * 16, 'rgba(255,255,232,' + (0.85 * (1 - k)).toFixed(2) + ')', 'rgba(255,232,80,0)');
      }
      ring(ctx, cx, cy, 6 + k * 10, fancy ? 'rgba(255,232,80,' + (1 - k).toFixed(2) + ')' : '#fe4', fancy ? 2 : 1);
    }
  }

  // 39. voltcage — vertical electric prison bars with zaps between.
  function drawVoltCage(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const bars = fancy ? 5 : 3;
    const cageH = 22;
    for (let i = 0; i < bars; i++) {
      const bx = cx - 16 + i * (32 / (bars - 1));
      const col = fancy ? 'rgba(255,232,80,' + (0.85 + 0.1 * Math.sin(p * 20 + i)).toFixed(2) + ')' : '#fe4';
      ctx.fillStyle = col;
      ctx.fillRect(bx - 1, cy - cageH / 2, 2, cageH);
    }
    if (fancy) {
      // Zap arcs between bars.
      for (let i = 0; i < 5; i++) {
        const ang = rng(i + 39 + Math.floor(p * 30));
        const fromBar = Math.floor(ang * bars);
        const toBar = (fromBar + 1) % bars;
        const fx = cx - 16 + fromBar * (32 / (bars - 1));
        const tx = cx - 16 + toBar * (32 / (bars - 1));
        const my = cy - cageH / 2 + ang * cageH;
        streak(ctx, fx, my, tx, my + (ang - 0.5) * 6, 'rgba(255,255,232,0.85)', 1);
      }
      // Glow halo.
      gradientFill(ctx, cx, cy, 22, 'rgba(255,232,80,' + (0.25 + 0.15 * Math.sin(p * 8)).toFixed(2) + ')', 'rgba(255,232,80,0)');
    }
  }

  // 40. hurricaneblast — tight rotating cyclone with leaf debris.
  function drawHurricaneBlast(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    // Cyclone: stacked ellipses with wobble.
    const layers = fancy ? 12 : 6;
    ctx.save();
    if (fancy) ctx.globalCompositeOperation = 'multiply';
    for (let i = 0; i < layers; i++) {
      const f = i / layers;
      const fx = cx + Math.sin(p * 16 + i * 0.7) * (4 + f * 4);
      const fy = cy - 14 + i * (28 / layers);
      const rx = Math.max(3, 18 * (1 - f * 0.4));
      const col = fancy ? 'rgba(96,144,200,' + (0.35 + 0.06 * Math.sin(p * 10 + i)).toFixed(2) + ')' : 'rgba(120,160,200,0.7)';
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(fx, fy, rx, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (fancy) {
      // Leaf debris orbiting.
      for (let i = 0; i < 6; i++) {
        const a = p * 10 + i * (Math.PI * 2 / 6);
        const rad = 20 - p * 8;
        const lx = cx + Math.cos(a) * rad;
        const ly = cy + Math.sin(a) * rad * 0.6;
        px(ctx, lx | 0, ly | 0, 2, 2, i & 1 ? 'rgba(96,200,96,0.85)' : 'rgba(168,120,72,0.85)');
      }
    }
  }

  // 41. skyrend — diving streak from top-right + feather trail + dust.
  function drawSkyRend(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const k = Math.min(1, p / 0.55);
    const sx = cx + 26 - k * 26;
    const sy = cy - 26 + k * 26;
    if (fancy) {
      streak(ctx, sx + 8, sy - 8, sx - 4, sy + 4, 'rgba(255,255,255,0.85)', 3);
      streak(ctx, sx + 4, sy - 4, sx - 2, sy + 2, 'rgba(200,232,255,0.7)', 2);
      // Feather trail.
      for (let i = 0; i < 5; i++) {
        const ti = i * 0.06;
        const tk = Math.max(0, k - ti);
        if (tk <= 0) continue;
        const tx = cx + 26 - tk * 26;
        const ty = cy - 26 + tk * 26;
        px(ctx, tx + 2, ty - 2, 2, 4, 'rgba(232,248,255,' + (0.7 - i * 0.12).toFixed(2) + ')');
      }
    } else {
      streak(ctx, sx + 4, sy - 4, sx, sy, '#fff', 2);
    }
    if (p > 0.5) {
      const ik = (p - 0.5) / 0.5;
      // Ground impact dust.
      for (let i = 0; i < 6; i++) {
        const r = rng(i + 41);
        const dx = (r - 0.5) * 22;
        const dy = ik * 4 + r * 2;
        px(ctx, cx + dx | 0, cy + 6 + dy | 0, 2, 2, 'rgba(200,180,140,' + (0.7 * (1 - ik)).toFixed(2) + ')');
      }
      if (fancy) ring(ctx, cx, cy + 4, 4 + ik * 12, 'rgba(232,232,232,' + (1 - ik).toFixed(2) + ')', 2);
    }
  }

  // 42. earthquake — cracks split outward, screen tremor shake.
  function drawEarthquake(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    // Tremor: small random offset.
    const shake = Math.sin(p * 80) * 2;
    const sx = cx + shake;
    // Cracks fanning outward.
    const cracks = fancy ? 6 : 4;
    for (let i = 0; i < cracks; i++) {
      const ang = (i / cracks) * Math.PI * 2;
      const k = Math.min(1, p / 0.7);
      const r = k * 26;
      const x1 = sx + Math.cos(ang) * 2;
      const y1 = cy + 6 + Math.sin(ang) * 1;
      const x2 = sx + Math.cos(ang) * r;
      const y2 = cy + 6 + Math.sin(ang) * r * 0.4;
      streak(ctx, x1, y1, x2, y2, fancy ? 'rgba(72,56,40,0.95)' : '#642', fancy ? 3 : 2);
      // Jag mid-points.
      if (fancy) {
        const mx = sx + Math.cos(ang) * r * 0.5;
        const my = cy + 6 + Math.sin(ang) * r * 0.5 * 0.4;
        streak(ctx, mx, my, mx + 3, my + 1, 'rgba(72,56,40,0.85)', 2);
      }
    }
    // Rising soil chunks.
    if (fancy && p > 0.2) {
      for (let i = 0; i < 8; i++) {
        const r = rng(i + 43);
        const pop = (p - 0.2) / 0.7;
        const dx = (r - 0.5) * 30;
        const dy = -pop * 14 + pop * pop * 12;
        px(ctx, sx + dx | 0, cy + 6 + dy | 0, 2, 2, 'rgba(120,88,56,' + (1 - pop).toFixed(2) + ')');
      }
    }
  }

  // 43. sandstorm — diagonal sand sheets across screen + swirling motes.
  function drawSandstorm(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    // Diagonal sand sheets.
    if (fancy) {
      const sheets = 4;
      for (let i = 0; i < sheets; i++) {
        const f = i / sheets;
        const drift = (p * 60 + i * 30) % 60 - 20;
        const grad = ctx.createLinearGradient(cx - 30 + drift, cy - 14 + f * 8, cx + 30 + drift, cy + 8 + f * 8);
        grad.addColorStop(0, 'rgba(232,200,144,0)');
        grad.addColorStop(0.5, 'rgba(232,200,144,' + (0.4 - f * 0.1).toFixed(2) + ')');
        grad.addColorStop(1, 'rgba(232,200,144,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(cx - 30, cy - 14 + f * 8, 60, 8);
      }
    }
    // Swirling motes.
    const motes = fancy ? 16 : 6;
    for (let i = 0; i < motes; i++) {
      const r = rng(i + 45);
      const a = (i / motes) * Math.PI * 2 + p * 4;
      const rad = 16 + Math.sin(p * 6 + i) * 4;
      const dx = Math.cos(a) * rad;
      const dy = Math.sin(a) * rad * 0.5;
      const col = fancy ? (r > 0.5 ? 'rgba(232,200,144,0.85)' : 'rgba(184,160,112,0.85)') : '#dca';
      px(ctx, cx + dx | 0, cy + dy | 0, fancy ? 2 : 1, fancy ? 2 : 1, col);
    }
  }

  // 44. rockslide — 6-8 rocks raining diagonally with impact dust pings.
  function drawRockSlide(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const n = fancy ? 8 : 4;
    for (let i = 0; i < n; i++) {
      const r = rng(i + 47);
      const delay = i * 0.04;
      const local = (p - delay) / 0.5;
      if (local <= 0 || local > 1) continue;
      const sx = cx + (r - 0.5) * 50 - 18 + local * 18;
      const sy = cy - 24 + local * 32;
      const sz = fancy ? 4 : 3;
      const col = fancy ? (r > 0.5 ? 'rgba(168,120,72,0.95)' : 'rgba(120,88,56,0.95)') : '#864';
      px(ctx, sx - sz / 2 | 0, sy - sz / 2 | 0, sz, sz, col);
      // Trail.
      if (fancy) px(ctx, sx - sz / 2 - 1, sy - sz / 2 - 1, 1, 1, 'rgba(232,200,144,0.6)');
      // Impact ping.
      if (local > 0.92) {
        const px2 = cx + (r - 0.5) * 50;
        for (let j = 0; j < 3; j++) {
          px(ctx, px2 + (j - 1) * 2 | 0, cy + 8 | 0, 1, 1, 'rgba(200,180,140,0.9)');
        }
      }
    }
  }

  // 45. stoneedge — stone spike thrusts up from the ground.
  function drawStoneEdge(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const k = Math.min(1, p / 0.6);
    const spikeH = k * 26;
    // Spike body (triangle).
    const col = fancy ? 'rgba(120,88,56,0.95)' : '#864';
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy + 8);
    ctx.lineTo(cx + 7, cy + 8);
    ctx.lineTo(cx, cy + 8 - spikeH);
    ctx.closePath();
    ctx.fill();
    if (fancy) {
      // Highlight edge.
      ctx.fillStyle = 'rgba(232,200,144,0.6)';
      ctx.beginPath();
      ctx.moveTo(cx - 2, cy + 8);
      ctx.lineTo(cx, cy + 8 - spikeH);
      ctx.lineTo(cx + 2, cy + 8);
      ctx.closePath();
      ctx.fill();
      // Jagged smaller spikes alongside.
      for (let s = -1; s <= 1; s += 2) {
        ctx.fillStyle = 'rgba(168,120,72,0.9)';
        ctx.beginPath();
        ctx.moveTo(cx + s * 6, cy + 8);
        ctx.lineTo(cx + s * 12, cy + 8);
        ctx.lineTo(cx + s * 9, cy + 8 - spikeH * 0.5);
        ctx.closePath();
        ctx.fill();
      }
    }
    if (fancy && p > 0.55) {
      const ik = (p - 0.55) / 0.45;
      // Burst at the tip on full extension.
      gradientFill(ctx, cx, cy + 8 - spikeH, 8, 'rgba(248,232,168,' + (0.7 * (1 - ik)).toFixed(2) + ')', 'rgba(168,120,72,0)');
    }
  }

  // 46. petalstorm — pink/green petals spiral around target.
  function drawPetalStorm(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const n = fancy ? 14 : 6;
    for (let i = 0; i < n; i++) {
      const r = rng(i + 49);
      const a = (i / n) * Math.PI * 2 + p * 4;
      const rad = 6 + p * 16 + (r - 0.5) * 4;
      const dx = Math.cos(a) * rad;
      const dy = Math.sin(a) * rad * 0.65;
      const col = fancy ? (i & 1 ? 'rgba(248,168,200,0.95)' : 'rgba(248,200,168,0.95)') : '#fae';
      // Petal = small ellipse rotated.
      if (fancy) {
        ctx.save();
        ctx.translate(cx + dx, cy + dy);
        ctx.rotate(a);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.ellipse(0, 0, 3, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        px(ctx, cx + dx | 0, cy + dy | 0, 2, 1, col);
      }
    }
    if (fancy) {
      gradientFill(ctx, cx, cy, 14, 'rgba(248,200,232,' + (0.35 * Math.sin(p * Math.PI)).toFixed(2) + ')', 'rgba(248,168,200,0)');
    }
  }

  // 47. rootbind — roots grow from below wrapping the target.
  function drawRootBind(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const k = Math.min(1, p / 0.7);
    // 4 roots growing upward, curving inward.
    const roots = fancy ? 5 : 3;
    for (let i = 0; i < roots; i++) {
      const baseX = cx + (i - (roots - 1) / 2) * 8;
      const segs = 8;
      ctx.strokeStyle = fancy ? 'rgba(120,80,48,0.95)' : '#763';
      ctx.lineWidth = fancy ? 3 : 2;
      ctx.beginPath();
      for (let j = 0; j <= segs; j++) {
        const t = j / segs * k;
        const x = baseX + Math.sin(t * Math.PI * 1.5 + i * 0.6) * 5;
        const y = cy + 14 - t * 24;
        if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      if (fancy && k > 0.6) {
        const tipX = baseX + Math.sin(Math.PI * 1.5 + i * 0.6) * 5;
        const tipY = cy + 14 - k * 24;
        px(ctx, tipX - 1, tipY - 1, 3, 3, 'rgba(96,200,96,0.95)');
      }
    }
    if (fancy && p > 0.6) {
      // Constriction halo.
      const ik = (p - 0.6) / 0.4;
      ring(ctx, cx, cy, 10 - ik * 2, 'rgba(120,80,48,' + (0.7 * (1 - ik)).toFixed(2) + ')', 2);
    }
  }

  // 48. toxicgas — expanding green-purple gas cloud with bubble pops.
  function drawToxicGas(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    if (fancy) {
      // Two overlapping clouds.
      gradientFill(ctx, cx - 4, cy, 8 + p * 16, 'rgba(120,200,80,' + (0.55 * (1 - p * 0.5)).toFixed(2) + ')', 'rgba(120,200,80,0)');
      gradientFill(ctx, cx + 4, cy + 2, 6 + p * 14, 'rgba(168,120,200,' + (0.55 * (1 - p * 0.5)).toFixed(2) + ')', 'rgba(168,120,200,0)');
    }
    const bubbles = fancy ? 10 : 4;
    for (let i = 0; i < bubbles; i++) {
      const r = rng(i + 51);
      const phase = (p + r * 0.4) % 1;
      const bx = cx + (r - 0.5) * 30 + Math.sin(p * 4 + i) * 3;
      const by = cy + 6 - phase * 18;
      const sz = (1 - phase) * (fancy ? 4 : 2);
      if (sz < 0.8) continue;
      const col = fancy ? (i & 1 ? 'rgba(120,200,96,' + (0.9 - phase * 0.5).toFixed(2) + ')' : 'rgba(168,120,200,' + (0.9 - phase * 0.5).toFixed(2) + ')') : '#9c6';
      disc(ctx, bx, by, sz, col);
    }
  }

  // 49. venomtide — purple wave sweeping in with dripping toxic mist.
  function drawVenomTide(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const xOff = -24 + p * 48;
    if (fancy) {
      ctx.fillStyle = 'rgba(120,72,168,0.85)';
      ctx.beginPath();
      ctx.moveTo(cx - 20 + xOff, cy + 8);
      ctx.quadraticCurveTo(cx + xOff, cy - 8, cx + 20 + xOff, cy + 8);
      ctx.lineTo(cx + 20 + xOff, cy + 12);
      ctx.lineTo(cx - 20 + xOff, cy + 12);
      ctx.closePath();
      ctx.fill();
      // Toxic mist trail above.
      for (let i = 0; i < 5; i++) {
        const dx = -16 + i * 8;
        const dy = -4 - Math.sin(p * 6 + i) * 3;
        px(ctx, cx + dx + xOff | 0, cy + dy | 0, 2, 2, 'rgba(168,120,200,' + (0.7 - i * 0.1).toFixed(2) + ')');
      }
      // Dripping motes below.
      for (let i = 0; i < 6; i++) {
        const r = rng(i + 53);
        const phase = (p + r * 0.3) % 1;
        const dx = (r - 0.5) * 30 + xOff;
        const dy = 12 + phase * 8;
        px(ctx, cx + dx | 0, cy + dy | 0, 2, 2, 'rgba(120,72,168,' + (0.85 - phase * 0.5).toFixed(2) + ')');
      }
    } else {
      ctx.fillStyle = '#84a';
      ctx.fillRect(cx - 14 + xOff, cy - 2, 24, 12);
    }
  }

  // 50. mindcrush — eight psychic shards converge from outside toward centre.
  function drawMindCrush(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const shards = 8;
    for (let i = 0; i < shards; i++) {
      const ang = (i / shards) * Math.PI * 2;
      const dist = (1 - Math.min(1, p / 0.7)) * 28 + 4;
      const sx = cx + Math.cos(ang) * dist;
      const sy = cy + Math.sin(ang) * dist * 0.7;
      // Shard = diamond shape.
      ctx.fillStyle = fancy ? 'rgba(168,144,232,0.95)' : '#a8e';
      ctx.beginPath();
      ctx.moveTo(sx, sy - 4);
      ctx.lineTo(sx + 3, sy);
      ctx.lineTo(sx, sy + 4);
      ctx.lineTo(sx - 3, sy);
      ctx.closePath();
      ctx.fill();
      if (fancy) {
        // Tracer.
        const tx = cx + Math.cos(ang) * (dist + 4);
        const ty = cy + Math.sin(ang) * (dist + 4) * 0.7;
        streak(ctx, sx, sy, tx, ty, 'rgba(232,200,255,0.7)', 1);
      }
    }
    if (p > 0.6 && fancy) {
      const k = (p - 0.6) / 0.4;
      gradientFill(ctx, cx, cy, 14, 'rgba(232,200,255,' + (0.7 * (1 - k)).toFixed(2) + ')', 'rgba(168,144,232,0)');
      star(ctx, cx, cy, 4, 'rgba(255,255,255,' + (1 - k).toFixed(2) + ')');
    }
  }

  // 51. telekinesis — target framed by floating energy lift lines.
  function drawTelekinesis(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    // Lift lines: 4 angular lines pulling upward.
    const lines = fancy ? 8 : 4;
    for (let i = 0; i < lines; i++) {
      const ang = (i / lines) * Math.PI * 2;
      const r = 14;
      const x1 = cx + Math.cos(ang) * r;
      const y1 = cy + Math.sin(ang) * r * 0.6;
      const y2 = y1 - 4 - Math.sin(p * 6 + i) * 3;
      streak(ctx, x1, y1, x1, y2, fancy ? 'rgba(232,200,255,' + (0.85 - p * 0.3).toFixed(2) + ')' : '#cae', fancy ? 2 : 1);
    }
    if (fancy) {
      // Subtle aura.
      gradientFill(ctx, cx, cy - 2, 14, 'rgba(184,144,232,' + (0.3 + 0.15 * Math.sin(p * 8)).toFixed(2) + ')', 'rgba(184,144,232,0)');
      // Sparkles.
      for (let i = 0; i < 4; i++) {
        const r = rng(i + 55);
        const phase = (p + r * 0.3) % 1;
        if (phase < 0.5) continue;
        const sx = cx + (r - 0.5) * 24;
        const sy = cy - 2 - (r * 8);
        star(ctx, sx, sy, 2, 'rgba(255,255,232,' + (1 - phase).toFixed(2) + ')');
      }
    }
  }

  // 52. swarmstrike — bug silhouettes dart inward in flurries.
  function drawSwarmStrike(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const n = fancy ? 12 : 6;
    for (let i = 0; i < n; i++) {
      const r = rng(i + 57);
      const delay = i * 0.05;
      const local = (p - delay) / 0.5;
      if (local <= 0 || local > 1) continue;
      // Spawn from outer ring, fly to centre.
      const ang = r * Math.PI * 2;
      const dist = (1 - local) * 26 + 2;
      const sx = cx + Math.cos(ang) * dist;
      const sy = cy + Math.sin(ang) * dist * 0.7;
      // Bug body + wing.
      const col = fancy ? (r > 0.5 ? 'rgba(168,200,72,0.95)' : 'rgba(120,144,48,0.95)') : '#9b3';
      ctx.fillStyle = col;
      ctx.fillRect(sx - 1, sy - 1, 3, 2);
      if (fancy) {
        const wing = Math.sin(p * 30 + i) * 2;
        px(ctx, sx - 2 + wing, sy - 2, 2, 1, 'rgba(232,255,200,0.7)');
      }
    }
  }

  // 53. karatechop — quick downward chop with sharp motion line.
  function drawKarateChop(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const k = Math.min(1, p / 0.5);
    const cy0 = cy - 18 + k * 18;
    // Chop blade (vertical orange line).
    if (fancy) {
      ctx.fillStyle = 'rgba(232,144,72,0.95)';
      ctx.fillRect(cx - 1, cy0 - 8, 3, 12);
      // Motion line trailing up.
      streak(ctx, cx, cy0 - 14, cx, cy0 - 6, 'rgba(255,200,144,0.7)', 2);
      streak(ctx, cx, cy0 - 20, cx, cy0 - 10, 'rgba(255,232,168,0.4)', 1);
    } else {
      px(ctx, cx - 1, cy0 - 6, 2, 8, '#fa6');
    }
    if (p > 0.45) {
      const ik = (p - 0.45) / 0.55;
      // Impact spark.
      if (fancy) {
        // 4-direction crisp lines.
        for (let i = 0; i < 4; i++) {
          const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
          const r0 = 4, r1 = 4 + ik * 10;
          streak(ctx, cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0,
                      cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1,
                      'rgba(255,232,168,' + (1 - ik).toFixed(2) + ')', 2);
        }
      }
      star(ctx, cx, cy, 4, fancy ? 'rgba(255,255,255,' + (1 - ik).toFixed(2) + ')' : '#fff');
    }
  }

  // 54. focusblast — charging orb → bursts outward in a ring.
  function drawFocusBlast(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    if (p < 0.6) {
      const k = p / 0.6;
      // Charging orb pulses.
      const r = 4 + k * 6;
      if (fancy) {
        gradientFill(ctx, cx, cy, r + 4, 'rgba(96,200,232,' + (0.85 * k).toFixed(2) + ')', 'rgba(96,168,248,0)');
        disc(ctx, cx, cy, r, 'rgba(168,232,255,0.95)');
      } else {
        disc(ctx, cx, cy, r, '#8df');
      }
      // Energy ring tightening.
      ring(ctx, cx, cy, 18 - k * 8, fancy ? 'rgba(232,255,200,' + (0.7 * k).toFixed(2) + ')' : '#cf8', fancy ? 2 : 1);
    } else {
      const k = (p - 0.6) / 0.4;
      // Burst outward.
      const r = 6 + k * 22;
      if (fancy) {
        gradientFill(ctx, cx, cy, r, 'rgba(168,232,255,' + (0.85 * (1 - k)).toFixed(2) + ')', 'rgba(96,168,248,0)');
        ring(ctx, cx, cy, r, 'rgba(232,255,200,' + (1 - k).toFixed(2) + ')', 3);
      } else {
        ring(ctx, cx, cy, r, '#8df', 2);
      }
      // Sparks.
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const sx = cx + Math.cos(ang) * r;
        const sy = cy + Math.sin(ang) * r;
        px(ctx, sx | 0, sy | 0, 2, 2, fancy ? 'rgba(255,255,232,' + (1 - k).toFixed(2) + ')' : '#ffd');
      }
    }
  }

  // 55. shadowstrike — dark tendril stabs across screen with shadow wake.
  function drawShadowStrike(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const k = Math.min(1, p / 0.45);
    const sx = cx - 24 + k * 24;
    if (fancy) {
      // Tendril: curved dark line.
      ctx.strokeStyle = 'rgba(40,16,40,0.95)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(sx - 18, cy + 4);
      ctx.quadraticCurveTo(sx - 8, cy - 6, sx, cy);
      ctx.stroke();
      // Wake.
      ctx.strokeStyle = 'rgba(80,40,80,0.55)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(sx - 22, cy + 6);
      ctx.quadraticCurveTo(sx - 10, cy - 4, sx + 1, cy + 1);
      ctx.stroke();
      // Tip.
      px(ctx, sx - 1, cy - 1, 3, 3, 'rgba(80,40,120,0.95)');
    } else {
      streak(ctx, sx - 16, cy, sx, cy, '#404', 3);
    }
    if (p > 0.45) {
      const ik = (p - 0.45) / 0.55;
      if (fancy) {
        gradientFill(ctx, cx, cy, 8 + ik * 12, 'rgba(40,16,40,' + (0.7 * (1 - ik)).toFixed(2) + ')', 'rgba(40,16,40,0)');
      }
      star(ctx, cx, cy, 4, 'rgba(168,120,200,' + (1 - ik).toFixed(2) + ')');
    }
  }

  // 56. nightveil — dark curtain falls from top, target dim under it.
  function drawNightVeil(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const k = Math.min(1, p / 0.7);
    const curtainBottomY = cy - 22 + k * 36;
    if (fancy) {
      // Layered curtain with slight vertical streaks.
      const grad = ctx.createLinearGradient(0, cy - 22, 0, curtainBottomY);
      grad.addColorStop(0, 'rgba(20,16,32,0.85)');
      grad.addColorStop(1, 'rgba(40,32,56,' + (0.55 * (1 - p * 0.3)).toFixed(2) + ')');
      ctx.fillStyle = grad;
      ctx.fillRect(cx - 22, cy - 22, 44, curtainBottomY - (cy - 22));
      // Folds.
      for (let i = 0; i < 5; i++) {
        const fx = cx - 16 + i * 8;
        streak(ctx, fx, cy - 22, fx, curtainBottomY, 'rgba(80,56,96,0.4)', 1);
      }
      // Sparkles at the falling edge.
      for (let i = 0; i < 6; i++) {
        const r = rng(i + 59);
        const sx = cx - 18 + r * 36;
        px(ctx, sx | 0, curtainBottomY - 1, 2, 2, 'rgba(168,144,232,' + (0.7 + 0.2 * Math.sin(p * 10 + i)).toFixed(2) + ')');
      }
    } else {
      ctx.fillStyle = 'rgba(40,32,56,0.7)';
      ctx.fillRect(cx - 16, cy - 18, 32, curtainBottomY - (cy - 18));
    }
  }

  // 57. hauntcurse — purple runes circle target, eyes blink, then dim flash.
  function drawHauntCurse(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const runes = fancy ? 6 : 3;
    for (let i = 0; i < runes; i++) {
      const a = (i / runes) * Math.PI * 2 + p * Math.PI * 1.2;
      const rad = 16;
      const sx = cx + Math.cos(a) * rad;
      const sy = cy + Math.sin(a) * rad * 0.6;
      const col = fancy ? 'rgba(168,120,232,0.95)' : '#a8e';
      // Rune: small cross + box.
      px(ctx, sx - 1, sy - 2, 2, 5, col);
      px(ctx, sx - 2, sy - 1, 5, 2, col);
      if (fancy) px(ctx, sx, sy, 1, 1, 'rgba(232,200,255,0.95)');
    }
    if (fancy && p > 0.4) {
      // Glowing eyes blinking at centre.
      const blink = Math.sin(p * 14) > 0 ? 1 : 0;
      if (blink) {
        ctx.fillStyle = 'rgba(255,72,72,0.95)';
        ctx.fillRect(cx - 4, cy - 1, 2, 3);
        ctx.fillRect(cx + 2, cy - 1, 2, 3);
      }
    }
    if (p > 0.7 && fancy) {
      const k = (p - 0.7) / 0.3;
      gradientFill(ctx, cx, cy, 16, 'rgba(80,40,120,' + (0.5 * (1 - k)).toFixed(2) + ')', 'rgba(40,16,40,0)');
    }
  }

  // 58. phantompulse — translucent pulse wave with ghostly afterimage.
  function drawPhantomPulse(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    // Three pulse waves staggered.
    for (let i = 0; i < 3; i++) {
      const local = (p - i * 0.18);
      if (local <= 0) continue;
      const r = local * 24;
      const a = Math.max(0, 0.7 - r * 0.025);
      ring(ctx, cx, cy, r, fancy ? 'rgba(184,160,232,' + a.toFixed(2) + ')' : '#a9e', fancy ? 2 : 1);
    }
    if (fancy) {
      // Ghostly afterimage of the target's silhouette pulsing.
      const wob = Math.sin(p * 14) * 2;
      ctx.fillStyle = 'rgba(168,144,232,' + (0.3 + 0.15 * Math.sin(p * 12)).toFixed(2) + ')';
      ctx.beginPath();
      ctx.ellipse(cx + wob, cy, 10, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 59. dragonpulse — concentric draconic energy rings, gold/purple core.
  function drawDragonPulse(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    if (fancy) {
      // Core orb.
      gradientFill(ctx, cx, cy, 8 + Math.sin(p * 16) * 2,
        'rgba(255,232,168,0.95)', 'rgba(168,72,200,0)');
    }
    // Rings expanding.
    for (let i = 0; i < 4; i++) {
      const r = ((p + i * 0.2) % 1) * 22;
      const a = Math.max(0, 0.85 - r * 0.03);
      ring(ctx, cx, cy, r, fancy ? (i & 1 ? 'rgba(248,200,80,' + a.toFixed(2) + ')' : 'rgba(168,72,200,' + a.toFixed(2) + ')') : '#a4c', fancy ? 2 : 1);
    }
    if (fancy) {
      // Draconic scale shimmer dots.
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2 + p * 4;
        const rad = 14 + Math.sin(p * 6 + i) * 2;
        const sx = cx + Math.cos(ang) * rad;
        const sy = cy + Math.sin(ang) * rad * 0.7;
        px(ctx, sx | 0, sy | 0, 2, 2, i & 1 ? 'rgba(248,232,168,0.9)' : 'rgba(232,168,255,0.9)');
      }
    }
  }

  // 60. stardust — twinkling cosmic dust falling around target.
  function drawStardust(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const n = fancy ? 18 : 7;
    for (let i = 0; i < n; i++) {
      const r = rng(i + 61);
      const phase = (p + r * 0.5) % 1;
      const sx = cx + (r - 0.5) * 36 + Math.sin(p * 4 + i) * 2;
      const sy = cy - 16 + phase * 28;
      const twink = Math.sin(p * 18 + i) * 0.5 + 0.5;
      const sz = 1 + Math.floor(twink * 2);
      const col = fancy ? (i % 3 === 0 ? 'rgba(255,232,168,' + (1 - phase).toFixed(2) + ')'
                          : i % 3 === 1 ? 'rgba(184,200,248,' + (1 - phase).toFixed(2) + ')'
                                        : 'rgba(248,200,232,' + (1 - phase).toFixed(2) + ')')
                        : '#fef';
      if (twink > 0.5) star(ctx, sx, sy, sz, col);
      else px(ctx, sx | 0, sy | 0, 1, 1, col);
    }
    if (fancy) {
      gradientFill(ctx, cx, cy, 16, 'rgba(232,200,255,' + (0.3 * Math.sin(p * Math.PI)).toFixed(2) + ')', 'rgba(184,160,232,0)');
    }
  }

  // ---- 34 more signature move effects (v0.52.0) ------------------------
  // New moves added in tandem to js/data.js MOVES. Tier-branched as usual.

  // 61. doublestrike — two staggered impact stars + connecting streak.
  function drawDoubleStrike(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const stages = [0.1, 0.45];
    for (let i = 0; i < 2; i++) {
      const local = (p - stages[i]) / 0.35;
      if (local <= 0 || local > 1) continue;
      const a = (1 - local).toFixed(2);
      const dx = (i === 0 ? -6 : 6);
      const dy = (i === 0 ? -4 : 4);
      // Streak in.
      streak(ctx, cx + dx - 10, cy + dy, cx + dx, cy + dy,
        fancy ? 'rgba(255,232,168,' + a + ')' : '#fea', fancy ? 3 : 2);
      // Impact star.
      star(ctx, cx + dx, cy + dy, 4, fancy ? 'rgba(255,255,255,' + a + ')' : '#fff');
      if (fancy) {
        gradientFill(ctx, cx + dx, cy + dy, 6,
          'rgba(255,232,168,' + (0.7 * (1 - local)).toFixed(2) + ')', 'rgba(255,232,168,0)');
      }
    }
  }

  // 62. recklesscharge — full-width motion blur sweep + big dust + flinch lines.
  function drawRecklessCharge(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const k = Math.min(1, p / 0.55);
    const sx = cx - 50 + k * 50;
    // Multi-line blur (8 stacked streaks).
    if (fancy) {
      for (let i = 0; i < 8; i++) {
        const oy = (i - 3.5) * 3;
        const a = 0.85 - i * 0.08;
        streak(ctx, sx - 30, cy + oy, sx + 4, cy + oy,
          'rgba(255,255,255,' + a.toFixed(2) + ')', 2);
      }
    } else {
      streak(ctx, sx - 14, cy, sx, cy, '#fff', 3);
    }
    // Impact.
    if (p > 0.5) {
      const ik = (p - 0.5) / 0.5;
      if (fancy) {
        gradientFill(ctx, cx, cy, 8 + ik * 18, 'rgba(255,232,168,' + (0.85 * (1 - ik)).toFixed(2) + ')', 'rgba(255,232,168,0)');
      }
      // Big dust ring at ground.
      ring(ctx, cx, cy + 6, 6 + ik * 18, fancy ? 'rgba(200,180,140,' + (0.95 * (1 - ik)).toFixed(2) + ')' : '#dca', fancy ? 2 : 1);
      // Recoil flinch lines from user side.
      if (fancy && ik > 0.5) {
        for (let i = 0; i < 4; i++) {
          const fy = cy - 6 + i * 4;
          streak(ctx, cx - 26, fy, cx - 18, fy, 'rgba(255,200,144,' + (1 - ik).toFixed(2) + ')', 2);
        }
      }
    }
  }

  // 63. firefist — glowing red-orange fist with flame trail punching in.
  function drawFireFist(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const k = Math.min(1, p / 0.55);
    const fx = cx - 24 + k * 22;
    // Flame trail (3 ember puffs behind fist).
    if (fancy) {
      for (let i = 0; i < 4; i++) {
        const tx = fx - 8 - i * 5;
        const sz = 4 - i;
        const col = i < 2 ? 'rgba(248,80,8,' + (0.85 - i * 0.2).toFixed(2) + ')' : 'rgba(248,176,32,' + (0.7 - i * 0.15).toFixed(2) + ')';
        disc(ctx, tx, cy + Math.sin(p * 14 + i) * 2, sz, col);
      }
    }
    // Glove silhouette.
    ctx.fillStyle = fancy ? 'rgba(232,80,40,0.95)' : '#e44';
    ctx.fillRect(fx - 7, cy - 6, 9, 12);
    if (fancy) {
      ctx.fillStyle = 'rgba(255,168,72,0.9)';
      ctx.fillRect(fx - 5, cy - 4, 5, 8);
      // Flame halo at fist front.
      gradientFill(ctx, fx + 2, cy, 6, 'rgba(255,232,168,0.85)', 'rgba(248,80,8,0)');
    }
    if (p > 0.5) {
      const ik = (p - 0.5) / 0.5;
      if (fancy) gradientFill(ctx, cx, cy, 6 + ik * 14, 'rgba(248,200,80,' + (0.7 * (1 - ik)).toFixed(2) + ')', 'rgba(248,80,8,0)');
      star(ctx, cx, cy, 4, fancy ? 'rgba(255,232,168,' + (1 - ik).toFixed(2) + ')' : '#fea');
    }
  }

  // 64. searingbeam — sustained pillar of fire on target with shimmer haze.
  function drawSearingBeam(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    // Pillar height pulses.
    const pillarH = 24 + Math.sin(p * 18) * 2;
    if (fancy) {
      const grad = ctx.createLinearGradient(0, cy - pillarH, 0, cy + 8);
      grad.addColorStop(0, 'rgba(248,200,80,0.7)');
      grad.addColorStop(0.5, 'rgba(248,80,8,0.92)');
      grad.addColorStop(1, 'rgba(255,232,168,0.8)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy + 8);
      ctx.quadraticCurveTo(cx - 4, cy - pillarH * 0.5, cx, cy - pillarH);
      ctx.quadraticCurveTo(cx + 4, cy - pillarH * 0.5, cx + 8, cy + 8);
      ctx.closePath();
      ctx.fill();
      // Shimmer haze rising.
      for (let i = 0; i < 5; i++) {
        const r = rng(i + 71);
        const hy = cy - pillarH - r * 14 - (p * 12) % 14;
        px(ctx, cx + (r - 0.5) * 10 | 0, hy | 0, 2, 1, 'rgba(248,200,80,' + (0.5 + 0.3 * Math.sin(p * 8 + i)).toFixed(2) + ')');
      }
    } else {
      ctx.fillStyle = '#f80';
      ctx.fillRect(cx - 4, cy - 20, 8, 28);
    }
  }

  // 65. willowisp — three flickering wisps orbit target before settling.
  function drawWillOWisp(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const n = fancy ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const baseAng = (i / n) * Math.PI * 2;
      const ang = baseAng + p * Math.PI * 3;
      const rad = 16 - p * 8;
      const wx = cx + Math.cos(ang) * rad;
      const wy = cy + Math.sin(ang) * rad * 0.65;
      const flicker = (Math.sin(p * 30 + i * 2) > 0) ? 1 : 0;
      if (fancy) {
        const sz = 3 + flicker;
        gradientFill(ctx, wx, wy, sz + 2, 'rgba(168,144,232,0.85)', 'rgba(80,56,120,0)');
        disc(ctx, wx, wy, sz, 'rgba(232,200,255,0.95)');
        // Trail.
        const tang = ang - 0.3;
        const tx = cx + Math.cos(tang) * rad;
        const ty = cy + Math.sin(tang) * rad * 0.65;
        px(ctx, tx | 0, ty | 0, 2, 2, 'rgba(168,144,232,0.6)');
      } else if (flicker) {
        px(ctx, wx - 1, wy - 1, 3, 3, '#cae');
      }
    }
    if (fancy && p > 0.6) {
      // Burn settles on target.
      const ik = (p - 0.6) / 0.4;
      ring(ctx, cx, cy, 8 - ik * 2, 'rgba(168,80,40,' + (0.7 * (1 - ik)).toFixed(2) + ')', 2);
    }
  }

  // 66. dive — splash crown above, underwater shadow glides, spray on emergence.
  function drawDive(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    if (p < 0.35) {
      // Splash crown above.
      const k = p / 0.35;
      const splashY = cy - 18 + k * 8;
      if (fancy) {
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI - Math.PI;
          const r = 8 + k * 4;
          const dx = Math.cos(ang) * r;
          const dy = Math.sin(ang) * r * 0.4;
          px(ctx, cx + dx | 0, splashY + dy | 0, 2, 2, 'rgba(168,216,248,' + (0.9 - k * 0.3).toFixed(2) + ')');
        }
      } else {
        ring(ctx, cx, splashY, 8 + k * 4, '#aef', 1);
      }
    } else if (p < 0.7) {
      // Underwater shadow gliding (faint ellipse moving up).
      if (fancy) {
        const k = (p - 0.35) / 0.35;
        const sy = cy + 8 - k * 16;
        ctx.fillStyle = 'rgba(56,136,200,0.4)';
        ctx.beginPath();
        ctx.ellipse(cx, sy, 10, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Emergence + spray.
      const k = (p - 0.7) / 0.3;
      if (fancy) {
        gradientFill(ctx, cx, cy, 6 + k * 14, 'rgba(168,216,248,' + (0.85 * (1 - k)).toFixed(2) + ')', 'rgba(56,136,200,0)');
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const r = 4 + k * 14;
          px(ctx, cx + Math.cos(a) * r | 0, cy + Math.sin(a) * r * 0.6 | 0, 2, 2, 'rgba(232,248,255,' + (1 - k).toFixed(2) + ')');
        }
      } else {
        ring(ctx, cx, cy, 4 + k * 10, '#aef', 1);
      }
    }
  }

  // 67. tideguard — curved water barrier swells up with ripple highlights.
  function drawTideGuard(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const k = Math.min(1, p / 0.55);
    if (fancy) {
      // Curved barrier (half-ellipse) around user.
      ctx.fillStyle = 'rgba(56,136,232,0.55)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 4, 16, 16 * k, 0, Math.PI, 0);
      ctx.fill();
      // Highlight curve.
      ctx.strokeStyle = 'rgba(232,248,255,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 4, 14, 14 * k, 0, Math.PI, 0);
      ctx.stroke();
      // Ripples flowing along the dome.
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI - Math.PI;
        const rx = Math.cos(ang) * 12;
        const ry = Math.sin(ang) * 12 * k;
        const wob = Math.sin(p * 12 + i) * 2;
        px(ctx, cx + rx + wob | 0, cy + 4 + ry | 0, 2, 2, 'rgba(232,248,255,0.85)');
      }
    } else {
      ring(ctx, cx, cy + 2, 14 * k, '#48c', 1);
    }
    if (fancy && p > 0.6) {
      // Sparkles atop the barrier.
      const ik = (p - 0.6) / 0.4;
      for (let i = 0; i < 3; i++) {
        const sx = cx + (i - 1) * 6;
        const sy = cy + 4 - 14 + Math.sin(p * 10 + i) * 2;
        star(ctx, sx, sy, 2, 'rgba(232,248,255,' + (1 - ik).toFixed(2) + ')');
      }
    }
  }

  // 68. thunderfang — lightning-shaped fangs converge with crackle arc.
  function drawThunderFang(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const k = Math.min(1, p / 0.55);
    const gap = (1 - k) * 14 + 2;
    // Two zigzag fangs from top + bottom.
    for (let s = -1; s <= 1; s += 2) {
      const fy = cy + s * gap;
      ctx.strokeStyle = fancy ? 'rgba(255,232,80,0.95)' : '#fe4';
      ctx.lineWidth = fancy ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(cx - 8, fy);
      ctx.lineTo(cx - 3, fy + s * 3);
      ctx.lineTo(cx + 2, fy + s * -2);
      ctx.lineTo(cx + 6, fy + s * 3);
      ctx.stroke();
    }
    if (fancy && k > 0.6) {
      // Arc crackling between.
      const arcK = (k - 0.6) / 0.4;
      ctx.strokeStyle = 'rgba(255,255,232,' + (0.85 * arcK).toFixed(2) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy - gap + 2);
      const seg = 4;
      for (let i = 1; i <= seg; i++) {
        const t = i / seg;
        const wy = cy - gap + 2 + t * (gap * 2 - 4);
        const wx = cx - 4 + t * 8 + (i & 1 ? 3 : -3);
        ctx.lineTo(wx, wy);
      }
      ctx.stroke();
    }
    if (p > 0.55) {
      const ik = (p - 0.55) / 0.45;
      if (fancy) gradientFill(ctx, cx, cy, 6 + ik * 10, 'rgba(255,232,80,' + (0.6 * (1 - ik)).toFixed(2) + ')', 'rgba(255,232,80,0)');
    }
  }

  // 69. zaplance — spear-shaped lightning bolt thrusts forward.
  function drawZapLance(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const k = Math.min(1, p / 0.55);
    const sx = cx - 28 + k * 28;
    // Shaft (zigzag bolt).
    ctx.strokeStyle = fancy ? 'rgba(255,232,80,0.95)' : '#fe4';
    ctx.lineWidth = fancy ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(sx - 16, cy);
    ctx.lineTo(sx - 11, cy - 3);
    ctx.lineTo(sx - 6, cy + 2);
    ctx.lineTo(sx, cy);
    ctx.stroke();
    // Spear tip.
    if (fancy) {
      ctx.fillStyle = 'rgba(255,255,232,0.95)';
      ctx.beginPath();
      ctx.moveTo(sx, cy);
      ctx.lineTo(sx - 4, cy - 4);
      ctx.lineTo(sx - 4, cy + 4);
      ctx.closePath();
      ctx.fill();
    } else {
      px(ctx, sx - 3, cy - 1, 3, 3, '#ffd');
    }
    if (fancy && p > 0.5) {
      const ik = (p - 0.5) / 0.5;
      // Sparks fanning at tip.
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const r = 4 + ik * 8;
        px(ctx, cx + Math.cos(ang) * r | 0, cy + Math.sin(ang) * r | 0, 2, 2, 'rgba(255,232,80,' + (1 - ik).toFixed(2) + ')');
      }
    }
  }

  // 70. forestburst — leaves erupt outward from target in a green ring.
  function drawForestBurst(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const n = fancy ? 12 : 6;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2;
      const r = p * 22;
      const lx = cx + Math.cos(ang) * r;
      const ly = cy + Math.sin(ang) * r * 0.7;
      const col = fancy ? (i & 1 ? 'rgba(72,168,72,0.95)' : 'rgba(120,200,96,0.95)') : '#4a8';
      // Leaf shape.
      if (fancy) {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(ang + p * 4);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.ellipse(0, 0, 4, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        px(ctx, lx | 0, ly | 0, 3, 2, col);
      }
    }
    if (fancy) {
      ring(ctx, cx, cy, p * 22, 'rgba(120,200,96,' + (0.7 * (1 - p)).toFixed(2) + ')', 2);
    }
  }

  // 71. seedshot — 3 seeds arc inward, each sprouts on impact.
  function drawSeedShot(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const stages = [0, 0.18, 0.36];
    for (let i = 0; i < 3; i++) {
      const local = (p - stages[i]) / 0.4;
      if (local <= 0 || local > 1) continue;
      const sx0 = cx + (i - 1) * 14 - 18;
      const sy0 = cy - 18;
      const rx = sx0 + (cx - sx0) * local;
      const ry = sy0 + (cy - sy0) * local + Math.sin(local * Math.PI) * -6;
      const col = fancy ? 'rgba(168,120,72,0.95)' : '#864';
      // Seed (small oval).
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(rx, ry, 2, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      if (fancy && local > 0.88) {
        // Sprout: two tiny leaves at impact.
        const sp = (local - 0.88) / 0.12;
        ctx.fillStyle = 'rgba(96,200,96,0.95)';
        px(ctx, rx - 2, ry - 2 - sp * 3, 2, 2, 'rgba(96,200,96,0.95)');
        px(ctx, rx + 1, ry - 2 - sp * 3, 2, 2, 'rgba(96,200,96,0.95)');
      }
    }
  }

  // 72. icefang — crystalline fangs bite down, frost rings spread.
  function drawIceFang(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const k = Math.min(1, p / 0.55);
    const gap = (1 - k) * 14 + 2;
    for (let s = -1; s <= 1; s += 2) {
      const fy = cy + s * gap;
      // Crystal fang (triangle).
      ctx.fillStyle = fancy ? 'rgba(200,232,248,0.95)' : '#aef';
      ctx.beginPath();
      ctx.moveTo(cx - 6, fy);
      ctx.lineTo(cx + 6, fy);
      ctx.lineTo(cx, fy + s * -5);
      ctx.closePath();
      ctx.fill();
      if (fancy) {
        // Highlight edge.
        ctx.fillStyle = 'rgba(248,255,255,0.85)';
        ctx.fillRect(cx - 1, fy + s * -4, 2, 4);
      }
    }
    if (p > 0.5) {
      const ik = (p - 0.5) / 0.5;
      // Frost rings spreading.
      for (let i = 0; i < 2; i++) {
        const r = 4 + (ik + i * 0.3) * 12;
        ring(ctx, cx, cy, r, fancy ? 'rgba(200,232,248,' + (0.7 * (1 - ik)).toFixed(2) + ')' : '#aef', fancy ? 2 : 1);
      }
    }
  }

  // 73. flashfreeze — sudden white flash → target encased in crystal lattice.
  function drawFlashFreeze(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    // Flash.
    if (p < 0.25) {
      const k = p / 0.25;
      if (fancy) {
        gradientFill(ctx, cx, cy, 24, 'rgba(255,255,255,' + (0.95 * (1 - k)).toFixed(2) + ')', 'rgba(200,232,248,0)');
      } else {
        disc(ctx, cx, cy, 14 * (1 - k), '#fff');
      }
    } else {
      // Crystal lattice forming around target.
      const k = (p - 0.25) / 0.75;
      const nodes = fancy ? 8 : 4;
      for (let i = 0; i < nodes; i++) {
        const ang = (i / nodes) * Math.PI * 2;
        const r = 12 + Math.sin(p * 6 + i) * 1;
        const x = cx + Math.cos(ang) * r;
        const y = cy + Math.sin(ang) * r * 0.7;
        ctx.fillStyle = fancy ? 'rgba(200,232,248,0.95)' : '#aef';
        ctx.beginPath();
        ctx.moveTo(x, y - 3);
        ctx.lineTo(x + 2, y);
        ctx.lineTo(x, y + 3);
        ctx.lineTo(x - 2, y);
        ctx.closePath();
        ctx.fill();
        // Lattice line to next.
        if (fancy) {
          const nang = ((i + 1) / nodes) * Math.PI * 2;
          const nx = cx + Math.cos(nang) * r;
          const ny = cy + Math.sin(nang) * r * 0.7;
          streak(ctx, x, y, nx, ny, 'rgba(168,216,248,' + (0.85 * k).toFixed(2) + ')', 1);
        }
      }
    }
  }

  // 74. ironfist — metal aura forms two gauntlet outlines around user's fists.
  function drawIronFist(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    // Two fists at user's sides (user is the target box here — we draw on user side).
    for (let s = -1; s <= 1; s += 2) {
      const fx = cx + s * 12;
      // Gauntlet outline (rounded rect).
      const col = fancy ? 'rgba(168,180,200,0.95)' : '#abc';
      ctx.strokeStyle = col;
      ctx.lineWidth = fancy ? 2 : 1;
      ctx.strokeRect(fx - 5, cy - 5, 10, 10);
      if (fancy) {
        // Inner shading.
        ctx.fillStyle = 'rgba(120,144,168,0.5)';
        ctx.fillRect(fx - 4, cy - 4, 8, 8);
        // Sparkle highlights pulsing.
        if (Math.sin(p * 14) > 0) star(ctx, fx, cy, 2, 'rgba(255,255,255,0.95)');
      }
    }
    if (fancy) {
      // Power-up aura at user centre.
      const pulse = 0.5 + 0.5 * Math.sin(p * 10);
      gradientFill(ctx, cx, cy, 12, 'rgba(232,200,144,' + (0.35 * pulse).toFixed(2) + ')', 'rgba(168,144,72,0)');
      // Rising sparks.
      for (let i = 0; i < 4; i++) {
        const r = rng(i + 75);
        const phase = (p + r * 0.3) % 1;
        const sy = cy + 4 - phase * 16;
        px(ctx, cx + (r - 0.5) * 22 | 0, sy | 0, 2, 2, 'rgba(255,232,168,' + (1 - phase).toFixed(2) + ')');
      }
    }
  }

  // 75. tailspike — long thin barbed tail strikes from below with venom drips.
  function drawTailSpike(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const k = Math.min(1, p / 0.55);
    const ty = cy + 16 - k * 22;
    // Tail (vertical shaft).
    ctx.fillStyle = fancy ? 'rgba(120,72,168,0.95)' : '#74a';
    ctx.fillRect(cx - 1, ty, 3, k * 22);
    // Barbs.
    if (fancy) {
      for (let i = 0; i < 3; i++) {
        const by = ty + 2 + i * 6;
        if (by > cy + 14) continue;
        ctx.fillStyle = 'rgba(120,72,168,0.95)';
        ctx.beginPath();
        ctx.moveTo(cx - 1, by);
        ctx.lineTo(cx - 4, by - 2);
        ctx.lineTo(cx - 1, by + 1);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + 2, by);
        ctx.lineTo(cx + 5, by - 2);
        ctx.lineTo(cx + 2, by + 1);
        ctx.fill();
      }
    }
    // Tip stinger.
    ctx.fillStyle = fancy ? 'rgba(232,184,248,0.95)' : '#caf';
    ctx.beginPath();
    ctx.moveTo(cx, ty - 4);
    ctx.lineTo(cx - 3, ty);
    ctx.lineTo(cx + 3, ty);
    ctx.closePath();
    ctx.fill();
    if (fancy && p > 0.5) {
      // Venom drips.
      for (let i = 0; i < 3; i++) {
        const r = rng(i + 77);
        const phase = (p - 0.5) * 2 + r * 0.3;
        if (phase < 0 || phase > 1) continue;
        const dx = (r - 0.5) * 8;
        const dy = phase * 8;
        px(ctx, cx + dx | 0, ty - 2 + dy | 0, 2, 2, 'rgba(168,80,184,' + (1 - phase).toFixed(2) + ')');
      }
    }
  }

  // 76. terraquake — radial expanding wave with concentric crack rings.
  function drawTerraquake(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    // Three concentric rings rippling outward.
    for (let i = 0; i < 3; i++) {
      const r = ((p + i * 0.22) % 1) * 26;
      const a = Math.max(0, 0.85 - r * 0.025);
      if (fancy) {
        // Jagged ring (12 segments with offset).
        ctx.strokeStyle = 'rgba(120,88,56,' + a.toFixed(2) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const n = 12;
        for (let k = 0; k <= n; k++) {
          const ang = k / n * Math.PI * 2;
          const jag = (k & 1) ? 1 : 0.85;
          const x = cx + Math.cos(ang) * r * jag;
          const y = cy + 4 + Math.sin(ang) * r * jag * 0.5;
          if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else {
        ring(ctx, cx, cy + 4, r, '#864', 1);
      }
    }
    if (fancy) {
      gradientFill(ctx, cx, cy + 6, 12, 'rgba(168,120,72,' + (0.35 + 0.15 * Math.sin(p * 8)).toFixed(2) + ')', 'rgba(120,88,56,0)');
    }
  }

  // 77. dustbomb — brown explosion plume with dust cloud expanding.
  function drawDustBomb(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    if (p < 0.3) {
      // Small ball arcing in.
      const k = p / 0.3;
      const bx = cx - 16 + k * 16;
      const by = cy - 8 + k * 8 + Math.sin(k * Math.PI) * -6;
      disc(ctx, bx, by, 3, fancy ? 'rgba(168,120,72,0.95)' : '#864');
    } else {
      // Plume.
      const k = (p - 0.3) / 0.7;
      if (fancy) {
        // Layered plume clouds.
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2;
          const r = 6 + k * 14;
          const cx2 = cx + Math.cos(a) * r * 0.5;
          const cy2 = cy + Math.sin(a) * r * 0.4;
          gradientFill(ctx, cx2, cy2, 6 + k * 6, 'rgba(168,120,72,' + (0.7 * (1 - k)).toFixed(2) + ')', 'rgba(120,88,56,0)');
        }
      }
      // Dust motes.
      const motes = fancy ? 12 : 5;
      for (let i = 0; i < motes; i++) {
        const r = rng(i + 79);
        const a = (i / motes) * Math.PI * 2;
        const rad = 8 + k * 16 + r * 4;
        const dx = Math.cos(a) * rad;
        const dy = Math.sin(a) * rad * 0.5;
        px(ctx, cx + dx | 0, cy + dy | 0, 2, 2, fancy ? 'rgba(200,180,140,' + (0.85 * (1 - k)).toFixed(2) + ')' : '#dca');
      }
    }
  }

  // 78. aerialace — two crisscrossing slashes (priority, near-instant feel).
  function drawAerialAce(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    // Stage 1: slash from top-left to bottom-right.
    const local1 = Math.min(1, p / 0.35);
    if (local1 > 0) {
      const sx = cx - 14 + local1 * 28;
      const sy = cy - 14 + local1 * 28;
      streak(ctx, sx - 8, sy - 8, sx, sy, fancy ? 'rgba(255,255,255,' + (1 - local1).toFixed(2) + ')' : '#fff', fancy ? 3 : 2);
    }
    // Stage 2: slash from top-right to bottom-left (overlapping).
    const local2 = (p - 0.25) / 0.4;
    if (local2 > 0 && local2 <= 1) {
      const sx = cx + 14 - local2 * 28;
      const sy = cy - 14 + local2 * 28;
      streak(ctx, sx + 8, sy - 8, sx, sy, fancy ? 'rgba(232,248,255,' + (1 - local2).toFixed(2) + ')' : '#fff', fancy ? 3 : 2);
    }
    if (p > 0.55) {
      const ik = (p - 0.55) / 0.45;
      star(ctx, cx, cy, 5, fancy ? 'rgba(255,255,255,' + (1 - ik).toFixed(2) + ')' : '#fff');
      if (fancy) gradientFill(ctx, cx, cy, 6 + ik * 10, 'rgba(232,248,255,' + (0.6 * (1 - ik)).toFixed(2) + ')', 'rgba(168,216,248,0)');
    }
  }

  // 79. roost — wings fold down, soft dust settles, user pulses warm light.
  function drawRoost(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    // Wings curving down at user's sides.
    for (let s = -1; s <= 1; s += 2) {
      const fold = p * 0.6;
      const wx = cx + s * 14;
      ctx.strokeStyle = fancy ? 'rgba(200,180,140,0.95)' : '#ca8';
      ctx.lineWidth = fancy ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(wx, cy - 8 + fold * 12);
      ctx.quadraticCurveTo(wx + s * 4, cy, wx + s * 6, cy + 8);
      ctx.stroke();
    }
    if (fancy) {
      // Pulsing warm light at centre.
      const pulse = 0.5 + 0.5 * Math.sin(p * 8);
      gradientFill(ctx, cx, cy, 14, 'rgba(248,232,168,' + (0.3 * pulse).toFixed(2) + ')', 'rgba(248,200,80,0)');
      // Settling dust motes.
      for (let i = 0; i < 5; i++) {
        const r = rng(i + 81);
        const phase = (p + r * 0.3) % 1;
        const sx = cx + (r - 0.5) * 22;
        const sy = cy - 6 + phase * 14;
        px(ctx, sx | 0, sy | 0, 1, 1, 'rgba(200,180,140,' + (1 - phase).toFixed(2) + ')');
      }
    }
  }

  // 80. mindflay — translucent psychic tendrils wrap target, sine-warp distortion.
  function drawMindFlay(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    // Tendrils: 4 wavy lines from each side spiraling around.
    const tendrils = fancy ? 4 : 2;
    for (let i = 0; i < tendrils; i++) {
      const baseAng = (i / tendrils) * Math.PI * 2 + p * Math.PI;
      ctx.strokeStyle = fancy ? 'rgba(168,144,232,0.85)' : '#a8e';
      ctx.lineWidth = fancy ? 2 : 1;
      ctx.beginPath();
      const segs = 12;
      for (let k = 0; k <= segs; k++) {
        const t = k / segs;
        const r = 18 - t * 14;
        const ang = baseAng + t * Math.PI * 1.5;
        const wob = Math.sin(p * 8 + k * 0.5 + i) * 2;
        const x = cx + Math.cos(ang) * r + wob;
        const y = cy + Math.sin(ang) * r * 0.7;
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    if (fancy) {
      // Sine warp distortion lines through target.
      for (let i = 0; i < 4; i++) {
        const ly = cy - 8 + i * 5;
        const off = Math.sin(p * 14 + i * 0.6) * 4;
        streak(ctx, cx - 8 + off, ly, cx + 8 + off, ly, 'rgba(232,200,255,0.6)', 1);
      }
    }
  }

  // 81. cosmicward — constellation of stars connect into hexagonal shield.
  function drawCosmicWard(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const k = Math.min(1, p / 0.55);
    const nodes = 6;
    const verts = [];
    for (let i = 0; i < nodes; i++) {
      const ang = (i / nodes) * Math.PI * 2;
      const r = 16;
      verts.push([cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.7]);
    }
    // Draw stars at each vertex (twinkling).
    for (let i = 0; i < nodes; i++) {
      const twink = Math.sin(p * 12 + i) * 0.5 + 0.5;
      star(ctx, verts[i][0], verts[i][1], 2 + Math.floor(twink * 2),
        fancy ? (i & 1 ? 'rgba(232,200,168,0.95)' : 'rgba(184,200,248,0.95)') : '#fef');
    }
    // Connecting lines (fade in by k).
    if (fancy) {
      ctx.strokeStyle = 'rgba(232,232,200,' + (0.85 * k).toFixed(2) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(verts[0][0], verts[0][1]);
      for (let i = 1; i <= nodes; i++) {
        ctx.lineTo(verts[i % nodes][0], verts[i % nodes][1]);
      }
      ctx.stroke();
      // Inner shield glow.
      gradientFill(ctx, cx, cy, 14, 'rgba(184,200,248,' + (0.4 * k).toFixed(2) + ')', 'rgba(168,144,232,0)');
    }
  }

  // 82. gravitywell — concentric inward rings + 8 inward dust streaks.
  function drawGravityWell(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    // Inward-collapsing rings.
    for (let i = 0; i < 3; i++) {
      const phase = (p + i * 0.22) % 1;
      const r = 22 * (1 - phase);
      ring(ctx, cx, cy, r, fancy ? 'rgba(120,72,168,' + (0.85 * (1 - phase * 0.3)).toFixed(2) + ')' : '#74a', fancy ? 2 : 1);
    }
    // Inward streaks pulling toward centre.
    const n = fancy ? 8 : 4;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2;
      const r0 = 22 - p * 14;
      const r1 = 26 - p * 14;
      const col = fancy ? 'rgba(168,144,232,' + (0.85 - p * 0.4).toFixed(2) + ')' : '#a8e';
      streak(ctx, cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1 * 0.7,
                  cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0 * 0.7, col, fancy ? 2 : 1);
    }
    if (fancy && p > 0.7) {
      const k = (p - 0.7) / 0.3;
      gradientFill(ctx, cx, cy, 10, 'rgba(80,40,120,' + (0.7 * (1 - k)).toFixed(2) + ')', 'rgba(40,16,40,0)');
    }
  }

  // 83. solarcharge — cyan orb charges → releases as focused beam.
  function drawSolarCharge(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    if (p < 0.5) {
      // Charge phase.
      const k = p / 0.5;
      const r = 2 + k * 8;
      if (fancy) {
        gradientFill(ctx, cx - 22, cy, r + 4, 'rgba(168,232,255,' + (0.85 * k).toFixed(2) + ')', 'rgba(96,168,248,0)');
        disc(ctx, cx - 22, cy, r, 'rgba(232,255,255,0.95)');
      } else {
        disc(ctx, cx - 22, cy, r, '#cef');
      }
      // Energy lines feeding in.
      if (fancy) {
        for (let i = 0; i < 4; i++) {
          const ang = (i / 4) * Math.PI * 2;
          const dx = Math.cos(ang) * (10 - k * 8);
          const dy = Math.sin(ang) * (10 - k * 8);
          streak(ctx, cx - 22 + dx, cy + dy, cx - 22 + dx * 0.4, cy + dy * 0.4, 'rgba(168,232,255,' + k.toFixed(2) + ')', 2);
        }
      }
    } else {
      // Beam release.
      const k = (p - 0.5) / 0.5;
      const bx1 = cx - 22;
      const bx2 = cx - 22 + k * 24;
      if (fancy) {
        const grad = ctx.createLinearGradient(bx1, cy, bx2, cy);
        grad.addColorStop(0, 'rgba(96,168,248,0.5)');
        grad.addColorStop(0.5, 'rgba(168,232,255,0.95)');
        grad.addColorStop(1, 'rgba(255,255,255,0.95)');
        ctx.fillStyle = grad;
        ctx.fillRect(bx1, cy - 3, bx2 - bx1, 6);
      } else {
        ctx.fillStyle = '#cef';
        ctx.fillRect(bx1, cy - 2, bx2 - bx1, 4);
      }
      if (k > 0.8) {
        const ik = (k - 0.8) / 0.2;
        star(ctx, cx, cy, 5, fancy ? 'rgba(255,255,255,' + (1 - ik).toFixed(2) + ')' : '#fff');
      }
    }
  }

  // 84. siphonfang — long proboscis stab + glowing energy flows back.
  function drawSiphonFang(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const k = Math.min(1, p / 0.45);
    const sx = cx - 22 + k * 22;
    // Proboscis (long thin needle).
    streak(ctx, sx - 14, cy, sx, cy, fancy ? 'rgba(168,200,72,0.95)' : '#9b3', fancy ? 3 : 2);
    px(ctx, sx, cy - 1, 3, 3, fancy ? 'rgba(232,255,200,0.95)' : '#cf6');
    if (p > 0.45 && fancy) {
      // Energy motes flowing back toward attacker.
      for (let i = 0; i < 5; i++) {
        const r = rng(i + 83);
        const phase = ((p - 0.45) * 2 + r * 0.3) % 1;
        const fx = cx - phase * 22;
        const fy = cy + Math.sin(phase * Math.PI * 2 + i) * 3;
        disc(ctx, fx, fy, 2 - phase * 1.5, 'rgba(168,232,72,' + (0.85 * (1 - phase)).toFixed(2) + ')');
      }
    }
  }

  // 85. crystalspear — translucent quartz spear thrusts in with prismatic light.
  function drawCrystalSpear(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const k = Math.min(1, p / 0.55);
    const sx = cx - 26 + k * 26;
    // Spear shaft.
    ctx.strokeStyle = fancy ? 'rgba(232,232,255,0.85)' : '#eef';
    ctx.lineWidth = fancy ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(sx - 18, cy);
    ctx.lineTo(sx, cy);
    ctx.stroke();
    // Diamond tip.
    ctx.fillStyle = fancy ? 'rgba(200,232,255,0.95)' : '#aef';
    ctx.beginPath();
    ctx.moveTo(sx + 4, cy);
    ctx.lineTo(sx, cy - 4);
    ctx.lineTo(sx - 2, cy);
    ctx.lineTo(sx, cy + 4);
    ctx.closePath();
    ctx.fill();
    if (fancy) {
      // Prismatic light fragments at tip.
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2 + p * 4;
        const rad = 4 + Math.sin(p * 10 + i) * 1;
        const fx = sx + Math.cos(ang) * rad;
        const fy = cy + Math.sin(ang) * rad;
        const colors = ['rgba(248,168,232,0.8)','rgba(168,232,248,0.8)','rgba(232,248,168,0.8)','rgba(248,232,168,0.8)'];
        px(ctx, fx | 0, fy | 0, 1, 1, colors[i]);
      }
    }
    if (p > 0.5) {
      const ik = (p - 0.5) / 0.5;
      if (fancy) gradientFill(ctx, cx, cy, 6 + ik * 10, 'rgba(232,232,255,' + (0.6 * (1 - ik)).toFixed(2) + ')', 'rgba(168,216,248,0)');
    }
  }

  // 86. lifedrain — purple tether between attacker and target.
  function drawLifeDrain(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    // Tether: wavy line from off-screen-left to target.
    ctx.strokeStyle = fancy ? 'rgba(168,80,184,0.85)' : '#a4a';
    ctx.lineWidth = fancy ? 3 : 2;
    ctx.beginPath();
    const segs = 10;
    for (let k = 0; k <= segs; k++) {
      const t = k / segs;
      const x = cx - 24 + t * 24;
      const y = cy + Math.sin(p * 14 + t * Math.PI * 2) * 3;
      if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    if (fancy) {
      // Energy motes flowing back toward attacker.
      for (let i = 0; i < 6; i++) {
        const r = rng(i + 85);
        const phase = (p * 2 + r * 0.5) % 1;
        const fx = cx - phase * 24;
        const fy = cy + Math.sin(phase * Math.PI * 4 + i) * 3;
        disc(ctx, fx, fy, 2, 'rgba(232,168,255,' + (0.85 * (1 - phase * 0.5)).toFixed(2) + ')');
      }
      // Drain glow at target.
      gradientFill(ctx, cx, cy, 8, 'rgba(120,72,168,' + (0.5 - p * 0.2).toFixed(2) + ')', 'rgba(80,40,120,0)');
    }
  }

  // 87. dragondance — dragon glyph spirals around user in gold flame.
  function drawDragonDance(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    // Spiraling dragon trail: 3 segments tracing around user.
    const trail = fancy ? 18 : 8;
    for (let i = 0; i < trail; i++) {
      const t = i / trail;
      const ang = p * Math.PI * 4 - t * Math.PI * 2;
      const r = 14 - t * 4;
      const fx = cx + Math.cos(ang) * r;
      const fy = cy + Math.sin(ang) * r * 0.7;
      const a = (1 - t) * 0.9;
      const col = fancy ? (i & 1 ? 'rgba(248,200,80,' + a.toFixed(2) + ')' : 'rgba(255,144,32,' + a.toFixed(2) + ')') : '#fa4';
      px(ctx, fx - 1, fy - 1, fancy ? 3 : 2, fancy ? 3 : 2, col);
    }
    if (fancy) {
      // Dragon head shape at the spiral end.
      const ang = p * Math.PI * 4;
      const hx = cx + Math.cos(ang) * 14;
      const hy = cy + Math.sin(ang) * 14 * 0.7;
      ctx.fillStyle = 'rgba(248,200,80,0.95)';
      ctx.beginPath();
      ctx.moveTo(hx + 3, hy);
      ctx.lineTo(hx - 3, hy - 2);
      ctx.lineTo(hx - 3, hy + 2);
      ctx.closePath();
      ctx.fill();
      // Power-up aura at user.
      gradientFill(ctx, cx, cy, 16, 'rgba(255,144,32,' + (0.3 + 0.15 * Math.sin(p * 8)).toFixed(2) + ')', 'rgba(168,72,32,0)');
    }
  }

  // 88. tripledagger — three diagonal blade-flash slashes in rapid succession.
  function drawTripleDagger(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const stages = [0, 0.15, 0.3];
    for (let i = 0; i < 3; i++) {
      const local = (p - stages[i]) / 0.3;
      if (local <= 0 || local > 1) continue;
      const a = (1 - local).toFixed(2);
      // Diagonal blade flash.
      const off = -10 + i * 4;
      const x1 = cx - 12 + off + local * 8;
      const y1 = cy - 10 + i * 4;
      const x2 = x1 + 18;
      const y2 = y1 + 18;
      streak(ctx, x1, y1, x2, y2, fancy ? 'rgba(232,200,232,' + a + ')' : '#dcd', fancy ? 3 : 2);
      // Bright tip.
      if (fancy) px(ctx, x2 - 1, y2 - 1, 3, 3, 'rgba(255,255,255,' + a + ')');
    }
    if (fancy && p > 0.55) {
      const ik = (p - 0.55) / 0.45;
      gradientFill(ctx, cx, cy, 8 + ik * 10, 'rgba(80,40,80,' + (0.55 * (1 - ik)).toFixed(2) + ')', 'rgba(40,16,40,0)');
    }
  }

  // 89. honehook — two bronze/gold crescent fangs rasp together with
  // bright orange sparks + a "stat up" arrow indicator. (Reworked in
  // v0.52.1 — old near-white-on-white was nearly invisible.)
  function drawHoneHook(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const off = Math.sin(p * 18) * 4;
    // Two crescent fangs scraping past each other.
    for (let s = -1; s <= 1; s += 2) {
      // Dark outline first.
      if (fancy) {
        ctx.fillStyle = 'rgba(80,40,16,0.95)';
        ctx.beginPath();
        ctx.moveTo(cx - 9 + s * off, cy + s * 4);
        ctx.quadraticCurveTo(cx + s * off, cy + s * -3, cx + 9 + s * off, cy + s * 4);
        ctx.quadraticCurveTo(cx + s * off, cy + s * 1, cx - 9 + s * off, cy + s * 4);
        ctx.closePath();
        ctx.fill();
      }
      // Bronze/gold fill.
      ctx.fillStyle = fancy ? 'rgba(232,168,72,0.98)' : '#ea6';
      ctx.beginPath();
      ctx.moveTo(cx - 8 + s * off, cy + s * 4);
      ctx.quadraticCurveTo(cx + s * off, cy + s * -2, cx + 8 + s * off, cy + s * 4);
      ctx.quadraticCurveTo(cx + s * off, cy + s * 1, cx - 8 + s * off, cy + s * 4);
      ctx.closePath();
      ctx.fill();
      if (fancy) {
        // Bright highlight along the fang edge.
        ctx.strokeStyle = 'rgba(255,232,168,0.95)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - 6 + s * off, cy + s * 2);
        ctx.quadraticCurveTo(cx + s * off, cy + s * -1, cx + 6 + s * off, cy + s * 2);
        ctx.stroke();
      }
    }
    // Bright orange sharpening sparks streaming between fangs.
    if (fancy) {
      const spark = (Math.sin(p * 24) > 0) ? 1 : -1;
      for (let i = 0; i < 5; i++) {
        const sx = cx + (i - 2) * 4;
        const sy = cy + spark * 5;
        const intensity = Math.abs(Math.sin(p * 20 + i));
        if (intensity > 0.35) {
          px(ctx, sx, sy, 2, 2, 'rgba(255,144,32,' + (0.95 * intensity).toFixed(2) + ')');
          px(ctx, sx, sy + spark, 1, 1, 'rgba(255,232,168,' + intensity.toFixed(2) + ')');
        }
      }
      // Upward "stat up" arrow indicator pulsing.
      const arrowY = cy - 12 - Math.sin(p * 6) * 2;
      const arrowA = (0.65 + 0.25 * Math.sin(p * 8)).toFixed(2);
      ctx.fillStyle = 'rgba(255,232,168,' + arrowA + ')';
      ctx.beginPath();
      ctx.moveTo(cx, arrowY - 3);
      ctx.lineTo(cx + 3, arrowY);
      ctx.lineTo(cx + 1, arrowY);
      ctx.lineTo(cx + 1, arrowY + 3);
      ctx.lineTo(cx - 1, arrowY + 3);
      ctx.lineTo(cx - 1, arrowY);
      ctx.lineTo(cx - 3, arrowY);
      ctx.closePath();
      ctx.fill();
    }
  }

  // 90. magnetburst — two magnetic poles arc lightning then explode.
  function drawMagnetBurst(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    if (p < 0.55) {
      // N and S pole shapes (red and blue blocks).
      const k = p / 0.55;
      const gap = (1 - k) * 18 + 6;
      for (let s = -1; s <= 1; s += 2) {
        const px2 = cx + s * gap;
        ctx.fillStyle = s < 0 ? (fancy ? 'rgba(232,80,80,0.95)' : '#e44') : (fancy ? 'rgba(80,144,232,0.95)' : '#48d');
        ctx.fillRect(px2 - 3, cy - 4, 6, 8);
        // Pole letter.
        if (fancy) {
          ctx.fillStyle = 'rgba(255,255,255,0.95)';
          ctx.fillRect(px2 - 1, cy - 2, 2, 4);
        }
      }
      // Arc between (zigzag).
      if (fancy && k > 0.3) {
        ctx.strokeStyle = 'rgba(255,232,168,0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - gap + 3, cy);
        const segs = 5;
        for (let i = 1; i <= segs; i++) {
          const t = i / segs;
          const x = cx - gap + 3 + t * (gap * 2 - 6);
          const y = cy + ((i & 1) ? 3 : -3);
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    } else {
      // Explosion at centre.
      const k = (p - 0.55) / 0.45;
      const r = 4 + k * 18;
      if (fancy) {
        gradientFill(ctx, cx, cy, r, 'rgba(255,232,168,' + (0.85 * (1 - k)).toFixed(2) + ')', 'rgba(168,144,232,0)');
        ring(ctx, cx, cy, r, 'rgba(255,255,232,' + (1 - k).toFixed(2) + ')', 2);
      } else {
        ring(ctx, cx, cy, r, '#ffd', 1);
      }
      // Outward sparks.
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const dx = Math.cos(a) * r;
        const dy = Math.sin(a) * r;
        px(ctx, cx + dx | 0, cy + dy | 0, 2, 2, i & 1 ? 'rgba(232,80,80,' + (1 - k).toFixed(2) + ')' : 'rgba(80,144,232,' + (1 - k).toFixed(2) + ')');
      }
    }
  }

  // 91. mirrorshield — chrome mirror plate raises in front of user.
  function drawMirrorShield(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const k = Math.min(1, p / 0.55);
    const plateH = k * 22;
    // Plate body.
    if (fancy) {
      const grad = ctx.createLinearGradient(cx - 10, 0, cx + 10, 0);
      grad.addColorStop(0, 'rgba(168,180,200,0.95)');
      grad.addColorStop(0.5, 'rgba(232,240,248,0.95)');
      grad.addColorStop(1, 'rgba(168,180,200,0.95)');
      ctx.fillStyle = grad;
      ctx.fillRect(cx - 10, cy - plateH / 2, 20, plateH);
      // Diagonal glints.
      for (let i = 0; i < 3; i++) {
        const gy = cy - plateH / 2 + i * (plateH / 3) + (p * 8) % (plateH / 3);
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - 8, gy);
        ctx.lineTo(cx + 8, gy - 4);
        ctx.stroke();
      }
      // Border.
      ctx.strokeStyle = 'rgba(120,144,168,0.95)';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - 10, cy - plateH / 2, 20, plateH);
    } else {
      ctx.fillStyle = '#cdc';
      ctx.fillRect(cx - 8, cy - plateH / 2, 16, plateH);
    }
    if (fancy && p > 0.6) {
      // Reflection sparkle.
      const sx = cx - 4 + Math.sin(p * 8) * 4;
      star(ctx, sx, cy - 4, 2, 'rgba(255,255,255,' + (0.85 * (1 - p * 0.5)).toFixed(2) + ')');
    }
  }

  // 92. metalsong — bell-strike rings + audible curve waveforms.
  function drawMetalSong(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    // Bell silhouette at centre.
    if (fancy) {
      ctx.fillStyle = 'rgba(200,180,140,0.95)';
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy + 4);
      ctx.quadraticCurveTo(cx - 8, cy - 4, cx, cy - 6);
      ctx.quadraticCurveTo(cx + 8, cy - 4, cx + 6, cy + 4);
      ctx.lineTo(cx + 6, cy + 6);
      ctx.lineTo(cx - 6, cy + 6);
      ctx.closePath();
      ctx.fill();
      // Bell shimmer.
      px(ctx, cx - 2, cy - 2, 2, 2, 'rgba(255,232,168,0.95)');
      // Audio curve waveforms (oscillating horizontal lines).
      for (let i = 0; i < 4; i++) {
        const wx = cx + 10 + i * 4;
        ctx.strokeStyle = 'rgba(232,200,144,' + (0.85 - i * 0.15).toFixed(2) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(wx, cy - 6);
        for (let k = 1; k <= 6; k++) {
          const y = cy - 6 + k * 2;
          const wob = Math.sin(p * 12 + k + i) * 2;
          ctx.lineTo(wx + wob, y);
        }
        ctx.stroke();
      }
      // Mirror on other side.
      for (let i = 0; i < 4; i++) {
        const wx = cx - 10 - i * 4;
        ctx.strokeStyle = 'rgba(232,200,144,' + (0.85 - i * 0.15).toFixed(2) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(wx, cy - 6);
        for (let k = 1; k <= 6; k++) {
          const y = cy - 6 + k * 2;
          const wob = Math.sin(p * 12 + k - i) * 2;
          ctx.lineTo(wx + wob, y);
        }
        ctx.stroke();
      }
    }
    // Outward rings.
    for (let i = 0; i < 3; i++) {
      const r = 4 + ((p + i * 0.22) % 1) * 24;
      ring(ctx, cx, cy, r, fancy ? 'rgba(232,200,144,' + Math.max(0, 0.85 - r * 0.02).toFixed(2) + ')' : '#dca', fancy ? 2 : 1);
    }
  }

  // 93. moonlight — crescent moon rises overhead with soft silver glow.
  function drawMoonlight(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const k = Math.min(1, p / 0.6);
    // Moon rises from below.
    const my = cy - 6 - k * 12;
    if (fancy) {
      // Crescent: white disc + offset shadow disc.
      gradientFill(ctx, cx + 2, my, 10, 'rgba(232,232,255,0.95)', 'rgba(184,200,248,0)');
      disc(ctx, cx + 2, my, 6, 'rgba(248,248,255,0.95)');
      ctx.fillStyle = 'rgba(40,16,40,1)';
      disc(ctx, cx + 4, my - 1, 5, 'rgba(80,72,120,0.95)');
      // Silver glow over user.
      gradientFill(ctx, cx, cy, 16, 'rgba(232,232,255,' + (0.3 + 0.15 * Math.sin(p * 6)).toFixed(2) + ')', 'rgba(184,200,248,0)');
    } else {
      disc(ctx, cx, my, 5, '#eef');
    }
    if (fancy) {
      // Twinkling stars around.
      for (let i = 0; i < 4; i++) {
        const r = rng(i + 87);
        if (Math.sin(p * 8 + i) > 0) {
          star(ctx, cx - 16 + r * 32, my - 8 + r * 4, 1, 'rgba(255,255,232,0.95)');
        }
      }
    }
  }

  // 94. mistygale — pastel gust sweeps over target with pink-white misty trails.
  function drawMistyGale(ctx, p, dur, tier, cx, cy, w, h) {
    const fancy = isFancy(tier);
    const xOff = -20 + p * 40;
    // Misty horizontal sheets.
    if (fancy) {
      for (let i = 0; i < 4; i++) {
        const ly = cy - 8 + i * 5;
        const grad = ctx.createLinearGradient(cx - 24 + xOff, ly, cx + 12 + xOff, ly);
        grad.addColorStop(0, 'rgba(248,200,232,0)');
        grad.addColorStop(0.5, 'rgba(248,216,248,' + (0.55 - i * 0.1).toFixed(2) + ')');
        grad.addColorStop(1, 'rgba(248,200,232,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(cx - 24 + xOff, ly - 1, 36, 3);
      }
      // Sparkle motes drifting with the gust.
      for (let i = 0; i < 8; i++) {
        const r = rng(i + 89);
        const phase = (p + r * 0.4) % 1;
        const sx = cx - 24 + xOff + phase * 36 - 6;
        const sy = cy - 8 + r * 16;
        const twink = Math.sin(p * 18 + i);
        if (twink > 0.3) star(ctx, sx, sy, 1, 'rgba(248,216,248,0.95)');
      }
    } else {
      ctx.fillStyle = '#fcf';
      ctx.fillRect(cx - 16 + xOff, cy - 6, 30, 12);
    }
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
    moonbeam:     drawMoonbeam,
    // 30 new signature overrides added in v0.50.0:
    tackle:       drawTackle,
    scratch:      drawScratch,
    quickjab:     drawQuickJab,
    growl:        drawGrowl,
    tailwhip:     drawTailWhip,
    lullaby:      drawLullaby,
    harden:       drawHarden,
    screech:      drawScreech,
    ember:        drawEmber,
    vinelash:     drawVineLash,
    bugbite:      drawBugBite,
    pinmissile:   drawPinMissile,
    poisonsting:  drawPoisonSting,
    acidspray:    drawAcidSpray,
    toxicspike:   drawToxicSpike,
    rocktoss:     drawRockToss,
    earthbump:    drawEarthBump,
    sandattack:   drawSandAttack,
    focusjab:     drawFocusJab,
    palmstrike:   drawPalmStrike,
    shimmer:      drawShimmer,
    dazzle:       drawDazzle,
    hypnoray:     drawHypnoRay,
    agility:      drawAgility,
    bite:         drawBite,
    freezewind:   drawFreezeWind,
    spectralhowl: drawSpectralHowl,
    ghostgrip:    drawGhostGrip,
    dragonbreath: drawDragonBreath,
    fairykiss:    drawFairyKiss,
    // 30 more signatures added in v0.51.0 (each pairs with a new move
    // in js/data.js):
    megapunch:      drawMegaPunch,
    bodyslam:       drawBodySlam,
    magmaburst:     drawMagmaBurst,
    solarflare:     drawSolarFlare,
    tidalwave:      drawTidalWave,
    icebeam:        drawIceBeam,
    avalanche:      drawAvalanche,
    thunderclap:    drawThunderclap,
    voltcage:       drawVoltCage,
    hurricaneblast: drawHurricaneBlast,
    skyrend:        drawSkyRend,
    earthquake:     drawEarthquake,
    sandstorm:      drawSandstorm,
    rockslide:      drawRockSlide,
    stoneedge:      drawStoneEdge,
    petalstorm:     drawPetalStorm,
    rootbind:       drawRootBind,
    toxicgas:       drawToxicGas,
    venomtide:      drawVenomTide,
    mindcrush:      drawMindCrush,
    telekinesis:    drawTelekinesis,
    swarmstrike:    drawSwarmStrike,
    karatechop:     drawKarateChop,
    focusblast:     drawFocusBlast,
    shadowstrike:   drawShadowStrike,
    nightveil:      drawNightVeil,
    hauntcurse:     drawHauntCurse,
    phantompulse:   drawPhantomPulse,
    dragonpulse:    drawDragonPulse,
    stardust:       drawStardust,
    // 34 more signatures added in v0.52.0:
    doublestrike:   drawDoubleStrike,
    recklesscharge: drawRecklessCharge,
    firefist:       drawFireFist,
    searingbeam:    drawSearingBeam,
    willowisp:      drawWillOWisp,
    dive:           drawDive,
    tideguard:      drawTideGuard,
    thunderfang:    drawThunderFang,
    zaplance:       drawZapLance,
    forestburst:    drawForestBurst,
    seedshot:       drawSeedShot,
    icefang:        drawIceFang,
    flashfreeze:    drawFlashFreeze,
    ironfist:       drawIronFist,
    tailspike:      drawTailSpike,
    terraquake:     drawTerraquake,
    dustbomb:       drawDustBomb,
    aerialace:      drawAerialAce,
    roost:          drawRoost,
    mindflay:       drawMindFlay,
    cosmicward:     drawCosmicWard,
    gravitywell:    drawGravityWell,
    solarcharge:    drawSolarCharge,
    siphonfang:     drawSiphonFang,
    crystalspear:   drawCrystalSpear,
    lifedrain:      drawLifeDrain,
    dragondance:    drawDragonDance,
    tripledagger:   drawTripleDagger,
    honehook:       drawHoneHook,
    magnetburst:    drawMagnetBurst,
    mirrorshield:   drawMirrorShield,
    metalsong:      drawMetalSong,
    moonlight:      drawMoonlight,
    mistygale:      drawMistyGale
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
    shockwave:   0.80,
    // Multi-stage signature timings.
    scratch:     0.80,
    quickjab:    0.75,
    harden:      0.95,
    rocktoss:    0.95,
    earthbump:   0.90,
    vinelash:    0.90,
    pinmissile:  0.85,
    toxicspike:  0.85,
    bite:        0.80,
    freezewind:  0.95,
    dragonbreath:0.95,
    hypnoray:    1.00,
    dazzle:      0.90,
    ghostgrip:   0.90,
    fairykiss:   0.85,
    // v0.52.1 — visibility rework.
    tailwhip:    0.85,
    // v0.51.0 multi-stage signatures.
    avalanche:      1.00,
    earthquake:     0.95,
    hurricaneblast: 1.00,
    focusblast:     1.00,
    telekinesis:    0.95,
    voltcage:       0.95,
    swarmstrike:    0.90,
    petalstorm:     0.95,
    rootbind:       1.00,
    magmaburst:     0.95,
    solarflare:     1.10,
    dragonpulse:    0.95,
    tidalwave:      0.95,
    sandstorm:      0.90,
    stardust:       0.95,
    // v0.52.0 multi-stage signatures.
    doublestrike:   0.80,
    recklesscharge: 0.95,
    searingbeam:    1.00,
    willowisp:      1.00,
    dive:           1.05,
    tideguard:      0.95,
    thunderfang:    0.85,
    forestburst:    0.90,
    seedshot:       0.95,
    flashfreeze:    1.00,
    ironfist:       0.95,
    tailspike:      0.95,
    terraquake:     0.95,
    dustbomb:       0.95,
    mindflay:       1.00,
    cosmicward:     0.95,
    gravitywell:    1.00,
    solarcharge:    1.00,
    dragondance:    1.00,
    tripledagger:   0.85,
    magnetburst:    1.05,
    metalsong:      1.00,
    moonlight:      1.00,
    mistygale:      0.95
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
