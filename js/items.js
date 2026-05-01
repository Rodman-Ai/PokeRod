// Item definitions and effects.
'use strict';

(function(){
  const ITEMS = {
    rodball: {
      id:'rodball', name:'ROD BALL', desc:'Throw to catch a wild creature.',
      kind:'ball', battleOnly:true
    },
    potion: {
      id:'potion', name:'POTION', desc:'Restores 20 HP to one ally.',
      kind:'heal', amount:20, target:'ally'
    },
    superpotion: {
      id:'superpotion', name:'SUPER POTION', desc:'Restores 50 HP.',
      kind:'heal', amount:50, target:'ally'
    },
    hyperpotion: {
      id:'hyperpotion', name:'HYPER POTION', desc:'Restores 120 HP.',
      kind:'heal', amount:120, target:'ally'
    },
    antidote: {
      id:'antidote', name:'ANTIDOTE', desc:'Cures poison.',
      kind:'status', cures:['poisoned'], target:'ally'
    },
    awakening: {
      id:'awakening', name:'AWAKENING', desc:'Wakes a sleeping ally.',
      kind:'status', cures:['asleep'], target:'ally'
    },
    burnheal: {
      id:'burnheal', name:'BURN HEAL', desc:'Cures a burn.',
      kind:'status', cures:['burned'], target:'ally'
    },
    paralyzeheal: {
      id:'paralyzeheal', name:'PARLYZ HEAL', desc:'Cures paralysis.',
      kind:'status', cures:['paralyzed'], target:'ally'
    },
    fullheal: {
      id:'fullheal', name:'FULL HEAL', desc:'Cures any status.',
      kind:'status', cures:['poisoned','asleep','burned','paralyzed','frozen','confused'], target:'ally'
    },
    revive: {
      id:'revive', name:'REVIVE', desc:'Revives a fainted ally to half HP.',
      kind:'revive', ratio:0.5, target:'fainted'
    }
  };

  // Apply an item to a target mon. Returns { ok, message }.
  function apply(itemId, target) {
    const it = ITEMS[itemId];
    if (!it) return { ok:false, message:'Unknown item.' };
    if (!target) return { ok:false, message:'No target.' };
    if (it.kind === 'heal') {
      if (target.hp <= 0) return { ok:false, message:target.nickname + ' is fainted.' };
      if (target.hp >= target.stats.hp) return { ok:false, message:'HP is already full.' };
      const before = target.hp;
      target.hp = Math.min(target.stats.hp, target.hp + it.amount);
      return { ok:true, message:target.nickname + ' recovered ' + (target.hp - before) + ' HP!' };
    }
    if (it.kind === 'status') {
      if (target.hp <= 0) return { ok:false, message:target.nickname + ' is fainted.' };
      if (!target.status || !it.cures.includes(target.status)) {
        return { ok:false, message:'No effect on ' + target.nickname + '.' };
      }
      target.status = null;
      return { ok:true, message:target.nickname + ' was cured!' };
    }
    if (it.kind === 'revive') {
      if (target.hp > 0) return { ok:false, message:target.nickname + " isn't fainted." };
      target.hp = Math.max(1, Math.floor(target.stats.hp * (it.ratio || 0.5)));
      target.status = null;
      return { ok:true, message:target.nickname + ' was revived!' };
    }
    return { ok:false, message:'Cannot use that.' };
  }

  // Helpers for the bag.
  function ensureBag(state) {
    if (!state.player.bag) state.player.bag = {};
    // Migrate legacy `balls` field once.
    if (state.player.balls && !state.player.bag.rodball) {
      state.player.bag.rodball = state.player.balls;
    }
    state.player.balls = state.player.bag.rodball || 0;
  }

  function add(state, itemId, count) {
    ensureBag(state);
    state.player.bag[itemId] = (state.player.bag[itemId] || 0) + (count|0);
    if (itemId === 'rodball') state.player.balls = state.player.bag.rodball;
  }

  function take(state, itemId, count) {
    ensureBag(state);
    if (!state.player.bag[itemId]) return false;
    if ((count|0) <= 0) count = 1;
    if (state.player.bag[itemId] < count) return false;
    state.player.bag[itemId] -= count;
    if (state.player.bag[itemId] <= 0) delete state.player.bag[itemId];
    if (itemId === 'rodball') state.player.balls = state.player.bag.rodball || 0;
    return true;
  }

  function listOwned(state) {
    ensureBag(state);
    const out = [];
    for (const id of Object.keys(state.player.bag)) {
      const it = ITEMS[id];
      if (!it) continue;
      out.push({ id, count: state.player.bag[id], def: it });
    }
    // Stable order roughly by category.
    const order = ['rodball','potion','superpotion','hyperpotion','antidote','burnheal','paralyzeheal','awakening','fullheal','revive'];
    out.sort((a,b) => order.indexOf(a.id) - order.indexOf(b.id));
    return out;
  }

  window.PR_ITEMS = { ITEMS, apply, add, take, listOwned, ensureBag };
})();
