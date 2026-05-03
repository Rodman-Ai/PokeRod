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
    case 'Y': drawOakTree(ctx, x, y); break;
    case 'O': drawPalmTree(ctx, x, y); break;
    case 'K': drawCherryTree(ctx, x, y); break;
    case 'J': drawDeadTree(ctx, x, y); break;
    case 'Q': drawSnowyPine(ctx, x, y); break;
    case 'N': drawBirchTree(ctx, x, y); break;
    case 'U': drawMushroomTree(ctx, x, y); break;
    case 'V': drawWillowTree(ctx, x, y); break;
    case 'E': drawAutumnTree(ctx, x, y); break;
    case 'G': drawAncientTree(ctx, x, y); break;
    case 'b': drawBush(ctx, x, y); break;
    case 'c': drawFlowerBush(ctx, x, y); break;
    case 'e': drawBerryBush(ctx, x, y); break;
    case 'g': drawThornBush(ctx, x, y); break;
    case 'h': drawHedge(ctx, x, y); break;
    case 'j': drawAutumnBush(ctx, x, y); break;
    case 'k': drawSnowyBush(ctx, x, y); break;
    case 'l': drawBlueFlowerBush(ctx, x, y); break;
    case 'm': drawPurpleFlowerBush(ctx, x, y); break;
    case 'n': drawThornCluster(ctx, x, y); break;
    case '1': drawFlowerGrass(ctx, x, y); break;
    case '2': drawLightGrass(ctx, x, y); break;
    case '3': drawDryGrass(ctx, x, y); break;
    case '4': drawLushGrass(ctx, x, y); break;
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

function drawFlowerGrass(ctx, x, y) {
  drawGrass(ctx, x, y);
  px(ctx, x+3, y+4, 1, 1, '#f04860');
  px(ctx, x+10, y+10, 1, 1, '#f04860');
  px(ctx, x+6, y+8, 1, 1, '#f8d030');
  px(ctx, x+13, y+5, 1, 1, '#f8d030');
}

function drawLightGrass(ctx, x, y) {
  // Brighter, taller blades.
  px(ctx, x, y, TS, TS, '#7cc85c');
  px(ctx, x+3, y+4, 1, 3, '#5cae4c');
  px(ctx, x+8, y+6, 1, 3, '#5cae4c');
  px(ctx, x+12, y+9, 1, 3, '#5cae4c');
  px(ctx, x+5, y+11, 1, 3, '#5cae4c');
  px(ctx, x+10, y+12, 1, 3, '#5cae4c');
}

function drawDryGrass(ctx, x, y) {
  // Tan / yellow ground with sparse blades.
  px(ctx, x, y, TS, TS, '#c8a868');
  px(ctx, x+3, y+5, 1, 2, '#9a7838');
  px(ctx, x+9, y+8, 1, 2, '#9a7838');
  px(ctx, x+5, y+12, 1, 2, '#9a7838');
  px(ctx, x+12, y+11, 1, 2, '#9a7838');
  px(ctx, x+2, y+10, 1, 1, '#e8d090');
}

