// Creature sprite renderer. Delegates to the prerendered atlas
// (assets/atlas.png). Each species has a 64x64 entry keyed
// 'creature_<species>'. Callers ask for any size; we scale via drawImage.
'use strict';

(function () {
  function drawCreature(ctx, species, sx, sy, sizePx, isBack, subject) {
    if (!window.PR_ATLAS || !window.PR_ATLAS.isReady()) return;
    const key = 'creature_' + species;
    window.PR_ATLAS.drawKeyScaled(ctx, key, sx, sy, sizePx, sizePx);
    drawLevelTuft(ctx, species, sx, sy, sizePx, subject);
  }

  // Render a single-color silhouette of the creature sprite. Uses an
  // offscreen canvas + 'source-in' composite so transparent pixels stay
  // transparent and opaque pixels become the silhouette color.
  function drawCreatureSilhouette(ctx, species, sx, sy, sizePx, color) {
    if (!window.PR_ATLAS || !window.PR_ATLAS.isReady()) return;
    const oc = document.createElement('canvas');
    oc.width = sizePx; oc.height = sizePx;
    const octx = oc.getContext('2d');
    if (!window.PR_ATLAS.drawKeyScaled(octx, 'creature_' + species, 0, 0, sizePx, sizePx)) return;
    octx.globalCompositeOperation = 'source-in';
    octx.fillStyle = color || '#1a0204';
    octx.fillRect(0, 0, sizePx, sizePx);
    ctx.drawImage(oc, sx | 0, sy | 0);
  }

  function levelFromSubject(subject) {
    if (typeof subject === 'number') return subject | 0;
    if (subject && subject.level !== undefined) return subject.level | 0;
    return 1;
  }

  function tuftTier(level) {
    if (level >= 50) return 5;
    if (level >= 35) return 4;
    if (level >= 20) return 3;
    if (level >= 10) return 2;
    if (level >= 5) return 1;
    return 0;
  }

  function tuftColors() {
    const preset = window.PR_ATLAS && window.PR_ATLAS.getPreset ? window.PR_ATLAS.getPreset() : 'gba_firered';
    if (preset === 'gb_red') return ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'];
    if (preset === 'gbc_yellow') return ['#7a1408', '#c83018', '#f08020', '#ffd058'];
    if (preset === 'ds_diamond') return ['#8c1508', '#e32c22', '#ff7048', '#ffd36a'];
    return ['#7a1408', '#a82010', '#d83020', '#f0a020'];
  }

  function drawLevelTuft(ctx, species, sx, sy, sizePx, subject) {
    const level = levelFromSubject(subject);
    const tier = tuftTier(level);
    if (tier <= 0) return;
    const sp = window.PR_DATA && window.PR_DATA.CREATURES && window.PR_DATA.CREATURES[species];
    const d = sp && sp.design ? sp.design : {};
    const scale = sizePx / 32;
    const tx = d.tuftX !== undefined ? d.tuftX : 16;
    const baseY = d.tuftY !== undefined ? d.tuftY : (d.shape === 'caterpillar' ? 14 : 9);
    const cols = tuftColors();
    const rect = (gx, gy, gw, gh, color) => {
      ctx.fillStyle = color;
      ctx.fillRect((sx + gx * scale) | 0, (sy + gy * scale) | 0,
                   Math.max(1, Math.ceil(gw * scale)), Math.max(1, Math.ceil(gh * scale)));
    };
    const w = 5 + tier * 2;
    const h = 2 + tier;
    const left = tx - Math.floor(w / 2);
    const y = Math.max(0, baseY - tier);
    rect(left - 1, y + h - 1, w + 2, 2, cols[0]);
    rect(left, y + 1, w, h, cols[1]);
    rect(left + 1, y, Math.max(1, w - 2), Math.max(1, h - 1), cols[2]);
    rect(tx - 1, Math.max(0, y - 1), 3, 2, cols[3]);
    if (tier >= 3) {
      rect(left + 1, y + h + 1, 2, 2, cols[1]);
      rect(left + w - 3, y + h + 1, 2, 2, cols[1]);
    }
    if (tier >= 5) {
      rect(tx - 2, Math.max(0, y - 3), 5, 2, cols[3]);
    }
  }

  window.PR_MONS = { drawCreature, drawCreatureSilhouette };
})();
