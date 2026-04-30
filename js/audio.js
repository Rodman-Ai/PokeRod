// Procedural Web Audio engine for PokeRod. All sounds and music are
// generated at runtime via oscillators and noise - no audio files.
'use strict';

(function(){
  let ctx = null;
  let master = null;
  let musicGain = null;
  let sfxGain = null;
  let unlocked = false;
  let muted = false;
  let currentTrack = null;
  let trackTimeout = null;
  let trackStop = null;

  function ensureContext() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.6; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.35; musicGain.connect(master);
    sfxGain   = ctx.createGain(); sfxGain.gain.value   = 0.55; sfxGain.connect(master);
    return ctx;
  }

  function unlock() {
    ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    unlocked = true;
  }

  function setMuted(v) {
    muted = !!v;
    if (master) master.gain.value = muted ? 0 : 0.6;
  }
  function isMuted() { return muted; }

  // ---- Note helpers ----
  // Note string like "A4" or "C#5" -> Hz.
  function noteHz(n) {
    if (typeof n === 'number') return n;
    if (!n) return 0;
    const m = n.match(/^([A-G])(#|b)?(-?\d+)$/);
    if (!m) return 0;
    const semis = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 }[m[1]];
    const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
    const octave = parseInt(m[3], 10);
    const midi = 12 * (octave + 1) + semis + acc;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // Schedule a single tone with a short ADSR envelope.
  function tone(freq, start, dur, opts) {
    if (!ctx || muted || !freq) return;
    opts = opts || {};
    const type = opts.type || 'square';
    const peak = opts.gain != null ? opts.gain : 0.18;
    const attack = opts.attack != null ? opts.attack : 0.005;
    const release = opts.release != null ? opts.release : 0.06;
    const dest = opts.dest || sfxGain;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    if (opts.bend) osc.frequency.linearRampToValueAtTime(freq * opts.bend, start + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(peak, start + attack);
    g.gain.linearRampToValueAtTime(peak * 0.7, start + Math.max(attack + 0.001, dur * 0.7));
    g.gain.linearRampToValueAtTime(0, start + dur + release);
    osc.connect(g); g.connect(dest);
    osc.start(start);
    osc.stop(start + dur + release + 0.02);
    return osc;
  }

  function noiseBurst(start, dur, opts) {
    if (!ctx || muted) return;
    opts = opts || {};
    const peak = opts.gain != null ? opts.gain : 0.2;
    const dest = opts.dest || sfxGain;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = opts.lowpass ? 'lowpass' : 'highpass';
    filter.frequency.value = opts.cutoff != null ? opts.cutoff : 1200;
    const g = ctx.createGain();
    g.gain.value = peak;
    src.connect(filter); filter.connect(g); g.connect(dest);
    src.start(start);
    src.stop(start + dur);
  }

  window.PR_AUDIO = { unlock, setMuted, isMuted, ensureContext, _internal: { tone, noiseBurst, noteHz, get ctx(){ return ctx; }, get sfxGain(){ return sfxGain; }, get musicGain(){ return musicGain; } } };
})();
