// Player and NPC overworld sprites: 16x16, 4 directions, 2-frame walk.
'use strict';

(function(){
  const TS = 16;
  const px = window.PR_TILES.px;

  // Compact 16x16 sprite via row strings. ' ' transparent.
  // Palette keys are single chars.
  function drawSprite(ctx, sx, sy, rows, palette, flipX) {
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const c = row[x];
        if (c === ' ' || c === '.') continue;
        const color = palette[c];
        if (!color) continue;
        const dx = flipX ? (sx + (row.length - 1 - x)) : (sx + x);
        ctx.fillStyle = color;
        ctx.fillRect(dx|0, (sy+y)|0, 1, 1);
      }
    }
  }

  // Player sprite, facing down. 16x16. legs is 0 or 1 for walk frame.
  const PALETTE_PLAYER = {
    k:'#000', s:'#f0c898', h:'#3a2410', S:'#1a1a1a',
    r:'#d83838', R:'#a01818', b:'#3050a8', B:'#1a2860',
    w:'#fff', y:'#f0c020'
  };

  function playerDown(legs) {
    return [
      '                ',
      '     hhhhhh     ',
      '    hhhhhhhh    ',
      '    hssssssh    ',
      '    sskssksh    ',
      '    sssssss     ',
      '    rrrrrrrr    ',
      '   rrrrrrrrr    ',
      '   ryrrrrryr    ',
      '   ryrrrrryr    ',
      '    rrrrrrr     ',
      '    bb  bb      ',
      '    bb  bb      ',
      '    bb  bb      ',
      legs ? '   SS    SSSS   ' : '   SSSS    SS   ',
      '                '
    ];
  }
  function playerUp(legs) {
    return [
      '                ',
      '     hhhhhh     ',
      '    hhhhhhhh    ',
      '    hhhhhhhh    ',
      '    hhhhhhhh    ',
      '    sssssss     ',
      '    rrrrrrrr    ',
      '   rrrrrrrrr    ',
      '   rrrrrrrrr    ',
      '   rrrrrrrrr    ',
      '    rrrrrrr     ',
      '    bb  bb      ',
      '    bb  bb      ',
      '    bb  bb      ',
      legs ? '   SS    SSSS   ' : '   SSSS    SS   ',
      '                '
    ];
  }
  function playerSide(legs) {
    return [
      '                ',
      '     hhhhhh     ',
      '    hhhhhhhh    ',
      '    hssshhhh    ',
      '    sskshhhh    ',
      '    sssshhh     ',
      '    rrrrrrr     ',
      '   rrrrrrrr     ',
      '   rrrrrrrrs    ',
      '   ryrrrrrss    ',
      '    rrrrrrr     ',
      '    bbb bb      ',
      '    bbb bb      ',
      '    bbb bb      ',
      legs ? '   SSS  SSS     ' : '    SS  SSS     ',
      '                '
    ];
  }

  function drawPlayer(ctx, sx, sy, dir, frame) {
    const legs = (frame|0) % 2;
    let rows, flip = false;
    switch (dir) {
      case 'up':    rows = playerUp(legs); break;
      case 'down':  rows = playerDown(legs); break;
      case 'left':  rows = playerSide(legs); flip = false; break;
      case 'right': rows = playerSide(legs); flip = true; break;
      default:      rows = playerDown(0);
    }
    drawSprite(ctx, sx, sy, rows, PALETTE_PLAYER, flip);
  }

  // Generic NPC sprite. Palette varies by type for visual variety.
  const NPC_PALETTES = {
    npc_oak:   { k:'#000', s:'#f0c898', h:'#e0e0e0', r:'#fff', y:'#a0a0a0' },
    npc_mom:   { k:'#000', s:'#f0c898', h:'#a83828', r:'#e0a0c0', y:'#a02858' },
    npc_sis:   { k:'#000', s:'#f0c898', h:'#f0c020', r:'#5898d8', y:'#3060a0' },
    npc_rival: { k:'#000', s:'#f0c898', h:'#702020', r:'#404040', y:'#202020' },
    npc_girl:  { k:'#000', s:'#f0c898', h:'#a82878', r:'#f08080', y:'#c04040' },
    npc_youth: { k:'#000', s:'#f0c898', h:'#3a2410', r:'#f0d020', y:'#a08818' },
    npc_old:   { k:'#000', s:'#f0c898', h:'#c8c8c8', r:'#587858', y:'#283828' },
    nurse:     { k:'#000', s:'#f0c898', h:'#e85a8a', r:'#fff', y:'#e8c8c8' },
    clerk:     { k:'#000', s:'#f0c898', h:'#3a2410', r:'#3858c8', y:'#202858' },
    ball:      null
  };

  function npcRows(dir, frame) {
    const legs = frame|0;
    if (dir === 'up') return [
      '                ',
      '     hhhhhh     ',
      '    hhhhhhhh    ',
      '    hhhhhhhh    ',
      '    hhhhhhhh    ',
      '    sssssss     ',
      '    rrrrrrr     ',
      '   rrrrrrrrr    ',
      '   rrrrrrrrr    ',
      '   rrrrrrrrr    ',
      '    rrrrrrr     ',
      '    yy  yy      ',
      '    yy  yy      ',
      '    yy  yy      ',
      legs ? '   kk    kkkk   ' : '   kkkk    kk   ',
      '                '
    ];
    if (dir === 'left' || dir === 'right') return [
      '                ',
      '     hhhhhh     ',
      '    hhhhhhhh    ',
      '    hssshhhh    ',
      '    sskshhhh    ',
      '    sssshhh     ',
      '    rrrrrrr     ',
      '   rrrrrrrr     ',
      '   rrrrrrrrs    ',
      '   rrrrrrrss    ',
      '    rrrrrrr     ',
      '    yyy yy      ',
      '    yyy yy      ',
      '    yyy yy      ',
      legs ? '   kkk  kkk     ' : '    kk  kkk     ',
      '                '
    ];
    return [
      '                ',
      '     hhhhhh     ',
      '    hhhhhhhh    ',
      '    hssssssh    ',
      '    sskssksh    ',
      '    sssssss     ',
      '    rrrrrrr     ',
      '   rrrrrrrrr    ',
      '   ryrrrrryr    ',
      '   ryrrrrryr    ',
      '    rrrrrrr     ',
      '    yy  yy      ',
      '    yy  yy      ',
      '    yy  yy      ',
      legs ? '   kk    kkkk   ' : '   kkkk    kk   ',
      '                '
    ];
  }

  function drawBall(ctx, sx, sy) {
    px(ctx, sx+5, sy+5, 6, 6, '#e0e0e0');
    px(ctx, sx+5, sy+5, 6, 3, '#e83838');
    px(ctx, sx+4, sy+6, 1, 4, '#404040');
    px(ctx, sx+11, sy+6, 1, 4, '#404040');
    px(ctx, sx+5, sy+8, 6, 1, '#202020');
    px(ctx, sx+7, sy+8, 2, 1, '#fff');
  }

  function drawNpc(ctx, sx, sy, kind, dir, frame, flipX) {
    if (kind === 'ball') { drawBall(ctx, sx, sy); return; }
    const palette = NPC_PALETTES[kind] || NPC_PALETTES.npc_youth;
    const rows = npcRows(dir, frame);
    const flip = flipX || dir === 'right';
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const c = row[x];
        if (c === ' ' || c === '.') continue;
        const color = palette[c];
        if (!color) continue;
        const dx = flip ? (sx + (row.length - 1 - x)) : (sx + x);
        ctx.fillStyle = color;
        ctx.fillRect(dx|0, (sy+y)|0, 1, 1);
      }
    }
  }

  window.PR_CHARS = { drawPlayer, drawNpc };
})();