function drawLushGrass(ctx, x, y) {
  // Deep saturated green.
  px(ctx, x, y, TS, TS, '#2a7028');
  px(ctx, x+2, y+3, 2, 1, '#1c4818');
  px(ctx, x+8, y+7, 2, 1, '#1c4818');
  px(ctx, x+5, y+12, 2, 1, '#48a838');
  px(ctx, x+11, y+13, 2, 1, '#48a838');
  px(ctx, x+13, y+4, 1, 1, '#48a838');
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

function drawOakTree(ctx, x, y) {
  // Round oak: brown trunk + rounded green canopy.
  px(ctx, x+6, y+11, 4, 5, '#5a3818');
  px(ctx, x+2, y+2, 12, 10, '#1c5018');
  px(ctx, x+1, y+4, 14, 6, '#1c5018');
  px(ctx, x+3, y+3, 10, 8, '#2a7028');
  px(ctx, x+2, y+5, 12, 4, '#2a7028');
  px(ctx, x+5, y+4, 2, 2, '#48a838');
  px(ctx, x+9, y+6, 2, 2, '#48a838');
}

function drawPalmTree(ctx, x, y) {
  // Slim trunk with five fronds at the top.
  px(ctx, x+7, y+5, 2, 11, '#604018');
  px(ctx, x+7, y+8, 2, 1, '#382008');
  px(ctx, x+7, y+12, 2, 1, '#382008');
  px(ctx, x+1, y+3, 5, 2, '#3a8830');
  px(ctx, x+10, y+3, 5, 2, '#3a8830');
  px(ctx, x+5, y+1, 6, 2, '#3a8830');
  px(ctx, x+2, y+5, 4, 1, '#48a838');
  px(ctx, x+10, y+5, 4, 1, '#48a838');
}

function drawCherryTree(ctx, x, y) {
  // Cherry blossom: pink fluffy canopy.
  px(ctx, x+6, y+11, 4, 5, '#5a3818');
  px(ctx, x+2, y+2, 12, 10, '#a8487a');
  px(ctx, x+1, y+4, 14, 6, '#a8487a');
  px(ctx, x+3, y+3, 10, 8, '#f088b0');
  px(ctx, x+2, y+5, 12, 4, '#f088b0');
  px(ctx, x+4, y+4, 2, 2, '#fff0f8');
  px(ctx, x+10, y+6, 2, 2, '#fff0f8');
  px(ctx, x+7, y+7, 2, 1, '#fff0f8');
}

function drawDeadTree(ctx, x, y) {
  // Bare gray branches.
  px(ctx, x+7, y+8, 2, 8, '#383028');
  px(ctx, x+5, y+4, 1, 4, '#383028');
  px(ctx, x+10, y+4, 1, 4, '#383028');
  px(ctx, x+6, y+2, 1, 2, '#5a4838');
  px(ctx, x+9, y+2, 1, 2, '#5a4838');
  px(ctx, x+8, y+1, 1, 7, '#5a4838');
  px(ctx, x+3, y+6, 2, 1, '#383028');
  px(ctx, x+11, y+6, 2, 1, '#383028');
}

function drawBush(ctx, x, y) {
  // Small leafy bush, doesn't fill the tile.
  drawGrass(ctx, x, y);
  px(ctx, x+3, y+8, 10, 6, '#1c5018');
  px(ctx, x+2, y+10, 12, 4, '#1c5018');
  px(ctx, x+4, y+9, 8, 4, '#2a7028');
  px(ctx, x+3, y+11, 10, 2, '#2a7028');
  px(ctx, x+5, y+10, 1, 1, '#48a838');
  px(ctx, x+10, y+11, 1, 1, '#48a838');
}

function drawFlowerBush(ctx, x, y) {
  // Green bush with white flowers.
  drawBush(ctx, x, y);
  px(ctx, x+4, y+9, 1, 1, '#fff8e0');
  px(ctx, x+8, y+10, 1, 1, '#fff8e0');
  px(ctx, x+11, y+9, 1, 1, '#fff8e0');
  px(ctx, x+6, y+12, 1, 1, '#fff8e0');
}

function drawBerryBush(ctx, x, y) {
  // Bush with red berries.
  drawBush(ctx, x, y);
  px(ctx, x+5, y+10, 1, 1, '#e83020');
  px(ctx, x+9, y+9, 1, 1, '#e83020');
  px(ctx, x+11, y+11, 1, 1, '#e83020');
  px(ctx, x+7, y+12, 1, 1, '#e83020');
  px(ctx, x+5, y+10, 1, 1, '#f86040');
}

function drawThornBush(ctx, x, y) {
  // Spiky dark bush.
  drawGrass(ctx, x, y);
  px(ctx, x+3, y+8, 10, 6, '#0e2c0e');
  px(ctx, x+2, y+10, 12, 4, '#0e2c0e');
  px(ctx, x+4, y+10, 8, 3, '#1c4818');
  // Thorns sticking out.
  px(ctx, x+3, y+7, 1, 2, '#0e2c0e');
  px(ctx, x+7, y+6, 1, 2, '#0e2c0e');
  px(ctx, x+11, y+7, 1, 2, '#0e2c0e');
  px(ctx, x+13, y+9, 2, 1, '#0e2c0e');
  px(ctx, x+1, y+9, 2, 1, '#0e2c0e');
}

function drawAutumnBush(ctx, x, y) {
  drawGrass(ctx, x, y);
  px(ctx, x+3, y+8, 10, 6, '#a83820');
  px(ctx, x+2, y+10, 12, 4, '#a83820');
  px(ctx, x+4, y+9, 8, 4, '#e87838');
  px(ctx, x+3, y+11, 10, 2, '#e87838');
  px(ctx, x+5, y+10, 1, 1, '#f0c020');
  px(ctx, x+10, y+11, 1, 1, '#f0c020');
}

function drawSnowyBush(ctx, x, y) {
  drawGrass(ctx, x, y);
  px(ctx, x+3, y+8, 10, 6, '#1c5018');
  px(ctx, x+2, y+10, 12, 4, '#1c5018');
  px(ctx, x+4, y+9, 8, 4, '#2a7028');
  // Snow on top.
  px(ctx, x+3, y+8, 10, 2, '#ffffff');
  px(ctx, x+5, y+7, 6, 1, '#e8f0ff');
  px(ctx, x+6, y+10, 1, 1, '#ffffff');
  px(ctx, x+10, y+11, 1, 1, '#ffffff');
}

function drawBlueFlowerBush(ctx, x, y) {
  drawBush(ctx, x, y);
  px(ctx, x+4, y+9, 1, 1, '#5878e8');
  px(ctx, x+8, y+10, 1, 1, '#5878e8');
  px(ctx, x+11, y+9, 1, 1, '#5878e8');
  px(ctx, x+6, y+12, 1, 1, '#5878e8');
  px(ctx, x+4, y+9, 1, 1, '#a8c8ff');
}

function drawPurpleFlowerBush(ctx, x, y) {
  drawBush(ctx, x, y);
  px(ctx, x+4, y+9, 1, 1, '#a040c0');
  px(ctx, x+8, y+10, 1, 1, '#a040c0');
  px(ctx, x+11, y+9, 1, 1, '#a040c0');
  px(ctx, x+6, y+12, 1, 1, '#a040c0');
  px(ctx, x+10, y+12, 1, 1, '#d088f0');
}

function drawThornCluster(ctx, x, y) {
  // Sparse low thorns.
  drawGrass(ctx, x, y);
  px(ctx, x+4, y+11, 1, 3, '#383028');
  px(ctx, x+3, y+12, 3, 1, '#383028');
  px(ctx, x+8, y+10, 1, 4, '#383028');
  px(ctx, x+7, y+11, 3, 1, '#383028');
  px(ctx, x+12, y+11, 1, 3, '#383028');
  px(ctx, x+11, y+12, 3, 1, '#383028');
}

function drawHedge(ctx, x, y) {
  // Tall flat-top hedge.
  drawGrass(ctx, x, y);
  px(ctx, x+1, y+5, 14, 10, '#1c5018');
  px(ctx, x+1, y+5, 14, 1, '#0e2c0e');
  px(ctx, x+2, y+6, 12, 8, '#2a7028');
  // Texture dots.
  px(ctx, x+3, y+8, 1, 1, '#48a838');
  px(ctx, x+7, y+10, 1, 1, '#48a838');
  px(ctx, x+11, y+9, 1, 1, '#48a838');
  px(ctx, x+5, y+12, 1, 1, '#48a838');
  px(ctx, x+9, y+13, 1, 1, '#48a838');
}

function drawBirchTree(ctx, x, y) {
  // White trunk with horizontal black stripes, light green leaves.
  px(ctx, x+7, y+8, 2, 8, '#f0f0e8');
  px(ctx, x+7, y+10, 2, 1, '#202020');
  px(ctx, x+7, y+12, 2, 1, '#202020');
  px(ctx, x+7, y+14, 2, 1, '#202020');
  px(ctx, x+3, y+1, 10, 7, '#3a8830');
  px(ctx, x+2, y+3, 12, 4, '#3a8830');
  px(ctx, x+4, y+2, 8, 5, '#5cae4c');
  px(ctx, x+6, y+5, 1, 1, '#a8d878');
}

function drawMushroomTree(ctx, x, y) {
  // Red cap with white spots, thick stem.
  px(ctx, x+6, y+9, 4, 7, '#f0e8d0');
  px(ctx, x+1, y+5, 14, 4, '#a02020');
  px(ctx, x+2, y+4, 12, 1, '#a02020');
  px(ctx, x+3, y+3, 10, 1, '#a02020');
  px(ctx, x+5, y+2, 6, 1, '#a02020');
  px(ctx, x+1, y+8, 14, 1, '#5a1010');
  // Spots.
  px(ctx, x+3, y+5, 2, 2, '#ffffff');
  px(ctx, x+10, y+5, 2, 2, '#ffffff');
  px(ctx, x+7, y+7, 2, 1, '#ffffff');
  px(ctx, x+6, y+3, 1, 1, '#ffffff');
}

function drawWillowTree(ctx, x, y) {
  // Drooping fronds curtain.
  px(ctx, x+7, y+12, 2, 4, '#604018');
  px(ctx, x+3, y+1, 10, 5, '#3a7028');
  px(ctx, x+2, y+3, 12, 3, '#3a7028');
  // Drooping strands.
  px(ctx, x+1, y+6, 1, 7, '#5cae4c');
  px(ctx, x+3, y+6, 1, 8, '#5cae4c');
  px(ctx, x+5, y+6, 1, 6, '#5cae4c');
  px(ctx, x+10, y+6, 1, 6, '#5cae4c');
  px(ctx, x+12, y+6, 1, 8, '#5cae4c');
  px(ctx, x+14, y+6, 1, 7, '#5cae4c');
  px(ctx, x+6, y+5, 1, 1, '#a8d878');
  px(ctx, x+9, y+4, 1, 1, '#a8d878');
}

function drawAutumnTree(ctx, x, y) {
  // Orange / red foliage.
  px(ctx, x+6, y+11, 4, 5, '#5a3818');
  px(ctx, x+2, y+2, 12, 10, '#a83820');
  px(ctx, x+1, y+4, 14, 6, '#a83820');
  px(ctx, x+3, y+3, 10, 8, '#e87838');
  px(ctx, x+2, y+5, 12, 4, '#e87838');
  px(ctx, x+5, y+4, 2, 2, '#f0c020');
  px(ctx, x+9, y+6, 2, 2, '#f0c020');
  px(ctx, x+4, y+8, 1, 1, '#f0c020');
  px(ctx, x+11, y+5, 1, 1, '#f8e040');
}

function drawAncientTree(ctx, x, y) {
  // Big mossy trunk + dark leaves with moss patches.
  px(ctx, x+5, y+9, 6, 7, '#3a2410');
  px(ctx, x+6, y+11, 1, 2, '#1a0a04');
  px(ctx, x+9, y+10, 1, 3, '#1a0a04');
  px(ctx, x+1, y+1, 14, 9, '#0e3010');
  px(ctx, x+0, y+3, 16, 5, '#0e3010');
  px(ctx, x+2, y+2, 12, 7, '#1c4818');
  // Moss patches.
  px(ctx, x+5, y+10, 2, 1, '#5cae4c');
  px(ctx, x+9, y+13, 2, 1, '#5cae4c');
  px(ctx, x+4, y+4, 2, 2, '#3a8030');
  px(ctx, x+10, y+5, 2, 2, '#3a8030');
}
  // Triangle pine with white snow caps.
  px(ctx, x+7, y+13, 2, 3, '#5a3818');
  px(ctx, x+7, y+1, 2, 1, '#1c4818');
  px(ctx, x+6, y+2, 4, 1, '#1c4818');
  px(ctx, x+5, y+3, 6, 1, '#1c4818');
  px(ctx, x+4, y+4, 8, 1, '#1c4818');
  px(ctx, x+5, y+5, 6, 1, '#2a6824');
  px(ctx, x+4, y+6, 8, 1, '#2a6824');
  px(ctx, x+3, y+7, 10, 1, '#2a6824');
  px(ctx, x+2, y+8, 12, 1, '#2a6824');
  px(ctx, x+3, y+9, 10, 1, '#1c4818');
  px(ctx, x+5, y+10, 6, 1, '#1c4818');
  // Snow.
  px(ctx, x+7, y+1, 2, 1, '#ffffff');
  px(ctx, x+5, y+5, 1, 1, '#e8f0ff');
  px(ctx, x+10, y+5, 1, 1, '#e8f0ff');
  px(ctx, x+3, y+7, 2, 1, '#e8f0ff');
  px(ctx, x+11, y+7, 2, 1, '#e8f0ff');
  px(ctx, x+2, y+8, 1, 1, '#ffffff');
  px(ctx, x+13, y+8, 1, 1, '#ffffff');
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
