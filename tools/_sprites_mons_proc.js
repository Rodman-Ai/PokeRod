// Procedural creature sprite renderer. Every species has a hand-pixeled
// 32x32 draw function chosen from its name + signature moves. Atlas-art.js
// renders each at 64x64 with an outline+shading pass on top.
'use strict';

(function(){
  function px(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x|0, y|0, w|0, h|0);
  }

  function drawCreature(ctx, species, sx, sy, sizePx, isBack) {
    const sp = window.PR_DATA.CREATURES[species];
    if (!sp) return;
    const d = sp.design;
    const scale = sizePx / 32;
    const cx = sx, cy = sy;
    const set = (gx, gy, color) => {
      px(ctx, cx + gx*scale, cy + gy*scale, Math.ceil(scale), Math.ceil(scale), color);
    };
    const rect = (gx, gy, gw, gh, color) => {
      ctx.fillStyle = color;
      ctx.fillRect((cx + gx*scale)|0, (cy + gy*scale)|0,
                   Math.ceil(gw*scale), Math.ceil(gh*scale));
    };
    const draw = SPECIES[species] || drawFallback;
    draw(set, rect, d, sp);
  }

  // ---- Common helpers -----------------------------------------------------

  function ellipse(rect, cx, cy, rx, ry, color) {
    for (let y = -ry; y <= ry; y++) {
      const w = Math.floor(Math.sqrt(1 - (y*y)/(ry*ry)) * rx);
      if (!isFinite(w) || w <= 0) continue;
      rect(cx - w, cy + y, w*2 + 1, 1, color);
    }
  }
  function disc(rect, cx, cy, r, color) { ellipse(rect, cx, cy, r, r, color); }
  function diamond(rect, cx, cy, r, color) {
    for (let i = 0; i <= r; i++) rect(cx - (r - i), cy - i, (r - i)*2 + 1, 1, color);
    for (let i = 1; i <= r; i++) rect(cx - (r - i), cy + i, (r - i)*2 + 1, 1, color);
  }
  function triUp(rect, cx, by, r, color) {
    for (let i = 0; i <= r; i++) rect(cx - i, by - i, i*2 + 1, 1, color);
  }
  function triDn(rect, cx, ty, r, color) {
    for (let i = 0; i <= r; i++) rect(cx - i, ty + i, i*2 + 1, 1, color);
  }
  function triLeft(rect, lx, cy, r, color) {
    for (let i = 0; i <= r; i++) rect(lx + i, cy - (r - i), 1, (r - i)*2 + 1, color);
  }
  function triRight(rect, rx, cy, r, color) {
    for (let i = 0; i <= r; i++) rect(rx - i, cy - (r - i), 1, (r - i)*2 + 1, color);
  }
  function eyes(set, lx, ly, rx, ry, white, pupil, shine) {
    set(lx, ly, pupil); set(lx+1, ly, pupil);
    set(rx, ry, pupil); set(rx+1, ry, pupil);
    if (white) { set(lx, ly-1, white); set(rx, ry-1, white); }
    if (shine) { set(lx+1, ly-1, shine); set(rx+1, ry-1, shine); }
  }
  function fang(rect, x, y, color) { rect(x, y, 1, 2, color); set => {}; }
  function bigEye(set, x, y, white, pupil, shine) {
    set(x, y, white); set(x+1, y, white);
    set(x, y+1, pupil); set(x+1, y+1, pupil);
    if (shine) set(x+1, y, shine);
  }
  function blush(set, lx, rx, y, color) {
    set(lx, y, color); set(lx+1, y, color);
    set(rx, y, color); set(rx+1, y, color);
  }

  // Color tweaks.
  function darken(hex, amt) { return shiftHex(hex, -amt); }
  function lighten(hex, amt) { return shiftHex(hex, amt); }
  function shiftHex(hex, amt) {
    if (!hex || hex[0] !== '#' || hex.length !== 7) return hex;
    const r = clamp(parseInt(hex.slice(1,3),16) + amt);
    const g = clamp(parseInt(hex.slice(3,5),16) + amt);
    const b = clamp(parseInt(hex.slice(5,7),16) + amt);
    return '#' + h2(r) + h2(g) + h2(b);
  }
  function clamp(v) { return Math.max(0, Math.min(255, v|0)); }
  function h2(v) { return v.toString(16).padStart(2,'0'); }
  const BLACK = '#101018', WHITE = '#fff8e8', SHINE = '#ffffff', SHADOW = '#202028';

  // Beard + tuft shared drawables (preserved API).
  function drawRedBeard(set, rect, d) {
    const bx = d.beardX !== undefined ? d.beardX : 16;
    const by = d.beardY !== undefined ? d.beardY : 22;
    rect(bx-4, by,   3, 1, '#a82010');
    rect(bx+2, by,   3, 1, '#a82010');
    rect(bx-3, by-1, 2, 1, '#d83020');
    rect(bx+2, by-1, 2, 1, '#d83020');
    rect(bx-4, by+1, 9, 2, '#d83020');
    rect(bx-3, by+3, 7, 2, '#a82010');
    rect(bx-2, by+5, 5, 1, '#7a1408');
    rect(bx-1, by+6, 3, 1, '#7a1408');
    rect(bx-2, by+1, 1, 1, '#f04030');
    rect(bx+2, by+1, 1, 1, '#f04030');
    rect(bx,   by+3, 1, 1, '#e84830');
  }
  function drawRedTuft(set, rect, d) {
    const tx = d.tuftX !== undefined ? d.tuftX : 16;
    const ty = d.tuftY !== undefined ? d.tuftY : 9;
    rect(tx-2, ty+1, 5, 2, '#a82010');
    rect(tx-2, ty,   5, 1, '#d83020');
    rect(tx-1, ty-1, 3, 1, '#e84838');
    rect(tx,   ty-2, 1, 1, '#f0a020');
  }

  // ---- Per-species sprites ------------------------------------------------
  // Each function: (set, rect, design, species) -> draws onto 32x32 grid.
  // Conventions: body centered around (16, 19). Use design.palette = [a,b,c]
  // for primary, secondary, accent. Add evolution-distinct details so a chain
  // of three reads as the same lineage growing in stage and menace.

  // ---- FIRE LINE: emberkit -> flarebound -> infernarok --------------------
  function drawEmberkit(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 30);
    // Body (small fox cub).
    ellipse(rect, 16, 21, 7, 5, a);
    ellipse(rect, 16, 21, 5, 3, b);
    rect(11, 25, 2, 2, sh); rect(19, 25, 2, 2, sh);   // paws
    // Head.
    ellipse(rect, 16, 14, 6, 5, a);
    rect(16, 16, 1, 2, b);                            // muzzle highlight
    triUp(rect, 11, 10, 2, a); triUp(rect, 21, 10, 2, a); // ears
    set(11, 10, c); set(21, 10, c);                   // ear inner tip
    eyes(set, 13, 14, 18, 14, WHITE, BLACK, SHINE);
    set(15, 16, c); set(17, 16, c);                   // nose dots / smile
    // Flame mane (signature: ember).
    rect(8, 12, 2, 5, '#f08020');
    rect(7, 14, 1, 3, '#f8c850');
    set(9, 11, '#ffd060');
    // Curling flame tail (move: ember).
    rect(22, 18, 2, 4, '#f0a020');
    rect(23, 16, 2, 3, '#f8c850');
    rect(24, 14, 1, 2, '#fff080');
    blush(set, 12, 19, 16, '#f08840');
  }
  function drawFlarebound(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 30);
    ellipse(rect, 16, 20, 9, 6, a);
    ellipse(rect, 16, 20, 7, 4, b);
    rect(10, 25, 2, 3, sh); rect(13, 26, 2, 2, sh);
    rect(18, 26, 2, 2, sh); rect(20, 25, 2, 3, sh);
    // Head.
    ellipse(rect, 16, 12, 7, 5, a);
    triUp(rect, 10, 8, 3, a); triUp(rect, 22, 8, 3, a);
    set(11, 8, '#fff080'); set(21, 8, '#fff080');
    // Fierce eyes.
    rect(12, 12, 2, 2, BLACK); rect(18, 12, 2, 2, BLACK);
    set(13, 12, '#ffe080'); set(19, 12, '#ffe080');
    rect(15, 14, 3, 1, BLACK);                        // smirk
    set(14, 15, c); set(18, 15, c);                   // fang dots
    // Ember banner (along flank).
    rect(8, 16, 2, 3, '#f08020');
    rect(7, 17, 1, 2, '#f8c850');
    rect(22, 16, 2, 3, '#f08020');
    rect(24, 17, 1, 2, '#f8c850');
    // Twin tail flames.
    rect(22, 22, 3, 2, '#f0a020');
    rect(24, 21, 1, 3, '#f8c850');
    rect(25, 19, 1, 3, '#fff080');
  }
  function drawInfernarok(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 40);
    // Hulking body.
    ellipse(rect, 16, 21, 11, 7, a);
    ellipse(rect, 16, 20, 9, 5, b);
    // Magma cracks across flank.
    rect(8, 21, 4, 1, '#ffb060'); rect(20, 22, 4, 1, '#ffb060');
    rect(13, 24, 6, 1, '#f08020');
    rect(7, 25, 3, 3, sh); rect(22, 25, 3, 3, sh);   // legs
    // Massive head + horns.
    ellipse(rect, 16, 11, 7, 5, a);
    triUp(rect, 10, 6, 3, sh); triUp(rect, 22, 6, 3, sh);
    rect(10, 5, 1, 2, '#a02018'); rect(22, 5, 1, 2, '#a02018');
    // Eyes glowing.
    rect(12, 11, 2, 2, '#ffd060'); rect(18, 11, 2, 2, '#ffd060');
    set(13, 11, SHINE); set(19, 11, SHINE);
    rect(13, 14, 6, 1, BLACK);                        // mouth open wide
    set(14, 15, '#ff7820'); set(17, 15, '#ff7820');   // fangs
    // Volcanic mane.
    rect(13, 4, 6, 2, '#ff7020');
    rect(14, 2, 4, 2, '#ffa040');
    set(16, 0, '#fff080');
    // Magma drips.
    set(8, 27, '#ff5020'); set(24, 27, '#ff5020');
  }

  // ---- WATER LINE: aquapup -> tideturtle -> maelstroth --------------------
  function drawAquapup(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 30);
    // Round shell-puppy body.
    ellipse(rect, 16, 21, 8, 6, a);
    ellipse(rect, 16, 21, 6, 4, b);
    rect(10, 25, 2, 2, sh); rect(20, 25, 2, 2, sh);
    rect(13, 26, 2, 2, sh); rect(17, 26, 2, 2, sh);
    // Shell rim ridges.
    rect(10, 18, 12, 1, sh);
    set(13, 17, b); set(19, 17, b);
    // Head pokes out.
    ellipse(rect, 16, 13, 5, 4, a);
    triUp(rect, 12, 9, 2, a); triUp(rect, 20, 9, 2, a);
    eyes(set, 13, 13, 18, 13, WHITE, BLACK, SHINE);
    set(15, 15, b); set(17, 15, b);
    rect(15, 16, 3, 1, sh);
    // Splash drop tail.
    rect(23, 19, 2, 2, b); set(25, 18, c);
    // Bubble (signature move: bubble).
    set(7, 16, c); set(6, 15, b);
  }
  function drawTideturtle(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 35);
    ellipse(rect, 16, 20, 11, 7, a);
    ellipse(rect, 16, 19, 9, 5, b);
    // Wave-pattern shell.
    rect(8, 17, 4, 1, sh); rect(14, 17, 5, 1, sh); rect(20, 17, 4, 1, sh);
    rect(10, 19, 2, 1, c); rect(15, 20, 2, 1, c); rect(20, 19, 2, 1, c);
    // Shell rim.
    rect(7, 22, 18, 1, sh);
    rect(8, 25, 3, 3, sh); rect(13, 26, 2, 2, sh);
    rect(17, 26, 2, 2, sh); rect(21, 25, 3, 3, sh);
    // Head.
    ellipse(rect, 16, 11, 5, 4, a);
    rect(11, 9, 2, 2, sh); rect(19, 9, 2, 2, sh);
    eyes(set, 13, 11, 18, 11, WHITE, BLACK, SHINE);
    rect(15, 13, 3, 1, BLACK); set(15, 14, c); set(17, 14, c);
    // Drips below shell.
    set(11, 24, c); set(20, 24, c);
  }
  function drawMaelstroth(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 45);
    // Storm-shell hulk.
    ellipse(rect, 16, 20, 13, 8, a);
    ellipse(rect, 16, 19, 11, 6, b);
    // Spiral storm on shell (signature: brooding storm).
    rect(13, 17, 6, 1, c); rect(11, 18, 2, 1, c); rect(19, 18, 2, 1, c);
    rect(11, 20, 2, 1, c); rect(19, 20, 2, 1, c); rect(13, 21, 6, 1, c);
    set(15, 19, sh); set(17, 19, sh);
    // Shell spikes.
    triUp(rect, 5, 16, 2, sh); triUp(rect, 27, 16, 2, sh);
    triUp(rect, 9, 13, 2, sh); triUp(rect, 23, 13, 2, sh);
    // Legs/fins.
    rect(6, 25, 4, 3, sh); rect(13, 26, 2, 2, sh);
    rect(17, 26, 2, 2, sh); rect(22, 25, 4, 3, sh);
    // Head.
    ellipse(rect, 16, 10, 6, 4, a);
    rect(10, 7, 2, 2, sh); rect(20, 7, 2, 2, sh);
    rect(12, 10, 2, 2, '#80c8f8'); rect(18, 10, 2, 2, '#80c8f8'); // glowing eyes
    set(13, 10, SHINE); set(19, 10, SHINE);
    rect(13, 13, 6, 1, BLACK); set(14, 14, WHITE); set(17, 14, WHITE);
    // Lightning bolt over shell.
    rect(15, 4, 1, 3, '#ffd060'); rect(16, 6, 1, 3, '#ffd060');
  }

  // ---- GRASS LINE: sproutling -> leafurge -> verdantsage ------------------
  function drawSproutling(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 30);
    // Round bulb body.
    ellipse(rect, 16, 21, 8, 6, a);
    ellipse(rect, 16, 21, 6, 4, lighten(a, 15));
    rect(10, 25, 2, 2, sh); rect(20, 25, 2, 2, sh);
    eyes(set, 12, 21, 19, 21, WHITE, BLACK, SHINE);
    rect(15, 23, 3, 1, c);
    // Side leaves.
    triLeft(rect, 6, 19, 3, b); triRight(rect, 26, 19, 3, b);
    set(7, 19, lighten(b, 20)); set(25, 19, lighten(b, 20));
    // Top sprout (signature: vinelash + future bud bloom).
    rect(15, 9, 2, 5, sh);
    rect(13, 8, 6, 2, b);
    rect(14, 6, 4, 2, lighten(b, 30));
    set(16, 5, c); set(15, 4, c); set(17, 4, c);  // pink bud
  }
  function drawLeafurge(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 30);
    ellipse(rect, 16, 20, 10, 7, a);
    ellipse(rect, 16, 20, 8, 5, lighten(a, 15));
    rect(10, 26, 3, 2, sh); rect(19, 26, 3, 2, sh);
    eyes(set, 12, 20, 19, 20, WHITE, BLACK, SHINE);
    rect(14, 22, 4, 1, c);
    rect(13, 23, 1, 1, '#88e088'); rect(18, 23, 1, 1, '#88e088');
    // Two side vine-leaves.
    triLeft(rect, 4, 18, 4, b); triRight(rect, 28, 18, 4, b);
    rect(4, 20, 3, 1, lighten(b, 25)); rect(25, 20, 3, 1, lighten(b, 25));
    // Cluster of three buds atop.
    rect(14, 8, 4, 2, sh);
    set(13, 6, c); set(13, 5, lighten(c, 20));
    set(16, 5, c); set(16, 4, lighten(c, 20));
    set(19, 6, c); set(19, 5, lighten(c, 20));
    rect(15, 11, 2, 2, sh);
  }
  function drawVerdantsage(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 40);
    // Towering sage body.
    ellipse(rect, 16, 21, 12, 7, a);
    ellipse(rect, 16, 21, 10, 5, lighten(a, 12));
    rect(7, 27, 4, 1, sh); rect(21, 27, 4, 1, sh);
    eyes(set, 11, 21, 20, 21, WHITE, BLACK, SHINE);
    rect(15, 23, 3, 1, BLACK);
    // Layered leaf cape.
    triLeft(rect, 2, 17, 5, sh); triRight(rect, 30, 17, 5, sh);
    triLeft(rect, 3, 20, 4, b);  triRight(rect, 29, 20, 4, b);
    // Three-tier crown of buds.
    rect(13, 8, 6, 2, sh);
    rect(11, 6, 10, 2, b);
    rect(13, 4, 6, 2, lighten(b, 25));
    set(16, 3, c); set(15, 2, c); set(17, 2, c);
    // Pollen sparks.
    set(8, 15, c); set(24, 15, c); set(6, 21, c); set(26, 21, c);
  }

  // ---- ELECTRIC: zapret -> boltbeard -------------------------------------
  function drawZapret(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 35);
    // Mouse silhouette.
    ellipse(rect, 16, 21, 7, 5, a);
    ellipse(rect, 16, 21, 5, 3, lighten(a, 15));
    rect(11, 25, 2, 2, sh); rect(19, 25, 2, 2, sh);
    rect(13, 26, 2, 2, sh); rect(17, 26, 2, 2, sh);
    // Head with big ears.
    ellipse(rect, 16, 14, 6, 5, a);
    triUp(rect, 11, 8, 2, a); triUp(rect, 21, 8, 2, a);
    set(11, 8, BLACK); set(21, 8, BLACK);
    eyes(set, 13, 14, 18, 14, WHITE, BLACK, SHINE);
    rect(15, 16, 3, 1, sh);
    blush(set, 12, 19, 16, c);                        // electric cheeks
    // Bolt-shaped tail (signature: thundershock).
    rect(23, 19, 2, 1, c);
    rect(24, 20, 2, 1, c);
    rect(22, 21, 2, 1, c);
    rect(24, 22, 2, 2, c);
    // Sparks.
    set(8, 11, c); set(24, 11, c);
  }
  function drawBoltbeard(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 35);
    ellipse(rect, 16, 21, 9, 6, a);
    ellipse(rect, 16, 21, 7, 4, lighten(a, 12));
    rect(10, 26, 3, 2, sh); rect(19, 26, 3, 2, sh);
    // Head.
    ellipse(rect, 16, 13, 6, 5, a);
    triUp(rect, 9, 7, 3, a); triUp(rect, 23, 7, 3, a);
    set(9, 7, BLACK); set(23, 7, BLACK);
    eyes(set, 13, 13, 18, 13, WHITE, BLACK, SHINE);
    blush(set, 11, 20, 15, c);
    // Lightning whiskers (signature: rod + storm).
    rect(6, 14, 4, 1, c); set(5, 13, c); set(5, 15, c);
    rect(22, 14, 4, 1, c); set(26, 13, c); set(26, 15, c);
    // Charged tail.
    rect(24, 18, 1, 2, c); rect(25, 19, 2, 1, c); rect(24, 21, 2, 2, c);
  }

  // ---- ROCK/GROUND: pebra -> boulderon ------------------------------------
  function drawPebra(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 35);
    // Pebble silhouette with chip pattern.
    ellipse(rect, 16, 22, 9, 6, a);
    ellipse(rect, 16, 21, 8, 5, lighten(a, 12));
    rect(8, 26, 3, 2, sh); rect(21, 26, 3, 2, sh);
    eyes(set, 12, 21, 19, 21, WHITE, BLACK, SHINE);
    rect(14, 24, 4, 1, sh);
    // Stripe markings.
    rect(11, 18, 4, 1, sh); rect(17, 18, 4, 1, sh);
    set(13, 22, c); set(18, 22, c);
    // Rocky horns (slow rise).
    triUp(rect, 12, 14, 2, sh); triUp(rect, 20, 14, 2, sh);
  }
  function drawBoulderon(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 40);
    // Hulking boulder.
    ellipse(rect, 16, 21, 13, 8, a);
    ellipse(rect, 16, 20, 11, 6, lighten(a, 10));
    rect(7, 27, 4, 1, sh); rect(21, 27, 4, 1, sh);
    eyes(set, 11, 19, 20, 19, WHITE, BLACK, SHINE);
    rect(13, 22, 6, 1, sh);
    // Plates.
    rect(8, 16, 4, 2, sh); rect(20, 16, 4, 2, sh);
    rect(13, 14, 6, 2, sh);
    // Quartz horns (signature: rocktoss / earthbump).
    triUp(rect, 11, 11, 3, c); triUp(rect, 21, 11, 3, c);
    set(11, 9, SHINE); set(21, 9, SHINE);
  }

  // ---- FLYING: flitwing -> skylordan ---------------------------------------
  function drawFlitwing(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 30);
    // Round bird body.
    ellipse(rect, 16, 19, 6, 5, a);
    ellipse(rect, 16, 20, 5, 3, lighten(a, 12));
    // Head.
    ellipse(rect, 16, 12, 5, 4, a);
    eyes(set, 13, 12, 18, 12, WHITE, BLACK, SHINE);
    rect(15, 14, 3, 1, '#f0c020');                    // beak
    rect(16, 15, 1, 1, '#a07810');
    // Spread wings (signature: peck/gust).
    triLeft(rect, 4, 19, 4, b); triRight(rect, 28, 19, 4, b);
    rect(5, 21, 3, 1, sh); rect(24, 21, 3, 1, sh);
    // Tail feathers.
    rect(14, 24, 4, 2, b);
    rect(15, 26, 1, 1, c); rect(17, 26, 1, 1, c);
    // Feet.
    rect(13, 24, 1, 2, '#a07810'); rect(18, 24, 1, 2, '#a07810');
  }
  function drawSkylordan(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 35);
    // Larger raptor body.
    ellipse(rect, 16, 19, 8, 6, a);
    ellipse(rect, 16, 19, 6, 4, lighten(a, 10));
    // Head with crest.
    ellipse(rect, 16, 11, 6, 4, a);
    rect(14, 6, 4, 3, sh); rect(15, 4, 2, 3, b);
    rect(12, 11, 2, 2, BLACK); rect(18, 11, 2, 2, BLACK);
    set(13, 11, '#ffe080'); set(19, 11, '#ffe080');
    rect(15, 13, 3, 2, '#f0c020');
    rect(17, 14, 1, 2, '#a07810');
    // Massive spread wings.
    triLeft(rect, 1, 18, 6, b); triRight(rect, 31, 18, 6, b);
    rect(2, 21, 5, 1, sh); rect(25, 21, 5, 1, sh);
    rect(3, 16, 3, 1, lighten(b, 15)); rect(26, 16, 3, 1, lighten(b, 15));
    // Talons.
    rect(13, 25, 1, 2, sh); rect(18, 25, 1, 2, sh);
    rect(14, 27, 4, 1, BLACK);
  }

  // ---- NORMAL/DARK: nibblet -> whiskaroth ---------------------------------
  function drawNibblet(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 30);
    // Small mouse.
    ellipse(rect, 16, 21, 6, 5, a);
    ellipse(rect, 16, 21, 4, 3, lighten(a, 15));
    rect(11, 25, 2, 2, sh); rect(19, 25, 2, 2, sh);
    // Head.
    ellipse(rect, 16, 14, 5, 4, a);
    triUp(rect, 12, 9, 2, a); triUp(rect, 20, 9, 2, a);
    set(12, 9, c); set(20, 9, c);
    eyes(set, 13, 14, 18, 14, WHITE, BLACK, SHINE);
    rect(15, 16, 3, 1, BLACK);
    // Long curling tail (signature: tackle).
    rect(22, 21, 2, 1, a); rect(24, 20, 1, 2, a); rect(25, 18, 1, 3, a);
    // Whisker dots.
    set(11, 15, sh); set(21, 15, sh);
  }
  function drawWhiskaroth(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 35);
    ellipse(rect, 16, 20, 9, 6, a);
    ellipse(rect, 16, 20, 7, 4, lighten(a, 12));
    rect(10, 25, 3, 3, sh); rect(19, 25, 3, 3, sh);
    // Head.
    ellipse(rect, 16, 12, 6, 5, a);
    triUp(rect, 10, 6, 3, a); triUp(rect, 22, 6, 3, a);
    set(10, 6, c); set(22, 6, c);
    rect(12, 12, 2, 2, BLACK); rect(18, 12, 2, 2, BLACK);
    set(13, 12, SHINE); set(19, 12, SHINE);
    rect(14, 15, 4, 1, BLACK);
    // Long whiskers (signature: dark/secret-keeper).
    rect(5, 14, 6, 1, sh); rect(21, 14, 6, 1, sh);
    set(4, 13, sh); set(27, 13, sh);
    // Tail wraps.
    rect(23, 19, 2, 2, a); rect(25, 18, 1, 3, a);
    rect(26, 16, 1, 3, sh);
  }

  // ---- BUG line: crawlbug -> mothmane -------------------------------------
  function drawCrawlbug(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 30);
    // Caterpillar body segments.
    ellipse(rect, 9,  21, 4, 3, a);
    ellipse(rect, 16, 21, 4, 3, a);
    ellipse(rect, 23, 21, 4, 3, a);
    rect(8, 21, 17, 1, lighten(a, 15));
    rect(9, 23, 1, 1, sh); rect(16, 23, 1, 1, sh); rect(23, 23, 1, 1, sh);
    set(13, 22, c); set(20, 22, c);
    // Head (left side).
    ellipse(rect, 5, 20, 4, 4, a);
    eyes(set, 4, 20, 7, 20, WHITE, BLACK, SHINE);
    rect(5, 22, 2, 1, BLACK);
    // Antennae.
    rect(4, 16, 1, 3, sh); set(3, 15, c);
    rect(7, 16, 1, 3, sh); set(8, 15, c);
    // Leaf-fluff on back.
    triUp(rect, 16, 17, 2, b); set(16, 16, lighten(b, 20));
    triUp(rect, 23, 17, 2, b); set(23, 16, lighten(b, 20));
  }
  function drawMothmane(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 35);
    // Furry moth body.
    ellipse(rect, 16, 19, 5, 6, sh);
    ellipse(rect, 16, 18, 4, 5, a);
    rect(13, 23, 6, 2, sh);
    // Big patterned wings (signature: dream-scattering).
    rect(4, 14, 8, 8, b); rect(20, 14, 8, 8, b);
    rect(6, 16, 4, 4, lighten(b, 18)); rect(22, 16, 4, 4, lighten(b, 18));
    set(8, 18, c); set(24, 18, c);                    // wing eyespots
    set(7, 17, BLACK); set(23, 17, BLACK);
    rect(5, 22, 5, 1, sh); rect(22, 22, 5, 1, sh);
    // Furry head + antennae.
    ellipse(rect, 16, 12, 4, 3, a);
    eyes(set, 13, 12, 18, 12, WHITE, BLACK, SHINE);
    rect(14, 14, 4, 1, sh);
    rect(13, 8, 1, 3, sh); set(12, 7, c);
    rect(18, 8, 1, 3, sh); set(19, 7, c);
  }

  // ---- POISON FLYING: cavewing -> vampirothy ------------------------------
  function drawCavewing(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 35);
    // Bat body.
    ellipse(rect, 16, 18, 5, 5, a);
    ellipse(rect, 16, 18, 3, 3, lighten(a, 12));
    triUp(rect, 13, 13, 2, sh); triUp(rect, 19, 13, 2, sh); // ears
    rect(13, 19, 2, 2, BLACK); rect(17, 19, 2, 2, BLACK);   // eye sockets
    set(13, 19, c); set(17, 19, c);
    rect(15, 21, 3, 1, BLACK);
    fang(rect, 14, 22, WHITE); fang(rect, 17, 22, WHITE);
    // Spread wings.
    triLeft(rect, 2, 18, 5, b); triRight(rect, 30, 18, 5, b);
    rect(3, 14, 4, 1, sh); rect(25, 14, 4, 1, sh);
    rect(2, 22, 4, 1, sh); rect(26, 22, 4, 1, sh);
    rect(4, 20, 1, 2, sh); rect(27, 20, 1, 2, sh);     // wing struts
  }
  function drawVampirothy(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 40);
    ellipse(rect, 16, 18, 6, 6, a);
    ellipse(rect, 16, 17, 4, 4, lighten(a, 10));
    triUp(rect, 12, 12, 3, sh); triUp(rect, 20, 12, 3, sh);
    set(12, 11, c); set(20, 11, c);
    rect(12, 17, 3, 2, c); rect(17, 17, 3, 2, c);     // glowing red eyes
    set(13, 17, SHINE); set(18, 17, SHINE);
    rect(15, 20, 3, 1, BLACK);
    fang(rect, 13, 21, WHITE); fang(rect, 18, 21, WHITE);
    // Crown of horns.
    triUp(rect, 16, 9, 2, c);
    // Massive wings with scalloped edges.
    triLeft(rect, 0, 18, 6, b); triRight(rect, 32, 18, 6, b);
    rect(1, 13, 5, 1, sh); rect(26, 13, 5, 1, sh);
    rect(0, 23, 5, 1, sh); rect(27, 23, 5, 1, sh);
    rect(2, 21, 1, 2, sh); rect(29, 21, 1, 2, sh);
    set(0, 19, sh); set(31, 19, sh);
  }

  // ---- FISH line: splashfin -> levifin -----------------------------------
  function drawSplashfin(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 30);
    // Tear-drop fish body.
    ellipse(rect, 14, 19, 8, 5, a);
    ellipse(rect, 14, 19, 6, 3, lighten(a, 15));
    // Dorsal fin (signature: splash flop).
    triUp(rect, 12, 13, 3, b);
    set(12, 12, c); set(11, 13, c);
    // Tail fan (right).
    triRight(rect, 24, 19, 4, b);
    rect(22, 16, 1, 6, sh);
    // Belly fin.
    triDn(rect, 14, 23, 2, b);
    // Eye.
    rect(11, 18, 2, 2, WHITE); set(12, 18, BLACK); set(11, 19, BLACK);
    set(11, 17, SHINE);
    rect(8, 21, 3, 1, BLACK);                         // mouth gape
    // Splash droplet above.
    set(15, 9, b); set(14, 11, c);
  }
  function drawLevifin(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 40);
    // Massive predator silhouette.
    ellipse(rect, 16, 19, 12, 7, a);
    ellipse(rect, 16, 19, 10, 5, lighten(a, 10));
    // Spiked dorsal ridge.
    triUp(rect, 8, 11, 2, b); triUp(rect, 12, 10, 2, b);
    triUp(rect, 16, 9, 2, b); triUp(rect, 20, 10, 2, b);
    triUp(rect, 24, 11, 2, b);
    // Tail fan.
    triRight(rect, 30, 19, 5, b);
    rect(27, 14, 1, 10, sh);
    // Belly fins.
    triDn(rect, 12, 25, 2, b); triDn(rect, 20, 25, 2, b);
    // Snarling face.
    rect(8, 17, 2, 2, c); set(9, 17, SHINE);          // glowing eye
    rect(2, 19, 6, 1, BLACK);                         // wide mouth
    rect(3, 20, 1, 1, WHITE); rect(5, 20, 1, 1, WHITE); rect(7, 20, 1, 1, WHITE); // fangs
    rect(2, 18, 1, 1, sh);                            // jaw line
  }

  // ---- FOX (cute): glimkit -> lustrofox ----------------------------------
  function drawGlimkit(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 30);
    ellipse(rect, 16, 21, 7, 5, a);
    ellipse(rect, 16, 21, 5, 3, lighten(a, 15));
    rect(11, 25, 2, 3, sh); rect(19, 25, 2, 3, sh);
    // Head.
    ellipse(rect, 16, 13, 6, 5, a);
    triUp(rect, 11, 8, 3, a); triUp(rect, 21, 8, 3, a);
    set(11, 8, lighten(a, 25)); set(21, 8, lighten(a, 25));
    eyes(set, 13, 13, 18, 13, WHITE, BLACK, SHINE);
    set(15, 15, c); set(17, 15, c);
    rect(15, 16, 3, 1, sh);
    // Big curly fluff tail (signature: light-bending).
    rect(22, 19, 3, 2, a);
    rect(24, 17, 2, 4, lighten(a, 20));
    rect(25, 15, 1, 3, lighten(a, 25));
    set(26, 14, SHINE);
  }
  function drawLustrofox(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 25);
    // Slender body.
    ellipse(rect, 16, 21, 9, 6, a);
    ellipse(rect, 16, 21, 7, 4, lighten(a, 15));
    rect(10, 26, 2, 2, sh); rect(13, 27, 2, 1, sh);
    rect(17, 27, 2, 1, sh); rect(20, 26, 2, 2, sh);
    // Head.
    ellipse(rect, 16, 11, 6, 5, a);
    triUp(rect, 10, 6, 3, a); triUp(rect, 22, 6, 3, a);
    set(10, 6, c); set(22, 6, c);
    rect(12, 11, 2, 2, '#5028a0'); rect(18, 11, 2, 2, '#5028a0'); // psychic eyes
    set(13, 11, SHINE); set(19, 11, SHINE);
    set(15, 14, c); set(17, 14, c);
    rect(15, 15, 3, 1, sh);
    // Three bushy tails (signature: psychic).
    rect(22, 19, 4, 2, a); rect(25, 17, 2, 4, lighten(a, 20));
    rect(23, 22, 3, 2, a); rect(25, 23, 2, 3, lighten(a, 18));
    rect(24, 25, 3, 2, a); rect(26, 26, 1, 2, lighten(a, 18));
  }

  // ---- FIRE 2nd line: cinderpup -> pyrohound -> magmaron -----------------
  function drawCinderpup(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 30);
    // Pup body.
    ellipse(rect, 16, 21, 7, 5, a);
    ellipse(rect, 16, 21, 5, 3, lighten(a, 15));
    rect(11, 25, 2, 2, sh); rect(19, 25, 2, 2, sh);
    rect(13, 26, 2, 2, sh); rect(17, 26, 2, 2, sh);
    // Floppy ear head.
    ellipse(rect, 16, 13, 6, 5, a);
    rect(8, 11, 4, 5, sh); rect(20, 11, 4, 5, sh);     // floppy ears
    rect(8, 14, 4, 1, '#f08020');
    eyes(set, 13, 13, 18, 13, WHITE, BLACK, SHINE);
    rect(15, 15, 3, 1, BLACK);
    set(15, 16, '#f08020'); set(17, 16, '#f08020');   // tongue dots
    // Ember puffs above (signature: ember).
    set(13, 9, '#ffd060'); set(19, 9, '#ffd060');
    set(13, 8, '#f08020'); set(19, 8, '#f08020');
  }
  function drawPyrohound(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 35);
    // Lean hound body.
    ellipse(rect, 16, 20, 9, 6, a);
    ellipse(rect, 16, 20, 7, 4, lighten(a, 12));
    rect(8, 25, 3, 3, sh); rect(13, 26, 2, 2, sh);
    rect(17, 26, 2, 2, sh); rect(21, 25, 3, 3, sh);
    // Long muzzle head.
    ellipse(rect, 16, 11, 6, 4, a);
    triUp(rect, 11, 6, 2, sh); triUp(rect, 21, 6, 2, sh);
    rect(12, 11, 2, 2, BLACK); rect(18, 11, 2, 2, BLACK);
    set(13, 11, '#ffe080'); set(19, 11, '#ffe080');
    rect(13, 14, 6, 1, BLACK);
    // Mane of embers.
    rect(11, 9, 10, 2, '#f08020');
    rect(13, 7, 6, 2, '#ffa040');
    set(15, 5, '#fff080'); set(17, 5, '#fff080');
    // Tail (firebrand).
    rect(23, 19, 2, 2, '#f08020'); rect(25, 17, 2, 3, '#ffa040'); set(27, 16, '#fff080');
  }
  function drawMagmaron(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 45);
    // Massive ground/fire hound.
    ellipse(rect, 16, 21, 12, 7, a);
    ellipse(rect, 16, 20, 10, 5, lighten(a, 10));
    rect(7, 27, 4, 1, sh); rect(21, 27, 4, 1, sh);
    rect(13, 26, 6, 2, sh);
    // Magma cracks.
    rect(8, 22, 5, 1, '#ff6020'); rect(19, 22, 5, 1, '#ff6020');
    rect(13, 24, 6, 1, '#ff8030');
    // Beast head.
    ellipse(rect, 16, 11, 7, 4, a);
    triUp(rect, 9, 5, 3, sh); triUp(rect, 23, 5, 3, sh);
    rect(11, 5, 1, 2, c); rect(23, 5, 1, 2, c);
    rect(11, 11, 2, 2, '#ffd060'); rect(19, 11, 2, 2, '#ffd060');
    set(12, 11, SHINE); set(20, 11, SHINE);
    rect(12, 14, 8, 1, BLACK);                        // huge maw
    set(13, 15, WHITE); set(15, 15, WHITE); set(17, 15, WHITE); set(19, 15, WHITE);
    // Lava mane.
    rect(11, 7, 10, 2, '#ff5020');
    rect(13, 5, 6, 2, '#ffa040');
  }

  // ---- WATER 2nd: mistfin / tidalwhal / glacierock -----------------------
  function drawMistfin(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 30);
    ellipse(rect, 14, 19, 8, 5, a);
    ellipse(rect, 14, 19, 6, 3, lighten(a, 18));
    // Dorsal sail.
    triUp(rect, 11, 12, 4, b);
    rect(11, 12, 1, 2, sh);
    // Tail.
    triRight(rect, 24, 19, 4, b);
    rect(22, 16, 1, 6, sh);
    // Eyes (sleepy).
    rect(10, 18, 2, 1, BLACK); rect(15, 18, 2, 1, BLACK);
    set(11, 19, c); set(16, 19, c);
    rect(8, 21, 3, 1, sh);
    // Mist puffs (signature: mist/bubble).
    set(7, 11, c); set(8, 9, lighten(c, 30));
    set(20, 11, c); set(21, 9, lighten(c, 30));
    set(13, 7, lighten(c, 30));
  }
  function drawTidalwhal(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 35);
    // Whale body.
    ellipse(rect, 14, 20, 11, 7, a);
    ellipse(rect, 14, 20, 9, 5, lighten(a, 12));
    // Spout.
    set(11, 8, c); rect(10, 9, 3, 1, lighten(c, 25));
    rect(11, 11, 1, 3, c);
    // Tail flukes.
    triRight(rect, 27, 20, 4, b);
    rect(24, 17, 1, 6, sh);
    rect(26, 16, 2, 2, b); rect(26, 22, 2, 2, b);
    // Eye.
    rect(8, 19, 2, 2, WHITE); set(9, 19, BLACK); set(8, 20, BLACK); set(9, 18, SHINE);
    rect(4, 22, 4, 1, sh);
    // Belly grooves.
    rect(8, 24, 3, 1, sh); rect(14, 24, 3, 1, sh); rect(20, 24, 3, 1, sh);
    // Ice crystals on back.
    set(12, 14, c); set(16, 14, c); set(20, 14, c);
  }
  function drawGlacierock(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 40);
    // Iceberg body.
    rect(6, 16, 20, 10, a);
    rect(8, 14, 16, 2, lighten(a, 12));
    rect(10, 12, 12, 2, lighten(a, 18));
    rect(12, 10, 8, 2, lighten(a, 25));
    // Crystal facets.
    rect(7, 18, 18, 1, sh);
    rect(8, 20, 4, 1, c); rect(20, 20, 4, 1, c);
    rect(11, 24, 10, 1, sh);
    // Eyes embedded.
    rect(11, 16, 2, 2, c); rect(19, 16, 2, 2, c);
    set(12, 16, SHINE); set(20, 16, SHINE);
    rect(13, 19, 6, 1, BLACK);
    // Floating shard.
    set(28, 22, c); set(28, 24, c);
  }

  // ---- GRASS 2nd: fernsprout -> bramblewood -> thornedred ----------------
  function drawFernsprout(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 30);
    ellipse(rect, 16, 21, 7, 5, a);
    ellipse(rect, 16, 21, 5, 3, lighten(a, 15));
    rect(11, 25, 2, 2, sh); rect(19, 25, 2, 2, sh);
    eyes(set, 13, 21, 18, 21, WHITE, BLACK, SHINE);
    rect(14, 23, 4, 1, c);
    // Fern fronds top.
    rect(15, 11, 2, 6, sh);
    triLeft(rect, 9, 13, 3, lighten(a, 18));
    triRight(rect, 23, 13, 3, lighten(a, 18));
    triLeft(rect, 11, 9, 2, a); triRight(rect, 21, 9, 2, a);
    set(16, 6, c);                                    // tip drop of dew
    // Pollen.
    set(8, 18, c); set(24, 18, c);
  }
  function drawBramblewood(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 35);
    // Stump body.
    rect(8, 16, 16, 12, a);
    rect(7, 17, 1, 10, sh); rect(24, 17, 1, 10, sh);
    rect(10, 18, 12, 1, lighten(a, 12));
    // Bark cracks.
    rect(11, 20, 1, 4, sh); rect(20, 20, 1, 4, sh);
    rect(15, 22, 2, 4, sh);
    // Eyes carved.
    rect(11, 21, 2, 2, BLACK); rect(19, 21, 2, 2, BLACK);
    set(12, 21, '#ffd060'); set(20, 21, '#ffd060');
    rect(14, 25, 4, 1, BLACK);
    // Three leaf clusters.
    triUp(rect, 10, 14, 3, lighten(a, 20));
    triUp(rect, 16, 12, 3, lighten(a, 20));
    triUp(rect, 22, 14, 3, lighten(a, 20));
    set(16, 9, c);
    // Rocky base.
    rect(6, 27, 4, 1, sh); rect(22, 27, 4, 1, sh);
    set(5, 27, c); set(26, 27, c);
  }
  function drawThornedred(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 40);
    // Massive ancient stump.
    rect(5, 14, 22, 14, a);
    rect(4, 15, 1, 12, sh); rect(27, 15, 1, 12, sh);
    rect(7, 16, 18, 2, lighten(a, 10));
    // Bark gnarls.
    rect(9, 19, 2, 7, sh); rect(21, 19, 2, 7, sh);
    rect(15, 22, 2, 6, sh);
    // Carved eyes glow.
    rect(10, 20, 3, 2, '#a02018'); rect(19, 20, 3, 2, '#a02018');
    set(11, 20, '#ffd060'); set(20, 20, '#ffd060');
    rect(13, 25, 6, 1, BLACK);
    set(13, 26, c); set(18, 26, c);                   // teeth-thorns
    // Towering crown of thorns.
    triUp(rect, 16, 13, 5, sh);
    triUp(rect, 8, 11, 2, c); triUp(rect, 24, 11, 2, c);
    triUp(rect, 12, 9, 2, c); triUp(rect, 20, 9, 2, c);
    triUp(rect, 16, 7, 2, c);
    rect(15, 5, 2, 2, lighten(c, 20));
  }

  // ---- ELECTRIC 2nd line: voltkit -> voltlynx -> stormfangis ------------
  function drawVoltkit(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 35);
    // Kitten body.
    ellipse(rect, 16, 21, 7, 5, a);
    ellipse(rect, 16, 21, 5, 3, lighten(a, 15));
    rect(11, 25, 2, 3, sh); rect(19, 25, 2, 3, sh);
    // Head + tufted ears.
    ellipse(rect, 16, 13, 6, 5, a);
    triUp(rect, 11, 7, 3, a); triUp(rect, 21, 7, 3, a);
    set(11, 6, c); set(21, 6, c);                     // bolt-tip ears
    eyes(set, 13, 13, 18, 13, WHITE, BLACK, SHINE);
    blush(set, 11, 20, 15, c);
    rect(15, 15, 3, 1, BLACK);
    // Forked sparking tail (signature: thunder shock).
    rect(22, 21, 2, 1, c);
    rect(24, 19, 1, 3, c);
    rect(25, 17, 1, 2, c);
    rect(26, 16, 1, 2, c);                            // forks
    set(24, 16, lighten(c, 25));
    // Tiny sparks around.
    set(8, 16, c); set(7, 13, c);
  }
  function drawVoltlynx(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 35);
    // Lithe lynx.
    ellipse(rect, 16, 20, 10, 6, a);
    ellipse(rect, 16, 20, 8, 4, lighten(a, 12));
    rect(8, 25, 3, 3, sh); rect(13, 26, 2, 2, sh);
    rect(17, 26, 2, 2, sh); rect(21, 25, 3, 3, sh);
    // Tiger stripes.
    rect(10, 17, 2, 1, sh); rect(15, 17, 3, 1, sh); rect(20, 17, 2, 1, sh);
    rect(11, 22, 2, 1, sh); rect(19, 22, 2, 1, sh);
    // Head + lightning ear tufts.
    ellipse(rect, 16, 12, 6, 4, a);
    rect(10, 5, 2, 5, c); rect(20, 5, 2, 5, c);
    set(9, 7, lighten(c, 20)); set(22, 7, lighten(c, 20));
    rect(12, 12, 2, 2, BLACK); rect(18, 12, 2, 2, BLACK);
    set(13, 12, '#ffe080'); set(19, 12, '#ffe080');
    rect(13, 15, 6, 1, BLACK);
    fang(rect, 13, 16, WHITE); fang(rect, 18, 16, WHITE);
    // Lightning whip tail.
    rect(23, 18, 1, 3, c); rect(25, 16, 1, 3, c); rect(27, 18, 1, 3, c);
  }
  function drawStormfangis(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 40);
    ellipse(rect, 16, 20, 12, 7, a);
    ellipse(rect, 16, 20, 10, 5, lighten(a, 8));
    rect(7, 26, 4, 2, sh); rect(13, 27, 2, 1, sh);
    rect(17, 27, 2, 1, sh); rect(21, 26, 4, 2, sh);
    // Storm-cloud markings.
    rect(8, 16, 5, 2, sh); rect(19, 16, 5, 2, sh);
    rect(13, 18, 6, 1, c);
    // Beast head.
    ellipse(rect, 16, 11, 7, 5, a);
    rect(9, 4, 2, 7, c); rect(21, 4, 2, 7, c);        // huge bolt ears
    rect(11, 11, 2, 2, c); rect(19, 11, 2, 2, c);     // glowing red eyes
    set(12, 11, SHINE); set(20, 11, SHINE);
    rect(12, 14, 8, 1, BLACK);
    rect(13, 15, 1, 2, WHITE); rect(15, 15, 1, 2, WHITE);
    rect(17, 15, 1, 2, WHITE); rect(19, 15, 1, 2, WHITE); // big fangs
    // Tail of lightning.
    rect(24, 19, 1, 2, c); rect(26, 17, 1, 2, c);
    rect(28, 19, 1, 2, c); rect(28, 22, 1, 2, c);
  }

  // ---- WORM line: stoneworm -> quakeworm -> tectonarch -------------------
  function drawStoneworm(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 30);
    // Three segments coiled.
    ellipse(rect, 8, 21, 4, 4, a);
    ellipse(rect, 16, 22, 5, 4, a);
    ellipse(rect, 24, 21, 4, 4, a);
    rect(7, 19, 2, 1, lighten(a, 15));
    rect(15, 20, 3, 1, lighten(a, 15));
    rect(23, 19, 2, 1, lighten(a, 15));
    // Pebble bands.
    set(8, 23, c); set(16, 24, c); set(24, 23, c);
    rect(12, 22, 1, 1, sh); rect(19, 22, 1, 1, sh);
    // Head (left).
    ellipse(rect, 5, 19, 4, 3, a);
    eyes(set, 4, 19, 7, 19, WHITE, BLACK, SHINE);
    rect(4, 21, 3, 1, BLACK);
    // Tail tip.
    triRight(rect, 28, 21, 2, sh);
  }
  function drawQuakeworm(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 35);
    // Bigger segments.
    ellipse(rect, 6, 20, 5, 5, a);
    ellipse(rect, 16, 21, 7, 5, a);
    ellipse(rect, 26, 20, 5, 5, a);
    rect(5, 18, 3, 1, lighten(a, 12));
    rect(13, 19, 6, 1, lighten(a, 12));
    rect(24, 18, 3, 1, lighten(a, 12));
    // Rock plates on back.
    rect(15, 16, 4, 2, sh); set(16, 15, c); set(18, 15, c);
    // Head with ridge.
    triUp(rect, 6, 16, 2, sh);
    rect(4, 19, 2, 2, BLACK); rect(7, 19, 2, 2, BLACK);
    set(5, 19, c); set(8, 19, c);
    rect(4, 22, 5, 1, BLACK);
    // Tail spike.
    triRight(rect, 30, 20, 3, c);
  }
  function drawTectonarch(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 40);
    // Massive serpentine body.
    ellipse(rect, 5,  19, 5, 5, a);
    ellipse(rect, 13, 21, 6, 5, a);
    ellipse(rect, 22, 19, 5, 5, a);
    ellipse(rect, 28, 17, 4, 3, a);
    rect(4, 17, 3, 1, lighten(a, 10));
    rect(11, 19, 5, 1, lighten(a, 10));
    rect(20, 17, 4, 1, lighten(a, 10));
    // Plate spine.
    triUp(rect, 13, 14, 3, sh); triUp(rect, 22, 13, 3, sh);
    set(13, 12, c); set(22, 11, c);
    // Head with crown horns.
    triUp(rect, 5, 14, 2, c); triUp(rect, 7, 13, 2, c);
    rect(3, 18, 2, 2, BLACK); rect(6, 18, 2, 2, BLACK);
    set(4, 18, c); set(7, 18, c);
    rect(3, 21, 5, 1, BLACK);
    fang(rect, 4, 22, WHITE); fang(rect, 7, 22, WHITE);
    // Tail with crystal cluster.
    set(31, 16, c); set(30, 15, c); set(32, 14, c);
  }

  // ---- BUG/POISON: bumblesting -> hivequeen -> royalwasp ----------------
  function drawBumblesting(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 30);
    // Round bee body with stripes.
    ellipse(rect, 16, 20, 7, 6, a);
    ellipse(rect, 16, 20, 6, 4, lighten(a, 12));
    rect(11, 17, 11, 2, b);                           // black stripe
    rect(11, 22, 11, 1, b);
    // Wings (signature: bug + flying).
    rect(8, 14, 5, 4, lighten(c, 50));
    rect(19, 14, 5, 4, lighten(c, 50));
    rect(9, 15, 3, 2, '#fff8e8'); rect(20, 15, 3, 2, '#fff8e8');
    // Head.
    ellipse(rect, 16, 12, 4, 3, b);
    set(13, 8, b); set(13, 7, b); set(19, 8, b); set(19, 7, b); // antennae
    rect(14, 12, 2, 1, c); rect(17, 12, 2, 1, c);
    rect(15, 14, 3, 1, BLACK);
    // Stinger below.
    triDn(rect, 16, 26, 2, b); set(16, 28, '#a02018');
  }
  function drawHivequeen(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 35);
    // Larger bee body.
    ellipse(rect, 16, 20, 9, 7, a);
    ellipse(rect, 16, 20, 7, 5, lighten(a, 10));
    rect(8, 17, 16, 2, b); rect(8, 22, 16, 1, b);
    // Crown.
    triUp(rect, 13, 7, 1, c); triUp(rect, 16, 6, 1, c); triUp(rect, 19, 7, 1, c);
    rect(13, 8, 7, 1, c);
    // Twin pairs of wings.
    rect(5, 13, 7, 4, lighten(c, 50)); rect(20, 13, 7, 4, lighten(c, 50));
    rect(7, 18, 4, 3, lighten(c, 50)); rect(21, 18, 4, 3, lighten(c, 50));
    // Head.
    ellipse(rect, 16, 12, 5, 3, b);
    set(12, 7, b); set(20, 7, b); set(11, 6, c); set(21, 6, c);
    rect(13, 12, 2, 1, c); rect(17, 12, 2, 1, c);
    rect(15, 14, 3, 1, BLACK);
    // Stinger.
    triDn(rect, 16, 26, 2, b); set(16, 28, c);
  }
  function drawRoyalwasp(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 35);
    // Tall regal wasp.
    ellipse(rect, 16, 19, 8, 7, a);
    ellipse(rect, 16, 19, 6, 5, lighten(a, 10));
    rect(9, 16, 14, 2, b); rect(9, 21, 14, 2, b);
    // Royal crown.
    triUp(rect, 11, 5, 1, c); triUp(rect, 14, 4, 1, c);
    triUp(rect, 16, 3, 2, c); triUp(rect, 18, 4, 1, c); triUp(rect, 21, 5, 1, c);
    rect(11, 6, 11, 1, c);
    // Massive wings (iridescent).
    rect(2, 12, 8, 5, lighten(c, 50)); rect(22, 12, 8, 5, lighten(c, 50));
    rect(4, 18, 6, 3, lighten(c, 35)); rect(22, 18, 6, 3, lighten(c, 35));
    // Head.
    ellipse(rect, 16, 11, 5, 3, b);
    set(11, 7, b); set(21, 7, b); set(10, 6, c); set(22, 6, c);
    rect(13, 11, 2, 1, c); rect(17, 11, 2, 1, c);
    rect(15, 13, 3, 1, BLACK);
    // Long stinger.
    rect(15, 25, 2, 3, b); triDn(rect, 16, 28, 1, c);
  }

  // ---- FLYING 2nd: galewing -> tempestir & solarwing -> solarcrest ------
  function drawGalewing(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 30);
    // Sleek bird body.
    ellipse(rect, 16, 19, 7, 5, a);
    ellipse(rect, 16, 19, 5, 3, lighten(a, 12));
    // Streamlined head.
    ellipse(rect, 16, 12, 5, 4, a);
    eyes(set, 13, 12, 18, 12, WHITE, BLACK, SHINE);
    rect(15, 14, 3, 1, '#f0c020');
    rect(16, 15, 1, 1, sh);
    // Long swept wings.
    triLeft(rect, 1, 18, 6, b); triRight(rect, 31, 18, 6, b);
    rect(2, 20, 5, 1, sh); rect(25, 20, 5, 1, sh);
    rect(3, 16, 2, 1, c); rect(27, 16, 2, 1, c);
    // Forked tail.
    rect(13, 24, 2, 3, b); rect(17, 24, 2, 3, b);
    rect(13, 26, 1, 2, sh); rect(18, 26, 1, 2, sh);
    rect(13, 23, 1, 2, sh); rect(18, 23, 1, 2, sh);
  }
  function drawTempestir(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 35);
    ellipse(rect, 16, 19, 8, 6, a);
    ellipse(rect, 16, 19, 6, 4, lighten(a, 10));
    // Storm-cloud crest.
    rect(13, 5, 7, 3, sh);
    rect(11, 7, 11, 2, lighten(sh, 18));
    set(14, 4, c); set(18, 4, c);                     // lightning sparks
    // Head (under cloud).
    ellipse(rect, 16, 12, 5, 3, a);
    eyes(set, 13, 12, 18, 12, WHITE, BLACK, SHINE);
    rect(15, 14, 3, 1, '#f0c020');
    // Wings sweeping.
    triLeft(rect, 0, 19, 7, b); triRight(rect, 32, 19, 7, b);
    rect(1, 22, 6, 1, sh); rect(25, 22, 6, 1, sh);
    rect(2, 16, 3, 1, c); rect(27, 16, 3, 1, c);
    // Tail.
    rect(12, 25, 3, 3, b); rect(17, 25, 3, 3, b);
    rect(13, 27, 1, 1, c); rect(18, 27, 1, 1, c);
  }
  function drawSolarwing(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 35);
    ellipse(rect, 16, 19, 7, 5, a);
    ellipse(rect, 16, 19, 5, 3, lighten(a, 15));
    // Bright crest feathers.
    rect(14, 5, 4, 4, b); rect(15, 3, 2, 3, '#fff080');
    // Head.
    ellipse(rect, 16, 12, 5, 4, a);
    eyes(set, 13, 12, 18, 12, WHITE, BLACK, SHINE);
    rect(15, 14, 3, 1, '#f0c020');
    rect(16, 15, 1, 1, sh);
    // Spread wings with flame underside (signature: fire/flying).
    triLeft(rect, 2, 18, 6, b); triRight(rect, 30, 18, 6, b);
    rect(3, 21, 5, 1, '#ff8020'); rect(25, 21, 5, 1, '#ff8020');
    rect(4, 19, 4, 1, '#ffd060'); rect(26, 19, 4, 1, '#ffd060');
    // Tail flames.
    rect(13, 25, 2, 3, '#ff8020'); rect(17, 25, 2, 3, '#ff8020');
    set(14, 27, '#fff080'); set(18, 27, '#fff080');
  }
  function drawSolarcrest(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 35);
    ellipse(rect, 16, 19, 8, 6, a);
    ellipse(rect, 16, 19, 6, 4, lighten(a, 12));
    // Halo crest (signature: sunbeam king).
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const hx = 16 + Math.round(Math.cos(ang) * 6);
      const hy = 5 + Math.round(Math.sin(ang) * 3);
      set(hx, hy, '#fff080');
    }
    rect(11, 4, 11, 1, '#ffd060');
    rect(13, 6, 7, 2, b);
    rect(15, 3, 2, 2, '#fff8e8');
    // Head.
    ellipse(rect, 16, 12, 6, 4, a);
    rect(12, 12, 2, 2, BLACK); rect(18, 12, 2, 2, BLACK);
    set(13, 12, '#fff080'); set(19, 12, '#fff080');
    rect(14, 14, 4, 1, '#a05010');
    rect(15, 15, 2, 1, sh);
    // Massive wings.
    triLeft(rect, 0, 18, 7, b); triRight(rect, 32, 18, 7, b);
    rect(1, 21, 6, 2, '#ff7020'); rect(25, 21, 6, 2, '#ff7020');
    rect(2, 19, 4, 1, '#ffd060'); rect(26, 19, 4, 1, '#ffd060');
    // Tail with three plumes.
    rect(13, 25, 2, 3, '#ff7020'); rect(17, 25, 2, 3, '#ff7020');
    rect(15, 25, 2, 4, '#ffd060');
  }

  // ---- ICE: frostpup -> snowox -> glacioxen, and frostnip ---------------
  function drawFrostpup(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 25);
    ellipse(rect, 16, 21, 7, 5, a);
    ellipse(rect, 16, 21, 5, 3, lighten(a, 8));
    rect(11, 25, 2, 2, sh); rect(19, 25, 2, 2, sh);
    rect(13, 26, 2, 2, sh); rect(17, 26, 2, 2, sh);
    // Head with floppy ears.
    ellipse(rect, 16, 13, 6, 5, a);
    rect(9, 11, 4, 5, lighten(a, 5)); rect(19, 11, 4, 5, lighten(a, 5));
    eyes(set, 13, 13, 18, 13, '#80c8f8', BLACK, SHINE);
    blush(set, 11, 20, 16, c);
    rect(15, 16, 3, 1, sh);
    // Snowflake spots.
    set(8, 19, '#fff'); set(24, 19, '#fff');
    set(13, 23, '#fff'); set(18, 23, '#fff');
    // Curling icy tail.
    rect(22, 19, 2, 2, lighten(a, 10)); set(24, 18, '#fff');
  }
  function drawSnowox(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 30);
    // Sturdy ox body.
    ellipse(rect, 16, 21, 11, 6, a);
    ellipse(rect, 16, 21, 9, 4, lighten(a, 8));
    rect(8, 26, 3, 2, sh); rect(13, 27, 2, 1, sh);
    rect(17, 27, 2, 1, sh); rect(21, 26, 3, 2, sh);
    // Head.
    ellipse(rect, 16, 12, 6, 4, a);
    triUp(rect, 9, 8, 3, '#e0e8f0'); triUp(rect, 23, 8, 3, '#e0e8f0'); // ice horns
    set(9, 6, c); set(23, 6, c);
    rect(12, 12, 2, 2, BLACK); rect(18, 12, 2, 2, BLACK);
    set(13, 12, SHINE); set(19, 12, SHINE);
    rect(14, 15, 4, 1, sh);
    // Snow drift on back.
    rect(11, 17, 10, 2, '#fff'); set(13, 16, '#fff'); set(19, 16, '#fff');
    // Ring on tail.
    rect(25, 19, 2, 1, b); set(27, 19, '#fff');
  }
  function drawGlacioxen(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 35);
    // Massive glacier ox.
    ellipse(rect, 16, 21, 13, 7, a);
    ellipse(rect, 16, 21, 11, 5, lighten(a, 8));
    rect(7, 27, 4, 1, sh); rect(13, 27, 2, 1, sh);
    rect(17, 27, 2, 1, sh); rect(21, 27, 4, 1, sh);
    // Towering head.
    ellipse(rect, 16, 11, 7, 5, a);
    triUp(rect, 8, 5, 4, '#e0e8f0'); triUp(rect, 24, 5, 4, '#e0e8f0');
    set(8, 2, c); set(24, 2, c);
    rect(11, 11, 2, 2, c); rect(19, 11, 2, 2, c);    // glow eyes
    set(12, 11, SHINE); set(20, 11, SHINE);
    rect(13, 14, 6, 1, BLACK);
    rect(13, 15, 1, 1, WHITE); rect(18, 15, 1, 1, WHITE);
    // Glacier slabs on back.
    rect(8, 16, 16, 2, '#fff');
    rect(10, 14, 4, 2, '#e0e8f0');
    rect(18, 14, 4, 2, '#e0e8f0');
    // Frosty breath.
    set(2, 13, '#fff'); set(4, 12, '#fff');
  }
  function drawFrostnip(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 25);
    // Tiny snow puff with face.
    disc(rect, 16, 18, 7, a);
    disc(rect, 16, 17, 5, lighten(a, 8));
    rect(11, 24, 2, 2, sh); rect(19, 24, 2, 2, sh);
    eyes(set, 13, 17, 18, 17, '#80c8f8', BLACK, SHINE);
    blush(set, 11, 20, 19, c);
    rect(15, 20, 3, 1, sh);
    // Snowflake on top.
    set(16, 8, '#fff'); set(15, 9, '#fff'); set(17, 9, '#fff');
    rect(13, 11, 7, 1, '#fff');
    set(16, 12, '#fff'); set(15, 13, '#fff'); set(17, 13, '#fff');
    // Drift wisps.
    set(7, 14, '#fff'); set(25, 14, '#fff');
  }

  // ---- ROCK 2nd: crysthorn -> prismage, craglet, rivetbolt --------------
  function drawCrysthorn(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 30);
    // Geode body.
    ellipse(rect, 16, 21, 9, 6, sh);
    ellipse(rect, 16, 21, 7, 4, a);
    // Crystal shards inside.
    triUp(rect, 13, 18, 2, c); triUp(rect, 19, 18, 2, c);
    triUp(rect, 16, 15, 3, lighten(c, 25));
    set(16, 12, '#fff');
    // Eyes embedded.
    rect(11, 22, 2, 1, BLACK); rect(19, 22, 2, 1, BLACK);
    set(12, 22, SHINE); set(20, 22, SHINE);
    // Stubby legs.
    rect(10, 26, 3, 2, sh); rect(19, 26, 3, 2, sh);
    // Floating shards (psychic).
    set(5, 15, c); set(27, 15, c);
    set(6, 17, lighten(c, 25)); set(26, 17, lighten(c, 25));
  }
  function drawPrismage(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 35);
    // Tall crystalline sage.
    diamond(rect, 16, 19, 9, sh);
    diamond(rect, 16, 19, 7, a);
    diamond(rect, 16, 19, 5, lighten(a, 12));
    // Refracted light bands.
    rect(11, 17, 11, 1, '#fff'); rect(11, 21, 11, 1, '#fff');
    // Eyes glowing.
    rect(12, 19, 2, 2, c); rect(18, 19, 2, 2, c);
    set(13, 19, SHINE); set(19, 19, SHINE);
    rect(14, 22, 4, 1, BLACK);
    // Floating prism halo.
    triUp(rect, 12, 9, 1, lighten(c, 25));
    triUp(rect, 16, 7, 1, lighten(c, 25));
    triUp(rect, 20, 9, 1, lighten(c, 25));
    set(8, 14, c); set(24, 14, c);
    set(6, 18, c); set(26, 18, c);
  }
  function drawCraglet(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 30);
    // Stubborn shard.
    triUp(rect, 16, 22, 8, a);
    triUp(rect, 16, 20, 6, lighten(a, 12));
    rect(8, 23, 16, 4, a);
    rect(7, 26, 4, 2, sh); rect(21, 26, 4, 2, sh);
    eyes(set, 12, 24, 19, 24, WHITE, BLACK, SHINE);
    rect(15, 26, 3, 1, BLACK);
    // Top glint.
    set(16, 14, '#fff'); set(15, 15, c); set(17, 15, c);
  }
  function drawRivetbolt(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 35);
    // Boulder-bot body.
    rect(7, 14, 18, 14, a);
    rect(6, 15, 1, 12, sh); rect(25, 15, 1, 12, sh);
    rect(7, 14, 18, 1, lighten(a, 12));
    rect(7, 27, 18, 1, sh);
    // Rivets at corners.
    set(8, 15, '#fff'); set(23, 15, '#fff');
    set(8, 26, '#fff'); set(23, 26, '#fff');
    // Bolted plates.
    rect(10, 18, 5, 4, sh); rect(17, 18, 5, 4, sh);
    set(11, 19, '#fff'); set(13, 19, '#fff');
    set(18, 19, '#fff'); set(20, 19, '#fff');
    // Glowing eye slot.
    rect(12, 23, 8, 1, c);
    rect(13, 23, 2, 1, '#fff'); rect(17, 23, 2, 1, '#fff');
  }

  // ---- DARK / GHOST: geistmite -> shadefox -> umbrasire + wraithlet -----
  function drawGeistmite(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 40);
    // Wisp head.
    ellipse(rect, 16, 14, 6, 5, a);
    ellipse(rect, 16, 13, 5, 3, lighten(a, 12));
    // Trailing tendril (signature: shadow).
    rect(15, 19, 2, 4, a); rect(14, 22, 4, 2, a);
    rect(13, 24, 6, 2, sh);
    set(11, 26, sh); set(13, 27, sh); set(19, 27, sh); set(21, 26, sh);
    // Single bright eye glow.
    rect(13, 13, 2, 2, c); rect(17, 13, 2, 2, c);
    set(13, 13, SHINE); set(17, 13, SHINE);
    rect(14, 16, 4, 1, c);
    // Floating wisps.
    set(8, 12, c); set(24, 12, c);
  }
  function drawShadefox(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 30);
    // Black fox silhouette.
    ellipse(rect, 16, 21, 9, 6, a);
    ellipse(rect, 16, 21, 7, 4, sh);
    rect(10, 26, 2, 2, sh); rect(13, 27, 2, 1, sh);
    rect(17, 27, 2, 1, sh); rect(20, 26, 2, 2, sh);
    // Head.
    ellipse(rect, 16, 12, 6, 5, a);
    triUp(rect, 10, 7, 3, a); triUp(rect, 22, 7, 3, a);
    rect(12, 12, 2, 2, c); rect(18, 12, 2, 2, c);     // glowing red eyes
    set(13, 12, SHINE); set(19, 12, SHINE);
    rect(14, 15, 4, 1, BLACK);
    fang(rect, 14, 16, '#fff'); fang(rect, 17, 16, '#fff');
    // Tail.
    rect(23, 19, 2, 2, a); rect(25, 18, 2, 3, sh);
  }
  function drawUmbrasire(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 30);
    // Towering dark wolf.
    ellipse(rect, 16, 21, 11, 7, sh);
    ellipse(rect, 16, 21, 9, 5, a);
    rect(7, 27, 4, 1, sh); rect(13, 27, 2, 1, sh);
    rect(17, 27, 2, 1, sh); rect(21, 27, 4, 1, sh);
    // Head + crown of darkness.
    ellipse(rect, 16, 11, 7, 5, sh);
    triUp(rect, 9, 5, 3, sh); triUp(rect, 23, 5, 3, sh);
    triUp(rect, 16, 4, 2, c);
    // Eyes glow.
    rect(12, 11, 2, 2, c); rect(18, 11, 2, 2, c);
    set(13, 11, SHINE); set(19, 11, SHINE);
    rect(13, 14, 6, 1, BLACK);
    fang(rect, 13, 15, '#fff'); fang(rect, 18, 15, '#fff');
    // Aura wisps around body.
    set(3, 18, sh); set(28, 18, sh);
    set(5, 22, sh); set(26, 22, sh);
    // Tail.
    rect(24, 18, 2, 3, a); rect(26, 16, 1, 4, sh);
  }
  function drawWraithlet(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 30);
    // Floating ghost head.
    ellipse(rect, 16, 13, 6, 5, a);
    ellipse(rect, 16, 13, 4, 3, lighten(a, 18));
    // Tattered trailing body.
    rect(11, 18, 11, 4, a);
    triDn(rect, 12, 22, 1, a); triDn(rect, 16, 22, 1, a); triDn(rect, 20, 22, 1, a);
    set(11, 24, sh); set(15, 24, sh); set(19, 24, sh); set(23, 24, sh);
    // Glowing eyes (signature: ghost).
    rect(12, 12, 2, 2, c); rect(18, 12, 2, 2, c);
    set(13, 12, SHINE); set(19, 12, SHINE);
    set(15, 15, sh); set(17, 15, sh);
    // Spook wisps above.
    set(13, 7, c); set(19, 7, c);
  }

  // ---- PSYCHIC/FAIRY/GRASS: dreamilly -> reverieus, mindrop, dewfae -----
  function drawDreamilly(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 25);
    // Soft fairy lily.
    ellipse(rect, 16, 22, 7, 5, lighten(a, 18));
    rect(11, 26, 2, 2, sh); rect(19, 26, 2, 2, sh);
    eyes(set, 13, 22, 18, 22, '#fff', '#a04878', SHINE);
    rect(15, 24, 3, 1, c);
    // Petal frills around face.
    triUp(rect, 10, 16, 2, lighten(a, 25));
    triUp(rect, 13, 14, 2, lighten(a, 30));
    triUp(rect, 16, 13, 2, lighten(a, 35));
    triUp(rect, 19, 14, 2, lighten(a, 30));
    triUp(rect, 22, 16, 2, lighten(a, 25));
    set(16, 10, c);                                    // bud tip
    // Stem.
    rect(15, 17, 2, 4, sh);
  }
  function drawReverieus(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 25);
    ellipse(rect, 16, 21, 9, 7, lighten(a, 12));
    rect(10, 26, 3, 2, sh); rect(19, 26, 3, 2, sh);
    eyes(set, 12, 21, 19, 21, '#fff', '#702848', SHINE);
    rect(14, 23, 4, 1, c);
    // Crown of layered petals.
    rect(11, 9, 10, 2, lighten(a, 25));
    rect(13, 7, 6, 2, lighten(a, 30));
    rect(15, 5, 2, 2, lighten(a, 40));
    triUp(rect, 8, 13, 2, lighten(a, 22));
    triUp(rect, 24, 13, 2, lighten(a, 22));
    set(16, 3, c);
    // Stem.
    rect(15, 14, 2, 5, sh);
    // Floating dream sparks.
    set(5, 18, c); set(27, 18, c); set(8, 24, c); set(24, 24, c);
  }
  function drawMindrop(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 25);
    // Floating teardrop.
    triUp(rect, 16, 14, 4, a);
    rect(12, 14, 9, 8, a);
    triDn(rect, 16, 22, 4, a);
    // Inner shine.
    rect(13, 15, 7, 6, lighten(a, 18));
    set(15, 16, '#fff'); set(15, 17, '#fff');
    // Eyes (closed/dreaming).
    rect(13, 18, 2, 1, c); rect(17, 18, 2, 1, c);
    set(15, 20, c);                                    // tiny smile
    // Aura sparks.
    set(7, 13, c); set(25, 13, c);
    set(6, 22, c); set(26, 22, c);
    set(16, 9, lighten(c, 20));
  }
  function drawDewfae(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 25);
    // Misty fairy.
    disc(rect, 16, 16, 6, lighten(a, 12));
    disc(rect, 16, 16, 4, lighten(a, 25));
    eyes(set, 13, 16, 18, 16, '#fff', c, SHINE);
    rect(15, 18, 3, 1, c);
    // Wings (rounded).
    disc(rect, 8, 14, 3, '#fff8ff');
    disc(rect, 24, 14, 3, '#fff8ff');
    set(7, 14, c); set(25, 14, c);
    // Trailing dewdrops.
    set(13, 24, c); set(19, 24, c);
    set(11, 26, lighten(a, 20)); set(21, 26, lighten(a, 20));
    set(16, 27, lighten(a, 20));
  }

  // ---- STEEL: rivettot ---------------------------------------------------
  function drawRivettot(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 30);
    // Tinker robot body.
    rect(11, 15, 10, 12, a);
    rect(11, 15, 10, 1, lighten(a, 15));
    rect(11, 26, 10, 1, sh);
    rect(10, 17, 1, 8, sh); rect(21, 17, 1, 8, sh);
    // Rivets.
    set(12, 16, '#fff'); set(20, 16, '#fff');
    set(12, 25, '#fff'); set(20, 25, '#fff');
    // Visor face.
    rect(13, 18, 6, 2, BLACK);
    rect(14, 18, 1, 2, '#80f0ff'); rect(17, 18, 1, 2, '#80f0ff');
    // Antenna.
    rect(15, 12, 2, 3, sh); set(16, 11, c);
    // Arms (mechanical).
    rect(8, 18, 3, 2, sh); rect(21, 18, 3, 2, sh);
    rect(8, 20, 2, 2, b); rect(22, 20, 2, 2, b);
    // Legs.
    rect(12, 27, 3, 1, sh); rect(17, 27, 3, 1, sh);
  }

  // ---- FIGHTING: pugpaw, clawmonk ---------------------------------------
  function drawPugpaw(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 30);
    // Squat boxer body.
    ellipse(rect, 16, 21, 8, 5, a);
    ellipse(rect, 16, 21, 6, 3, lighten(a, 12));
    rect(9, 25, 3, 3, sh); rect(20, 25, 3, 3, sh);   // big paws
    // Head.
    ellipse(rect, 16, 13, 6, 5, a);
    rect(8, 12, 4, 4, sh); rect(20, 12, 4, 4, sh);   // floppy ears
    eyes(set, 13, 13, 18, 13, WHITE, BLACK, SHINE);
    rect(14, 16, 4, 1, BLACK);
    set(15, 17, '#f0c0a0'); set(17, 17, '#f0c0a0');  // tongue/jowls
    // Boxing wraps on paws.
    rect(9, 25, 3, 1, b); rect(20, 25, 3, 1, b);
    set(10, 27, '#fff'); set(21, 27, '#fff');
  }
  function drawClawmonk(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 30);
    // Tall martial body.
    ellipse(rect, 16, 19, 7, 7, a);
    ellipse(rect, 16, 19, 5, 5, lighten(a, 12));
    rect(11, 25, 3, 3, sh); rect(18, 25, 3, 3, sh);
    // Head with topknot.
    ellipse(rect, 16, 11, 5, 4, a);
    rect(15, 5, 2, 4, sh); set(16, 4, b);             // topknot
    eyes(set, 13, 11, 18, 11, WHITE, BLACK, SHINE);
    rect(15, 13, 3, 1, BLACK);
    // Sash + claws (signature: martial student).
    rect(11, 17, 11, 1, b); set(11, 18, c); set(21, 18, c);
    rect(8, 18, 3, 2, sh); rect(21, 18, 3, 2, sh);   // arms
    set(8, 20, '#fff'); set(9, 20, '#fff');           // claws
    set(22, 20, '#fff'); set(23, 20, '#fff');
  }

  // ---- BUG/GROUND fillers ------------------------------------------------
  function drawSilkuttle(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 30);
    // Silkworm body.
    ellipse(rect, 9,  20, 4, 4, a);
    ellipse(rect, 16, 21, 5, 4, a);
    ellipse(rect, 23, 20, 4, 4, a);
    // Silk strands.
    set(13, 24, '#fff'); set(20, 24, '#fff');
    set(11, 26, '#fff'); set(22, 26, '#fff');
    rect(8, 18, 17, 1, lighten(a, 12));
    set(13, 22, c); set(20, 22, c);
    // Head.
    ellipse(rect, 5, 19, 4, 3, a);
    eyes(set, 4, 19, 7, 19, WHITE, BLACK, SHINE);
    rect(4, 21, 3, 1, BLACK);
    // Antennae.
    rect(4, 16, 1, 3, sh); set(3, 15, c);
    rect(7, 16, 1, 3, sh); set(8, 15, c);
  }
  function drawMantilux(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 30);
    // Glowing mantis.
    ellipse(rect, 16, 21, 6, 6, a);
    ellipse(rect, 16, 21, 4, 4, lighten(a, 18));
    rect(13, 26, 2, 2, sh); rect(17, 26, 2, 2, sh);
    // Glow bands (signature: lantern).
    rect(11, 18, 11, 1, c);
    rect(11, 22, 11, 1, c);
    // Head.
    ellipse(rect, 16, 12, 4, 3, a);
    rect(13, 12, 2, 2, c); rect(17, 12, 2, 2, c);
    set(14, 12, SHINE); set(18, 12, SHINE);
    rect(15, 14, 3, 1, sh);
    // Antennae.
    rect(13, 8, 1, 3, sh); set(12, 7, c);
    rect(18, 8, 1, 3, sh); set(19, 7, c);
    // Sickle arms.
    rect(8, 17, 3, 2, sh); rect(21, 17, 3, 2, sh);
    triDn(rect, 7, 19, 2, c); triDn(rect, 24, 19, 2, c);
  }
  function drawVenipip(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 30);
    // Tiny vial body.
    rect(13, 14, 6, 12, a);
    rect(12, 16, 1, 8, sh); rect(19, 16, 1, 8, sh);
    rect(13, 14, 6, 1, lighten(a, 15));
    rect(13, 25, 6, 1, sh);
    // Cork top.
    rect(14, 11, 4, 3, sh);
    set(15, 10, c); set(17, 10, c);
    // Liquid level.
    rect(13, 18, 6, 7, lighten(a, 15));
    rect(13, 22, 6, 1, lighten(c, 20));
    // Eyes/face on vial.
    eyes(set, 14, 19, 17, 19, WHITE, BLACK, SHINE);
    rect(15, 21, 3, 1, BLACK);
    // Tiny wings.
    triLeft(rect, 9, 18, 3, lighten(c, 35));
    triRight(rect, 23, 18, 3, lighten(c, 35));
    // Splash drops.
    set(11, 27, c); set(20, 27, c);
  }
  function drawMudmote(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 30);
    // Clump-of-soil body.
    ellipse(rect, 16, 22, 9, 5, a);
    ellipse(rect, 16, 21, 7, 4, lighten(a, 12));
    rect(11, 26, 2, 2, sh); rect(19, 26, 2, 2, sh);
    eyes(set, 13, 21, 19, 21, WHITE, BLACK, SHINE);
    rect(15, 23, 3, 1, sh);
    // Sprout on top.
    rect(15, 14, 2, 4, sh);
    triUp(rect, 13, 13, 2, lighten(c, 20));
    triUp(rect, 19, 13, 2, lighten(c, 20));
    set(16, 11, c);
    // Pebbles around base.
    set(7, 25, sh); set(25, 25, sh);
    set(9, 27, c); set(23, 27, c);
  }
  function drawClodlet(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 30);
    // Tiny mole-with-shovel-shell.
    ellipse(rect, 16, 20, 9, 6, a);
    ellipse(rect, 16, 19, 7, 4, lighten(a, 15));
    rect(8, 24, 4, 3, sh); rect(20, 24, 4, 3, sh);
    // Shovel-shell top.
    triUp(rect, 16, 13, 4, sh);
    rect(13, 13, 7, 2, lighten(sh, 12));
    set(13, 12, c); set(19, 12, c);
    // Head pokes out.
    ellipse(rect, 16, 18, 4, 3, a);
    eyes(set, 13, 18, 18, 18, WHITE, BLACK, SHINE);
    rect(15, 20, 3, 1, BLACK);
    // Claws.
    rect(7, 24, 1, 1, '#fff'); rect(24, 24, 1, 1, '#fff');
  }
  function drawBudling(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 25);
    // Sparrow + flower.
    ellipse(rect, 16, 19, 6, 5, a);
    ellipse(rect, 16, 20, 5, 3, lighten(a, 12));
    // Head.
    ellipse(rect, 16, 12, 5, 4, a);
    eyes(set, 13, 12, 18, 12, WHITE, BLACK, SHINE);
    rect(15, 14, 3, 1, '#f0c020');
    // Petal crown.
    set(13, 8, c); set(15, 6, c); set(16, 5, c); set(17, 6, c); set(19, 8, c);
    set(14, 7, lighten(c, 20)); set(18, 7, lighten(c, 20));
    // Wings.
    triLeft(rect, 5, 18, 4, b); triRight(rect, 27, 18, 4, b);
    rect(6, 19, 3, 1, sh); rect(24, 19, 3, 1, sh);
    // Tail w/ leaf.
    rect(14, 23, 4, 2, b); set(15, 25, sh); set(17, 25, sh);
    // Feet.
    rect(13, 24, 1, 2, '#a07810'); rect(18, 24, 1, 2, '#a07810');
  }

  // ---- MISC: joltlet, breezlet, miasmite, frostbloom, draekit -----------
  function drawJoltlet(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 30);
    // Tiny kitten of sparks.
    ellipse(rect, 16, 21, 6, 5, a);
    ellipse(rect, 16, 21, 4, 3, lighten(a, 15));
    rect(11, 25, 2, 2, sh); rect(19, 25, 2, 2, sh);
    // Head with bolt ears.
    ellipse(rect, 16, 14, 5, 4, a);
    rect(11, 7, 2, 5, c); rect(19, 7, 2, 5, c);
    set(11, 6, lighten(c, 20)); set(20, 6, lighten(c, 20));
    eyes(set, 13, 14, 18, 14, WHITE, BLACK, SHINE);
    blush(set, 11, 20, 16, c);
    rect(15, 16, 3, 1, BLACK);
    // Lightning bolt tail.
    rect(22, 20, 2, 2, c); rect(24, 19, 2, 1, c); rect(23, 22, 2, 2, c);
  }
  function drawBreezlet(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 25);
    // Small bird with cloud-like fluff.
    ellipse(rect, 16, 19, 5, 4, a);
    ellipse(rect, 16, 19, 4, 3, lighten(a, 18));
    // Cloudy crest.
    disc(rect, 13, 11, 2, '#fff');
    disc(rect, 16, 9, 2, '#fff');
    disc(rect, 19, 11, 2, '#fff');
    // Head.
    ellipse(rect, 16, 14, 4, 3, a);
    eyes(set, 14, 14, 17, 14, WHITE, BLACK, SHINE);
    rect(15, 16, 2, 1, '#f0c020');
    // Flutter wings.
    triLeft(rect, 8, 18, 3, lighten(a, 18));
    triRight(rect, 24, 18, 3, lighten(a, 18));
    // Tail.
    rect(14, 23, 4, 2, b);
    // Feet.
    rect(14, 25, 1, 2, sh); rect(17, 25, 1, 2, sh);
  }
  function drawMiasmite(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 30);
    // Smog fish silhouette.
    ellipse(rect, 14, 19, 8, 5, a);
    ellipse(rect, 14, 19, 6, 3, lighten(a, 15));
    // Trailing fin / smog wisps.
    rect(20, 16, 4, 2, lighten(c, 20));
    rect(22, 19, 5, 2, lighten(c, 20));
    rect(20, 22, 4, 2, lighten(c, 20));
    triRight(rect, 28, 19, 3, c);
    // Eye.
    rect(11, 18, 2, 2, c); set(12, 18, SHINE); set(11, 19, BLACK);
    rect(8, 21, 4, 1, BLACK);
    // Smog above.
    set(7, 11, c); set(9, 9, c); set(11, 12, lighten(c, 25));
    set(15, 8, lighten(c, 25));
  }
  function drawFrostbloom(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 25);
    // Icy bloom plant.
    ellipse(rect, 16, 22, 7, 4, lighten(a, 5));
    rect(11, 25, 2, 2, sh); rect(19, 25, 2, 2, sh);
    eyes(set, 13, 22, 18, 22, c, BLACK, SHINE);
    rect(15, 24, 3, 1, c);
    // Snowflake bloom on head.
    rect(15, 13, 2, 7, sh);                            // stem
    set(16, 9, '#fff'); set(15, 10, '#fff'); set(17, 10, '#fff');
    rect(13, 12, 7, 1, '#fff');
    set(14, 11, c); set(18, 11, c);
    set(15, 13, c); set(17, 13, c);
    triUp(rect, 16, 8, 2, '#fff');
    // Side icicle leaves.
    triDn(rect, 9, 17, 3, '#fff');
    triDn(rect, 23, 17, 3, '#fff');
  }
  function drawDraekit(set, rect, d) {
    const [a, b, c] = d.palette;
    const sh = darken(a, 30);
    // Small wyrm body.
    ellipse(rect, 16, 21, 8, 6, a);
    ellipse(rect, 16, 21, 6, 4, lighten(a, 12));
    rect(10, 26, 2, 2, sh); rect(20, 26, 2, 2, sh);
    rect(13, 27, 2, 1, sh); rect(17, 27, 2, 1, sh);
    // Spine ridge.
    triUp(rect, 13, 16, 1, sh); triUp(rect, 16, 15, 1, sh); triUp(rect, 19, 16, 1, sh);
    // Head with horn.
    ellipse(rect, 16, 13, 5, 4, a);
    triUp(rect, 13, 7, 1, sh); triUp(rect, 19, 7, 1, sh);
    eyes(set, 13, 13, 18, 13, WHITE, c, SHINE);
    rect(14, 15, 4, 1, BLACK);
    fang(rect, 14, 16, '#fff'); fang(rect, 17, 16, '#fff');
    // Tiny wings (signature: dragon).
    triLeft(rect, 6, 18, 3, lighten(a, 18));
    triRight(rect, 26, 18, 3, lighten(a, 18));
    // Curling tail.
    rect(23, 19, 2, 2, a); rect(25, 18, 2, 2, a); set(27, 17, sh);
  }

  // ---- Fallback (should never trigger if SPECIES is complete) ------------
  function drawFallback(set, rect, d) {
    const [a, b, c] = d.palette;
    ellipse(rect, 16, 19, 8, 7, a);
    ellipse(rect, 16, 19, 6, 5, b);
    eyes(set, 13, 18, 18, 18, WHITE, BLACK, SHINE);
    rect(15, 21, 3, 1, BLACK);
    set(13, 12, c); set(19, 12, c);
  }

  // ---- DISPATCH ----------------------------------------------------------

  const SPECIES = {
    // FIRE line.
    emberkit:    drawEmberkit,
    flarebound:  drawFlarebound,
    infernarok:  drawInfernarok,
    cinderpup:   drawCinderpup,
    pyrohound:   drawPyrohound,
    magmaron:    drawMagmaron,
    solarwing:   drawSolarwing,
    solarcrest:  drawSolarcrest,
    // WATER.
    aquapup:     drawAquapup,
    tideturtle:  drawTideturtle,
    maelstroth:  drawMaelstroth,
    splashfin:   drawSplashfin,
    levifin:     drawLevifin,
    mistfin:     drawMistfin,
    tidalwhal:   drawTidalwhal,
    glacierock:  drawGlacierock,
    // GRASS.
    sproutling:  drawSproutling,
    leafurge:    drawLeafurge,
    verdantsage: drawVerdantsage,
    fernsprout:  drawFernsprout,
    bramblewood: drawBramblewood,
    thornedred:  drawThornedred,
    frostbloom:  drawFrostbloom,
    dreamilly:   drawDreamilly,
    reverieus:   drawReverieus,
    budling:     drawBudling,
    // ELECTRIC.
    zapret:      drawZapret,
    boltbeard:   drawBoltbeard,
    voltkit:     drawVoltkit,
    voltlynx:    drawVoltlynx,
    stormfangis: drawStormfangis,
    joltlet:     drawJoltlet,
    // ROCK / GROUND.
    pebra:       drawPebra,
    boulderon:   drawBoulderon,
    stoneworm:   drawStoneworm,
    quakeworm:   drawQuakeworm,
    tectonarch:  drawTectonarch,
    craglet:     drawCraglet,
    crysthorn:   drawCrysthorn,
    prismage:    drawPrismage,
    rivetbolt:   drawRivetbolt,
    mudmote:     drawMudmote,
    clodlet:     drawClodlet,
    // FLYING.
    flitwing:    drawFlitwing,
    skylordan:   drawSkylordan,
    galewing:    drawGalewing,
    tempestir:   drawTempestir,
    breezlet:    drawBreezlet,
    // BUG.
    crawlbug:    drawCrawlbug,
    mothmane:    drawMothmane,
    bumblesting: drawBumblesting,
    hivequeen:   drawHivequeen,
    royalwasp:   drawRoyalwasp,
    silkuttle:   drawSilkuttle,
    mantilux:    drawMantilux,
    // POISON.
    cavewing:    drawCavewing,
    vampirothy:  drawVampirothy,
    venipip:     drawVenipip,
    miasmite:    drawMiasmite,
    // NORMAL/DARK.
    nibblet:     drawNibblet,
    whiskaroth:  drawWhiskaroth,
    glimkit:     drawGlimkit,
    lustrofox:   drawLustrofox,
    geistmite:   drawGeistmite,
    shadefox:    drawShadefox,
    umbrasire:   drawUmbrasire,
    wraithlet:   drawWraithlet,
    // ICE.
    frostpup:    drawFrostpup,
    snowox:      drawSnowox,
    glacioxen:   drawGlacioxen,
    frostnip:    drawFrostnip,
    // FIGHTING.
    pugpaw:      drawPugpaw,
    clawmonk:    drawClawmonk,
    // PSYCHIC/FAIRY.
    mindrop:     drawMindrop,
    dewfae:      drawDewfae,
    // STEEL/DRAGON.
    rivettot:    drawRivettot,
    draekit:     drawDraekit
  };

  window.PR_MONS = { drawCreature };
})();
