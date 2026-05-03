// Main game state machine and loop.
'use strict';

(function(){
  const VIEW_W = 240, VIEW_H = 160;
  const VERSION = 'v0.14.1';
  const BUILD = '2026.05.03-54';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // Game state container.
  const state = {
    mode: 'title',        // title | intro | overworld | battle | dialog | menu | starter
    player: {
      name: 'YOU',
      map: 'rodport',
      x: 4, y: 5, dir: 'down',
      money: 500, balls: 5, steps: 0
    },
    party: [],
    flags: { starterChosen: false },
    defeatedTrainers: new Set(),
    world: null,
    battle: null,
    dialog: null,         // { lines:[], onDone, source? }
    menu: null,
    starterMenu: null
  };

  // Maps that use the route (action) music. Anything else plays town.
  const ROUTE_MAPS = new Set([
    'route1','route2','pebblewood','glimcavern','glimcavern_b1',
    'frostpeak','searoute','desert','beach','mountain'
  ]);

  // Wire callbacks the world will invoke.
  state.onMapChange = () => {
    if (!window.PR_MUSIC) return;
    const m = state.world && state.world.currentMap();
    if (!m) return;
    if (ROUTE_MAPS.has(m.id)) window.PR_MUSIC.play('route');
    else window.PR_MUSIC.play('town');
    window.PR_SFX && window.PR_SFX.play('door');
  };
  state.onWildEncounter = startWildEncounter;
  state.onNpcInteract = handleNpcInteract;
  state.onSign = (text) => openDialog([text]);
  state.onHealer = healAtCenter;
  state.onHidden = (entry, id) => {
    const it = window.PR_ITEMS && window.PR_ITEMS.ITEMS[entry.item];
    if (!it) return;
    if (window.PR_ITEMS) window.PR_ITEMS.add(state, entry.item, entry.count || 1);
    if (!state.player.foundItems) state.player.foundItems = new Set();
    state.player.foundItems.add(id);
    window.PR_SFX && window.PR_SFX.play('confirm');
    openDialog(['You found ' + (entry.count || 1) + ' ' + it.name + '!'], () => {
      window.PR_SAVE.save && window.PR_SAVE.save(state);
    });
  };
  state.onAmbient = (amb) => {
    const sp = window.PR_DATA.CREATURES[amb.species];
    const name = (sp && sp.name) || 'Creature';
    const line = window.PR_CHATTER ? window.PR_CHATTER.chatterFor(amb.species) : '...';
    openDialog([name + ':', line]);
  };
  state.onPause = openPauseMenu;
  state.onBattleEnd = endBattle;

  function showOverlay(show) {
    const el = document.getElementById('title');
    if (!el) return;
    el.hidden = !show;
    el.style.display = show ? '' : 'none';
  }

  function init() {
    const versionEl = document.getElementById('version');
    if (versionEl) {
      versionEl.textContent = VERSION + ' · ' + BUILD;
      versionEl.style.pointerEvents = 'auto';
      versionEl.style.cursor = 'pointer';
      versionEl.addEventListener('click', () => {
        if (lastErr) alert(String(lastErr.stack || lastErr.message || lastErr));
        else alert(VERSION + ' · ' + BUILD + '\n(no error captured)');
      });
    }
    ensureSettings();
    const has = window.PR_SAVE.exists();
    if (has) document.getElementById('btn-continue').hidden = false;
    const unlock = () => {
      window.PR_AUDIO && window.PR_AUDIO.unlock();
      applySettings();
      if (state.mode === 'title') window.PR_MUSIC && window.PR_MUSIC.play('title');
    };
    const startFromTitle = (preferContinue) => {
      if (state.mode !== 'title') return;
      unlock();
      if (preferContinue && window.PR_SAVE.exists()) continueGame();
      else if (window.PR_SAVE.exists()) continueGame();
      else startNewGame();
    };
    const bindStart = (el, handler) => {
      if (!el) return;
      let fired = false;
      const trigger = (e) => {
        if (fired) return;
        fired = true; setTimeout(() => fired = false, 400);
        if (e) { e.stopPropagation(); e.preventDefault(); }
        handler();
      };
      el.addEventListener('click', trigger);
      el.addEventListener('pointerup', trigger);
      el.addEventListener('touchend', trigger, { passive:false });
    };
    bindStart(document.getElementById('btn-new'),      () => { unlock(); startNewGame(); });
    bindStart(document.getElementById('btn-continue'), () => { unlock(); continueGame(); });
    // Tap anywhere on the title overlay starts the game.
    const titleEl = document.getElementById('title');
    bindStart(titleEl, () => startFromTitle(true));
    // Keyboard: Enter / Space / Z / X all start.
    document.addEventListener('keydown', (e) => {
      unlock();
      if (state.mode === 'title') {
        const k = e.key;
        if (k === 'Enter' || k === ' ' || k === 'z' || k === 'Z' || k === 'x' || k === 'X') {
          e.preventDefault();
          startFromTitle(true);
        }
      }
    });
    document.addEventListener('pointerdown', unlock, { once:false });
    // Register the service worker for offline play.
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./js/sw.js').catch((e) => {
          console.warn('SW register failed:', e);
        });
      });
    }
    requestAnimationFrame(loop);
  }

  function startNewGame() {
    window.PR_SAVE.clear();
    state.player = { name:'YOU', map:'rodport', x:4, y:5, dir:'down', money:500, balls:5, steps:0,
                     bag: { rodball:5, potion:3, antidote:1, oranberry:1 } };
    state.party = [];
    state.flags = { starterChosen:false };
    state.defeatedTrainers = new Set();
    state.dex = { seen: new Set(), caught: new Set() };
    if (window.PR_ITEMS) window.PR_ITEMS.ensureBag(state);
    state.world = new window.PR_WORLD.World(state);
    state.intro = { page: 0, charT: 0 };
    state.mode = 'intro';
    showOverlay(false);
  }

  function continueGame() {
    const data = window.PR_SAVE.load();
    if (!data) { startNewGame(); return; }
    applySaveData(data);
    state.mode = 'overworld';
    showOverlay(false);
  }

  let lastT = performance.now();
  let lastErr = null;
  function loop(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    let frameErr = null;
    try { update(dt); }
    catch (err) { frameErr = err; console.error('[PokeRod] update error:', err); }
    try { render(); }
    catch (err) { frameErr = frameErr || err; console.error('[PokeRod] render error:', err); }
    if (frameErr) {
      lastErr = frameErr;
      try {
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(0, VIEW_H - 22, VIEW_W, 22);
        const msg = String(frameErr && frameErr.message || frameErr);
        if (window.PR_UI && window.PR_UI.drawText) {
          window.PR_UI.drawText(ctx, ('ERR: ' + msg).slice(0, 38), 4, VIEW_H - 18, '#f08080');
          window.PR_UI.drawText(ctx, 'TAP VERSION TO COPY DETAILS', 4, VIEW_H - 8, '#ffd060');
        }
      } catch (_) {}
    } else {
      lastErr = null;
    }
    window.PR_INPUT.frameEnd();
    requestAnimationFrame(loop);
  }

  function update(dt) {
    if (state._prevMode !== state.mode) {
      state._prevMode = state.mode;
      state.errorLogged = false;
    }
    // Global: Select toggles audio mute.
    if (window.PR_INPUT.consumePressed('Shift')) {
      const A = window.PR_AUDIO;
      if (A) {
        A.unlock();
        A.setMuted(!A.isMuted());
        showFlash(A.isMuted() ? 'MUTED' : 'AUDIO ON');
      }
    }
    if (state.mode === 'title') updateTitle();
    else if (state.mode === 'intro') updateIntro(dt);
    else if (state.mode === 'overworld') state.world.update(dt);
    else if (state.mode === 'battle') state.battle.update(dt);
    else if (state.mode === 'dialog') updateDialog();
    else if (state.mode === 'menu') updateMenu();
    else if (state.mode === 'map') updateWorldMap();
    else if (state.mode === 'settings') updateSettings();
    else if (state.mode === 'dex') updateDex();
    else if (state.mode === 'slots') updateSlotPicker();
    else if (state.mode === 'bag') updateBag();
    else if (state.mode === 'bagtarget') updateBagTarget();
    else if (state.mode === 'box') updateBox();
    else if (state.mode === 'quests') updateQuests();
    else if (state.mode === 'shop') window.PR_SHOP && window.PR_SHOP.update(state);
    else if (state.mode === 'starter') updateStarter();
  }

  let flashText = null, flashTimer = 0;
  function showFlash(text) { flashText = text; flashTimer = 1.4; }
  state.showFlash = showFlash;

  function updateTitle() {
    const I = window.PR_INPUT;
    if (I.consumePressed('Enter') || I.consumePressed('z') || I.consumePressed('x')) {
      window.PR_AUDIO && window.PR_AUDIO.unlock();
      if (window.PR_SAVE.exists()) continueGame();
      else startNewGame();
    }
  }

  function render() {
    if (state.mode === 'title') { drawFlash(); return; }
    if (state.mode === 'intro') { drawIntro(); drawFlash(); return; }
    if (state.mode === 'battle') { state.battle.render(ctx); drawFlash(); return; }
    state.world.render(ctx);
    if (state.mode === 'dialog') drawDialog();
    else if (state.mode === 'menu') drawMenu();
    else if (state.mode === 'map') drawWorldMap();
    else if (state.mode === 'settings') drawSettings();
    else if (state.mode === 'dex') drawDex();
    else if (state.mode === 'slots') drawSlotPicker();
    else if (state.mode === 'bag') drawBag();
    else if (state.mode === 'bagtarget') drawBagTarget();
    else if (state.mode === 'box') drawBox();
    else if (state.mode === 'quests') drawQuests();
    else if (state.mode === 'shop') window.PR_SHOP && window.PR_SHOP.draw(ctx, state, VIEW_W, VIEW_H);
    else if (state.mode === 'starter') drawStarter();
    drawFlash();
  }

  function drawFlash() {
    if (flashTimer <= 0 || !flashText) return;
    flashTimer -= 1/60;
    const w = flashText.length * 6 + 16;
    const x = (VIEW_W - w) / 2 | 0, y = 4;
    window.PR_UI.box(ctx, x, y, w, 14, '#fff', '#202020');
    window.PR_UI.drawText(ctx, flashText, x + 8, y + 4, '#202020');
  }

  // ---------- Dialog ----------
  function openDialog(lines, onDone, source) {
    state.dialog = { lines: lines.slice(), index:0, onDone: onDone || null, source: source || null };
    state.mode = 'dialog';
  }
  function updateDialog() {
    const d = state.dialog;
    if (window.PR_INPUT.consumePressed('z') || window.PR_INPUT.consumePressed('Enter')) {
      window.PR_SFX && window.PR_SFX.play('page');
      d.index++;
      if (d.index >= d.lines.length) {
        const cb = d.onDone, src = d.source;
        state.dialog = null;
        state.mode = 'overworld';
        if (cb) {
          try { cb(src); }
          catch (err) {
            console.error('[PokeRod] dialog onDone error:', err);
            // Surface a brief flash so we don't lose the user silently.
            showFlash('CB ERR: ' + (err && err.message || err).toString().slice(0, 24));
          }
        }
      }
    }
  }
  function drawDialog() {
    const d = state.dialog;
    const text = d.lines[d.index] || '';
    const lines = window.PR_UI.wrap(text, 30);
    window.PR_UI.drawDialog(ctx, lines.slice(0,3), VIEW_W, VIEW_H, true);
  }

  window.addEventListener('DOMContentLoaded', init);
  if (document.readyState !== 'loading') init();

  // expose for further additions
  window.PR_GAME = {
    state,
    openBagFromBattle: () => openBag('battle')
  };

  // ---------- Intro ----------
  const INTRO_PAGES = [
    { kind:'prof', lines:[
      'Hello there!',
      'I am PROF. ROD, a researcher of POKEROD.'
    ] },
    { kind:'creature', species:'emberkit', lines:[
      'These small marvels are POKEROD.',
      'Some live wild; others walk with friends.'
    ] },
    { kind:'creature', species:'aquapup', lines:[
      'They come in every shape and element.',
      'Each one has its own quirks and skills.'
    ] },
    { kind:'creature', species:'sproutling', lines:[
      'A trainer with a kind heart',
      'can earn a partner for life.'
    ] },
    { kind:'prof', lines:[
      'My grandkids set out years ago.',
      'Today, the road calls to YOU.'
    ] },
    { kind:'player', lines:[
      'Step out of your house in RODPORT.',
      'Visit my lab. A partner is waiting.'
    ] },
    { kind:'player', lines:[
      'The world of POKEROD awaits!',
      'Press Z to begin.'
    ] }
  ];

  function updateIntro(dt) {
    const I = window.PR_INPUT;
    state.intro.charT += dt * 60;
    if (I.consumePressed('z') || I.consumePressed('Enter')) {
      const page = INTRO_PAGES[state.intro.page];
      const fullLen = page.lines.join('\n').length;
      if (state.intro.charT < fullLen) {
        state.intro.charT = fullLen + 999;
        return;
      }
      state.intro.page++;
      state.intro.charT = 0;
      if (state.intro.page >= INTRO_PAGES.length) {
        state.mode = 'overworld';
        state.world.justEntered = true;
      }
    }
    if (I.consumePressed('x')) {
      // Skip intro entirely.
      state.mode = 'overworld';
      state.world.justEntered = true;
    }
  }

  function drawIntro() {
    const page = INTRO_PAGES[state.intro.page];
    if (!page) return;
    // Vignette background.
    ctx.fillStyle = '#0a0810';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // Gradient-ish top stripe.
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = 'rgba(216,48,32,' + (0.05 - i*0.004) + ')';
      ctx.fillRect(0, i*2, VIEW_W, 2);
    }

    // Visual.
    if (page.kind === 'creature') {
      window.PR_MONS.drawCreature(ctx, page.species, (VIEW_W - 64)/2, 18, 64, false);
    } else if (page.kind === 'prof') {
      drawProfPortrait(ctx, (VIEW_W - 48)/2, 22);
    } else if (page.kind === 'player') {
      drawPlayerPortrait(ctx, (VIEW_W - 32)/2, 28);
    }

    // Title bar.
    window.PR_UI.drawText(ctx, 'POKEROD', VIEW_W/2 - 21, 6, '#f0b03a');

    // Text area at the bottom.
    const x = 8, y = VIEW_H - 56, w = VIEW_W - 16, h = 50;
    window.PR_UI.box(ctx, x, y, w, h, '#fff', '#202020');
    const fullText = page.lines.join('\n');
    const shown = fullText.slice(0, Math.min(fullText.length, state.intro.charT|0));
    window.PR_UI.drawText(ctx, shown, x + 6, y + 6, '#202020');
    // Page indicator.
    window.PR_UI.drawText(ctx, (state.intro.page+1) + '/' + INTRO_PAGES.length,
      x + w - 22, y + h - 10, '#808080');
    if (state.intro.charT >= fullText.length) {
      const t = (performance.now() / 250) | 0;
      if (t % 2 === 0) {
        ctx.fillStyle = '#202020';
        ctx.fillRect(x + w - 8, y + h - 8, 4, 4);
      }
    }
    window.PR_UI.drawText(ctx, 'X: SKIP', 6, VIEW_H - 8, '#606060');
  }

  function drawProfPortrait(ctx, x, y) {
    // Head.
    ctx.fillStyle = '#f0c898'; ctx.fillRect(x+12, y+10, 24, 20);
    // Hair (red).
    ctx.fillStyle = '#d83020'; ctx.fillRect(x+10, y+4, 28, 8);
    ctx.fillStyle = '#a82010'; ctx.fillRect(x+10, y+4, 28, 2);
    // Lab coat.
    ctx.fillStyle = '#fff';    ctx.fillRect(x+8, y+30, 32, 18);
    ctx.fillStyle = '#c8c8d0'; ctx.fillRect(x+8, y+30, 32, 2);
    // Tie / collar.
    ctx.fillStyle = '#a02828'; ctx.fillRect(x+22, y+30, 4, 8);
    // Eyes & mouth.
    ctx.fillStyle = '#000'; ctx.fillRect(x+18, y+18, 2, 2);
    ctx.fillRect(x+28, y+18, 2, 2);
    ctx.fillRect(x+22, y+24, 4, 1);
    // Eye glints.
    ctx.fillStyle = '#fff'; ctx.fillRect(x+18, y+18, 1, 1); ctx.fillRect(x+28, y+18, 1, 1);
    // Beard hint.
    ctx.fillStyle = '#c8b090'; ctx.fillRect(x+16, y+27, 16, 2);
  }

  function drawPlayerPortrait(ctx, x, y) {
    ctx.fillStyle = '#d83020'; ctx.fillRect(x+4, y, 24, 8);
    ctx.fillStyle = '#a82010'; ctx.fillRect(x+4, y, 24, 2);
    ctx.fillStyle = '#f0c898'; ctx.fillRect(x+6, y+6, 20, 14);
    ctx.fillStyle = '#000';
    ctx.fillRect(x+11, y+12, 2, 2);
    ctx.fillRect(x+19, y+12, 2, 2);
    ctx.fillRect(x+13, y+17, 6, 1);
    ctx.fillStyle = '#d83838'; ctx.fillRect(x+4, y+20, 24, 10);
    ctx.fillStyle = '#a01818'; ctx.fillRect(x+4, y+20, 24, 2);
    ctx.fillStyle = '#3050a8'; ctx.fillRect(x+8, y+30, 16, 12);
  }

  // ---------- Encounters ----------
  function startWildEncounter() {
    if (!state.party.length) return;
    const alive = state.party.some(p => p.hp > 0);
    if (!alive) return;
    const m = state.world.currentMap();
    if (!m.encounters || !m.encounters.length) return;
    const total = m.encounters.reduce((a,e) => a + e.weight, 0);
    let r = Math.random() * total;
    let pick = m.encounters[0];
    for (const e of m.encounters) { r -= e.weight; if (r <= 0) { pick = e; break; } }
    const lvl = pick.minL + Math.floor(Math.random() * (pick.maxL - pick.minL + 1));
    startBattleAgainstWild(pick.species, lvl);
  }

  // ---------- Battle setup helpers ----------
  // Each step is logged on failure so we can pinpoint which line threw.
  function startBattleAgainstTrainer(npc, trainerKey) {
    let step = 'init';
    try {
      step = 'sfx-play';
      if (window.PR_SFX) window.PR_SFX.play('encounter');
      step = 'music-play';
      if (window.PR_MUSIC) window.PR_MUSIC.play('battle');
      step = 'check-data';
      if (!window.PR_DATA || !window.PR_DATA.makeMon) throw new Error('PR_DATA missing');
      step = 'check-battle';
      if (!window.PR_BATTLE || !window.PR_BATTLE.Battle) throw new Error('PR_BATTLE missing');
      step = 'check-trainer';
      if (!npc || !npc.trainer || !Array.isArray(npc.trainer.team)) throw new Error('trainer team missing');
      step = 'build-team';
      const team = npc.trainer.team.map(([sp, lv]) => window.PR_DATA.makeMon(sp, lv));
      step = 'construct-battle';
      state.battle = new window.PR_BATTLE.Battle(state, {
        trainer: { team, reward: npc.trainer.reward, defeat: npc.trainer.defeat },
        npcKey: trainerKey,
        badge: npc.badge || null
      });
      step = 'set-mode';
      state.mode = 'battle';
    } catch (err) {
      console.error('[PokeRod] trainer battle failed at step:', step, err);
      const msg = (err && err.message) || String(err);
      showFlash('TRAINER ' + step + ': ' + msg.slice(0, 22));
    }
  }

  function startBattleAgainstWild(species, level) {
    let step = 'init';
    try {
      step = 'sfx-play';
      if (window.PR_SFX) window.PR_SFX.play('encounter');
      step = 'music-play';
      if (window.PR_MUSIC) window.PR_MUSIC.play('battle');
      step = 'check-data';
      if (!window.PR_DATA || !window.PR_DATA.makeMon) throw new Error('PR_DATA missing');
      step = 'check-battle';
      if (!window.PR_BATTLE || !window.PR_BATTLE.Battle) throw new Error('PR_BATTLE missing');
      step = 'make-mon';
      const wild = window.PR_DATA.makeMon(species, level);
      step = 'construct-battle';
      state.battle = new window.PR_BATTLE.Battle(state, { wild });
      step = 'set-mode';
      state.mode = 'battle';
      state.world.encounterCooldown = 6;
    } catch (err) {
      console.error('[PokeRod] wild battle failed at step:', step, err);
      const msg = (err && err.message) || String(err);
      showFlash('WILD ' + step + ': ' + msg.slice(0, 24));
    }
  }

  // ---------- NPC interaction ----------
  function gateConditionsMet(gate) {
    if (!gate) return true;
    const badges = state.player.badges || [];
    if (gate.badges && !gate.badges.every(b => badges.includes(b))) return false;
    if (gate.minBadges && badges.length < gate.minBadges) return false;
    if (gate.items && state.player.bag) {
      if (!gate.items.every(it => (state.player.bag[it] | 0) > 0)) return false;
    }
    if (gate.flag && !(state.flags || {})[gate.flag]) return false;
    return true;
  }

  function handleGateNpc(npc) {
    if (!npc.gate) return false;
    if (gateConditionsMet(npc.gate)) return false; // npc has already vanished
    const msg = npc.gate.message || ['The way is blocked.'];
    openDialog(Array.isArray(msg) ? msg : [msg]);
    return true;
  }
  state.gateConditionsMet = gateConditionsMet;

  function handleNpcInteract(npc) {
    if (handleGateNpc(npc)) return;
    if (npc.legendary) {
      const key = state.player.map + ':leg:' + npc.x + ',' + npc.y;
      if (state.defeatedTrainers.has(key)) {
        openDialog(npc.afterDialog || ['It is gone.']);
        return;
      }
      if (!state.party.length || !state.party.some(p => p.hp > 0)) {
        openDialog(['Your team is in no shape for this!']);
        return;
      }
      openDialog(npc.dialog || ['A roar echoes!'], () => {
        startBattleAgainstWild(npc.species, npc.level);
        state.defeatedTrainers.add(key);
      });
      return;
    }
    if (npc.starter && !state.flags.starterChosen) {
      openStarterChoice();
      return;
    }
    if (npc.ballSlot !== undefined && !state.flags.starterChosen) {
      openStarterChoice();
      return;
    }
    if (npc.healer) {
      openDialog([
        npc.dialog ? npc.dialog[0] : 'Welcome!',
        'Shall I heal your team?'
      ], () => healAtCenter());
      return;
    }
    if (npc.shop) {
      const greet = (npc.shop.greeting && npc.shop.greeting.length)
        ? npc.shop.greeting
        : (npc.dialog && npc.dialog.length ? [npc.dialog[0]] : ['Welcome to the MART!']);
      openDialog(greet, () => {
        if (window.PR_SHOP) window.PR_SHOP.open(state, npc);
      });
      return;
    }
    if (npc.trainer) {
      const trainerKey = state.player.map + ':' + npc.x + ',' + npc.y;
      if (state.defeatedTrainers.has(trainerKey)) {
        openDialog(npc.trainer.defeat || ['You already beat me!']);
        return;
      }
      // Gym requirement gating.
      if (npc.gym && npc.gymRequirement) {
        ensureDex();
        const r = npc.gymRequirement;
        const badges = state.player.badges || [];
        if (r.minCaught && state.dex.caught.size < r.minCaught) {
          openDialog(npc.gymLocked || ['You are not ready yet.']);
          return;
        }
        if (r.minBadges && badges.length < r.minBadges) {
          openDialog(npc.gymLocked || ['Earn ' + r.minBadges + ' badges first.']);
          return;
        }
        if (r.badges && !r.badges.every(b => badges.includes(b))) {
          openDialog(npc.gymLocked || ['You need more badges before challenging me.']);
          return;
        }
        if (r.minPartyLevel && !state.party.some(m => (m.level|0) >= r.minPartyLevel)) {
          openDialog(npc.gymLocked || ['Train your team to lv ' + r.minPartyLevel + ' first.']);
          return;
        }
      }
      if (!state.party.length || !state.party.some(p => p.hp > 0)) {
        openDialog(['You have no able partners!','Heal up before challenging me.']);
        return;
      }
      const lines = (npc.dialog || ['Battle!']).slice();
      openDialog(lines, () => {
        startBattleAgainstTrainer(npc, trainerKey);
      });
      return;
    }
    openDialog(npc.dialog || ['...']);
  }

  function healAtCenter() {
    openDialog(['Healing your team...','All set! Have a great day!'], () => {
      window.PR_SFX && window.PR_SFX.play('heal');
      for (const m of state.party) {
        m.hp = m.stats.hp;
        m.status = null;
        for (const mv of m.moves) mv.pp = mv.ppMax;
      }
      window.PR_SAVE.save(state);
    });
  }

  // ---------- Starter selection ----------
  const STARTERS = ['emberkit','aquapup','sproutling'];
  function openStarterChoice() {
    state.starterMenu = { idx: 0 };
    state.mode = 'starter';
  }
  function updateStarter() {
    const I = window.PR_INPUT;
    if (I.consumePressed('ArrowLeft'))  { state.starterMenu.idx = (state.starterMenu.idx + 2) % 3; window.PR_SFX && window.PR_SFX.play('select'); }
    if (I.consumePressed('ArrowRight')) { state.starterMenu.idx = (state.starterMenu.idx + 1) % 3; window.PR_SFX && window.PR_SFX.play('select'); }
    if (I.consumePressed('x')) { state.starterMenu = null; state.mode = 'overworld'; return; }
    if (I.consumePressed('z')) {
      window.PR_SFX && window.PR_SFX.play('confirm');
      const sp = STARTERS[state.starterMenu.idx];
      const mon = window.PR_DATA.makeMon(sp, 5);
      mon.held = 'oranberry';
      state.party.push(mon);
      state.flags.starterChosen = true;
      state.starterMenu = null;
      state.mode = 'dialog';
      const name = window.PR_DATA.CREATURES[sp].name;
      state.dialog = {
        lines: ['You chose ' + name + '!','Take good care of it.'],
        index: 0,
        onDone: () => window.PR_SAVE.save(state)
      };
    }
  }
  function drawStarter() {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    window.PR_UI.box(ctx, 8, 8, VIEW_W - 16, VIEW_H - 16, '#fff', '#202020');
    window.PR_UI.drawText(ctx, 'CHOOSE YOUR PARTNER', 30, 16, '#202020');
    for (let i = 0; i < 3; i++) {
      const sx = 24 + i * 64;
      const sy = 36;
      if (i === state.starterMenu.idx) {
        ctx.fillStyle = '#f0c020';
        ctx.fillRect(sx - 4, sy - 4, 56, 56);
      }
      window.PR_MONS.drawCreature(ctx, STARTERS[i], sx, sy, 48, false);
      const name = window.PR_DATA.CREATURES[STARTERS[i]].name;
      window.PR_UI.drawText(ctx, name, sx, sy + 52, '#202020');
    }
    const sel = STARTERS[state.starterMenu.idx];
    const sp = window.PR_DATA.CREATURES[sel];
    window.PR_UI.drawText(ctx, sp.types.join('/'), 16, 120, '#202020');
    window.PR_UI.drawText(ctx, 'Z: PICK   X: CANCEL', 16, 140, '#202020');
  }

  // ---------- Pause menu ----------
  function openPauseMenu() {
    state.menu = { idx: 0, options: ['MAP','DEX','BAG','PARTY','BOX','QUEST','PVP','SETTINGS','SAVE','EXIT'] };
    state.mode = 'menu';
  }
  function updateMenu() {
    const I = window.PR_INPUT;
    const m = state.menu;
    if (I.consumePressed('ArrowDown')) m.idx = (m.idx + 1) % m.options.length;
    if (I.consumePressed('ArrowUp'))   m.idx = (m.idx + m.options.length - 1) % m.options.length;
    if (I.consumePressed('x') || I.consumePressed('Enter')) { state.menu = null; state.mode = 'overworld'; return; }
    if (I.consumePressed('z')) {
      const opt = m.options[m.idx];
      if (opt === 'SAVE') {
        openSlotPicker('save');
      } else if (opt === 'EXIT') {
        state.menu = null;
        state.mode = 'overworld';
      } else if (opt === 'PARTY') {
        m.viewing = 'party';
      } else if (opt === 'MAP') {
        openWorldMap();
      } else if (opt === 'SETTINGS') {
        openSettings();
      } else if (opt === 'DEX') {
        openDex();
      } else if (opt === 'BAG') {
        openBag('overworld');
      } else if (opt === 'BOX') {
        openBox();
      } else if (opt === 'QUEST') {
        openQuests();
      } else if (opt === 'PVP') {
        startRivalDuel();
      }
    }
  }
  function drawMenu() {
    const m = state.menu;
    if (m.viewing === 'party') {
      drawPartyView(); return;
    }
    const w = 92;
    const h = m.options.length * 12 + 22;
    const x = VIEW_W - w - 6, y = 6;
    window.PR_UI.box(ctx, x, y, w, h, '#fff', '#202020');
    // Money chip at the top so it never collides with entries.
    window.PR_UI.drawText(ctx, '$' + state.player.money, x + 4, y + 4, '#385890');
    // Separator line.
    ctx.fillStyle = '#202020';
    ctx.fillRect(x + 4, y + 13, w - 8, 1);
    for (let i = 0; i < m.options.length; i++) {
      const cy = y + 17 + i * 12;
      if (i === m.idx) window.PR_UI.drawText(ctx, '>', x + 4, cy, '#e83838');
      window.PR_UI.drawText(ctx, m.options[i], x + 12, cy, '#202020');
    }
    if (m.flashTimer > 0) {
      m.flashTimer -= 1/60;
      window.PR_UI.box(ctx, 40, 70, 160, 20, '#fff', '#202020');
      window.PR_UI.drawText(ctx, m.flash, 50, 76, '#202020');
    }
  }
  // ---------- Settings ----------
  const SETTINGS_DEFAULTS = {
    sfxVol: 'med',     // off | low | med | high
    musicVol: 'med',
    textSpeed: 'normal', // slow | normal | fast
    reducedMotion: false,
    colorblind: false
  };
  const VOL_STEPS = ['off','low','med','high'];
  const VOL_VALUES = { off:0, low:0.25, med:0.55, high:1.0 };
  const TEXT_SPEED_STEPS = ['slow','normal','fast'];

  function ensureSettings() {
    if (!state.settings) state.settings = Object.assign({}, SETTINGS_DEFAULTS);
    for (const k of Object.keys(SETTINGS_DEFAULTS)) {
      if (state.settings[k] === undefined) state.settings[k] = SETTINGS_DEFAULTS[k];
    }
  }

  function applySettings() {
    ensureSettings();
    const A = window.PR_AUDIO && window.PR_AUDIO._internal;
    if (A) {
      if (A.sfxGain)   A.sfxGain.gain.value   = VOL_VALUES[state.settings.sfxVol];
      if (A.musicGain) A.musicGain.gain.value = VOL_VALUES[state.settings.musicVol] * 0.6;
    }
    window.PR_SETTINGS = state.settings;
  }

  function openSettings() {
    ensureSettings();
    state.settingsView = { idx: 0 };
    state.mode = 'settings';
    window.PR_SFX && window.PR_SFX.play('confirm');
  }

  const SETTINGS_ROWS = [
    { key:'sfxVol',        label:'SFX VOLUME',   type:'enum', steps:VOL_STEPS },
    { key:'musicVol',      label:'MUSIC VOLUME', type:'enum', steps:VOL_STEPS },
    { key:'textSpeed',     label:'TEXT SPEED',   type:'enum', steps:TEXT_SPEED_STEPS },
    { key:'reducedMotion', label:'REDUCED MOTION', type:'bool' },
    { key:'colorblind',    label:'COLOR-BLIND', type:'bool' }
  ];

  function updateSettings() {
    const I = window.PR_INPUT;
    const v = state.settingsView;
    if (I.consumePressed('ArrowDown')) { v.idx = (v.idx + 1) % SETTINGS_ROWS.length; window.PR_SFX && window.PR_SFX.play('select'); }
    if (I.consumePressed('ArrowUp'))   { v.idx = (v.idx + SETTINGS_ROWS.length - 1) % SETTINGS_ROWS.length; window.PR_SFX && window.PR_SFX.play('select'); }
    if (I.consumePressed('x')) { state.settingsView = null; state.mode = 'menu'; return; }
    const row = SETTINGS_ROWS[v.idx];
    const cycle = (delta) => {
      if (row.type === 'bool') state.settings[row.key] = !state.settings[row.key];
      else {
        const i = row.steps.indexOf(state.settings[row.key]);
        const next = (i + delta + row.steps.length) % row.steps.length;
        state.settings[row.key] = row.steps[next];
      }
      applySettings();
      window.PR_SAVE.save && window.PR_SAVE.save(state);
      window.PR_SFX && window.PR_SFX.play('confirm');
    };
    if (I.consumePressed('ArrowRight') || I.consumePressed('z')) cycle(1);
    if (I.consumePressed('ArrowLeft'))  cycle(-1);
  }

  function drawSettings() {
    const x = 6, y = 6, w = VIEW_W - 12, h = VIEW_H - 12;
    window.PR_UI.box(ctx, x, y, w, h, '#fff', '#202020');
    window.PR_UI.drawText(ctx, 'SETTINGS', x + 8, y + 4, '#202020');
    window.PR_UI.drawText(ctx, 'B:BACK', x + w - 38, y + 4, '#806040');
    for (let i = 0; i < SETTINGS_ROWS.length; i++) {
      const row = SETTINGS_ROWS[i];
      const cy = y + 22 + i * 16;
      if (i === state.settingsView.idx) window.PR_UI.drawText(ctx, '>', x + 4, cy, '#e83838');
      window.PR_UI.drawText(ctx, row.label, x + 12, cy, '#202020');
      let val;
      if (row.type === 'bool') val = state.settings[row.key] ? 'ON' : 'OFF';
      else val = (state.settings[row.key] || '').toUpperCase();
      window.PR_UI.drawText(ctx, '< ' + val + ' >', x + w - 78, cy, '#385890');
    }
    window.PR_UI.drawText(ctx, 'A / R: cycle    L: prev', x + 8, y + h - 12, '#806040');
  }

  // ---------- Rival duel (PvP-style mirror match) ----------
  function startRivalDuel() {
    if (!state.party || !state.party.length) {
      showFlash('No party!');
      return;
    }
    state.menu = null;
    state.mode = 'overworld';
    // Build a mirror team: same species at level + 1.
    const team = state.party.slice(0, 3).map(mon =>
      [mon.species, Math.min(100, (mon.level|0) + 1)]
    );
    const trainerNpc = {
      x:-1, y:-1,
      name:'RIVAL BLAINE',
      dialog:["So we meet again!","Show me how far you have come!"],
      trainer: { team, reward: 800, defeat:["Tch! I'll be back stronger."] }
    };
    const trainerKey = 'pvp:rival:' + Date.now();
    openDialog(trainerNpc.dialog, () => {
      startBattleAgainstTrainer(trainerNpc, trainerKey);
    });
  }

  // ---------- Quests ----------
  function openQuests() {
    if (window.PR_QUESTS) window.PR_QUESTS.ensure(state);
    state.questsView = { idx: 0 };
    state.mode = 'quests';
    window.PR_SFX && window.PR_SFX.play('confirm');
  }
  function updateQuests() {
    const I = window.PR_INPUT;
    const v = state.questsView;
    const list = window.PR_QUESTS ? window.PR_QUESTS.list(state) : [];
    if (I.consumePressed('ArrowDown') && list.length) v.idx = (v.idx + 1) % list.length;
    if (I.consumePressed('ArrowUp')   && list.length) v.idx = (v.idx + list.length - 1) % list.length;
    if (I.consumePressed('x')) { state.questsView = null; state.mode = 'menu'; }
  }
  function drawQuests() {
    const x = 6, y = 6, w = VIEW_W - 12, h = VIEW_H - 12;
    window.PR_UI.box(ctx, x, y, w, h, '#fff', '#202020');
    window.PR_UI.drawText(ctx, 'QUESTS', x + 6, y + 4, '#202020');
    window.PR_UI.drawText(ctx, 'B:BACK', x + w - 38, y + 4, '#806040');
    const list = window.PR_QUESTS ? window.PR_QUESTS.list(state) : [];
    if (!list.length) {
      window.PR_UI.drawText(ctx, 'No quests yet.', x + 8, y + 30, '#806040');
      return;
    }
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      const cy = y + 22 + i * 18;
      if (i === state.questsView.idx) { ctx.fillStyle = '#f0c020'; ctx.fillRect(x + 4, cy - 2, w - 8, 18); }
      const mark = e.status === 'done' ? '*' : '.';
      window.PR_UI.drawText(ctx, mark + ' ' + e.def.name, x + 8, cy, e.status === 'done' ? '#208830' : '#202020');
      window.PR_UI.drawText(ctx, e.def.desc.slice(0, 36), x + 8, cy + 8, '#806040');
    }
  }

  function tickQuests(triggerName) {
    if (!window.PR_QUESTS) return;
    const completed = window.PR_QUESTS.tick(state);
    for (const q of completed) {
      window.PR_SFX && window.PR_SFX.play('levelup');
      if (q.reward && window.PR_ITEMS) {
        window.PR_ITEMS.add(state, q.reward.item, q.reward.count || 1);
      }
      const rewardName = q.reward && window.PR_ITEMS && window.PR_ITEMS.ITEMS[q.reward.item]
        ? window.PR_ITEMS.ITEMS[q.reward.item].name : '';
      const lines = ['QUEST CLEARED: ' + q.name];
      if (rewardName) lines.push('Got ' + (q.reward.count || 1) + ' ' + rewardName + '!');
      openDialog(lines, () => window.PR_SAVE.save && window.PR_SAVE.save(state));
    }
  }
  window.PR_GAME = window.PR_GAME || {};
  window.PR_GAME.tickQuests = tickQuests;

  // ---------- PC storage box ----------
  function ensureBox() {
    if (!Array.isArray(state.box)) state.box = [];
  }
  // Hook battle to deposit overflow catches.
  window.PR_BOX = {
    deposit: (mon) => { ensureBox(); state.box.push(mon); },
    list:    () => { ensureBox(); return state.box; }
  };

  function openBox() {
    ensureBox();
    state.boxView = { idx: 0, side: 'box' /* or 'party' */, action: null };
    state.mode = 'box';
    window.PR_SFX && window.PR_SFX.play('confirm');
  }

  function updateBox() {
    const I = window.PR_INPUT;
    const v = state.boxView;
    const list = v.side === 'box' ? state.box : state.party;
    if (I.consumePressed('ArrowDown')) { if (list.length) v.idx = (v.idx + 1) % list.length; }
    if (I.consumePressed('ArrowUp'))   { if (list.length) v.idx = (v.idx + list.length - 1) % list.length; }
    if (I.consumePressed('ArrowRight') || I.consumePressed('ArrowLeft')) {
      v.side = v.side === 'box' ? 'party' : 'box';
      v.idx = 0;
      window.PR_SFX && window.PR_SFX.play('select');
    }
    if (I.consumePressed('x')) { state.boxView = null; state.mode = 'menu'; return; }
    if (I.consumePressed('z') || I.consumePressed('Enter')) {
      // Swap selected with the first available slot on the other side.
      if (v.side === 'box') {
        if (state.party.length >= 6) { showFlash('PARTY FULL'); return; }
        if (!state.box.length) return;
        const mon = state.box.splice(v.idx, 1)[0];
        state.party.push(mon);
        if (v.idx >= state.box.length) v.idx = Math.max(0, state.box.length - 1);
        showFlash('Withdrew ' + mon.nickname);
      } else {
        if (state.party.length <= 1) { showFlash('NEED 1 PARTY MEMBER'); return; }
        const mon = state.party.splice(v.idx, 1)[0];
        state.box.push(mon);
        if (v.idx >= state.party.length) v.idx = Math.max(0, state.party.length - 1);
        showFlash('Deposited ' + mon.nickname);
      }
      window.PR_SAVE.save && window.PR_SAVE.save(state);
    }
  }

  function drawBox() {
    ensureBox();
    const x = 6, y = 6, w = VIEW_W - 12, h = VIEW_H - 12;
    window.PR_UI.box(ctx, x, y, w, h, '#fff', '#202020');
    window.PR_UI.drawText(ctx, 'PC STORAGE', x + 6, y + 4, '#202020');
    window.PR_UI.drawText(ctx, 'B:BACK  L/R:SIDE', x + w - 90, y + 4, '#806040');

    // Two columns: BOX | PARTY
    const colW = (w - 16) / 2;
    const drawList = (label, list, sx, isActive) => {
      window.PR_UI.drawText(ctx, label + ' (' + list.length + ')', sx + 4, y + 16, isActive ? '#e83838' : '#385890');
      for (let i = 0; i < Math.min(list.length, 6); i++) {
        const mon = list[i];
        const cy = y + 28 + i * 16;
        if (isActive && i === state.boxView.idx) {
          ctx.fillStyle = '#f0c020'; ctx.fillRect(sx, cy - 2, colW, 14);
        }
        if (mon) {
          window.PR_MONS.drawCreature(ctx, mon.species, sx + 2, cy - 2, 14, false);
          window.PR_UI.drawText(ctx, mon.nickname.slice(0, 10), sx + 18, cy, '#202020');
          window.PR_UI.drawText(ctx, 'L' + mon.level, sx + colW - 18, cy, '#202020');
        }
      }
      if (!list.length) window.PR_UI.drawText(ctx, '(empty)', sx + 4, y + 32, '#806040');
    };
    drawList('BOX',   state.box,   x + 6,           state.boxView.side === 'box');
    drawList('PARTY', state.party, x + 12 + colW,   state.boxView.side === 'party');
    window.PR_UI.drawText(ctx, 'A: SWAP', x + 8, y + h - 12, '#806040');
  }

  // ---------- Bag ----------
  function openBag(returnTo) {
    window.PR_ITEMS && window.PR_ITEMS.ensureBag(state);
    state.bagView = { idx: 0, scroll: 0, returnTo: returnTo || 'overworld' };
    state.mode = 'bag';
    window.PR_SFX && window.PR_SFX.play('confirm');
  }

  function bagItems() {
    return window.PR_ITEMS ? window.PR_ITEMS.listOwned(state) : [];
  }

  function updateBag() {
    const I = window.PR_INPUT;
    const v = state.bagView;
    const items = bagItems();
    const max = items.length;
    if (max === 0) {
      if (I.consumePressed('x') || I.consumePressed('z')) {
        state.bagView = null;
        state.mode = v.returnTo === 'battle' ? 'battle' : 'menu';
      }
      return;
    }
    if (I.consumePressed('ArrowDown')) { v.idx = (v.idx + 1) % max; window.PR_SFX && window.PR_SFX.play('select'); }
    if (I.consumePressed('ArrowUp'))   { v.idx = (v.idx + max - 1) % max; window.PR_SFX && window.PR_SFX.play('select'); }
    if (I.consumePressed('x')) { state.bagView = null; state.mode = v.returnTo === 'battle' ? 'battle' : 'menu'; return; }
    if (I.consumePressed('z') || I.consumePressed('Enter')) {
      const it = items[v.idx];
      if (!it) return;
      const def = it.def;
      if (v.returnTo === 'battle') {
        if (def.kind === 'ball') {
          // Hand back to battle to throw ball.
          state.bagView = null;
          state.mode = 'battle';
          if (state.battle) state.battle.tryThrowBall();
          return;
        }
        // For heal/status/revive, ask for a target.
        state.bagTarget = { itemId: it.id, def, idx: 0, returnTo:'battle' };
        state.mode = 'bagtarget';
        return;
      }
      // Overworld: only target items make sense (not balls).
      if (def.battleOnly) { showFlash('Use in battle.'); return; }
      state.bagTarget = { itemId: it.id, def, idx: 0, returnTo:'menu' };
      state.mode = 'bagtarget';
    }
  }

  function drawBag() {
    const x = 6, y = 6, w = VIEW_W - 12, h = VIEW_H - 12;
    window.PR_UI.box(ctx, x, y, w, h, '#fff', '#202020');
    window.PR_UI.drawText(ctx, 'BAG', x + 6, y + 4, '#202020');
    window.PR_UI.drawText(ctx, 'B:BACK', x + w - 38, y + 4, '#806040');
    const items = bagItems();
    if (!items.length) {
      window.PR_UI.drawText(ctx, 'Bag is empty.', x + 8, y + 30, '#806040');
      return;
    }
    const v = state.bagView;
    const rows = 8, rowH = 12;
    const startY = y + 18;
    const start = Math.max(0, Math.min(items.length - rows, v.idx - 3));
    for (let r = 0; r < rows; r++) {
      const i = start + r;
      if (i >= items.length) break;
      const cy = startY + r * rowH;
      const it = items[i];
      if (i === v.idx) { ctx.fillStyle = '#f0c020'; ctx.fillRect(x + 4, cy - 1, w - 8, 11); }
      window.PR_UI.drawText(ctx, it.def.name, x + 8, cy, '#202020');
      window.PR_UI.drawText(ctx, 'x' + it.count, x + w - 32, cy, '#385890');
    }
    const sel = items[v.idx];
    if (sel) {
      window.PR_UI.drawText(ctx, sel.def.desc.slice(0, 38), x + 8, y + h - 12, '#806040');
    }
  }

  function updateBagTarget() {
    const I = window.PR_INPUT;
    const t = state.bagTarget;
    const party = state.party;
    if (I.consumePressed('ArrowDown')) { t.idx = (t.idx + 1) % party.length; window.PR_SFX && window.PR_SFX.play('select'); }
    if (I.consumePressed('ArrowUp'))   { t.idx = (t.idx + party.length - 1) % party.length; window.PR_SFX && window.PR_SFX.play('select'); }
    if (I.consumePressed('x')) {
      state.bagTarget = null;
      state.mode = 'bag';
      return;
    }
    if (I.consumePressed('z') || I.consumePressed('Enter')) {
      const target = party[t.idx];
      const result = window.PR_ITEMS.apply(t.itemId, target);
      if (!result.ok) { showFlash(result.message); return; }
      window.PR_ITEMS.take(state, t.itemId, 1);
      window.PR_SFX && window.PR_SFX.play('heal');
      // Mirror the change into the active battle creature if it's the one in play.
      if (state.battle && (state.battle.me === target)) {
        state.battle.hpAnim.me = target.hp;
      }
      state.bagTarget = null;
      if (t.returnTo === 'battle' && state.battle) {
        // Item use takes the player's turn.
        const f = state.battle;
        f.queue('Used ' + window.PR_ITEMS.ITEMS[t.itemId].name + '! ' + result.message);
        f.phase = 'message';
        f.afterMessages = () => {
          // Foe gets a free turn after item use (similar to swap).
          const foeMove = f.foe.moves[Math.floor(Math.random() * f.foe.moves.length)];
          f.turnOrder = ['foe'];
          f.turnMoves = { foe: foeMove };
          f.turnStep = 0;
          f.phase = 'turn';
        };
        state.mode = 'battle';
      } else {
        showFlash(result.message);
        state.mode = 'bag';
      }
    }
  }

  function drawBagTarget() {
    const x = 6, y = 6, w = VIEW_W - 12, h = VIEW_H - 12;
    window.PR_UI.box(ctx, x, y, w, h, '#a8c0e8', '#202020');
    window.PR_UI.drawText(ctx, 'USE ' + state.bagTarget.def.name + ' ON?', x + 6, y + 4, '#202020');
    window.PR_UI.drawText(ctx, 'B:BACK', x + w - 38, y + 4, '#806040');
    const t = state.bagTarget;
    for (let i = 0; i < state.party.length; i++) {
      const mon = state.party[i];
      const cy = y + 22 + i * 20;
      if (i === t.idx) { ctx.fillStyle = '#f0c020'; ctx.fillRect(x + 4, cy - 2, w - 8, 18); }
      window.PR_MONS.drawCreature(ctx, mon.species, x + 6, cy - 2, 18, false);
      window.PR_UI.drawText(ctx, mon.nickname, x + 28, cy, '#202020');
      window.PR_UI.drawText(ctx, 'L' + mon.level, x + 110, cy, '#202020');
      window.PR_UI.drawHpBar(ctx, x + 130, cy + 2, 60, mon.hp, mon.stats.hp);
      window.PR_UI.drawText(ctx, mon.hp + '/' + mon.stats.hp, x + w - 60, cy + 8, '#202020');
    }
  }

  // ---------- Save slot picker ----------
  function openSlotPicker(action) {
    state.slotPicker = { idx: state.activeSlot|0, action: action || 'save' };
    state.mode = 'slots';
    window.PR_SFX && window.PR_SFX.play('confirm');
  }

  function updateSlotPicker() {
    const I = window.PR_INPUT;
    const v = state.slotPicker;
    if (I.consumePressed('ArrowDown')) { v.idx = (v.idx + 1) % 3; window.PR_SFX && window.PR_SFX.play('select'); }
    if (I.consumePressed('ArrowUp'))   { v.idx = (v.idx + 2) % 3; window.PR_SFX && window.PR_SFX.play('select'); }
    if (I.consumePressed('x')) {
      state.slotPicker = null;
      state.mode = state.menu ? 'menu' : 'overworld';
      return;
    }
    if (I.consumePressed('z') || I.consumePressed('Enter')) {
      const slot = v.idx;
      if (v.action === 'save') {
        state.activeSlot = slot;
        const ok = window.PR_SAVE.save(state, slot);
        showFlash(ok ? ('SAVED TO SLOT ' + (slot + 1)) : 'SAVE FAILED');
      } else if (v.action === 'load') {
        const data = window.PR_SAVE.load(slot);
        if (!data) { showFlash('SLOT EMPTY'); return; }
        applySaveData(data);
        state.slotPicker = null;
        state.mode = 'overworld';
        showOverlay(false);
        if (state.onMapChange) state.onMapChange();
        return;
      }
      state.slotPicker = null;
      state.mode = state.menu ? 'menu' : 'overworld';
    }
  }

  function drawSlotPicker() {
    const x = 6, y = 6, w = VIEW_W - 12, h = VIEW_H - 12;
    window.PR_UI.box(ctx, x, y, w, h, '#fff', '#202020');
    const v = state.slotPicker;
    const title = v.action === 'save' ? 'SAVE TO WHICH SLOT?' : 'LOAD WHICH SLOT?';
    window.PR_UI.drawText(ctx, title, x + 6, y + 4, '#202020');
    window.PR_UI.drawText(ctx, 'B:BACK', x + w - 38, y + 4, '#806040');
    const info = window.PR_SAVE.slotInfo();
    const last = window.PR_SAVE.lastSlot();
    for (let i = 0; i < 3; i++) {
      const cy = y + 22 + i * 32;
      const slot = info[i];
      if (i === v.idx) { ctx.fillStyle = '#f0c020'; ctx.fillRect(x + 4, cy - 2, w - 8, 28); }
      window.PR_UI.drawText(ctx, 'SLOT ' + (i + 1) + (i === last ? ' *' : ''), x + 8, cy, '#202020');
      if (slot.empty) {
        window.PR_UI.drawText(ctx, '-- EMPTY --', x + 60, cy, '#806040');
      } else {
        const m = slot.map ? slot.map.toUpperCase().slice(0, 10) : '?';
        window.PR_UI.drawText(ctx, 'PARTY ' + slot.partyCount + '  $' + (slot.money|0), x + 60, cy, '#202020');
        window.PR_UI.drawText(ctx, m, x + 60, cy + 10, '#385890');
        window.PR_UI.drawText(ctx, 'DEX ' + slot.dexCaught, x + 130, cy + 10, '#385890');
        if (slot.firstSpecies) window.PR_MONS.drawCreature(ctx, slot.firstSpecies, x + w - 28, cy - 4, 22, false);
      }
    }
    window.PR_UI.drawText(ctx, 'A: CONFIRM', x + 8, y + h - 12, '#806040');
  }

  function applySaveData(data) {
    Object.assign(state.player, data.player);
    if (state.player.balls === undefined) state.player.balls = 5;
    if (window.PR_ITEMS) window.PR_ITEMS.ensureBag(state);
    state.party = data.party || [];
    state.flags = data.flags || { starterChosen:false };
    state.defeatedTrainers = new Set(data.defeatedTrainers || []);
    if (data.settings) state.settings = Object.assign({}, SETTINGS_DEFAULTS, data.settings);
    ensureSettings();
    applySettings();
    state.dex = { seen: new Set(data.dexSeen || []), caught: new Set(data.dexCaught || []) };
    ensureDex();
    state.player.foundItems = new Set(data.foundItems || []);
    state.box = data.box || [];
    state.quests = data.quests || {};
    if (window.PR_QUESTS) window.PR_QUESTS.ensure(state);
    state.activeSlot = (data._slot|0) || 0;
    state.world = new window.PR_WORLD.World(state);
  }

  // ---------- Pokedex ----------
  function ensureDex() {
    if (!state.dex) state.dex = { seen: new Set(), caught: new Set() };
    if (!(state.dex.seen instanceof Set))   state.dex.seen   = new Set(state.dex.seen   || []);
    if (!(state.dex.caught instanceof Set)) state.dex.caught = new Set(state.dex.caught || []);
  }
  function dexMarkSeen(speciesId) { ensureDex(); state.dex.seen.add(speciesId); }
  function dexMarkCaught(speciesId) { ensureDex(); state.dex.seen.add(speciesId); state.dex.caught.add(speciesId); }
  window.PR_DEX = { markSeen: dexMarkSeen, markCaught: dexMarkCaught };

  function openDex() {
    ensureDex();
    state.dexView = { idx: 0, scroll: 0 };
    state.mode = 'dex';
    window.PR_SFX && window.PR_SFX.play('confirm');
  }

  function dexEntries() {
    const C = window.PR_DATA.CREATURES;
    const ids = Object.keys(C).sort((a,b) => (C[a].dex|0) - (C[b].dex|0));
    return ids;
  }

  function updateDex() {
    const I = window.PR_INPUT;
    const v = state.dexView;
    const ids = dexEntries();
    const max = ids.length;
    if (I.consumePressed('ArrowDown')) { v.idx = (v.idx + 1) % max; window.PR_SFX && window.PR_SFX.play('select'); }
    if (I.consumePressed('ArrowUp'))   { v.idx = (v.idx + max - 1) % max; window.PR_SFX && window.PR_SFX.play('select'); }
    if (I.consumePressed('ArrowRight')) { v.idx = Math.min(max - 1, v.idx + 6); }
    if (I.consumePressed('ArrowLeft'))  { v.idx = Math.max(0, v.idx - 6); }
    if (I.consumePressed('x')) { state.dexView = null; state.mode = 'menu'; return; }
    // Keep selection visible.
    const visibleRows = 8;
    if (v.idx < v.scroll) v.scroll = v.idx;
    if (v.idx >= v.scroll + visibleRows) v.scroll = v.idx - visibleRows + 1;
  }

  function drawDex() {
    ensureDex();
    const ids = dexEntries();
    const x = 6, y = 6, w = VIEW_W - 12, h = VIEW_H - 12;
    window.PR_UI.box(ctx, x, y, w, h, '#fff', '#202020');
    const seenN = state.dex.seen.size, caughtN = state.dex.caught.size;
    window.PR_UI.drawText(ctx, 'POKEDEX', x + 6, y + 4, '#202020');
    window.PR_UI.drawText(ctx, 'SEEN ' + seenN + ' CAUGHT ' + caughtN, x + 60, y + 4, '#385890');
    window.PR_UI.drawText(ctx, 'B:BACK', x + w - 38, y + 4, '#806040');

    // Left: scrollable list (8 rows).
    const listX = x + 4, listY = y + 14, rowH = 12;
    const rows = 8;
    const v = state.dexView;
    for (let r = 0; r < rows; r++) {
      const i = v.scroll + r;
      if (i >= ids.length) break;
      const id = ids[i];
      const sp = window.PR_DATA.CREATURES[id];
      const cy = listY + r * rowH;
      if (i === v.idx) { ctx.fillStyle = '#f0c020'; ctx.fillRect(listX, cy - 1, 100, 11); }
      const num = String(sp.dex).padStart(3, '0');
      const seen = state.dex.seen.has(id);
      const caught = state.dex.caught.has(id);
      const mark = caught ? '*' : seen ? '.' : ' ';
      const name = seen ? sp.name : '???';
      window.PR_UI.drawText(ctx, mark + num + ' ' + name, listX + 2, cy, '#202020');
    }

    // Right: detail of selected.
    const selId = ids[v.idx];
    const sp = window.PR_DATA.CREATURES[selId];
    const seen = state.dex.seen.has(selId);
    const dx = x + 110, dy = y + 14, dw = w - 116, dh = h - 18;
    window.PR_UI.box(ctx, dx, dy, dw, dh, '#a8c0e8', '#202020');
    if (seen) {
      window.PR_MONS.drawCreature(ctx, selId, dx + 4, dy + 4, 32, false);
      window.PR_UI.drawText(ctx, sp.name, dx + 40, dy + 4, '#202020');
      window.PR_UI.drawText(ctx, sp.types.join('/'), dx + 40, dy + 14, '#385890');
      window.PR_UI.drawText(ctx, 'HP ' + sp.baseStats.hp, dx + 4, dy + 40, '#202020');
      window.PR_UI.drawText(ctx, 'AT ' + sp.baseStats.atk, dx + 40, dy + 40, '#202020');
      window.PR_UI.drawText(ctx, 'DF ' + sp.baseStats.def, dx + 76, dy + 40, '#202020');
      window.PR_UI.drawText(ctx, 'SP ' + sp.baseStats.spe, dx + 4, dy + 50, '#202020');
      window.PR_UI.drawText(ctx, 'SA ' + sp.baseStats.spa, dx + 40, dy + 50, '#202020');
      window.PR_UI.drawText(ctx, 'SD ' + sp.baseStats.spd, dx + 76, dy + 50, '#202020');
      if (sp.evolves) window.PR_UI.drawText(ctx, '> LV ' + sp.evolves.level, dx + 4, dy + 62, '#a02828');
    } else {
      window.PR_UI.drawText(ctx, '???', dx + 4, dy + 4, '#202020');
      window.PR_UI.drawText(ctx, 'Not yet seen.', dx + 4, dy + 16, '#806040');
    }
  }

  // ---------- World map + warp ----------
  // Linear chain of towns with their connecting routes. Spawn coords
  // are tiles already known walkable from each town's south-side door.
  const TOWNS = [
    { id:'rodport',    name:'RODPORT',    spawn:{x:4,  y:5,  dir:'down'} },
    { id:'brindale',   name:'BRINDALE',   spawn:{x:7,  y:6,  dir:'down'} },
    { id:'woodfall',   name:'WOODFALL',   spawn:{x:7,  y:6,  dir:'down'} },
    { id:'crestrock',  name:'CRESTROCK',  spawn:{x:7,  y:6,  dir:'down'} },
    { id:'frostmere',  name:'FROSTMERE',  spawn:{x:7,  y:6,  dir:'down'} },
    { id:'harborside', name:'HARBORSIDE', spawn:{x:7,  y:6,  dir:'down'} },
    { id:'summitvale', name:'SUMMITVALE', spawn:{x:7,  y:6,  dir:'down'} },
    { id:'mountain',   name:'HIGHSPIRE',  spawn:{x:7,  y:2,  dir:'down'} },
    { id:'beach',      name:'BEACH',      spawn:{x:7,  y:2,  dir:'down'} },
    { id:'desert',     name:'DESERT',     spawn:{x:7,  y:2,  dir:'down'} }
  ];
  const ROUTES_BETWEEN = [
    'ROUTE 1','ROUTE 2','PEBBLEWOOD','GLIMCAVERN','FROSTPEAK','SEAROUTE',
    '(branch from CRESTROCK)','(branch from HARBORSIDE)','(branch from SUMMITVALE)'
  ];

  function openWorldMap() {
    let idx = TOWNS.findIndex(t => t.id === state.player.map);
    if (idx < 0) idx = 0;
    state.map = { idx };
    state.mode = 'map';
    window.PR_SFX && window.PR_SFX.play('confirm');
  }

  function updateWorldMap() {
    const I = window.PR_INPUT;
    const m = state.map;
    if (I.consumePressed('ArrowDown')) {
      m.idx = (m.idx + 1) % TOWNS.length;
      window.PR_SFX && window.PR_SFX.play('select');
    }
    if (I.consumePressed('ArrowUp')) {
      m.idx = (m.idx + TOWNS.length - 1) % TOWNS.length;
      window.PR_SFX && window.PR_SFX.play('select');
    }
    if (I.consumePressed('x')) {
      state.map = null;
      state.mode = 'menu';
      return;
    }
    if (I.consumePressed('z') || I.consumePressed('Enter')) {
      const target = TOWNS[m.idx];
      if (target.id === state.player.map) {
        // Already there - just close.
        state.map = null;
        state.mode = 'overworld';
        return;
      }
      warpTo(target);
    }
  }

  function warpTo(town) {
    // Free heal + warp.
    for (const mon of state.party) {
      mon.hp = mon.stats.hp;
      mon.status = null;
      for (const mv of mon.moves) mv.pp = mv.ppMax;
    }
    state.player.map = town.id;
    state.player.x   = town.spawn.x;
    state.player.y   = town.spawn.y;
    state.player.dir = town.spawn.dir;
    state.world = new window.PR_WORLD.World(state);
    state.map = null;
    state.menu = null;
    state.mode = 'overworld';
    state.world.justEntered = true;
    window.PR_SFX && window.PR_SFX.play('heal');
    if (state.onMapChange) state.onMapChange();
    window.PR_SAVE.save(state);
  }

  function drawWorldMap() {
    const x = 6, y = 6, w = VIEW_W - 12, h = VIEW_H - 12;
    window.PR_UI.box(ctx, x, y, w, h, '#1a0204', '#f0c020');
    window.PR_UI.drawText(ctx, 'WORLD MAP', x + 8, y + 4, '#f0c020');
    window.PR_UI.drawText(ctx, 'A:WARP  B:BACK', x + w - 86, y + 4, '#806040');

    // Two-column compact layout: town pills with route labels between.
    const colX = x + 12;
    const startY = y + 16;
    const rowH = 18; // 12 for pill + 6 for route gap
    for (let i = 0; i < TOWNS.length; i++) {
      const t = TOWNS[i];
      const cy = startY + i * rowH;
      const isHere = (t.id === state.player.map);
      const isSel  = (i === state.map.idx);
      // Pill.
      const pillW = w - 24, pillH = 12;
      ctx.fillStyle = isSel ? '#f0c020' : '#3a0a08';
      ctx.fillRect(colX, cy, pillW, pillH);
      ctx.fillStyle = isSel ? '#1a0204' : '#5a1810';
      ctx.fillRect(colX, cy + pillH - 2, pillW, 2);
      const textColor = isSel ? '#1a0204' : '#ffd060';
      window.PR_UI.drawText(ctx, t.name, colX + 8, cy + 3, textColor);
      if (isHere) window.PR_UI.drawText(ctx, '*', colX + pillW - 10, cy + 3, isSel ? '#a01818' : '#e83838');
      // Route label between this town and the next.
      if (i < ROUTES_BETWEEN.length) {
        const rcy = cy + pillH + 1;
        window.PR_UI.drawText(ctx, '| ' + ROUTES_BETWEEN[i], colX + 8, rcy, '#806040');
      }
    }
  }

  function drawPartyView() {
    const x = 6, y = 6, w = VIEW_W - 12, h = VIEW_H - 12;
    window.PR_UI.box(ctx, x, y, w, h, '#a8c0e8', '#202020');
    window.PR_UI.drawText(ctx, 'PARTY', x + 8, y + 6, '#202020');
    if (!state.party.length) {
      window.PR_UI.drawText(ctx, 'No partners yet.', x + 8, y + 30, '#202020');
    }
    for (let i = 0; i < state.party.length; i++) {
      const mon = state.party[i];
      const cy = y + 22 + i * 20;
      window.PR_MONS.drawCreature(ctx, mon.species, x + 6, cy - 2, 18, false);
      window.PR_UI.drawText(ctx, mon.nickname, x + 28, cy, '#202020');
      window.PR_UI.drawText(ctx, 'L' + mon.level, x + 110, cy, '#202020');
      window.PR_UI.drawHpBar(ctx, x + 130, cy + 2, 60, mon.hp, mon.stats.hp);
      window.PR_UI.drawText(ctx, mon.hp + '/' + mon.stats.hp, x + w - 60, cy + 8, '#202020');
    }
    window.PR_UI.drawText(ctx, 'B: BACK', x + 8, y + h - 12, '#202020');
    if (window.PR_INPUT.consumePressed('x') || window.PR_INPUT.consumePressed('Enter')) {
      state.menu.viewing = null;
    }
  }

  // ---------- Battle end ----------
  function endBattle(outcome, battle) {
    if (outcome === 'lost') {
      // Faint to last visited center: respawn at start of current town with full heal.
      for (const m of state.party) { m.hp = m.stats.hp; m.status = null; for (const mv of m.moves) mv.pp = mv.ppMax; }
      state.player.map = 'rodport';
      state.player.x = 4; state.player.y = 5; state.player.dir = 'down';
    }
    if (battle.opts && battle.opts.npcKey) state.defeatedTrainers.add(battle.opts.npcKey);
    if (outcome === 'won' && battle.opts && battle.opts.badge) {
      if (!Array.isArray(state.player.badges)) state.player.badges = [];
      if (!state.player.badges.includes(battle.opts.badge)) {
        state.player.badges.push(battle.opts.badge);
        showFlash('GOT THE ' + battle.opts.badge + ' BADGE!');
      }
    }
    state.battle = null;
    state.mode = 'overworld';
    state.world.justEntered = false;
    window.PR_SAVE.save(state);
    if (window.PR_MUSIC) {
      const m = state.world.currentMap();
      if (m && ROUTE_MAPS.has(m.id)) window.PR_MUSIC.play('route');
      else window.PR_MUSIC.play('town');
    }
  }
})();
