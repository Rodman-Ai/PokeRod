// Main game state machine and loop.
'use strict';

(function(){
  const VIEW_W = 240, VIEW_H = 160;
  const VERSION = 'v0.55.45';
  const BUILD = '2026.05.11-187';
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

  // Map id -> biome key for music selection. Unknowns fall back to 'town'.
  // Adds per-biome character: caves get a sparse minor loop, beaches a
  // breezy major loop, etc. See audio_music.js TRACKS for the full set.
  const BIOME_OF = {
    // grass routes
    route1:'route', route2:'route', pebblewood:'route', route1_hollow:'route',
    // caves & dungeons
    glimcavern:'cave', glimcavern_b1:'cave', pebblewood_cavern:'cave',
    frostpeak_ice_cave:'cave', searoute_tide_cavern:'cave', desert_ruins:'cave',
    // snowland
    frostpeak:'snowland', frostmere:'snowland',
    // beach / sea
    beach:'beach', searoute:'beach', harborside:'beach',
    // desert
    desert:'desert',
    // mountain
    mountain:'mountain', summitvale:'mountain',
    // new themed zones
    pokerod_amusement_park:'amusement',
    pokerod_castle:'castle',
    pokerod_casino:'casino'
  };
  // Strong weather kinds override the biome track. Light weather
  // (overcast, sleet, hail, snow) keeps the biome track and lets the
  // particle layer + weather SFX carry the mood.
  const WEATHER_TRACK = {
    rain:'rain_mus',
    thunder:'thunder_mus',
    hurricane:'thunder_mus',
    fog:'fog_mus'
  };
  function biomeOf(map) {
    return (map && BIOME_OF[map.id]) || 'town';
  }
  function pickOverworldTrack() {
    const m = state.world && state.world.currentMap && state.world.currentMap();
    if (!m || m.interior) return 'town';
    const w = window.PR_WEATHER && window.PR_WEATHER.currentKind && window.PR_WEATHER.currentKind();
    return WEATHER_TRACK[w] || biomeOf(m);
  }
  function playOverworldMusic() {
    if (!window.PR_MUSIC) return;
    const t = pickOverworldTrack();
    if (window.PR_MUSIC.current && window.PR_MUSIC.current() === t) return;
    window.PR_MUSIC.play(t);
  }

  const KONAMI_SEQUENCE = [
    'ArrowUp','ArrowUp','ArrowDown','ArrowDown',
    'ArrowLeft','ArrowRight','ArrowLeft','ArrowRight',
    'x','z'
  ];
  const KONAMI_KEYS = Array.from(new Set(KONAMI_SEQUENCE));
  let konamiIndex = 0;

  // Wire callbacks the world will invoke.
  state.onMapChange = () => {
    playOverworldMusic();
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
      if (window.PR_STORY) window.PR_STORY.emit(state, 'hidden_item', { id, item:entry.item, count:entry.count });
    });
  };
  // Display names for ambient sprites that aren't dex creatures
  // (chickens etc.). Without this, state.onAmbient falls through to
  // 'Creature' for chickens and the dialog reads "Creature: ..." even
  // though they're chickens.
  const AMBIENT_NAMES = { chicken: 'Chicken' };

  state.onAmbient = (amb) => {
    const sp = window.PR_DATA.CREATURES[amb.species];
    const name = (sp && sp.name) || AMBIENT_NAMES[amb.species] || 'Creature';
    const line = window.PR_CHATTER ? window.PR_CHATTER.chatterFor(amb.species) : '...';
    openDialog([name + ':', line]);
  };
  state.onPause = openPauseMenu;
  state.onWorldMap = openWorldMap;
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
    // The inline bootstrap script in index.html already read the last
    // save's settings.graphics and set body[data-graphics] before any
    // JS ran. Mirror that into state.settings here so the immediately-
    // following applySettings() keeps the title screen in the last-
    // played era instead of stomping it back to the static default.
    if (document.body && document.body.dataset.graphics) {
      const seed = document.body.dataset.graphics;
      if (GRAPHICS_STEPS.indexOf(seed) !== -1) state.settings.graphics = seed;
    }
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
    bindStart(document.getElementById('btn-new'),      () => { unlock(); offerNGPlusOrNew(); });
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
    // Pick the first empty slot for the new run; fall back to slot 0 if
    // all three are taken (the slot picker still lets the player switch
    // afterward). Clear ONLY that slot - never wipe the other saves.
    // Older code called PR_SAVE.clear() with no argument, which nuked
    // every slot plus the legacy + last-slot pointers.
    const slotInfo = window.PR_SAVE.slotInfo();
    const free = slotInfo.find(s => s.empty);
    const slot = free ? free.slot : 0;
    window.PR_SAVE.clear(slot);
    state.activeSlot = slot;
    // Spawn on the cottage-row path just south of player_house's
    // door tile in the post-redesign rodport (player_house is at
    // x:3,y:6,w:7 with door at (6,9) → walkable spur at (6,11)).
    state.player = { name:'YOU', map:'rodport', x:6, y:11, dir:'down', money:500, balls:5, steps:0,
                     bag: { rodball:5, potion:3, antidote:1, oranberry:1, old_rod:1, bicycle:1 },
                     equipment: { trinket: null },
                     stats: { battlesWon:0, catches:0 } };
    state.party = [];
    state.flags = { starterChosen:false };
    state.defeatedTrainers = new Set();
    state.dex = { seen: new Set(), caught: new Set() };
    if (window.PR_ITEMS) window.PR_ITEMS.ensureBag(state);
    state.world = new window.PR_WORLD.World(state);
    state.intro = { page: 0, charT: 0 };
    // Capture the player's name + favourites before the intro plays.
    // Once they're set, transitionToIntro() runs (called from
    // updateNewProfile after page 3 confirms).
    state.newProfile = { page: 0, idx: 0 };
    state.mode = 'newprofile';
    if (window.PR_STORY) window.PR_STORY.ensureFlags(state);
    showOverlay(false);
  }

  function transitionToIntro() {
    state.newProfile = null;
    state.mode = 'intro';
  }

  // If any save slot has cleared the champion (CINDER badge), offer
  // NG+ on NEW GAME click. NG+ carries over Dex / Trophies / play
  // stats / settings and bumps trainer levels by +5 per cycle.
  // Decline keeps the regular new-game flow which leaves the prior
  // saves alone (NG+ specifically overwrites the cleared slot).
  function offerNGPlusOrNew() {
    const championSlot = findChampionSlot();
    if (championSlot < 0) { startNewGame(); return; }
    let yes = false;
    try {
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        yes = window.confirm(
          'NEW GAME+ available! Carry over Dex, Trophies, and play stats? ' +
          'Trainers will be +5 levels per cycle. Cancel for a fresh new game.');
      }
    } catch (_) { /* fall back to regular */ }
    if (yes) startNGPlus(championSlot);
    else startNewGame();
  }
  function findChampionSlot() {
    if (!window.PR_SAVE || !window.PR_SAVE.load) return -1;
    for (let s = 0; s < 3; s++) {
      const data = window.PR_SAVE.load(s);
      if (data && data.flags && data.flags.beatChampion) return s;
    }
    return -1;
  }
  function startNGPlus(slot) {
    const prev = window.PR_SAVE.load(slot);
    if (!prev) { startNewGame(); return; }
    const keepDexSeen = prev.dexSeen || (prev.dex && prev.dex.seen) || [];
    const keepDexCaught = prev.dexCaught || (prev.dex && prev.dex.caught) || [];
    const keepAchv = (prev.player && prev.player.achievements) || [];
    const keepStats = Object.assign({}, prev.player && prev.player.stats || {});
    const prevNg = (prev.flags && (prev.flags.ngPlusCount | 0)) || 0;
    state.activeSlot = slot;
    window.PR_SAVE.clear(slot);
    state.player = { name:(prev.player && prev.player.name) || 'YOU',
                     map:'rodport', x:6, y:11, dir:'down', money:500, balls:5, steps:0,
                     bag: { rodball:5, potion:3, antidote:1, oranberry:1, old_rod:1, bicycle:1 },
                     equipment: { trinket: null },
                     stats: keepStats,
                     achievements: keepAchv };
    state.party = [];
    state.flags = {
      starterChosen: false,
      beatChampion: false,   // earned again next time
      ngPlusCount: prevNg + 1
    };
    state.defeatedTrainers = new Set();
    state.dex = { seen: new Set(keepDexSeen), caught: new Set(keepDexCaught) };
    if (window.PR_ITEMS) window.PR_ITEMS.ensureBag(state);
    state.world = new window.PR_WORLD.World(state);
    state.intro = { page: 0, charT: 0 };
    state.newProfile = { page: 0, idx: 0 };
    state.mode = 'newprofile';
    if (window.PR_STORY) window.PR_STORY.ensureFlags(state);
    showOverlay(false);
  }

  function continueGame() {
    const data = window.PR_SAVE.load();
    if (!data) { startNewGame(); return; }
    applySaveData(data);
    if (window.PR_STORY) window.PR_STORY.ensureFlags(state);
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
    // Accumulate play time. Skip the title screen and slot picker so the
    // counter only ticks while the player is actually IN their save.
    if (state.mode !== 'title' && state.mode !== 'slots' && state.player && state.player.stats) {
      state.player.stats.timePlayed = (state.player.stats.timePlayed || 0) + dt;
    }
    if (updateKonamiCode()) return;
    if (state.konamiArmed && state.mode === 'battle' && state.battle && state.battle.forceWin) {
      const hadBadge = state.battle.opts && state.battle.opts.badge;
      state.konamiArmed = false;
      if (state.battle.forceWin() && !hadBadge) showFlash('KONAMI WIN!');
      return;
    }
    if (state.healAnim) updateHealAnim(dt);
    if (state.menuAnim) {
      state.menuAnim.t += dt;
      if (state.menuAnim.t >= state.menuAnim.duration) state.menuAnim = null;
    }
    if (state.mode === 'title') updateTitle();
    else if (state.mode === 'intro') updateIntro(dt);
    else if (state.mode === 'overworld') state.world.update(dt);
    else if (state.mode === 'battle') state.battle.update(dt);
    else if (state.mode === 'dialog') updateDialog();
    else if (state.mode === 'cutscene') updateCutscene(dt);
    else if (state.mode === 'choice') updateChoice();
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
    else if (state.mode === 'fishing') updateFishing(dt);
    else if (state.mode === 'newprofile') updateNewProfile();
  }

  // While a cutscene is active, the player can't move or interact. The
  // story tick advances the walk-in / walk-out animation and fires
  // openSceneStep when the NPC arrives at the player. Dialog steps swap
  // the mode to 'dialog' (linear) or 'choice' (branching) as needed and
  // hand control back here when the dialog is dismissed.
  function updateCutscene(dt) {
    if (window.PR_STORY && window.PR_STORY.tickCutscene) {
      window.PR_STORY.tickCutscene(state, dt);
    }
  }
  function updateChoice() {
    const c = state.dialog && state.dialog.choice;
    if (!c) { state.mode = 'cutscene'; return; }
    const I = window.PR_INPUT;
    if (I.consumePressed('ArrowDown')) {
      c.cursor = (c.cursor + 1) % c.options.length;
      window.PR_SFX && window.PR_SFX.play('select');
    }
    if (I.consumePressed('ArrowUp')) {
      c.cursor = (c.cursor + c.options.length - 1) % c.options.length;
      window.PR_SFX && window.PR_SFX.play('select');
    }
    if (I.consumePressed('z') || I.consumePressed('Enter')) {
      window.PR_SFX && window.PR_SFX.play('confirm');
      const idx = c.cursor;
      if (typeof c.onPick === 'function') c.onPick(idx);
    }
    // B (x): pick the last option iff its label looks like a cancel
    // ("Cancel" / "No" / "Not now." etc). Lets players back out of
    // modals without scrolling to Cancel and pressing A. Wardrobe's
    // last option is "NEXT..." so it won't match - unchanged.
    if (I.consumePressed('x')) {
      const last = (c.options && c.options[c.options.length - 1]) || '';
      if (/^(cancel|no|not now\.?|not yet\.?)$/i.test(last)) {
        window.PR_SFX && window.PR_SFX.play('select');
        if (typeof c.onPick === 'function') c.onPick(c.options.length - 1);
      }
    }
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
      addMoney(state, 10000);
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
    if (state.mode === 'title') { withScale2(drawFlash); renderBottom(); return; }
    if (state.mode === 'intro') { withScale2(() => { drawIntro(); drawFlash(); drawTrophyToast(); }); renderBottom(); return; }
    if (state.mode === 'newprofile') { withScale2(() => { drawNewProfile(); drawFlash(); drawTrophyToast(); }); renderBottom(); return; }
    if (state.mode === 'battle') { withScale2(() => { state.battle.render(ctx); drawFlash(); drawTrophyToast(); }); renderBottom(); return; }
    state.world.render(ctx);
    withScale2(() => {
      if (state.mode === 'dialog') drawDialog();
      else if (state.mode === 'choice') drawChoice();
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
      else if (state.mode === 'fishing') drawFishing();
      drawFlash(); drawTrophyToast();
    });
    renderBottom();
  }

  function renderBottom() {
    if (window.PR_BOTTOM) window.PR_BOTTOM.render(state);
  }

  function drawFlash() {
    if (flashTimer <= 0 || !flashText) return;
    flashTimer -= 1/60;
    const w = flashText.length * 6 + 16;
    const x = (VIEW_W - w) / 2 | 0, y = 4;
    window.PR_UI.box(ctx, x, y, w, 14, '#fff', '#202020');
    window.PR_UI.drawText(ctx, flashText, x + 8, y + 4, '#202020');
  }
  // Trophy toast - fades in/out for ~2.2s when an achievement unlocks.
  // Drawn at the bottom of the screen so it doesn't fight the regular
  // flash banner at the top.
  function drawTrophyToast() {
    const t = state.flashTrophy;
    if (!t) return;
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (now >= t.until) { state.flashTrophy = null; return; }
    const def = window.PR_ACHV && window.PR_ACHV.get && window.PR_ACHV.get(t.id);
    if (!def) { state.flashTrophy = null; return; }
    const text = '* ' + def.name;
    const w = Math.min(VIEW_W - 8, text.length * 6 + 16);
    const x = (VIEW_W - w) / 2 | 0, y = VIEW_H - 22;
    window.PR_UI.box(ctx, x, y, w, 16, '#fff8c8', '#a06020');
    window.PR_UI.drawText(ctx, 'TROPHY UNLOCKED', x + 8, y + 2, '#a06020');
    window.PR_UI.drawText(ctx, text.slice(0, Math.floor((w-12)/6)), x + 8, y + 9, '#202020');
  }

  // ---------- Dialog ----------
  // Substitute {name}/{color}/{food}/{animal} with the current player's
  // chosen values. Used by openDialog so any encounter line that
  // references those tokens is rendered with the player's profile.
  // Capitalises the favourites (they're stored lowercase in newprofile).
  function capWord(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : ''; }
  function formatLine(line) {
    if (typeof line !== 'string' || line.indexOf('{') < 0) return line;
    const p = state.player || {};
    return line
      .replace(/\{name\}/g,   p.name || 'YOU')
      .replace(/\{color\}/g,  capWord(p.favColor)  || 'their favourite colour')
      .replace(/\{food\}/g,   capWord(p.favFood)   || 'something tasty')
      .replace(/\{animal\}/g, capWord(p.favAnimal) || 'a cute creature');
  }

  function openDialog(lines, onDone, source) {
    // Pre-wrap each input line and chunk overflow into pages of 3
    // visible lines, so long text never silently truncates. Tokens
    // are substituted before wrapping so wrapping considers the final
    // expanded length.
    const PAGE_LINES = 3, WRAP_W = 30;
    const pages = [];
    for (const rawLine of lines) {
      const line = formatLine(rawLine);
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
        const fromCutscene = !!(src && src.cutscene);
        state.dialog = null;
        // If a cutscene owns this dialog, return to 'cutscene' so the
        // story system keeps driving steps; otherwise back to overworld.
        state.mode = fromCutscene ? 'cutscene' : 'overworld';
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

  // ---------- Move tutor / re-learner -----------------------------
  // Talking to an NPC with a `tutor` block opens a 3-step chain:
  //   1. Pick a party creature
  //   2. Pick a relearnable move (from its learnset[lv<=level] minus
  //      moves it currently knows)
  //   3. If the creature already has 4 moves, pick a slot to forget
  // Cost is paid on the final confirm. Cancel at any step returns to
  // the overworld without charging.
  function openTutorFlow(npc) {
    const intro = (npc.tutor && npc.tutor.greeting) ||
      (npc.dialog && npc.dialog.length ? [npc.dialog[0]] : ['I can refresh a forgotten move.']);
    const cost = (npc.tutor && npc.tutor.cost) || 500;
    openDialog(intro.concat(['Service costs $' + cost + '.']), () => {
      if (!state.party || !state.party.length) {
        openDialog(['No creatures with you yet.']);
        return;
      }
      state.dialog = {
        choice: {
          prompt: 'Whose memory?',
          options: state.party.map((m, i) =>
            (i + 1) + '. ' + m.nickname + ' L' + m.level).concat(['Cancel']),
          cursor: 0,
          onPick: (idx) => _tutorPickMon(idx, npc, cost)
        }
      };
      state.mode = 'choice';
    });
  }
  function _tutorPickMon(slotIdx, npc, cost) {
    state.dialog = null;
    if (slotIdx >= state.party.length) { state.mode = 'overworld'; return; }
    const mon = state.party[slotIdx];
    const sp = window.PR_DATA.CREATURES[mon.species] || {};
    const known = new Set((mon.moves || []).map(m => m.id));
    const seenInList = new Set();
    const candidates = [];
    for (const entry of (sp.learnset || [])) {
      const lv = entry[0], mvId = entry[1];
      if (lv > mon.level) continue;
      if (known.has(mvId)) continue;
      if (seenInList.has(mvId)) continue;
      seenInList.add(mvId);
      candidates.push({ lv, mvId });
    }
    if (!candidates.length) {
      openDialog([mon.nickname + ' has nothing left to relearn.']);
      return;
    }
    // Trim to 7 entries so the choice box stays readable; add Cancel.
    const slice = candidates.slice(0, 7);
    state.dialog = {
      choice: {
        prompt: 'Which move?',
        options: slice.map(c => {
          const def = window.PR_DATA.MOVES[c.mvId];
          return (def ? def.name : c.mvId) + ' (L' + c.lv + ')';
        }).concat(['Cancel']),
        cursor: 0,
        onPick: (idx) => _tutorPickMove(idx, mon, slice, npc, cost)
      }
    };
    state.mode = 'choice';
  }
  function _tutorPickMove(idx, mon, candidates, npc, cost) {
    state.dialog = null;
    if (idx >= candidates.length) { state.mode = 'overworld'; return; }
    if ((state.player.money | 0) < cost) {
      openDialog(['Need $' + cost + '. Come back when you can pay.']);
      return;
    }
    const mvId = candidates[idx].mvId;
    const mvDef = window.PR_DATA.MOVES[mvId];
    if (!mvDef) { state.mode = 'overworld'; return; }
    // Open slot - just append.
    if (mon.moves.length < 4) {
      mon.moves.push({ id: mvId, pp: mvDef.pp, ppMax: mvDef.pp });
      state.player.money -= cost;
      window.PR_SFX && window.PR_SFX.play('confirm');
      if (window.PR_SAVE && window.PR_SAVE.save) window.PR_SAVE.save(state);
      openDialog([mon.nickname + ' learned ' + mvDef.name + '!']);
      return;
    }
    // Full - prompt to forget.
    state.dialog = {
      choice: {
        prompt: 'Forget which?',
        options: mon.moves.map((m, i) => {
          const d = window.PR_DATA.MOVES[m.id];
          return (i + 1) + '. ' + (d ? d.name : m.id);
        }).concat(['Cancel']),
        cursor: 0,
        onPick: (slotIdx) => {
          state.dialog = null;
          if (slotIdx >= mon.moves.length) { state.mode = 'overworld'; return; }
          const oldId = mon.moves[slotIdx].id;
          const oldDef = window.PR_DATA.MOVES[oldId];
          mon.moves[slotIdx] = { id: mvId, pp: mvDef.pp, ppMax: mvDef.pp };
          state.player.money -= cost;
          window.PR_SFX && window.PR_SFX.play('confirm');
          if (window.PR_SAVE && window.PR_SAVE.save) window.PR_SAVE.save(state);
          openDialog([
            mon.nickname + ' forgot ' + (oldDef ? oldDef.name : oldId) + '.',
            'And learned ' + mvDef.name + '!'
          ]);
        }
      }
    };
    state.mode = 'choice';
  }

  // ---------- Battle Tower (postgame) -----------------------------
  // Talking to a tower NPC opens a streak picker. Each streak is a
  // chain of trainer battles with a random rental opponent per round
  // and a level scaling +1 per round won. Party is auto-healed
  // between rounds. Winning the full streak pays a money reward and
  // updates the best-streak record. Losing ends the run early.
  function openTowerFlow(npc) {
    const flags = state.flags || (state.flags = {});
    if (npc.tower && npc.tower.requireChampion && !flags.beatChampion) {
      openDialog([
        'TOWER LEADER:',
        'Beat the CHAMPION first.',
        'Only then is the tower open to you.'
      ]);
      return;
    }
    const greet = (npc.tower && npc.tower.greeting) ||
                  (npc.dialog && npc.dialog.length ? [npc.dialog[0]] : ['Welcome to the tower.']);
    openDialog(greet, () => {
      state.dialog = {
        choice: {
          prompt: 'Pick a streak.',
          options: ['5 wins ($2,500)', '10 wins ($7,500)', '15 wins ($20,000)', 'Cancel'],
          cursor: 0,
          onPick: (idx) => _towerStartStreak(idx, npc)
        }
      };
      state.mode = 'choice';
    });
  }
  function _towerStartStreak(idx, npc) {
    state.dialog = null;
    if (idx === 3) { state.mode = 'overworld'; return; }
    const targets = [5, 10, 15];
    const rewards = [2500, 7500, 20000];
    const target = targets[idx];
    const reward = rewards[idx];
    const baseLevel = (npc.tower && npc.tower.baseLevel) || 40;
    state.flags = state.flags || {};
    state.flags.towerActive = { target, streak: 0, baseLevel, reward };
    state.mode = 'overworld';
    _towerStartRound();
  }
  function _towerStartRound() {
    const t = state.flags && state.flags.towerActive;
    if (!t) return;
    // Auto-heal the player's party between rounds. Items can't be
    // used inside a tower battle so this is the only restore.
    for (const m of state.party) {
      if (!m) continue;
      m.hp = m.stats.hp;
      m.status = null;
      for (const mv of m.moves) mv.pp = mv.ppMax;
    }
    const level = t.baseLevel + t.streak;
    const team = _towerBuildOpponent(level);
    const fakeNpc = {
      name: 'TOWER RIVAL ' + (t.streak + 1) + '/' + t.target,
      trainer: {
        team: team,
        reward: 0,
        defeat: ['Round ' + (t.streak + 1) + '/' + t.target + ' cleared!']
      }
    };
    startBattleAgainstTrainer(fakeNpc, '_tower_' + t.streak);
  }
  function _towerBuildOpponent(level) {
    const C = window.PR_DATA && window.PR_DATA.CREATURES;
    if (!C) return [['nibblet', level]];
    const ids = Object.keys(C);
    const pickN = 3;
    const team = [];
    const used = new Set();
    while (team.length < pickN && used.size < ids.length) {
      const id = ids[Math.floor(Math.random() * ids.length)];
      if (used.has(id)) continue;
      used.add(id);
      team.push([id, level]);
    }
    return team;
  }
  function _towerOnWin() {
    const t = state.flags && state.flags.towerActive;
    if (!t) return false;
    t.streak++;
    if (t.streak >= t.target) {
      // Streak cleared. Pay out, record best, exit tower.
      addMoney(state, t.reward);
      _towerRecordBest(t.target, t.streak);
      showFlash('TOWER CLEAR! +$' + t.reward);
      state.flags.towerActive = null;
      if (window.PR_SAVE && window.PR_SAVE.save) window.PR_SAVE.save(state);
      return true;
    }
    // Schedule the next round on the next overworld tick. Battles
    // already returned us to the overworld via endBattle.
    setTimeout(() => { try { _towerStartRound(); } catch (_) {} }, 200);
    return true;
  }
  function _towerOnLoss() {
    const t = state.flags && state.flags.towerActive;
    if (!t) return false;
    _towerRecordBest(t.target, t.streak);
    showFlash('Streak: ' + t.streak + '/' + t.target);
    state.flags.towerActive = null;
    if (window.PR_SAVE && window.PR_SAVE.save) window.PR_SAVE.save(state);
    return true;
  }
  function _towerRecordBest(target, streak) {
    state.flags = state.flags || {};
    const best = state.flags.towerBest || (state.flags.towerBest = {});
    const k = 's' + target;
    if ((best[k] | 0) < streak) best[k] = streak;
  }

  // ---------- Wardrobe (avatar customisation) ---------------------
  // Talking to a wardrobe NPC opens an 8-colour palette picker. The
  // chosen colour is stored as state.player.appearance.color and read
  // by sprites_chars.drawPlayer to hue-rotate the atlas sprite, so
  // every save's avatar reads as visibly different.
  const WARDROBE_COLOURS = ['RED','ORANGE','YELLOW','GREEN','BLUE','PURPLE','PINK','BLACK'];
  function openWardrobeFlow(npc) {
    const greet = (npc.wardrobe && npc.wardrobe.greeting) ||
                  (npc.dialog && npc.dialog.length ? [npc.dialog[0]] : ['Pick a new look.']);
    openDialog(greet, () => {
      const cur = ((state.player.appearance && state.player.appearance.color) ||
                   state.player.favColor || 'red').toUpperCase();
      state.dialog = {
        choice: {
          prompt: 'Outfit colour? (' + cur + ')',
          options: WARDROBE_COLOURS.slice(0, 4).concat(['NEXT...']),
          cursor: WARDROBE_COLOURS.indexOf(cur) >= 0 && WARDROBE_COLOURS.indexOf(cur) < 4
                  ? WARDROBE_COLOURS.indexOf(cur) : 0,
          onPick: (idx) => _wardrobePickPage(idx, npc, 0)
        }
      };
      state.mode = 'choice';
    });
  }
  function _wardrobePickPage(idx, npc, page) {
    state.dialog = null;
    const pageSize = 4;
    if (idx === pageSize) {
      // NEXT - flip to second half.
      const nextPage = (page + 1) % Math.ceil(WARDROBE_COLOURS.length / pageSize);
      const slice = WARDROBE_COLOURS.slice(nextPage * pageSize, nextPage * pageSize + pageSize);
      state.dialog = {
        choice: {
          prompt: 'Outfit colour?',
          options: slice.concat(['NEXT...']),
          cursor: 0,
          onPick: (i) => _wardrobePickPage(i, npc, nextPage)
        }
      };
      state.mode = 'choice';
      return;
    }
    const chosen = WARDROBE_COLOURS[page * pageSize + idx];
    if (!chosen) { state.mode = 'overworld'; return; }
    state.player.appearance = Object.assign({}, state.player.appearance || {},
      { color: chosen.toLowerCase() });
    showFlash(chosen + ' outfit on!');
    window.PR_SFX && window.PR_SFX.play('confirm');
    if (window.PR_SAVE && window.PR_SAVE.save) window.PR_SAVE.save(state);
    state.mode = 'overworld';
  }

  // ---------- Chef (cooking from berries) -------------------------
  // Talking to a chef NPC swaps a fixed count of one ingredient for
  // one output item. Currently used by MOM to turn 3 ORAN BERRIES
  // into a STEW. Extensible via npc.chef = { recipe, cost, output,
  // greeting }.
  function openChefFlow(npc) {
    const c = npc.chef || {};
    const recipe = c.recipe || 'oranberry';
    const cost = (c.cost | 0) || 3;
    const output = c.output || 'stew';
    const greet = c.greeting ||
      (npc.dialog && npc.dialog.length ? [npc.dialog[0]] : ['Bring me ingredients.']);
    const recipeDef = (window.PR_ITEMS && window.PR_ITEMS.ITEMS[recipe]) || null;
    const outDef = (window.PR_ITEMS && window.PR_ITEMS.ITEMS[output]) || null;
    const recipeName = recipeDef ? recipeDef.name : recipe.toUpperCase();
    const outName = outDef ? outDef.name : output.toUpperCase();
    openDialog(greet, () => {
      const have = (state.player.bag && state.player.bag[recipe]) || 0;
      if (have < cost) {
        openDialog([
          "You don't have " + cost + ' ' + recipeName + 's.',
          'Come back when you do.'
        ]);
        return;
      }
      state.dialog = {
        choice: {
          prompt: 'Trade ' + cost + ' ' + recipeName + ' for 1 ' + outName + '?',
          options: ['Yes, please.', 'Not now.'],
          cursor: 0,
          onPick: (idx) => {
            state.dialog = null;
            if (idx === 0) {
              window.PR_ITEMS.take(state, recipe, cost);
              window.PR_ITEMS.add(state, output, 1);
              window.PR_SFX && window.PR_SFX.play('confirm');
              showFlash('Got 1 ' + outName + '!');
              if (window.PR_SAVE && window.PR_SAVE.save) window.PR_SAVE.save(state);
            }
            state.mode = 'overworld';
          }
        }
      };
      state.mode = 'choice';
    });
  }

  // Branching choice render: prompt + 2-4 options. The dialog box itself
  // is reused (flat panel under the choice list) so the speaker stays
  // visible.
  function drawChoice() {
    const c = state.dialog && state.dialog.choice;
    if (!c) return;
    window.PR_UI.drawChoiceBox(ctx, c.prompt, c.options, c.cursor, VIEW_W, VIEW_H);
  }

  window.addEventListener('DOMContentLoaded', init);
  if (document.readyState !== 'loading') init();

  // Expose: open the party panel focused on the given party index.
  // Used by the DS bottom-screen tap handler to surface party stats
  // when a pill is touched in the overworld.
  function openPartyMember(idx) {
    if (!state || !state.party || !state.party.length) return false;
    const safe = Math.max(0, Math.min(state.party.length - 1, idx | 0));
    if (state.mode === 'battle' || state.mode === 'intro' || state.mode === 'title') return false;
    if (!state.menu) {
      state.menu = { idx: 3, options: ['MAP','DEX','BAG','PARTY','PROFILE','BOX','QUEST','SETTINGS','SAVE','LOAD'] };
    }
    state.menu.viewing = 'party';
    state.menu.partyView = { idx: safe, page: 0 };
    state.mode = 'menu';
    startMenuAnim && startMenuAnim();
    window.PR_SFX && window.PR_SFX.play('select');
    return true;
  }

  // expose for further additions
  window.PR_GAME = {
    state,
    openBagFromBattle: () => openBag('battle'),
    openPartyMember,
    openDialog,
    startBattleAgainstTrainer,
    startBattleAgainstWild,
    startFishing,
    showFlash
  };

  // ---------- New profile entry ----------
  // 4 sequential pages: NAME, COLOUR, FOOD, ANIMAL. Each page presents
  // an 8-option grid (D-pad navigates, A confirms, B goes back).
  // Page 0 (NAME) also surfaces an "OTHER" button that drops to the
  // browser's window.prompt() for an arbitrary name. The captured
  // values land in state.player.name / favColor / favFood / favAnimal.
  // After page 3 confirms, the intro plays as before.
  const NAME_PRESETS = ['ALEX','JESSE','RILEY','JORDAN','MORGAN','CASEY','AVERY','LANE'];
  const COLOR_PRESETS = ['RED','BLUE','GREEN','YELLOW','PURPLE','PINK','ORANGE','BLACK'];
  const FOOD_PRESETS = ['PIZZA','PASTA','SUSHI','BURGER','SOUP','RICE','SALAD','CHOCOLATE'];
  const ANIMAL_PRESETS = ['CAT','DOG','BIRD','FISH','RABBIT','FOX','DRAGON','OTTER'];
  const NEWPROFILE_PAGES = [
    { title:"WHAT'S YOUR NAME?",  options: NAME_PRESETS.concat(['OTHER']), field:'name',      lower:false },
    { title:'FAVOURITE COLOUR?',  options: COLOR_PRESETS,                  field:'favColor',  lower:true  },
    { title:'FAVOURITE FOOD?',    options: FOOD_PRESETS,                   field:'favFood',   lower:true  },
    { title:'FAVOURITE ANIMAL?',  options: ANIMAL_PRESETS,                 field:'favAnimal', lower:true  }
  ];

  function updateNewProfile() {
    const I = window.PR_INPUT;
    const v = state.newProfile || (state.newProfile = { page:0, idx:0 });
    const page = NEWPROFILE_PAGES[v.page];
    const cols = 3, rows = Math.ceil(page.options.length / cols);
    if (I.consumePressed('ArrowRight')) {
      v.idx = (v.idx + 1) % page.options.length;
      window.PR_SFX && window.PR_SFX.play('select');
    } else if (I.consumePressed('ArrowLeft')) {
      v.idx = (v.idx + page.options.length - 1) % page.options.length;
      window.PR_SFX && window.PR_SFX.play('select');
    } else if (I.consumePressed('ArrowDown')) {
      const target = v.idx + cols;
      if (target < page.options.length) v.idx = target;
      window.PR_SFX && window.PR_SFX.play('select');
    } else if (I.consumePressed('ArrowUp')) {
      const target = v.idx - cols;
      if (target >= 0) v.idx = target;
      window.PR_SFX && window.PR_SFX.play('select');
    }
    if (I.consumePressed('z') || I.consumePressed('Enter')) {
      const opt = page.options[v.idx];
      let value = opt;
      if (page.field === 'name' && opt === 'OTHER') {
        // Browser-native prompt - works on desktop + mobile keyboards.
        let custom = null;
        try { custom = window.prompt('Your name?', 'YOU'); }
        catch (_) { custom = null; }
        if (custom == null) {
          window.PR_SFX && window.PR_SFX.play('cancel');
          return;
        }
        custom = String(custom).trim().slice(0, 12);
        if (!custom) custom = 'YOU';
        value = custom;
      } else if (page.lower) {
        value = String(opt).toLowerCase();
      }
      state.player[page.field] = value;
      window.PR_SFX && window.PR_SFX.play('confirm');
      if (v.page < NEWPROFILE_PAGES.length - 1) {
        v.page++;
        v.idx = 0;
      } else {
        transitionToIntro();
      }
    }
    if (I.consumePressed('x')) {
      // B goes back a page; B on page 0 keeps defaults and skips ahead
      // (so a player who really doesn't care can mash B).
      if (v.page > 0) {
        v.page--;
        v.idx = 0;
        window.PR_SFX && window.PR_SFX.play('cancel');
      } else {
        transitionToIntro();
      }
    }
  }

  function drawNewProfile() {
    const v = state.newProfile || { page:0, idx:0 };
    const page = NEWPROFILE_PAGES[v.page];
    const x = 6, y = 6, w = VIEW_W - 12, h = VIEW_H - 12;
    window.PR_UI.panel(ctx, x, y, w, h, { fill:'#fff8e0', border:'#202020', shadow:'#c89048' });
    window.PR_UI.header(ctx, page.title, x + 4, y + 4, w - 8, { fill:'#1a0204', line:'#f0c020', text:'#f0c020' });
    window.PR_UI.drawText(ctx, (v.page + 1) + '/' + NEWPROFILE_PAGES.length, x + w - 28, y + 4, '#806040');
    // Live preview of what's been chosen so far.
    const summary = [
      state.player.name      ? 'NAME: '   + state.player.name      : '',
      state.player.favColor  ? 'COLOUR: ' + state.player.favColor.toUpperCase()  : '',
      state.player.favFood   ? 'FOOD: '   + state.player.favFood.toUpperCase()   : '',
      state.player.favAnimal ? 'ANIMAL: ' + state.player.favAnimal.toUpperCase() : ''
    ].filter(Boolean).join('  ');
    if (summary) window.PR_UI.drawText(ctx, summary.slice(0, 38), x + 8, y + 18, '#385890');
    // 3x3 option grid.
    const cols = 3;
    const cellW = (w - 24) / cols;
    const cellH = 18;
    const startY = y + 32;
    for (let i = 0; i < page.options.length; i++) {
      const cx = x + 12 + (i % cols) * cellW;
      const cy = startY + Math.floor(i / cols) * (cellH + 4);
      window.PR_UI.selectBar(ctx, cx, cy, cellW - 4, cellH - 2, i === v.idx);
      const label = page.options[i];
      const lw = window.PR_UI.textWidth(label);
      const tx = cx + ((cellW - 4) - lw) / 2 | 0;
      window.PR_UI.drawText(ctx, label, tx, cy + 4, i === v.idx ? '#1a0204' : '#202020');
    }
    window.PR_UI.drawText(ctx, 'A: PICK   B: BACK', x + 8, y + h - 12, '#806040');
  }

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
      'Press A to begin.'
    ] }
  ];

  // Pre-wrap each page's lines to a fixed column width so long copy
  // doesn't overflow the dialog box at the bottom of the intro. Cached
  // on the page object the first time it's needed.
  function introWrappedRows(page) {
    if (!page._wrapped) {
      const rows = [];
      for (const line of page.lines || []) {
        const w = (window.PR_UI && window.PR_UI.wrap) ? window.PR_UI.wrap(line, 32) : [line];
        for (const r of w) rows.push(r);
      }
      page._wrapped = rows;
      page._wrappedJoined = rows.join('\n');
    }
    return page;
  }
  function updateIntro(dt) {
    const I = window.PR_INPUT;
    state.intro.charT += dt * 60;
    if (I.consumePressed('z') || I.consumePressed('Enter')) {
      const page = introWrappedRows(INTRO_PAGES[state.intro.page]);
      const fullLen = page._wrappedJoined.length;
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

    // Text area at the bottom. Render the page's PRE-WRAPPED rows
    // (computed by introWrappedRows so long lines like "Some live wild;
    // others walk with friends." don't overflow the box). The type-on
    // effect respects line breaks: charT counts chars across the
    // wrapped joined string, and we draw row-by-row up to that cursor.
    introWrappedRows(page);
    const rows = page._wrapped;
    const fullJoined = page._wrappedJoined;
    const x = 8, y = VIEW_H - 56, w = VIEW_W - 16, h = 50;
    window.PR_UI.box(ctx, x, y, w, h, '#fff', '#202020');
    const cursor = Math.min(fullJoined.length, state.intro.charT | 0);
    let shown = fullJoined.slice(0, cursor);
    const visibleRows = shown.split('\n');
    for (let i = 0; i < visibleRows.length; i++) {
      window.PR_UI.drawText(ctx, visibleRows[i], x + 6, y + 6 + i * 10, '#202020');
    }
    // Page indicator.
    window.PR_UI.drawText(ctx, (state.intro.page+1) + '/' + INTRO_PAGES.length,
      x + w - 22, y + h - 10, '#808080');
    if (state.intro.charT >= fullJoined.length) {
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
  // Weather + time-of-day bias multipliers applied on top of the
  // map's flat per-entry `weight`. Both tables are multiplicative,
  // both check every type of the species (so a WATER/FLYING in a
  // hurricane gets both 2.5x and 1.8x). Entries with an explicit
  // `time` field were already hard-filtered upstream by
  // encounterPoolForMap; this bias just nudges the others.
  const WEATHER_TYPE_BIAS = {
    rain:      { WATER: 2.5, FIRE: 0.4, GRASS: 1.5 },
    hurricane: { WATER: 2.5, FLYING: 1.8, FIRE: 0.3 },
    thunder:   { ELECTRIC: 2.5, FLYING: 1.5 },
    snow:      { ICE: 2.5, FIRE: 0.5 },
    sleet:     { ICE: 2.0, WATER: 1.3 },
    hail:      { ICE: 2.5 },
    fog:       { GHOST: 2.0, DARK: 1.8, PSYCHIC: 1.4 },
    overcast:  { GHOST: 1.3, DARK: 1.3 }
  };
  const TIME_TYPE_BIAS = {
    day:   { FIRE: 1.3, NORMAL: 1.2, GROUND: 1.2 },
    dusk:  { GHOST: 1.3, DARK: 1.3, FLYING: 1.2 },
    night: { DARK: 1.8, GHOST: 1.8, PSYCHIC: 1.4, BUG: 1.2 },
    dawn:  { FLYING: 1.4, NORMAL: 1.2, FAIRY: 1.2 }
  };
  function biasedWeight(entry) {
    const sp = window.PR_DATA.CREATURES[entry.species];
    const types = (sp && sp.types) || [];
    let mult = 1;
    const w = window.PR_WEATHER && window.PR_WEATHER.currentKind && window.PR_WEATHER.currentKind();
    const wt = w && WEATHER_TYPE_BIAS[w];
    const tt = TIME_TYPE_BIAS[currentPhaseName()];
    for (const ty of types) {
      if (wt && wt[ty]) mult *= wt[ty];
      if (tt && tt[ty]) mult *= tt[ty];
    }
    // Daily featured creature - the player's encounter rate for the
    // featured species triples for the current calendar day.
    if (entry.species === dailyFeaturedSpecies()) mult *= 3;
    return entry.weight * mult;
  }

  // Pick one species deterministically per calendar day. Same date ->
  // same species on every device, so the "featured creature today"
  // line on the Dex page is consistent if a player checks across
  // sessions. Falls back to a constant if PR_DATA isn't ready yet.
  function dailyFeaturedSpecies() {
    const C = window.PR_DATA && window.PR_DATA.CREATURES;
    if (!C) return null;
    const ids = Object.keys(C);
    if (!ids.length) return null;
    const today = new Date();
    const key = today.getUTCFullYear() * 10000 + (today.getUTCMonth() + 1) * 100 + today.getUTCDate();
    // FNV-1a-ish 32-bit hash for stable index.
    let h = 2166136261;
    let n = key;
    while (n > 0) { h ^= (n & 0xff); h = (h * 16777619) >>> 0; n = n >>> 8; }
    return ids[h % ids.length];
  }

  // Roaming legendary - low-rate override that spawns a single
  // designated species at high level on outdoor routes. Available
  // after the first badge; despawns once caught. Wired here so it
  // composes with every existing encounter precondition (repel,
  // empty party, faint check, no pool).
  const ROAMER_SPECIES = 'solarcrest';
  const ROAMER_LEVEL_MIN = 38;
  const ROAMER_LEVEL_MAX = 44;
  const ROAMER_RATE = 1 / 50;
  function maybeSpawnRoamer(m) {
    if (!state.flags) state.flags = {};
    if (state.flags.roamerCaught) return false;
    const badges = (state.player.badges || []).length;
    if (badges < 1) return false;
    if (!m || m.interior) return false;
    if (!Array.isArray(m.encounters) && !Array.isArray(m.encounterZones)) return false;
    if (Math.random() >= ROAMER_RATE) return false;
    if (!window.PR_DATA.CREATURES[ROAMER_SPECIES]) return false;
    state.flags.roamerActive = true;
    state.flags.roamerSpecies = ROAMER_SPECIES;
    const lvl = ROAMER_LEVEL_MIN + Math.floor(Math.random() * (ROAMER_LEVEL_MAX - ROAMER_LEVEL_MIN + 1));
    if (state.showFlash) state.showFlash('A legendary creature appeared!');
    startBattleAgainstWild(ROAMER_SPECIES, lvl);
    return true;
  }

  function startWildEncounter() {
    if (!state.party.length) return;
    // Repel suppresses every wild encounter while its step counter is
    // > 0 (the counter ticks down per step in world.js, not here).
    if ((state.player.repelSteps | 0) > 0) return;
    const alive = state.party.some(p => p.hp > 0);
    if (!alive) return;
    const m = state.world.currentMap();
    // Roamer takes priority over the normal pool - 1/50 of outdoor
    // wild encounters become the legendary while it's still loose.
    if (maybeSpawnRoamer(m)) return;
    const encounters = encounterPoolForMap(m);
    if (!encounters || !encounters.length) return;
    const weights = encounters.map(biasedWeight);
    const total = weights.reduce((a, w) => a + w, 0);
    let r = Math.random() * total;
    let pick = encounters[0];
    for (let i = 0; i < encounters.length; i++) {
      r -= weights[i];
      if (r <= 0) { pick = encounters[i]; break; }
    }
    const lvl = pick.minL + Math.floor(Math.random() * (pick.maxL - pick.minL + 1));
    startBattleAgainstWild(pick.species, lvl);
  }

  // Resolve current phase name for time-of-day encounter filtering.
  // Falls back to 'day' if PR_TIME isn't loaded (atlas/intro boot).
  function currentPhaseName() {
    if (window.PR_TIME && window.PR_TIME.current) return window.PR_TIME.current();
    return 'day';
  }
  // Encounter entries can opt in to a `time` field. Accepted forms:
  //   time: 'day' | 'night' | 'dawn' | 'dusk'
  //   time: ['day','dusk']  // any-of
  // Entries without `time` appear at all hours (preserves existing
  // behaviour). If every encounter happens to be time-gated and none
  // match, fall back to the unfiltered list so the player is never
  // stranded with no wild encounters at a particular hour.
  function encounterMatchesPhase(entry, phaseName) {
    if (!entry.time) return true;
    if (Array.isArray(entry.time)) return entry.time.indexOf(phaseName) !== -1;
    return entry.time === phaseName;
  }
  function filterEncountersByTime(list) {
    if (!list || !list.length) return list;
    const phase = currentPhaseName();
    const filtered = list.filter(e => encounterMatchesPhase(e, phase));
    return filtered.length ? filtered : list;
  }

  function encounterPoolForMap(map) {
    if (!map) return [];
    let list = null;
    if (Array.isArray(map.encounterZones)) {
      const px = state.player.x | 0, py = state.player.y | 0;
      for (const zone of map.encounterZones) {
        const zx = zone.x | 0, zy = zone.y | 0;
        const zw = Math.max(1, zone.w | 0), zh = Math.max(1, zone.h | 0);
        if (px >= zx && px < zx + zw && py >= zy && py < zy + zh &&
            zone.encounters && zone.encounters.length) {
          list = zone.encounters;
          break;
        }
      }
    }
    if (!list) list = map.encounters || [];
    return filterEncountersByTime(list);
  }

  // ---------- Battle setup helpers ----------
  // Each step is logged on failure so we can pinpoint which line threw.
  function startBattleAgainstTrainer(npc, trainerKey) {
    let step = 'init';
    try {
      ensurePlayerStats();
      state.player.stats.encounters = (state.player.stats.encounters || 0) + 1;
      step = 'sfx-play';
      if (window.PR_SFX) {
        window.PR_SFX.play('encounter');
        // Cry the trainer's lead mon so encounters feel personal.
        const lead = npc && npc.trainer && npc.trainer.team && npc.trainer.team[0];
        if (lead && window.PR_SFX.cry) window.PR_SFX.cry(lead[0]);
      }
      step = 'music-play';
      if (window.PR_MUSIC) window.PR_MUSIC.play('battle');
      step = 'check-data';
      if (!window.PR_DATA || !window.PR_DATA.makeMon) throw new Error('PR_DATA missing');
      step = 'check-battle';
      if (!window.PR_BATTLE || !window.PR_BATTLE.Battle) throw new Error('PR_BATTLE missing');
      step = 'check-trainer';
      if (!npc || !npc.trainer || !Array.isArray(npc.trainer.team)) throw new Error('trainer team missing');
      step = 'build-team';
      const diff = (state.settings && DIFFICULTY[state.settings.difficulty]) || DIFFICULTY.normal;
      const ngLvl = (state.flags && (state.flags.ngPlusCount | 0)) * 5;
      const team = npc.trainer.team.map(([sp, lv]) =>
        window.PR_DATA.makeMon(sp, Math.max(1, (lv | 0) + (diff.trainerLvDelta || 0) + ngLvl)));
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
      ensurePlayerStats();
      state.player.stats.encounters = (state.player.stats.encounters || 0) + 1;
      step = 'sfx-play';
      if (window.PR_SFX) {
        window.PR_SFX.play('encounter');
        if (window.PR_SFX.cry) window.PR_SFX.cry(species);
      }
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
    if (npc.tutor) {
      openTutorFlow(npc);
      return;
    }
    if (npc.tower) {
      openTowerFlow(npc);
      return;
    }
    if (npc.wardrobe) {
      openWardrobeFlow(npc);
      return;
    }
    if (npc.chef) {
      openChefFlow(npc);
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
    // Story home characters: state-aware dialog from PR_STORY. Routed
    // here BEFORE the trainer / shop / healer branches so a story-id'd
    // NPC's dialog tree always wins, regardless of whether the static
    // entry happened to set extra flags.
    //
    // Quest layer sits on top: if this storyId character has a 'ready'
    // quest waiting, deliver the turn-in scene + reward. If they have a
    // 'notstarted' quest whose offerCondition is met, offer it (the
    // player picks accept/decline via choice prompt). Otherwise fall
    // through to the regular phase dialog.
    if (npc.storyId && window.PR_STORY && window.PR_STORY.npcDialog) {
      // Re-evaluate quest checks before consulting the registry so a
      // fetch quest the player just satisfied (e.g. picked up the 5th
      // oran berry) flips to 'ready' before the giver looks for it.
      // tickQuests will openDialog the "QUEST READY" announcement; we
      // skip that here because the npc itself is about to do it.
      if (window.PR_QUESTS) window.PR_QUESTS.tick(state);
      const Q = window.PR_QUESTS;
      const ready = Q && Q.readyQuest && Q.readyQuest(state, npc.storyId);
      if (ready) {
        const rewardName = ready.reward && window.PR_ITEMS && window.PR_ITEMS.ITEMS[ready.reward.item]
          ? window.PR_ITEMS.ITEMS[ready.reward.item].name : '';
        const lines = [
          (npc.name || 'NPC') + ': ' + ready.name + ' - done! Thank you.',
          'Take ' + (ready.reward.count || 1) + ' x ' + rewardName + '.'
        ];
        openDialog(lines, () => {
          const def = window.PR_QUESTS.turnInQuest(state, ready.id);
          if (def) {
            window.PR_SFX && window.PR_SFX.play('levelup');
            showFlash('QUEST CLEARED: ' + def.name);
          }
          window.PR_SAVE && window.PR_SAVE.save && window.PR_SAVE.save(state);
        });
        return;
      }
      const offer = Q && Q.offerableQuest && Q.offerableQuest(state, npc.storyId);
      if (offer) {
        // Open the standard phase dialog FIRST so the character speaks
        // in their voice; then surface the quest offer as a yes/no.
        const phaseLines = window.PR_STORY.npcDialog(state, npc.storyId);
        // Keep the phase dialog short so the offer follows quickly.
        const lead = phaseLines.slice(0, 1);
        const offerLines = [
          (npc.name || 'NPC') + ': One thing - ' + offer.name + '.',
          offer.desc
        ];
        openDialog(lead.concat(offerLines), () => {
          // Yes/no choice: A accepts (assigns), B declines (leaves
          // the quest 'notstarted' so the offer reappears next visit).
          state.dialog = {
            choice: {
              prompt: 'Accept?',
              options: ['Yes - I\'m on it.', 'Not now.'],
              cursor: 0,
              onPick: (idx) => {
                state.dialog = null;
                state.mode = 'overworld';
                if (idx === 0 && window.PR_QUESTS.assignQuest(state, offer.id)) {
                  window.PR_SFX && window.PR_SFX.play('confirm');
                  showFlash('QUEST ACCEPTED: ' + offer.name);
                } else {
                  window.PR_SFX && window.PR_SFX.play('select');
                }
                window.PR_SAVE && window.PR_SAVE.save && window.PR_SAVE.save(state);
              }
            }
          };
          state.mode = 'choice';
        });
        return;
      }
      const lines = window.PR_STORY.npcDialog(state, npc.storyId);
      openDialog(lines);
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
      if (npc.gym) {
        // Gym leaders are mandatory - preserve auto-start.
        openDialog(lines, () => {
          startBattleAgainstTrainer(npc, trainerKey);
        });
      } else {
        // Road / path / forest trainers: ask the player if they want
        // the fight. Cancelling backs out gracefully (the trainer is
        // still considered un-defeated; player can return any time).
        openDialog(lines, () => {
          state.dialog = {
            choice: {
              prompt: 'Battle?',
              options: ['Yes - bring it!', 'Not now.'],
              cursor: 0,
              onPick: (idx) => {
                state.dialog = null;
                state.mode = 'overworld';
                if (idx === 0) {
                  startBattleAgainstTrainer(npc, trainerKey);
                } else {
                  window.PR_SFX && window.PR_SFX.play('select');
                }
              }
            }
          };
          state.mode = 'choice';
        });
      }
      return;
    }
    // Rotating banter pool: archetype lines (from npc_chatter.js) plus
    // the NPC's own per-character lines (kept in maps.js for personality)
    // - one random pick per interaction so pressing A always feels
    // fresh. Sequential dialog is reserved for trainers / shops /
    // healers / starter slots / gates / story homes - they all return
    // earlier in handleNpcInteract.
    if (window.PR_NPC_CHATTER && window.PR_NPC_CHATTER.pickLine) {
      openDialog([window.PR_NPC_CHATTER.pickLine(npc)]);
    } else {
      openDialog(npc.dialog || ['...']);
    }
  }

  function healAtCenter() {
    state.healAnim = { t: 0, duration: 2.0, healed: false };
    openDialog(['Healing your team...', 'All set! Have a great day!']);
  }

  function updateHealAnim(dt) {
    const h = state.healAnim;
    if (!h) return;
    h.t += dt;
    if (!h.healed && h.t >= 1.0) {
      h.healed = true;
      window.PR_SFX && window.PR_SFX.play('heal');
      for (const m of state.party) {
        m.hp = m.stats.hp;
        m.status = null;
        // Visiting a PokeRod Center is a friendship bump - small but
        // it adds up over the course of a run.
        if (typeof m.friendship === 'number') {
          m.friendship = Math.min(255, (m.friendship | 0) + 2);
        }
        for (const mv of m.moves) mv.pp = mv.ppMax;
      }
      window.PR_SAVE.save(state);
    }
    if (h.t >= h.duration + 0.5) state.healAnim = null;
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
        () => {
          window.PR_SAVE.save(state);
          if (window.PR_STORY) window.PR_STORY.emit(state, 'starter_chosen', { species:sp });
        }
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
    PROFILE:'profile', QUEST:'map', ERA:'gear',
    SETTINGS:'gear', SAVE:'save', LOAD:'save', PHOTO:'dex'
  };
  // Photo mode: snap the top-screen canvas to a downloadable PNG.
  // The menu is closed first so the world (not the pause panel)
  // renders into the canvas, then we capture on the next frame.
  function takePhoto() {
    state.menu = null;
    state.mode = 'overworld';
    requestAnimationFrame(() => {
      try {
        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pokerod-' + Date.now() + '.png';
        a.click();
        showFlash('PHOTO SAVED!');
        window.PR_SFX && window.PR_SFX.play('confirm');
      } catch (err) {
        console.warn('[PokeRod] photo failed:', err);
        showFlash('PHOTO FAILED');
      }
    });
  }
  // Short labels for the in-menu ERA toggle (full GRAPHICS_LABELS like
  // 'GBA FIRERED' don't fit in the 68px-wide menu cells).
  const ERA_ABBREV = { gb_red:'GB', gb_pocket:'GBP', gbc_yellow:'GBC', gba_firered:'GBA', ds_diamond:'DS' };

  function reducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function startMenuAnim() {
    if (window.PR_SETTINGS && window.PR_SETTINGS.graphics === 'ds_diamond' && !reducedMotion()) {
      state.menuAnim = { t: 0, duration: 0.18 };
    } else {
      state.menuAnim = null;
    }
  }
  function openPauseMenu() {
    state.menu = { idx: 0, options: ['MAP','DEX','BAG','PARTY','PROFILE','BOX','QUEST','ERA','SETTINGS','PHOTO','SAVE','LOAD'] };
    state.mode = 'menu';
    startMenuAnim();
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
      } else if (opt === 'LOAD') {
        openSlotPicker('load');
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
      } else if (opt === 'PHOTO') {
        takePhoto();
      } else if (opt === 'ERA') {
        // Single-tap toggle: cycle to the next era and apply
        // immediately. No submenu; the player sees the new label
        // (and the new visual style) without leaving the menu.
        const stepIdx = GRAPHICS_STEPS.indexOf(state.settings.graphics);
        state.settings.graphics = GRAPHICS_STEPS[(stepIdx + 1) % GRAPHICS_STEPS.length];
        applySettings();
        if (window.PR_SAVE && window.PR_SAVE.save) window.PR_SAVE.save(state);
        window.PR_SFX && window.PR_SFX.play('confirm');
      }
    }
  }
  function drawMenu() {
    const m = state.menu;
    if (m.viewing === 'party') {
      drawPartyView(); return;
    }
    const anim = state.menuAnim;
    let kAnim = 1, animY = 0;
    if (anim) {
      kAnim = Math.max(0, Math.min(1, anim.t / anim.duration));
      animY = -(1 - kAnim) * 8;
    }
    ctx.fillStyle = 'rgba(8,12,20,' + (0.42 * kAnim).toFixed(3) + ')';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const w = 154, h = 144;
    const x = VIEW_W - w - 6, y = 8;
    let pushedAlpha = false;
    if (anim) {
      ctx.save();
      ctx.globalAlpha = kAnim;
      ctx.translate(0, animY);
      pushedAlpha = true;
    }
    state._drawMenuRestore = pushedAlpha;
    window.PR_UI.panel(ctx, x, y, w, h, {
      fill:'#f8f0d8', border:'#202020', shadow:'#c89048', highlight:'#fff8e8'
    });
    window.PR_UI.header(ctx, 'PAUSE MENU', x + 4, y + 4, w - 8, {
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
      const label = m.options[i] === 'ERA'
        ? 'ERA: ' + (ERA_ABBREV[state.settings && state.settings.graphics] || '?')
        : m.options[i];
      window.PR_UI.drawText(ctx, label, cx + 16, cy + 2, active ? '#1a0204' : '#202020');
    }
    // Currently equipped trinket (if any), shown beneath the menu list.
    const eq = state.player.equipment;
    const trinket = eq && eq.trinket;
    const tDef = trinket && window.PR_ITEMS && window.PR_ITEMS.byId(trinket);
    const gearText = 'GEAR ' + (tDef ? tDef.name.slice(0, 14).toUpperCase() : 'NONE');
    window.PR_UI.drawText(ctx, gearText, x + 8, y + h - 11, '#806040');
    if (m.flashTimer > 0) {
      m.flashTimer -= 1/60;
      window.PR_UI.panel(ctx, 40, 70, 160, 20, { fill:'#fff', border:'#202020' });
      window.PR_UI.drawText(ctx, m.flash, 50, 76, '#202020');
    }
    if (state._drawMenuRestore) { ctx.restore(); state._drawMenuRestore = false; }
  }

  function ensurePlayerStats() {
    if (!state.player.stats) state.player.stats = {};
    const s = state.player.stats;
    if (s.battlesWon === undefined) s.battlesWon = 0;
    if (s.catches === undefined) s.catches = 0;
    if (s.timePlayed === undefined) s.timePlayed = 0;
    // Backfill totalEarned with the player's current cash on first init
    // so brand-new saves and pre-update saves both start at a sensible
    // floor (the starter $500 + whatever they've banked since).
    if (s.totalEarned === undefined) s.totalEarned = (state.player.money | 0) || 0;
    if (s.trainerWins === undefined) s.trainerWins = 0;
    if (s.wildWins === undefined) s.wildWins = 0;
    if (s.encounters === undefined) s.encounters = 0;
    if (s.biggestReward === undefined) s.biggestReward = 0;
    if (s.lastWhiteoutMap === undefined) s.lastWhiteoutMap = '';
    if (!state.player.equipment) state.player.equipment = { trinket:null };
    if (state.player.equipment.trinket === undefined) state.player.equipment.trinket = null;
  }

  // Awards money + tracks lifetime totalEarned. Use this for any source
  // of currency (battle reward, quest reward, intro grant) so the
  // PROFILE page can show a meaningful "total earned" stat.
  function addMoney(state, n) {
    if (!Number.isFinite(n) || n <= 0) return;
    ensurePlayerStats();
    state.player.money = (state.player.money || 0) + (n | 0);
    state.player.stats.totalEarned = (state.player.stats.totalEarned || 0) + (n | 0);
    if ((n | 0) > (state.player.stats.biggestReward || 0)) {
      state.player.stats.biggestReward = (n | 0);
    }
    if (window.PR_ACHV && state.player.money >= 10000) {
      window.PR_ACHV.unlock(state, 'rich');
    }
  }
  state.addMoney = addMoney;

  function openProfile() {
    ensurePlayerStats();
    state.profileView = { page:0 };
    state.menu = null;
    state.mode = 'profile';
    window.PR_SFX && window.PR_SFX.play('confirm');
  }

  const PROFILE_PAGES = ['TRAINER PROFILE','BATTLES','JOURNEY','POKEDEX','STORY','TRAINER GEAR','TROPHIES','COVERAGE'];

  function updateProfile() {
    const I = window.PR_INPUT;
    const v = state.profileView || (state.profileView = { page:0 });
    if (I.consumePressed('ArrowRight') || I.consumePressed('z')) {
      v.page = (v.page + 1) % PROFILE_PAGES.length;
      window.PR_SFX && window.PR_SFX.play('select');
    }
    if (I.consumePressed('ArrowLeft')) {
      v.page = (v.page + PROFILE_PAGES.length - 1) % PROFILE_PAGES.length;
      window.PR_SFX && window.PR_SFX.play('select');
    }
    if (I.consumePressed('x') || I.consumePressed('Enter')) {
      state.profileView = null;
      openPauseMenu();
    }
  }

  // Helpers used by the profile renderer.
  function fmtTime(seconds) {
    seconds = Math.max(0, seconds | 0);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return h + 'h ' + (m < 10 ? '0' : '') + m + 'min';
    if (m > 0) return m + 'min ' + (s < 10 ? '0' : '') + s + 's';
    return s + 's';
  }
  function mapNameById(id) {
    const M = window.PR_MAPS && window.PR_MAPS.MAPS && window.PR_MAPS.MAPS[id];
    return (M && M.name) ? M.name.toUpperCase() : (id ? id.toUpperCase() : '-');
  }
  function typesCollectedCount(state) {
    const C = window.PR_DATA && window.PR_DATA.CREATURES;
    if (!C || !state.dex || !state.dex.caught) return 0;
    const seen = new Set();
    for (const sp of state.dex.caught) {
      const c = C[sp];
      if (c && c.types) for (const t of c.types) seen.add(t);
    }
    return seen.size;
  }
  // Map a chain key to its display label + cap (last-known step).
  const CHAIN_INFO = [
    ['rival', 'RIVAL', 8],
    ['apprentice', 'APPRENTICE', 8],
    ['journalist', 'JOURNALIST', 6],
    ['meek', 'MEEK', 6],
    ['oma', 'OMA', 6],
    ['economist', 'ECONOMIST', 6],
    ['tank', 'TANK', 3],
    ['nim', 'NIM', 3]
  ];

  function drawProfile() {
    ensurePlayerStats();
    ensureDex();
    const x = 6, y = 6, w = VIEW_W - 12, h = VIEW_H - 12;
    const v = state.profileView || { page:0 };
    const stats = state.player.stats || {};
    const flags = state.flags || {};
    const badges = (state.player.badges || []).length;
    const map = state.world && state.world.currentMap ? state.world.currentMap() : null;
    window.PR_UI.panel(ctx, x, y, w, h, { fill:'#f8f0d8', border:'#202020', shadow:'#c89048' });
    window.PR_UI.header(ctx, PROFILE_PAGES[v.page], x + 4, y + 4, w - 8,
      { fill:'#1a0204', line:'#f0c020', text:'#f0c020' });
    window.PR_UI.drawText(ctx, 'B:BACK  <>:PAGE', x + w - 96, y + 4, '#806040');
    // Page indicator dots.
    for (let i = 0; i < PROFILE_PAGES.length; i++) {
      ctx.fillStyle = i === v.page ? '#f0c020' : '#806040';
      ctx.fillRect(x + 8 + i * 6, y + 14, 4, 2);
    }
    // Page chips: name + money + badges shown on every page so the
    // trainer-card feel is consistent.
    window.PR_UI.chip(ctx, x + 8, y + 20, state.player.name || 'YOU', { fill:'#e8f0ff', border:'#385890' });
    window.PR_UI.chip(ctx, x + 66, y + 20, '$' + (state.player.money || 0), { fill:'#fff0c8', border:'#a86020' });
    window.PR_UI.chip(ctx, x + 130, y + 20, 'BDG ' + badges + '/8', { fill:'#e8ffe8', border:'#208830' });

    let rows = [];
    let footer = null;
    if (v.page === 0) {
      // TRAINER
      const ngPlus = (flags.ngPlusCount | 0);
      rows = [
        ['AREA', map ? map.name.toUpperCase().slice(0, 20) : (state.player.map || '?').toUpperCase()],
        ['PARTY', String((state.party || []).length) + '/6'],
        ['MONEY', '$' + (state.player.money || 0)],
        ['EARNED', '$' + (stats.totalEarned || 0)],
        ['SPENT', '$' + (flags.totalSpent || 0)],
        ['PLAY TIME', fmtTime(stats.timePlayed)],
        ['BADGES', String(badges) + '/8'],
        ['NG+ CYCLE', ngPlus > 0 ? ('x' + ngPlus + ' (+' + (ngPlus * 5) + ' LV)') : '-']
      ];
    } else if (v.page === 1) {
      // BATTLES
      const tb = flags.towerBest || {};
      const towerLine = ((tb.s5 | 0) + '/' + (tb.s10 | 0) + '/' + (tb.s15 | 0));
      rows = [
        ['BATTLES WON', String(stats.battlesWon || 0)],
        ['TRAINER WINS', String(stats.trainerWins || 0)],
        ['WILD WINS', String(stats.wildWins || 0)],
        ['ENCOUNTERS', String(stats.encounters || 0)],
        ['BIGGEST $', '$' + (stats.biggestReward || 0)],
        ['CATCHES', String(stats.catches || 0)],
        ['TOWER BEST', towerLine + ' (5/10/15)'],
        ['WHITEOUTS', String(flags.whiteouts || 0)]
      ];
    } else if (v.page === 2) {
      // JOURNEY
      const mapsVisited = flags.firstVisited ? Object.keys(flags.firstVisited).length : 0;
      rows = [
        ['STEPS', String(state.player.steps || 0)],
        ['MAPS SEEN', String(mapsVisited)],
        ['HIDDEN ITEMS', String(flags.totalHidden || 0)],
        ['EVOLUTIONS', String(flags.evolutions || 0)],
        ['MAX LEVEL', String(flags.maxPartyLevel || 0)],
        ['LAST WIPE', stats.lastWhiteoutMap ? mapNameById(stats.lastWhiteoutMap).slice(0, 18) : '-'],
        ['CURRENT MAP', map ? map.name.toUpperCase().slice(0, 20) : '-']
      ];
    } else if (v.page === 3) {
      // POKEDEX
      const total = Object.keys((window.PR_DATA && window.PR_DATA.CREATURES) || {}).length;
      const seen = state.dex.seen.size || 0;
      const caught = state.dex.caught.size || 0;
      const pct = total ? Math.floor((caught / total) * 100) : 0;
      // Count distinct species the player has caught at least one
      // shiny copy of (across party + every PC box).
      const shinySpecies = (function(){
        const set = new Set();
        for (const m of (state.party || [])) {
          if (m && m.shiny) set.add(m.species);
        }
        const boxes = state.box && state.box.boxes;
        if (Array.isArray(boxes)) {
          for (const box of boxes) for (const m of (box || [])) {
            if (m && m.shiny) set.add(m.species);
          }
        } else if (Array.isArray(state.box)) {
          for (const m of state.box) if (m && m.shiny) set.add(m.species);
        }
        return set.size;
      })();
      // Today's featured creature - its encounter rate triples in all
      // wild pools for the current calendar day. Hidden from the dex
      // detail until the player has at least seen the species.
      const featuredId = dailyFeaturedSpecies();
      const featuredSeen = featuredId && state.dex.seen && state.dex.seen.has(featuredId);
      const featuredSp = featuredId && window.PR_DATA.CREATURES[featuredId];
      const featuredLabel = featuredSeen && featuredSp
        ? featuredSp.name.toUpperCase()
        : '???';
      rows = [
        ['SEEN', String(seen) + '/' + total],
        ['CAUGHT', String(caught) + '/' + total],
        ['COMPLETION', String(pct) + '%'],
        ['SHINIES', String(shinySpecies)],
        ['TYPES', String(typesCollectedCount(state)) + '/18'],
        ['TODAY x3', featuredLabel],
        ['STARTERS EVO', String(flags.evolutions || 0)],
        ['LAST CAUGHT', (function(){
          if (!state.dex.caught || !state.dex.caught.size) return '-';
          const arr = Array.from(state.dex.caught);
          const id = arr[arr.length - 1];
          const sp = window.PR_DATA && window.PR_DATA.CREATURES[id];
          return (sp && sp.name && sp.name.toUpperCase()) || id;
        })()]
      ];
    } else if (v.page === 4) {
      // STORY
      const chains = (flags.chains || {});
      const enc = flags.encountersDone instanceof Set ? flags.encountersDone.size :
                  (Array.isArray(flags.encountersDone) ? flags.encountersDone.length : 0);
      rows = [['CUTSCENES', String(enc)]];
      for (const [key, label, cap] of CHAIN_INFO) {
        rows.push([label, String(chains[key] || 0) + '/' + cap]);
      }
      // Limit to 8 rows max so layout fits.
      rows = rows.slice(0, 8);
    } else if (v.page === 5) {
      // GEAR
      const eq = state.player.equipment || {};
      const trinket = eq.trinket && window.PR_ITEMS && window.PR_ITEMS.byId(eq.trinket);
      rows = [
        ['TRINKET', trinket ? trinket.name : 'NONE'],
        ['EFFECT', trinket && trinket.xpMult ? ('XP x' + trinket.xpMult.toFixed(2)) : 'NO WORN BONUS'],
        ['ROD BALL', String((state.player.bag && state.player.bag.rodball) || 0)],
        ['GREAT', String((state.player.bag && state.player.bag.greatball) || 0)],
        ['QUICK', String((state.player.bag && state.player.bag.quickball) || 0)],
        ['CAVERN', String((state.player.bag && state.player.bag.cavernball) || 0)],
        ['ULTRA', String((state.player.bag && state.player.bag.ultraball) || 0)]
      ];
      footer = 'Equip trainer gear from BAG.';
    } else if (v.page === 6) {
      // TROPHIES - achievement gallery. 18 entries in two columns; the
      // `rows` array is left empty so the standard label/value render
      // skips this page and we draw the grid inline below.
      if (window.PR_ACHV) window.PR_ACHV.ensure(state);
      const achv = (window.PR_ACHV && window.PR_ACHV.ACHIEVEMENTS) || [];
      const set = new Set(state.player.achievements || []);
      const pct = window.PR_ACHV ? window.PR_ACHV.percentUnlocked(state) : 0;
      window.PR_UI.drawText(ctx,
        String(set.size) + '/' + achv.length + '  (' + pct + '%)',
        x + 12, y + 42, '#385890');
      const half = Math.ceil(achv.length / 2);
      for (let i = 0; i < achv.length; i++) {
        const col = i < half ? 0 : 1;
        const row = i < half ? i : i - half;
        const cy = y + 56 + row * 11;
        const cx = x + 8 + col * ((w - 12) / 2);
        const unlocked = set.has(achv[i].id);
        const mark = unlocked ? '*' : '-';
        const color = unlocked ? '#208830' : '#806040';
        const name = unlocked ? achv[i].name : '???';
        window.PR_UI.drawText(ctx, mark + ' ' + name.slice(0, 16), cx, cy, color);
      }
      footer = 'A on a trophy you have for details.';
    } else {
      // COVERAGE - 18-type effectiveness grid for the current party.
      // For each defending type, find the max effectiveness any
      // damaging move in any party member's slot achieves. Sets
      // `rows = []` so the standard label/value render skips this
      // page; the grid is drawn inline. Helps the player spot
      // missing coverage at a glance.
      const types = window.PR_DATA.TYPES;
      const cov = {};
      for (const t of types) cov[t] = 0;
      for (const mon of (state.party || [])) {
        if (!mon || mon.hp === 0) continue;
        const moves = mon.moves || [];
        for (const m of moves) {
          const def = window.PR_DATA.MOVES[m.id];
          if (!def || def.kind === 'status' || (def.power | 0) === 0) continue;
          for (const dt of types) {
            const e = window.PR_DATA.effectiveness(def.type, [dt]);
            if (e > cov[dt]) cov[dt] = e;
          }
        }
      }
      const counts = { strong:0, weak:0, none:0 };
      for (const t of types) {
        if (cov[t] >= 2) counts.strong++;
        else if (cov[t] === 0) counts.none++;
        else if (cov[t] < 1) counts.weak++;
      }
      window.PR_UI.drawText(ctx,
        counts.strong + ' STRONG  ' + counts.weak + ' WEAK  ' + counts.none + ' NONE',
        x + 12, y + 42, '#385890');
      // 6 columns x 3 rows. Cell label = first 4 chars of type name +
      // a coverage tag.
      const COLS = 6, ROWS = 3;
      const cellW = ((w - 16) / COLS) | 0;
      for (let i = 0; i < types.length; i++) {
        const col = i % COLS;
        const row = (i / COLS) | 0;
        const cx = x + 8 + col * cellW;
        const cy = y + 58 + row * 14;
        const e = cov[types[i]];
        let color, tag;
        if (e >= 4)       { color = '#208830'; tag = '++'; }
        else if (e >= 2)  { color = '#388838'; tag = '+';  }
        else if (e === 0) { color = '#a06030'; tag = 'X';  }
        else if (e < 1)   { color = '#a08040'; tag = '-';  }
        else              { color = '#606060'; tag = '.';  }
        window.PR_UI.drawText(ctx, types[i].slice(0, 4), cx, cy, color);
        window.PR_UI.drawText(ctx, tag, cx + 26, cy, color);
      }
      footer = '++ x4  + x2  . x1  - resist  X immune';
    }
    for (let i = 0; i < rows.length; i++) {
      const cy = y + 42 + i * 13;
      window.PR_UI.selectBar(ctx, x + 8, cy - 2, w - 16, 12, false);
      window.PR_UI.drawText(ctx, rows[i][0], x + 12, cy, '#385890');
      window.PR_UI.drawText(ctx, String(rows[i][1]).slice(0, 22), x + 90, cy, '#202020');
    }
    if (footer) window.PR_UI.drawText(ctx, footer, x + 12, y + h - 12, '#806040');
  }
  // ---------- Settings ----------
  const SETTINGS_DEFAULTS = {
    graphics: 'ds_diamond',
    sfxVol: 'med',     // off | low | med | high
    musicVol: 'med',
    textSpeed: 'normal', // slow | normal | fast
    difficulty: 'normal', // easy | normal | hard
    reducedMotion: false,
    colorblind: false,
    dayNightCycle: true,
    mute: false,
    // DS-only visual toggles. tilt3d controls the billboard-tilt and
    // drop-shadow perspective on movable sprites; tiltShift controls
    // the top/bottom blur strips that fake depth-of-field. Both
    // default off; player opts in for the perspective look.
    tilt3d: false,
    tiltShift: false,
    // Foliage horizontal-sway animation (trees / bushes / grass).
    // Off by default - some players find the constant 1-px wobble
    // distracting on long sessions.
    treeSway: false
  };
  const VOL_STEPS = ['off','low','med','high'];
  const VOL_VALUES = { off:0, low:0.25, med:0.55, high:1.0 };
  const TEXT_SPEED_STEPS = ['slow','normal','fast'];
  const DIFFICULTY_STEPS = ['easy','normal','hard'];
  // Per-difficulty knobs: XP gain, money gain (battle reward), trainer
  // team level offset, wild trainer level offset. easy is the "this is
  // for kids / I'm here for the story" mode; hard is the "I want a
  // little crunch" mode. nuzlocke deferred to a follow-up PR.
  const DIFFICULTY = {
    easy:   { xpMult: 1.25, moneyMult: 1.0,  trainerLvDelta: -2 },
    normal: { xpMult: 1.0,  moneyMult: 1.0,  trainerLvDelta: 0  },
    hard:   { xpMult: 0.85, moneyMult: 1.0,  trainerLvDelta: +3 }
  };
  const GRAPHICS_STEPS = ['gb_red','gb_pocket','gbc_yellow','gba_firered','ds_diamond'];
  const GRAPHICS_LABELS = {
    gb_red: 'GB RED',
    gb_pocket: 'GB POCKET',
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
    if (DIFFICULTY_STEPS.indexOf(state.settings.difficulty) === -1) state.settings.difficulty = SETTINGS_DEFAULTS.difficulty;
    // First-boot reconciliation: if state.settings.mute hasn't been
    // explicitly set yet, mirror the live audio state so a player who
    // muted before this setting existed isn't surprised on reload.
    if (typeof state.settings.mute !== 'boolean') {
      const A = window.PR_AUDIO;
      state.settings.mute = !!(A && A.isMuted && A.isMuted());
    }
  }

  function applySettings() {
    ensureSettings();
    const A = window.PR_AUDIO && window.PR_AUDIO._internal;
    if (A) {
      if (A.sfxGain)   A.sfxGain.gain.value   = VOL_VALUES[state.settings.sfxVol];
      if (A.musicGain) A.musicGain.gain.value = VOL_VALUES[state.settings.musicVol] * 0.6;
    }
    if (window.PR_AUDIO && window.PR_AUDIO.setMuted) {
      window.PR_AUDIO.setMuted(!!state.settings.mute);
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
    startMenuAnim();
    window.PR_SFX && window.PR_SFX.play('confirm');
  }

  // GRAPHICS / era now lives on the START menu as a one-tap toggle -
  // see the 'ERA' option below. Settings keeps audio + accessibility.
  const SETTINGS_ROWS = [
    { key:'mute',          label:'MUTE',           type:'bool' },
    { key:'sfxVol',        label:'SFX VOLUME',     type:'enum', steps:VOL_STEPS },
    { key:'musicVol',      label:'MUSIC VOLUME',   type:'enum', steps:VOL_STEPS },
    { key:'textSpeed',     label:'TEXT SPEED',     type:'enum', steps:TEXT_SPEED_STEPS },
    { key:'difficulty',    label:'DIFFICULTY',     type:'enum', steps:DIFFICULTY_STEPS },
    { key:'reducedMotion', label:'REDUCED MOTION', type:'bool' },
    { key:'colorblind',    label:'COLOR-BLIND',    type:'bool' },
    { key:'dayNightCycle', label:'DAY/NIGHT',      type:'bool' },
    { key:'tilt3d',        label:'DS 3D EFFECT',   type:'bool' },
    { key:'tiltShift',     label:'DS TILT-SHIFT',  type:'bool' },
    { key:'treeSway',      label:'TREE SWAY',      type:'bool' }
  ];

  // 7 rows comfortably fit between the header strip and the footer hint
  // in the 160px viewport. The list scrolls when SETTINGS_ROWS grows
  // past this number.
  const SETTINGS_VISIBLE = 7;

  function updateSettings() {
    const I = window.PR_INPUT;
    const v = state.settingsView;
    if (v.scroll === undefined) v.scroll = 0;
    if (I.consumePressed('ArrowDown')) { v.idx = (v.idx + 1) % SETTINGS_ROWS.length; window.PR_SFX && window.PR_SFX.play('select'); }
    if (I.consumePressed('ArrowUp'))   { v.idx = (v.idx + SETTINGS_ROWS.length - 1) % SETTINGS_ROWS.length; window.PR_SFX && window.PR_SFX.play('select'); }
    // Keep the cursor inside the visible window. Wrap-around (idx jumped
    // from last to first) is handled by clamping scroll to the cursor.
    if (v.idx < v.scroll) v.scroll = v.idx;
    if (v.idx >= v.scroll + SETTINGS_VISIBLE) v.scroll = v.idx - SETTINGS_VISIBLE + 1;
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
    const anim = state.menuAnim;
    let pushed = false;
    if (anim) {
      const k = Math.max(0, Math.min(1, anim.t / anim.duration));
      ctx.save();
      ctx.globalAlpha = k;
      ctx.translate(0, -(1 - k) * 8);
      pushed = true;
    }
    window.PR_UI.panel(ctx, x, y, w, h, { fill:'#f8f0d8', border:'#202020', shadow:'#c89048' });
    window.PR_UI.header(ctx, 'SETTINGS', x + 4, y + 4, w - 8, { fill:'#1a0204', line:'#f0c020', text:'#f0c020' });
    window.PR_UI.drawText(ctx, 'B:BACK', x + w - 38, y + 4, '#806040');
    const v = state.settingsView;
    if (v.scroll === undefined) v.scroll = 0;
    const start = v.scroll;
    const end = Math.min(SETTINGS_ROWS.length, start + SETTINGS_VISIBLE);
    for (let i = start; i < end; i++) {
      const row = SETTINGS_ROWS[i];
      const cy = y + 22 + (i - start) * 16;
      if (i === v.idx) window.PR_UI.selectBar(ctx, x + 6, cy - 2, w - 12, 12, true);
      window.PR_UI.drawText(ctx, row.label, x + 12, cy, '#202020');
      let val;
      if (row.type === 'bool') val = state.settings[row.key] ? 'ON' : 'OFF';
      else val = (row.labels && row.labels[state.settings[row.key]]) || (state.settings[row.key] || '').toUpperCase();
      window.PR_UI.drawText(ctx, '< ' + val + ' >', x + w - 92, cy, '#385890');
    }
    // Scroll indicators (small triangles) shown when more content sits
    // above or below the visible window.
    if (start > 0) {
      ctx.fillStyle = '#806040';
      ctx.fillRect(x + w - 14, y + 20, 5, 1);
      ctx.fillRect(x + w - 13, y + 19, 3, 1);
      ctx.fillRect(x + w - 12, y + 18, 1, 1);
    }
    if (end < SETTINGS_ROWS.length) {
      ctx.fillStyle = '#806040';
      const by = y + 22 + SETTINGS_VISIBLE * 16 - 4;
      ctx.fillRect(x + w - 14, by, 5, 1);
      ctx.fillRect(x + w - 13, by + 1, 3, 1);
      ctx.fillRect(x + w - 12, by + 2, 1, 1);
    }
    window.PR_UI.drawText(ctx, 'A/RIGHT: NEXT  LEFT: PREV', x + 8, y + h - 12, '#806040');
    if (pushed) ctx.restore();
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
    state.questsView = { idx: 0, filter: 'all', sort: 'status' };
    state.mode = 'quests';
    window.PR_SFX && window.PR_SFX.play('confirm');
  }
  const QUEST_FILTERS = ['all', 'active', 'ready', 'done'];
  const QUEST_SORTS   = ['status', 'name', 'cat'];
  function viewedQuestList() {
    const v = state.questsView;
    const all = window.PR_QUESTS ? window.PR_QUESTS.list(state) : [];
    const filtered = v.filter === 'all'
      ? all.slice()
      : all.filter(e => e.status === v.filter);
    const statusRank = (e) => e.status === 'ready' ? 0
                            : e.status === 'active' ? 1
                            : e.status === 'done' ? 2 : 3;
    const sortFns = {
      status: (a, b) => statusRank(a) - statusRank(b),
      name:   (a, b) => a.def.name.localeCompare(b.def.name),
      cat:    (a, b) => String(a.def.category || '').localeCompare(String(b.def.category || ''))
    };
    filtered.sort(sortFns[v.sort] || sortFns.status);
    return filtered;
  }
  function updateQuests() {
    const I = window.PR_INPUT;
    const v = state.questsView;
    const list = viewedQuestList();
    // Detail mode: A on a quest opens detail; B returns to list.
    if (v.detail) {
      if (I.consumePressed('x') || I.consumePressed('ArrowLeft')) {
        v.detail = null;
        window.PR_SFX && window.PR_SFX.play('select');
      }
      return;
    }
    if (I.consumePressed('ArrowDown') && list.length) {
      v.idx = (v.idx + 1) % list.length;
      window.PR_SFX && window.PR_SFX.play('select');
    }
    if (I.consumePressed('ArrowUp')   && list.length) {
      v.idx = (v.idx + list.length - 1) % list.length;
      window.PR_SFX && window.PR_SFX.play('select');
    }
    if (I.consumePressed('Shift')) {
      v.filter = QUEST_FILTERS[(QUEST_FILTERS.indexOf(v.filter) + 1) % QUEST_FILTERS.length];
      v.idx = 0;
      window.PR_SFX && window.PR_SFX.play('select');
    }
    if (I.consumePressed('Enter')) {
      v.sort = QUEST_SORTS[(QUEST_SORTS.indexOf(v.sort) + 1) % QUEST_SORTS.length];
      v.idx = 0;
      window.PR_SFX && window.PR_SFX.play('select');
    }
    if ((I.consumePressed('z')) && list.length) {
      v.detail = list[v.idx].def.id;
      window.PR_SFX && window.PR_SFX.play('confirm');
    }
    if (I.consumePressed('x')) { state.questsView = null; state.mode = 'menu'; }
  }
  function drawQuests() {
    const x = 6, y = 6, w = VIEW_W - 12, h = VIEW_H - 12;
    window.PR_UI.panel(ctx, x, y, w, h, { fill:'#f8f0d8', border:'#202020', shadow:'#c89048' });
    const v = state.questsView;
    if (v && v.detail) { drawQuestDetail(x, y, w, h, v.detail); return; }
    window.PR_UI.header(ctx, 'QUESTS', x + 4, y + 4, w - 8, { fill:'#1a0204', line:'#f0c020', text:'#f0c020' });
    const counts = window.PR_QUESTS ? window.PR_QUESTS.counts(state) : { active:0, ready:0, done:0, total:0 };
    window.PR_UI.drawText(ctx,
      'A:VIEW B:BACK',
      x + w - 76, y + 4, '#806040');
    window.PR_UI.drawText(ctx,
      counts.active + ' active  ' + counts.ready + ' ready  ' + counts.done + ' done',
      x + 8, y + 16, '#806040');
    const ordered = viewedQuestList();
    if (!ordered.length) {
      const empty = v.filter === 'all' ? 'No quests yet.' : 'No quests in this filter.';
      window.PR_UI.drawText(ctx, empty, x + 8, y + 30, '#806040');
      window.PR_UI.drawText(ctx,
        'SEL:' + v.filter.toUpperCase() + '  START:' + v.sort.toUpperCase(),
        x + 8, y + h - 12, '#806040');
      return;
    }
    // Update v.idx if it points outside the (re-sorted) list.
    if (v.idx >= ordered.length) v.idx = 0;
    // Window the list to 6 visible rows. Each row is two text lines
    // (name + desc) with the selectBar sized to ONLY cover the name
    // so the gray description below sits cleanly outside the highlight.
    const rows = 6;
    const rowH = 18;
    const start = Math.max(0, Math.min(ordered.length - rows, v.idx - 3));
    for (let r = 0; r < rows; r++) {
      const i = start + r;
      if (i >= ordered.length) break;
      const e = ordered[i];
      const cy = y + 28 + r * rowH;
      if (i === v.idx) window.PR_UI.selectBar(ctx, x + 4, cy - 2, w - 8, 11, true);
      const statusMark = e.status === 'done' ? '*' :
                        e.status === 'ready' ? '!' : '.';
      const statusColor = e.status === 'done' ? '#208830' :
                          e.status === 'ready' ? '#c84020' : '#202020';
      window.PR_UI.drawText(ctx, statusMark + ' ' + e.def.name.slice(0, 24), x + 8, cy, statusColor);
      window.PR_UI.drawText(ctx, e.def.desc.slice(0, 36), x + 8, cy + 9, '#806040');
    }
    window.PR_UI.drawText(ctx,
      'SEL:' + v.filter.toUpperCase() + '  START:' + v.sort.toUpperCase(),
      x + 8, y + h - 12, '#806040');
  }

  // Detail view for a single quest. Pressed via A from the list.
  function drawQuestDetail(x, y, w, h, questId) {
    const def = window.PR_QUESTS && window.PR_QUESTS.QUESTS[questId];
    if (!def) {
      window.PR_UI.drawText(ctx, 'Missing quest.', x + 8, y + 30, '#a02020');
      return;
    }
    const s = state.quests[questId] || {};
    window.PR_UI.header(ctx, def.name.slice(0, 24), x + 4, y + 4, w - 8, { fill:'#1a0204', line:'#f0c020', text:'#f0c020' });
    window.PR_UI.drawText(ctx, 'B:BACK', x + w - 38, y + 4, '#806040');

    let cy = y + 20;
    const statusLabel = s.status === 'done' ? 'COMPLETE' :
                        s.status === 'ready' ? 'READY TO TURN IN' :
                        s.status === 'active' ? 'IN PROGRESS' : 'NOT STARTED';
    const statusColor = s.status === 'done' ? '#208830' :
                        s.status === 'ready' ? '#c84020' : '#385890';
    window.PR_UI.drawText(ctx, 'STATUS:', x + 8, cy, '#385890');
    window.PR_UI.drawText(ctx, statusLabel, x + 64, cy, statusColor);
    cy += 12;
    if (def.giver) {
      const giver = (window.PR_STORY && window.PR_STORY.findCharacter && window.PR_STORY.findCharacter(def.giver));
      const giverName = giver ? giver.name : def.giver.toUpperCase();
      const giverMap = giver && giver.home && window.PR_MAPS && window.PR_MAPS.MAPS[giver.home.map];
      const at = giverMap ? giverMap.name.toUpperCase() : (giver && giver.home ? giver.home.map : '');
      window.PR_UI.drawText(ctx, 'FROM:', x + 8, cy, '#385890');
      window.PR_UI.drawText(ctx, (giverName + (at ? ' @ ' + at : '')).slice(0, 32), x + 64, cy, '#202020');
      cy += 12;
    }
    cy += 4;
    // Long description: wrap each paragraph to 36 chars.
    const paras = Array.isArray(def.longDesc) && def.longDesc.length ? def.longDesc : [def.desc || ''];
    for (const p of paras) {
      const lines = window.PR_UI.wrap(p, 36);
      for (const line of lines) {
        if (cy > y + h - 50) break;
        window.PR_UI.drawText(ctx, line, x + 8, cy, '#202020');
        cy += 10;
      }
      cy += 2;
    }
    // Progress + reward + hint footer.
    const rewardText = def.reward ? ((def.reward.count || 1) + 'x ' + (window.PR_ITEMS && window.PR_ITEMS.ITEMS[def.reward.item] ? window.PR_ITEMS.ITEMS[def.reward.item].name : def.reward.item)) : 'NONE';
    let progressText = '';
    if (s.status !== 'done' && def.progressFn) {
      try { progressText = def.progressFn(state); } catch (_) { progressText = '...'; }
    } else if (s.status === 'done') {
      progressText = 'DONE';
    }
    const footY = y + h - 36;
    window.PR_UI.drawText(ctx, 'PROGRESS:', x + 8, footY, '#385890');
    window.PR_UI.drawText(ctx, String(progressText).slice(0, 28), x + 76, footY, '#202020');
    window.PR_UI.drawText(ctx, 'REWARD:',   x + 8, footY + 12, '#385890');
    window.PR_UI.drawText(ctx, rewardText.slice(0, 28), x + 76, footY + 12, '#202020');
    if (def.hint) {
      window.PR_UI.drawText(ctx, def.hint.slice(0, 36), x + 8, footY + 24, '#806040');
    }
  }

  function tickQuests(triggerName) {
    if (!window.PR_QUESTS) return;
    const completed = window.PR_QUESTS.tick(state);
    for (const c of completed) {
      // tick() returns { def, status:'done'|'ready' }. For 'done', the
      // quests module already added the reward to the bag - we just
      // announce. For 'ready' the reward is held until the player turns
      // in to the giver, so we just flash a hint.
      const def = c.def || c; // tolerate older shape
      window.PR_SFX && window.PR_SFX.play('levelup');
      if (c.status === 'ready') {
        showFlash('READY: ' + def.name);
        const giverName = (window.PR_STORY && window.PR_STORY.findCharacter && def.giver
          && window.PR_STORY.findCharacter(def.giver) || {}).name;
        const lines = ['QUEST READY: ' + def.name];
        if (giverName) lines.push('Talk to ' + giverName + ' to turn in.');
        openDialog(lines, () => window.PR_SAVE.save && window.PR_SAVE.save(state));
      } else {
        const rewardName = def.reward && window.PR_ITEMS && window.PR_ITEMS.ITEMS[def.reward.item]
          ? window.PR_ITEMS.ITEMS[def.reward.item].name : '';
        const lines = ['QUEST CLEARED: ' + def.name];
        if (rewardName) lines.push('Got ' + (def.reward.count || 1) + ' ' + rewardName + '!');
        openDialog(lines, () => window.PR_SAVE.save && window.PR_SAVE.save(state));
      }
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
    if (!v.releaseSelected) v.releaseSelected = {};
    const list = v.side === 'box' ? state.box : state.party;
    if (I.consumePressed('ArrowDown')) { if (list.length) v.idx = (v.idx + 1) % list.length; }
    if (I.consumePressed('ArrowUp'))   { if (list.length) v.idx = (v.idx + list.length - 1) % list.length; }
    if (I.consumePressed('ArrowRight') || I.consumePressed('ArrowLeft')) {
      v.side = v.side === 'box' ? 'party' : 'box';
      v.idx = 0;
      window.PR_SFX && window.PR_SFX.play('select');
    }
    // SELECT toggles release mode. Only meaningful on the BOX side;
    // forces side='box' so the marks the player makes are unambiguous.
    if (I.consumePressed('Shift')) {
      v.releaseMode = !v.releaseMode;
      v.releaseSelected = {};
      if (v.releaseMode) { v.side = 'box'; v.idx = 0; }
      window.PR_SFX && window.PR_SFX.play('select');
    }
    if (I.consumePressed('x')) {
      if (v.releaseMode) {
        v.releaseMode = false;
        v.releaseSelected = {};
        return;
      }
      state.boxView = null;
      state.mode = 'menu';
      return;
    }
    if (v.releaseMode) {
      // A toggles the selected box mon. START confirms + commits the
      // release. Party side is ignored.
      if (v.side === 'box' && I.consumePressed('z')) {
        if (state.box[v.idx]) {
          v.releaseSelected[v.idx] = !v.releaseSelected[v.idx];
          window.PR_SFX && window.PR_SFX.play('select');
        }
      }
      if (I.consumePressed('Enter')) {
        const idxs = Object.keys(v.releaseSelected)
          .map(k => +k)
          .filter(k => v.releaseSelected[k] && state.box[k])
          .sort((a, b) => b - a);
        if (!idxs.length) { showFlash('NOTHING SELECTED'); return; }
        let ok = true;
        try {
          if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
            ok = window.confirm('Release ' + idxs.length + ' creature' + (idxs.length === 1 ? '' : 's') + '? This cannot be undone.');
          }
        } catch (_) { /* default ok stays true */ }
        if (!ok) return;
        const names = [];
        for (const i of idxs) {
          const mon = state.box.splice(i, 1)[0];
          if (mon) names.push(mon.nickname);
        }
        showFlash('Released ' + names.length);
        v.releaseSelected = {};
        v.idx = Math.max(0, Math.min(v.idx, state.box.length - 1));
        window.PR_SAVE.save && window.PR_SAVE.save(state);
      }
      return;
    }
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
    const v = state.boxView;
    const x = 6, y = 6, w = VIEW_W - 12, h = VIEW_H - 12;
    window.PR_UI.panel(ctx, x, y, w, h, { fill:'#f8f0d8', border:'#202020', shadow:'#c89048' });
    const headerText = v && v.releaseMode ? 'PC STORAGE - RELEASE MODE' : 'PC STORAGE';
    window.PR_UI.header(ctx, headerText, x + 4, y + 4, w - 8,
      { fill:'#1a0204', line:'#f0c020', text:'#f0c020' });
    window.PR_UI.drawText(ctx, 'B:BACK  <>SIDE', x + w - 86, y + 4, '#806040');

    // Two columns: BOX | PARTY
    const colW = (w - 16) / 2;
    const drawList = (label, list, sx, isActive, isBox) => {
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
          // Release-mode mark: a red [X] tag next to the level for any
          // box mon the player has flagged for release.
          if (isBox && v.releaseMode && v.releaseSelected && v.releaseSelected[i]) {
            window.PR_UI.drawText(ctx, '[X]', sx + colW - 38, cy, '#c83020');
            window.PR_UI.drawText(ctx, 'L' + mon.level, sx + colW - 18, cy, '#c83020');
          } else {
            window.PR_UI.drawText(ctx, 'L' + mon.level, sx + colW - 18, cy, '#202020');
          }
        }
      }
      if (!list.length) window.PR_UI.drawText(ctx, '(empty)', sx + 4, y + 32, '#806040');
      else if (list.length > rows) window.PR_UI.drawText(ctx, (start + 1) + '-' + Math.min(start + rows, list.length), sx + colW - 28, y + 16, '#806040');
    };
    drawList('BOX',   state.box,   x + 6,           v && v.side === 'box',  true);
    drawList('PARTY', state.party, x + 12 + colW,   v && v.side === 'party', false);
    if (v && v.releaseMode) {
      const n = Object.keys(v.releaseSelected || {}).filter(k => v.releaseSelected[k]).length;
      window.PR_UI.drawText(ctx,
        'A: MARK  START: RELEASE (' + n + ')  SEL: EXIT',
        x + 8, y + h - 12, n > 0 ? '#c83020' : '#806040');
    } else {
      window.PR_UI.drawText(ctx, 'A: MOVE   SEL: RELEASE MODE', x + 8, y + h - 12, '#806040');
    }
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
      // Repel: no target, no party prompt. Activates immediately and
      // adds to the active step counter (stacks if used while already
      // active). Returns to the overworld so the player can see the
      // HUD timer start.
      if (def.kind === 'repel') {
        state.player.repelSteps = (state.player.repelSteps || 0) + (def.steps || 100);
        state.player.repelKind = def.id;
        window.PR_ITEMS.take(state, it.id, 1);
        window.PR_SFX && window.PR_SFX.play('confirm');
        showFlash(def.name + ' active!');
        state.bagView = null;
        state.mode = 'overworld';
        if (window.PR_SAVE && window.PR_SAVE.save) window.PR_SAVE.save(state);
        return;
      }
      // Bicycle: toggle riding state. Each step on bike takes half
      // the time. Auto-stows when surfing or indoors (handled in
      // world.js). Doesn't consume the item.
      if (def.id === 'bicycle') {
        const m = state.world && state.world.currentMap && state.world.currentMap();
        if (m && m.interior) { showFlash("Can't ride inside."); return; }
        if (state.player.surfing) { showFlash("Can't ride while surfing."); return; }
        state.player.onBike = !state.player.onBike;
        window.PR_SFX && window.PR_SFX.play('confirm');
        showFlash(state.player.onBike ? 'Hopped on the BIKE.' : 'Stowed the BIKE.');
        state.bagView = null;
        state.mode = 'overworld';
        return;
      }
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
    // Grandfather the OLD ROD into older saves so fishing is reachable
    // even for players who started before A=fish/B=surf existed.
    if (state.player.bag && !state.player.bag.old_rod) state.player.bag.old_rod = 1;
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
    const seen = state.dex.seen.has(selId);

    // Sprite + header strip. Sprite is 24px so name/dex/types fit beside it.
    // Seen reveals the full image; only unseen species stay silhouettes.
    const spriteSize = 24;
    const spriteX = dx + 4, spriteY = dy + 4;
    if (seen) {
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

    // Evolution chain renders above the caught gate so SEEN species
    // already reveal their evolution requirements. Mini sprites use
    // the seen gate (a creature can only show in the chain as a real
    // sprite if it itself has been seen).
    const chain = dexEvolutionChain(selId);
    const evoY = divY + 10;
    window.PR_UI.drawText(ctx, 'EVO', dx + 4, evoY, '#385890');
    const evoSize = 14;
    let ex = dx + 22;
    const ey = evoY - 4;
    if (chain.length <= 1) {
      window.PR_UI.drawText(ctx, '(none)', ex, evoY, '#806040');
    } else {
      for (let i = 0; i < chain.length; i++) {
        const id = chain[i];
        const isSeenStage = state.dex.seen.has(id);
        if (isSeenStage) {
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

    if (!caught) {
      window.PR_UI.drawText(ctx, 'Catch for stats + moves.', dx + 4, evoY + 16, '#806040');
      return;
    }

    // Stats: 2 rows of 3. Compact spacing. Pushed below the EVO row.
    const stY = evoY + 18;
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

    // Moves: 4 levels visible. Show first 4 entries - these are the
    // earliest learns and the ones a wild encounter is most likely to
    // know. A "(+N)" hint indicates if there are more.
    const learn = sp.learnset || [];
    const visible = learn.slice(0, 4);
    // Stats take 2 rows of 9 px; MOVES sits below them.
    const moveY = stY + 2 * 9 + 4;
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
  // Layout note: positions reflect actual on-foot exit directions per
  // each town's `edges` block in maps.js. The 8-town main loop has 6
  // souths + 2 easts (net 6S+2E displacement) so a closed axis-aligned
  // polygon is impossible. We stack the 6 south edges as a vertical
  // column on x=170, drop east to desert at the bottom, and close back
  // up to rodport via a long L-shape (drawn in drawWorldLink). Spurs
  // attach axis-aligned to their parent's correct side.
  const WORLD_NODES = [
    // Main loop: vertical column going south (axis-aligned).
    { id:'rodport',    name:'RODPORT',    short:'ROD', kind:'TOWN',  x:170, y:30,  color:'#60b870', spawn:{x:8,  y:9,  dir:'down'} },
    { id:'brindale',   name:'BRINDALE',   short:'BRI', kind:'TOWN',  x:170, y:55,  color:'#80c878', spawn:{x:22, y:17, dir:'down'} },
    { id:'woodfall',   name:'WOODFALL',   short:'WDF', kind:'TOWN',  x:170, y:80,  color:'#50a860', spawn:{x:22, y:17, dir:'down'} },
    { id:'crestrock',  name:'CRESTROCK',  short:'CRG', kind:'TOWN',  x:170, y:105, color:'#a89870', spawn:{x:22, y:17, dir:'down'} },
    { id:'frostmere',  name:'FROSTMERE',  short:'FRS', kind:'TOWN',  x:170, y:130, color:'#98d8e8', spawn:{x:22, y:17, dir:'down'} },
    { id:'harborside', name:'HARBORSIDE', short:'HBR', kind:'TOWN',  x:170, y:155, color:'#58a8d8', spawn:{x:22, y:17, dir:'down'} },
    { id:'summitvale', name:'SUMMITVALE', short:'SMT', kind:'TOWN',  x:170, y:180, color:'#d88858', spawn:{x:22, y:17, dir:'down'} },
    // Bottom east stub: summitvale exits east to desert.
    { id:'desert',     name:'DESERT',     short:'DST', kind:'LOOP',  x:200, y:180, color:'#d8a850', spawn:{x:6,  y:20, dir:'right'} },
    // Eastern spurs (each parent town exits east to its spur).
    { id:'mountain',   name:'HIGHSPIRE',  short:'HI',  kind:'SPUR',  x:200, y:105, color:'#a8b8d8', spawn:{x:6,  y:20, dir:'right'} },
    { id:'beach',      name:'BEACH',      short:'BCH', kind:'SPUR',  x:200, y:155, color:'#f0d070', spawn:{x:7,  y:20, dir:'right'} },
    // Pokerod farm sits east of mountain (matches farm.west -> mountain).
    { id:'pokerod_farm',           name:'POKEROD FARM',short:'FRM', kind:'SPUR', x:225, y:105, color:'#a8d860', spawn:{x:1,  y:18, dir:'right'} },
    // POI zones: door entries (no canonical compass), placed on the
    // open WEST side of their parent town.
    { id:'pokerod_amusement_park', name:'AMUSEMENT',   short:'AMU', kind:'TOWN', x:140, y:55,  color:'#f070a0', spawn:{x:14, y:18, dir:'down'} },
    { id:'pokerod_castle',         name:'CASTLE',      short:'CTL', kind:'TOWN', x:140, y:80,  color:'#a08070', spawn:{x:14, y:18, dir:'down'} },
    { id:'pokerod_casino',         name:'CASINO',      short:'CSO', kind:'SPUR', x:140, y:155, color:'#7050a0', spawn:{x:14, y:18, dir:'down'} }
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
    { a:'harborside', b:'beach',   label:'BEACH PATH',   color:'#e0c860', spur:true },
    // New zone + farm links.
    { a:'mountain', b:'pokerod_farm', label:'FARM LANE',   color:'#a8d860', spur:true },
    { a:'brindale', b:'pokerod_amusement_park', label:'PARK ROAD', color:'#f070a0', spur:true },
    { a:'woodfall', b:'pokerod_castle', label:'KEEP TRAIL', color:'#a08070', spur:true },
    { a:'harborside', b:'pokerod_casino', label:'CASINO LANE', color:'#7050a0', spur:true }
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
    mountain:'mountain', beach:'beach', desert:'desert', desert_ruins:'desert',
    pokerod_farm:'pokerod_farm',
    pokerod_amusement_park:'pokerod_amusement_park',
    pokerod_castle:'pokerod_castle',
    pokerod_casino:'pokerod_casino'
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
    },
    pokerod_farm: {
      icon:'forest', tag:'PARTNER PASTURE',
      detail:'Two of every type, all fed by dawn light.'
    },
    pokerod_amusement_park: {
      icon:'beach', tag:'CARNIVAL ROW',
      detail:'Calliopes, cotton candy, balloons galore.'
    },
    pokerod_castle: {
      icon:'stone', tag:'OLD KEEP',
      detail:'Banners snap above a moat of clear water.'
    },
    pokerod_casino: {
      icon:'harbor', tag:'NEON STRIP',
      detail:'Chips clatter, jackpots blink, drinks flow.'
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
      // SELECT in the overworld opens the world map directly without
      // setting state.menu. Returning to 'menu' in that case would
      // crash drawMenu on a null state.menu. Pick the right mode by
      // whether the pause menu was the entry point.
      state.mode = state.menu ? 'menu' : 'overworld';
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
      // Fast travel gate: need at least 1 badge (the "Fly" unlock) and
      // the destination must have been visited at least once. Otherwise
      // the warp is denied with a flash message - the map stays open so
      // the player can pick a different town.
      const badges = (state.player.badges || []).length;
      if (badges < 1) {
        showFlash('NEED A BADGE TO FLY!');
        window.PR_SFX && window.PR_SFX.play('error');
        return;
      }
      if (!isWorldNodeVisited(state, target)) {
        showFlash("HAVEN'T BEEN THERE YET!");
        window.PR_SFX && window.PR_SFX.play('error');
        return;
      }
      warpTo(target);
    }
  }
  // Themed POI zones don't have walk-in doors from their parent town
  // (their decoration layout is the whole point), so we treat them as
  // always-reachable on the world map. The badge gate still applies.
  const ALWAYS_REACHABLE = new Set([
    'pokerod_farm',
    'pokerod_amusement_park',
    'pokerod_castle',
    'pokerod_casino'
  ]);
  function isWorldNodeVisited(state, node) {
    if (!node) return false;
    if (ALWAYS_REACHABLE.has(node.id)) return true;
    const fv = state.flags && state.flags.firstVisited;
    if (!fv) return false;
    if (fv[node.id]) return true;
    // A town also counts as visited if any of its interior maps has
    // been visited (the player has stepped into the town one way or
    // another). WORLD_MAP_HINTS maps interior map ids -> town id.
    for (const k of Object.keys(WORLD_MAP_HINTS)) {
      if (WORLD_MAP_HINTS[k] === node.id && fv[k]) return true;
    }
    return false;
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
    const badges = (state.player.badges || []).length;
    const canFly = badges >= 1;
    for (let i = 0; i < WORLD_NODES.length; i++) {
      const n = WORLD_NODES[i];
      const isSel = i === state.map.idx;
      const isHere = i === currentIdx;
      const visited = isWorldNodeVisited(state, n);
      const r = isSel ? 6 : 5;
      ctx.fillStyle = 'rgba(32,18,8,0.35)';
      ctx.fillRect(n.x - r - 1, n.y - r + 2, r * 2 + 4, r * 2 + 3);
      ctx.fillStyle = '#202020';
      ctx.fillRect(n.x - r - 2, n.y - r - 2, r * 2 + 4, r * 2 + 4);
      ctx.fillStyle = '#fff8d8';
      ctx.fillRect(n.x - r - 1, n.y - r - 1, r * 2 + 2, r * 2 + 2);
      const tile = isSel ? '#f0c020' : (visited ? n.color : '#9a9082');
      ctx.fillStyle = tile;
      ctx.fillRect(n.x - r, n.y - r, r * 2, r * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(n.x - r + 1, n.y - r + 1, r * 2 - 2, 2);
      ctx.fillStyle = isHere ? '#e83838' : (visited ? '#fff' : '#d8c8b0');
      ctx.fillRect(n.x - 2, n.y - 2, 4, 4);
      if (isHere) window.PR_UI.drawText(ctx, '*', n.x + 6, n.y - 7, '#e83838');
      else if (!visited) {
        // Locked marker on unvisited towns - small `?` over the pin so
        // the player knows fly won't land here yet.
        window.PR_UI.drawText(ctx, '?', n.x - 2, n.y - 2, '#403828');
      }
      const labelColor = visited ? '#202020' : '#6a604c';
      window.PR_UI.drawText(ctx, n.short, n.x - 9, n.y + 8, labelColor);
      if (isSel) {
        ctx.fillStyle = '#202020';
        ctx.fillRect(n.x - r - 3, n.y - r - 5, r * 2 + 6, 2);
        ctx.fillRect(n.x - r - 3, n.y + r + 3, r * 2 + 6, 2);
      }
    }
    // Fly status hint at the bottom-left of the map panel.
    window.PR_UI.drawText(ctx,
      canFly ? 'FLY: A WARPS' : 'FLY: LOCKED (NEED A BADGE)',
      x + 8, y + h - 12, canFly ? '#208830' : '#806040');

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

  // Build the link path: straight line for axis-aligned (vertical or
  // horizontal) endpoints, L-shape for everything else, special
  // wrapping L for the rodport <-> desert loop-close so its rendered
  // path leaves desert's east side and enters rodport's west side
  // (matching the actual edge directions).
  function buildLinkPath(a, b, link, yOffset) {
    const yo = yOffset || 0;
    const isLoopClose =
      (link.a === 'desert' && link.b === 'rodport') ||
      (link.a === 'rodport' && link.b === 'desert');
    if (isLoopClose) {
      const desert  = a.id === 'desert'  ? a : b;
      const rodport = a.id === 'rodport' ? a : b;
      const farX = 225;
      const start = a.id === 'desert' ? desert : rodport;
      const end   = a.id === 'desert' ? rodport : desert;
      const path = [{x:a.x, y:a.y + yo}];
      // From whichever end is desert: east, north, west.
      if (a.id === 'desert') {
        path.push({x:farX, y:desert.y + yo});
        path.push({x:farX, y:rodport.y + yo});
        path.push({x:rodport.x, y:rodport.y + yo});
      } else {
        // rodport -> desert: west exit on rodport (already west of farX
        // anyway), so draw rodport -> farX(north) -> down -> west.
        path.push({x:farX, y:rodport.y + yo});
        path.push({x:farX, y:desert.y + yo});
        path.push({x:desert.x, y:desert.y + yo});
      }
      return path;
    }
    const dx = b.x - a.x, dy = b.y - a.y;
    const path = [{x:a.x, y:a.y + yo}];
    // Straight line if endpoints share an axis (or are very close on
    // the off-axis). Otherwise an L-shape pivoting on the shorter axis.
    if (Math.abs(dx) < 4 || Math.abs(dy) < 4) {
      // Already axis-aligned.
      path.push({x:b.x, y:b.y + yo});
    } else {
      // L-shape: vertical first then horizontal.
      path.push({x:a.x, y:b.y + yo});
      path.push({x:b.x, y:b.y + yo});
    }
    return path;
  }

  function strokePath(path) {
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
    ctx.stroke();
  }

  function drawWorldLink(link) {
    const a = worldNode(link.a);
    const b = worldNode(link.b);
    ctx.save();
    // Soft drop shadow (offset 2 px south).
    ctx.strokeStyle = window.PR_UI.pf('rgba(32,20,10,0.35)');
    ctx.lineWidth = link.gate ? 3 : 4;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (link.spur || link.gate) ctx.setLineDash([3, 2]);
    strokePath(buildLinkPath(a, b, link, 2));
    // Foreground colored stroke.
    ctx.setLineDash([]);
    ctx.strokeStyle = window.PR_UI.pf(link.color);
    ctx.lineWidth = link.gate ? 2 : 3;
    if (link.spur || link.gate) ctx.setLineDash([3, 2]);
    strokePath(buildLinkPath(a, b, link, 0));
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

  // Items that make sense as held items (filtered into the GIVE
  // picker). Held gear is always included; consumable heals/cures and
  // a hand-picked berry list cover the rest. Keys + balls excluded.
  const HELDABLE_KINDS = new Set(['held_gear','heal','cure']);
  const HELDABLE_EXTRA = new Set(['oranberry','sitrusberry','pechaberry']);
  // Heal-all priority: biggest restore first. Berries are last so the
  // player keeps consumables for emergencies. Status cures are not
  // applied here (HP-only for v0).
  const HEAL_PRIORITY = ['maxpotion','hyperpotion','superpotion','potion','stew','sitrusberry','oranberry'];

  function heldableBagItems() {
    const out = [];
    const bag = state.player && state.player.bag;
    if (!bag || !window.PR_ITEMS) return out;
    for (const id of Object.keys(bag)) {
      const count = bag[id] | 0;
      if (count <= 0) continue;
      const def = window.PR_ITEMS.byId(id);
      if (!def) continue;
      if (HELDABLE_KINDS.has(def.kind) || HELDABLE_EXTRA.has(id)) {
        out.push({ id, count, def });
      }
    }
    out.sort((a, b) => a.def.name.localeCompare(b.def.name));
    return out;
  }

  function partySaveFlash(msg) {
    window.PR_SFX && window.PR_SFX.play('confirm');
    if (msg) showFlash(msg);
    window.PR_SAVE && window.PR_SAVE.save && window.PR_SAVE.save(state);
  }

  // Build the action menu when the player presses A on a party member.
  // SWAP is preserved as a menu option (sets swapSrc and falls through
  // to the existing two-press swap flow).
  function openPartyActionMenu(idx) {
    const mon = state.party[idx];
    if (!mon) return;
    const labels = [];
    const fns = [];
    labels.push('MOVES');
    fns.push(() => {
      state.menu.partyView.moveReorder = { idx, slot: 0, swapSrc: null };
    });
    labels.push(mon.held ? 'TAKE ITEM' : 'GIVE ITEM');
    fns.push(() => {
      if (mon.held) takeHeldItem(idx);
      else openHeldItemPicker(idx);
    });
    labels.push('SWAP');
    fns.push(() => {
      state.menu.partyView.swapSrc = idx;
      window.PR_SFX && window.PR_SFX.play('confirm');
      showFlash('PICK PARTNER TO SWAP');
    });
    labels.push('DEPOSIT');
    fns.push(() => confirmDeposit(idx));
    labels.push('NICKNAME');
    fns.push(() => renameMon(idx));
    labels.push(mon.favorite ? 'UNMARK' : 'MARK');
    fns.push(() => {
      mon.favorite = !mon.favorite;
      partySaveFlash(mon.favorite ? 'MARKED.' : 'UNMARKED.');
    });
    labels.push('CANCEL');
    fns.push(() => {});
    state.dialog = {
      choice: {
        prompt: mon.nickname.slice(0, 12).toUpperCase(),
        options: labels,
        cursor: 0,
        onPick: (i) => {
          state.dialog = null;
          state.mode = 'menu';
          const fn = fns[i] || (() => {});
          try { fn(); } catch (e) { console.error('[PokeRod] party action error', e); }
        }
      }
    };
    state.mode = 'choice';
  }

  function takeHeldItem(idx) {
    const mon = state.party[idx];
    if (!mon || !mon.held) return;
    const def = window.PR_ITEMS && window.PR_ITEMS.byId(mon.held);
    const name = def ? def.name : mon.held.toUpperCase();
    state.dialog = {
      choice: {
        prompt: 'Take ' + name + ' back?',
        options: ['Yes', 'No'],
        cursor: 0,
        onPick: (i) => {
          state.dialog = null;
          state.mode = 'menu';
          if (i !== 0) return;
          window.PR_ITEMS.add(state, mon.held, 1);
          mon.held = null;
          partySaveFlash('Took ' + name + '.');
        }
      }
    };
    state.mode = 'choice';
  }

  function openHeldItemPicker(idx) {
    const items = heldableBagItems();
    if (!items.length) { showFlash('NOTHING TO GIVE'); return; }
    state.menu.partyView.itemPicker = { idx, items, cursor: 0 };
  }

  function confirmDeposit(idx) {
    if (state.party.length <= 1) {
      showFlash('Need at least 1 partner.');
      return;
    }
    const mon = state.party[idx];
    const name = mon.nickname.toUpperCase();
    state.dialog = {
      choice: {
        prompt: 'Deposit ' + name.slice(0, 10) + ' to BOX?',
        options: ['Yes', 'No'],
        cursor: 0,
        onPick: (i) => {
          state.dialog = null;
          state.mode = 'menu';
          if (i !== 0) return;
          if (!Array.isArray(state.box)) state.box = [];
          state.box.push(mon);
          state.party.splice(idx, 1);
          const v = state.menu && state.menu.partyView;
          if (v) {
            v.idx = Math.min(v.idx, state.party.length - 1);
            v.swapSrc = null;
          }
          partySaveFlash('Deposited.');
        }
      }
    };
    state.mode = 'choice';
  }

  function renameMon(idx) {
    const mon = state.party[idx];
    if (!mon) return;
    let next = '';
    try {
      next = (window.prompt('Nickname?', mon.nickname) || '').trim();
    } catch (_) { /* prompt unavailable */ }
    if (!next) return;
    mon.nickname = next.slice(0, 10).toUpperCase();
    partySaveFlash('Renamed.');
  }

  function healAllFromBag() {
    if (!window.PR_ITEMS) return;
    let used = 0;
    const bag = state.player && state.player.bag;
    if (!bag) return;
    for (const mon of state.party) {
      if (!mon || !mon.stats) continue;
      while (mon.hp < mon.stats.hp) {
        const id = HEAL_PRIORITY.find(p => (bag[p] | 0) > 0);
        if (!id) {
          if (used) { window.PR_SFX && window.PR_SFX.play('heal'); partySaveFlash('USED ' + used + (used === 1 ? ' ITEM.' : ' ITEMS.')); }
          else showFlash('NOTHING TO HEAL');
          return;
        }
        const before = mon.hp;
        const r = window.PR_ITEMS.apply(id, mon);
        if (!r || !r.ok) break;
        // Safety: an item that reports ok but doesn't raise HP would
        // loop forever. No current item does this, but guard anyway.
        if (mon.hp === before) break;
        window.PR_ITEMS.take(state, id, 1);
        used++;
      }
    }
    if (used) { window.PR_SFX && window.PR_SFX.play('heal'); partySaveFlash('USED ' + used + (used === 1 ? ' ITEM.' : ' ITEMS.')); }
    else showFlash('NOTHING TO HEAL');
  }

  function updateMoveReorder(v) {
    const I = window.PR_INPUT;
    const r = v.moveReorder;
    const mon = state.party[r.idx];
    if (!mon || !mon.moves || !mon.moves.length) { v.moveReorder = null; return; }
    const max = mon.moves.length;
    if (I.consumePressed('ArrowDown')) { r.slot = (r.slot + 1) % max; window.PR_SFX && window.PR_SFX.play('select'); }
    if (I.consumePressed('ArrowUp'))   { r.slot = (r.slot + max - 1) % max; window.PR_SFX && window.PR_SFX.play('select'); }
    if (I.consumePressed('z')) {
      if (r.swapSrc === null) {
        r.swapSrc = r.slot;
        window.PR_SFX && window.PR_SFX.play('confirm');
        showFlash('PICK MOVE TO SWAP');
      } else if (r.swapSrc === r.slot) {
        r.swapSrc = null;
        window.PR_SFX && window.PR_SFX.play('select');
      } else {
        const a = r.swapSrc, b = r.slot;
        const tmp = mon.moves[a];
        mon.moves[a] = mon.moves[b];
        mon.moves[b] = tmp;
        r.swapSrc = null;
        partySaveFlash('SWAPPED.');
      }
    }
    if (I.consumePressed('x') || I.consumePressed('Enter')) {
      if (r.swapSrc !== null) { r.swapSrc = null; window.PR_SFX && window.PR_SFX.play('select'); }
      else v.moveReorder = null;
    }
  }

  function updateItemPicker(v) {
    const I = window.PR_INPUT;
    const p = v.itemPicker;
    const items = p.items;
    if (!items.length) { v.itemPicker = null; return; }
    if (I.consumePressed('ArrowDown')) { p.cursor = (p.cursor + 1) % items.length; window.PR_SFX && window.PR_SFX.play('select'); }
    if (I.consumePressed('ArrowUp'))   { p.cursor = (p.cursor + items.length - 1) % items.length; window.PR_SFX && window.PR_SFX.play('select'); }
    if (I.consumePressed('x') || I.consumePressed('Enter')) {
      v.itemPicker = null;
      return;
    }
    if (I.consumePressed('z')) {
      const it = items[p.cursor];
      const mon = state.party[p.idx];
      if (!it || !mon) { v.itemPicker = null; return; }
      if (mon.held === it.id) {
        showFlash(mon.nickname + ' already holds it.');
        return;
      }
      if (mon.held) window.PR_ITEMS.add(state, mon.held, 1);
      mon.held = it.id;
      window.PR_ITEMS.take(state, it.id, 1);
      v.itemPicker = null;
      partySaveFlash(mon.nickname + ' holds ' + it.def.name + '.');
    }
  }

  function updatePartyView() {
    const I = window.PR_INPUT;
    const m = state.menu;
    const v = m.partyView || (m.partyView = { idx:0, page:0, swapSrc:null });
    if (v.swapSrc === undefined) v.swapSrc = null;
    // Sub-mode dispatch: move-reorder and item-picker fully consume
    // input. Their B-out clears the sub-mode and returns here.
    if (v.moveReorder) { updateMoveReorder(v); return; }
    if (v.itemPicker)  { updateItemPicker(v); return; }
    const max = state.party.length;
    if (max) {
      if (I.consumePressed('ArrowDown')) { v.idx = (v.idx + 1) % max; window.PR_SFX && window.PR_SFX.play('select'); }
      if (I.consumePressed('ArrowUp'))   { v.idx = (v.idx + max - 1) % max; window.PR_SFX && window.PR_SFX.play('select'); }
      if (I.consumePressed('ArrowRight')) {
        v.page = (v.page + 1) % PARTY_PAGES.length;
        window.PR_SFX && window.PR_SFX.play('select');
      }
      if (I.consumePressed('ArrowLeft')) {
        v.page = (v.page + PARTY_PAGES.length - 1) % PARTY_PAGES.length;
        window.PR_SFX && window.PR_SFX.play('select');
      }
      // A (z): if a swap is in progress, complete it. Otherwise open
      // the action menu (which has its own SWAP entry to start a
      // swap).
      if (I.consumePressed('z')) {
        if (v.swapSrc === null) {
          openPartyActionMenu(v.idx);
        } else if (v.swapSrc === v.idx) {
          v.swapSrc = null;
          window.PR_SFX && window.PR_SFX.play('select');
        } else {
          const a = v.swapSrc, b = v.idx;
          const tmp = state.party[a];
          state.party[a] = state.party[b];
          state.party[b] = tmp;
          v.swapSrc = null;
          v.idx = b;
          partySaveFlash('SWAPPED.');
        }
      }
      // SELECT (Shift): one-tap heal everyone from bag.
      if (I.consumePressed('Shift')) {
        healAllFromBag();
      }
    }
    if (I.consumePressed('x')) {
      // B: if a swap is pending, cancel it; otherwise exit the menu.
      if (v.swapSrc !== null) {
        v.swapSrc = null;
        window.PR_SFX && window.PR_SFX.play('select');
      } else {
        m.viewing = null;
        m.partyView = null;
      }
    }
    if (I.consumePressed('Enter')) {
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
      // Friendship - 0-255 with a small heart marker once the
      // creature crosses the bonus threshold at 200.
      const fr = (mon.friendship | 0);
      const heart = fr >= 200 ? '* ' : '';
      window.PR_UI.drawText(ctx, 'FRIEND ' + heart + fr + '/255', x + 6, y + 100,
        fr >= 200 ? '#c8407a' : '#806040');
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

  function drawFavoriteStar(x, y) {
    // Tiny 5-pixel yellow star cluster used to mark favorites in the
    // party list and the battle party-select.
    ctx.fillStyle = '#f0c020';
    ctx.fillRect(x + 2, y, 1, 5);
    ctx.fillRect(x, y + 2, 5, 1);
    ctx.fillRect(x + 1, y + 1, 3, 3);
  }

  function drawMoveReorderPanel(v) {
    const x = 6, y = 6, w = VIEW_W - 12, h = VIEW_H - 12;
    const r = v.moveReorder;
    const mon = state.party[r.idx];
    window.PR_UI.panel(ctx, x, y, w, h, { fill:'#f8f0d8', border:'#202020', shadow:'#c89048' });
    window.PR_UI.header(ctx, 'REORDER MOVES', x + 4, y + 4, w - 8, { fill:'#1a0204', line:'#f0c020', text:'#f0c020' });
    const hint = r.swapSrc !== null ? 'B:CANCEL A:SWAP HERE' : 'B:BACK A:PICK';
    window.PR_UI.drawText(ctx, hint, x + w - 110, y + 4, '#806040');
    window.PR_UI.drawText(ctx, mon.nickname.slice(0, 12), x + 8, y + 22, '#202020');
    const rowH = 22;
    const listY = y + 36;
    for (let i = 0; i < 4; i++) {
      const cy = listY + i * rowH;
      const mv = mon.moves[i];
      window.PR_UI.selectBar(ctx, x + 6, cy - 2, w - 12, rowH - 2, i === r.slot);
      if (!mv) {
        window.PR_UI.drawText(ctx, '(empty slot)', x + 12, cy + 5, '#806040');
        continue;
      }
      const def = window.PR_DATA.MOVES[mv.id];
      window.PR_UI.drawText(ctx, (i + 1) + '. ' + def.name.slice(0, 14), x + 12, cy + 2, i === r.slot ? '#1a0204' : '#202020');
      window.PR_UI.drawText(ctx, def.type + ' ' + def.kind.toUpperCase().slice(0, 3), x + 12, cy + 11, '#385890');
      const pow = def.power ? ('PW ' + def.power) : 'STATUS';
      window.PR_UI.drawText(ctx, pow, x + 110, cy + 11, '#806040');
      window.PR_UI.drawText(ctx, (mv.pp || 0) + '/' + (mv.ppMax || def.pp), x + w - 34, cy + 2, '#202020');
      if (i === r.swapSrc) {
        ctx.fillStyle = '#f0c020';
        ctx.fillRect(x + w - 14, cy + 2, 3, 3);
        ctx.fillRect(x + w - 14, cy + 8, 3, 3);
        ctx.fillRect(x + w - 14, cy + 14, 3, 3);
      }
    }
  }

  function drawItemPickerPanel(v) {
    const x = 6, y = 6, w = VIEW_W - 12, h = VIEW_H - 12;
    const p = v.itemPicker;
    const mon = state.party[p.idx];
    window.PR_UI.panel(ctx, x, y, w, h, { fill:'#fff8e8', border:'#202020', shadow:'#c89048' });
    window.PR_UI.header(ctx, 'GIVE ITEM', x + 4, y + 4, w - 8, { fill:'#1a0204', line:'#f0c020', text:'#f0c020' });
    window.PR_UI.drawText(ctx, 'B:BACK A:PICK', x + w - 80, y + 4, '#806040');
    window.PR_UI.drawText(ctx, 'TO ' + mon.nickname.slice(0, 10).toUpperCase(), x + 8, y + 22, '#202020');
    const rows = 8, rowH = 13;
    const listY = y + 36;
    const start = Math.max(0, Math.min(p.items.length - rows, p.cursor - 3));
    for (let r = 0; r < rows; r++) {
      const i = start + r;
      if (i >= p.items.length) break;
      const it = p.items[i];
      const cy = listY + r * rowH;
      if (i === p.cursor) window.PR_UI.selectBar(ctx, x + 6, cy - 1, w - 12, 12, true);
      if (window.PR_ITEMS && window.PR_ITEMS.drawIcon) window.PR_ITEMS.drawIcon(ctx, it.id, x + 8, cy, 10);
      window.PR_UI.drawText(ctx, it.def.name.slice(0, 18), x + 22, cy + 2, '#202020');
      window.PR_UI.drawText(ctx, 'x' + it.count, x + w - 32, cy + 2, '#385890');
    }
  }

  function drawPartyView() {
    const x = 6, y = 6, w = VIEW_W - 12, h = VIEW_H - 12;
    const v = (state.menu && state.menu.partyView) || { idx:0, page:0, swapSrc:null };
    if (v.moveReorder) { drawMoveReorderPanel(v); return; }
    if (v.itemPicker)  { drawItemPickerPanel(v); return; }
    window.PR_UI.panel(ctx, x, y, w, h, { fill:'#d8ecff', border:'#202020', shadow:'#385890' });
    window.PR_UI.header(ctx, 'PARTY', x + 4, y + 4, w - 8, { fill:'#1a0204', line:'#f0c020', text:'#f0c020' });
    const hint = (v.swapSrc !== null && v.swapSrc !== undefined)
      ? 'B:CANCEL A:SWAP HERE'
      : 'B:BACK A:ACT SEL:HEAL';
    window.PR_UI.drawText(ctx, hint, x + w - 120, y + 4, '#806040');
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
      if (mon.favorite) drawFavoriteStar(listX + listW - 16, cy + 3);
      if (mon.held) {
        ctx.fillStyle = '#f0c020';
        ctx.fillRect(listX + listW - 8, cy + 4, 4, 4);
      }
      // Swap-source marker: a yellow chevron in the right margin of the
      // grabbed row. Doubles up with the cursor highlight when the
      // player happens to be hovering the source.
      if (i === v.swapSrc) {
        ctx.fillStyle = '#f0c020';
        ctx.fillRect(listX + listW - 4, cy + 2, 3, 3);
        ctx.fillRect(listX + listW - 4, cy + 7, 3, 3);
        ctx.fillRect(listX + listW - 4, cy + 12, 3, 3);
      }
    }
    drawPartyDetail(state.party[Math.min(v.idx, state.party.length - 1)], v.page || 0, x + 82, y + 20, w - 90, h - 34);
  }

  // ---------- Fishing minigame ----------
  // Cast -> wait -> bite (~0.6s window) -> hooked (wild battle) | missed.
  // The player can press B at any phase to cancel. Triggered by tryInteract
  // on water tiles when the player has an OLD ROD; surfing lives on B
  // (World.trySurfToggle) so both interactions are reachable from the
  // same prompt.
  const FISH_FALLBACK = [
    { species:'splashfin', minL:3, maxL:5, weight:5 },
    { species:'aquapup',   minL:3, maxL:5, weight:3 }
  ];

  function startFishing() {
    const map = state.world && state.world.currentMap();
    const pool = (map && map.fishingEncounters && map.fishingEncounters.length)
      ? map.fishingEncounters : FISH_FALLBACK;
    const total = pool.reduce((a, e) => a + (e.weight || 1), 0);
    let r = Math.random() * total;
    let pick = pool[0];
    for (const e of pool) { r -= (e.weight || 1); if (r <= 0) { pick = e; break; } }
    const lvl = pick.minL + Math.floor(Math.random() * (pick.maxL - pick.minL + 1));
    state.fishing = {
      phase: 'cast',
      t: 0,
      waitFor: 1.0 + Math.random() * 3.0,
      biteWindow: 0.6,
      species: pick.species,
      level: lvl,
      done: false
    };
    state.mode = 'fishing';
    if (window.PR_SFX) window.PR_SFX.play('door');
  }

  function updateFishing(dt) {
    const f = state.fishing;
    if (!f) { state.mode = 'overworld'; return; }
    f.t += dt;
    const I = window.PR_INPUT;
    if (I.consumePressed('x')) {
      window.PR_SFX && window.PR_SFX.play('cancel');
      state.fishing = null;
      state.mode = 'overworld';
      return;
    }
    if (f.phase === 'cast') {
      if (f.t >= 0.5) { f.phase = 'wait'; f.t = 0; }
      I.consumePressed('z');
      return;
    }
    if (f.phase === 'wait') {
      if (I.consumePressed('z')) {
        f.phase = 'missed';
        f.t = 0;
        if (window.PR_SFX) window.PR_SFX.play('bump');
        return;
      }
      if (f.t >= f.waitFor) {
        f.phase = 'bite';
        f.t = 0;
        if (window.PR_SFX) window.PR_SFX.play('select');
      }
      return;
    }
    if (f.phase === 'bite') {
      if (I.consumePressed('z')) {
        f.phase = 'hooked';
        f.t = 0;
        if (window.PR_SFX) window.PR_SFX.play('confirm');
        return;
      }
      if (f.t >= f.biteWindow) {
        f.phase = 'missed';
        f.t = 0;
        if (window.PR_SFX) window.PR_SFX.play('weak');
      }
      return;
    }
    if (f.phase === 'hooked') {
      if (f.t >= 0.5) {
        const sp = f.species, lv = f.level;
        state.fishing = null;
        if (!state.party.length || !state.party.some(p => p.hp > 0)) {
          state.mode = 'overworld';
          openDialog(['You hooked a creature, but no one is awake to battle!']);
          return;
        }
        startBattleAgainstWild(sp, lv);
      }
      return;
    }
    if (f.phase === 'missed') {
      if (f.t >= 1.0) {
        state.fishing = null;
        state.mode = 'overworld';
      }
      return;
    }
  }

  function drawFishing() {
    ctx.fillStyle = 'rgba(8, 12, 28, 0.55)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    for (let y = 90; y < 130; y += 4) {
      const a = 0.10 + 0.04 * Math.sin((performance.now() / 350) + y * 0.4);
      ctx.fillStyle = 'rgba(120,180,240,' + a.toFixed(3) + ')';
      ctx.fillRect(0, y, VIEW_W, 2);
    }
    const f = state.fishing;
    const cx = (VIEW_W / 2) | 0;
    let bobY = 100;
    if (f) {
      if (f.phase === 'cast')   bobY = 100 - Math.round(Math.sin((f.t / 0.5) * Math.PI) * 18);
      if (f.phase === 'wait')   bobY = 100 + Math.round(Math.sin(f.t * 4) * 2);
      if (f.phase === 'bite')   bobY = 100 + Math.round(Math.sin(f.t * 30) * 3);
      if (f.phase === 'hooked') bobY = 100 - Math.round(f.t * 80);
      if (f.phase === 'missed') bobY = 100 + 6;
    }
    ctx.strokeStyle = window.PR_UI.pf('#806040');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(VIEW_W - 14, 22);
    ctx.lineTo(VIEW_W - 60, 60);
    ctx.stroke();
    ctx.strokeStyle = window.PR_UI.pf('#fff8c8');
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(VIEW_W - 60, 60);
    ctx.lineTo(cx + 2, bobY);
    ctx.stroke();
    ctx.fillStyle = '#202020';
    ctx.fillRect(cx - 2, bobY - 3, 6, 7);
    ctx.fillStyle = '#e84848';
    ctx.fillRect(cx - 1, bobY - 2, 4, 3);
    ctx.fillStyle = '#fff8e8';
    ctx.fillRect(cx - 1, bobY + 1, 4, 2);
    if (f && (f.phase === 'cast' || f.phase === 'hooked')) {
      const r = (f.phase === 'cast' ? 4 + (1 - f.t / 0.5) * 12 : 6 + f.t * 30) | 0;
      ctx.strokeStyle = window.PR_UI.pf('rgba(200,232,255,0.7)');
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx + 1, 102, Math.max(1, r), 0, Math.PI * 2);
      ctx.stroke();
    }
    if (f && f.phase === 'bite') {
      const blink = (((f.t * 8) | 0) % 2) === 0;
      if (blink) {
        ctx.fillStyle = '#fff8c0';
        ctx.fillRect(cx - 5, bobY - 18, 9, 12);
        ctx.fillStyle = '#202020';
        ctx.fillRect(cx - 6, bobY - 19, 11, 2);
        ctx.fillRect(cx - 6, bobY - 7, 11, 1);
        ctx.fillRect(cx - 6, bobY - 19, 1, 13);
        ctx.fillRect(cx + 4, bobY - 19, 1, 13);
        window.PR_UI.drawText(ctx, '!', cx - 2, bobY - 16, '#d83020');
      }
    }
    let label = 'CAST!';
    if (f) {
      if (f.phase === 'wait')   label = '...';
      if (f.phase === 'bite')   label = '* A NIBBLE! PRESS A *';
      if (f.phase === 'hooked') label = 'HOOKED IT!';
      if (f.phase === 'missed') label = 'GOT AWAY...';
    }
    window.PR_UI.drawDialog(ctx, [label, 'B: CANCEL'], VIEW_W, VIEW_H, false);
  }

  // ---------- Battle end ----------
  function endBattle(outcome, battle) {
    // Battle Tower chains: every trainer battle marked with a
    // `_tower_*` npcKey is a tower round. Hook in before the
    // normal lost / won bookkeeping so the tower flow controls the
    // next step.
    if (battle && battle.opts && battle.opts.npcKey &&
        String(battle.opts.npcKey).startsWith('_tower_')) {
      if (outcome === 'won')  _towerOnWin();
      if (outcome === 'lost' || outcome === 'ran') _towerOnLoss();
      // Skip badge / trainer-stat side effects for tower rounds; the
      // map's stats are still incremented below since they're a useful
      // play-time signal.
    }
    if (outcome === 'lost') {
      ensurePlayerStats();
      // Stash the map we whited out IN before we respawn, so the profile
      // page can show "last whiteout: FROSTPEAK" etc.
      state.player.stats.lastWhiteoutMap = state.player.map || '';
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
      if (battle.opts && battle.opts.npcKey) {
        state.player.stats.trainerWins = (state.player.stats.trainerWins || 0) + 1;
      } else {
        state.player.stats.wildWins = (state.player.stats.wildWins || 0) + 1;
      }
    }
    let earnedBadge = null;
    if (outcome === 'won' && battle.opts && battle.opts.badge) {
      if (!Array.isArray(state.player.badges)) state.player.badges = [];
      if (!state.player.badges.includes(battle.opts.badge)) {
        state.player.badges.push(battle.opts.badge);
        earnedBadge = battle.opts.badge;
        showFlash('GOT THE ' + battle.opts.badge + ' BADGE!');
        // CINDER is the champion's badge - flag the save as
        // champion-cleared so the title screen can offer NG+.
        if (battle.opts.badge === 'CINDER') {
          if (!state.flags) state.flags = {};
          state.flags.beatChampion = true;
        }
        if (window.PR_ACHV) {
          window.PR_ACHV.unlock(state, 'first_badge');
          if (state.player.badges.length >= 8) window.PR_ACHV.unlock(state, 'all_badges');
        }
      }
    }
    if (window.PR_ACHV && outcome === 'won' && battle.opts && battle.opts.npcKey) {
      window.PR_ACHV.unlock(state, 'first_trainer_win');
      if ((state.player.stats.trainerWins || 0) >= 10) {
        window.PR_ACHV.unlock(state, 'ten_trainer_wins');
      }
    }
    // Story system events. Whiteouts only count once per loss; badges only
    // when freshly earned. Both are queued up by PR_STORY which will
    // dispatch the matching encounter on the next overworld tick.
    if (window.PR_STORY) {
      if (outcome === 'lost') window.PR_STORY.emit(state, 'whiteout', {});
      if (earnedBadge) window.PR_STORY.emit(state, 'badge', { badge:earnedBadge,
        count: (state.player.badges || []).length });
    }
    // If a cutscene battle just ended, hand control back to the cutscene.
    const after = state._cutsceneAfterBattle;
    state._cutsceneAfterBattle = null;
    state.battle = null;
    if (after) {
      try { after(); } catch (e) { console.error('[PokeRod] cutscene resume error', e); }
    } else {
      state.mode = 'overworld';
    }
    state.world.justEntered = false;
    window.PR_SAVE.save(state);
    playOverworldMusic();
    // Drain the story queue once the world has settled.
    if (window.PR_STORY && window.PR_STORY.drainQueue) {
      setTimeout(() => window.PR_STORY.drainQueue(state), 50);
    }
  }
})();
