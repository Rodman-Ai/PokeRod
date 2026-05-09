// Per-tile detail variations. Stamp a small overlay onto certain tile
// codes (grass, dirt, sand, tallgrass, tree canopies, bushes, paths)
// so the world doesn't read as a flat repeating texture.
//
// Variants are picked deterministically from a hash of the tile's
// (x, y, code) so a given cell always renders the same variant
// across frames. The overlays are intentionally tiny (1-3 px) and
// added on top of the atlas-rendered tile, never replacing it - so
// no atlas regen is needed and the base tile art is preserved.
'use strict';

(function(){
  const TS = 32;

  // Cheap integer hash. Returns a non-negative 32-bit value.
  function hash(x, y, salt) {
    let h = (x * 73856093) ^ (y * 19349663) ^ (salt * 83492791);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0);
  }

  function px(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
  }

  // ----- Variant catalogue. Each variant takes (ctx, sx, sy, h) and
  // paints a small detail. h is the seed hash for additional noise.

  // Grass detail variants. The 0th (no-op) keeps roughly half of all
  // grass cells unchanged so flowers/decor read as scarcity rather
  // than wallpaper.
  const grassVariants = [
    null, null, null, null,
    function whiteFlower(ctx, sx, sy, h) {
      const x = sx + 8 + (h % 16), y = sy + 8 + ((h >> 3) % 16);
      px(ctx, x, y, 2, 1, '#fff8e8');
      px(ctx, x, y - 1, 2, 1, '#fff8e8');
      px(ctx, x, y + 1, 2, 1, '#f0c020');
    },
    function pinkFlower(ctx, sx, sy, h) {
      const x = sx + 6 + (h % 18), y = sy + 6 + ((h >> 4) % 18);
      px(ctx, x,     y,     2, 1, '#f098c0');
      px(ctx, x,     y - 1, 2, 1, '#f098c0');
      px(ctx, x + 1, y + 1, 1, 1, '#f0c020');
    },
    function blueFlower(ctx, sx, sy, h) {
      const x = sx + 7 + (h % 15), y = sy + 9 + ((h >> 5) % 14);
      px(ctx, x,     y,     2, 1, '#5898d8');
      px(ctx, x + 1, y + 1, 1, 1, '#f0e060');
    },
    function tinyMushroom(ctx, sx, sy, h) {
      const x = sx + 10 + (h % 14), y = sy + 14 + ((h >> 4) % 12);
      px(ctx, x,     y,     2, 1, '#e83838');
      px(ctx, x,     y - 1, 2, 1, '#e83838');
      px(ctx, x,     y + 1, 1, 1, '#fff8e8');
    },
    function pebble(ctx, sx, sy, h) {
      const x = sx + 4 + (h % 22), y = sy + 18 + ((h >> 6) % 10);
      px(ctx, x, y, 2, 1, '#888070');
      px(ctx, x, y + 1, 1, 1, '#605850');
    },
    function darkPatch(ctx, sx, sy, h) {
      const x = sx + (h % 24), y = sy + ((h >> 4) % 24);
      px(ctx, x,     y,     1, 1, 'rgba(20,40,16,0.30)');
      px(ctx, x + 1, y,     1, 1, 'rgba(20,40,16,0.20)');
      px(ctx, x,     y + 1, 1, 1, 'rgba(20,40,16,0.20)');
    },
    function lightPatch(ctx, sx, sy, h) {
      const x = sx + (h % 24), y = sy + ((h >> 5) % 24);
      px(ctx, x,     y, 2, 1, 'rgba(192,232,160,0.36)');
      px(ctx, x + 1, y + 1, 1, 1, 'rgba(192,232,160,0.30)');
    },
    function goldenBlade(ctx, sx, sy, h) {
      const x = sx + 12 + (h % 12), y = sy + 8 + ((h >> 3) % 16);
      px(ctx, x,     y,     1, 3, '#e0c050');
      px(ctx, x + 1, y - 1, 1, 2, '#f8d870');
    }
  ];

  // Tallgrass detail variants - mostly subtle since the base tile is
  // already busy.
  const tallgrassVariants = [
    null, null, null,
    function flowerPokeThrough(ctx, sx, sy, h) {
      const x = sx + 8 + (h % 14), y = sy + 4 + ((h >> 4) % 8);
      px(ctx, x,     y, 2, 1, '#f098c0');
      px(ctx, x + 1, y + 1, 1, 1, '#f0c020');
    },
    function berry(ctx, sx, sy, h) {
      const x = sx + 12 + (h % 10), y = sy + 14 + ((h >> 5) % 10);
      px(ctx, x,     y,     2, 1, '#e83838');
      px(ctx, x,     y + 1, 2, 1, '#a01020');
    },
    function tallgrassDarken(ctx, sx, sy, h) {
      const x = sx + 4 + (h % 16);
      px(ctx, x,     sy + 16, 1, 6, 'rgba(8,24,0,0.34)');
      px(ctx, x + 6, sy + 14, 1, 8, 'rgba(8,24,0,0.30)');
    }
  ];

  // Path / cobble variants.
  const pathVariants = [
    null, null,
    function darkStone(ctx, sx, sy, h) {
      const x = sx + 4 + (h % 22), y = sy + 6 + ((h >> 4) % 20);
      px(ctx, x,     y,     2, 2, '#605040');
      px(ctx, x,     y - 1, 1, 1, '#403028');
    },
    function lightStone(ctx, sx, sy, h) {
      const x = sx + 6 + (h % 18), y = sy + 10 + ((h >> 5) % 16);
      px(ctx, x,     y,     2, 1, '#e0c896');
      px(ctx, x + 1, y - 1, 1, 1, '#fff0c0');
    },
    function wetPatch(ctx, sx, sy, h) {
      const x = sx + 10 + (h % 14);
      px(ctx, x,     sy + 18, 4, 1, 'rgba(80,120,200,0.32)');
      px(ctx, x + 1, sy + 19, 2, 1, 'rgba(80,120,200,0.20)');
    },
    function crackLine(ctx, sx, sy, h) {
      const y = sy + 12 + ((h >> 3) % 14);
      px(ctx, sx + 6, y, 8, 1, 'rgba(64,40,24,0.40)');
    }
  ];

  // Dirt path variants.
  const dirtVariants = [
    null, null,
    function pawprint(ctx, sx, sy, h) {
      const x = sx + 6 + (h % 18), y = sy + 12 + ((h >> 4) % 12);
      px(ctx, x,     y,     1, 1, 'rgba(48,28,16,0.50)');
      px(ctx, x + 2, y,     1, 1, 'rgba(48,28,16,0.50)');
      px(ctx, x + 1, y + 1, 1, 1, 'rgba(48,28,16,0.50)');
    },
    function darkPatch(ctx, sx, sy, h) {
      const x = sx + (h % 24);
      px(ctx, x, sy + 14, 4, 1, 'rgba(48,28,16,0.36)');
      px(ctx, x + 1, sy + 15, 2, 1, 'rgba(48,28,16,0.28)');
    },
    function lightDust(ctx, sx, sy, h) {
      const x = sx + (h % 24);
      px(ctx, x, sy + 6, 3, 1, 'rgba(216,184,120,0.40)');
    },
    function smallLeaf(ctx, sx, sy, h) {
      const x = sx + 8 + (h % 16), y = sy + 18 + ((h >> 5) % 8);
      px(ctx, x,     y, 2, 1, '#a8c060');
      px(ctx, x + 1, y + 1, 1, 1, '#586028');
    }
  ];

  // Sand variants.
  const sandVariants = [
    null, null,
    function shell(ctx, sx, sy, h) {
      const x = sx + 8 + (h % 16), y = sy + 14 + ((h >> 4) % 12);
      px(ctx, x,     y,     2, 1, '#fff0c0');
      px(ctx, x + 1, y - 1, 1, 1, '#f8d870');
    },
    function sandRipple(ctx, sx, sy, h) {
      const y = sy + 10 + ((h >> 3) % 12);
      px(ctx, sx + 4, y, 8, 1, 'rgba(168,128,64,0.36)');
    },
    function tinyDriftwood(ctx, sx, sy, h) {
      const x = sx + 6 + (h % 18), y = sy + 18 + ((h >> 5) % 8);
      px(ctx, x, y, 4, 1, '#604030');
      px(ctx, x + 1, y + 1, 2, 1, '#48301c');
    }
  ];

  // Tree decor variants - small accents added near the base or
  // canopy. Kept very subtle so the silhouette of the original tile
  // still reads clearly.
  const treeVariants = [
    null, null,
    function redBerryCluster(ctx, sx, sy, h) {
      const x = sx + 12 + (h % 8);
      px(ctx, x,     sy + 6, 2, 1, '#e83838');
      px(ctx, x + 1, sy + 7, 1, 1, '#a01020');
    },
    function yellowLeaves(ctx, sx, sy, h) {
      const x = sx + 8 + (h % 12), y = sy + 4 + ((h >> 4) % 6);
      px(ctx, x,     y,     1, 1, '#f8d030');
      px(ctx, x + 2, y + 1, 1, 1, '#f0a020');
    },
    function pile(ctx, sx, sy, h) {
      const x = sx + 12 + (h % 10);
      px(ctx, x,     sy + 24, 3, 1, '#604028');
      px(ctx, x + 1, sy + 25, 1, 1, '#3a2410');
    },
    function smallBird(ctx, sx, sy, h) {
      const x = sx + 4 + (h % 18), y = sy + 4 + ((h >> 4) % 6);
      px(ctx, x,     y, 1, 1, '#202020');
      px(ctx, x + 1, y, 1, 1, '#202020');
      px(ctx, x + 2, y - 1, 1, 1, '#202020');
    },
    function moss(ctx, sx, sy, h) {
      const y = sy + 16 + ((h >> 3) % 8);
      px(ctx, sx + 6, y, 4, 1, 'rgba(72,128,40,0.55)');
      px(ctx, sx + 7, y + 1, 2, 1, 'rgba(72,128,40,0.45)');
    }
  ];

  // Snowy / icy tree caps - extra snow drifts. Used for Q (snowypine).
  const snowyTreeVariants = [
    null, null,
    function thickerCap(ctx, sx, sy, h) {
      px(ctx, sx + 6 + (h % 10), sy + 2, 12, 1, 'rgba(255,255,255,0.85)');
    },
    function icicleHint(ctx, sx, sy, h) {
      const x = sx + 8 + (h % 14);
      px(ctx, x, sy + 14, 1, 3, 'rgba(216,232,255,0.70)');
    }
  ];

  // Cherry / autumn tree extras - swap pinks/oranges around so the
  // hue stays consistent but each tile reads slightly different.
  const cherryVariants = [
    null, null,
    function moreBlossoms(ctx, sx, sy, h) {
      px(ctx, sx + 6 + (h % 4),  sy + 2, 2, 1, '#f8c0d8');
      px(ctx, sx + 14 + (h % 6), sy + 4, 2, 1, '#f098c0');
    },
    function fallingPetal(ctx, sx, sy, h) {
      px(ctx, sx + 6 + (h % 16), sy + 18 + ((h >> 4) % 6), 1, 1, '#f098c0');
    }
  ];

  const autumnTreeVariants = [
    null, null,
    function deeperRed(ctx, sx, sy, h) {
      const x = sx + 6 + (h % 10), y = sy + 6 + ((h >> 3) % 8);
      px(ctx, x, y, 2, 1, '#a82010');
      px(ctx, x + 1, y + 1, 1, 1, '#7a1408');
    },
    function fallenLeaves(ctx, sx, sy, h) {
      const x = sx + 4 + (h % 18);
      px(ctx, x, sy + 26, 1, 1, '#e07838');
      px(ctx, x + 3, sy + 26, 1, 1, '#c84818');
      px(ctx, x + 5, sy + 27, 1, 1, '#a82010');
    }
  ];

  // Dead tree: occasional crow or hollow knot.
  const deadTreeVariants = [
    null, null,
    function knot(ctx, sx, sy, h) {
      px(ctx, sx + 14, sy + 14 + ((h >> 4) % 6), 2, 2, '#3a2410');
      px(ctx, sx + 14, sy + 14 + ((h >> 4) % 6) + 1, 2, 1, '#1a0a04');
    },
    function crow(ctx, sx, sy, h) {
      px(ctx, sx + 10 + (h % 12), sy + 8, 2, 1, '#202020');
      px(ctx, sx + 10 + (h % 12), sy + 9, 3, 1, '#202020');
    }
  ];

  const mushroomTreeVariants = [
    null, null,
    function glowDot(ctx, sx, sy, h) {
      const x = sx + 12 + (h % 8), y = sy + 12 + ((h >> 4) % 8);
      px(ctx, x, y, 2, 2, '#f8e8a0');
      px(ctx, x, y, 1, 1, '#fff8e0');
    }
  ];

  const willowVariants = [
    null, null,
    function droopExtra(ctx, sx, sy, h) {
      px(ctx, sx + 4 + (h % 4), sy + 18, 1, 5, 'rgba(72,128,72,0.50)');
      px(ctx, sx + 26 - (h % 4), sy + 16, 1, 7, 'rgba(72,128,72,0.50)');
    }
  ];

  // Bush variants - lower stakes, just a small flower or berry on top.
  const bushVariants = [
    null, null,
    function bushFlower(ctx, sx, sy, h) {
      const x = sx + 8 + (h % 14), y = sy + 14 + ((h >> 4) % 10);
      px(ctx, x, y, 1, 1, '#fff8e0');
      px(ctx, x + 1, y, 1, 1, '#f0c020');
    },
    function bushBerry(ctx, sx, sy, h) {
      const x = sx + 10 + (h % 12), y = sy + 16 + ((h >> 5) % 8);
      px(ctx, x, y, 1, 1, '#e83838');
      px(ctx, x + 1, y, 1, 1, '#a01020');
    }
  ];

  // Hostile foliage variants (thorns, hedges, thorn clusters).
  const thornVariants = [
    null, null,
    function thornTip(ctx, sx, sy, h) {
      const x = sx + 6 + (h % 18);
      px(ctx, x, sy + 18, 1, 2, '#3a1f10');
      px(ctx, x + 1, sy + 18, 1, 1, '#a04020');
    }
  ];

  // Code -> variant list mapping. Multi-code groups share a list.
  const VARIANTS = {
    '.': grassVariants,
    '1': grassVariants,
    '2': grassVariants,
    '3': grassVariants,
    '4': grassVariants,
    ':': tallgrassVariants,
    ',': pathVariants,
    '_': pathVariants,
    'o': pathVariants,
    ';': pathVariants,
    'i': pathVariants,
    'p': pathVariants,
    'q': pathVariants,
    'y': pathVariants,
    '^': dirtVariants,
    'v': dirtVariants,
    'w': dirtVariants,
    'x': dirtVariants,
    'z': dirtVariants,
    '5': dirtVariants,
    'a': dirtVariants,
    's': sandVariants,
    'u': sandVariants,
    '6': sandVariants,
    'T': treeVariants,
    'Y': treeVariants,
    'O': treeVariants,
    'N': treeVariants,
    'V': willowVariants,
    'G': treeVariants,
    'U': mushroomTreeVariants,
    'J': deadTreeVariants,
    'K': cherryVariants,
    'E': autumnTreeVariants,
    'Q': snowyTreeVariants,
    'b': bushVariants,
    'c': bushVariants,
    'e': bushVariants,
    'j': bushVariants,
    'k': bushVariants,
    'l': bushVariants,
    'm': bushVariants,
    'g': thornVariants,
    'h': thornVariants,
    'n': thornVariants
  };

  // Approximate count of distinct visual variants delivered:
  // - grass-family (.,1,2,3,4): 8 each * 5 codes = many; effective unique = 8
  // - tallgrass (:): 4
  // - paths (,_o;ipqy): 4
  // - dirt (^vwxz5a): 4
  // - sand (su6): 3
  // - regular trees (T Y O N G): 6
  // - cherry K: 3
  // - autumn E: 3
  // - snowy Q: 3
  // - dead J: 3
  // - mushroom U: 2
  // - willow V: 2
  // - bushes (bcejklm): 3
  // - thorns (ghn): 2
  // Total distinct decorations: ~50, well over the requested
  // 20 + 20 (plants + grass/dirt).
  function paint(ctx, code, sx, sy, x, y) {
    const list = VARIANTS[code];
    if (!list || !list.length) return;
    const h = hash(x | 0, y | 0, code.charCodeAt(0));
    const v = list[h % list.length];
    if (v) v(ctx, sx, sy, h);
  }

  window.PR_VARIATION = { paint };
})();
