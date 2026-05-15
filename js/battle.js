// Turn-based battle state.
'use strict';

(function(){
  const VIEW_W = 240, VIEW_H = 160;

  // Battle dialog "speed" - scales the HP-bar drain rate, which gates
  // the press-to-advance check on every message. slow ~ half rate,
  // fast ~ 2x rate. Reads the live setting so the slider takes effect
  // without restarting a battle.
  function textSpeedMult() {
    const s = window.PR_SETTINGS && window.PR_SETTINGS.textSpeed;
    if (s === 'slow') return 0.55;
    if (s === 'fast') return 2.0;
    return 1.0;
  }

  // Per-biome battle backdrop palette. Default 'grass' matches the
  // colors PokeRod has shipped since v0.x. Cave / interior maps use
  // the dark variant since they encounter inside dungeons.
  const BIOME_PALETTES = {
    grass:  { sky:'#a8c0e8', ground:'#5cae4c', platTop:'#3a8030', platShadow:'#2a6020' },
    desert: { sky:'#f0c878', ground:'#d8a850', platTop:'#b07820', platShadow:'#805818' },
    snow:   { sky:'#d8e8f8', ground:'#e0e8f0', platTop:'#a8b8c8', platShadow:'#788898' },
    cave:   { sky:'#181822', ground:'#383038', platTop:'#503848', platShadow:'#302028' },
    beach:  { sky:'#b8d8f0', ground:'#f0d878', platTop:'#c8a040', platShadow:'#906838' },
    forest: { sky:'#98b890', ground:'#388838', platTop:'#205820', platShadow:'#103810' },
    rock:   { sky:'#c0c0d0', ground:'#888070', platTop:'#605848', platShadow:'#383028' }
  };
  // Cheap map-id heuristic - keeps the biome detection here rather
  // than threading a field through every map definition. Matches the
  // major outdoor and dungeon maps PokeRod ships.
  function biomeForMap(m) {
    if (!m) return 'grass';
    const id = (m.id || '').toLowerCase();
    if (m.interior || /cave|cavern|tunnel|grotto/.test(id)) return 'cave';
    if (/desert|dune/.test(id)) return 'desert';
    if (/snow|frost|peak|glacier|ice/.test(id)) return 'snow';
    if (/beach|sea|harbor|coast|searoute|tide/.test(id)) return 'beach';
    if (/wood|forest|pebble|leaf|fern|grove/.test(id)) return 'forest';
    if (/highspire|summit|rock|mountain|crest|ruins/.test(id)) return 'rock';
    return 'grass';
  }

  function Battle(state, opts) {
    this.state = state;
    this.opts = opts || {};
    this.wild = opts.wild || null;          // wild creature instance
    this.trainer = opts.trainer || null;    // { team: [mon...], reward, defeat }
    this.foeTeam = this.trainer ? this.trainer.team.slice() : [this.wild];
    this.foeIdx = 0;
    this.foe = this.foeTeam[0];
    this.partyIdx = pickFirstAlive(state.party);
    if (this.partyIdx < 0) this.partyIdx = 0;
    this.me = state.party[this.partyIdx];
    this.phase = 'intro';   // intro -> message -> menu -> ...
    this.messages = [];
    this.subPhase = null;
    this.selection = 0;
    this.subSelection = 0;
    this.runs = 0;
    this.turnCount = 0;
    this.timer = 0;
    this.outcome = null;
    this.flashTimer = 0;
    this.shakeTimer = 0;
    this.faintAnim = { foe: 0, me: 0 };
    // Per-side field state - entry hazards & screens (idea #3). 'me' is
    // the player's side, 'foe' the opponent's. reflect / lightScreen
    // are turn counters; spikes is a 0-3 layer count; stealthrock is a
    // 0/1 flag.
    this.field = {
      me:  { reflect:0, lightScreen:0, spikes:0, stealthrock:0 },
      foe: { reflect:0, lightScreen:0, spikes:0, stealthrock:0 }
    };
    // Battle-set weather - Rain Dance etc. (idea #5). PR_WEATHER's
    // currentKind() reads this off state.battle while the battle is
    // live, so calcDamage + the hail chip pick it up automatically.
    this.weather = { kind:null, turns:0 };
    // Tag battle (idea #2): an AI ally fights at your side, taking the
    // active slot in alternation with your own creatures as each
    // faints. meOwner tracks who owns the current active slot.
    this.tag = (this.trainer && this.trainer.tag) || null;
    this.allyTeam = [];
    this.meOwner = 'player';   // 'player' | 'ally'
    // Trainer-class intro flourish (idea #50): a "VS NAME" banner
    // slides across the upper third for ~1.6s on trainer encounters.
    this.trainerName = opts.trainerName || null;
    this.introBanner = this.trainer ? { t: 0, duration: 1.6 } : null;
    if (this.tag && Array.isArray(this.tag.allyTeam)) {
      const ng = (state.flags && (state.flags.ngPlusCount | 0)) * 5;
      for (const entry of this.tag.allyTeam) {
        try {
          this.allyTeam.push(window.PR_DATA.makeMon(entry[0], Math.max(1, (entry[1]|0) + ng)));
        } catch (_) { /* skip unknown species */ }
      }
    }
    // Guard against missing party / foe so a corrupted save can't freeze
    // the game on battle start. We bail out cleanly instead of throwing.
    if (!this.me || !this.foe) {
      this.hpAnim = { foe: 0, me: 0 };
      this.phase = 'message';
      this.messages.push('Something went wrong... fleeing!');
      this.afterMessages = () => { this.phase = 'ran'; };
      return;
    }
    this.hpAnim = { foe: this.foe.hp, me: this.me.hp };
    // Pokedex: mark every foe in this battle as seen.
    if (window.PR_DEX) {
      for (const f of this.foeTeam) if (f && f.species) window.PR_DEX.markSeen(f.species);
    }
    this.startIntroMessages();
    // Opening switch-in hooks (Intimidate, idea #1). Hazards are empty
    // at battle start, so only abilities fire here.
    this._onSwitchIn(this.foe, 'foe');
    this._onSwitchIn(this.me, 'me');
  }

  function pickFirstAlive(party) {
    for (let i = 0; i < party.length; i++) if (party[i].hp > 0) return i;
    return -1;
  }

  Battle.prototype.startIntroMessages = function() {
    if (this.trainer) {
      if (this.tag) {
        this.queue((this.tag.foeName || 'An opposing duo') + ' want to battle!');
        this.queue((this.tag.allyName || 'An ally') + ' joined your side!');
      } else {
        this.queue('A trainer wants to battle!');
      }
      this.queue('Sent out ' + this.foe.nickname + '!');
    } else {
      this.queue('A wild ' + this.foe.nickname + ' appeared!');
      if (this.foe.shiny) this.queue('It is shiny! What a rare find!');
    }
    this.queue('Go, ' + this.me.nickname + '!');
    this.phase = 'message';
    this.afterMessages = () => { this.phase = 'menu'; this.selection = 0; };
  };

  Battle.prototype.queue = function(msg) {
    this.messages.push(msg);
  };

  Battle.prototype.currentMessage = function() {
    return this.messages[0] || '';
  };

  Battle.prototype.update = function(dt) {
    this.timer += dt;
    if (this.flashTimer > 0) this.flashTimer -= dt;
    if (this.shakeTimer > 0) this.shakeTimer -= dt;
    if (this.activeAnim) {
      this.activeAnim.t += dt;
      if (this.activeAnim.t >= this.activeAnim.duration) this.activeAnim = null;
    }
    if (this.ballAnim) {
      this.ballAnim.t += dt;
      if (this.ballAnim.t >= this.ballAnim.duration) this.ballAnim = null;
    }
    if (this.introBanner) {
      this.introBanner.t += dt;
      if (this.introBanner.t >= this.introBanner.duration) this.introBanner = null;
    }

    // Animate hp bars toward target. The rate scales with the
    // textSpeed setting so the player isn't forced to wait through a
    // long drain on "fast" - the message gate at line 94 won't release
    // until hpAnim catches up, so this also makes battle dialog
    // perceptibly snappier overall.
    const mult = textSpeedMult();
    const tickHp = (cur, target) => {
      if (cur < target) return Math.min(target, cur + 60*dt*mult);
      if (cur > target) return Math.max(target, cur - 60*dt*mult);
      return cur;
    };
    this.hpAnim.foe = tickHp(this.hpAnim.foe, this.foe.hp);
    this.hpAnim.me  = tickHp(this.hpAnim.me,  this.me.hp);

    if (this.phase === 'intro') return;

    if (this.phase === 'message') {
      if (window.PR_INPUT.consumePressed('z') || window.PR_INPUT.consumePressed('Enter')) {
        if (this.hpAnim.foe !== this.foe.hp || this.hpAnim.me !== this.me.hp) return;
        this.messages.shift();
        if (!this.messages.length) {
          if (this.afterMessages) { const f = this.afterMessages; this.afterMessages = null; f(); }
          // If a 5th-move learn is pending, override and drop into learnmove.
          if (this._pendingLearn && this._pendingLearn.length && this.phase !== 'learnmove') {
            this._enterLearnMove();
          }
        }
      }
      return;
    }
    if (this.phase === 'learnmove') return this.updateLearnMove();

    try {
      if (this.phase === 'menu') {
        // Tag battle: the AI ally auto-acts when it holds the slot.
        if (this.meOwner === 'ally') return this._allyTurn();
        // Recharge (idea #4): last turn the user fired a recharge
        // move (Hyper Beam etc.); this turn is a forfeit.
        if (this.me.mustRecharge) return this._rechargeTurn();
        // Charge (idea #4): force the firing turn of a 2-turn move.
        if (this.me.chargingMove) {
          const m = this.me.moves.find(mv => mv.id === this.me.chargingMove);
          if (m) { this.queueTurn(m); return; }
          this.me.chargingMove = null;   // defensive: not in moveset
        }
        return this.updateMenu();
      }
      if (this.phase === 'fight')  return this.updateFight();
      if (this.phase === 'party')  return this.updateParty();
      if (this.phase === 'turn')   return this.updateTurn(dt);
      if (this.phase === 'faint')  return this.updateFaint(dt);
      if (this.phase === 'won')    return this.updateOutcome();
      if (this.phase === 'lost')   return this.updateOutcome();
      if (this.phase === 'ran')    return this.updateOutcome();
      if (this.phase === 'caught') return this.updateOutcome();
    } catch (err) {
      console.error('[PokeRod] battle update error:', err);
      this.messages.length = 0;
      this.queue('A glitch interrupted the battle!');
      this.phase = 'message';
      this.afterMessages = () => { this.phase = 'ran'; };
    }
  };

  Battle.prototype.updateMenu = function() {
    const I = window.PR_INPUT;
    if (I.consumePressed('ArrowRight')) this.selection = (this.selection + 1) & 3;
    if (I.consumePressed('ArrowLeft'))  this.selection = (this.selection + 3) & 3;
    if (I.consumePressed('ArrowDown'))  this.selection = (this.selection + 2) & 3;
    if (I.consumePressed('ArrowUp'))    this.selection = (this.selection + 2) & 3;
    if (I.consumePressed('z')) {
      if (this.selection === 0) { this.phase = 'fight'; this.subSelection = 0; }
      else if (this.selection === 1) { this.tryRun(); }
      else if (this.selection === 2) { this.phase = 'party'; this.subSelection = 0; }
      else if (this.selection === 3) {
        // Open bag instead of directly throwing.
        if (window.PR_GAME && window.PR_GAME.openBagFromBattle) window.PR_GAME.openBagFromBattle();
        else this.tryThrowBall();
      }
    }
  };

  Battle.prototype.updateFight = function() {
    const I = window.PR_INPUT;
    const moves = this.me.moves;
    if (I.consumePressed('ArrowRight')) this.subSelection = Math.min(moves.length - 1, this.subSelection + 1);
    if (I.consumePressed('ArrowLeft'))  this.subSelection = Math.max(0, this.subSelection - 1);
    if (I.consumePressed('ArrowDown'))  this.subSelection = Math.min(moves.length - 1, this.subSelection + 2);
    if (I.consumePressed('ArrowUp'))    this.subSelection = Math.max(0, this.subSelection - 2);
    if (I.consumePressed('x')) { this.phase = 'menu'; return; }
    if (I.consumePressed('z')) {
      const m = moves[this.subSelection];
      if (!m || m.pp <= 0) { this.flashMsg('No PP left for that move!'); return; }
      this.queueTurn(m);
    }
  };

  // Public API for the bottom-screen tap handler. Picks move idx from
  // the current partner's roster regardless of current phase (menu or
  // fight). No-op during turn animations / messages.
  Battle.prototype.chooseMove = function(idx) {
    if (this.phase !== 'menu' && this.phase !== 'fight') return false;
    // Tag battle: the AI ally's slot isn't player-controllable.
    if (this.meOwner === 'ally') return false;
    const moves = this.me && this.me.moves;
    if (!moves) return false;
    const m = moves[idx];
    if (!m) return false;
    if (m.pp <= 0) { this.flashMsg('No PP left for that move!'); return false; }
    this.subSelection = idx;
    this.phase = 'fight';
    this.queueTurn(m);
    return true;
  };

  // Public API: return to the main battle menu from a sub-phase.
  Battle.prototype.cancelMenu = function() {
    if (this.phase === 'fight' || this.phase === 'party') {
      this.phase = 'menu';
      return true;
    }
    return false;
  };

  Battle.prototype.updateParty = function() {
    const I = window.PR_INPUT;
    const party = this.state.party;
    if (I.consumePressed('ArrowDown')) this.subSelection = Math.min(party.length - 1, this.subSelection + 1);
    if (I.consumePressed('ArrowUp'))   this.subSelection = Math.max(0, this.subSelection - 1);
    if (I.consumePressed('x')) { this.phase = 'menu'; return; }
    if (I.consumePressed('z')) {
      const idx = this.subSelection;
      if (idx === this.partyIdx) { this.flashMsg("It's already in battle!"); return; }
      if (party[idx].hp <= 0) { this.flashMsg("That one has no strength left!"); return; }
      this.swapTo(idx, false);
    }
  };

  Battle.prototype.flashMsg = function(text) {
    this.queue(text);
    this.phase = 'message';
    this.afterMessages = () => { this.phase = 'menu'; };
  };

  Battle.prototype.queueTurn = function(myMove) {
    // Trainer AI: spend one super-potion when foe is below 30% HP.
    if (this.trainer && !this._trainerItemUsed && this.foe.hp > 0
        && (this.foe.hp / this.foe.stats.hp) < 0.30) {
      this._trainerItemUsed = true;
      const heal = Math.min(this.foe.stats.hp, this.foe.hp + 50);
      const before = this.foe.hp;
      this.foe.hp = heal;
      this.queue('Trainer used SUPER POTION!');
      this.queue('Foe ' + this.foe.nickname + ' recovered ' + (heal - before) + ' HP.');
      this.phase = 'message';
      this.afterMessages = () => { this.phase = 'menu'; this.selection = 0; };
      return;
    }
    const foeMove = pickFoeMove(this.foe, this.me);
    const myPriority = (window.PR_DATA.MOVES[myMove.id].priority || 0);
    const foePriority = (window.PR_DATA.MOVES[foeMove.id].priority || 0);
    const meSpeed = effectiveSpeed(this.me);
    const foeSpeed = effectiveSpeed(this.foe);
    let order;
    if (myPriority !== foePriority) order = myPriority > foePriority ? ['me','foe'] : ['foe','me'];
    else if (meSpeed === foeSpeed) order = Math.random() < 0.5 ? ['me','foe'] : ['foe','me'];
    else order = meSpeed > foeSpeed ? ['me','foe'] : ['foe','me'];
    // Quick Claw (idea #16): roll once per holder; lets them strike
    // first regardless of speed when priorities are tied. If both
    // sides roll, the original speed-based order stands.
    if (myPriority === foePriority) {
      const ITEMS = window.PR_ITEMS && window.PR_ITEMS.ITEMS;
      const meIt  = ITEMS && this.me.held  && ITEMS[this.me.held];
      const foeIt = ITEMS && this.foe.held && ITEMS[this.foe.held];
      const meQ  = !!(meIt  && meIt.quickClaw  && Math.random() < (meIt.quickClawChance  || 0.2));
      const foeQ = !!(foeIt && foeIt.quickClaw && Math.random() < (foeIt.quickClawChance || 0.2));
      if (meQ && !foeQ) order = ['me','foe'];
      else if (foeQ && !meQ) order = ['foe','me'];
    }
    this.turnOrder = order;
    this.turnMoves = { me: myMove, foe: foeMove };
    this.turnStep = 0;
    this.phase = 'turn';
  };

  function effectiveSpeed(mon) {
    let spe = mon.stats.spe;
    const mult = stageMult(mon.statStages.spe || 0);
    spe = Math.floor(spe * mult);
    if (mon.status === 'paralyzed') spe = Math.floor(spe / 2);
    return spe;
  }
  function stageMult(s) {
    if (s >= 0) return (2 + s) / 2;
    return 2 / (2 - s);
  }

  function pickFoeMove(foe, defender) {
    // Charge (idea #4): locked into the firing turn of a 2-turn move.
    if (foe.chargingMove) {
      const fm = foe.moves.find(mv => mv.id === foe.chargingMove);
      if (fm) return fm;
    }
    const usable = foe.moves.filter(m => m.pp > 0);
    const pool = usable.length ? usable : foe.moves;
    if (!defender || Math.random() < 0.15) {
      // 15% pure-random for variety / wild creatures.
      return pool[Math.floor(Math.random() * pool.length)];
    }
    // Score every move by best-case damage (or status utility).
    let best = pool[0], bestScore = -1;
    for (const m of pool) {
      const def = window.PR_DATA.MOVES[m.id];
      if (!def) continue;
      let score = 0;
      if (def.kind === 'status') {
        // Status moves are useful early and against full-health targets.
        score = (defender.hp === defender.stats.hp) ? 35 : 5;
        if (def.sleepChance && !defender.status) score += 25;
        if (def.confuseChance && !defender.confusionTurns) score += 20;
      } else {
        const r = window.PR_DATA.calcDamage(foe, defender, def, false);
        score = r ? r.dmg : 0;
        if (r && r.eff > 1) score += 10;
        if (r && r.eff < 1) score -= 5;
      }
      if (score > bestScore) { bestScore = score; best = m; }
    }
    return best;
  }

  // Switch-in matchup preview (idea #7): how the current foe's types
  // would hit a candidate party member, accounting for Levitate.
  // Returns a small {tag,color} badge, or null for a neutral matchup.
  function switchMatchup(foe, mon) {
    const D = window.PR_DATA;
    if (!foe || !mon || !D) return null;
    const foeTypes = (D.CREATURES[foe.species] || {}).types || [];
    const monTypes = (D.CREATURES[mon.species] || {}).types || [];
    const monAbil = D.abilityOf(mon.species);
    let worst = 1, best = 1;
    for (const ft of foeTypes) {
      let e = D.effectiveness(ft, monTypes);
      if (monAbil === 'levitate' && ft === 'GROUND') e = 0;
      worst = Math.max(worst, e);
      best = Math.min(best, e);
    }
    if (worst >= 4) return { tag:'RISK!', color:'#d83030' };
    if (worst >= 2) return { tag:'RISK',  color:'#c84838' };
    if (best === 0) return { tag:'WALL',  color:'#3088c8' };
    if (best < 1)   return { tag:'GOOD',  color:'#208830' };
    return null;
  }

  Battle.prototype.updateTurn = function(dt) {
    if (this.messages.length) {
      this.phase = 'message';
      this.afterMessages = () => { this.phase = 'turn'; };
      return;
    }
    if (this.turnStep >= this.turnOrder.length) {
      this.endOfTurn();
      return;
    }
    const who = this.turnOrder[this.turnStep++];
    const attacker = who === 'me' ? this.me : this.foe;
    const defender = who === 'me' ? this.foe : this.me;
    const move = this.turnMoves[who];
    if (attacker.hp <= 0 || defender.hp <= 0) return;
    this.executeMove(who, attacker, defender, move);
  };

  Battle.prototype.executeMove = function(who, attacker, defender, move) {
    const def = window.PR_DATA.MOVES[move.id];
    // Recharge turn (idea #4): foe was locked from a recharge move
    // last turn; skip its action with a one-line message. (The player
    // side is gated at update() dispatch and never lands here.)
    if (attacker.mustRecharge) {
      this.queue(attacker.nickname + ' must recharge!');
      attacker.mustRecharge = false;
      return;
    }
    // Charge turn vs firing turn (idea #4). PP is paid on the charge
    // turn so we don't double-decrement.
    if (def.charge && attacker.chargingMove !== move.id) {
      move.pp = Math.max(0, move.pp - 1);
      attacker.chargingMove = move.id;
      this.queue(attacker.nickname + ' is charging ' + def.name + '!');
      return;
    }
    if (attacker.chargingMove === move.id) {
      attacker.chargingMove = null;
      this.queue(attacker.nickname + ' unleashed ' + def.name + '!');
    } else {
      move.pp = Math.max(0, move.pp - 1);
      this.queue(attacker.nickname + ' used ' + def.name + '!');
    }

    // Pre-move status checks.
    if (attacker.status === 'paralyzed' && Math.random() < 0.25) {
      this.queue(attacker.nickname + ' is paralyzed and could not move!');
      return;
    }
    if (attacker.status === 'asleep') {
      if ((attacker.sleepTurns || 0) > 0 && Math.random() > 0.25) {
        attacker.sleepTurns--;
        this.queue(attacker.nickname + ' is fast asleep!');
        return;
      }
      attacker.status = null;
      attacker.sleepTurns = 0;
      this.queue(attacker.nickname + ' woke up!');
    }
    if (attacker.status === 'frozen') {
      if (Math.random() > 0.20) {
        this.queue(attacker.nickname + ' is frozen solid!');
        return;
      }
      attacker.status = null;
      this.queue(attacker.nickname + ' thawed out!');
    }
    if (attacker.confusionTurns > 0) {
      attacker.confusionTurns--;
      this.queue(attacker.nickname + ' is confused...');
      if (Math.random() < 0.5) {
        // Hit itself.
        const self = Math.max(1, Math.floor(attacker.stats.atk / 4));
        attacker.hp = Math.max(0, attacker.hp - self);
        this.queue(attacker.nickname + ' hurt itself in confusion!');
        if (attacker === this.me) this.shakeTimer = 0.2; else this.flashTimer = 0.2;
        return;
      }
      if (attacker.confusionTurns === 0) this.queue(attacker.nickname + ' snapped out of confusion!');
    }

    // Accuracy. Wide Lens (idea #16) bumps the move's accuracy by 10
    // (clamped to 100) for whoever's holding it.
    let acc = def.accuracy;
    if (acc && attacker.held) {
      const it = window.PR_ITEMS && window.PR_ITEMS.ITEMS && window.PR_ITEMS.ITEMS[attacker.held];
      if (it && it.wideLens) acc = Math.min(100, acc + (it.wideLensBonus || 10));
    }
    if (acc && Math.random() * 100 > acc) {
      this.queue(attacker.nickname + "'s attack missed!");
      return;
    }

    if (def.kind === 'status') {
      if (def.dud) { this.queue('But nothing happened!'); return; }
      // Field moves: screens / hazards / weather (ideas #3, #5).
      if (def.setScreen || def.setHazard || def.setWeather) {
        this._applyFieldMove(who, def);
        return;
      }
      // Focus Energy etc. (idea #9): bumps the user's persistent
      // crit-stage counter, consumed inside the damage calc below.
      if (def.critBoost) {
        const before = attacker.critStage || 0;
        attacker.critStage = Math.min(4, before + def.critBoost);
        this.queue(attacker.nickname + ' is getting pumped!');
        return;
      }
      if (def.statChange) {
        const target = def.statChange.target === 'foe' ? defender : attacker;
        const stat = def.statChange.stat;
        target.statStages[stat] = Math.max(-6, Math.min(6, (target.statStages[stat] || 0) + def.statChange.stages));
        const verb = def.statChange.stages > 0 ? 'rose!' : 'fell!';
        const owner = target === this.me ? this.me.nickname : 'Foe ' + this.foe.nickname;
        this.queue(owner + "'s " + stat.toUpperCase() + ' ' + verb);
      }
      // Status moves can also carry sleep / confuse / poison / etc. chances.
      this._applyMoveSideEffects(def, defender);
      return;
    }

    // Damage move.
    // Ability (idea #1): Water Absorb / Volt Absorb turn an incoming
    // move of the matching type into healing instead of damage.
    const defAbil = window.PR_DATA.abilityOf(defender.species);
    if ((defAbil === 'waterabsorb' && def.type === 'WATER') ||
        (defAbil === 'voltabsorb'  && def.type === 'ELECTRIC')) {
      const abilName = window.PR_DATA.ABILITIES[defAbil].name;
      if (defender.hp >= defender.stats.hp) {
        this.queue(defender.nickname + "'s " + abilName + ' made it useless!');
      } else {
        const heal = Math.max(1, Math.floor(defender.stats.hp / 4));
        const before = defender.hp;
        defender.hp = Math.min(defender.stats.hp, defender.hp + heal);
        this.queue(defender.nickname + ' drew it in with ' + abilName + '!');
        this.queue(defender.nickname + ' restored ' + (defender.hp - before) + ' HP.');
      }
      return;
    }
    // Crit stage (idea #9): persistent attacker.critStage rises via
    // Focus Energy etc.; highCrit moves get +1 stage on top.
    const cs = Math.min(4, (attacker.critStage || 0) + (def.highCrit ? 1 : 0));
    const CRIT_RATES = [1/16, 1/8, 1/2, 1, 1];
    const isCrit = Math.random() < CRIT_RATES[cs];
    const result = window.PR_DATA.calcDamage(attacker, defender, def, isCrit);
    let totalDmg = result.dmg;
    if (def.multi) {
      const [lo, hi] = def.multi;
      const hits = lo + Math.floor(Math.random() * (hi - lo + 1));
      totalDmg = result.dmg * hits;
      this.queue('It hit ' + hits + ' times!');
    }
    // Screens (idea #3): Reflect halves physical damage, Light Screen
    // halves special, on the defender's side. Crits punch through.
    if (totalDmg > 0 && !result.crit) {
      const dSide = (defender === this.me) ? this.field.me : this.field.foe;
      if (def.kind === 'physical' && dSide.reflect > 0) {
        totalDmg = Math.max(1, Math.floor(totalDmg / 2));
      } else if (def.kind === 'special' && dSide.lightScreen > 0) {
        totalDmg = Math.max(1, Math.floor(totalDmg / 2));
      }
    }
    // Focus Sash / Sturdy - if the defender was at full HP and this hit
    // would faint them, hold them at 1 HP. The Sash is consumed; the
    // Sturdy ability (idea #1) is passive and is not used up.
    if (totalDmg >= defender.hp && defender.hp === defender.stats.hp) {
      const it = defender.held && window.PR_ITEMS && window.PR_ITEMS.ITEMS && window.PR_ITEMS.ITEMS[defender.held];
      if (it && it.focusSash) {
        totalDmg = defender.hp - 1;
        defender.held = null;
        this.queue(defender.nickname + ' held on with its ' + it.name + '!');
      } else if (defAbil === 'sturdy') {
        totalDmg = defender.hp - 1;
        this.queue(defender.nickname + ' endured the hit with Sturdy!');
      }
    }
    defender.hp = Math.max(0, defender.hp - totalDmg);
    // Trigger move animation on the defender's side. Per-move VFX is
    // delegated to PR_MOVE_FX (js/move_effects.js); duration depends on
    // the specific effect (some signature moves run longer).
    const fxDur = (window.PR_MOVE_FX && window.PR_MOVE_FX.durationFor)
      ? window.PR_MOVE_FX.durationFor(move.id, def.type) : 0.45;
    this.activeAnim = {
      moveId: move.id,
      type: def.type,
      target: who === 'me' ? 'foe' : 'me',
      crit: !!result.crit,
      t: 0, duration: fxDur
    };
    if (who === 'me') this.shakeTimer = 0.3; else this.flashTimer = 0.2;
    // Critical hit: extra brief sprite-zoom pulse before the type effect
    // plays (DS Diamond only). Sets a small timer the renderer reads.
    if (result.crit) {
      this.critPulse = 0.25;
      this.critPulseTarget = this.activeAnim.target;
    }
    if (window.PR_SFX) {
      if (result.crit) window.PR_SFX.play('crit');
      else if (result.eff > 1) window.PR_SFX.play('super');
      else if (result.eff < 1 && result.eff > 0) window.PR_SFX.play('weak');
      else window.PR_SFX.play('hit');
    }
    if (result.crit) this.queue('A critical hit!');
    if (result.eff > 1) this.queue("It's super effective!");
    else if (result.eff === 0) this.queue(result.immuneAbility
      ? defender.nickname + "'s " + window.PR_DATA.ABILITIES[result.immuneAbility].name + ' makes it immune!'
      : "It doesn't affect " + defender.nickname + '...');
    else if (result.eff < 1) this.queue("It's not very effective...");

    // Side-effect chances (status moves use the same helper above).
    this._applyMoveSideEffects(def, defender);

    // Contact abilities (idea #1): a physical hit that lands on a
    // Static / Flame Body holder may paralyze or burn the attacker.
    if (def.kind === 'physical' && defender.hp > 0 && attacker.hp > 0 && !attacker.status) {
      const aTypes = window.PR_DATA.CREATURES[attacker.species].types;
      if (defAbil === 'static' && Math.random() < 0.3) {
        attacker.status = 'paralyzed';
        this.queue(attacker.nickname + ' was paralyzed by ' + defender.nickname + "'s Static!");
      } else if (defAbil === 'flamebody' && Math.random() < 0.3 && !aTypes.includes('FIRE')) {
        attacker.status = 'burned';
        this.queue(attacker.nickname + ' was burned by ' + defender.nickname + "'s Flame Body!");
      }
    }
    // Recoil (idea #10): the attacker takes a fraction of damage dealt.
    if (def.recoil && totalDmg > 0 && attacker.hp > 0) {
      const recoil = Math.max(1, Math.floor(totalDmg * def.recoil));
      attacker.hp = Math.max(0, attacker.hp - recoil);
      this.queue(attacker.nickname + ' was hit by recoil!');
    }
    // Drain (idea #10): the attacker heals a fraction of damage dealt.
    if (def.drain && totalDmg > 0 && attacker.hp > 0 && attacker.hp < attacker.stats.hp) {
      const heal = Math.max(1, Math.floor(totalDmg * def.drain));
      const before = attacker.hp;
      attacker.hp = Math.min(attacker.stats.hp, attacker.hp + heal);
      this.queue(attacker.nickname + ' drained ' + (attacker.hp - before) + ' HP!');
    }
    // Recharge moves (idea #4) leave the attacker stunned next turn.
    if (def.recharge && attacker.hp > 0) attacker.mustRecharge = true;
  };

  // Creature mark roll (idea #20). Priority order: shimmer (shiny)
  // beats everything; otherwise the first matching context tag wins.
  // Most ordinary catches return null.
  Battle.prototype._pickCatchMark = function() {
    if (!this.foe) return null;
    if (this.foe.shiny) return 'shimmer';
    const W = window.PR_WEATHER && window.PR_WEATHER.currentKind && window.PR_WEATHER.currentKind();
    if (W === 'rain' || W === 'thunder' || W === 'hail' || W === 'hurricane') return 'stormcaught';
    const phase = (window.PR_GAME && window.PR_GAME.currentPhase && window.PR_GAME.currentPhase()) || null;
    if (phase === 'night') return 'nocturnal';
    const combo = this.state.player && this.state.player.catchCombo;
    if (combo && combo.species === this.foe.species && combo.count >= 5) return 'sparker';
    const maxHp = this.foe.stats.hp || 1;
    if (this.foe.hp / maxHp < 0.10) return 'weakened';
    if (this.foe.hp === maxHp) return 'pristine';
    if (this.foe.level <= 5) return 'rookie';
    if (this.foe.level >= 30) return 'veteran';
    return null;
  };

  // Trainer-class intro banner (idea #50). Slides in from the right,
  // holds for ~1s, slides out to the left. Drawn over the upper-band
  // platform area so it doesn't fight HP boxes or menus.
  Battle.prototype.drawTrainerBanner = function(ctx) {
    if (!this.introBanner) return;
    const k = Math.max(0, Math.min(1, this.introBanner.t / this.introBanner.duration));
    let xOff = 0;
    if (k < 0.18)      xOff = (1 - k / 0.18) * VIEW_W;
    else if (k > 0.82) xOff = -((k - 0.82) / 0.18) * VIEW_W;
    ctx.save();
    ctx.fillStyle = 'rgba(8,4,20,0.78)';
    ctx.fillRect(xOff, 48, VIEW_W, 14);
    ctx.fillStyle = window.PR_UI.pf('#f0c020');
    ctx.fillRect(xOff,     48, 3, 14);
    ctx.fillRect(xOff,     61, VIEW_W, 1);
    window.PR_UI.drawText(ctx, 'VS', xOff + 8, 51, '#f0c020');
    const name = (this.trainerName || 'TRAINER').toUpperCase().slice(0, 24);
    window.PR_UI.drawText(ctx, name, xOff + 24, 51, '#fff8e0');
    ctx.restore();
  };

  // Player-side recharge turn (idea #4): forfeit the player's action,
  // foe still acts. Mirrors how voluntary-swap surrenders the turn.
  Battle.prototype._rechargeTurn = function() {
    this.queue(this.me.nickname + ' must recharge!');
    this.me.mustRecharge = false;
    const foeMove = pickFoeMove(this.foe, this.me);
    this.turnOrder = ['foe'];
    this.turnMoves = { foe: foeMove };
    this.turnStep = 0;
    this.phase = 'turn';
  };

  // Apply any chance-based status side-effects defined on the move def
  // (burn / paralyze / poison / freeze / sleep / confuse). Skips if the
  // defender has already fainted from this hit.
  Battle.prototype._applyMoveSideEffects = function(def, defender) {
    if (defender.hp <= 0) return;
    const types = window.PR_DATA.CREATURES[defender.species].types;
    if (def.burnChance && Math.random() < def.burnChance) {
      if (!defender.status && !types.includes('FIRE')) {
        defender.status = 'burned';
        this.queue(defender.nickname + ' was burned!');
      }
    }
    if (def.paralyzeChance && Math.random() < def.paralyzeChance) {
      if (!defender.status) {
        defender.status = 'paralyzed';
        this.queue(defender.nickname + ' was paralyzed!');
      }
    }
    if (def.poisonChance && Math.random() < def.poisonChance) {
      if (!defender.status && !types.includes('POISON')) {
        defender.status = 'poisoned';
        this.queue(defender.nickname + ' was poisoned!');
      }
    }
    if (def.freezeChance && Math.random() < def.freezeChance) {
      if (!defender.status && !types.includes('ICE')) {
        defender.status = 'frozen';
        this.queue(defender.nickname + ' was frozen solid!');
      }
    }
    if (def.sleepChance && Math.random() < def.sleepChance) {
      if (!defender.status) {
        defender.status = 'asleep';
        defender.sleepTurns = 1 + Math.floor(Math.random() * 3);
        this.queue(defender.nickname + ' fell asleep!');
      }
    }
    if (def.confuseChance && Math.random() < def.confuseChance) {
      if (!defender.confusionTurns) {
        defender.confusionTurns = 2 + Math.floor(Math.random() * 3);
        this.queue(defender.nickname + ' became confused!');
      }
    }
  };

  // Switch-in hooks: entry hazards (idea #3) and Intimidate (idea #1).
  // sideKey is the side the incoming creature belongs to ('me'|'foe').
  Battle.prototype._onSwitchIn = function(mon, sideKey) {
    if (!mon || mon.hp <= 0) return;
    const D = window.PR_DATA;
    const f = this.field[sideKey];
    // Entry hazards laid on this side bite the incoming creature.
    if (f && f.stealthrock) {
      const eff = D.effectiveness('ROCK', D.CREATURES[mon.species].types);
      const dmg = Math.max(1, Math.floor(mon.stats.hp * eff / 8));
      mon.hp = Math.max(0, mon.hp - dmg);
      this.queue('Pointed stones dug into ' + mon.nickname + '!');
    }
    if (mon.hp > 0 && f && f.spikes > 0) {
      const types = D.CREATURES[mon.species].types;
      // Spikes are a ground hazard - flyers and Levitate float over.
      const grounded = !types.includes('FLYING') && D.abilityOf(mon.species) !== 'levitate';
      if (grounded) {
        const denom = f.spikes >= 3 ? 4 : (f.spikes === 2 ? 6 : 8);
        const dmg = Math.max(1, Math.floor(mon.stats.hp / denom));
        mon.hp = Math.max(0, mon.hp - dmg);
        this.queue(mon.nickname + ' was hurt by spikes!');
      }
    }
    if (mon.hp <= 0) return;
    // Intimidate drops the opposing active creature's ATK one stage.
    if (D.abilityOf(mon.species) === 'intimidate') {
      const target = sideKey === 'me' ? this.foe : this.me;
      if (target && target.hp > 0 && (target.statStages.atk || 0) > -6) {
        target.statStages.atk = Math.max(-6, (target.statStages.atk || 0) - 1);
        const owner = target === this.me ? this.me.nickname : 'Foe ' + this.foe.nickname;
        this.queue(mon.nickname + "'s Intimidate cut " + owner + "'s ATK!");
      }
    }
  };

  // Resolve a screen / hazard / weather move (ideas #3, #5). `who` is
  // the side that used the move ('me'|'foe').
  Battle.prototype._applyFieldMove = function(who, def) {
    const mySide  = who === 'me' ? 'me'  : 'foe';
    const foeSide = who === 'me' ? 'foe' : 'me';
    const ownerWord = who === 'me' ? 'your' : "the foe's";
    if (def.setScreen) {
      const f = this.field[mySide];
      const key = def.setScreen === 'lightscreen' ? 'lightScreen' : 'reflect';
      if (f[key] > 0) { this.queue('But it failed!'); return; }
      f[key] = 5;
      this.queue(def.setScreen === 'lightscreen'
        ? 'Light Screen shielded ' + ownerWord + ' team!'
        : 'Reflect shielded ' + ownerWord + ' team!');
      return;
    }
    if (def.setHazard) {
      const f = this.field[foeSide];
      if (def.setHazard === 'stealthrock') {
        if (f.stealthrock) { this.queue('But it failed!'); return; }
        f.stealthrock = 1;
        this.queue('Pointed stones float around the foe!');
      } else {
        if (f.spikes >= 3) { this.queue('But it failed!'); return; }
        f.spikes++;
        this.queue('Spikes were scattered at the foe!');
      }
      return;
    }
    if (def.setWeather) {
      this.weather = { kind: def.setWeather, turns: 5 };
      this.queue(({
        rain:    'It started to rain!',
        thunder: 'A thunderstorm rolled in!',
        hail:    'It started to hail!'
      })[def.setWeather] || 'The weather changed!');
      return;
    }
  };

  // Tag battle (idea #2): the AI ally auto-picks a move when it holds
  // the active slot. Reuses the foe move-picker for parity.
  Battle.prototype._allyTurn = function() {
    const moves = this.me && this.me.moves;
    if (!moves || !moves.length) {
      // Defensive: an ally with no usable moves just forfeits the turn
      // to the foe (also avoids re-dispatching into this same handler).
      this.turnOrder = ['foe'];
      this.turnMoves = { foe: pickFoeMove(this.foe, this.me) };
      this.turnStep = 0;
      this.phase = 'turn';
      return;
    }
    this.queueTurn(pickFoeMove(this.me, this.foe));
  };

  // Tag battle: find the next creature to occupy the player's side,
  // alternating ownership (you <-> ally) and falling back to the same
  // owner if the other side is wiped out. Returns {owner, idx} or null.
  Battle.prototype._tagNextMeSlot = function() {
    const benchOf = (owner) => owner === 'ally' ? this.allyTeam : this.state.party;
    const firstAlive = (owner) => {
      const bench = benchOf(owner);
      for (let i = 0; i < bench.length; i++) {
        const m = bench[i];
        if (m && m.hp > 0 && !(owner === this.meOwner && i === this.partyIdx)) return i;
      }
      return -1;
    };
    const other = this.meOwner === 'player' ? 'ally' : 'player';
    let idx = firstAlive(other);
    if (idx >= 0) return { owner: other, idx };
    idx = firstAlive(this.meOwner);
    if (idx >= 0) return { owner: this.meOwner, idx };
    return null;
  };

  Battle.prototype._enterLearnMove = function() {
    const entry = this._pendingLearn.shift();
    if (!entry) return;
    // Backwards compatible: accept either a bare moveId (old shape) or
    // an { mvId, target } object (new shape from party-wide XP).
    const newId  = (typeof entry === 'string') ? entry : entry.mvId;
    const target = (typeof entry === 'string') ? this.me : entry.target;
    this._learnContext = { newId, slot: 0, target };
    this.phase = 'learnmove';
  };

  Battle.prototype.updateLearnMove = function() {
    const I = window.PR_INPUT;
    const c = this._learnContext;
    const target = c.target || this.me;
    const moves = target.moves;
    if (I.consumePressed('ArrowRight')) c.slot = Math.min(4, c.slot + 1);
    if (I.consumePressed('ArrowLeft'))  c.slot = Math.max(0, c.slot - 1);
    if (I.consumePressed('ArrowDown'))  c.slot = Math.min(4, c.slot + 2);
    if (I.consumePressed('ArrowUp'))    c.slot = Math.max(0, c.slot - 2);
    if (I.consumePressed('x')) {
      // Give up - skip this move.
      this.queue(target.nickname + ' did not learn ' +
        window.PR_DATA.MOVES[c.newId].name + '.');
      this._learnContext = null;
      this._afterLearn();
      return;
    }
    if (I.consumePressed('z')) {
      if (c.slot === 4) {
        // Slot 4 is "GIVE UP".
        this.queue(target.nickname + ' did not learn ' +
          window.PR_DATA.MOVES[c.newId].name + '.');
      } else {
        const oldId = moves[c.slot] && moves[c.slot].id;
        const m = window.PR_DATA.MOVES[c.newId];
        moves[c.slot] = { id: c.newId, pp: m.pp, ppMax: m.pp };
        if (oldId) this.queue('Forgot ' + window.PR_DATA.MOVES[oldId].name + '!');
        this.queue(target.nickname + ' learned ' + m.name + '!');
      }
      this._learnContext = null;
      this._afterLearn();
    }
  };

  Battle.prototype._afterLearn = function() {
    if (this._pendingLearn && this._pendingLearn.length) {
      this.phase = 'message';
      this.afterMessages = () => this._enterLearnMove();
    } else {
      // Resume whatever was next - menu by default.
      this.phase = 'message';
      this.afterMessages = () => { this.phase = 'menu'; this.selection = 0; };
    }
  };

  Battle.prototype.endOfTurn = function() {
    this.turnCount = (this.turnCount || 0) + 1;
    // Status damage.
    const tickStatus = (mon) => {
      if (mon.hp <= 0) return;
      if (mon.status === 'burned' || mon.status === 'poisoned') {
        const dmg = Math.max(1, Math.floor(mon.stats.hp / 16));
        mon.hp = Math.max(0, mon.hp - dmg);
        this.queue(mon.nickname + ' was hurt by ' + mon.status + '!');
      }
    };
    tickStatus(this.me);
    tickStatus(this.foe);

    // Weather chip - hail buffets every non-ICE creature for 1/16 of
    // its max HP each turn. Other weather kinds don't chip (rain /
    // snow / thunder etc. are damage-modifiers only).
    const wKind = window.PR_WEATHER && window.PR_WEATHER.currentKind && window.PR_WEATHER.currentKind();
    if (wKind === 'hail') {
      const tickHail = (mon) => {
        if (!mon || mon.hp <= 0) return;
        const types = (window.PR_DATA.CREATURES[mon.species] || {}).types || [];
        if (types.indexOf('ICE') !== -1) return;
        const dmg = Math.max(1, Math.floor(mon.stats.hp / 16));
        mon.hp = Math.max(0, mon.hp - dmg);
        this.queue(mon.nickname + ' is buffeted by hail!');
      };
      tickHail(this.me);
      tickHail(this.foe);
    }

    // Leftovers - non-berry held food that heals 1/16 max HP at the
    // end of every turn until the holder is at full HP. Doesn't
    // consume; persists across battles like the rest of mon.held.
    const tickLeftovers = (mon) => {
      if (!mon || mon.hp <= 0 || mon.hp >= mon.stats.hp || !mon.held) return;
      const I = window.PR_ITEMS && window.PR_ITEMS.ITEMS && window.PR_ITEMS.ITEMS[mon.held];
      if (!I || !I.leftovers) return;
      const heal = Math.max(1, Math.floor(mon.stats.hp / 16));
      const before = mon.hp;
      mon.hp = Math.min(mon.stats.hp, mon.hp + heal);
      if (mon.hp > before) this.queue(mon.nickname + ' munched its ' + I.name + '.');
    };
    tickLeftovers(this.me);
    tickLeftovers(this.foe);

    // Held berry triggers.
    const tickBerry = (mon) => {
      if (!mon || mon.hp <= 0 || !mon.held) return;
      const I = window.PR_ITEMS && window.PR_ITEMS.ITEMS[mon.held];
      if (!I || !I.berry) return;
      let triggered = false;
      if (I.heal && mon.hp / mon.stats.hp < I.atRatio) {
        const before = mon.hp;
        mon.hp = Math.min(mon.stats.hp, mon.hp + I.heal);
        this.queue(mon.nickname + ' ate its ' + I.name + '!');
        this.queue('Restored ' + (mon.hp - before) + ' HP.');
        triggered = true;
      } else if (I.cures && mon.status && I.cures.includes(mon.status)) {
        mon.status = null;
        this.queue(mon.nickname + "'s " + I.name + ' cured its status!');
        triggered = true;
      }
      if (triggered) mon.held = null;
    };
    tickBerry(this.me);
    tickBerry(this.foe);

    // Tick down screens (idea #3) and battle weather (idea #5). The
    // hail chip above already read the battle weather via currentKind,
    // so the count-down happens after damage, as in the mainline.
    const tickScreens = (side, label) => {
      const f = this.field[side];
      if (f.reflect > 0 && --f.reflect === 0) this.queue(label + " Reflect wore off.");
      if (f.lightScreen > 0 && --f.lightScreen === 0) this.queue(label + " Light Screen wore off.");
    };
    tickScreens('me', 'Your');
    tickScreens('foe', "The foe's");
    if (this.weather.kind && this.weather.turns > 0) {
      this.weather.turns--;
      if (this.weather.turns === 0) {
        this.queue('The ' + this.weather.kind + ' let up.');
        this.weather.kind = null;
      }
    }

    if (this.foe.hp <= 0 || this.me.hp <= 0) {
      this.phase = 'faint';
      this.faintAnim = { foe: this.foe.hp <= 0 ? 0 : 1, me: this.me.hp <= 0 ? 0 : 1 };
      return;
    }
    if (this.messages.length) {
      this.phase = 'message';
      this.afterMessages = () => { this.phase = 'menu'; this.selection = 0; };
    } else {
      this.phase = 'menu';
      this.selection = 0;
    }
  };

  Battle.prototype.updateFaint = function(dt) {
    // Animate falling sprite.
    if (this.foe.hp <= 0 && this.faintAnim.foe < 1) this.faintAnim.foe = Math.min(1, this.faintAnim.foe + dt * 2);
    if (this.me.hp  <= 0 && this.faintAnim.me  < 1) this.faintAnim.me  = Math.min(1, this.faintAnim.me  + dt * 2);

    if (this.foe.hp <= 0 && this.faintAnim.foe >= 1 - 0.001) {
      this.faintAnim.foe = 1;
      window.PR_SFX && window.PR_SFX.play('faint');
      this.queue('Foe ' + this.foe.nickname + ' fainted!');
      this.awardXp();
      // Trainer: next mon, otherwise win.
      if (this.trainer) {
        this.foeIdx++;
        if (this.foeIdx < this.foeTeam.length) {
          this.foe = this.foeTeam[this.foeIdx];
          this.hpAnim.foe = this.foe.hp;
          this.faintAnim.foe = 1;
          const sender = this.tag ? (this.tag.foeName || 'The opposing pair') : 'Trainer';
          this.queue(sender + ' sent out ' + this.foe.nickname + '!');
          // Switch-in hooks for the incoming foe (hazards / Intimidate).
          this._onSwitchIn(this.foe, 'foe');
          this.afterMessages = () => {
            this.faintAnim.foe = 0; // reset slide-in next render
            if (this.foe.hp <= 0) {
              // Switch-in hazards KO'd the incoming foe - back to faint.
              this.phase = 'faint';
              this.faintAnim = { foe: 0, me: this.me.hp <= 0 ? 0 : 1 };
            } else {
              this.phase = 'menu'; this.selection = 0;
            }
          };
          this.phase = 'message';
          return;
        }
      }
      this.phase = 'won';
      this.afterMessages = null;
      this.queue(this.trainer ? 'You won the battle!' : 'You won!');
      if (this.trainer) {
        this.queue('Got $' + this.trainer.reward + '!');
        if (this.state.addMoney) this.state.addMoney(this.state, this.trainer.reward);
        else this.state.player.money += this.trainer.reward;
        this._trainerRewarded = true;
      }
      this.phase = 'message';
      this.afterMessages = () => { this.phase = 'won'; };
      return;
    }

    if (this.me.hp <= 0 && this.faintAnim.me >= 1 - 0.001) {
      this.faintAnim.me = 1;
      window.PR_SFX && window.PR_SFX.play('faint');
      this.queue(this.me.nickname + ' fainted!');
      // Tag battle (idea #2): the active slot alternates owner on each
      // faint - your creature goes down, your ally tags in, and vice
      // versa. The AI ally enters automatically; you pick your own.
      if (this.tag) {
        const slot = this._tagNextMeSlot();
        if (!slot) {
          this.queue('Your side is out of partners...');
          this.queue('You scurry back to safety.');
          this.phase = 'message';
          this.afterMessages = () => { this.phase = 'lost'; };
          return;
        }
        if (slot.owner === 'ally') {
          const allyName = this.tag.allyName || 'Your ally';
          this.phase = 'message';
          this.afterMessages = () => {
            this.meOwner = 'ally';
            this.partyIdx = slot.idx;
            this.me = this.allyTeam[slot.idx];
            this.hpAnim.me = this.me.hp;
            this.faintAnim.me = 0;
            this.queue(allyName + ' sent out ' + this.me.nickname + '!');
            this._onSwitchIn(this.me, 'me');
            this.phase = 'message';
            this.afterMessages = () => { this.phase = 'menu'; this.selection = 0; };
          };
        } else {
          this.queue('Choose your next partner!');
          this.phase = 'message';
          this.afterMessages = () => {
            this.meOwner = 'player';
            // No player creature occupies the active slot right now
            // (the ally just went down) - clear the "in battle" marker.
            this.partyIdx = -1;
            this.phase = 'party';
            this.subSelection = slot.idx;
            this.forcedSwap = true;
          };
        }
        return;
      }
      const next = nextAlive(this.state.party, this.partyIdx);
      if (next >= 0) {
        // Force a switch.
        this.queue('Choose a new partner!');
        this.phase = 'message';
        this.afterMessages = () => {
          this.phase = 'party';
          this.subSelection = next;
          this.forcedSwap = true;
        };
      } else {
        this.queue('You are out of partners...');
        this.queue('You scurry back to safety.');
        this.phase = 'message';
        this.afterMessages = () => { this.phase = 'lost'; };
      }
    }
  };

  function nextAlive(party, exclude) {
    for (let i = 0; i < party.length; i++) {
      if (i !== exclude && party[i].hp > 0) return i;
    }
    return -1;
  }

  function statGainText(oldStats, newStats) {
    const labels = [
      ['HP', 'hp'], ['ATK', 'atk'], ['DEF', 'def'],
      ['SPA', 'spa'], ['SPD', 'spd'], ['SPE', 'spe']
    ];
    const parts = [];
    for (const [label, key] of labels) {
      const d = (newStats[key] | 0) - (oldStats[key] | 0);
      if (d > 0) parts.push(label + ' +' + d);
    }
    return parts.length ? ('Stats rose! ' + parts.join(' ')) : 'Stats held steady.';
  }

  Battle.prototype.swapTo = function(idx, fainted) {
    const old = this.me.nickname;
    const forced = this.forcedSwap;
    this.forcedSwap = false;
    // The player only ever swaps in their own creatures - reclaim the
    // active slot for the player side (matters in tag battles).
    this.meOwner = 'player';
    this.partyIdx = idx;
    this.me = this.state.party[idx];
    this.hpAnim.me = this.me.hp;
    this.faintAnim.me = 1;
    if (!fainted) this.queue('Come back, ' + old + '!');
    this.queue('Go, ' + this.me.nickname + '!');
    // Switch-in hooks (hazards / Intimidate) queue into this same
    // message batch so they read before control returns.
    this._onSwitchIn(this.me, 'me');
    this.phase = 'message';
    if (this.me.hp <= 0) {
      // Switch-in hazards KO'd the creature - route straight to faint.
      this.afterMessages = () => {
        this.phase = 'faint';
        this.faintAnim = { foe: this.foe.hp <= 0 ? 0 : 1, me: 0 };
      };
      return;
    }
    if (forced) {
      this.afterMessages = () => { this.phase = 'menu'; this.selection = 0; };
    } else {
      // Foe gets a free turn after a voluntary swap.
      this.afterMessages = () => {
        const foeMove = pickFoeMove(this.foe, this.me);
        this.turnOrder = ['foe'];
        this.turnMoves = { foe: foeMove };
        this.turnStep = 0;
        this.phase = 'turn';
      };
    }
  };

  Battle.prototype.tryRun = function() {
    if (this.trainer) { this.flashMsg("Can't run from a trainer battle!"); return; }
    this.runs++;
    const meSpeed = effectiveSpeed(this.me);
    const foeSpeed = effectiveSpeed(this.foe);
    const odds = ((meSpeed * 32) / Math.max(1, Math.floor(foeSpeed / 4)) + 30 * this.runs) % 256;
    if (Math.random() * 256 < odds) {
      this.queue('Got away safely!');
      this.phase = 'message';
      this.afterMessages = () => { this.phase = 'ran'; };
    } else {
      this.queue("Couldn't escape!");
      this.phase = 'message';
      this.afterMessages = () => {
        // Foe gets a free turn.
        const foeMove = pickFoeMove(this.foe, this.me);
        this.turnOrder = ['foe'];
        this.turnMoves = { foe: foeMove };
        this.turnStep = 0;
        this.phase = 'turn';
      };
    }
  };

  Battle.prototype.forceWin = function() {
    if (this.outcome || this.phase === 'won' || this.phase === 'lost' ||
        this.phase === 'ran' || this.phase === 'caught') {
      return false;
    }
    if (this.trainer && !this._trainerRewarded) {
      if (this.state.addMoney) this.state.addMoney(this.state, this.trainer.reward || 0);
      else this.state.player.money += this.trainer.reward || 0;
      this._trainerRewarded = true;
    }
    this.outcome = 'won';
    if (this.state && this.state.onBattleEnd) {
      this.state.onBattleEnd('won', this);
      return true;
    }
    this.phase = 'won';
    return true;
  };

  Battle.prototype.tryThrowBall = function(ballId) {
    if (this.trainer) { this.flashMsg("Can't catch a trainer's partner!"); return; }
    ballId = ballId || 'rodball';
    const items = window.PR_ITEMS;
    const def = (items && items.byId(ballId)) || null;
    const ballName = (def && def.name) || 'BALL';
    const owned = (this.state.player.bag && (this.state.player.bag[ballId] | 0)) || 0;
    if (owned <= 0) { this.flashMsg('No ' + ballName + ' left!'); return; }
    if (items) items.take(this.state, ballId, 1);
    else this.state.player.balls--; // fallback if items module is missing
    window.PR_SFX && window.PR_SFX.play('ball');
    // Visual ball-throw arc from the player sprite (back-view, left
    // side) to the foe sprite (front-view, right side). Runs in
    // parallel with the "You threw a BALL!" message; on `fast` text
    // speed the player advances past the message before the arc
    // finishes - that's fine, it just feels snappier.
    this.ballAnim = {
      t: 0,
      duration: 0.7,
      ballId: ballId,
      fromX: 24 + 28, fromY: 58 + 20,
      toX:   160 + 24, toY:   30 + 24
    };
    this.queue('You threw a ' + ballName + '!');
    const sp = window.PR_DATA.CREATURES[this.foe.species];
    const rate = sp.catchRate || 45;
    const hpRatio = this.foe.hp / this.foe.stats.hp;
    const statusBonus = this.foe.status ? 1.5 : 1;
    const ballBonus = items && items.getCatchBonus
      ? items.getCatchBonus(ballId, { state:this.state, battle:this })
      : ((def && def.catchBonus) || 1);
    const a = ((3 * this.foe.stats.hp - 2 * this.foe.hp) * rate * statusBonus * ballBonus)
              / (3 * this.foe.stats.hp);
    const shakes = a >= 255 ? 4 : Math.min(4, Math.floor(a / 60) + (Math.random() < 0.5 ? 1 : 0));
    if (shakes >= 4) {
      window.PR_SFX && window.PR_SFX.play('catch');
      if (window.PR_DEX) window.PR_DEX.markCaught(this.foe.species);
      if (window.PR_GAME && window.PR_GAME.tickQuests) window.PR_GAME.tickQuests('catch');
      if (window.PR_STORY) window.PR_STORY.emit(this.state, 'catch', { species: this.foe.species });
      // Friend Ball: caught creature starts at the friendship-bonus
      // threshold. Other balls leave the default (70) in place.
      if (def && def.friendshipOnCatch && typeof this.foe.friendship === 'number') {
        this.foe.friendship = Math.max(this.foe.friendship, def.friendshipOnCatch | 0);
      }
      // Roaming legendary: if this was the active roamer, mark it
      // caught so it stops respawning on outdoor maps.
      if (this.state.flags && this.state.flags.roamerActive &&
          this.foe.species === this.state.flags.roamerSpecies) {
        this.state.flags.roamerCaught = true;
        this.state.flags.roamerActive = false;
      }
      if (this.state.player) {
        if (!this.state.player.stats) this.state.player.stats = {};
        this.state.player.stats.catches = (this.state.player.stats.catches || 0) + 1;
        // Catch combo (idea #6): consecutive same-species catches keep
        // the chain alive; a different species resets it. The wild
        // encounter spawn reads player.catchCombo at battle start.
        const combo = this.state.player.catchCombo || { species:null, count:0 };
        if (combo.species === this.foe.species) combo.count = Math.min(99, combo.count + 1);
        else { combo.species = this.foe.species; combo.count = 1; }
        this.state.player.catchCombo = combo;
        if (combo.count >= 5 && combo.count % 5 === 0) {
          this.queue('Chain of ' + combo.count + '!');
        }
      }
      // Creature mark (idea #20): tag the caught mon with a context
      // marker so collectors can hunt for rare-condition catches.
      const mk = this._pickCatchMark();
      if (mk) {
        this.foe.mark = mk;
        const meta = window.PR_DATA.markOf(mk);
        if (meta) this.queue(this.foe.nickname + ' is ' + meta.title + '!');
      }
      // Achievement triggers - first/ten/fifty catch, first shiny, dex
      // milestones, first fish if this was an A-on-water fishing battle.
      if (window.PR_ACHV) {
        const A = window.PR_ACHV;
        const catches = (this.state.player.stats.catches || 0);
        A.unlock(this.state, 'first_catch');
        if (catches >= 10) A.unlock(this.state, 'ten_catches');
        if (catches >= 50) A.unlock(this.state, 'fifty_catches');
        if (this.foe.shiny) A.unlock(this.state, 'first_shiny');
        if (this.opts && this.opts.fishing) A.unlock(this.state, 'first_fish');
        const caught = (this.state.dex && this.state.dex.caught && this.state.dex.caught.size) || 0;
        if (caught >= 20) A.unlock(this.state, 'dex_quarter');
        if (caught >= 40) A.unlock(this.state, 'dex_half');
        if (caught >= 77) A.unlock(this.state, 'dex_full');
      }
      // Shiny Charm (idea #44): granted once the Pokedex is complete.
      const caughtNow = (this.state.dex && this.state.dex.caught && this.state.dex.caught.size) || 0;
      if (caughtNow >= 77 && window.PR_ITEMS) {
        const bag = this.state.player && this.state.player.bag;
        if (!bag || !bag.shinycharm) {
          window.PR_ITEMS.add(this.state, 'shinycharm', 1);
          this.queue('The PROFESSOR mailed a SHINY CHARM!');
        }
      }
      this.queue('Gotcha! ' + this.foe.nickname + ' was caught!');
      if (this.state.party.length < 6) {
        this.state.party.push(this.foe);
      } else {
        if (window.PR_BOX) window.PR_BOX.deposit(this.foe);
        this.queue('Sent to PC STORAGE.');
      }
      this.phase = 'message';
      this.afterMessages = () => {
        // Opt-in nickname prompt. window.prompt is synchronous - browsers
        // will block input until the user answers - so we run it after
        // the post-catch messages have been read, not inline. Cancel /
        // blank input keeps the default species-name nickname.
        try {
          const speciesName = (window.PR_DATA.CREATURES[this.foe.species] || {}).name || this.foe.species;
          const def = String(this.foe.nickname || speciesName).slice(0, 10);
          if (typeof window !== 'undefined' && typeof window.prompt === 'function') {
            const entered = window.prompt('Nickname ' + speciesName + '? (Cancel to skip)', def);
            if (entered && entered.trim()) this.foe.nickname = entered.trim().slice(0, 10);
          }
        } catch (_) { /* fall through with default nickname */ }
        this.phase = 'caught';
      };
    } else {
      const text = ['Oh no! It broke free!','Aww! It nearly had it!','Gah! So close!','Drat! Almost!'][shakes];
      this.queue(text);
      this.phase = 'message';
      this.afterMessages = () => {
        const foeMove = pickFoeMove(this.foe, this.me);
        this.turnOrder = ['foe'];
        this.turnMoves = { foe: foeMove };
        this.turnStep = 0;
        this.phase = 'turn';
      };
    }
  };

  // Apply XP to a single party member, running the level-up loop and
  // queueing battle messages. Used for both the active battler and bench
  // mons (party-wide XP / exp-share-on behaviour).
  Battle.prototype.applyXpToMon = function(mon, gain) {
    if (!mon || mon.level >= 100 || gain <= 0) return;
    mon.xp += gain;
    // Friendship ticks up +1 per battle the mon participates in
    // (gain > 0 from this side already), capped at 255.
    if (typeof mon.friendship === 'number') {
      mon.friendship = Math.min(255, (mon.friendship | 0) + 1);
    }
    this.queue(mon.nickname + ' gained ' + gain + ' XP!');
    let lv = window.PR_DATA.levelFromXp(mon.xp);
    while (lv > mon.level && mon.level < 100) {
      mon.level++;
      if (typeof mon.friendship === 'number') {
        mon.friendship = Math.min(255, (mon.friendship | 0) + 5);
      }
      window.PR_SFX && window.PR_SFX.play('levelup');
      let sp = window.PR_DATA.CREATURES[mon.species];
      const oldStats = mon.stats;
      const newStats = window.PR_DATA.computeStats(sp.baseStats, mon.ivs, mon.level, mon.nature);
      const dHp = newStats.hp - mon.stats.hp;
      mon.stats = newStats;
      mon.hp = Math.min(mon.stats.hp, mon.hp + Math.max(0, dHp));
      this.queue(mon.nickname + ' grew to LV. ' + mon.level + '!');
      this.queue(statGainText(oldStats, newStats));
      if (window.PR_STORY) {
        window.PR_STORY.emit(this.state, 'level_up', { species: mon.species, level: mon.level });
      }
      // Learn moves.
      for (const [reqLv, mvId] of sp.learnset) {
        if (reqLv === mon.level && !mon.moves.find(m => m.id === mvId)) {
          if (mon.moves.length < 4) {
            const m = window.PR_DATA.MOVES[mvId];
            mon.moves.push({ id: mvId, pp: m.pp, ppMax: m.pp });
            this.queue(mon.nickname + ' learned ' + m.name + '!');
          } else {
            const newMove = window.PR_DATA.MOVES[mvId];
            this.queue(mon.nickname + ' wants to learn ' + newMove.name + '...');
            this.queue('But ' + mon.nickname + ' already knows 4 moves.');
            this._pendingLearn = this._pendingLearn || [];
            // Tag the entry with the target mon so the move-learn UI can
            // route to the right creature, not just the active battler.
            this._pendingLearn.push({ mvId, target: mon });
          }
        }
      }
      // Evolve at level threshold, or at the friendship threshold on
      // the next level-up (idea #15). Stone-only evolutions list
      // neither and are skipped here; they're handled by items.apply.
      const evoCfg = sp.evolves;
      const meetsLevel      = evoCfg && evoCfg.level && mon.level >= evoCfg.level;
      const meetsFriendship = evoCfg && evoCfg.friendship && (mon.friendship | 0) >= evoCfg.friendship;
      if (evoCfg && (meetsLevel || meetsFriendship)) {
        const evo = sp.evolves.to;
        const fromSpecies = mon.species;
        mon.species = evo;
        const evoSp = window.PR_DATA.CREATURES[evo];
        const evoStats = window.PR_DATA.computeStats(evoSp.baseStats, mon.ivs, mon.level, mon.nature);
        const evoHpGain = evoStats.hp - mon.stats.hp;
        mon.stats = evoStats;
        mon.hp = Math.min(mon.stats.hp, mon.hp + Math.max(0, evoHpGain));
        if (mon.nickname === sp.name) mon.nickname = evoSp.name;
        this.queue('What? ' + sp.name + ' is evolving!');
        this.queue('It evolved into ' + evoSp.name + '!');
        if (window.PR_STORY) window.PR_STORY.emit(this.state, 'evolve', { from: fromSpecies, to: evo });
        if (window.PR_ACHV) window.PR_ACHV.unlock(this.state, 'first_evolve');
        sp = evoSp; // continue learning checks against new species in next iter
      }
      lv = window.PR_DATA.levelFromXp(mon.xp);
      if (window.PR_ACHV && lv >= 50) window.PR_ACHV.unlock(this.state, 'level_50');
    }
  };

  Battle.prototype.awardXp = function() {
    const base = window.PR_DATA.xpYield(this.foe.species, this.foe.level);
    const party = (this.state && this.state.party) ? this.state.party : [this.me];
    // Apply to the active battler first so its level-up text comes out
    // ahead of bench updates.
    const order = party.slice().sort((a, b) => (a === this.me ? -1 : b === this.me ? 1 : 0));
    for (const mon of order) {
      if (!mon) continue;
      const isActive = (mon === this.me);
      // Active battler must be conscious to gain XP; bench can faint and still share.
      if (isActive && mon.hp <= 0) continue;
      const ratio = window.PR_DATA.xpShareRatio(isActive);
      const mult = window.PR_DATA.xpMultiplier(this.state, mon);
      // Difficulty: easy boosts XP, hard reduces it. Reads live setting
      // so toggling mid-run takes effect on the next battle.
      const diff = (this.state.settings && this.state.settings.difficulty) || 'normal';
      const diffMult = diff === 'easy' ? 1.25 : diff === 'hard' ? 0.85 : 1.0;
      const gain = Math.max(1, Math.floor(base * ratio * mult * diffMult));
      this.applyXpToMon(mon, gain);
    }
  };

  Battle.prototype.updateOutcome = function() {
    if (window.PR_INPUT.consumePressed('z') || window.PR_INPUT.consumePressed('Enter')) {
      this.outcome = this.phase;
      this.state.onBattleEnd(this.outcome, this);
    }
  };

  // ----------- RENDERING -----------
  Battle.prototype.render = function(ctx) {
    let shakeX = 0;
    if (this.shakeTimer > 0) shakeX = (Math.sin(this.timer * 80) * 2) | 0;

    // Background sky/ground - per-biome palette so battles in deserts,
    // caves, snow, etc. don't all look like grassy fields. Routed
    // through pf() so monochrome eras still era-tone the field.
    const map = this.state && this.state.world && this.state.world.currentMap && this.state.world.currentMap();
    const biome = BIOME_PALETTES[biomeForMap(map)] || BIOME_PALETTES.grass;
    ctx.fillStyle = window.PR_UI.pf(biome.sky);
    ctx.fillRect(0, 0, VIEW_W, 90);
    ctx.fillStyle = window.PR_UI.pf(biome.ground);
    ctx.fillRect(0, 90, VIEW_W, VIEW_H - 90);
    // Foe platform.
    ctx.fillStyle = window.PR_UI.pf(biome.platTop);
    ctx.fillRect(140, 70, 90, 8);
    ctx.fillStyle = window.PR_UI.pf(biome.platShadow);
    ctx.fillRect(140, 78, 90, 2);
    // Player platform.
    ctx.fillStyle = window.PR_UI.pf(biome.platTop);
    ctx.fillRect(10, 82, 90, 8);
    ctx.fillStyle = window.PR_UI.pf(biome.platShadow);
    ctx.fillRect(10, 90, 90, 2);

    // Foe sprite.
    const foeFloat = (Math.sin(this.timer * 2) * 1) | 0;
    const foeY = 30 + foeFloat - (this.faintAnim.foe * 30);
    if (this.faintAnim.foe < 1 || this.foe.hp > 0) {
      window.PR_MONS.drawCreature(ctx, this.foe.species, 160, foeY, 48, false, this.foe);
    }
    // Player sprite (back-ish view). y=58 keeps the sprite fully above
    // the y=112 menu/dialog band and aligned with the y=82 platform.
    const meY = 58 - (this.faintAnim.me * 30);
    if (this.faintAnim.me < 1 || this.me.hp > 0) {
      window.PR_MONS.drawCreature(ctx, this.me.species, 24 + shakeX, meY, 56, true, this.me);
    }

    // Ball-throw arc - parabolic trajectory from the player's hand to
    // the foe sprite. Drawn before the foe damage flash so the ball
    // reads as landing on the foe.
    if (this.ballAnim) {
      const a = this.ballAnim;
      const k = Math.min(1, a.t / a.duration);
      const px = a.fromX + (a.toX - a.fromX) * k;
      const ly = a.fromY + (a.toY - a.fromY) * k;
      const py = ly - Math.sin(k * Math.PI) * 32;
      const size = 12;
      if (window.PR_ITEMS && window.PR_ITEMS.drawIcon) {
        window.PR_ITEMS.drawIcon(ctx, a.ballId, (px - size / 2) | 0, (py - size / 2) | 0, size);
      } else {
        ctx.fillStyle = window.PR_UI.pf('#e83838');
        ctx.fillRect((px - 3) | 0, (py - 3) | 0, 6, 6);
      }
    }

    // Damage flash.
    if (this.flashTimer > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(140, foeY, 64, 64);
    }

    // Move animation: per-type / per-move VFX delegated to PR_MOVE_FX.
    // Reduced motion skips the particle render entirely, but the
    // shake / flash timers above still fire for feedback.
    if (this.activeAnim && window.PR_MOVE_FX && window.PR_MOVE_FX.drawFor) {
      const reduced = window.PR_SETTINGS && window.PR_SETTINGS.reducedMotion;
      if (!reduced) {
        const a = this.activeAnim;
        // Sprite bounding boxes match the layout in drawFoeBox / drawMeBox:
        // foe sprite at (140, 22), 64x64; player sprite at (24, 50), 64x64.
        const tx = a.target === 'foe' ? 140 : 24;
        const ty = a.target === 'foe' ? 22  : 50;
        const tier = (window.PR_SETTINGS && window.PR_SETTINGS.graphics) || 'ds_diamond';
        // Critical hit pulse: gives the target sprite a brief
        // bright flash + 1px scale-up before the effect lands.
        // DS only - basic tiers get plain effects.
        if (this.critPulse > 0 && this.critPulseTarget === a.target && tier === 'ds_diamond') {
          const k = Math.min(1, this.critPulse / 0.25);
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = 'rgba(255,232,168,' + (0.55 * k).toFixed(2) + ')';
          ctx.fillRect(tx - 4, ty - 4, 72, 72);
          ctx.restore();
        }
        window.PR_MOVE_FX.drawFor(ctx, a, tier, tx, ty, 64, 64);
      }
    }
    if (this.critPulse > 0) this.critPulse = Math.max(0, this.critPulse - 1 / 60);

    this.drawFoeBox(ctx);
    this.drawMeBox(ctx);
    this.drawFieldStatus(ctx);
    this.drawTrainerBanner(ctx);

    if (this.phase === 'message' || this.phase === 'turn' || this.phase === 'faint' ||
        this.phase === 'won' || this.phase === 'lost' || this.phase === 'ran' || this.phase === 'caught') {
      const lines = window.PR_UI.wrap(this.currentMessage(), 30);
      window.PR_UI.drawDialog(ctx, lines.slice(0,3), VIEW_W, VIEW_H, this.phase === 'message' || this.phase === 'won' || this.phase === 'lost' || this.phase === 'ran' || this.phase === 'caught');
    } else if (this.phase === 'menu') {
      this.drawMenu(ctx);
    } else if (this.phase === 'fight') {
      this.drawFightMenu(ctx);
    } else if (this.phase === 'party') {
      this.drawPartyMenu(ctx);
    } else if (this.phase === 'learnmove') {
      this.drawLearnMove(ctx);
    }
  };

  Battle.prototype.drawLearnMove = function(ctx) {
    const c = this._learnContext;
    if (!c) return;
    const x = 6, y = VIEW_H - 64, w = VIEW_W - 12, h = 60;
    window.PR_UI.box(ctx, x, y, w, h, '#fff', '#202020');
    const target = c.target || this.me;
    const newName = window.PR_DATA.MOVES[c.newId].name;
    const who = target === this.me ? 'LEARN' : (target.nickname.toUpperCase() + ': LEARN');
    window.PR_UI.drawText(ctx, who + ' ' + newName.toUpperCase() + '?', x + 6, y + 4, '#202020');
    window.PR_UI.drawText(ctx, 'FORGET WHICH MOVE?', x + 6, y + 14, '#385890');
    const moves = target.moves;
    for (let i = 0; i < 4; i++) {
      const cx = x + 8 + (i % 2) * ((w - 16) / 2);
      const cy = y + 26 + Math.floor(i / 2) * 12;
      if (i === c.slot) window.PR_UI.drawText(ctx, '>', cx - 6, cy, '#e83838');
      const label = moves[i] ? window.PR_DATA.MOVES[moves[i].id].name : '-';
      window.PR_UI.drawText(ctx, label, cx, cy, '#202020');
    }
    // Slot 4 = give up.
    const cy = y + h - 10;
    if (c.slot === 4) window.PR_UI.drawText(ctx, '>', x + 2, cy, '#e83838');
    window.PR_UI.drawText(ctx, 'GIVE UP   B:CANCEL', x + 8, cy, '#806040');
  };

  Battle.prototype.drawFoeBox = function(ctx) {
    const x = 8, y = 12, w = 100, h = 30;
    window.PR_UI.box(ctx, x, y, w, h, '#fff', '#202020');
    window.PR_UI.drawText(ctx, this.foe.nickname, x + 4, y + 4, '#202020');
    window.PR_UI.drawText(ctx, 'L' + this.foe.level, x + w - 22, y + 4, '#202020');
    window.PR_UI.drawText(ctx, 'HP', x + 4, y + 14, '#385890');
    window.PR_UI.drawHpBar(ctx, x + 18, y + 16, w - 24, this.hpAnim.foe, this.foe.stats.hp);
    if (this.foe.status) {
      const tag = this.foe.status.slice(0,3).toUpperCase();
      ctx.fillStyle = window.PR_UI.pf('#e83838'); ctx.fillRect(x + 4, y + 22, 16, 6);
      window.PR_UI.drawText(ctx, tag, x + 5, y + 22, '#fff');
    }
  };

  Battle.prototype.drawMeBox = function(ctx) {
    const x = 132, y = 72, w = 100, h = 38;
    window.PR_UI.box(ctx, x, y, w, h, '#fff', '#202020');
    window.PR_UI.drawText(ctx, this.me.nickname, x + 4, y + 4, '#202020');
    window.PR_UI.drawText(ctx, 'L' + this.me.level, x + w - 22, y + 4, '#202020');
    window.PR_UI.drawText(ctx, 'HP', x + 4, y + 14, '#385890');
    window.PR_UI.drawHpBar(ctx, x + 18, y + 16, w - 24, this.hpAnim.me, this.me.stats.hp);
    window.PR_UI.drawText(ctx, Math.ceil(this.hpAnim.me) + '/' + this.me.stats.hp, x + w - 50, y + 22, '#202020');
    // XP bar.
    const lv = this.me.level;
    const cur = this.me.xp - window.PR_DATA.xpForLevel(lv);
    const need = window.PR_DATA.xpForLevel(lv+1) - window.PR_DATA.xpForLevel(lv);
    window.PR_UI.drawXpBar(ctx, x + 4, y + h - 4, w - 8, Math.min(1, cur / Math.max(1, need)));
    if (this.me.status) {
      const tag = this.me.status.slice(0,3).toUpperCase();
      ctx.fillStyle = window.PR_UI.pf('#e83838'); ctx.fillRect(x + 4, y + 22, 16, 6);
      window.PR_UI.drawText(ctx, tag, x + 5, y + 22, '#fff');
    }
  };

  // Compact field-state strip (ideas #3, #5): battle weather and the
  // per-side screens, drawn top-right where there's free space. The
  // full-screen party menu draws over it, which is fine.
  Battle.prototype.drawFieldStatus = function(ctx) {
    const tx = 150;
    let ty = 44;
    const chip = (text, bg) => {
      ctx.fillStyle = window.PR_UI.pf(bg);
      ctx.fillRect(tx, ty, 56, 9);
      window.PR_UI.drawText(ctx, text, tx + 2, ty + 1, '#fff');
      ty += 11;
    };
    if (this.weather.kind && this.weather.turns > 0) {
      chip(this.weather.kind.toUpperCase() + ' ' + this.weather.turns, '#284878');
    }
    const screenTag = (f) => {
      const t = [];
      if (f.reflect > 0) t.push('REF');
      if (f.lightScreen > 0) t.push('LS');
      return t.join('/');
    };
    const foeS = screenTag(this.field.foe);
    if (foeS) chip('FOE ' + foeS, '#806020');
    const meS = screenTag(this.field.me);
    if (meS) chip('YOU ' + meS, '#206040');
  };

  Battle.prototype.drawMenu = function(ctx) {
    const x = 6, y = VIEW_H - 48, w = VIEW_W - 12, h = 44;
    window.PR_UI.box(ctx, x, y, w, h, '#fff', '#202020');
    const opts = ['FIGHT','RUN','PARTY','ITEMS'];
    for (let i = 0; i < 4; i++) {
      const cx = x + 8 + (i % 2) * ((w - 16) / 2);
      const cy = y + 6 + Math.floor(i / 2) * 18;
      if (i === this.selection) window.PR_UI.drawText(ctx, '>', cx - 6, cy, '#e83838');
      window.PR_UI.drawText(ctx, opts[i], cx, cy, '#202020');
    }
    // Show ball count.
    window.PR_UI.drawText(ctx, 'x' + (this.state.player.balls|0), x + w - 28, y + 24, '#202020');
  };

  Battle.prototype.drawFightMenu = function(ctx) {
    const x = 6, y = VIEW_H - 48, w = VIEW_W - 12, h = 44;
    window.PR_UI.box(ctx, x, y, w, h, '#fff', '#202020');
    const moves = this.me.moves;
    // Reserve the rightmost ~64 px for the PP / type detail column so
    // long move names ("TAIL WHIP") don't run into the "PP 29/30" suffix.
    const detailW = 64;
    const cellW = (w - 16 - detailW) / 2;
    const foeTypes = (window.PR_DATA.CREATURES[this.foe.species] || {}).types || [];
    for (let i = 0; i < moves.length; i++) {
      const cx = x + 8 + (i % 2) * cellW;
      const cy = y + 6 + Math.floor(i / 2) * 18;
      if (i === this.subSelection) window.PR_UI.drawText(ctx, '>', cx - 6, cy, '#e83838');
      const def = window.PR_DATA.MOVES[moves[i].id];
      // Effectiveness preview against the current foe. Status / 0-power
      // moves get no tag (they don't deal type damage). Color carries
      // the signal; the suffix tag is the colorblind-safe channel.
      let nameColor = '#202020';
      let tag = '';
      if (def.kind !== 'status' && (def.power | 0) > 0) {
        const eff = window.PR_DATA.effectiveness(def.type, foeTypes);
        if (eff === 0)         { nameColor = '#888888'; tag = ' X'; }
        else if (eff >= 4)     { nameColor = '#208830'; tag = '++'; }
        else if (eff > 1)      { nameColor = '#388838'; tag = ' +'; }
        else if (eff < 0.5)    { nameColor = '#a06030'; tag = ' --'; }
        else if (eff < 1)      { nameColor = '#a08040'; tag = ' -'; }
      }
      window.PR_UI.drawText(ctx, def.name, cx, cy, nameColor);
      if (tag) {
        const tagX = cx + Math.min(def.name.length, 9) * 6 + 2;
        window.PR_UI.drawText(ctx, tag, tagX, cy, nameColor);
      }
    }
    // Detail.
    const sel = moves[this.subSelection];
    if (sel) {
      const def = window.PR_DATA.MOVES[sel.id];
      const tx = x + w - 60;
      window.PR_UI.drawText(ctx, 'PP ' + sel.pp + '/' + sel.ppMax, tx, y + 6, '#202020');
      const color = window.PR_DATA.TYPE_COLOR[def.type] || '#202020';
      ctx.fillStyle = window.PR_UI.pf(color); ctx.fillRect(tx, y + 18, 50, 8);
      window.PR_UI.drawText(ctx, def.type.slice(0,4), tx + 2, y + 19, '#fff');
    }
  };

  Battle.prototype.drawPartyMenu = function(ctx) {
    const x = 6, y = 6, w = VIEW_W - 12, h = VIEW_H - 12;
    window.PR_UI.box(ctx, x, y, w, h, '#a8c0e8', '#202020');
    window.PR_UI.drawText(ctx, 'CHOOSE PARTNER', x + 8, y + 6, '#202020');
    const party = this.state.party;
    for (let i = 0; i < party.length; i++) {
      const m = party[i];
      const cy = y + 22 + i * 20;
      if (i === this.subSelection) {
        ctx.fillStyle = window.PR_UI.pf('#f0c020');
        ctx.fillRect(x + 4, cy - 2, w - 8, 18);
      }
      window.PR_MONS.drawCreature(ctx, m.species, x + 6, cy - 2, 18, false, m);
      window.PR_UI.drawText(ctx, m.nickname, x + 28, cy, '#202020');
      if (m.favorite) {
        ctx.fillStyle = '#f0c020';
        ctx.fillRect(x + 24 + m.nickname.length * 6 + 4, cy + 2, 1, 5);
        ctx.fillRect(x + 24 + m.nickname.length * 6 + 2, cy + 4, 5, 1);
        ctx.fillRect(x + 24 + m.nickname.length * 6 + 3, cy + 3, 3, 3);
      }
      window.PR_UI.drawText(ctx, 'L' + m.level, x + 110, cy, '#202020');
      window.PR_UI.drawHpBar(ctx, x + 130, cy + 2, 60, m.hp, m.stats.hp);
      window.PR_UI.drawText(ctx, m.hp + '/' + m.stats.hp, x + w - 60, cy + 8, '#202020');
      if (i === this.partyIdx) window.PR_UI.drawText(ctx, '*', x + w - 12, cy, '#e83838');
      // Second line: ability (first word) (idea #1), nature short
      // (idea #11) and switch-in matchup (idea #7) so the player can
      // read a candidate's strengths at a glance.
      const ab = window.PR_DATA.abilityOf(m.species);
      if (ab) {
        const abName = (window.PR_DATA.ABILITIES[ab] || {}).name || '';
        window.PR_UI.drawText(ctx, abName.split(' ')[0], x + 28, cy + 8, '#586878');
      }
      if (m.nature) {
        const nshort = (window.PR_DATA.NATURES[m.nature] || {}).short || m.nature.slice(0,4).toUpperCase();
        window.PR_UI.drawText(ctx, nshort, x + 68, cy + 8, '#a06030');
      }
      const mu = switchMatchup(this.foe, m);
      if (mu) window.PR_UI.drawText(ctx, mu.tag, x + 108, cy + 8, mu.color);
    }
    window.PR_UI.drawText(ctx, 'B: BACK', x + 8, y + h - 12, '#202020');
  };

  window.PR_BATTLE = { Battle };
})();
