// LocalStorage save/load.
'use strict';

(function(){
  const KEY = 'pokerod.save.v1';

  function save(state) {
    try {
      const data = {
        version: 1,
        time: Date.now(),
        player: {
          name: state.player.name,
          map: state.player.map,
          x: state.player.x,
          y: state.player.y,
          dir: state.player.dir,
          money: state.player.money,
          steps: state.player.steps
        },
        party: state.party,
        flags: state.flags,
        settings: state.settings,
        defeatedTrainers: Array.from(state.defeatedTrainers || [])
      };
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) { console.warn('Save failed', e); return false; }
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || data.version !== 1) return null;
      return data;
    } catch (e) { return null; }
  }

  function exists() { return !!localStorage.getItem(KEY); }
  function clear() { localStorage.removeItem(KEY); }

  window.PR_SAVE = { save, load, exists, clear };
})();
