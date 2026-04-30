// Sprite rendering: tiles, player, NPCs, creatures (procedural pixel art).
'use strict';

const TS = 16; // tile size in source px

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x|0, y|0, w|0, h|0);
}

// Draw a single tile at (sx, sy) in destination ctx.
function drawTile(ctx, code, sx, sy) {
  const x = sx|0, y = sy|0;
  switch (code) {
    case '.': drawGrass(ctx, x, y); break;
    case ',': drawPath(ctx, x, y); break;
    case ':': drawTallGrass(ctx, x, y); break;
    case 's': px(ctx, x, y, TS, TS, '#e8d090'); break;
    case 'r': px(ctx, x, y, TS, TS, '#a04848'); px(ctx,x+1,y+1,TS-2,TS-2,'#c05858'); break;
    case 'F': drawFloor(ctx, x, y); break;
    case 'T': drawTree(ctx, x, y); break;
    case 'W': drawWater(ctx, x, y); break;
    case 'R': px(ctx, x, y, TS, TS, '#c84848'); px(ctx, x, y, TS, 4, '#a02828'); break;
    case 'B': px(ctx, x, y, TS, TS, '#a08068'); px(ctx, x, y+TS-3, TS, 3, '#705038'); break;
    case 'P': px(ctx, x, y, TS, TS, '#e070a0'); px(ctx, x, y, TS, 4, '#b04878'); break;
    case 'M': px(ctx, x, y, TS, TS, '#4878d8'); px(ctx, x, y, TS, 4, '#3050a8'); break;
    case 'C': px(ctx, x, y, TS, TS, '#c89858'); px(ctx, x, y, TS, 3, '#604028'); break;
    case 'H': px(ctx, x, y, TS, TS, '#e8a8c8'); px(ctx, x+4, y+4, 8, 8, '#fff'); px(ctx,x+6,y+5,4,6,'#e85a5a'); px(ctx,x+5,y+7,6,2,'#e85a5a'); break;
    case 'S': drawSign(ctx, x, y); break;
    case 'L': drawGrass(ctx,x,y); px(ctx,x,y+TS-3,TS,3,'#604028'); px(ctx,x,y+TS-2,TS,2,'#3a2a1a'); break;
    case 'D': px(ctx, x, y, TS, TS, '#604028'); px(ctx, x+3, y+2, TS-6, TS-3, '#a86838'); px(ctx,x+TS-6,y+TS/2,2,2,'#f0d030'); break;
    case 'X': drawGrass(ctx, x, y); break;
    default: drawGrass(ctx, x, y);
  }
}

function drawGrass(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#5cae4c');
  px(ctx, x+2, y+3, 2, 1, '#4a9a3a');
  px(ctx, x+9, y+7, 2, 1, '#4a9a3a');
  px(ctx, x+5, y+12, 2, 1, '#76c264');
  px(ctx, x+12, y+13, 2, 1, '#76c264');
}

function drawPath(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#d8b878');
  px(ctx, x+3, y+5, 1, 1, '#b89858');
  px(ctx, x+11, y+10, 1, 1, '#b89858');
  px(ctx, x+7, y+2, 1, 1, '#f0d098');
}

function drawTallGrass(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#3a8030');
  for (let i = 0; i < 4; i++) {
    const tx = x + 1 + i * 4, ty = y + 4 + (i % 2) * 4;
    px(ctx, tx, ty, 3, 5, '#2a6020');
    px(ctx, tx+1, ty-1, 1, 1, '#5cae4c');
  }
}

function drawTree(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#1c4818');
  px(ctx, x+1, y+1, TS-2, TS-2, '#2a6824');
  px(ctx, x+3, y+3, 3, 3, '#3a8830');
  px(ctx, x+9, y+9, 2, 2, '#3a8830');
  px(ctx, x+10, y+3, 2, 2, '#1c4818');
}

function drawWater(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#4878d8');
  px(ctx, x+2, y+5, 5, 1, '#a8d8f8');
  px(ctx, x+9, y+11, 5, 1, '#a8d8f8');
  px(ctx, x+1, y+12, 3, 1, '#3060b0');
}

function drawFloor(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#d8c098');
  px(ctx, x, y, TS, 1, '#b89878');
  px(ctx, x, y, 1, TS, '#b89878');
}

function drawSign(ctx, x, y) {
  drawGrass(ctx, x, y);
  px(ctx, x+3, y+4, 10, 7, '#604028');
  px(ctx, x+4, y+5, 8, 5, '#a87038');
  px(ctx, x+5, y+6, 1, 1, '#fff');
  px(ctx, x+9, y+6, 1, 1, '#fff');
  px(ctx, x+5, y+8, 5, 1, '#fff');
  px(ctx, x+7, y+11, 2, 4, '#604028');
}

window.PR_TILES = { drawTile, TS, px };
