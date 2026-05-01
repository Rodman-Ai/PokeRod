// LocalStorage save/load with three slots and legacy migration.
'use strict';

(function(){
  const LEGACY_KEY = 'pokerod.save.v1';
  const SLOT_KEYS  = ['pokerod.save.slot1','pokerod.save.slot2','pokerod.save.slot3'];
  const LAST_KEY   = 'pokerod.save.last';

  function snapshot(state) {
    return {
      version: 1,
      time: Date.now(),
      player: {
        name: state.player.name,
        map: state.player.map,
        x: state.player.x,
        y: state.player.y,
        dir: state.player.dir,
        money: state.player.money,
        balls: state.player.balls,
        steps: state.player.steps
      },
      party: state.party,
      flags: state.flags,
      settings: state.settings,
      defeatedTrainers: Array.from(state.defeatedTrainers || []),
      dexSeen: state.dex ? Array.from(state.dex.seen || []) : [],
      dexCaught: state.dex ? Array.from(state.dex.caught || []) : [],
      foundItems: state.player.foundItems ? Array.from(state.player.foundItems) : [],
      box: state.box || [],
      quests: state.quests || {}
    };
  }

  function getActiveSlot(state) {
    return Math.max(0, Math.min(2, (state && state.activeSlot|0) || 0));
  }

  function save(state, slot) {
    try {
      if (slot == null) slot = getActiveSlot(state);
      const data = snapshot(state);
      localStorage.setItem(SLOT_KEYS[slot], JSON.stringify(data));
      localStorage.setItem(LAST_KEY, String(slot));
      // Legacy mirror so older builds still see something.
      localStorage.setItem(LEGACY_KEY, JSON.stringify(data));
      return true;
    } catch (e) { console.warn('Save failed', e); return false; }
  }

  function load(slot) {
    try {
      if (slot == null) {
        const l = localStorage.getItem(LAST_KEY);
        slot = l == null ? -1 : (l|0);
      }
      if (slot >= 0 && slot < SLOT_KEYS.length) {
        const raw = localStorage.getItem(SLOT_KEYS[slot]);
        if (raw) {
          const data = JSON.parse(raw);
          if (data && data.version === 1) { data._slot = slot; return data; }
        }
      }
      // Legacy fallback (one save key, no slots).
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        const data = JSON.parse(legacy);
        if (data && data.version === 1) {
          // Migrate to slot 0 silently.
          localStorage.setItem(SLOT_KEYS[0], legacy);
          localStorage.setItem(LAST_KEY, '0');
          data._slot = 0;
          return data;
        }
      }
      return null;
    } catch (e) { return null; }
  }

  function exists(slot) {
    if (slot == null) {
      for (let i = 0; i < SLOT_KEYS.length; i++) if (localStorage.getItem(SLOT_KEYS[i])) return true;
      return !!localStorage.getItem(LEGACY_KEY);
    }
    return !!localStorage.getItem(SLOT_KEYS[slot]);
  }

  function clear(slot) {
    if (slot == null) {
      for (const k of SLOT_KEYS) localStorage.removeItem(k);
      localStorage.removeItem(LEGACY_KEY);
      localStorage.removeItem(LAST_KEY);
      return;
    }
    localStorage.removeItem(SLOT_KEYS[slot]);
  }

  function slotInfo() {
    const out = [];
    for (let i = 0; i < SLOT_KEYS.length; i++) {
      const raw = localStorage.getItem(SLOT_KEYS[i]);
      if (!raw) { out.push({ slot:i, empty:true }); continue; }
      try {
        const d = JSON.parse(raw);
        out.push({
          slot: i,
          time: d.time,
          map: d.player && d.player.map,
          partyCount: (d.party || []).length,
          money: d.player && d.player.money,
          dexCaught: (d.dexCaught || []).length,
          firstSpecies: d.party && d.party[0] && d.party[0].species
        });
      } catch (e) { out.push({ slot:i, empty:true, broken:true }); }
    }
    return out;
  }

  function lastSlot() {
    const l = localStorage.getItem(LAST_KEY);
    return l == null ? -1 : (l|0);
  }

  window.PR_SAVE = { save, load, exists, clear, slotInfo, lastSlot };
})();
