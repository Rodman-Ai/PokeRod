// Procedural chiptune music tracks. All melodies are original short loops
// composed from common scale degrees and chord tones.
'use strict';

(function(){
  function _t() { return window.PR_AUDIO && window.PR_AUDIO._internal; }

  let activeTrack = null;
  let stopFn = null;

  // A 'track' is a function that, given an internal helpers object,
  // schedules notes from time t onward and returns total bar length.

  // Note pattern: each note is [pitch, beats]; pitch null = rest.
  function playPattern(pattern, type, gain, t0, beatSec, dest) {
    const A = _t();
    if (!A) return 0;
    const ctx = A.ctx;
    let t = t0;
    for (const [p, b] of pattern) {
      if (p) {
        const f = typeof p === 'string' ? A.noteHz(p) : p;
        A.tone(f, t, b * beatSec * 0.9, { type, gain, dest, attack:0.005, release: 0.04 });
      }
      t += b * beatSec;
    }
    return t - t0;
  }

  function playDrum(pattern, t0, beatSec, dest) {
    const A = _t();
    if (!A) return;
    let t = t0;
    for (const d of pattern) {
      if (d === 'k') {
        A.tone(80, t, 0.06, { type:'sine', gain:0.30, dest, bend:0.4 });
      } else if (d === 's') {
        A.noiseBurst(t, 0.05, { gain:0.16, dest, cutoff:1800 });
      } else if (d === 'h') {
        A.noiseBurst(t, 0.025, { gain:0.06, dest, cutoff:6000 });
      }
      t += beatSec / 2;
    }
  }

  // ---- Tracks (each returns the looping function) ----

  function titleTrack() {
    const A = _t(); if (!A) return null;
    const bpm = 96, beat = 60 / bpm;
    const lead = [
      ['E5',1],['G5',1],['B5',1],['G5',1],
      ['A5',2],[null,1],['E5',1],
      ['D5',1],['F5',1],['A5',1],['F5',1],
      ['G5',2],[null,2]
    ];
    const bass = [
      ['E3',2],['G3',2],
      ['A3',2],['E3',2],
      ['D3',2],['F3',2],
      ['G3',2],['G3',2]
    ];
    return { bpm, beat, bars: 16,
      lead, bass,
      drums: 'k h s h k h s h k h s h k h s h'.split(' ') };
  }

  function townTrack() {
    const bpm = 110, beat = 60 / bpm;
    const lead = [
      ['G4',1],['B4',1],['D5',1],['B4',1],
      ['C5',1],['E5',1],['G5',2],
      ['F5',1],['D5',1],['B4',1],['G4',1],
      ['A4',2],[null,2],
      ['G4',1],['A4',1],['B4',1],['D5',1],
      ['E5',2],['D5',2],
      ['C5',1],['B4',1],['A4',1],['G4',1],
      ['G4',2],[null,2]
    ];
    const bass = [
      ['G2',2],['G2',2],['C3',2],['C3',2],
      ['D3',2],['D3',2],['G2',2],['G2',2],
      ['G2',2],['G2',2],['E3',2],['E3',2],
      ['C3',2],['C3',2],['D3',2],['D3',2]
    ];
    return { bpm, beat, bars: 16, lead, bass,
      drums: 'k h s h k h s h k h s h k h s h'.split(' ') };
  }

  function routeTrack() {
    const bpm = 128, beat = 60 / bpm;
    const lead = [
      ['A4',0.5],['C5',0.5],['E5',0.5],['A5',0.5],
      ['G5',0.5],['E5',0.5],['C5',1],
      ['F5',0.5],['A5',0.5],['F5',0.5],['D5',0.5],
      ['E5',2],
      ['A4',0.5],['C5',0.5],['E5',0.5],['G5',0.5],
      ['F5',0.5],['D5',0.5],['B4',1],
      ['G4',0.5],['B4',0.5],['D5',0.5],['G5',0.5],
      ['A5',2]
    ];
    const bass = [
      ['A2',1],['A3',1],['A2',1],['A3',1],
      ['F2',1],['F3',1],['G2',1],['G3',1],
      ['A2',1],['A3',1],['E2',1],['E3',1],
      ['G2',1],['G3',1],['A2',1],['A3',1]
    ];
    return { bpm, beat, bars: 16, lead, bass,
      drums: 'k s k s k s k s k s k s k s k s'.split(' ') };
  }

  function battleTrack() {
    const bpm = 156, beat = 60 / bpm;
    const lead = [
      ['D5',0.5],['F5',0.5],['A5',0.5],['D6',0.5],
      ['C6',0.5],['A5',0.5],['F5',1],
      ['Bb5',0.5],['G5',0.5],['E5',0.5],['G5',0.5],
      ['A5',2],
      ['D5',0.5],['E5',0.5],['F5',0.5],['G5',0.5],
      ['A5',0.5],['Bb5',0.5],['C6',1],
      ['A5',0.5],['F5',0.5],['D5',0.5],['F5',0.5],
      ['A5',2]
    ];
    const bass = [
      ['D2',0.5],['D3',0.5],['D2',0.5],['D3',0.5],
      ['D2',0.5],['D3',0.5],['D2',0.5],['D3',0.5],
      ['Bb2',0.5],['Bb3',0.5],['Bb2',0.5],['Bb3',0.5],
      ['A2',0.5],['A3',0.5],['A2',0.5],['A3',0.5],
      ['D2',0.5],['D3',0.5],['D2',0.5],['D3',0.5],
      ['F2',0.5],['F3',0.5],['F2',0.5],['F3',0.5],
      ['G2',0.5],['G3',0.5],['Bb2',0.5],['Bb3',0.5],
      ['A2',0.5],['A3',0.5],['A2',1.5]
    ];
    return { bpm, beat, bars: 16, lead, bass,
      drums: 'k s k s k s k s k s k s k s k s'.split(' ') };
  }

  function victoryTrack() {
    const bpm = 140, beat = 60 / bpm;
    const lead = [
      ['G5',0.5],['G5',0.5],['G5',0.5],['Eb5',0.5],
      ['Bb5',1],['G5',1],
      ['Eb5',0.5],['Bb5',0.5],['G5',2],
      ['F5',0.5],['F5',0.5],['F5',0.5],['D5',0.5],
      ['Bb5',1],['G5',1],
      ['D5',0.5],['G5',0.5],['Eb5',2]
    ];
    const bass = [
      ['Eb3',2],['Eb3',2],['Bb2',2],['Eb3',2],
      ['Eb3',2],['Eb3',2],['Bb2',2],['Eb3',2]
    ];
    return { bpm, beat, bars:8, lead, bass,
      drums: 'k h s h k h s h k h s h k h s h'.split(' ') };
  }

  const TRACKS = {
    title: titleTrack, town: townTrack, route: routeTrack,
    battle: battleTrack, victory: victoryTrack
  };

  function play(name) {
    stop();
    const A = _t();
    if (!A) return;
    const def = TRACKS[name];
    if (!def) return;
    const t = def();
    if (!t) return;
    const ctx = A.ctx;
    const dest = A.musicGain;
    let nextStart = ctx.currentTime + 0.05;
    let stopped = false;

    const beatsPerBar = 4;
    const totalBeats = t.bars * beatsPerBar;
    const loopSec = totalBeats * t.beat;

    function scheduleLoop(t0) {
      // Lead.
      let t = t0;
      for (const [p,b] of t.lead || []) {
        if (p) A.tone(A.noteHz(p), t, b * t.beat * 0.85, { type:'square', gain:0.10, dest });
        t += b * t.beat;
      }
    }

    function schedule(t0) {
      // Lead.
      let lt = t0;
      for (const [p,b] of t.lead) {
        if (p) A.tone(A.noteHz(p), lt, b * t.beat * 0.85, { type:'square', gain:0.10, dest });
        lt += b * t.beat;
      }
      // Bass.
      let bt = t0;
      for (const [p,b] of t.bass) {
        if (p) A.tone(A.noteHz(p), bt, b * t.beat * 0.9, { type:'triangle', gain:0.16, dest });
        bt += b * t.beat;
      }
      // Drums (one per half-beat).
      let dt = t0;
      for (const d of t.drums) {
        if (d === 'k') A.tone(80, dt, 0.06, { type:'sine', gain:0.22, dest, bend:0.4 });
        else if (d === 's') A.noiseBurst(dt, 0.04, { gain:0.10, dest, cutoff:1800 });
        else if (d === 'h') A.noiseBurst(dt, 0.02, { gain:0.04, dest, cutoff:6000 });
        dt += t.beat / 2;
      }
    }

    function loop() {
      if (stopped) return;
      schedule(nextStart);
      nextStart += loopSec;
      const ms = Math.max(50, (nextStart - ctx.currentTime - 0.5) * 1000);
      stopFn._t = setTimeout(loop, ms);
    }

    stopFn = function(){ stopped = true; if (stopFn._t) clearTimeout(stopFn._t); };
    loop();
    activeTrack = name;
  }

  function stop() {
    if (stopFn) { stopFn(); stopFn = null; }
    activeTrack = null;
  }

  function current() { return activeTrack; }

  window.PR_MUSIC = { play, stop, current };
})();
