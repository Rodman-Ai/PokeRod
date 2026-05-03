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
  // Per-tile foliage sway: -1 / 0 / +1 px each frame, phase offset by
  // tile coords so neighbours don't sway in unison.
  const swayX = Math.round(Math.sin(
    (performance.now() + sx * 7 + sy * 11) / 700
  ));
  const fx = x + swayX;
  switch (code) {
    case '.': drawGrass(ctx, x, y); break;
    case ',': drawPath(ctx, x, y); break;
    case ':': drawTallGrass(ctx, x, y); break;
    case 's': px(ctx, x, y, TS, TS, '#e8d090'); break;
    case 'r': px(ctx, x, y, TS, TS, '#a04848'); px(ctx,x+1,y+1,TS-2,TS-2,'#c05858'); break;
    case 'F': drawFloor(ctx, x, y); break;
    case 'T': drawTree(ctx, fx, y); break;
    case 'Y': drawOakTree(ctx, fx, y); break;
    case 'O': drawPalmTree(ctx, fx, y); break;
    case 'K': drawCherryTree(ctx, fx, y); break;
    case 'J': drawDeadTree(ctx, fx, y); break;
    case 'Q': drawSnowyPine(ctx, fx, y); break;
    case 'N': drawBirchTree(ctx, fx, y); break;
    case 'U': drawMushroomTree(ctx, fx, y); break;
    case 'V': drawWillowTree(ctx, fx, y); break;
    case 'E': drawAutumnTree(ctx, fx, y); break;
    case 'G': drawAncientTree(ctx, fx, y); break;
    case 'b': drawBush(ctx, fx, y); break;
    case 'c': drawFlowerBush(ctx, fx, y); break;
    case 'e': drawBerryBush(ctx, fx, y); break;
    case 'g': drawThornBush(ctx, fx, y); break;
    case 'h': drawHedge(ctx, fx, y); break;
    case 'j': drawAutumnBush(ctx, fx, y); break;
    case 'k': drawSnowyBush(ctx, fx, y); break;
    case 'l': drawBlueFlowerBush(ctx, fx, y); break;
    case 'm': drawPurpleFlowerBush(ctx, fx, y); break;
    case 'n': drawThornCluster(ctx, fx, y); break;
    case '1': drawFlowerGrass(ctx, x, y); break;
    case '2': drawLightGrass(ctx, x, y); break;
    case '3': drawDryGrass(ctx, x, y); break;
    case '4': drawLushGrass(ctx, x, y); break;
    // House roofs (8).
    case '+': drawRoofBlue(ctx, x, y); break;
    case '-': drawRoofThatched(ctx, x, y); break;
    case '=': drawRoofTerracotta(ctx, x, y); break;
    case '*': drawRoofDome(ctx, x, y); break;
    case '%': drawRoofSnow(ctx, x, y); break;
    case '&': drawRoofSlate(ctx, x, y); break;
    case '7': drawRoofMoss(ctx, x, y); break;
    case '8': drawRoofLeaf(ctx, x, y); break;
    // House walls (6).
    case '#': drawWallStone(ctx, x, y); break;
    case '@': drawWallTimber(ctx, x, y); break;
    case '$': drawWallBrick(ctx, x, y); break;
    case '?': drawWallLog(ctx, x, y); break;
    case '!': drawWallWhite(ctx, x, y); break;
    case '0': drawWallLattice(ctx, x, y); break;
    // Doors / windows / chimneys (6).
    case 'd': drawDoorBlue(ctx, x, y); break;
    case 'f': drawDoorShop(ctx, x, y); break;
    case '[': drawWindowL(ctx, x, y); break;
    case ']': drawWindowR(ctx, x, y); break;
    case '(': drawChimney(ctx, x, y); break;
    case ')': drawSmokestack(ctx, x, y); break;
    // Paths (20).
    case '_': drawPathCobble(ctx, x, y); break;
    case '^': drawPathDirt(ctx, x, y); break;
    case 'o': drawPathStepStone(ctx, x, y); break;
    case ';': drawPathGravel(ctx, x, y); break;
    case 'i': drawPathRedBrick(ctx, x, y); break;
    case 'p': drawPathPark(ctx, x, y); break;
    case 'q': drawPathMosaic(ctx, x, y); break;
    case 't': drawPathBoardwalk(ctx, x, y); break;
    case 'u': drawPathSand(ctx, x, y); break;
    case 'v': drawPathRocky(ctx, x, y); break;
    case 'w': drawPathWetStone(ctx, x, y); break;
    case 'x': drawPathCrossroads(ctx, x, y); break;
    case 'y': drawPathYellowBrick(ctx, x, y); break;
    case 'z': drawPathMoss(ctx, x, y); break;
    case 'a': drawPathAutumn(ctx, x, y); break;
    case 'A': drawPathBridge(ctx, x, y); break;
    case 'Z': drawPathZen(ctx, x, y); break;
    case 'I': drawPathLantern(ctx, x, y); break;
    case '5': drawPathDesert(ctx, x, y); break;
    case '6': drawPathSnow(ctx, x, y); break;
    // Decorations.
    case '<': drawBench(ctx, x, y); break;
    case '|': drawStreetLamp(ctx, x, y); break;
    case '~': drawHydrant(ctx, x, y); break;
    case '{': drawFlowerPot(ctx, x, y); break;
    case '>': drawShelf(ctx, x, y); break;
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

function drawPathCobble(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#a09890');
  for (let r = 0; r < TS; r += 4) {
    for (let c = (r % 8 === 0 ? 0 : 4); c < TS; c += 8) {
      px(ctx, x+c+1, y+r+1, 5, 2, '#c8c0b8');
      px(ctx, x+c, y+r, 1, 4, '#605850');
      px(ctx, x+c, y+r+3, 8, 1, '#605850');
    }
  }
}

function drawPathDirt(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#9a6838');
  px(ctx, x+2, y+3, 1, 1, '#603810');
  px(ctx, x+8, y+5, 1, 1, '#603810');
  px(ctx, x+12, y+9, 1, 1, '#603810');
  px(ctx, x+5, y+11, 1, 1, '#603810');
  px(ctx, x+10, y+13, 1, 1, '#c08858');
  px(ctx, x+4, y+8, 1, 1, '#c08858');
}

function drawPathStepStone(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#9a6838');
  px(ctx, x+2, y+2, 4, 4, '#a8a098');
  px(ctx, x+1, y+3, 6, 2, '#a8a098');
  px(ctx, x+9, y+5, 4, 4, '#a8a098');
  px(ctx, x+8, y+6, 6, 2, '#a8a098');
  px(ctx, x+5, y+11, 4, 4, '#a8a098');
  px(ctx, x+4, y+12, 6, 2, '#a8a098');
  px(ctx, x+3, y+3, 1, 1, '#d8d0c8');
  px(ctx, x+10, y+6, 1, 1, '#d8d0c8');
  px(ctx, x+6, y+12, 1, 1, '#d8d0c8');
}

function drawPathGravel(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#a8a098');
  for (let r = 0; r < TS; r += 2) {
    for (let c = ((r/2)%2)*1; c < TS; c += 3) px(ctx, x+c, y+r, 1, 1, '#605850');
  }
  px(ctx, x+3, y+8, 1, 1, '#d8d0c8');
  px(ctx, x+11, y+4, 1, 1, '#d8d0c8');
}

function drawPathRedBrick(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#a83838');
  for (let r = 0; r < TS; r += 4) px(ctx, x, y+r+3, TS, 1, '#602820');
  for (let r = 0; r < TS; r += 4) {
    const off = (r/4|0) % 2 ? 4 : 0;
    for (let i = off; i < TS; i += 8) px(ctx, x+i, y+r, 1, 3, '#602820');
  }
  px(ctx, x+1, y+1, 2, 1, '#c85048');
  px(ctx, x+9, y+5, 2, 1, '#c85048');
}

function drawPathPark(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#e8d8a8');
  px(ctx, x, y, TS, 1, '#c8b888');
  px(ctx, x, y+TS-1, TS, 1, '#c8b888');
  px(ctx, x+3, y+5, 1, 1, '#5cae4c');
  px(ctx, x+12, y+3, 1, 1, '#5cae4c');
  px(ctx, x+6, y+10, 1, 1, '#a83820');
  px(ctx, x+11, y+12, 1, 1, '#f0c020');
}

function drawPathMosaic(ctx, x, y) {
  const cs = ['#a83838','#3060a8','#c8a020','#208828'];
  for (let r = 0; r < TS; r += 4) {
    for (let c = 0; c < TS; c += 4) {
      const i = ((r/4)|0 + (c/4)|0) % cs.length;
      px(ctx, x+c, y+r, 4, 4, cs[i]);
      px(ctx, x+c, y+r, 4, 1, '#fff');
      px(ctx, x+c, y+r, 1, 4, '#fff');
    }
  }
}

function drawPathBoardwalk(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#806038');
  for (let r = 3; r < TS; r += 4) px(ctx, x, y+r, TS, 1, '#382008');
  px(ctx, x+3, y+1, 1, 1, '#382008');
  px(ctx, x+10, y+5, 1, 1, '#382008');
  px(ctx, x+6, y+9, 1, 1, '#382008');
  px(ctx, x+13, y+13, 1, 1, '#382008');
  px(ctx, x+1, y+2, TS-2, 1, '#a08858');
  px(ctx, x+1, y+10, TS-2, 1, '#a08858');
}

function drawPathSand(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#f0d8a0');
  px(ctx, x+2, y+4, 2, 1, '#d8b870');
  px(ctx, x+7, y+8, 3, 1, '#d8b870');
  px(ctx, x+11, y+13, 2, 1, '#d8b870');
  px(ctx, x+4, y+11, 1, 1, '#a88838');
  px(ctx, x+9, y+3, 1, 1, '#a88838');
}

function drawPathRocky(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#787068');
  px(ctx, x+1, y+3, 5, 4, '#a8a098');
  px(ctx, x+8, y+1, 6, 5, '#a8a098');
  px(ctx, x+3, y+10, 7, 5, '#a8a098');
  px(ctx, x+12, y+9, 3, 5, '#a8a098');
  px(ctx, x+3, y+5, 1, 1, '#383028');
  px(ctx, x+10, y+3, 1, 1, '#383028');
  px(ctx, x+1, y+3, 4, 1, '#c8c0b8');
  px(ctx, x+8, y+1, 5, 1, '#c8c0b8');
}

function drawPathWetStone(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#384858');
  for (let r = 0; r < TS; r += 4) {
    for (let c = (r % 8 === 0 ? 0 : 4); c < TS; c += 8) {
      px(ctx, x+c+1, y+r+1, 5, 2, '#588898');
      px(ctx, x+c, y+r, 1, 4, '#202830');
      px(ctx, x+c, y+r+3, 8, 1, '#202830');
    }
  }
  // Wet shines.
  px(ctx, x+3, y+2, 2, 1, '#a8c8d8');
  px(ctx, x+11, y+9, 2, 1, '#a8c8d8');
}

function drawPathCrossroads(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#9a6838');
  // North-south plus east-west bands.
  px(ctx, x+6, y, 4, TS, '#d8b878');
  px(ctx, x, y+6, TS, 4, '#d8b878');
  px(ctx, x+6, y+6, 4, 4, '#f0d098');
  // Tracks.
  px(ctx, x+7, y+1, 2, 1, '#603810');
  px(ctx, x+7, y+13, 2, 1, '#603810');
  px(ctx, x+1, y+7, 1, 2, '#603810');
  px(ctx, x+13, y+7, 1, 2, '#603810');
}

function drawPathYellowBrick(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#e0b830');
  for (let r = 0; r < TS; r += 4) px(ctx, x, y+r+3, TS, 1, '#806818');
  for (let r = 0; r < TS; r += 4) {
    const off = (r/4|0) % 2 ? 4 : 0;
    for (let i = off; i < TS; i += 8) px(ctx, x+i, y+r, 1, 3, '#806818');
  }
  px(ctx, x+1, y+1, 2, 1, '#f8d870');
  px(ctx, x+9, y+9, 2, 1, '#f8d870');
}

function drawPathMoss(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#a89858');
  // Moss patches between stones.
  px(ctx, x+1, y+2, 4, 3, '#588838');
  px(ctx, x+10, y+4, 4, 3, '#588838');
  px(ctx, x+5, y+10, 4, 3, '#588838');
  // Stones.
  px(ctx, x+6, y+1, 3, 3, '#88807a');
  px(ctx, x+1, y+8, 3, 3, '#88807a');
  px(ctx, x+10, y+11, 3, 3, '#88807a');
  px(ctx, x+2, y+3, 1, 1, '#a8d878');
  px(ctx, x+11, y+5, 1, 1, '#a8d878');
}

function drawPathAutumn(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#b89858');
  // Scattered leaves.
  px(ctx, x+2, y+3, 2, 2, '#e87838');
  px(ctx, x+10, y+5, 2, 2, '#a83820');
  px(ctx, x+5, y+11, 2, 2, '#f0c020');
  px(ctx, x+12, y+12, 2, 2, '#e87838');
  px(ctx, x+8, y+2, 1, 1, '#a83820');
  // Stems.
  px(ctx, x+3, y+5, 1, 1, '#5a3818');
  px(ctx, x+11, y+7, 1, 1, '#5a3818');
}

function drawPathBridge(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#88807a');
  // Top rail.
  px(ctx, x, y, TS, 2, '#5a3818');
  px(ctx, x, y+1, TS, 1, '#806838');
  // Bottom rail.
  px(ctx, x, y+TS-2, TS, 2, '#5a3818');
  px(ctx, x, y+TS-3, TS, 1, '#806838');
  // Plank seams.
  for (let i = 3; i < TS; i += 4) px(ctx, x+i, y+2, 1, TS-4, '#605850');
  // Highlights.
  for (let i = 4; i < TS; i += 4) px(ctx, x+i, y+3, 1, TS-6, '#a8a098');
}

function drawPathZen(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#e8d8a0');
  // Concentric raked lines (wavy horizontals).
  for (let r = 2; r < TS; r += 3) {
    px(ctx, x+1, y+r, TS-2, 1, '#c8b870');
    px(ctx, x+2, y+r+1, 1, 1, '#a89838');
    px(ctx, x+8, y+r+1, 1, 1, '#a89838');
    px(ctx, x+13, y+r+1, 1, 1, '#a89838');
  }
  // A small accent stone.
  px(ctx, x+11, y+11, 3, 2, '#605850');
  px(ctx, x+11, y+11, 3, 1, '#88807a');
}

function drawPathLantern(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#383028');
  // Edge stones.
  px(ctx, x+1, y+1, 3, 2, '#88807a');
  px(ctx, x+12, y+12, 3, 2, '#88807a');
  // Lantern post in upper-right.
  px(ctx, x+11, y+1, 1, 5, '#5a3818');
  px(ctx, x+9, y+1, 5, 3, '#a83820');
  px(ctx, x+10, y+2, 3, 1, '#f8e040');
  // Glow specks.
  px(ctx, x+3, y+8, 1, 1, '#f0c020');
  px(ctx, x+11, y+9, 1, 1, '#f0c020');
  px(ctx, x+6, y+12, 1, 1, '#f0c020');
}

function drawPathDesert(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#f0d870');
  // Dunes.
  px(ctx, x+1, y+5, 5, 1, '#d8b840');
  px(ctx, x+7, y+9, 7, 1, '#d8b840');
  px(ctx, x+3, y+13, 6, 1, '#d8b840');
  // Pebbles.
  px(ctx, x+10, y+3, 1, 1, '#a88838');
  px(ctx, x+4, y+10, 1, 1, '#a88838');
  px(ctx, x+13, y+12, 1, 1, '#a88838');
}

function drawPathSnow(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#f8f8ff');
  // Tracks.
  px(ctx, x+3, y+5, 2, 1, '#a8b8d8');
  px(ctx, x+9, y+9, 2, 1, '#a8b8d8');
  px(ctx, x+5, y+12, 2, 1, '#a8b8d8');
  // Subtle blue tint patches.
  px(ctx, x+1, y+2, 3, 1, '#d8e0f0');
  px(ctx, x+11, y+3, 3, 1, '#d8e0f0');
  px(ctx, x+7, y+10, 3, 1, '#d8e0f0');
}

function drawBench(ctx, x, y) {
  drawGrass(ctx, x, y);
  // Plank.
  px(ctx, x+1, y+7, TS-2, 3, '#806038');
  px(ctx, x+1, y+7, TS-2, 1, '#a08858');
  px(ctx, x+1, y+9, TS-2, 1, '#382008');
  // Backrest slats.
  px(ctx, x+2, y+4, 1, 4, '#806038');
  px(ctx, x+13, y+4, 1, 4, '#806038');
  px(ctx, x+1, y+5, TS-2, 1, '#806038');
  // Stone legs.
  px(ctx, x+2, y+10, 2, 4, '#88807a');
  px(ctx, x+12, y+10, 2, 4, '#88807a');
  px(ctx, x+2, y+10, 2, 1, '#c8c0b8');
  px(ctx, x+12, y+10, 2, 1, '#c8c0b8');
}

function drawStreetLamp(ctx, x, y) {
  drawGrass(ctx, x, y);
  // Post.
  px(ctx, x+7, y+6, 2, 9, '#383028');
  px(ctx, x+7, y+15, 2, 1, '#1a1410');
  // Base.
  px(ctx, x+5, y+14, 6, 2, '#383028');
  px(ctx, x+5, y+14, 6, 1, '#585048');
  // Lamp head.
  px(ctx, x+5, y+1, 6, 5, '#383028');
  px(ctx, x+6, y+2, 4, 3, '#f8e040');
  px(ctx, x+7, y+3, 2, 1, '#fff8a0');
  // Cap.
  px(ctx, x+4, y, 8, 2, '#1a1410');
  px(ctx, x+5, y, 6, 1, '#383028');
}

function drawHydrant(ctx, x, y) {
  drawGrass(ctx, x, y);
  // Body.
  px(ctx, x+5, y+5, 6, 9, '#c01818');
  px(ctx, x+4, y+7, 8, 5, '#c01818');
  px(ctx, x+5, y+5, 6, 1, '#5a0808');
  px(ctx, x+5, y+13, 6, 1, '#5a0808');
  // Top dome.
  px(ctx, x+6, y+3, 4, 2, '#c01818');
  px(ctx, x+5, y+4, 6, 1, '#a01010');
  px(ctx, x+7, y+2, 2, 1, '#a01010');
  // Side caps.
  px(ctx, x+3, y+8, 1, 3, '#a01010');
  px(ctx, x+12, y+8, 1, 3, '#a01010');
  px(ctx, x+3, y+9, 1, 1, '#f8d030');
  px(ctx, x+12, y+9, 1, 1, '#f8d030');
  // Highlight.
  px(ctx, x+6, y+6, 1, 4, '#e84030');
}

function drawFlowerPot(ctx, x, y) {
  drawGrass(ctx, x, y);
  // Pot.
  px(ctx, x+4, y+9, 8, 6, '#a04830');
  px(ctx, x+3, y+9, 10, 2, '#a04830');
  px(ctx, x+3, y+9, 10, 1, '#5a2818');
  px(ctx, x+5, y+11, 6, 1, '#c87038');
  // Soil.
  px(ctx, x+5, y+8, 6, 1, '#3a2410');
  // Stems.
  px(ctx, x+6, y+5, 1, 3, '#3a8830');
  px(ctx, x+9, y+4, 1, 4, '#3a8830');
  px(ctx, x+7, y+6, 1, 2, '#3a8830');
  // Blossoms.
  px(ctx, x+5, y+4, 2, 2, '#e83838');
  px(ctx, x+6, y+3, 1, 1, '#f8a8a8');
  px(ctx, x+8, y+2, 2, 2, '#f8d030');
  px(ctx, x+9, y+1, 1, 1, '#fff080');
  px(ctx, x+10, y+5, 1, 1, '#a040c0');
}

function drawShelf(ctx, x, y) {
  // Floor base showing through underneath.
  drawFloor(ctx, x, y);
  // Shelf frame.
  px(ctx, x+1, y+1, TS-2, TS-2, '#a06840');
  px(ctx, x+1, y+1, TS-2, 1, '#604018');
  px(ctx, x+1, y+TS-2, TS-2, 1, '#604018');
  px(ctx, x+1, y+1, 1, TS-2, '#604018');
  px(ctx, x+TS-2, y+1, 1, TS-2, '#604018');
  // Shelf rails.
  px(ctx, x+2, y+6, TS-4, 1, '#604018');
  px(ctx, x+2, y+11, TS-4, 1, '#604018');
  // Items on top shelf - colored bottles.
  px(ctx, x+3, y+3, 2, 3, '#3050a8');
  px(ctx, x+6, y+3, 2, 3, '#a02828');
  px(ctx, x+9, y+3, 2, 3, '#48a838');
  px(ctx, x+12, y+3, 2, 3, '#f0c020');
  // Items on middle shelf - red balls.
  px(ctx, x+3, y+8, 2, 2, '#e83838');
  px(ctx, x+6, y+8, 2, 2, '#e83838');
  px(ctx, x+9, y+8, 2, 2, '#e83838');
  px(ctx, x+12, y+8, 2, 2, '#e83838');
  px(ctx, x+3, y+9, 2, 1, '#fff');
  px(ctx, x+6, y+9, 2, 1, '#fff');
  px(ctx, x+9, y+9, 2, 1, '#fff');
  px(ctx, x+12, y+9, 2, 1, '#fff');
  // Items on bottom - boxes.
  px(ctx, x+3, y+13, 3, 2, '#806838');
  px(ctx, x+8, y+13, 3, 2, '#806838');
  px(ctx, x+12, y+13, 2, 2, '#806838');
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

function drawSnowyPine(ctx, x, y) {
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

function drawRoofBlue(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#4878d8');
  px(ctx, x, y, TS, 3, '#2050a8');
  px(ctx, x+1, y+4, 2, 1, '#88c0f0');
  px(ctx, x+5, y+6, 2, 1, '#88c0f0');
  px(ctx, x+10, y+9, 2, 1, '#88c0f0');
  px(ctx, x+13, y+5, 2, 1, '#88c0f0');
  px(ctx, x, y+TS-2, TS, 2, '#2050a8');
}

function drawRoofThatched(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#c8a838');
  for (let i = 0; i < TS; i += 2) px(ctx, x+i, y+1, 1, TS-2, '#806818');
  px(ctx, x, y, TS, 1, '#604818');
  px(ctx, x, y+TS-2, TS, 2, '#604818');
  px(ctx, x+3, y+5, 1, 1, '#f0d870');
  px(ctx, x+11, y+9, 1, 1, '#f0d870');
}

function drawRoofTerracotta(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#c84818');
  px(ctx, x, y, TS, 3, '#802018');
  // Tile rows.
  for (let r = 4; r < TS-2; r += 4) {
    for (let i = (r%2)*2; i < TS; i += 4) px(ctx, x+i, y+r, 3, 2, '#f08838');
  }
  px(ctx, x, y+TS-2, TS, 2, '#802018');
}

function drawRoofDome(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#6840a8');
  // Dome curve highlight.
  px(ctx, x+5, y+1, 6, 1, '#a878d0');
  px(ctx, x+3, y+2, 10, 1, '#a878d0');
  px(ctx, x+2, y+3, 12, 1, '#a878d0');
  px(ctx, x+5, y+5, 1, 1, '#e0c0f8');
  px(ctx, x+10, y+7, 1, 1, '#e0c0f8');
  px(ctx, x, y+TS-2, TS, 2, '#381860');
  // Pinnacle.
  px(ctx, x+7, y, 2, 1, '#f0c020');
}

function drawRoofSnow(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#5a3818');
  // Snow blanket on top.
  px(ctx, x, y, TS, 6, '#ffffff');
  px(ctx, x+1, y+5, TS-2, 1, '#d0e0f0');
  // Drip.
  px(ctx, x+3, y+6, 1, 2, '#ffffff');
  px(ctx, x+9, y+6, 1, 2, '#ffffff');
  px(ctx, x+13, y+6, 1, 1, '#ffffff');
  // Bottom edge.
  px(ctx, x, y+TS-2, TS, 2, '#3a2410');
}

function drawRoofSlate(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#383848');
  for (let r = 2; r < TS-2; r += 3) {
    for (let i = (r%2)*2; i < TS; i += 4) px(ctx, x+i, y+r, 3, 2, '#585870');
  }
  px(ctx, x, y, TS, 1, '#181828');
  px(ctx, x, y+TS-2, TS, 2, '#181828');
}

function drawRoofMoss(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#487830');
  // Moss patches.
  px(ctx, x+2, y+3, 4, 3, '#78a850');
  px(ctx, x+9, y+5, 4, 3, '#78a850');
  px(ctx, x+5, y+10, 5, 2, '#78a850');
  px(ctx, x+1, y+12, 2, 2, '#5a8838');
  px(ctx, x+13, y+11, 2, 2, '#5a8838');
  px(ctx, x, y, TS, 1, '#284818');
  px(ctx, x, y+TS-2, TS, 2, '#284818');
}

function drawRoofLeaf(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#208828');
  // Layered leaves.
  px(ctx, x, y+1, TS, 3, '#50c050');
  px(ctx, x, y+5, TS, 3, '#50c050');
  px(ctx, x, y+9, TS, 3, '#50c050');
  // Leaf veins.
  for (let i = 0; i < TS; i += 3) {
    px(ctx, x+i, y+2, 1, 1, '#103810');
    px(ctx, x+i+1, y+6, 1, 1, '#103810');
    px(ctx, x+i, y+10, 1, 1, '#103810');
  }
  px(ctx, x, y+TS-2, TS, 2, '#103810');
}

function drawWallStone(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#98908a');
  // Mortar grid.
  for (let r = 0; r < TS; r += 4) px(ctx, x, y+r, TS, 1, '#685858');
  for (let r = 0; r < TS; r += 4) {
    const off = (r % 8 === 0) ? 0 : 4;
    for (let i = off; i < TS; i += 8) px(ctx, x+i, y+r+1, 1, 3, '#685858');
  }
  px(ctx, x+1, y+1, 2, 1, '#b8b0aa');
  px(ctx, x+9, y+5, 2, 1, '#b8b0aa');
  px(ctx, x+13, y+12, 2, 1, '#b8b0aa');
}

function drawWallTimber(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#806038');
  // Vertical planks.
  for (let i = 0; i < TS; i += 4) {
    px(ctx, x+i, y, 1, TS, '#604020');
    px(ctx, x+i+1, y+2, 1, TS-4, '#a08858');
  }
  px(ctx, x, y, TS, 1, '#382008');
  px(ctx, x, y+TS-1, TS, 1, '#382008');
}

function drawWallBrick(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#a83838');
  // Brick courses.
  for (let r = 0; r < TS; r += 4) px(ctx, x, y+r+3, TS, 1, '#602820');
  for (let r = 0; r < TS; r += 4) {
    const off = (r / 4 | 0) % 2 ? 4 : 0;
    for (let i = off; i < TS; i += 8) px(ctx, x+i, y+r, 1, 3, '#602820');
  }
  px(ctx, x+1, y+1, 2, 1, '#c85048');
  px(ctx, x+5, y+9, 2, 1, '#c85048');
}

function drawWallLog(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#806838');
  // Horizontal log seams.
  for (let r = 0; r < TS; r += 4) {
    px(ctx, x, y+r, TS, 1, '#604018');
    px(ctx, x, y+r+3, TS, 1, '#382008');
  }
  // Log knots.
  px(ctx, x+3, y+5, 1, 1, '#382008');
  px(ctx, x+10, y+1, 1, 1, '#382008');
  px(ctx, x+12, y+9, 1, 1, '#382008');
  px(ctx, x+5, y+13, 1, 1, '#382008');
  px(ctx, x+1, y+1, 1, 2, '#a08858');
  px(ctx, x+TS-1, y+1, 1, 2, '#a08858');
}

function drawWallWhite(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#f0e8d8');
  // Subtle vertical seams.
  for (let i = 4; i < TS; i += 4) px(ctx, x+i, y+1, 1, TS-2, '#c8c0b0');
  px(ctx, x+2, y+3, 1, 1, '#ffffff');
  px(ctx, x+10, y+8, 1, 1, '#ffffff');
  px(ctx, x, y, TS, 1, '#a8a098');
  px(ctx, x, y+TS-1, TS, 1, '#a8a098');
}

function drawWallLattice(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#80582a');
  // Diagonal lattice.
  for (let i = -TS; i < TS*2; i += 4) {
    for (let j = 0; j < TS; j++) {
      const xx = i + j, yy = j;
      if (xx >= 0 && xx < TS && yy < TS) px(ctx, x+xx, y+yy, 1, 1, '#404020');
    }
    for (let j = 0; j < TS; j++) {
      const xx = i + j, yy = TS - 1 - j;
      if (xx >= 0 && xx < TS && yy >= 0) px(ctx, x+xx, y+yy, 1, 1, '#404020');
    }
  }
  px(ctx, x, y, TS, 1, '#403020');
  px(ctx, x, y+TS-1, TS, 1, '#403020');
}

function drawDoorBlue(ctx, x, y) {
  px(ctx, x, y, TS, TS, '#4878d8');
  px(ctx, x+3, y+2, TS-6, TS-3, '#88c0f0');
  px(ctx, x+3, y+2, TS-6, 1, '#2050a8');
  px(ctx, x+TS-6, y+TS/2, 2, 2, '#f0c020');
  // Panel groove.
  px(ctx, x+TS/2, y+3, 1, TS-5, '#2050a8');
}

function drawDoorShop(ctx, x, y) {
  // Brown door + striped awning above.
  px(ctx, x, y, TS, 4, '#a83838');
  for (let i = 0; i < TS; i += 2) px(ctx, x+i, y, 1, 4, '#f0d8d0');
  px(ctx, x, y+4, TS, 1, '#382008');
  px(ctx, x+1, y+5, TS-2, TS-6, '#604028');
  px(ctx, x+3, y+7, TS-6, TS-9, '#a86838');
  px(ctx, x+TS-6, y+TS/2+2, 2, 2, '#f0c020');
  px(ctx, x, y+TS-1, TS, 1, '#382008');
}

function drawWindowL(ctx, x, y) {
  drawWallStone(ctx, x, y);
  // Window frame on the right half so two of these abut.
  px(ctx, x+8, y+3, 6, 8, '#382410');
  px(ctx, x+9, y+4, 4, 6, '#88c0f0');
  px(ctx, x+11, y+4, 1, 6, '#382410');
  px(ctx, x+9, y+7, 4, 1, '#382410');
  // Sill.
  px(ctx, x+7, y+11, 8, 1, '#5a3818');
}

function drawWindowR(ctx, x, y) {
  drawWallStone(ctx, x, y);
  px(ctx, x+2, y+3, 6, 8, '#382410');
  px(ctx, x+3, y+4, 4, 6, '#88c0f0');
  px(ctx, x+5, y+4, 1, 6, '#382410');
  px(ctx, x+3, y+7, 4, 1, '#382410');
  px(ctx, x+1, y+11, 8, 1, '#5a3818');
}

function drawChimney(ctx, x, y) {
  // Brick chimney with smoke.
  px(ctx, x+5, y+5, 6, 11, '#a83838');
  for (let r = 6; r < 16; r += 3) {
    px(ctx, x+5, y+r, 6, 1, '#602820');
  }
  px(ctx, x+5, y+5, 6, 1, '#382008');
  // Smoke puffs.
  px(ctx, x+6, y+1, 4, 2, '#a8a8a8');
  px(ctx, x+5, y+3, 6, 2, '#c8c8c8');
  px(ctx, x+9, y, 2, 1, '#888888');
}

function drawSmokestack(ctx, x, y) {
  px(ctx, x+6, y+2, 4, 14, '#585858');
  px(ctx, x+5, y+2, 6, 1, '#383838');
  px(ctx, x+5, y+15, 6, 1, '#383838');
  px(ctx, x+7, y+5, 2, 1, '#a83838');
  px(ctx, x+7, y+10, 2, 1, '#a83838');
  // Smoke.
  px(ctx, x+7, y, 2, 2, '#a8a8a8');
  px(ctx, x+5, y, 2, 1, '#888888');
  px(ctx, x+9, y, 2, 1, '#c8c8c8');
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
