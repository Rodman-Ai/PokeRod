// Procedural creature sprite renderer. Uses creature.design to vary art.
'use strict';

(function(){
  function px(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x|0, y|0, w|0, h|0);
  }

  // Draws a creature into a pixel-art canvas of size sizePx x sizePx,
  // scaled so the whole sprite fits regardless of size.
  // The internal grid is 32x32 'logical pixels'.
  function drawCreature(ctx, species, sx, sy, sizePx, isBack) {
    const sp = window.PR_DATA.CREATURES[species];
    if (!sp) return;
    const d = sp.design;
    const scale = sizePx / 32;
    const cx = sx, cy = sy;
    const set = (gx, gy, color) => {
      px(ctx, cx + gx*scale, cy + gy*scale, Math.ceil(scale), Math.ceil(scale), color);
    };
    const fillRect = (gx, gy, gw, gh, color) => {
      ctx.fillStyle = color;
      ctx.fillRect((cx + gx*scale)|0, (cy + gy*scale)|0,
                   Math.ceil(gw*scale), Math.ceil(gh*scale));
    };
    drawShape(set, fillRect, d, isBack);
    drawRedTuft(set, fillRect, d);
  }

  function drawRedTuft(set, rect, d) {
    // Signature red tuft: a small flame-like crest on top of every creature.
    const tx = d.tuftX !== undefined ? d.tuftX : 16;
    const ty = d.tuftY !== undefined ? d.tuftY : (d.shape === 'caterpillar' ? 14 : 9);
    rect(tx-2, ty+1, 5, 2, '#a82010');
    rect(tx-2, ty,   5, 1, '#d83020');
    rect(tx-1, ty-1, 3, 1, '#e84838');
    rect(tx,   ty-2, 1, 1, '#f0a020');
  }

  function drawShape(set, rect, d, isBack) {
    const [a, b, c] = d.palette;
    const big = d.big;
    switch (d.shape) {
      case 'fox':       drawFox(set, rect, a, b, c, big, d.accent); break;
      case 'turtle':    drawTurtle(set, rect, a, b, c, big); break;
      case 'plant':     drawPlant(set, rect, a, b, c, big); break;
      case 'mouse':     drawMouse(set, rect, a, b, c, d.accent); break;
      case 'rock':      drawRock(set, rect, a, b, c); break;
      case 'bird':      drawBird(set, rect, a, b, c); break;
      case 'caterpillar': drawCaterpillar(set, rect, a, b, c); break;
      case 'bat':       drawBat(set, rect, a, b, c); break;
      case 'fish':      drawFish(set, rect, a, b, c); break;
      default:          drawBlob(set, rect, a, b, c);
    }
  }

  // Helpers: draw filled ellipse on 32x32 grid using rect for spans.
  function ellipse(rect, cx, cy, rx, ry, color) {
    for (let y = -ry; y <= ry; y++) {
      const w = Math.floor(Math.sqrt(1 - (y*y)/(ry*ry)) * rx);
      if (!isFinite(w) || w <= 0) continue;
      rect(cx - w, cy + y, w*2 + 1, 1, color);
    }
  }
  function ring(set, cx, cy, rx, ry, color) {
    for (let a = 0; a < Math.PI*2; a += 0.05) {
      set(Math.round(cx + Math.cos(a)*rx), Math.round(cy + Math.sin(a)*ry), color);
    }
  }
  function eyes(set, lx, ly, rx, ry, white, pupil) {
    set(lx, ly, pupil); set(lx+1, ly, pupil);
    set(rx, ry, pupil); set(rx+1, ry, pupil);
    if (white) { set(lx, ly-1, white); set(rx, ry-1, white); }
  }

  function drawFox(set, rect, a, b, c, big, accent) {
    const cy = big ? 18 : 19;
    const rx = big ? 10 : 8, ry = big ? 9 : 7;
    ellipse(rect, 16, cy, rx, ry, a);
    ellipse(rect, 16, cy, rx-2, ry-2, b);
    rect(10, cy-9, 4, 5, a); rect(18, cy-9, 4, 5, a);
    set(11, cy-8, c); set(20, cy-8, c);
    rect(13, cy-3, 6, 5, a);
    set(14, cy-1, c); set(17, cy-1, c);
    set(15, cy+1, c); set(16, cy+1, c);
    rect(10, cy+5, 3, 2, a); rect(19, cy+5, 3, 2, a);
    rect(11, cy+6, 2, 1, c); rect(20, cy+6, 2, 1, c);
    if (accent === 'flame') {
      rect(22, cy+2, 3, 4, '#f0c020');
      rect(23, cy, 3, 5, '#f8e040');
      rect(24, cy-2, 2, 4, '#fff080');
    } else if (accent === 'tail') {
      rect(22, cy+2, 4, 3, b);
      rect(24, cy+1, 3, 4, a);
    }
  }

  function drawTurtle(set, rect, a, b, c, big) {
    const cy = 19;
    ellipse(rect, 16, cy, big?11:9, big?7:6, a);
    ellipse(rect, 16, cy-1, big?9:7, big?5:4, b);
    rect(10, cy+2, 3, 4, c); rect(20, cy+2, 3, 4, c);
    rect(10, cy+5, 3, 1, '#202020'); rect(20, cy+5, 3, 1, '#202020');
    rect(13, cy-7, 6, 5, b);
    set(14, cy-5, '#000'); set(17, cy-5, '#000');
    set(14, cy-6, '#fff'); set(17, cy-6, '#fff');
    rect(15, cy-3, 3, 1, c);
    rect(22, cy+1, 3, 2, b);
  }

  function drawPlant(set, rect, a, b, c, big) {
    const cy = 19;
    ellipse(rect, 16, cy, big?10:8, big?8:7, a);
    ellipse(rect, 16, cy, big?8:6, big?6:5, c);
    set(13, cy-1, '#000'); set(14, cy-1, '#000');
    set(18, cy-1, '#000'); set(19, cy-1, '#000');
    set(13, cy-2, '#fff'); set(18, cy-2, '#fff');
    rect(14, cy+2, 5, 1, c);
    rect(11, cy-7, 4, 4, b);
    rect(13, cy-9, 2, 3, b);
    rect(17, cy-7, 4, 4, b);
    rect(19, cy-9, 2, 3, b);
    rect(14, cy-10, 4, 2, '#80c038');
  }

  function drawMouse(set, rect, a, b, c, accent) {
    const cy = 19;
    ellipse(rect, 16, cy, 8, 7, a);
    rect(10, cy-9, 3, 5, a); rect(20, cy-9, 3, 5, a);
    rect(11, cy-8, 1, 3, b);
    rect(21, cy-8, 1, 3, b);
    set(13, cy-2, '#000'); set(14, cy-2, '#000');
    set(18, cy-2, '#000'); set(19, cy-2, '#000');
    set(13, cy-3, '#fff'); set(18, cy-3, '#fff');
    rect(15, cy, 3, 1, '#000');
    set(11, cy+2, c); set(21, cy+2, c);
    if (accent === 'bolt') {
      rect(23, cy+1, 1, 2, c);
      rect(24, cy+2, 2, 2, c);
      rect(23, cy+4, 2, 2, c);
    } else if (accent === 'tail') {
      rect(23, cy+2, 4, 1, a);
    }
  }

  function drawRock(set, rect, a, b, c) {
    const cy = 19;
    ellipse(rect, 16, cy, 10, 7, a);
    ellipse(rect, 16, cy-1, 9, 6, c);
    rect(8, cy+2, 4, 3, b);
    rect(20, cy+2, 4, 3, b);
    rect(11, cy-3, 2, 2, '#000'); rect(19, cy-3, 2, 2, '#000');
    set(11, cy-4, '#fff'); set(19, cy-4, '#fff');
    rect(13, cy, 6, 1, '#000');
    set(13, cy-6, b); set(20, cy-7, b); set(17, cy-8, b);
  }

  function drawBird(set, rect, a, b, c) {
    const cy = 19;
    ellipse(rect, 16, cy, 8, 6, a);
    ellipse(rect, 16, cy+1, 6, 4, b);
    ellipse(rect, 16, cy-7, 5, 4, a);
    set(14, cy-7, '#000'); set(18, cy-7, '#000');
    set(14, cy-8, '#fff'); set(18, cy-8, '#fff');
    rect(15, cy-5, 3, 2, '#f0c020');
    rect(8, cy-2, 4, 4, a);
    rect(20, cy-2, 4, 4, a);
    rect(7, cy, 3, 2, c);
    rect(22, cy, 3, 2, c);
    rect(14, cy+5, 1, 2, '#f0c020');
    rect(17, cy+5, 1, 2, '#f0c020');
  }

  function drawCaterpillar(set, rect, a, b, c) {
    const cy = 21;
    ellipse(rect, 11, cy, 4, 3, a);
    ellipse(rect, 17, cy, 4, 3, a);
    ellipse(rect, 23, cy, 4, 3, a);
    ellipse(rect, 8, cy-1, 4, 4, a);
    set(7, cy-2, '#000'); set(10, cy-2, '#000');
    set(7, cy-3, '#fff'); set(10, cy-3, '#fff');
    rect(7, cy, 4, 1, c);
    rect(11, cy-5, 1, 2, b);
    rect(17, cy-5, 1, 2, b);
    rect(23, cy-5, 1, 2, b);
    set(11, cy-6, c); set(17, cy-6, c); set(23, cy-6, c);
  }

  function drawBat(set, rect, a, b, c) {
    const cy = 18;
    ellipse(rect, 16, cy, 5, 4, a);
    rect(9, cy-3, 7, 6, b);
    rect(7, cy-1, 9, 5, b);
    rect(17, cy-3, 7, 6, b);
    rect(17, cy-1, 9, 5, b);
    rect(13, cy-7, 1, 3, a); rect(19, cy-7, 1, 3, a);
    set(14, cy-1, c); set(18, cy-1, c);
    rect(15, cy+2, 3, 1, '#000');
    set(14, cy+1, '#fff'); set(19, cy+1, '#fff');
  }

  function drawFish(set, rect, a, b, c) {
    const cy = 19;
    ellipse(rect, 15, cy, 7, 5, a);
    rect(8, cy-3, 4, 8, a);
    rect(7, cy-1, 1, 4, b);
    rect(20, cy-3, 3, 3, b);
    rect(20, cy+2, 3, 3, b);
    set(13, cy-1, '#000'); set(14, cy-1, '#fff');
    rect(11, cy+1, 2, 1, '#000');
    rect(16, cy, 4, 1, b);
  }

  function drawBlob(set, rect, a, b, c) {
    const cy = 19;
    ellipse(rect, 16, cy, 8, 7, a);
    ellipse(rect, 16, cy-1, 6, 5, b);
    set(13, cy-2, '#000'); set(18, cy-2, '#000');
    rect(15, cy+1, 3, 1, '#000');
  }

  window.PR_MONS = { drawCreature };
})();
