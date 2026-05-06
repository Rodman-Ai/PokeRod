// Item definitions and effects.
'use strict';

(function(){
  const ITEMS = {
    rodball: {
      id:'rodball', name:'ROD BALL',
      desc:'A trusty starter ball with a bright little snap.',
      detail:'A cheerful standard ball. It clicks shut like it is proud of you.',
      kind:'ball', icon:'ball', color:'#e84848', accent:'#ffd060',
      battleOnly:true, price:200
    },
    greatball: {
      id:'greatball', name:'GREAT BALL',
      desc:'A stronger clasp for wilder finds.',
      detail:'Blue shell, red fins, and a catch grip that feels ready for trouble.',
      kind:'ball', icon:'ball', color:'#4878d8', accent:'#e84848',
      battleOnly:true, price:600, catchBonus:1.5
    },
    ultraball: {
      id:'ultraball', name:'ULTRA BALL',
      desc:'Heavy-duty gear for stubborn stars.',
      detail:'Black-and-gold hardware for catches that refuse to be ordinary.',
      kind:'ball', icon:'ball', color:'#202020', accent:'#f0c020',
      battleOnly:true, price:1200, catchBonus:2.0
    },
    quickball: {
      id:'quickball', name:'QUICK BALL',
      desc:'Loves a dramatic first turn.',
      detail:'A fast little flash-bolt ball. Throw it early while everyone is surprised.',
      kind:'ball', icon:'ball', color:'#58c8f0', accent:'#f0d030',
      battleOnly:true, price:900, catchBonus:1.0, firstTurnBonus:2.5
    },
    cavernball: {
      id:'cavernball', name:'CAVERN BALL',
      desc:'Glows warmly in caves and ruins.',
      detail:'A mossy stone ball that hums when the ceiling gets rocky.',
      kind:'ball', icon:'ball', color:'#807070', accent:'#58c878',
      battleOnly:true, price:800, catchBonus:1.0, tagBonus:2.2, tagAny:['cave','ruins']
    },
    potion: {
      id:'potion', name:'POTION',
      desc:'Fizzy red medicine. Restores 20 HP.',
      detail:'Smells like cherries and brave decisions. Restores 20 HP to one ally.',
      kind:'heal', icon:'bottle', color:'#e84848', accent:'#fff0c8',
      amount:20, target:'ally', price:200
    },
    superpotion: {
      id:'superpotion', name:'SUPER POTION',
      desc:'Bigger bottle, bigger bounce-back. 50 HP.',
      detail:'A cool blue tonic with a tiny foam cap. Restores 50 HP.',
      kind:'heal', icon:'bottle', color:'#5898e8', accent:'#e8f8ff',
      amount:50, target:'ally', price:700
    },
    hyperpotion: {
      id:'hyperpotion', name:'HYPER POTION',
      desc:'Gold tonic for heavy scrapes. 120 HP.',
      detail:'A rich honey-gold draught for the sort of scrape with a story.',
      kind:'heal', icon:'bottle', color:'#f0b840', accent:'#fff8d8',
      amount:120, target:'ally', price:1500
    },
    maxpotion: {
      id:'maxpotion', name:'MAX POTION',
      desc:'A full-health miracle in one bright gulp.',
      detail:'The fancy bottle you save for a real cliffhanger. Fully restores HP.',
      kind:'heal', icon:'bottle', color:'#f070b8', accent:'#fff0f8',
      amount:9999, target:'ally', price:2500
    },
    antidote: {
      id:'antidote', name:'ANTIDOTE',
      desc:'Minty drops that clear poison.',
      detail:'A tiny green vial with a leaf on the label. Cures poison.',
      kind:'status', icon:'vial', color:'#48b860', accent:'#d8ffe0',
      cures:['poisoned'], target:'ally', price:100
    },
    awakening: {
      id:'awakening', name:'AWAKENING',
      desc:'Tiny sunrise scent for sleepy allies.',
      detail:'One sniff and nap-time packs its blanket. Wakes a sleeping ally.',
      kind:'status', icon:'vial', color:'#f0c020', accent:'#fff8d8',
      cures:['asleep'], target:'ally', price:250
    },
    burnheal: {
      id:'burnheal', name:'BURN HEAL',
      desc:'Cool blue gel for hot mistakes.',
      detail:'A chilly salve that takes the sting out of a bad matchup. Cures burns.',
      kind:'status', icon:'vial', color:'#58b8f0', accent:'#e0f8ff',
      cures:['burned'], target:'ally', price:250
    },
    paralyzeheal: {
      id:'paralyzeheal', name:'PARLYZ HEAL',
      desc:'Static-smoothing citrus spray.',
      detail:'A crackly yellow remedy that gets stiff legs moving again.',
      kind:'status', icon:'spray', color:'#f0d030', accent:'#fff8c0',
      cures:['paralyzed'], target:'ally', price:200
    },
    fullheal: {
      id:'fullheal', name:'FULL HEAL',
      desc:'One shiny fix for every weird condition.',
      detail:'The all-purpose sparkle bottle. Cures any status condition.',
      kind:'status', icon:'spray', color:'#f080c8', accent:'#80e8f0',
      cures:['poisoned','asleep','burned','paralyzed','frozen','confused'], target:'ally', price:600
    },
    revive: {
      id:'revive', name:'REVIVE',
      desc:'A bright shard that brings an ally back.',
      detail:'A star-shaped pulse of courage. Revives a fainted ally to half HP.',
      kind:'revive', icon:'star', color:'#f0d030', accent:'#fff8d8',
      ratio:0.5, target:'fainted', price:1500
    },
    maxrevive: {
      id:'maxrevive', name:'MAX REVIVE',
      desc:'The big comeback star. Full HP.',
      detail:'A golden burst that turns the music back up. Revives to full HP.',
      kind:'revive', icon:'star', color:'#f8e870', accent:'#e85050',
      ratio:1.0, target:'fainted', price:4000
    },
    oranberry: {
      id:'oranberry', name:'ORAN BERRY',
      desc:'A held berry with a dependable snack crunch.',
      detail:'Holder munches it below half HP to restore 20 HP.',
      kind:'berry', icon:'berry', color:'#4f82df', accent:'#75c45e',
      berry:true, heal:20, atRatio:0.5, holdable:true, price:150
    },
    sitrusberry: {
      id:'sitrusberry', name:'SITRUS BERRY',
      desc:'A zesty held berry for scary moments.',
      detail:'Holder eats it below quarter HP to restore 50 HP.',
      kind:'berry', icon:'berry', color:'#f0a030', accent:'#65b850',
      berry:true, heal:50, atRatio:0.25, holdable:true, price:400
    },
    pechaberry: {
      id:'pechaberry', name:'PECHA BERRY',
      desc:'A sweet pink held berry that hates poison.',
      detail:'Holder eats it automatically to cure poison.',
      kind:'berry', icon:'berry', color:'#f078b8', accent:'#65b850',
      berry:true, cures:['poisoned'], holdable:true, price:200
    },
    pokeflute: {
      id:'pokeflute', name:'POKE FLUTE',
      desc:'A bright tune for impossible naps.',
      detail:'A polished flute whose song wakes any sleeping creature.',
      kind:'key', icon:'flute', color:'#d8b070', accent:'#fff0c0',
      key:true, price:0
    },
    // ---- Trainer equipment (worn by the player; one per slot) ----
    lucky_charm: {
      id:'lucky_charm', name:'LUCKY CHARM',
      desc:'A warm little charm. Party XP +10%.',
      detail:'Trainer gear with a lucky jingle. All party Pokerod gain 10% more XP.',
      kind:'trainer_gear', icon:'charm', color:'#f0c020', accent:'#e85050',
      slot:'trinket', xpMult:1.10, price:1500
    },
    scholars_glasses: {
      id:'scholars_glasses', name:'SCHOLAR GLASS',
      desc:'Smart frames. Party XP +25%.',
      detail:'Trainer gear with careful lenses. All party Pokerod gain 25% more XP.',
      kind:'trainer_gear', icon:'glasses', color:'#385890', accent:'#e8f8ff',
      slot:'trinket', xpMult:1.25, price:5000
    },
    masters_pendant: {
      id:'masters_pendant', name:'MASTER PENDANT',
      desc:'A boss-level pendant. Party XP +50%.',
      detail:'Trainer gear with a deep shine. All party Pokerod gain 50% more XP.',
      kind:'trainer_gear', icon:'pendant', color:'#8050c8', accent:'#f0d060',
      slot:'trinket', xpMult:1.50, price:15000
    },
    // ---- Pokerod held equipment (one per creature; shares mon.held slot) ----
    soothe_bell: {
      id:'soothe_bell', name:'SOOTHE BELL',
      desc:'A gentle held bell. Holder XP +10%.',
      detail:'Held gear that rings softly after each victory. Holder XP +10%.',
      kind:'held_gear', icon:'bell', color:'#d8b060', accent:'#fff0c8',
      holdable:true, xpMult:1.10, price:1200
    },
    lucky_egg: {
      id:'lucky_egg', name:'LUCKY EGG',
      desc:'A speckled held egg. Holder XP +50%.',
      detail:'Held gear with mysterious warmth. Holder gains 50% more XP.',
      kind:'held_gear', icon:'egg', color:'#f8f0d8', accent:'#f0c020',
      holdable:true, xpMult:1.50, price:4000
    }
  };

  function kindLabel(it) {
    if (!it) return 'ITEM';
    if (it.kind === 'ball') return 'BALL';
    if (it.kind === 'heal') return 'HEAL';
    if (it.kind === 'status') return 'CARE';
    if (it.kind === 'revive') return 'REVIVE';
    if (it.kind === 'berry') return 'BERRY';
    if (it.kind === 'trainer_gear') return 'GEAR';
    if (it.kind === 'held_gear') return 'HELD';
    if (it.kind === 'key') return 'KEY';
    return 'ITEM';
  }

  function detailText(it) {
    return (it && (it.detail || it.desc)) || '';
  }

  function drawIcon(ctx, itemId, x, y, size) {
    const it = ITEMS[itemId];
    if (!it || !ctx) return false;
    const s = Math.max(12, size || 24) / 16;
    const main = it.color || '#d85050';
    const accent = it.accent || '#fff0c0';
    const dark = '#202020';
    const light = '#fff8e8';
    const r = (rx, ry, rw, rh, color) => {
      ctx.fillStyle = color;
      ctx.fillRect((x + rx * s) | 0, (y + ry * s) | 0, Math.max(1, (rw * s) | 0), Math.max(1, (rh * s) | 0));
    };
    const icon = it.icon || 'item';
    if (icon === 'ball') {
      r(4,1,8,2,dark); r(2,3,12,3,dark); r(1,6,14,4,dark); r(2,10,12,3,dark); r(4,13,8,2,dark);
      r(4,2,8,2,accent); r(3,4,10,3,main); r(2,7,12,1,main);
      r(2,8,12,2,light); r(4,11,8,2,light);
      r(6,6,4,4,dark); r(7,7,2,2,light);
      return true;
    }
    if (icon === 'bottle') {
      r(6,1,4,2,dark); r(5,3,6,2,dark); r(4,5,8,9,dark);
      r(7,2,2,2,accent); r(6,4,4,2,light); r(5,6,6,7,main); r(6,6,4,2,accent); r(6,10,4,2,'rgba(255,255,255,0.45)');
      return true;
    }
    if (icon === 'vial' || icon === 'spray') {
      r(5,1,6,2,dark); r(6,3,4,2,dark); r(4,5,8,8,dark);
      r(6,2,4,1,accent); r(5,6,6,6,main); r(6,5,4,2,light);
      if (icon === 'spray') { r(10,3,4,1,dark); r(12,2,1,1,accent); r(13,1,1,1,accent); }
      return true;
    }
    if (icon === 'berry') {
      r(7,1,3,2,'#307838'); r(4,4,8,8,dark); r(3,6,10,6,dark);
      r(5,4,6,8,main); r(4,7,8,4,main); r(6,5,2,2,accent); r(9,8,1,1,light);
      r(9,2,4,2,'#58a848'); r(11,1,2,2,'#7ed060');
      return true;
    }
    if (icon === 'star' || icon === 'charm') {
      r(7,1,2,4,accent); r(5,5,6,2,dark); r(3,7,10,2,dark); r(5,9,6,2,dark); r(6,11,4,3,dark);
      r(7,3,2,3,main); r(5,7,6,2,main); r(7,9,2,4,accent);
      if (icon === 'charm') { r(6,0,4,1,dark); r(7,13,2,2,dark); }
      return true;
    }
    if (icon === 'flute') {
      r(2,8,12,3,dark); r(3,7,3,1,dark); r(4,8,10,1,accent); r(3,9,11,1,main);
      r(6,7,1,1,dark); r(8,7,1,1,dark); r(10,7,1,1,dark); r(13,6,1,2,dark);
      return true;
    }
    if (icon === 'glasses') {
      r(2,6,5,5,dark); r(9,6,5,5,dark); r(7,8,2,1,dark);
      r(3,7,3,3,accent); r(10,7,3,3,accent); r(4,8,1,1,light); r(11,8,1,1,light);
      return true;
    }
    if (icon === 'pendant') {
      r(7,1,2,4,dark); r(5,5,6,2,dark); r(4,7,8,5,dark); r(6,12,4,2,dark);
      r(7,2,2,3,accent); r(6,6,4,1,accent); r(5,8,6,3,main); r(7,11,2,2,accent);
      return true;
    }
    if (icon === 'bell') {
      r(6,2,4,2,dark); r(4,4,8,8,dark); r(3,11,10,2,dark); r(7,13,2,2,dark);
      r(7,3,2,2,accent); r(5,5,6,6,main); r(4,11,8,1,accent); r(8,13,1,1,accent);
      return true;
    }
    if (icon === 'egg') {
      r(5,2,6,2,dark); r(4,4,8,8,dark); r(5,12,6,2,dark);
      r(6,3,4,2,light); r(5,5,6,7,it.color || '#fff8e8'); r(6,8,2,1,accent); r(9,6,1,1,accent);
      return true;
    }
    r(4,4,8,8,dark); r(5,5,6,6,main); r(7,7,2,2,accent);
    return true;
  }

  function drawCard(ctx, itemId, x, y, w, h, opts) {
    opts = opts || {};
    const it = ITEMS[itemId];
    if (!it || !ctx || !window.PR_UI) return false;
    window.PR_UI.panel(ctx, x, y, w, h, {
      fill:opts.fill || '#fff8e8',
      border:opts.border || '#202020',
      shadow:opts.shadow || '#c89048',
      highlight:'#fff8f0'
    });
    drawIcon(ctx, itemId, x + 7, y + 9, opts.iconSize || 26);
    const nameMax = Math.max(6, ((w - 44) / 6) | 0);
    window.PR_UI.drawText(ctx, it.name.slice(0, nameMax), x + 39, y + 7, '#202020');
    window.PR_UI.chip(ctx, x + 39, y + 18, kindLabel(it), { fill:'#e8f0ff', border:'#385890' });
    if (opts.count !== undefined) window.PR_UI.drawText(ctx, 'x' + opts.count, x + w - 24, y + 20, '#385890');
    if (opts.price !== undefined) window.PR_UI.drawText(ctx, '$' + opts.price, x + w - 42, y + 32, '#385890');
    const lines = window.PR_UI.wrap(detailText(it), Math.max(10, ((w - 14) / 6) | 0));
    const textY = y + (opts.compact ? 39 : 44);
    for (let i = 0; i < Math.min(lines.length, opts.lines || 4); i++) {
      window.PR_UI.drawText(ctx, lines[i], x + 7, textY + i * 9, '#604830');
    }
    if (opts.footer) window.PR_UI.drawText(ctx, opts.footer, x + 7, y + h - 10, '#806040');
    return true;
  }

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
    const order = ['rodball','greatball','quickball','cavernball','ultraball','potion','superpotion','hyperpotion','maxpotion','antidote','burnheal','paralyzeheal','awakening','fullheal','revive','maxrevive','oranberry','sitrusberry','pechaberry','soothe_bell','lucky_egg','lucky_charm','scholars_glasses','masters_pendant','pokeflute'];
    out.sort((a,b) => {
      const ai = order.indexOf(a.id), bi = order.indexOf(b.id);
      return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
    });
    return out;
  }

  // Look up an item def by id. Returns null if unknown so callers can
  // safely chain `(byId(x) || {}).xpMult` style patterns.
  function byId(id) { return ITEMS[id] || null; }

  function getCatchBonus(itemId, context) {
    const it = ITEMS[itemId];
    if (!it || it.kind !== 'ball') return 1;
    let bonus = it.catchBonus || 1;
    const battle = context && context.battle;
    if (it.firstTurnBonus && (!battle || (battle.turnCount || 0) === 0)) {
      bonus = Math.max(bonus, it.firstTurnBonus);
    }
    if (it.tagBonus && it.tagAny && it.tagAny.length) {
      const state = context && context.state;
      const map = (context && context.map) ||
        (state && state.world && state.world.currentMap && state.world.currentMap());
      const tags = map && Array.isArray(map.tags) ? map.tags : [];
      for (const tag of it.tagAny) {
        if (tags.includes(tag)) {
          bonus = Math.max(bonus, it.tagBonus);
          break;
        }
      }
    }
    return bonus;
  }

  // Shop inventory tiered by player badge count. tier:N rows unlock
  // once the player has N badges (so tier:0 is available from the start).
  const SHOP_TIERS = [
    { tier:0, items:['rodball','potion','antidote'] },
    { tier:1, items:['greatball','superpotion','paralyzeheal','awakening'] },
    { tier:2, items:['quickball','cavernball','burnheal','oranberry','lucky_charm','soothe_bell'] },
    { tier:3, items:['sitrusberry'] },
    { tier:4, items:['hyperpotion','revive','pechaberry','scholars_glasses','lucky_egg'] },
    { tier:5, items:['ultraball','fullheal'] },
    { tier:6, items:['maxpotion','masters_pendant'] },
    { tier:7, items:['maxrevive'] }
  ];

  // Compute the visible shop list for an NPC given player state. The
  // `shop` def may pin extra items (`extraItems`) or grant a bonus
  // tier (`bonusTier`) so a particular town can stock something early.
  function computeShopInventory(shop, state) {
    const badgeCount = (state && state.player && state.player.badges
                        ? state.player.badges.length : 0);
    const tierCap = badgeCount + ((shop && shop.bonusTier) || 0);
    const seen = new Set();
    const out = [];
    for (const row of SHOP_TIERS) {
      if (row.tier > tierCap) continue;
      for (const id of row.items) {
        if (seen.has(id)) continue;
        if (!ITEMS[id]) continue;
        seen.add(id);
        out.push(id);
      }
    }
    if (shop && Array.isArray(shop.extraItems)) {
      for (const id of shop.extraItems) {
        if (seen.has(id) || !ITEMS[id]) continue;
        seen.add(id);
        out.push(id);
      }
    }
    return out;
  }

  window.PR_ITEMS = { ITEMS, apply, add, take, listOwned, ensureBag, byId, getCatchBonus,
                      kindLabel, detailText, drawIcon, drawCard,
                      SHOP_TIERS, computeShopInventory };
})();
