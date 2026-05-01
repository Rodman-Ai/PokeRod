// Quest definitions. Each quest has triggers checked by hooks elsewhere.
'use strict';

(function(){
  const QUESTS = {
    first_catch: {
      id:'first_catch',
      name:'FIRST CATCH',
      desc:'Catch your first wild creature.',
      reward:{ item:'superpotion', count:1 },
      check: (state) => state.dex && state.dex.caught && state.dex.caught.size >= 1
    },
    seen_ten: {
      id:'seen_ten',
      name:'KEEN OBSERVER',
      desc:'See ten different creatures in the wild.',
      reward:{ item:'rodball', count:5 },
      check: (state) => state.dex && state.dex.seen && state.dex.seen.size >= 10
    },
    visit_brindale: {
      id:'visit_brindale',
      name:'OUT OF TOWN',
      desc:'Reach Brindale Town.',
      reward:{ item:'potion', count:3 },
      check: (state) => state.player && state.player.map === 'brindale'
    },
    full_party: {
      id:'full_party',
      name:'FRIENDS FOR DAYS',
      desc:'Fill your party with six creatures.',
      reward:{ item:'hyperpotion', count:1 },
      check: (state) => state.party && state.party.length >= 6
    }
  };

  function ensure(state) {
    if (!state.quests) state.quests = {};
    for (const id of Object.keys(QUESTS)) {
      if (!state.quests[id]) state.quests[id] = { status:'active' };
    }
  }

  // Re-evaluate; auto-complete any quest whose check passes. Returns the
  // list of quests completed in this tick so the caller can announce them.
  function tick(state) {
    ensure(state);
    const completed = [];
    for (const id of Object.keys(QUESTS)) {
      const q = QUESTS[id];
      const s = state.quests[id];
      if (s.status !== 'active') continue;
      try {
        if (q.check(state)) {
          s.status = 'done';
          completed.push(q);
        }
      } catch (e) { /* ignore broken check */ }
    }
    return completed;
  }

  function status(state, id) {
    ensure(state);
    return state.quests[id] && state.quests[id].status;
  }

  function list(state) {
    ensure(state);
    const out = [];
    for (const id of Object.keys(QUESTS)) {
      out.push({ def:QUESTS[id], status: state.quests[id].status });
    }
    return out;
  }

  window.PR_QUESTS = { QUESTS, ensure, tick, status, list };
})();
