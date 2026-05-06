// Turn-based battle state.
'use strict';

(function(){
  const VIEW_W = 240, VIEW_H = 160;

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
  }

  function pickFirstAlive(party) {
    for (let i = 0; i < party.length; i++) if (party[i].hp > 0) return i;
    return -1;
  }

  Battle.prototype.startIntroMessages = function() {
    if (this.trainer) {
      this.queue('A trainer wants to battle!');
      this.queue('Sent out ' + this.foe.nickname + '!');
    } else {
      this.queue('A wild ' + this.foe.nickname + ' appeared!');
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

    // Animate hp bars toward target.
    const tickHp = (cur, target) => {
      if (cur < target) return Math.min(target, cur + 60*dt);
      if (cur > target) return Math.max(target, cur - 60*dt);
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
      if (this.phase === 'menu')   return this.updateMenu();
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
    move.pp = Math.max(0, move.pp - 1);
    this.queue(attacker.nickname + ' used ' + def.name + '!');

    // Pre-move status checks.
    if (attacker.status === 'paralyzed' && Math.random() < 0.25) {
      this.queue(attacker.nickname + ' is paralyzed and could not move!');
      return;
    }
    if (attacker.status === 'asleep') {
      attacker.sleepTurns = (attacker.sleepTurns || 0) - 1;
      if (attacker.sleepTurns > 0 && Math.random() > 0.25) {
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

    // Accuracy.
    if (def.accuracy && Math.random() * 100 > def.accuracy) {
      this.queue(attacker.nickname + "'s attack missed!");
      return;
    }

    if (def.kind === 'status') {
      if (def.dud) { this.queue('But nothing happened!'); return; }
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
    const isCrit = Math.random() < 1/16;
    const result = window.PR_DATA.calcDamage(attacker, defender, def, isCrit);
    let totalDmg = result.dmg;
    if (def.multi) {
      const [lo, hi] = def.multi;
      const hits = lo + Math.floor(Math.random() * (hi - lo + 1));
      totalDmg = result.dmg * hits;
      this.queue('It hit ' + hits + ' times!');
    }
    defender.hp = Math.max(0, defender.hp - totalDmg);
    // Trigger move animation on the defender's side.
    this.activeAnim = {
      type: def.type,
      target: who === 'me' ? 'foe' : 'me',
      t: 0, duration: 0.45
    };
    if (who === 'me') this.shakeTimer = 0.3; else this.flashTimer = 0.2;
    if (window.PR_SFX) {
      if (result.crit) window.PR_SFX.play('crit');
      else if (result.eff > 1) window.PR_SFX.play('super');
      else if (result.eff < 1 && result.eff > 0) window.PR_SFX.play('weak');
      else window.PR_SFX.play('hit');
    }
    if (result.crit) this.queue('A critical hit!');
    if (result.eff > 1) this.queue("It's super effective!");
    else if (result.eff === 0) this.queue("It doesn't affect " + defender.nickname + '...');
    else if (result.eff < 1) this.queue("It's not very effective...");

    // Side-effect chances (status moves use the same helper above).
    this._applyMoveSideEffects(def, defender);
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
          this.queue('Trainer sent out ' + this.foe.nickname + '!');
          this.afterMessages = () => {
            this.faintAnim.foe = 0; // reset slide-in next render
            this.phase = 'menu'; this.selection = 0;
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
        this.state.player.money += this.trainer.reward;
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

  Battle.prototype.swapTo = function(idx, fainted) {
    const old = this.me.nickname;
    this.partyIdx = idx;
    this.me = this.state.party[idx];
    this.hpAnim.me = this.me.hp;
    this.faintAnim.me = 1;
    if (!fainted) this.queue('Come back, ' + old + '!');
    this.queue('Go, ' + this.me.nickname + '!');
    this.phase = 'message';
    if (this.forcedSwap) {
      this.forcedSwap = false;
      this.afterMessages = () => { this.phase = 'menu'; this.selection = 0; };
    } else {
      // Foe gets a free turn after swap.
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
      this.state.player.money += this.trainer.reward || 0;
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
      if (this.state.player) {
        if (!this.state.player.stats) this.state.player.stats = {};
        this.state.player.stats.catches = (this.state.player.stats.catches || 0) + 1;
      }
      this.queue('Gotcha! ' + this.foe.nickname + ' was caught!');
      if (this.state.party.length < 6) {
        this.state.party.push(this.foe);
      } else {
        if (window.PR_BOX) window.PR_BOX.deposit(this.foe);
        this.queue('Sent to PC STORAGE.');
      }
      this.phase = 'message';
      this.afterMessages = () => { this.phase = 'caught'; };
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
    if (!mon || mon.hp <= 0 || mon.level >= 100 || gain <= 0) return;
    mon.xp += gain;
    this.queue(mon.nickname + ' gained ' + gain + ' XP!');
    let lv = window.PR_DATA.levelFromXp(mon.xp);
    while (lv > mon.level && mon.level < 100) {
      mon.level++;
      window.PR_SFX && window.PR_SFX.play('levelup');
      let sp = window.PR_DATA.CREATURES[mon.species];
      const newStats = window.PR_DATA.computeStats(sp.baseStats, mon.ivs, mon.level);
      const dHp = newStats.hp - mon.stats.hp;
      mon.stats = newStats;
      mon.hp = Math.min(mon.stats.hp, mon.hp + Math.max(0, dHp));
      this.queue(mon.nickname + ' grew to LV. ' + mon.level + '!');
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
      // Evolve at level threshold.
      if (sp.evolves && mon.level >= sp.evolves.level) {
        const evo = sp.evolves.to;
        mon.species = evo;
        const evoSp = window.PR_DATA.CREATURES[evo];
        mon.stats = window.PR_DATA.computeStats(evoSp.baseStats, mon.ivs, mon.level);
        if (mon.nickname === sp.name) mon.nickname = evoSp.name;
        this.queue('What? ' + sp.name + ' is evolving!');
        this.queue('It evolved into ' + evoSp.name + '!');
        sp = evoSp; // continue learning checks against new species in next iter
      }
      lv = window.PR_DATA.levelFromXp(mon.xp);
    }
  };

  Battle.prototype.awardXp = function() {
    const base = window.PR_DATA.xpYield(this.foe.species, this.foe.level);
    const party = (this.state && this.state.party) ? this.state.party : [this.me];
    // Apply to the active battler first so its level-up text comes out
    // ahead of bench updates.
    const order = party.slice().sort((a, b) => (a === this.me ? -1 : b === this.me ? 1 : 0));
    for (const mon of order) {
      if (!mon || mon.hp <= 0) continue;
      const isActive = (mon === this.me);
      const ratio = window.PR_DATA.xpShareRatio(isActive);
      const mult = window.PR_DATA.xpMultiplier(this.state, mon);
      const gain = Math.max(1, Math.floor(base * ratio * mult));
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

    // Background sky/ground.
    ctx.fillStyle = '#a8c0e8';
    ctx.fillRect(0, 0, VIEW_W, 90);
    ctx.fillStyle = '#5cae4c';
    ctx.fillRect(0, 90, VIEW_W, VIEW_H - 90);
    // Foe platform.
    ctx.fillStyle = '#3a8030';
    ctx.fillRect(140, 70, 90, 8);
    ctx.fillStyle = '#2a6020';
    ctx.fillRect(140, 78, 90, 2);
    // Player platform.
    ctx.fillStyle = '#3a8030';
    ctx.fillRect(10, 110, 90, 8);
    ctx.fillStyle = '#2a6020';
    ctx.fillRect(10, 118, 90, 2);

    // Foe sprite.
    const foeFloat = (Math.sin(this.timer * 2) * 1) | 0;
    const foeY = 30 + foeFloat - (this.faintAnim.foe * 30);
    if (this.faintAnim.foe < 1 || this.foe.hp > 0) {
      window.PR_MONS.drawCreature(ctx, this.foe.species, 160, foeY, 48, false);
    }
    // Player sprite (back-ish view).
    const meY = 86 - (this.faintAnim.me * 30);
    if (this.faintAnim.me < 1 || this.me.hp > 0) {
      window.PR_MONS.drawCreature(ctx, this.me.species, 24 + shakeX, meY, 56, true);
    }

    // Damage flash.
    if (this.flashTimer > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(140, foeY, 64, 64);
    }

    // Move animation: type-coloured particle burst on the target.
    if (this.activeAnim) {
      const a = this.activeAnim;
      const p = Math.min(1, a.t / a.duration);
      const cx = a.target === 'foe' ? 184 : 52;
      const cy = a.target === 'foe' ? 54 : 110;
      const color = (window.PR_DATA.TYPE_COLOR && window.PR_DATA.TYPE_COLOR[a.type]) || '#fff';
      ctx.fillStyle = color;
      // 14 deterministic particles based on phase + index.
      for (let i = 0; i < 14; i++) {
        const ang = (i / 14) * Math.PI * 2 + p * 1.5;
        const r = 4 + p * 28;
        const px = (cx + Math.cos(ang) * r) | 0;
        const py = (cy + Math.sin(ang) * r) | 0;
        const sz = (p < 0.7) ? 3 : 2;
        ctx.fillRect(px, py, sz, sz);
      }
      // Center pop.
      if (p < 0.4) {
        ctx.fillStyle = '#fff';
        const r = 2 + (0.4 - p) * 18;
        ctx.fillRect((cx - r) | 0, (cy - r) | 0, (r * 2) | 0, (r * 2) | 0);
      }
    }

    this.drawFoeBox(ctx);
    this.drawMeBox(ctx);

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
      ctx.fillStyle = '#e83838'; ctx.fillRect(x + 4, y + 22, 16, 6);
      window.PR_UI.drawText(ctx, tag, x + 5, y + 22, '#fff');
    }
  };

  Battle.prototype.drawMeBox = function(ctx) {
    const x = 132, y = 92, w = 100, h = 38;
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
      ctx.fillStyle = '#e83838'; ctx.fillRect(x + 4, y + 22, 16, 6);
      window.PR_UI.drawText(ctx, tag, x + 5, y + 22, '#fff');
    }
  };

  Battle.prototype.drawMenu = function(ctx) {
    const x = 6, y = VIEW_H - 48, w = VIEW_W - 12, h = 44;
    window.PR_UI.box(ctx, x, y, w, h, '#fff', '#202020');
    const opts = ['FIGHT','RUN','PARTY','BALL'];
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
    for (let i = 0; i < moves.length; i++) {
      const cx = x + 8 + (i % 2) * ((w - 16) / 2);
      const cy = y + 6 + Math.floor(i / 2) * 18;
      if (i === this.subSelection) window.PR_UI.drawText(ctx, '>', cx - 6, cy, '#e83838');
      const def = window.PR_DATA.MOVES[moves[i].id];
      window.PR_UI.drawText(ctx, def.name, cx, cy, '#202020');
    }
    // Detail.
    const sel = moves[this.subSelection];
    if (sel) {
      const def = window.PR_DATA.MOVES[sel.id];
      const tx = x + w - 60;
      window.PR_UI.drawText(ctx, 'PP ' + sel.pp + '/' + sel.ppMax, tx, y + 6, '#202020');
      const color = window.PR_DATA.TYPE_COLOR[def.type] || '#202020';
      ctx.fillStyle = color; ctx.fillRect(tx, y + 18, 50, 8);
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
        ctx.fillStyle = '#f0c020';
        ctx.fillRect(x + 4, cy - 2, w - 8, 18);
      }
      window.PR_MONS.drawCreature(ctx, m.species, x + 6, cy - 2, 18, false);
      window.PR_UI.drawText(ctx, m.nickname, x + 28, cy, '#202020');
      window.PR_UI.drawText(ctx, 'L' + m.level, x + 110, cy, '#202020');
      window.PR_UI.drawHpBar(ctx, x + 130, cy + 2, 60, m.hp, m.stats.hp);
      window.PR_UI.drawText(ctx, m.hp + '/' + m.stats.hp, x + w - 60, cy + 8, '#202020');
      if (i === this.partyIdx) window.PR_UI.drawText(ctx, '*', x + w - 12, cy, '#e83838');
    }
    window.PR_UI.drawText(ctx, 'B: BACK', x + 8, y + h - 12, '#202020');
  };

  window.PR_BATTLE = { Battle };
})();
