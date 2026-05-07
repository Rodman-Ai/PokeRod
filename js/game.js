// Main game state machine and loop.
'use strict';

(function(){
  const VIEW_W = 240, VIEW_H = 160;
  const VERSION = 'v0.23.1';
  const BUILD = '2026.05.07-82';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // Game state container.
  const state = {
    mode: 'title',        // title | intro | overworld | battle | dialog | menu | profile | starter
    player: {
      name: 'YOU',
      map: 'rodport',
      x: 8, y: 9, dir: 'down',
      money: 500, balls: 5, steps: 0,
      stats: { battlesWon:0, catches:0 },
      equipment: { trinket:null }
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
    'route1_hollow','pebblewood_cavern','frostpeak_ice_cave',
    'searoute_tide_cavern','desert_ruins',
    'frostpeak','searoute','desert','beach','mountain'
  ]);

  const KONAMI_SEQUENCE = [
    'ArrowUp','ArrowUp','ArrowDown','ArrowDown',
    'ArrowLeft','ArrowRight','ArrowLeft','ArrowRight',
    'x','z'
  ];
  const KONAMI_KEYS = Array.from(new Set(KONAMI_SEQUENCE));
  let konamiIndex = 0;

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
      versionEl.textContent = VERSION + ' #' + BUILD.split('-').pop();
      versionEl.style.pointerEvents = 'none';
      versionEl.style.cursor = 'default';
      versionEl.setAttribute('aria-hidden', 'true');
    }
    ensureSettings();
    applySettings();
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
    state.player = { name:'YOU', map:'rodport', x:8, y:9, dir:'down', money:500, balls:5, steps:0,
                     bag: { rodball:5, potion:3, antidote:1, oranberry:1 },
                     equipment: { trinket: null },
                     stats: { battlesWon:0, catches:0 } };
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
        ctx.save();
        ctx.scale(2, 2);
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(0, VIEW_H - 22, VIEW_W, 22);
        const msg = String(frameErr && frameErr.message || frameErr);
        if (window.PR_UI && window.PR_UI.drawText) {
          window.PR_UI.drawText(ctx, ('ERR: ' + msg).slice(0, 38), 4, VIEW_H - 18, '#f08080');
          window.PR_UI.drawText(ctx, 'SEE CONSOLE FOR DETAILS', 4, VIEW_H - 8, '#ffd060');
        }
        ctx.restore();
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
    // Global: Select toggles audio mute, except in the Pokedex
    // where it cycles the all/seen/got filter (handled in updateDex).
    if (state.mode !== 'dex' && window.PR_INPUT.consumePressed('Shift')) {
      const A = window.PR_AUDIO;
      if (A) {
        A.unlock();
        A.setMuted(!A.isMuted());
        showFlash(A.isMuted() ? 'MUTED' : 'AUDIO ON');
      }
    }
    if (updateKonamiCode()) return;
    if (state.konamiArmed && state.mode === 'battle' && state.battle && state.battle.forceWin) {
      const hadBadge = state.battle.opts && state.battle.opts.badge;
      state.konamiArmed = false;
      if (state.battle.forceWin() && !hadBadge) showFlash('KONAMI WIN!');
      return;
    }
    if (state.mode === 'title') updateTitle();
    else if (state.mode === 'intro') updateIntro(dt);
    else if (state.mode === 'overworld') state.world.update(dt);
    else if (state.mode === 'battle') state.battle.update(dt);
    else if (state.mode === 'dialog') updateDialog();
    else if (state.mode === 'menu') updateMenu();
    else if (state.mode === 'profile') updateProfile();
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

  function updateKonamiCode() {
    const I = window.PR_INPUT;
    if (!I || !I.pressed) return false;
    let key = null;
    for (const candidate of KONAMI_KEYS) {
      if (I.pressed(candidate)) { key = candidate; break; }
    }
    if (!key) return false;
    if (key === KONAMI_SEQUENCE[konamiIndex]) {
      konamiIndex++;
      if (konamiIndex >= KONAMI_SEQUENCE.length) {
        konamiIndex = 0;
        return activateKonamiCode();
      }
      return false;
    }
    konamiIndex = key === KONAMI_SEQUENCE[0] ? 1 : 0;
    return false;
  }

  function activateKonamiCode() {
    if (state.mode === 'battle' && state.battle && state.battle.forceWin) {
      const hadBadge = state.battle.opts && state.battle.opts.badge;
      if (state.battle.forceWin() && !hadBadge) {
        showFlash('KONAMI WIN!');
      }
      return true;
    }
    if (state.mode === 'overworld') {
      state.player.money = (state.player.money || 0) + 10000;
      window.PR_SFX && window.PR_SFX.play('confirm');
      showFlash('GOT $10000!');
      window.PR_SAVE.save && window.PR_SAVE.save(state);
      return true;
    }
    state.konamiArmed = true;
    showFlash('KONAMI READY');
    return true;
  }

  function updateTitle() {
    const I = window.PR_INPUT;
    if (I.consumePressed('Enter') || I.consumePressed('z') || I.consumePressed('x')) {
      window.PR_AUDIO && window.PR_AUDIO.unlock();
      if (window.PR_SAVE.exists()) continueGame();
      else startNewGame();
    }
  }

  // The canvas is 480x320 native, but most UI / battle / intro art was
  // authored for 240x160 logical coordinates. We render UI scaled 2x and
  // let the world renderer draw natively at 480x320 (TS=32).
  function withScale2(fn) {
    ctx.save();
    ctx.scale(2, 2);
    try { fn(); }
    finally { ctx.restore(); }
  }
  function render() {
    if (state.mode === 'title') { withScale2(drawFlash); return; }
    if (state.mode === 'intro') { withScale2(() => { drawIntro(); drawFlash(); }); return; }
    if (state.mode === 'battle') { withScale2(() => { state.battle.render(ctx); drawFlash(); }); return; }
    state.world.render(ctx);
    withScale2(() => {
      if (state.mode === 'dialog') drawDialog();
      else if (state.mode === 'menu') drawMenu();
      else if (state.mode === 'profile') drawProfile();
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
    });
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
    // Pre-wrap each input line and chunk overflow into pages of 3
    // visible lines, so long text never silently truncates.
    const PAGE_LINES = 3, WRAP_W = 30;
    const pages = [];
    for (const line of lines) {
      const wrapped = window.PR_UI.wrap(String(line == null ? '' : line), WRAP_W);
      if (wrapped.length === 0) { pages.push(['']); continue; }
      for (let i = 0; i < wrapped.length; i += PAGE_LINES) {
        pages.push(wrapped.slice(i, i + PAGE_LINES));
      }
    }
    state.dialog = { lines: pages, index:0, onDone: onDone || null, source: source || null };
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
    const page = d.lines[d.index] || [''];
    window.PR_UI.drawDialog(ctx, page, VIEW_W, VIEW_H, true);
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
    window.PR_UI.drawText(ctx, 'B: SKIP', 6, VIEW_H - 8, '#606060');
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
    const encounters = encounterPoolForMap(m);
    if (!encounters || !encounters.length) return;
    const total = encounters.reduce((a,e) => a + e.weight, 0);
    let r = Math.random() * total;
    let pick = encounters[0];
    for (const e of encounters) { r -= e.weight; if (r <= 0) { pick = e; break; } }
    const lvl = pick.minL + Math.floor(Math.random() * (pick.maxL - pick.minL + 1));
    startBattleAgainstWild(pick.species, lvl);
  }

  function encounterPoolForMap(map) {
    if (!map) return [];
    if (Array.isArray(map.encounterZones)) {
      const px = state.player.x | 0, py = state.player.y | 0;
      for (const zone of map.encounterZones) {
        const zx = zone.x | 0, zy = zone.y | 0;
        const zw = Math.max(1, zone.w | 0), zh = Math.max(1, zone.h | 0);
        if (px >= zx && px < zx + zw && py >= zy && py < zy + zh &&
            zone.encounters && zone.encounters.length) {
          return zone.encounters;
        }
      }
    }
    return map.encounters || [];
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

  function addBadgeIfMissing(badge) {
    if (!badge) return false;
    if (!Array.isArray(state.player.badges)) state.player.badges = [];
    if (state.player.badges.includes(badge)) return false;
    state.player.badges.push(badge);
    return true;
  }

  function repairDefeatedGymBadges() {
    if (!state.defeatedTrainers || !window.PR_MAPS || !window.PR_MAPS.MAPS) return false;
    let changed = false;
    const maps = window.PR_MAPS.MAPS;
    for (const mapId of Object.keys(maps)) {
      const m = maps[mapId];
      for (const n of (m.npcs || [])) {
        if (!n.gym || !n.badge) continue;
        const key = mapId + ':' + n.x + ',' + n.y;
        if (state.defeatedTrainers.has(key)) {
          changed = addBadgeIfMissing(n.badge) || changed;
        }
      }
    }
    return changed;
  }

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
        if (npc.gym && addBadgeIfMissing(npc.badge)) {
          window.PR_SAVE.save && window.PR_SAVE.save(state);
        }
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
      const name = window.PR_DATA.CREATURES[sp].name;
      openDialog(
        ['You chose ' + name + '!','Take good care of it.'],
        () => window.PR_SAVE.save(state)
      );
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
    window.PR_UI.drawText(ctx, 'A: PICK   B: CANCEL', 16, 140, '#202020');
  }

  // ---------- Pause menu ----------
  const MENU_ICONS = {
    MAP:'map', DEX:'dex', BAG:'bag', PARTY:'party', BOX:'bag',
    PROFILE:'profile', QUEST:'map', PVP:'party', SETTINGS:'gear', SAVE:'save', EXIT:'x'
  };

  function openPauseMenu() {
    state.menu = { idx: 0, options: ['MAP','DEX','BAG','PARTY','PROFILE','BOX','QUEST','PVP','SETTINGS','SAVE','EXIT'] };
    state.mode = 'menu';
  }
  function updateMenu() {
    const I = window.PR_INPUT;
    const m = state.menu;
    if (m.viewing === 'party') { updatePartyView(); return; }
    const rows = Math.ceil(m.options.length / 2);
    const moveGrid = (dx, dy) => {
      let col = m.idx >= rows ? 1 : 0;
      let row = m.idx - col * rows;
      if (dy) row = (row + dy + rows) % rows;
      if (dx) col = (col + dx + 2) % 2;
      let next = col * rows + row;
      while (next >= m.options.length) {
        row = (row + rows - 1) % rows;
        next = col * rows + row;
      }
      m.idx = next;
      window.PR_SFX && window.PR_SFX.play('select');
    };
    if (I.consumePressed('ArrowDown')) moveGrid(0, 1);
    if (I.consumePressed('ArrowUp'))   moveGrid(0, -1);
    if (I.consumePressed('ArrowRight')) moveGrid(1, 0);
    if (I.consumePressed('ArrowLeft'))  moveGrid(-1, 0);
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
        m.partyView = { idx:0, page:0 };
      } else if (opt === 'PROFILE') {
        openProfile();
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
    ctx.fillStyle = 'rgba(8,12,20,0.42)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const w = 154, h = 144;
    const x = VIEW_W - w - 6, y = 8;
    window.PR_UI.panel(ctx, x, y, w, h, {
      fill:'#f8f0d8', border:'#202020', shadow:'#c89048', highlight:'#fff8e8'
    });
    window.PR_UI.header(ctx, 'START', x + 4, y + 4, w - 8, {
      fill:'#1a0204', line:'#f0c020', text:'#f0c020'
    });
    const badges = (state.player.badges || []).length;
    window.PR_UI.chip(ctx, x + 6, y + 20, '$' + state.player.money, {
      fill:'#e8f0ff', border:'#385890'
    });
    window.PR_UI.chip(ctx, x + 68, y + 20, 'BDG ' + badges, {
      fill:'#fff0c8', border:'#a86020'
    });
    const rows = Math.ceil(m.options.length / 2);
    const cellW = 68, cellH = 16;
    for (let i = 0; i < m.options.length; i++) {
      const col = i >= rows ? 1 : 0;
      const row = i - col * rows;
      const cx = x + 6 + col * (cellW + 6);
      const cy = y + 36 + row * cellH;
      const active = i === m.idx;
      window.PR_UI.selectBar(ctx, cx, cy - 2, cellW, 13, active);
      window.PR_UI.icon(ctx, MENU_ICONS[m.options[i]], cx + 4, cy, active ? '#1a0204' : '#385890');
      window.PR_UI.drawText(ctx, m.options[i], cx + 16, cy + 2, active ? '#1a0204' : '#202020');
    }
    // Currently equipped trinket (if any), shown beneath the menu list.
    const eq = state.player.equipment;
    const trinket = eq && eq.trinket;
    const tDef = trinket && window.PR_ITEMS && window.PR_ITEMS.byId(trinket);
    const gearText = 'GEAR ' + (tDef ? tDef.name.slice(0, 9).toUpperCase() : 'NONE');
    window.PR_UI.drawText(ctx, gearText, x + 8, y + h - 11, '#806040');
    if (m.flashTimer > 0) {
      m.flashTimer -= 1/60;
      window.PR_UI.panel(ctx, 40, 70, 160, 20, { fill:'#fff', border:'#202020' });
      window.PR_UI.drawText(ctx, m.flash, 50, 76, '#202020');
    }
  }

  function ensurePlayerStats() {
    if (!state.player.stats) state.player.stats = {};
    if (state.player.stats.battlesWon === undefined) state.player.stats.battlesWon = 0;
    if (state.player.stats.catches === undefined) state.player.stats.catches = 0;
    if (!state.player.equipment) state.player.equipment = { trinket:null };
    if (state.player.equipment.trinket === undefined) state.player.equipment.trinket = null;
  }

  function openProfile() {
    ensurePlayerStats();
    state.profileView = { page:0 };
    state.menu = null;
    state.mode = 'profile';
    window.PR_SFX && window.PR_SFX.play('confirm');
  }

  function updateProfile() {
    const I = window.PR_INPUT;
    const v = state.profileView || (state.profileView = { page:0 });
    if (I.consumePressed('ArrowLeft') || I.consumePressed('ArrowRight') || I.consumePressed('z')) {
      v.page = (v.page + 1) % 2;
      window.PR_SFX && window.PR_SFX.play('select');
    }
    if (I.consumePressed('x') || I.consumePressed('Enter')) {
      state.profileView = null;
      openPauseMenu();
    }
  }

  function drawProfile() {
    ensurePlayerStats();
    ensureDex();
    const x = 6, y = 6, w = VIEW_W - 12, h = VIEW_H - 12;
    const v = state.profileView || { page:0 };
    window.PR_UI.panel(ctx, x, y, w, h, { fill:'#f8f0d8', border:'#202020', shadow:'#c89048' });
    window.PR_UI.header(ctx, v.page === 0 ? 'TRAINER PROFILE' : 'TRAINER GEAR', x + 4, y + 4, w - 8,
      { fill:'#1a0204', line:'#f0c020', text:'#f0c020' });
    window.PR_UI.drawText(ctx, 'B:BACK  A:NEXT', x + w - 88, y + 4, '#806040');
    const badges = (state.player.badges || []).length;
    const map = state.world && state.world.currentMap ? state.world.currentMap() : null;
    if (v.page === 0) {
      window.PR_UI.chip(ctx, x + 8, y + 20, state.player.name || 'YOU', { fill:'#e8f0ff', border:'#385890' });
      window.PR_UI.chip(ctx, x + 66, y + 20, '$' + (state.player.money || 0), { fill:'#fff0c8', border:'#a86020' });
      window.PR_UI.chip(ctx, x + 130, y + 20, 'BDG ' + badges, { fill:'#e8ffe8', border:'#208830' });
      const rows = [
        ['AREA', map ? map.name.toUpperCase().slice(0, 20) : (state.player.map || '?').toUpperCase()],
        ['PARTY', String((state.party || []).length) + '/6'],
        ['DEX', (state.dex.seen.size || 0) + ' SEEN  ' + (state.dex.caught.size || 0) + ' CAUGHT'],
        ['STEPS', String(state.player.steps || 0)],
        ['WINS', String(state.player.stats.battlesWon || 0)],
        ['CATCHES', String(state.player.stats.catches || 0)]
      ];
      for (let i = 0; i < rows.length; i++) {
        const cy = y + 42 + i * 14;
        window.PR_UI.selectBar(ctx, x + 8, cy - 2, w - 16, 12, false);
        window.PR_UI.drawText(ctx, rows[i][0], x + 12, cy, '#385890');
        window.PR_UI.drawText(ctx, rows[i][1], x + 76, cy, '#202020');
      }
    } else {
      const eq = state.player.equipment || {};
      const trinket = eq.trinket && window.PR_ITEMS && window.PR_ITEMS.byId(eq.trinket);
      const gearRows = [
        ['TRINKET', trinket ? trinket.name : 'NONE'],
        ['EFFECT', trinket && trinket.xpMult ? ('XP x' + trinket.xpMult.toFixed(2)) : 'NO WORN BONUS'],
        ['ROD BALL', String((state.player.bag && state.player.bag.rodball) || 0)],
        ['GREAT', String((state.player.bag && state.player.bag.greatball) || 0)],
        ['QUICK', String((state.player.bag && state.player.bag.quickball) || 0)],
        ['CAVERN', String((state.player.bag && state.player.bag.cavernball) || 0)],
        ['ULTRA', String((state.player.bag && state.player.bag.ultraball) || 0)]
      ];
      for (let i = 0; i < gearRows.length; i++) {
        const cy = y + 24 + i * 15;
        if (i === 0) window.PR_UI.selectBar(ctx, x + 8, cy - 2, w - 16, 12, true);
        else window.PR_UI.selectBar(ctx, x + 8, cy - 2, w - 16, 12, false);
        window.PR_UI.drawText(ctx, gearRows[i][0], x + 12, cy, '#385890');
        window.PR_UI.drawText(ctx, String(gearRows[i][1]).slice(0, 20), x + 78, cy, '#202020');
      }
      window.PR_UI.drawText(ctx, 'Equip trainer gear from BAG.', x + 12, y + h - 14, '#806040');
    }
  }
  // ---------- Settings ----------
  const SETTINGS_DEFAULTS = {
    graphics: 'gba_firered',
    sfxVol: 'med',     // off | low | med | high
    musicVol: 'med',
    textSpeed: 'normal', // slow | normal | fast
    reducedMotion: false,
    colorblind: false
  };
  const VOL_STEPS = ['off','low','med','high'];
  const VOL_VALUES = { off:0, low:0.25, med:0.55, high:1.0 };
  const TEXT_SPEED_STEPS = ['slow','normal','fast'];
  const GRAPHICS_STEPS = ['gb_red','gbc_yellow','gba_firered','ds_diamond'];
  const GRAPHICS_LABELS = {
    gb_red: 'GB RED',
    gbc_yellow: 'GBC YELLOW',
    gba_firered: 'GBA FIRERED',
    ds_diamond: 'DS DIAMOND'
  };

  function ensureSettings() {
    if (!state.settings) state.settings = Object.assign({}, SETTINGS_DEFAULTS);
    for (const k of Object.keys(SETTINGS_DEFAULTS)) {
      if (state.settings[k] === undefined) state.settings[k] = SETTINGS_DEFAULTS[k];
    }
    if (GRAPHICS_STEPS.indexOf(state.settings.graphics) === -1) state.settings.graphics = SETTINGS_DEFAULTS.graphics;
    if (VOL_STEPS.indexOf(state.settings.sfxVol) === -1) state.settings.sfxVol = SETTINGS_DEFAULTS.sfxVol;
    if (VOL_STEPS.indexOf(state.settings.musicVol) === -1) state.settings.musicVol = SETTINGS_DEFAULTS.musicVol;
    if (TEXT_SPEED_STEPS.indexOf(state.settings.textSpeed) === -1) state.settings.textSpeed = SETTINGS_DEFAULTS.textSpeed;
  }

  function applySettings() {
    ensureSettings();
    const A = window.PR_AUDIO && window.PR_AUDIO._internal;
    if (A) {
      if (A.sfxGain)   A.sfxGain.gain.value   = VOL_VALUES[state.settings.sfxVol];
      if (A.musicGain) A.musicGain.gain.value = VOL_VALUES[state.settings.musicVol] * 0.6;
    }
    if (window.PR_ATLAS && window.PR_ATLAS.setPreset) {
      window.PR_ATLAS.setPreset(state.settings.graphics || SETTINGS_DEFAULTS.graphics);
    }
    if (document.body) {
      document.body.dataset.graphics = state.settings.graphics || SETTINGS_DEFAULTS.graphics;
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
    { key:'graphics',      label:'GRAPHICS',    type:'enum', steps:GRAPHICS_STEPS, labels:GRAPHICS_LABELS },
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
        let i = row.steps.indexOf(state.settings[row.key]);
        if (i < 0) i = 0;
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
    window.PR_UI.panel(ctx, x, y, w, h, { fill:'#f8f0d8', border:'#202020', shadow:'#c89048' });
    window.PR_UI.header(ctx, 'SETTINGS', x + 4, y + 4, w - 8, { fill:'#1a0204', line:'#f0c020', text:'#f0c020' });
    window.PR_UI.drawText(ctx, 'B:BACK', x + w - 38, y + 4, '#806040');
    for (let i = 0; i < SETTINGS_ROWS.length; i++) {
      const row = SETTINGS_ROWS[i];
      const cy = y + 22 + i * 16;
      if (i === state.settingsView.idx) window.PR_UI.selectBar(ctx, x + 6, cy - 2, w - 12, 12, true);
      window.PR_UI.drawText(ctx, row.label, x + 12, cy, '#202020');
      let val;
      if (row.type === 'bool') val = state.settings[row.key] ? 'ON' : 'OFF';
      else val = (row.labels && row.labels[state.settings[row.key]]) || (state.settings[row.key] || '').toUpperCase();
      window.PR_UI.drawText(ctx, '< ' + val + ' >', x + w - 92, cy, '#385890');
    }
    window.PR_UI.drawText(ctx, 'A/RIGHT: NEXT  LEFT: PREV', x + 8, y + h - 12, '#806040');
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
    window.PR_UI.panel(ctx, x, y, w, h, { fill:'#f8f0d8', border:'#202020', shadow:'#c89048' });
    window.PR_UI.header(ctx, 'QUESTS', x + 4, y + 4, w - 8, { fill:'#1a0204', line:'#f0c020', text:'#f0c020' });
    window.PR_UI.drawText(ctx, 'B:BACK', x + w - 38, y + 4, '#806040');
    const list = window.PR_QUESTS ? window.PR_QUESTS.list(state) : [];
    if (!list.length) {
      window.PR_UI.drawText(ctx, 'No quests yet.', x + 8, y + 30, '#806040');
      return;
    }
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      const cy = y + 22 + i * 18;
      if (i === state.questsView.idx) window.PR_UI.selectBar(ctx, x + 4, cy - 2, w - 8, 18, true);
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
    window.PR_UI.panel(ctx, x, y, w, h, { fill:'#f8f0d8', border:'#202020', shadow:'#c89048' });
    window.PR_UI.header(ctx, 'PC STORAGE', x + 4, y + 4, w - 8, { fill:'#1a0204', line:'#f0c020', text:'#f0c020' });
    window.PR_UI.drawText(ctx, 'B:BACK  <>SIDE', x + w - 86, y + 4, '#806040');

    // Two columns: BOX | PARTY
    const colW = (w - 16) / 2;
    const drawList = (label, list, sx, isActive) => {
      window.PR_UI.drawText(ctx, label + ' (' + list.length + ')', sx + 4, y + 16, isActive ? '#e83838' : '#385890');
      const rows = 6;
      const start = isActive ? Math.max(0, Math.min(Math.max(0, list.length - rows), state.boxView.idx - 2)) : 0;
      for (let r = 0; r < Math.min(list.length, rows); r++) {
        const i = start + r;
        const mon = list[i];
        const cy = y + 28 + r * 16;
        if (isActive && i === state.boxView.idx) {
          window.PR_UI.selectBar(ctx, sx, cy - 2, colW, 14, true);
        }
        if (mon) {
          window.PR_MONS.drawCreature(ctx, mon.species, sx + 2, cy - 2, 14, false, mon);
          window.PR_UI.drawText(ctx, mon.nickname.slice(0, 10), sx + 18, cy, '#202020');
          window.PR_UI.drawText(ctx, 'L' + mon.level, sx + colW - 18, cy, '#202020');
        }
      }
      if (!list.length) window.PR_UI.drawText(ctx, '(empty)', sx + 4, y + 32, '#806040');
      else if (list.length > rows) window.PR_UI.drawText(ctx, (start + 1) + '-' + Math.min(start + rows, list.length), sx + colW - 28, y + 16, '#806040');
    };
    drawList('BOX',   state.box,   x + 6,           state.boxView.side === 'box');
    drawList('PARTY', state.party, x + 12 + colW,   state.boxView.side === 'party');
    window.PR_UI.drawText(ctx, 'A: MOVE', x + 8, y + h - 12, '#806040');
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
          // Hand back to battle to throw the *selected* ball.
          state.bagView = null;
          state.mode = 'battle';
          if (state.battle) state.battle.tryThrowBall(it.id);
          return;
        }
        // For heal/status/revive, ask for a target.
        state.bagTarget = { itemId: it.id, def, idx: 0, returnTo:'battle' };
        state.mode = 'bagtarget';
        return;
      }
      // Overworld: only target items make sense (not balls).
      if (def.battleOnly) { showFlash('Use in battle.'); return; }
      // Trainer equipment: equip directly into the slot, swap any
      // currently-equipped item back into the bag.
      if (def.kind === 'trainer_gear') {
        if (!state.player.equipment) state.player.equipment = { trinket: null };
        const slot = def.slot || 'trinket';
        const prev = state.player.equipment[slot];
        if (prev === it.id) { showFlash(def.name + ' already worn.'); return; }
        if (prev) window.PR_ITEMS.add(state, prev, 1);
        window.PR_ITEMS.take(state, it.id, 1);
        state.player.equipment[slot] = it.id;
        window.PR_SFX && window.PR_SFX.play('confirm');
        showFlash('Equipped ' + def.name + '!');
        return;
      }
      // Held-item gear (and berries): use bagtarget to choose a mon.
      state.bagTarget = { itemId: it.id, def, idx: 0, returnTo:'menu' };
      state.mode = 'bagtarget';
    }
  }

  function drawBag() {
    const x = 6, y = 6, w = VIEW_W - 12, h = VIEW_H - 12;
    window.PR_UI.panel(ctx, x, y, w, h, { fill:'#f8f0d8', border:'#202020', shadow:'#c89048' });
    window.PR_UI.header(ctx, 'BAG', x + 4, y + 4, w - 8, { fill:'#1a0204', line:'#f0c020', text:'#f0c020' });
    window.PR_UI.drawText(ctx, 'B:BACK', x + w - 38, y + 4, '#806040');
    const items = bagItems();
    if (!items.length) {
      window.PR_UI.drawText(ctx, 'Bag is empty.', x + 8, y + 30, '#806040');
      return;
    }
    const v = state.bagView;
    const listX = x + 5, listY = y + 18, listW = 104;
    const cardX = x + 114, cardY = y + 18, cardW = w - 119, cardH = h - 30;
    const rows = 8, rowH = 13;
    const start = Math.max(0, Math.min(items.length - rows, v.idx - 3));
    for (let r = 0; r < rows; r++) {
      const i = start + r;
      if (i >= items.length) break;
      const cy = listY + r * rowH;
      const it = items[i];
      if (i === v.idx) window.PR_UI.selectBar(ctx, listX, cy - 1, listW, 12, true);
      if (window.PR_ITEMS && window.PR_ITEMS.drawIcon) window.PR_ITEMS.drawIcon(ctx, it.id, listX + 2, cy, 10);
      window.PR_UI.drawText(ctx, it.def.name.slice(0, 9), listX + 17, cy + 2, '#202020');
      window.PR_UI.drawText(ctx, 'x' + it.count, listX + listW - 23, cy + 2, '#385890');
    }
    const sel = items[v.idx];
    if (sel) {
      let footer = 'A:USE';
      if (sel.def.kind === 'ball') footer = v.returnTo === 'battle' ? 'A:THROW' : 'BATTLE ONLY';
      else if (sel.def.kind === 'trainer_gear') footer = 'A:EQUIP';
      else if (sel.def.kind === 'held_gear' || sel.def.holdable) footer = 'A:HOLD';
      if (window.PR_ITEMS && window.PR_ITEMS.drawCard) {
        window.PR_ITEMS.drawCard(ctx, sel.id, cardX, cardY, cardW, cardH, {
          count:sel.count, lines:5, footer
        });
      } else {
        window.PR_UI.drawText(ctx, sel.def.desc.slice(0, 16), cardX + 6, cardY + 8, '#806040');
      }
    }
  }

  function updateBagTarget() {
    const I = window.PR_INPUT;
    const t = state.bagTarget;
    const party = state.party || [];
    if (!party.length) {
      if (I.consumePressed('x') || I.consumePressed('z') || I.consumePressed('Enter')) {
        state.bagTarget = null;
        state.mode = 'bag';
      }
      return;
    }
    if (t.idx >= party.length) t.idx = party.length - 1;
    if (I.consumePressed('ArrowDown')) { t.idx = (t.idx + 1) % party.length; window.PR_SFX && window.PR_SFX.play('select'); }
    if (I.consumePressed('ArrowUp'))   { t.idx = (t.idx + party.length - 1) % party.length; window.PR_SFX && window.PR_SFX.play('select'); }
    if (I.consumePressed('x')) {
      state.bagTarget = null;
      state.mode = 'bag';
      return;
    }
    if (I.consumePressed('z') || I.consumePressed('Enter')) {
      const target = party[t.idx];
      // Held-item gear: assign to mon.held, swap any prior held back into bag.
      if (t.def && t.def.kind === 'held_gear') {
        if (target.held === t.itemId) { showFlash(target.nickname + ' already holds it.'); return; }
        if (target.held) window.PR_ITEMS.add(state, target.held, 1);
        target.held = t.itemId;
        window.PR_ITEMS.take(state, t.itemId, 1);
        window.PR_SFX && window.PR_SFX.play('confirm');
        showFlash(target.nickname + ' holds ' + t.def.name + '.');
        state.bagTarget = null;
        state.mode = 'bag';
        return;
      }
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
    window.PR_UI.panel(ctx, x, y, w, h, { fill:'#d8ecff', border:'#202020', shadow:'#385890' });
    window.PR_UI.header(ctx, 'USE ITEM', x + 4, y + 4, w - 8, { fill:'#1a0204', line:'#f0c020', text:'#f0c020' });
    window.PR_UI.drawText(ctx, state.bagTarget.def.name + ' ON?', x + 8, y + 18, '#202020');
    window.PR_UI.drawText(ctx, 'B:BACK', x + w - 38, y + 4, '#806040');
    const t = state.bagTarget;
    const party = state.party || [];
    if (!party.length) {
      window.PR_UI.drawText(ctx, 'No party members.', x + 8, y + 38, '#806040');
      window.PR_UI.drawText(ctx, 'B:BACK', x + 8, y + h - 12, '#806040');
      return;
    }
    for (let i = 0; i < party.length; i++) {
      const mon = party[i];
      const cy = y + 34 + i * 18;
      if (i === t.idx) window.PR_UI.selectBar(ctx, x + 4, cy - 2, w - 8, 18, true);
      window.PR_MONS.drawCreature(ctx, mon.species, x + 6, cy - 2, 18, false, mon);
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
    window.PR_UI.panel(ctx, x, y, w, h, { fill:'#f8f0d8', border:'#202020', shadow:'#c89048' });
    const v = state.slotPicker;
    const title = v.action === 'save' ? 'SAVE TO WHICH SLOT?' : 'LOAD WHICH SLOT?';
    window.PR_UI.header(ctx, title.slice(0, 24), x + 4, y + 4, w - 8, { fill:'#1a0204', line:'#f0c020', text:'#f0c020' });
    window.PR_UI.drawText(ctx, 'B:BACK', x + w - 38, y + 4, '#806040');
    const info = window.PR_SAVE.slotInfo();
    const last = window.PR_SAVE.lastSlot();
    for (let i = 0; i < 3; i++) {
      const cy = y + 22 + i * 32;
      const slot = info[i];
      if (i === v.idx) window.PR_UI.selectBar(ctx, x + 4, cy - 2, w - 8, 28, true);
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
    if (!state.player.equipment) state.player.equipment = { trinket: null };
    if (state.player.equipment.trinket === undefined) state.player.equipment.trinket = null;
    ensurePlayerStats();
    if (window.PR_ITEMS) window.PR_ITEMS.ensureBag(state);
    state.party = data.party || [];
    // Default missing held slot on each party member (pre-feature saves).
    for (const m of state.party) if (m && m.held === undefined) m.held = null;
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
    if (repairDefeatedGymBadges()) {
      window.PR_SAVE.save && window.PR_SAVE.save(state, state.activeSlot);
    }
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
    state.dexView = { idx: 0, scroll: 0, filter: 'all' };
    state.mode = 'dex';
    window.PR_SFX && window.PR_SFX.play('confirm');
  }

  const DEX_FILTERS = ['all', 'seen', 'got'];
  const DEX_FILTER_LABELS = { all:'ALL', seen:'SEEN', got:'GOT' };

  function dexEntries(filter) {
    const C = window.PR_DATA.CREATURES;
    let ids = Object.keys(C).sort((a,b) => (C[a].dex|0) - (C[b].dex|0));
    if (filter === 'seen' && state.dex) ids = ids.filter(id => state.dex.seen.has(id));
    else if (filter === 'got' && state.dex) ids = ids.filter(id => state.dex.caught.has(id));
    return ids;
  }

  function updateDex() {
    const I = window.PR_INPUT;
    const v = state.dexView;
    if (!v.filter) v.filter = 'all';
    // SELECT cycles the filter. Try to keep the previously selected
    // species highlighted across the filter change; otherwise clamp.
    if (I.consumePressed('Shift')) {
      const prevIds = dexEntries(v.filter);
      const prevSelId = prevIds[v.idx] || null;
      const cur = DEX_FILTERS.indexOf(v.filter);
      v.filter = DEX_FILTERS[(cur + 1) % DEX_FILTERS.length];
      const nextIds = dexEntries(v.filter);
      const keep = prevSelId ? nextIds.indexOf(prevSelId) : -1;
      v.idx = keep >= 0 ? keep : 0;
      v.scroll = 0;
      window.PR_SFX && window.PR_SFX.play('confirm');
    }
    const ids = dexEntries(v.filter);
    const max = ids.length;
    if (max === 0) {
      if (I.consumePressed('x')) { state.dexView = null; state.mode = 'menu'; return; }
      v.idx = 0; v.scroll = 0;
      return;
    }
    if (v.idx >= max) v.idx = max - 1;
    if (I.consumePressed('ArrowDown')) { v.idx = (v.idx + 1) % max; window.PR_SFX && window.PR_SFX.play('select'); }
    if (I.consumePressed('ArrowUp'))   { v.idx = (v.idx + max - 1) % max; window.PR_SFX && window.PR_SFX.play('select'); }
    if (I.consumePressed('ArrowRight')) { v.idx = Math.min(max - 1, v.idx + 6); }
    if (I.consumePressed('ArrowLeft'))  { v.idx = Math.max(0, v.idx - 6); }
    if (I.consumePressed('x')) { state.dexView = null; state.mode = 'menu'; return; }
    // Keep selection visible.
    const visibleRows = 9;
    if (v.idx < v.scroll) v.scroll = v.idx;
    if (v.idx >= v.scroll + visibleRows) v.scroll = v.idx - visibleRows + 1;
  }

  function dexEvolutionChain(speciesId) {
    const C = window.PR_DATA.CREATURES;
    // Walk backward to find the chain root.
    let rootId = speciesId;
    for (let guard = 0; guard < 8; guard++) {
      let prev = null;
      for (const id of Object.keys(C)) {
        if (C[id].evolves && C[id].evolves.to === rootId) { prev = id; break; }
      }
      if (!prev) break;
      rootId = prev;
    }
    // Walk forward from the root.
    const chain = [];
    let cur = rootId;
    for (let guard = 0; guard < 8 && cur; guard++) {
      chain.push(cur);
      cur = C[cur].evolves ? C[cur].evolves.to : null;
    }
    return chain;
  }

  function dexTypeTextColor(hex) {
    if (!hex || hex.length < 7) return '#202020';
    const r = parseInt(hex.slice(1,3), 16) || 0;
    const g = parseInt(hex.slice(3,5), 16) || 0;
    const b = parseInt(hex.slice(5,7), 16) || 0;
    return (0.299 * r + 0.587 * g + 0.114 * b) > 140 ? '#202020' : '#ffffff';
  }

  function drawDex() {
    ensureDex();
    const v = state.dexView;
    if (!v.filter) v.filter = 'all';
    const ids = dexEntries(v.filter);
    const x = 2, y = 2, w = VIEW_W - 4, h = VIEW_H - 4;
    window.PR_UI.panel(ctx, x, y, w, h, { fill:'#f8f0d8', border:'#202020', shadow:'#c89048' });

    // Header: title + filter label + count + back hint, sized to fit 232px.
    const filterLabel = DEX_FILTER_LABELS[v.filter];
    const total = Object.keys(window.PR_DATA.CREATURES).length;
    window.PR_UI.header(ctx, 'POKEDEX', x + 2, y + 2, w - 4, { fill:'#1a0204', line:'#f0c020', text:'#f0c020' });
    window.PR_UI.drawText(ctx, filterLabel + ' ' + ids.length + '/' + total, x + 56, y + 4, '#f0c020');
    window.PR_UI.drawText(ctx, 'B:BACK', x + w - 38, y + 4, '#f0c020');

    // Left: scrollable list. Mark glyphs (*=caught, .=seen) shown
    // alongside name; legend + filter hint below the list.
    const listX = x + 4, listY = y + 16, rowH = 11;
    const rows = 9;
    const listW = 86;
    for (let r = 0; r < rows; r++) {
      const i = v.scroll + r;
      if (i >= ids.length) break;
      const id = ids[i];
      const sp = window.PR_DATA.CREATURES[id];
      const cy = listY + r * rowH;
      if (i === v.idx) window.PR_UI.selectBar(ctx, listX, cy - 1, listW, 10, true);
      const num = String(sp.dex).padStart(3, '0');
      const caught = state.dex.caught.has(id);
      const seen = state.dex.seen.has(id);
      const mark = caught ? '*' : seen ? '.' : ' ';
      window.PR_UI.drawText(ctx, mark + num + ' ' + sp.name.slice(0, 8), listX + 2, cy, '#202020');
    }
    if (ids.length === 0) {
      window.PR_UI.drawText(ctx, '(empty)', listX + 4, listY + 4, '#806040');
    }
    // Legend + filter cycle hint below the list.
    const legendY = listY + rows * rowH + 2;
    window.PR_UI.drawText(ctx, '*=GOT .=SEEN', listX, legendY, '#806040');
    window.PR_UI.drawText(ctx, 'SEL: ' + filterLabel, listX, legendY + 9, '#385890');

    // Right: detail panel. If the filter yields no entries, show an
    // empty-state message and skip species rendering entirely.
    const dx = x + 92, dy = y + 16, dw = w - 94, dh = h - 20;
    window.PR_UI.panel(ctx, dx, dy, dw, dh, { fill:'#d8ecff', border:'#202020', shadow:'#385890' });
    if (ids.length === 0) {
      const msg = v.filter === 'got' ? 'Catch some' : v.filter === 'seen' ? 'See some' : 'No entries';
      window.PR_UI.drawText(ctx, msg, dx + 6, dy + 6, '#202020');
      window.PR_UI.drawText(ctx, 'creatures first.', dx + 6, dy + 16, '#806040');
      window.PR_UI.drawText(ctx, 'SEL: change view.', dx + 6, dy + 30, '#385890');
      return;
    }
    const selId = ids[v.idx];
    const sp = window.PR_DATA.CREATURES[selId];
    const caught = state.dex.caught.has(selId);

    // Sprite + header strip. Sprite is 24px so name/dex/types fit beside it.
    const spriteSize = 24;
    const spriteX = dx + 4, spriteY = dy + 4;
    if (caught) {
      window.PR_MONS.drawCreature(ctx, selId, spriteX, spriteY, spriteSize, false);
    } else {
      window.PR_MONS.drawCreatureSilhouette(ctx, selId, spriteX, spriteY, spriteSize);
    }
    const headX = spriteX + spriteSize + 4;
    const num = String(sp.dex).padStart(3, '0');
    window.PR_UI.drawText(ctx, sp.name.slice(0, 12), headX, dy + 4, '#202020');
    window.PR_UI.drawText(ctx, '#' + num, headX, dy + 14, '#806040');

    // Type chips below the sprite (the area beside the sprite is too
    // narrow to fit two chips for a dual-type creature).
    let chipX = dx + 4, chipY = dy + spriteSize + 6;
    for (const t of sp.types) {
      const fill = window.PR_DATA.TYPE_COLOR[t] || '#a8a878';
      const text = dexTypeTextColor(fill);
      const wDrawn = window.PR_UI.chip(ctx, chipX, chipY, t, { fill, border:'#202020', text });
      chipX += wDrawn + 2;
    }

    // Description (3 lines, ~22 chars each given the panel width).
    const descX = dx + 4, descY = dy + spriteSize + 6 + 13;
    const descW = dw - 8;
    const descMaxChars = Math.max(14, Math.floor(descW / 6));
    const descLines = window.PR_UI.wrap(sp.description || '', descMaxChars).slice(0, 3);
    for (let i = 0; i < descLines.length; i++) {
      window.PR_UI.drawText(ctx, descLines[i], descX, descY + i * 9, '#202020');
    }

    const divY = descY + 3 * 9 + 1;
    ctx.fillStyle = '#385890';
    ctx.fillRect(dx + 3, divY, dw - 6, 1);

    if (!caught) {
      window.PR_UI.drawText(ctx, 'Catch to reveal more.', dx + 4, divY + 4, '#806040');
      return;
    }

    // Stats: 2 rows of 3. Compact spacing.
    const stY = divY + 4;
    const colW = (dw - 8) / 3;
    const stat = (label, val, col, row) => {
      window.PR_UI.drawText(ctx,
        label + ' ' + val,
        dx + 4 + col * colW,
        stY + row * 9,
        '#202020');
    };
    stat('HP', sp.baseStats.hp,  0, 0);
    stat('AT', sp.baseStats.atk, 1, 0);
    stat('DF', sp.baseStats.def, 2, 0);
    stat('SP', sp.baseStats.spe, 0, 1);
    stat('SA', sp.baseStats.spa, 1, 1);
    stat('SD', sp.baseStats.spd, 2, 1);

    // Evolution chain. Mini sprites with arrow + level above.
    const chain = dexEvolutionChain(selId);
    const evoY = stY + 19;
    window.PR_UI.drawText(ctx, 'EVO', dx + 4, evoY, '#385890');
    const evoSize = 14;
    let ex = dx + 22;
    const ey = evoY - 4;
    if (chain.length <= 1) {
      window.PR_UI.drawText(ctx, '(none)', ex, evoY, '#806040');
    } else {
      for (let i = 0; i < chain.length; i++) {
        const id = chain[i];
        const isCaughtStage = state.dex.caught.has(id);
        if (isCaughtStage) {
          window.PR_MONS.drawCreature(ctx, id, ex, ey, evoSize, false);
        } else {
          window.PR_MONS.drawCreatureSilhouette(ctx, id, ex, ey, evoSize);
        }
        ex += evoSize;
        if (i < chain.length - 1) {
          const lvNext = window.PR_DATA.CREATURES[id].evolves
            ? window.PR_DATA.CREATURES[id].evolves.level
            : '?';
          window.PR_UI.drawText(ctx, '>',     ex + 1, ey + 4, '#202020');
          window.PR_UI.drawText(ctx, 'L' + lvNext, ex - 1, ey - 6, '#a02828');
          ex += 10;
        }
      }
    }

    // Moves: 4 levels visible. Show first 4 entries — these are the
    // earliest learns and the ones a wild encounter is most likely to
    // know. A "(+N)" hint indicates if there are more.
    const learn = sp.learnset || [];
    const visible = learn.slice(0, 4);
    const moveY = evoY + evoSize + 2;
    window.PR_UI.drawText(ctx, 'MOVES', dx + 4, moveY, '#385890');
    for (let i = 0; i < visible.length; i++) {
      const [lv, mvId] = visible[i];
      const mv = window.PR_DATA.MOVES[mvId];
      const label = 'L' + String(lv).padStart(2, ' ') + ' ' + (mv ? mv.name : mvId);
      window.PR_UI.drawText(ctx, label.slice(0, 18), dx + 4, moveY + 9 + i * 8, '#202020');
    }
    if (learn.length > visible.length) {
      window.PR_UI.drawText(ctx, '+' + (learn.length - visible.length) + ' more', dx + dw - 44, moveY, '#806040');
    }
  }

  // ---------- World map + warp ----------
  // Circular region layout. Spawn coords are known walkable arrival tiles.
  const WORLD_NODES = [
    { id:'rodport',    name:'RODPORT',    short:'ROD', kind:'TOWN',  x:118, y:24,  color:'#60b870', spawn:{x:8,  y:9,  dir:'down'} },
    { id:'brindale',   name:'BRINDALE',   short:'BRI', kind:'TOWN',  x:158, y:38,  color:'#80c878', spawn:{x:22, y:17, dir:'down'} },
    { id:'woodfall',   name:'WOODFALL',   short:'WDF', kind:'TOWN',  x:178, y:74,  color:'#50a860', spawn:{x:22, y:17, dir:'down'} },
    { id:'crestrock',  name:'CRESTROCK',  short:'CRG', kind:'TOWN',  x:158, y:110, color:'#a89870', spawn:{x:22, y:17, dir:'down'} },
    { id:'mountain',   name:'HIGHSPIRE',  short:'HI',  kind:'SPUR',  x:204, y:118, color:'#a8b8d8', spawn:{x:6,  y:20, dir:'right'} },
    { id:'frostmere',  name:'FROSTMERE',  short:'FRS', kind:'TOWN',  x:118, y:124, color:'#98d8e8', spawn:{x:22, y:17, dir:'down'} },
    { id:'harborside', name:'HARBORSIDE', short:'HBR', kind:'TOWN',  x:78,  y:110, color:'#58a8d8', spawn:{x:22, y:17, dir:'down'} },
    { id:'beach',      name:'BEACH',      short:'BCH', kind:'SPUR',  x:34,  y:118, color:'#f0d070', spawn:{x:7,  y:20, dir:'right'} },
    { id:'summitvale', name:'SUMMITVALE', short:'SMT', kind:'TOWN',  x:58,  y:74,  color:'#d88858', spawn:{x:22, y:17, dir:'down'} },
    { id:'desert',     name:'DESERT',     short:'DST', kind:'LOOP',  x:78,  y:38,  color:'#d8a850', spawn:{x:6,  y:20, dir:'right'} }
  ];
  const WORLD_LINKS = [
    { a:'rodport', b:'brindale',   label:'ROUTE 1',      color:'#74b870' },
    { a:'brindale', b:'woodfall',  label:'ROUTE 2',      color:'#60a858' },
    { a:'woodfall', b:'crestrock', label:'PEBBLEWOOD',   color:'#509850' },
    { a:'crestrock', b:'frostmere', label:'GLIMCAVERN',  color:'#807070' },
    { a:'frostmere', b:'harborside', label:'FROSTPEAK',  color:'#90c8e8' },
    { a:'harborside', b:'summitvale', label:'SEAROUTE',  color:'#58a8d8' },
    { a:'summitvale', b:'desert',  label:'DUNE ROAD',    color:'#d8a850' },
    { a:'desert', b:'rodport',    label:'DESERT LOOP',   color:'#c89048', gate:'6 BADGES' },
    { a:'crestrock', b:'mountain', label:'HIGHSPIRE',    color:'#b8c8e0', spur:true },
    { a:'harborside', b:'beach',   label:'BEACH PATH',   color:'#e0c860', spur:true }
  ];
  const WORLD_MAP_HINTS = {
    player_house:'rodport', rival_house:'rodport', lab:'rodport',
    rodport_dockhouse:'rodport', rodport_boathouse:'rodport',
    route1:'rodport', route1_hollow:'rodport', route2:'brindale', pebblewood:'woodfall',
    pebblewood_cavern:'woodfall',
    crestrock_center:'crestrock', crestrock_mart:'crestrock', crestrock_gym:'crestrock',
    crestrock_workshop:'crestrock', crestrock_house:'crestrock',
    woodfall_center:'woodfall', woodfall_mart:'woodfall', woodfall_gym:'woodfall',
    woodfall_lodge:'woodfall', woodfall_cabin:'woodfall',
    brindale_gym:'brindale', pokecenter:'brindale', mart:'brindale', townhouse:'brindale',
    brindale_school:'brindale',
    glimcavern:'crestrock', glimcavern_b1:'crestrock',
    frostmere:'frostmere', frostmere_center:'frostmere', frostmere_mart:'frostmere', frostmere_gym:'frostmere',
    frostmere_inn:'frostmere', frostmere_cabin:'frostmere',
    frostpeak:'frostmere', frostpeak_ice_cave:'frostmere',
    harborside_center:'harborside', harborside_mart:'harborside', harborside_gym:'harborside',
    harborside_warehouse:'harborside', harborside_fisher:'harborside',
    searoute:'harborside', searoute_tide_cavern:'harborside',
    summitvale_center:'summitvale', summitvale_mart:'summitvale', summitvale_house:'summitvale',
    summitvale_lookout:'summitvale', summitvale_hall:'summitvale',
    mountain:'mountain', beach:'beach', desert:'desert', desert_ruins:'desert'
  };
  const WORLD_AREA_DETAILS = {
    rodport: {
      icon:'harbor', tag:'HARBOR LAB',
      detail:'Starter rods wake to sea spray and dock bells.'
    },
    brindale: {
      icon:'garden', tag:'GARDEN TOWN',
      detail:'Garden lanes smell like berries after rain.'
    },
    woodfall: {
      icon:'forest', tag:'FOREST HUSH',
      detail:'Cabins peek from mossy shade and shy trails.'
    },
    crestrock: {
      icon:'stone', tag:'MINE CITY',
      detail:'Terrace shops hum over bright ore veins.'
    },
    mountain: {
      icon:'peak', tag:'HIGH ROAD',
      detail:'Thin air, huge views, and brave boots.'
    },
    frostmere: {
      icon:'snow', tag:'SNOW HAVEN',
      detail:'Snow cabins glow with soup-steam windows.'
    },
    harborside: {
      icon:'port', tag:'MARKET PORT',
      detail:'Stalls trade shells, tall tales, and rope.'
    },
    beach: {
      icon:'beach', tag:'SUNNY SPUR',
      detail:'Warm shallows hide shiny pocket treasures.'
    },
    summitvale: {
      icon:'summit', tag:'LOOKOUT',
      detail:'Switchbacks climb toward little cloud bells.'
    },
    desert: {
      icon:'ruins', tag:'OASIS LOOP',
      detail:'Old ruins stay cool after copper dusk.'
    }
  };

  function worldNode(id) {
    for (const n of WORLD_NODES) if (n.id === id) return n;
    return WORLD_NODES[0];
  }

  function worldNodeIndexById(id) {
    const idx = WORLD_NODES.findIndex(n => n.id === id);
    return idx >= 0 ? idx : 0;
  }

  function worldNodeIndexForMap(mapId) {
    const id = WORLD_MAP_HINTS[mapId] || mapId;
    return worldNodeIndexById(id);
  }

  function worldLinksForNode(id) {
    return WORLD_LINKS.filter(l => l.a === id || l.b === id);
  }

  function worldNeighborIds(id) {
    return worldLinksForNode(id).map(l => l.a === id ? l.b : l.a);
  }

  function moveWorldSelection(view, dir) {
    const cur = WORLD_NODES[view.idx];
    const dirs = {
      right:{ x:1, y:0 }, left:{ x:-1, y:0 },
      down:{ x:0, y:1 }, up:{ x:0, y:-1 }
    };
    const dv = dirs[dir];
    if (!cur || !dv) return false;
    let best = null;
    for (const id of worldNeighborIds(cur.id)) {
      const n = worldNode(id);
      const vx = n.x - cur.x;
      const vy = n.y - cur.y;
      const dist = Math.max(1, Math.sqrt(vx * vx + vy * vy));
      const primary = vx * dv.x + vy * dv.y;
      if (primary <= 0) continue;
      const cross = Math.abs(vx * dv.y - vy * dv.x);
      const score = (primary / dist) * 100 - (cross / dist) * 28 - dist * 0.05;
      if (!best || score > best.score) best = { idx:worldNodeIndexById(id), score };
    }
    const next = best ? best.idx :
      (dir === 'right' || dir === 'down'
        ? (view.idx + 1) % WORLD_NODES.length
        : (view.idx + WORLD_NODES.length - 1) % WORLD_NODES.length);
    if (next !== view.idx) {
      view.idx = next;
      window.PR_SFX && window.PR_SFX.play('select');
      return true;
    }
    return false;
  }

  function openWorldMap() {
    state.map = { idx: worldNodeIndexForMap(state.player.map) };
    state.mode = 'map';
    window.PR_SFX && window.PR_SFX.play('confirm');
  }

  function updateWorldMap() {
    const I = window.PR_INPUT;
    const m = state.map;
    if (I.consumePressed('ArrowRight')) moveWorldSelection(m, 'right');
    else if (I.consumePressed('ArrowLeft')) moveWorldSelection(m, 'left');
    else if (I.consumePressed('ArrowDown')) moveWorldSelection(m, 'down');
    else if (I.consumePressed('ArrowUp')) moveWorldSelection(m, 'up');
    if (I.consumePressed('x')) {
      state.map = null;
      state.mode = 'menu';
      return;
    }
    if (I.consumePressed('z') || I.consumePressed('Enter')) {
      const target = WORLD_NODES[m.idx];
      if (m.idx === worldNodeIndexForMap(state.player.map)) {
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
    const x = 4, y = 4, w = VIEW_W - 8, h = VIEW_H - 8;
    window.PR_UI.panel(ctx, x, y, w, h, {
      fill:'#f3dfae', border:'#202020', shadow:'#b0702c', highlight:'#fff2c8'
    });
    window.PR_UI.header(ctx, 'WORLD MAP', x + 4, y + 4, w - 8, {
      fill:'#1a0204', line:'#f0c020', text:'#f0c020'
    });
    window.PR_UI.drawText(ctx, 'D-PAD PICK', x + 78, y + 8, '#f0d080');
    window.PR_UI.drawText(ctx, 'A WARP  B BACK', x + w - 88, y + 8, '#f0d080');

    drawWorldMapTerrain(x, y, w, h);

    for (const link of WORLD_LINKS) drawWorldLink(link);

    const currentIdx = worldNodeIndexForMap(state.player.map);
    for (let i = 0; i < WORLD_NODES.length; i++) {
      const n = WORLD_NODES[i];
      const isSel = i === state.map.idx;
      const isHere = i === currentIdx;
      const r = isSel ? 6 : 5;
      ctx.fillStyle = 'rgba(32,18,8,0.35)';
      ctx.fillRect(n.x - r - 1, n.y - r + 2, r * 2 + 4, r * 2 + 3);
      ctx.fillStyle = '#202020';
      ctx.fillRect(n.x - r - 2, n.y - r - 2, r * 2 + 4, r * 2 + 4);
      ctx.fillStyle = '#fff8d8';
      ctx.fillRect(n.x - r - 1, n.y - r - 1, r * 2 + 2, r * 2 + 2);
      ctx.fillStyle = isSel ? '#f0c020' : n.color;
      ctx.fillRect(n.x - r, n.y - r, r * 2, r * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(n.x - r + 1, n.y - r + 1, r * 2 - 2, 2);
      ctx.fillStyle = isHere ? '#e83838' : '#fff';
      ctx.fillRect(n.x - 2, n.y - 2, 4, 4);
      if (isHere) window.PR_UI.drawText(ctx, '*', n.x + 6, n.y - 7, '#e83838');
      window.PR_UI.drawText(ctx, n.short, n.x - 9, n.y + 8, '#202020');
      if (isSel) {
        ctx.fillStyle = '#202020';
        ctx.fillRect(n.x - r - 3, n.y - r - 5, r * 2 + 6, 2);
        ctx.fillRect(n.x - r - 3, n.y + r + 3, r * 2 + 6, 2);
      }
    }

    const sel = WORLD_NODES[state.map.idx];
    drawWorldAreaPopup(sel, currentIdx);
  }

  function drawWorldMapTerrain(x, y, w, h) {
    ctx.fillStyle = '#d9c184';
    ctx.fillRect(x + 8, y + 20, w - 16, h - 28);
    ctx.fillStyle = 'rgba(255,255,255,0.26)';
    for (let yy = y + 26; yy < y + h - 10; yy += 14) ctx.fillRect(x + 10, yy, w - 20, 1);
    for (let xx = x + 14; xx < x + w - 10; xx += 18) ctx.fillRect(xx, y + 22, 1, h - 32);

    const patches = [
      [24,29,44,28,'#4c9e55'], [154,27,52,31,'#7fc96a'], [162,89,44,34,'#8d7860'],
      [98,108,45,28,'#d8f4ff'], [23,91,48,31,'#58a8d8'], [50,30,38,25,'#d7a35a'],
      [57,58,46,24,'#d88858'], [188,112,28,20,'#f0d070']
    ];
    for (const p of patches) {
      ctx.fillStyle = p[4];
      ctx.fillRect(x + p[0], y + p[1], p[2], p[3]);
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(x + p[0] + 2, y + p[1] + 2, p[2] - 4, 2);
    }
    ctx.fillStyle = '#806040';
    ctx.fillRect(x + 18, y + h - 19, 20, 2);
    ctx.fillRect(x + 18, y + h - 19, 2, 10);
    ctx.fillRect(x + 36, y + h - 19, 2, 10);
    window.PR_UI.drawText(ctx, 'N', x + 26, y + h - 31, '#806040');
  }

  function drawWorldLink(link) {
    const a = worldNode(link.a);
    const b = worldNode(link.b);
    const cx = 118, cy = 76;
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const bend = link.spur ? 0 : 0.22;
    const ox = mx + (mx - cx) * bend;
    const oy = my + (my - cy) * bend;
    ctx.save();
    ctx.strokeStyle = 'rgba(32,20,10,0.35)';
    ctx.lineWidth = link.gate ? 3 : 4;
    if (link.spur || link.gate) ctx.setLineDash([3, 2]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y + 2);
    ctx.quadraticCurveTo(ox, oy + 2, b.x, b.y + 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = link.color;
    ctx.lineWidth = link.gate ? 2 : 3;
    if (link.spur || link.gate) ctx.setLineDash([3, 2]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(ox, oy, b.x, b.y);
    ctx.stroke();
    ctx.restore();
  }

  function drawWorldAreaPopup(sel, currentIdx) {
    const detail = WORLD_AREA_DETAILS[sel.id] || {};
    const popW = 132, popH = 72;
    let px = sel.x < VIEW_W / 2 ? 100 : 8;
    let py = sel.y < VIEW_H / 2 ? 84 : 24;
    px = Math.max(8, Math.min(VIEW_W - popW - 8, px));
    py = Math.max(20, Math.min(VIEW_H - popH - 6, py));
    window.PR_UI.panel(ctx, px, py, popW, popH, {
      fill:'#fff8e8', border:'#202020', shadow:'#b0702c', highlight:'#fff8f0'
    });
    window.PR_UI.header(ctx, sel.name.slice(0, 16), px + 4, py + 4, popW - 8, {
      fill:'#1a0204', line:sel.color || '#f0c020', text:'#f0c020'
    });
    drawAreaBadge(sel, detail.icon || 'town', px + 7, py + 21);
    window.PR_UI.chip(ctx, px + 34, py + 21, detail.tag || sel.kind, {
      fill:'#e8f0ff', border:'#385890', text:'#202020'
    });
    const status = state.map.idx === currentIdx ? 'YOU ARE HERE' : 'FAST TRAVEL';
    window.PR_UI.drawText(ctx, status, px + 34, py + 34, state.map.idx === currentIdx ? '#e83838' : '#385890');
    const lines = window.PR_UI.wrap(detail.detail || 'A curious place waits here.', 20);
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      window.PR_UI.drawText(ctx, lines[i], px + 7, py + 47 + i * 8, '#604830');
    }
  }

  function drawAreaBadge(sel, icon, x, y) {
    ctx.fillStyle = '#202020';
    ctx.fillRect(x, y, 22, 22);
    ctx.fillStyle = sel.color || '#80c878';
    ctx.fillRect(x + 1, y + 1, 20, 20);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x + 2, y + 2, 18, 2);
    ctx.fillStyle = '#fff8e8';
    if (icon === 'harbor' || icon === 'port') {
      ctx.fillRect(x + 3, y + 12, 16, 2);
      ctx.fillRect(x + 4, y + 16, 4, 2);
      ctx.fillRect(x + 10, y + 16, 4, 2);
      ctx.fillStyle = '#385890';
      ctx.fillRect(x + 4, y + 5, 10, 5);
      ctx.fillRect(x + 14, y + 7, 3, 3);
    } else if (icon === 'garden' || icon === 'forest') {
      ctx.fillStyle = '#2f7838';
      ctx.fillRect(x + 5, y + 8, 5, 5);
      ctx.fillRect(x + 12, y + 6, 5, 6);
      ctx.fillRect(x + 8, y + 12, 8, 5);
      ctx.fillStyle = '#f0c020';
      ctx.fillRect(x + 5, y + 5, 2, 2);
      ctx.fillRect(x + 16, y + 13, 2, 2);
    } else if (icon === 'stone' || icon === 'peak' || icon === 'summit') {
      ctx.fillStyle = '#806850';
      ctx.fillRect(x + 4, y + 14, 14, 4);
      ctx.fillRect(x + 7, y + 10, 8, 4);
      ctx.fillRect(x + 10, y + 6, 4, 4);
      ctx.fillStyle = '#fff8e8';
      ctx.fillRect(x + 10, y + 6, 3, 2);
    } else if (icon === 'snow') {
      ctx.fillStyle = '#e8f8ff';
      ctx.fillRect(x + 4, y + 5, 4, 4);
      ctx.fillRect(x + 13, y + 7, 4, 4);
      ctx.fillRect(x + 8, y + 13, 7, 3);
      ctx.fillStyle = '#58a8d8';
      ctx.fillRect(x + 5, y + 15, 12, 2);
    } else if (icon === 'beach') {
      ctx.fillStyle = '#58a8d8';
      ctx.fillRect(x + 3, y + 12, 16, 5);
      ctx.fillStyle = '#fff8d0';
      ctx.fillRect(x + 4, y + 5, 4, 4);
      ctx.fillRect(x + 6, y + 9, 8, 3);
    } else if (icon === 'ruins') {
      ctx.fillStyle = '#806040';
      ctx.fillRect(x + 5, y + 6, 12, 3);
      ctx.fillRect(x + 6, y + 9, 3, 8);
      ctx.fillRect(x + 13, y + 9, 3, 8);
      ctx.fillStyle = '#f0d080';
      ctx.fillRect(x + 10, y + 12, 2, 5);
    } else {
      ctx.fillStyle = '#fff8e8';
      ctx.fillRect(x + 6, y + 6, 10, 10);
      ctx.fillStyle = '#e83838';
      ctx.fillRect(x + 9, y + 9, 4, 4);
    }
  }

  const PARTY_PAGES = ['SUMMARY','STATS','MOVES'];

  function updatePartyView() {
    const I = window.PR_INPUT;
    const m = state.menu;
    const v = m.partyView || (m.partyView = { idx:0, page:0 });
    const max = state.party.length;
    if (max) {
      if (I.consumePressed('ArrowDown')) { v.idx = (v.idx + 1) % max; window.PR_SFX && window.PR_SFX.play('select'); }
      if (I.consumePressed('ArrowUp'))   { v.idx = (v.idx + max - 1) % max; window.PR_SFX && window.PR_SFX.play('select'); }
      if (I.consumePressed('ArrowRight') || I.consumePressed('z')) {
        v.page = (v.page + 1) % PARTY_PAGES.length;
        window.PR_SFX && window.PR_SFX.play('select');
      }
      if (I.consumePressed('ArrowLeft')) {
        v.page = (v.page + PARTY_PAGES.length - 1) % PARTY_PAGES.length;
        window.PR_SFX && window.PR_SFX.play('select');
      }
    }
    if (I.consumePressed('x') || I.consumePressed('Enter')) {
      m.viewing = null;
      m.partyView = null;
    }
  }

  function xpRatio(mon) {
    if (!mon || !window.PR_DATA) return 0;
    const lv = mon.level || window.PR_DATA.levelFromXp(mon.xp || 0);
    const curBase = window.PR_DATA.xpForLevel(lv);
    const nextBase = window.PR_DATA.xpForLevel(Math.min(100, lv + 1));
    if (nextBase <= curBase) return 1;
    return Math.max(0, Math.min(1, ((mon.xp || 0) - curBase) / (nextBase - curBase)));
  }

  function heldName(mon) {
    const def = mon && mon.held && window.PR_ITEMS && window.PR_ITEMS.byId(mon.held);
    return def ? def.name : 'NONE';
  }

  function drawPartyDetail(mon, page, x, y, w, h) {
    const sp = window.PR_DATA.CREATURES[mon.species];
    window.PR_UI.panel(ctx, x, y, w, h, { fill:'#f8f0d8', border:'#202020', shadow:'#c89048' });
    window.PR_UI.drawText(ctx, PARTY_PAGES[page], x + 6, y + 5, '#385890');
    window.PR_MONS.drawCreature(ctx, mon.species, x + w - 42, y + 4, 34, false, mon);
    window.PR_UI.drawText(ctx, mon.nickname.slice(0, 13), x + 6, y + 18, '#202020');
    window.PR_UI.drawText(ctx, 'L' + mon.level + ' ' + sp.types.join('/').slice(0, 13), x + 6, y + 28, '#385890');
    if (page === 0) {
      window.PR_UI.drawHpBar(ctx, x + 6, y + 42, 72, mon.hp, mon.stats.hp);
      window.PR_UI.drawText(ctx, mon.hp + '/' + mon.stats.hp + ' HP', x + 84, y + 40, '#202020');
      window.PR_UI.drawXpBar(ctx, x + 6, y + 54, 100, xpRatio(mon));
      window.PR_UI.drawText(ctx, 'XP', x + 110, y + 50, '#385890');
      window.PR_UI.drawText(ctx, 'STATUS ' + (mon.status || 'OK').toUpperCase(), x + 6, y + 64, '#202020');
      window.PR_UI.drawText(ctx, 'HELD ' + heldName(mon).slice(0, 16), x + 6, y + 76, '#202020');
      const mult = window.PR_DATA.xpMultiplier(state, mon);
      window.PR_UI.drawText(ctx, 'XP BONUS x' + mult.toFixed(2), x + 6, y + 88, '#806040');
    } else if (page === 1) {
      const rows = [
        ['HP', mon.stats.hp, mon.ivs && mon.ivs.hp],
        ['ATK', mon.stats.atk, mon.ivs && mon.ivs.atk],
        ['DEF', mon.stats.def, mon.ivs && mon.ivs.def],
        ['SPA', mon.stats.spa, mon.ivs && mon.ivs.spa],
        ['SPD', mon.stats.spd, mon.ivs && mon.ivs.spd],
        ['SPE', mon.stats.spe, mon.ivs && mon.ivs.spe]
      ];
      for (let i = 0; i < rows.length; i++) {
        const cy = y + 42 + i * 11;
        window.PR_UI.drawText(ctx, rows[i][0], x + 8, cy, '#385890');
        window.PR_UI.drawText(ctx, String(rows[i][1]), x + 44, cy, '#202020');
        window.PR_UI.drawText(ctx, 'IV ' + (rows[i][2] == null ? '-' : rows[i][2]), x + 82, cy, '#806040');
      }
    } else {
      for (let i = 0; i < 4; i++) {
        const mv = mon.moves[i];
        const cy = y + 42 + i * 17;
        if (!mv) {
          window.PR_UI.drawText(ctx, '-', x + 8, cy, '#806040');
          continue;
        }
        const def = window.PR_DATA.MOVES[mv.id];
        window.PR_UI.drawText(ctx, def.name.slice(0, 14), x + 8, cy, '#202020');
        window.PR_UI.drawText(ctx, def.type + ' ' + def.kind.toUpperCase().slice(0, 3), x + 8, cy + 8, '#385890');
        const pow = def.power ? ('PW ' + def.power) : 'STATUS';
        window.PR_UI.drawText(ctx, pow, x + 76, cy + 8, '#806040');
        window.PR_UI.drawText(ctx, (mv.pp || 0) + '/' + (mv.ppMax || def.pp), x + w - 34, cy, '#202020');
      }
    }
  }

  function drawPartyView() {
    const x = 6, y = 6, w = VIEW_W - 12, h = VIEW_H - 12;
    const v = (state.menu && state.menu.partyView) || { idx:0, page:0 };
    window.PR_UI.panel(ctx, x, y, w, h, { fill:'#d8ecff', border:'#202020', shadow:'#385890' });
    window.PR_UI.header(ctx, 'PARTY', x + 4, y + 4, w - 8, { fill:'#1a0204', line:'#f0c020', text:'#f0c020' });
    window.PR_UI.drawText(ctx, 'B:BACK  A:PAGE', x + w - 84, y + 4, '#806040');
    if (!state.party.length) {
      window.PR_UI.drawText(ctx, 'No partners yet.', x + 8, y + 30, '#202020');
      return;
    }
    const listX = x + 6, listY = y + 20, listW = 70;
    for (let i = 0; i < state.party.length; i++) {
      const mon = state.party[i];
      const cy = listY + i * 20;
      window.PR_UI.selectBar(ctx, listX, cy - 2, listW, 18, i === v.idx);
      window.PR_MONS.drawCreature(ctx, mon.species, listX + 2, cy - 2, 16, false, mon);
      window.PR_UI.drawText(ctx, mon.nickname.slice(0, 7), listX + 20, cy, i === v.idx ? '#1a0204' : '#202020');
      window.PR_UI.drawText(ctx, 'L' + mon.level, listX + 20, cy + 9, '#385890');
      if (mon.held) {
        ctx.fillStyle = '#f0c020';
        ctx.fillRect(listX + listW - 8, cy + 4, 4, 4);
      }
    }
    drawPartyDetail(state.party[Math.min(v.idx, state.party.length - 1)], v.page || 0, x + 82, y + 20, w - 90, h - 34);
  }

  // ---------- Battle end ----------
  function endBattle(outcome, battle) {
    if (outcome === 'lost') {
      // Faint to last visited center: respawn at start of current town with full heal.
      for (const m of state.party) { m.hp = m.stats.hp; m.status = null; for (const mv of m.moves) mv.pp = mv.ppMax; }
      state.player.map = 'rodport';
      // Path intersection at the city centre: applyWorldExpansion always
      // carves a horizontal cobble at row 17 and a vertical cobble at
      // col 22, so (22,17) is guaranteed walkable. The old (4,5) coord
      // was correct for the 20x18 rodport but applyWorldExpansion blew
      // the city out to 44x34 with `Y` (oak tree) fill, leaving the old
      // respawn standing on a tree.
      state.player.x = 22; state.player.y = 17; state.player.dir = 'down';
    }
    if (outcome === 'won' && battle.opts && battle.opts.npcKey) state.defeatedTrainers.add(battle.opts.npcKey);
    if (outcome === 'won') {
      ensurePlayerStats();
      state.player.stats.battlesWon = (state.player.stats.battlesWon || 0) + 1;
    }
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
