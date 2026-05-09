// Sound effects library. All effects synthesized at call time.
'use strict';

(function(){
  function _t() { return window.PR_AUDIO && window.PR_AUDIO._internal; }
  function ctx() { return _t() ? _t().ctx : null; }

  function play(name) {
    const A = _t();
    if (!A) return;
    const c = A.ctx;
    if (!c) return;
    const t = c.currentTime;
    switch (name) {
      case 'select':
        A.tone(A.noteHz('E5'), t,        0.04, { gain:0.12, type:'square' });
        break;
      case 'confirm':
        A.tone(A.noteHz('C5'), t,        0.05, { gain:0.16, type:'square' });
        A.tone(A.noteHz('G5'), t + 0.05, 0.06, { gain:0.16, type:'square' });
        break;
      case 'cancel':
        A.tone(A.noteHz('A4'), t,        0.05, { gain:0.14, type:'square' });
        A.tone(A.noteHz('E4'), t + 0.05, 0.06, { gain:0.14, type:'square' });
        break;
      case 'bump':
        A.tone(80, t, 0.05, { gain:0.18, type:'square', bend:0.5 });
        break;
      case 'step':
        A.noiseBurst(t, 0.04, { gain:0.05, lowpass:true, cutoff:600 });
        break;
      case 'door':
        A.noiseBurst(t, 0.18, { gain:0.10, lowpass:true, cutoff:300 });
        break;
      case 'hit':
        A.noiseBurst(t, 0.10, { gain:0.22, cutoff:2200 });
        A.tone(220, t, 0.08, { gain:0.18, type:'sawtooth', bend:0.5 });
        break;
      case 'crit':
        A.noiseBurst(t, 0.16, { gain:0.30, cutoff:3000 });
        A.tone(180, t, 0.14, { gain:0.22, type:'sawtooth', bend:0.4 });
        A.tone(360, t + 0.05, 0.10, { gain:0.18, type:'sawtooth', bend:0.5 });
        break;
      case 'super':
        A.tone(A.noteHz('C5'), t,        0.06, { gain:0.18, type:'sawtooth' });
        A.tone(A.noteHz('E5'), t + 0.06, 0.06, { gain:0.18, type:'sawtooth' });
        A.tone(A.noteHz('G5'), t + 0.12, 0.06, { gain:0.18, type:'sawtooth' });
        A.tone(A.noteHz('C6'), t + 0.18, 0.10, { gain:0.20, type:'sawtooth' });
        break;
      case 'weak':
        A.tone(A.noteHz('G4'), t,        0.10, { gain:0.10, type:'triangle' });
        break;
      case 'faint':
        A.tone(A.noteHz('B4'), t,        0.10, { gain:0.18, type:'square', bend:0.25 });
        A.tone(A.noteHz('E4'), t + 0.10, 0.20, { gain:0.16, type:'square', bend:0.3 });
        break;
      case 'levelup':
        A.tone(A.noteHz('C5'), t,        0.08, { gain:0.18, type:'square' });
        A.tone(A.noteHz('E5'), t + 0.08, 0.08, { gain:0.18, type:'square' });
        A.tone(A.noteHz('G5'), t + 0.16, 0.08, { gain:0.18, type:'square' });
        A.tone(A.noteHz('C6'), t + 0.24, 0.16, { gain:0.20, type:'square' });
        break;
      case 'encounter':
        A.tone(A.noteHz('C5'), t,        0.08, { gain:0.22, type:'square' });
        A.tone(A.noteHz('Eb5'),t + 0.08, 0.08, { gain:0.22, type:'square' });
        A.tone(A.noteHz('Gb5'),t + 0.16, 0.08, { gain:0.22, type:'square' });
        A.tone(A.noteHz('A5'), t + 0.24, 0.20, { gain:0.22, type:'square' });
        break;
      case 'ball':
        A.tone(A.noteHz('A4'), t,        0.04, { gain:0.16, type:'sine', bend:1.2 });
        A.noiseBurst(t + 0.04, 0.04, { gain:0.12 });
        break;
      case 'catch':
        A.tone(A.noteHz('C5'), t,        0.10, { gain:0.18, type:'square' });
        A.tone(A.noteHz('E5'), t + 0.10, 0.10, { gain:0.18, type:'square' });
        A.tone(A.noteHz('G5'), t + 0.20, 0.20, { gain:0.20, type:'square' });
        break;
      case 'heal':
        A.tone(A.noteHz('E5'), t,        0.08, { gain:0.14, type:'sine' });
        A.tone(A.noteHz('A5'), t + 0.08, 0.08, { gain:0.14, type:'sine' });
        A.tone(A.noteHz('E6'), t + 0.16, 0.16, { gain:0.16, type:'sine' });
        break;
      case 'menu':
        A.tone(A.noteHz('B4'), t,        0.04, { gain:0.10, type:'square' });
        break;
      case 'page':
        A.tone(A.noteHz('D5'), t,        0.04, { gain:0.10, type:'triangle' });
        break;
    }
  }

  // Procedural creature cry. Synthesises a short 2-3 tone signature
  // deterministic from the species: dex# drives pitch, primary type
  // drives waveform / detune / glide. No assets required, every
  // species sounds slightly different.
  function _typeProfile(types) {
    const t = (types && types[0]) || 'NORMAL';
    switch (t) {
      case 'FIRE':     return { wave:'sawtooth', detune: 0,   bend:0.7,  noise:0.05 };
      case 'WATER':    return { wave:'sine',     detune: -2,  bend:0.4,  noise:0    };
      case 'ELECTRIC': return { wave:'square',   detune: 6,   bend:1.4,  noise:0.10 };
      case 'GRASS':    return { wave:'triangle', detune: 0,   bend:0.5,  noise:0    };
      case 'ICE':      return { wave:'sine',     detune: 4,   bend:0.3,  noise:0.02 };
      case 'FIGHTING': return { wave:'sawtooth', detune: -3,  bend:0.9,  noise:0.08 };
      case 'POISON':   return { wave:'sawtooth', detune: 2,   bend:0.6,  noise:0.04 };
      case 'GROUND':   return { wave:'sawtooth', detune: -5,  bend:0.5,  noise:0.06 };
      case 'FLYING':   return { wave:'triangle', detune: 3,   bend:0.6,  noise:0    };
      case 'PSYCHIC':  return { wave:'sine',     detune: 5,   bend:0.45, noise:0    };
      case 'BUG':      return { wave:'square',   detune: 4,   bend:0.4,  noise:0.05 };
      case 'ROCK':     return { wave:'sawtooth', detune: -4,  bend:0.5,  noise:0.07 };
      case 'GHOST':    return { wave:'sine',     detune: -1,  bend:1.0,  noise:0.03 };
      case 'DRAGON':   return { wave:'sawtooth', detune: -2,  bend:0.7,  noise:0.04 };
      case 'DARK':     return { wave:'sawtooth', detune: -3,  bend:0.6,  noise:0.05 };
      case 'STEEL':    return { wave:'square',   detune: 0,   bend:0.4,  noise:0.06 };
      case 'FAIRY':    return { wave:'triangle', detune: 5,   bend:0.5,  noise:0    };
      default:         return { wave:'square',   detune: 0,   bend:0.5,  noise:0.03 };
    }
  }
  function cry(species) {
    const A = _t();
    if (!A) return;
    const c = A.ctx;
    if (!c) return;
    const sp = window.PR_DATA && window.PR_DATA.CREATURES && window.PR_DATA.CREATURES[species];
    if (!sp) return;
    const profile = _typeProfile(sp.types);
    // Stable pseudo-pitch from dex number: spread across two octaves.
    const dex = (sp.dex | 0) || 1;
    const baseSemitone = -8 + (dex * 7) % 24; // -8..+15 semitones from A4
    const baseHz = 440 * Math.pow(2, (baseSemitone + profile.detune) / 12);
    const t = c.currentTime;
    A.tone(baseHz, t,         0.10, { gain:0.16, type:profile.wave, bend:profile.bend });
    A.tone(baseHz * 1.18, t + 0.08, 0.10, { gain:0.14, type:profile.wave, bend:profile.bend * 0.6 });
    A.tone(baseHz * 0.85, t + 0.18, 0.12, { gain:0.12, type:profile.wave, bend:profile.bend * 0.4 });
    if (profile.noise > 0) {
      A.noiseBurst(t + 0.02, 0.08, { gain:profile.noise * 0.6, cutoff:1800 });
    }
  }

  window.PR_SFX = { play, cry };
})();
