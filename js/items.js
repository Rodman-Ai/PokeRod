// Item definitions and effects.
'use strict';

(function(){
  const ITEMS = {
    rodball: {
      id:'rodball', name:'ROD BALL', desc:'Throw to catch a wild creature.',
      kind:'ball', battleOnly:true, price:200
    },
    greatball: {
      id:'greatball', name:'GREAT BALL', desc:'A better catch rate than a Rod Ball.',
      kind:'ball', battleOnly:true, price:600, catchBonus:1.5
    },
    ultraball: {
      id:'ultraball', name:'ULTRA BALL', desc:'High catch rate. Great for tough finds.',
      kind:'ball', battleOnly:true, price:1200, catchBonus:2.0
    },
    potion: {
      id:'potion', name:'POTION', desc:'Restores 20 HP to one ally.',
      kind:'heal', amount:20, target:'ally', price:200
    },
    superpotion: {
      id:'superpotion', name:'SUPER POTION', desc:'Restores 50 HP.',
      kind:'heal', amount:50, target:'ally', price:700
    },
    hyperpotion: {
      id:'hyperpotion', name:'HYPER POTION', desc:'Restores 120 HP.',
      kind:'heal', amount:120, target:'ally', price:1500
    },
    maxpotion: {
      id:'maxpotion', name:'MAX POTION', desc:'Fully restores HP to one ally.',
      kind:'heal', amount:9999, target:'ally', price:2500
    },
    antidote: {
      id:'antidote', name:'ANTIDOTE', desc:'Cures poison.',
      kind:'status', cures:['poisoned'], target:'ally', price:100
    },
    awakening: {
      id:'awakening', name:'AWAKENING', desc:'Wakes a sleeping ally.',
      kind:'status', cures:['asleep'], target:'ally', price:250
    },
    burnheal: {
      id:'burnheal', name:'BURN HEAL', desc:'Cures a burn.',
      kind:'status', cures:['burned'], target:'ally', price:250
    },
    paralyzeheal: {
      id:'paralyzeheal', name:'PARLYZ HEAL', desc:'Cures paralysis.',
      kind:'status', cures:['paralyzed'], target:'ally', price:200
    },
    fullheal: {
      id:'fullheal', name:'FULL HEAL', desc:'Cures any status.',
      kind:'status', cures:['poisoned','asleep','burned','paralyzed','frozen','confused'], target:'ally', price:600
    },
    revive: {
      id:'revive', name:'REVIVE', desc:'Revives a fainted ally to half HP.',
      kind:'revive', ratio:0.5, target:'fainted', price:1500
    },
    maxrevive: {
      id:'maxrevive', name:'MAX REVIVE', desc:'Revives a fainted ally to full HP.',
      kind:'revive', ratio:1.0, target:'fainted', price:4000
    },
    oranberry: {
      id:'oranberry', name:'ORAN BERRY', desc:'Held item. Restores 20 HP at <50% HP.',
      kind:'berry', berry:true, heal:20, atRatio:0.5, holdable:true, price:150
    },
    sitrusberry: {
      id:'sitrusberry', name:'SITRUS BERRY', desc:'Held item. Restores 50 HP at <25% HP.',
      kind:'berry', berry:true, heal:50, atRatio:0.25, holdable:true, price:400
    },
    pechaberry: {
      id:'pechaberry', name:'PECHA BERRY', desc:'Held item. Cures poison automatically.',
      kind:'berry', berry:true, cures:['poisoned'], holdable:true, price:200
    },
    pokeflute: {
      id:'pokeflute', name:'POKE FLUTE', desc:'A flute that wakes any sleeping creature.',
      kind:'key', key:true, price:0
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
    const order = ['rodball','greatball','ultraball','potion','superpotion','hyperpotion','maxpotion','antidote','burnheal','paralyzeheal','awakening','fullheal','revive','maxrevive','oranberry','sitrusberry','pechaberry','pokeflute'];
    out.sort((a,b) => order.indexOf(a.id) - order.indexOf(b.id));
    return out;
  }

  window.PR_ITEMS = { ITEMS, apply, add, take, listOwned, ensureBag };
})();
