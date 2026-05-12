// Achievement catalog + helpers. Triggers are scattered across
// battle.js / quests.js / world.js / shop.js / game.js; each call
// site uses PR_ACHV.unlock(state, id) and is a no-op once unlocked.
'use strict';

(function(){
  const ACHIEVEMENTS = [
    { id:'first_catch',       name:'First Friend',       desc:'Catch your first creature.' },
    { id:'ten_catches',       name:'Collector',          desc:'Catch 10 creatures.' },
    { id:'fifty_catches',     name:'Devoted Trainer',    desc:'Catch 50 creatures.' },
    { id:'first_shiny',       name:'Shining Star',       desc:'Catch a shiny creature.' },
    { id:'dex_quarter',       name:'Quarter Dex',        desc:'Register 20 species in the Dex.' },
    { id:'dex_half',          name:'Half Dex',           desc:'Register 40 species in the Dex.' },
    { id:'dex_full',          name:'Pokerod Master',     desc:'Register all 77 species.' },
    { id:'first_evolve',      name:'Growing Pains',      desc:'Witness an evolution.' },
    { id:'first_trainer_win', name:'First Victory',      desc:'Beat your first trainer.' },
    { id:'ten_trainer_wins',  name:'Battle Tested',      desc:'Beat 10 trainers.' },
    { id:'first_badge',       name:'Badge Earned',       desc:'Earn your first badge.' },
    { id:'all_badges',        name:'Eight Bright',       desc:'Earn all 8 badges.' },
    { id:'first_fish',        name:'Hook, Line, Sinker', desc:'Reel in your first creature.' },
    { id:'big_walker',        name:'Long Road',          desc:'Take 5,000 steps.' },
    { id:'rich',              name:'Well-Funded',        desc:'Hold $10,000 at once.' },
    { id:'first_quest',       name:'Quest Started',      desc:'Complete one quest.' },
    { id:'all_vendors',       name:'Tourist',            desc:'Buy from every town vendor.' },
    { id:'level_50',          name:'Veteran',            desc:'Raise a creature to level 50.' }
  ];
  const BY_ID = {};
  for (const a of ACHIEVEMENTS) BY_ID[a.id] = a;

  function ensure(state) {
    if (!state.player) state.player = {};
    if (!Array.isArray(state.player.achievements)) state.player.achievements = [];
  }

  function isUnlocked(state, id) {
    ensure(state);
    return state.player.achievements.indexOf(id) !== -1;
  }

  function unlock(state, id) {
    ensure(state);
    if (!BY_ID[id]) return false;
    if (state.player.achievements.indexOf(id) !== -1) return false;
    state.player.achievements.push(id);
    window.PR_SFX && window.PR_SFX.play && window.PR_SFX.play('confirm');
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    state.flashTrophy = { id, until: now + 2200 };
    return true;
  }

  function percentUnlocked(state) {
    ensure(state);
    return Math.floor(100 * state.player.achievements.length / ACHIEVEMENTS.length);
  }

  function get(id) { return BY_ID[id] || null; }

  window.PR_ACHV = { ACHIEVEMENTS, ensure, unlock, isUnlocked, percentUnlocked, get };
})();
