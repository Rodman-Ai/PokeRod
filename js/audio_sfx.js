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

  window.PR_SFX = { play };
})();
