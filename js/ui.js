// UI helpers: text rendering, dialog boxes, menus.
'use strict';

(function(){
  // Tiny pixel font: each glyph is 5 wide, 7 tall, drawn as 1px squares from a
  // bit pattern stored as 7 numbers per glyph.
  const FONT = {
    'A':[0x0E,0x11,0x11,0x1F,0x11,0x11,0x11],
    'B':[0x1E,0x11,0x11,0x1E,0x11,0x11,0x1E],
    'C':[0x0E,0x11,0x10,0x10,0x10,0x11,0x0E],
    'D':[0x1C,0x12,0x11,0x11,0x11,0x12,0x1C],
    'E':[0x1F,0x10,0x10,0x1E,0x10,0x10,0x1F],
    'F':[0x1F,0x10,0x10,0x1E,0x10,0x10,0x10],
    'G':[0x0E,0x11,0x10,0x17,0x11,0x11,0x0F],
    'H':[0x11,0x11,0x11,0x1F,0x11,0x11,0x11],
    'I':[0x0E,0x04,0x04,0x04,0x04,0x04,0x0E],
    'J':[0x07,0x02,0x02,0x02,0x02,0x12,0x0C],
    'K':[0x11,0x12,0x14,0x18,0x14,0x12,0x11],
    'L':[0x10,0x10,0x10,0x10,0x10,0x10,0x1F],
    'M':[0x11,0x1B,0x15,0x15,0x11,0x11,0x11],
    'N':[0x11,0x19,0x15,0x13,0x11,0x11,0x11],
    'O':[0x0E,0x11,0x11,0x11,0x11,0x11,0x0E],
    'P':[0x1E,0x11,0x11,0x1E,0x10,0x10,0x10],
    'Q':[0x0E,0x11,0x11,0x11,0x15,0x12,0x0D],
    'R':[0x1E,0x11,0x11,0x1E,0x14,0x12,0x11],
    'S':[0x0F,0x10,0x10,0x0E,0x01,0x01,0x1E],
    'T':[0x1F,0x04,0x04,0x04,0x04,0x04,0x04],
    'U':[0x11,0x11,0x11,0x11,0x11,0x11,0x0E],
    'V':[0x11,0x11,0x11,0x11,0x11,0x0A,0x04],
    'W':[0x11,0x11,0x11,0x15,0x15,0x15,0x0A],
    'X':[0x11,0x11,0x0A,0x04,0x0A,0x11,0x11],
    'Y':[0x11,0x11,0x11,0x0A,0x04,0x04,0x04],
    'Z':[0x1F,0x01,0x02,0x04,0x08,0x10,0x1F],
    '0':[0x0E,0x11,0x13,0x15,0x19,0x11,0x0E],
    '1':[0x04,0x0C,0x04,0x04,0x04,0x04,0x0E],
    '2':[0x0E,0x11,0x01,0x06,0x08,0x10,0x1F],
    '3':[0x0E,0x11,0x01,0x06,0x01,0x11,0x0E],
    '4':[0x02,0x06,0x0A,0x12,0x1F,0x02,0x02],
    '5':[0x1F,0x10,0x1E,0x01,0x01,0x11,0x0E],
    '6':[0x06,0x08,0x10,0x1E,0x11,0x11,0x0E],
    '7':[0x1F,0x01,0x02,0x04,0x08,0x08,0x08],
    '8':[0x0E,0x11,0x11,0x0E,0x11,0x11,0x0E],
    '9':[0x0E,0x11,0x11,0x0F,0x01,0x02,0x0C],
    ' ':[0,0,0,0,0,0,0],
    '$':[0x04,0x0F,0x14,0x0E,0x05,0x1E,0x04],
    '*':[0,0x15,0x0E,0x1F,0x0E,0x15,0],
    '+':[0,0x04,0x04,0x1F,0x04,0x04,0],
    '.':[0,0,0,0,0,0x0C,0x0C],
    ',':[0,0,0,0,0,0x0C,0x08],
    '!':[0x04,0x04,0x04,0x04,0x04,0,0x04],
    '?':[0x0E,0x11,0x01,0x02,0x04,0,0x04],
    "'":[0x04,0x04,0,0,0,0,0],
    ':':[0,0x04,0,0,0x04,0,0],
    '-':[0,0,0,0x0E,0,0,0],
    '/':[0x01,0x02,0x02,0x04,0x08,0x08,0x10],
    '(':[0x02,0x04,0x08,0x08,0x08,0x04,0x02],
    ')':[0x08,0x04,0x02,0x02,0x02,0x04,0x08],
    '<':[0x02,0x04,0x08,0x10,0x08,0x04,0x02],
    '>':[0x10,0x08,0x04,0x02,0x04,0x08,0x10]
  };

  function drawChar(ctx, ch, x, y, color) {
    const g = FONT[ch] || FONT[ch.toUpperCase()] || FONT['?'];
    ctx.fillStyle = color;
    for (let row = 0; row < 7; row++) {
      const bits = g[row];
      for (let col = 0; col < 5; col++) {
        if (bits & (1 << (4 - col))) ctx.fillRect(x + col, y + row, 1, 1);
      }
    }
  }

  function drawText(ctx, text, x, y, color) {
    color = color || '#202020';
    let cx = x, cy = y;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '\n') { cx = x; cy += 9; continue; }
      drawChar(ctx, ch, cx, cy, color);
      cx += 6;
    }
  }

  function textWidth(text) { return text.length * 6; }

  function wrap(text, maxChars) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      if (!line.length) { line = w; continue; }
      if (line.length + 1 + w.length > maxChars) { lines.push(line); line = w; }
      else line += ' ' + w;
    }
    if (line.length) lines.push(line);
    return lines;
  }

  // Draw a bordered box.
  function box(ctx, x, y, w, h, fill, border) {
    ctx.fillStyle = border || '#202020';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = fill || '#f8f8f8';
    ctx.fillRect(x+2, y+2, w-4, h-4);
    // inner shadow line
    ctx.fillStyle = border || '#202020';
    ctx.fillRect(x+3, y+3, w-6, 1);
  }

  function panel(ctx, x, y, w, h, opts) {
    opts = opts || {};
    const border = opts.border || '#202020';
    const fill = opts.fill || '#f8f8f8';
    const shadow = opts.shadow || '#806040';
    const hi = opts.highlight || '#ffffff';
    ctx.fillStyle = '#101018';
    ctx.fillRect(x + 2, y + 3, w, h);
    ctx.fillStyle = border;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = shadow;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = fill;
    ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
    ctx.fillStyle = hi;
    ctx.fillRect(x + 3, y + 3, w - 6, 1);
    ctx.fillStyle = opts.lowlight || 'rgba(0,0,0,0.12)';
    ctx.fillRect(x + 3, y + h - 4, w - 6, 1);
  }

  function header(ctx, text, x, y, w, opts) {
    opts = opts || {};
    ctx.fillStyle = opts.fill || '#202020';
    ctx.fillRect(x, y, w, 12);
    ctx.fillStyle = opts.line || '#f0c020';
    ctx.fillRect(x, y + 10, w, 2);
    drawText(ctx, text, x + 5, y + 3, opts.text || '#fff');
  }

  function selectBar(ctx, x, y, w, h, active) {
    ctx.fillStyle = active ? '#f0c020' : 'rgba(56,88,144,0.14)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = active ? '#b07010' : 'rgba(32,32,32,0.12)';
    ctx.fillRect(x, y + h - 2, w, 2);
  }

  function chip(ctx, x, y, text, opts) {
    opts = opts || {};
    const w = Math.max(18, textWidth(text) + 8);
    const fill = opts.fill || '#e8f0ff';
    const border = opts.border || '#385890';
    ctx.fillStyle = border;
    ctx.fillRect(x, y, w, 11);
    ctx.fillStyle = fill;
    ctx.fillRect(x + 1, y + 1, w - 2, 9);
    drawText(ctx, text, x + 4, y + 2, opts.text || '#202020');
    return w;
  }

  function icon(ctx, kind, x, y, color) {
    color = color || '#202020';
    ctx.fillStyle = color;
    if (kind === 'map') {
      ctx.fillRect(x + 1, y + 1, 7, 5);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x + 3, y + 2, 1, 3);
      ctx.fillRect(x + 6, y + 2, 1, 3);
    } else if (kind === 'bag') {
      ctx.fillRect(x + 1, y + 3, 7, 5);
      ctx.fillRect(x + 3, y + 1, 3, 2);
    } else if (kind === 'party') {
      ctx.fillRect(x + 1, y + 1, 3, 3);
      ctx.fillRect(x + 5, y + 1, 3, 3);
      ctx.fillRect(x + 3, y + 5, 3, 3);
    } else if (kind === 'save') {
      ctx.fillRect(x + 1, y + 1, 7, 7);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x + 2, y + 2, 5, 2);
      ctx.fillRect(x + 3, y + 6, 3, 1);
    } else if (kind === 'gear') {
      ctx.fillRect(x + 3, y + 1, 3, 7);
      ctx.fillRect(x + 1, y + 3, 7, 3);
    } else if (kind === 'dex') {
      ctx.fillRect(x + 1, y + 1, 6, 7);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x + 3, y + 3, 2, 2);
    } else if (kind === 'profile') {
      ctx.fillRect(x + 3, y + 1, 3, 3);
      ctx.fillRect(x + 2, y + 5, 5, 3);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x + 4, y + 2, 1, 1);
    } else {
      ctx.fillRect(x + 2, y + 2, 5, 5);
    }
  }

  // Dialog box: 2 lines of text at the bottom of the screen.
  function drawDialog(ctx, lines, screenW, screenH, advanceMark) {
    const h = 44;
    const x = 6, y = screenH - h - 4, w = screenW - 12;
    box(ctx, x, y, w, h, '#fff', '#202020');
    if (lines && lines.length) {
      drawText(ctx, lines[0] || '', x + 6, y + 6, '#202020');
      drawText(ctx, lines[1] || '', x + 6, y + 18, '#202020');
      drawText(ctx, lines[2] || '', x + 6, y + 30, '#202020');
    }
    if (advanceMark) {
      const t = (performance.now() / 250) | 0;
      if (t % 2 === 0) {
        ctx.fillStyle = '#202020';
        ctx.fillRect(x + w - 10, y + h - 8, 4, 4);
      }
    }
  }

  // HP bar.
  function drawHpBar(ctx, x, y, w, hp, maxHp) {
    const ratio = Math.max(0, Math.min(1, hp / maxHp));
    const fillW = Math.ceil((w - 2) * ratio);
    let color = '#48d860';
    if (ratio < 0.5) color = '#f0c020';
    if (ratio < 0.2) color = '#e83838';
    ctx.fillStyle = '#202020';
    ctx.fillRect(x, y, w, 5);
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(x + 1, y + 1, w - 2, 3);
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, fillW, 3);
  }

  // XP bar (skinny).
  function drawXpBar(ctx, x, y, w, ratio) {
    ctx.fillStyle = '#202020';
    ctx.fillRect(x, y, w, 2);
    ctx.fillStyle = '#5898d8';
    ctx.fillRect(x, y, Math.ceil(w * ratio), 2);
  }

  window.PR_UI = {
    drawText, drawChar, textWidth, wrap, box, panel, header, selectBar,
    chip, icon, drawDialog, drawHpBar, drawXpBar, FONT
  };
})();
