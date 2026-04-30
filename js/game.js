// Main game state machine and loop.
'use strict';

(function(){
  const VIEW_W = 240, VIEW_H = 160;
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

  // Wire callbacks the world will invoke.
  state.onMapChange = () => {};
  state.onWildEncounter = startWildEncounter;
  state.onNpcInteract = handleNpcInteract;
  state.onSign = (text) => openDialog([text]);
  state.onHealer = healAtCenter;
  state.onPause = openPauseMenu;
  state.onBattleEnd = endBattle;

  function showOverlay(show) {
    document.getElementById('title').hidden = !show;
  }

  function init() {
    const has = window.PR_SAVE.exists();
    if (has) document.getElementById('btn-continue').hidden = false;
    document.getElementById('btn-new').addEventListener('click', () => startNewGame());
    document.getElementById('btn-continue').addEventListener('click', () => continueGame());
    requestAnimationFrame(loop);
  }

  function startNewGame() {
    window.PR_SAVE.clear();
    state.player = { name:'YOU', map:'rodport', x:4, y:5, dir:'down', money:500, balls:5, steps:0 };
    state.party = [];
    state.flags = { starterChosen:false };
    state.defeatedTrainers = new Set();
    state.world = new window.PR_WORLD.World(state);
    state.intro = { page: 0, charT: 0 };
    state.mode = 'intro';
    showOverlay(false);
  }

  function continueGame() {
    const data = window.PR_SAVE.load();
    if (!data) { startNewGame(); return; }
    Object.assign(state.player, data.player);
    if (state.player.balls === undefined) state.player.balls = 5;
    state.party = data.party || [];
    state.flags = data.flags || { starterChosen:false };
    state.defeatedTrainers = new Set(data.defeatedTrainers || []);
    state.world = new window.PR_WORLD.World(state);
    state.mode = 'overworld';
    showOverlay(false);
  }

  let lastT = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    update(dt);
    render();
    window.PR_INPUT.frameEnd();
    requestAnimationFrame(loop);
  }

  function update(dt) {
    if (state.mode === 'intro') updateIntro(dt);
    else if (state.mode === 'overworld') state.world.update(dt);
    else if (state.mode === 'battle') state.battle.update(dt);
    else if (state.mode === 'dialog') updateDialog();
    else if (state.mode === 'menu') updateMenu();
    else if (state.mode === 'starter') updateStarter();
  }

  function render() {
    if (state.mode === 'title') return;
    if (state.mode === 'intro') { drawIntro(); return; }
    if (state.mode === 'battle') { state.battle.render(ctx); return; }
    state.world.render(ctx);
    if (state.mode === 'dialog') drawDialog();
    else if (state.mode === 'menu') drawMenu();
    else if (state.mode === 'starter') drawStarter();
  }

  // ---------- Dialog ----------
  function openDialog(lines, onDone, source) {
    state.dialog = { lines: lines.slice(), index:0, onDone: onDone || null, source: source || null };
    state.mode = 'dialog';
  }
  function updateDialog() {
    const d = state.dialog;
    if (window.PR_INPUT.consumePressed('z') || window.PR_INPUT.consumePressed('Enter')) {
      d.index++;
      if (d.index >= d.lines.length) {
        const cb = d.onDone, src = d.source;
        state.dialog = null;
        state.mode = 'overworld';
        if (cb) cb(src);
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
  window.PR_GAME = { state };

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
    const wild = window.PR_DATA.makeMon(pick.species, lvl);
    state.battle = new window.PR_BATTLE.Battle(state, { wild });
    state.mode = 'battle';
    state.world.encounterCooldown = 6;
  }

  // ---------- NPC interaction ----------
  function handleNpcInteract(npc) {
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
    if (npc.trainer) {
      const trainerKey = state.player.map + ':' + npc.x + ',' + npc.y;
      if (state.defeatedTrainers.has(trainerKey)) {
        openDialog(npc.trainer.defeat || ['You already beat me!']);
        return;
      }
      if (!state.party.length || !state.party.some(p => p.hp > 0)) {
        openDialog(['You have no able partners!','Heal up before challenging me.']);
        return;
      }
      const lines = (npc.dialog || ['Battle!']).slice();
      openDialog(lines, () => {
        const team = npc.trainer.team.map(([sp, lv]) => window.PR_DATA.makeMon(sp, lv));
        state.battle = new window.PR_BATTLE.Battle(state, {
          trainer: { team, reward: npc.trainer.reward, defeat: npc.trainer.defeat },
          npcKey: trainerKey
        });
        state.mode = 'battle';
      });
      return;
    }
    openDialog(npc.dialog || ['...']);
  }

  function healAtCenter() {
    openDialog(['Healing your team...','All set! Have a great day!'], () => {
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
    if (I.consumePressed('ArrowLeft'))  state.starterMenu.idx = (state.starterMenu.idx + 2) % 3;
    if (I.consumePressed('ArrowRight')) state.starterMenu.idx = (state.starterMenu.idx + 1) % 3;
    if (I.consumePressed('x')) { state.starterMenu = null; state.mode = 'overworld'; return; }
    if (I.consumePressed('z')) {
      const sp = STARTERS[state.starterMenu.idx];
      const mon = window.PR_DATA.makeMon(sp, 5);
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
    state.menu = { idx: 0, options: ['PARTY','SAVE','EXIT'] };
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
        window.PR_SAVE.save(state);
        m.flash = 'Game saved!';
        m.flashTimer = 1.0;
      } else if (opt === 'EXIT') {
        state.menu = null;
        state.mode = 'overworld';
      } else if (opt === 'PARTY') {
        m.viewing = 'party';
      }
    }
  }
  function drawMenu() {
    const m = state.menu;
    if (m.viewing === 'party') {
      drawPartyView(); return;
    }
    const w = 80, h = 60, x = VIEW_W - w - 6, y = 6;
    window.PR_UI.box(ctx, x, y, w, h, '#fff', '#202020');
    for (let i = 0; i < m.options.length; i++) {
      const cy = y + 8 + i * 12;
      if (i === m.idx) window.PR_UI.drawText(ctx, '>', x + 4, cy, '#e83838');
      window.PR_UI.drawText(ctx, m.options[i], x + 12, cy, '#202020');
    }
    if (m.flashTimer > 0) {
      m.flashTimer -= 1/60;
      window.PR_UI.box(ctx, 40, 70, 160, 20, '#fff', '#202020');
      window.PR_UI.drawText(ctx, m.flash, 50, 76, '#202020');
    }
    window.PR_UI.drawText(ctx, '$' + state.player.money, x + 4, y + h - 10, '#202020');
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
    state.battle = null;
    state.mode = 'overworld';
    state.world.justEntered = false;
    window.PR_SAVE.save(state);
  }
})();
