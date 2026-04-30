// Unified input: keyboard + touch. Tracks held keys and edge-triggered presses.
'use strict';

(function(){
  const held = new Set();
  const justPressed = new Set();
  const justReleased = new Set();

  function normalize(key) {
    if (!key) return '';
    if (key.length === 1) return key.toLowerCase();
    return key;
  }

  function press(key) {
    key = normalize(key);
    if (!held.has(key)) {
      held.add(key);
      justPressed.add(key);
    }
  }
  function release(key) {
    key = normalize(key);
    if (held.has(key)) {
      held.delete(key);
      justReleased.add(key);
    }
  }

  // Map WASD to arrow keys for unified handling.
  const ALIAS = {
    'w':'ArrowUp', 'a':'ArrowLeft', 's':'ArrowDown', 'd':'ArrowRight',
    ' ':'z'
  };
  function alias(k) { return ALIAS[k] || k; }

  window.addEventListener('keydown', (e) => {
    const k = alias(normalize(e.key));
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','z','x','Enter',' '].includes(k) ||
        ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }
    press(k);
  }, { passive: false });

  window.addEventListener('keyup', (e) => {
    release(alias(normalize(e.key)));
  });

  // Touch buttons.
  function bindTouch() {
    document.querySelectorAll('#touch button').forEach((b) => {
      const k = b.dataset.key;
      const start = (e) => { e.preventDefault(); press(k); };
      const end   = (e) => { e.preventDefault(); release(k); };
      b.addEventListener('touchstart', start, { passive:false });
      b.addEventListener('touchend',   end,   { passive:false });
      b.addEventListener('touchcancel',end,   { passive:false });
      b.addEventListener('mousedown',  start);
      b.addEventListener('mouseup',    end);
      b.addEventListener('mouseleave', end);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindTouch);
  } else { bindTouch(); }

  function isDown(k) { return held.has(normalize(k)); }
  function pressed(k) { return justPressed.has(normalize(k)); }
  function consumePressed(k) {
    k = normalize(k);
    if (justPressed.has(k)) { justPressed.delete(k); return true; }
    return false;
  }
  function frameEnd() {
    justPressed.clear();
    justReleased.clear();
  }
  function clear() {
    held.clear(); justPressed.clear(); justReleased.clear();
  }

  // Direction helper: returns 'up'|'down'|'left'|'right'|null based on held keys.
  function dirHeld() {
    if (isDown('ArrowUp')) return 'up';
    if (isDown('ArrowDown')) return 'down';
    if (isDown('ArrowLeft')) return 'left';
    if (isDown('ArrowRight')) return 'right';
    return null;
  }

  window.PR_INPUT = { isDown, pressed, consumePressed, frameEnd, clear, dirHeld };
})();
