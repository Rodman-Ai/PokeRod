// Story / encounter system.
//
// Drives ~50 walk-up cutscenes that fire at progression milestones (catch
// counts, level-ups, gym wins, hidden items, whiteouts, big spends, first /
// repeat visits to specific maps). Hooks into existing event sites in
// battle.js, world.js, game.js, shop.js — those callers fire
//   PR_STORY.emit(state, event, payload)
// after the canonical state mutation, and PR_STORY.tryEncounter scans the
// encounter table for the highest-priority eligible entry. If anything
// matches, it kicks off a cutscene: the player freezes, an NPC sprite
// walks tile-by-tile from a nearby off-screen tile to the player, dialog
// plays (with branching choice prompts), and the NPC walks back off.
'use strict';

(function(){
  // ---- Flag scaffolding ---------------------------------------------------
  function ensureFlags(state) {
    if (!state.flags) state.flags = {};
    const f = state.flags;
    if (!f.firstVisited) f.firstVisited = {};
    if (!f.visitCount) f.visitCount = {};
    if (!(f.encountersDone instanceof Set)) {
      f.encountersDone = new Set(Array.isArray(f.encountersDone) ? f.encountersDone : []);
    }
    if (!f.chains) f.chains = {};
    if (!f.chainCooldowns) f.chainCooldowns = {};
    if (!f.npcVisits) f.npcVisits = {};
    if (typeof f.totalSpent !== 'number') f.totalSpent = 0;
    if (typeof f.totalSold  !== 'number') f.totalSold = 0;
    if (typeof f.whiteouts !== 'number') f.whiteouts = 0;
    if (typeof f.evolutions !== 'number') f.evolutions = 0;
    if (typeof f.totalCatches !== 'number') f.totalCatches = 0;
    if (typeof f.totalHidden !== 'number') f.totalHidden = 0;
    if (typeof f.maxPartyLevel !== 'number') f.maxPartyLevel = 0;
    return f;
  }

  // Helpers exposed to encounter `condition`s.
  function badgeCount(state) {
    return ((state.player && state.player.badges) || []).length;
  }
  function caughtCount(state) {
    if (state.dex && state.dex.caught instanceof Set) return state.dex.caught.size;
    return Array.isArray(state.dex && state.dex.caught) ? state.dex.caught.length : 0;
  }
  function partyMaxLevel(state) {
    let m = 0;
    for (const p of state.party || []) if (p && p.level > m) m = p.level | 0;
    return m;
  }
  function partyHasType(state, type) {
    const C = window.PR_DATA && window.PR_DATA.CREATURES;
    if (!C) return false;
    for (const p of state.party || []) {
      const sp = p && C[p.species];
      if (sp && sp.types && sp.types.includes(type)) return true;
    }
    return false;
  }

  // ---- Event emission -----------------------------------------------------
  // Event names: enter_map, catch, level_up, evolve, badge, whiteout,
  // hidden_item, buy, sell, starter_chosen.
  function emit(state, event, payload) {
    const f = ensureFlags(state);
    payload = payload || {};
    switch (event) {
      case 'enter_map': {
        const id = payload.mapId;
        if (!id) break;
        if (!f.firstVisited[id]) f.firstVisited[id] = true;
        f.visitCount[id] = (f.visitCount[id] || 0) + 1;
        break;
      }
      case 'catch':
        f.totalCatches = (f.totalCatches || 0) + 1;
        break;
      case 'level_up':
        if (payload.level && payload.level > f.maxPartyLevel) f.maxPartyLevel = payload.level;
        break;
      case 'evolve':
        f.evolutions = (f.evolutions || 0) + 1;
        break;
      case 'whiteout':
        f.whiteouts = (f.whiteouts || 0) + 1;
        break;
      case 'hidden_item':
        f.totalHidden = (f.totalHidden || 0) + 1;
        break;
      case 'buy':
        if (typeof payload.total === 'number') f.totalSpent += payload.total;
        break;
      case 'sell':
        if (typeof payload.total === 'number') f.totalSold += payload.total;
        break;
      case 'badge':
        // Badges are pushed into state.player.badges by endBattle before
        // we get here, so the count is already current.
        break;
      // 'starter_chosen' has no aggregate; the encounter table reads
      // state.flags.starterChosen directly.
    }
    tryEncounter(state, event, payload);
    // Quest system also evaluates against the same milestones (badges,
    // catches, level-ups, evolutions, whiteouts, etc.). Calling tickQuests
    // here means a quest that depends on any tracked counter completes as
    // soon as the counter advances, no need to wait for the next map
    // transition.
    if (window.PR_GAME && window.PR_GAME.tickQuests) {
      try { window.PR_GAME.tickQuests(event); } catch (e) { /* ignore */ }
    }
  }

  // ---- Encounter resolution ----------------------------------------------
  function triggerMatches(t, state, event, payload) {
    if (!t || !t.type) return false;
    if (t.event && t.event !== event) return false;
    switch (t.type) {
      case 'firstVisit':
        return event === 'enter_map' && payload.mapId === t.map;
      case 'visitCount':
        return event === 'enter_map' && payload.mapId === t.map &&
               (state.flags.visitCount[t.map] || 0) >= t.count;
      case 'badge':
        return event === 'badge' && badgeCount(state) >= t.count;
      case 'starter':
        return event === 'starter_chosen';
      case 'catch':
        if (event !== 'catch') return false;
        if (t.species) return payload && payload.species === t.species;
        return (state.flags.totalCatches || 0) >= (t.count | 0);
      case 'caughtSpecies':
        return event === 'catch' && caughtCount(state) >= (t.count | 0);
      case 'level':
        return event === 'level_up' && (state.flags.maxPartyLevel || 0) >= (t.level | 0);
      case 'evolve':
        return event === 'evolve' && (state.flags.evolutions || 0) >= (t.count | 0);
      case 'whiteout':
        return event === 'whiteout' && (state.flags.whiteouts || 0) >= (t.count | 0);
      case 'hiddenItem':
        return event === 'hidden_item' && (state.flags.totalHidden || 0) >= (t.count | 0);
      case 'spend':
        return event === 'buy' && (state.flags.totalSpent || 0) >= (t.total | 0);
      case 'sell':
        return event === 'sell' && (state.flags.totalSold || 0) >= (t.total | 0);
    }
    return false;
  }

  function isEligible(enc, state, event, payload) {
    const f = state.flags;
    if (enc.oneShot !== false && f.encountersDone.has(enc.id)) return false;
    // Chain step gating: the encounter is only eligible if the chain is at
    // exactly its declared step (so encounters fire in order, never skipped
    // forward, and never replayed).
    if (enc.chain) {
      const step = f.chains[enc.chain] || 0;
      if (step !== (enc.chainStep | 0)) return false;
      // Cooldown: after any encounter on this chain fires, require the
      // player to take CHAIN_COOLDOWN_STEPS overworld steps before the
      // next one can trigger. Without this, a player who satisfies
      // several thresholds at once (e.g. they already spent >5000 by
      // the time kel_01 first fires) gets the entire chain back-to-back
      // on consecutive buys / sells / catches.
      const playerSteps = (state.player && state.player.steps) || 0;
      const cooldownUntil = f.chainCooldowns[enc.chain] || 0;
      if (playerSteps < cooldownUntil) return false;
    }
    if (!triggerMatches(enc.trigger, state, event, payload)) return false;
    if (enc.condition) {
      try { if (!enc.condition(state)) return false; }
      catch (_) { return false; }
    }
    return true;
  }
  // Steps the player must take between any two encounters on the same
  // chain. ~30 = roughly thirty seconds of walking, enough to break the
  // shop-purchase-chain-spam loop without making chain encounters feel
  // gated behind a long delay.
  const CHAIN_COOLDOWN_STEPS = 30;

  function pickEncounter(state, event, payload) {
    const list = (window.PR_STORY_ENCOUNTERS && window.PR_STORY_ENCOUNTERS.ENCOUNTERS) || [];
    let best = null;
    let bestPri = -Infinity;
    for (const enc of list) {
      if (!isEligible(enc, state, event, payload)) continue;
      const pri = (enc.priority | 0);
      if (pri > bestPri) { best = enc; bestPri = pri; }
    }
    return best;
  }

  function tryEncounter(state, event, payload) {
    if (isPlaying(state)) return;
    if (state.mode !== 'overworld' && event !== 'whiteout' && event !== 'badge' &&
        event !== 'catch' && event !== 'level_up' && event !== 'evolve') {
      // Only enter_map/buy/sell/hidden_item should fire from overworld;
      // the rest can come in from battle/dialog/etc and we defer.
      // Practically the events in the second branch just need a queue.
    }
    const enc = pickEncounter(state, event, payload);
    if (!enc) return;
    enqueueEncounter(state, enc);
    drainQueue(state);
  }

  function enqueueEncounter(state, enc) {
    if (!state.flags) ensureFlags(state);
    if (!state.flags._queue) state.flags._queue = [];
    state.flags._queue.push(enc.id);
  }

  function drainQueue(state) {
    if (isPlaying(state)) return;
    const q = state.flags && state.flags._queue;
    if (!q || !q.length) return;
    if (state.mode !== 'overworld') return;
    const id = q.shift();
    startEncounter(state, id);
  }

  function findEncounter(id) {
    const list = (window.PR_STORY_ENCOUNTERS && window.PR_STORY_ENCOUNTERS.ENCOUNTERS) || [];
    return list.find(e => e.id === id) || null;
  }

  // ---- Cutscene state machine --------------------------------------------
  function isPlaying(state) {
    return !!(state && state.cutscene && state.cutscene.active);
  }

  function startEncounter(state, id) {
    const enc = findEncounter(id);
    if (!enc) {
      console.warn('[story] encounter not found', id);
      return false;
    }
    if (!state.world) return false;
    const world = state.world;
    const spawn = pickSpawnTile(world);
    if (!spawn) {
      // No walkable off-screen tile? Plant the NPC adjacent and skip
      // the walk-in. Common in cramped interiors like the lab right
      // after the starter pick. We jump straight to 'speak' here and
      // open the first scene step at the end of this function — if we
      // left phase as 'enter' (or 'walk_in' with an empty path), the
      // tick loop has nothing to advance and the cutscene mode locks
      // the game until refresh.
      const adj = pickAdjacentTile(world);
      if (!adj) return false;
      state.cutscene = {
        active:true,
        encounter:enc,
        npc:{ x:adj.x, y:adj.y, dir:facingTo(adj.x, adj.y, world.player.x, world.player.y),
              sprite:enc.character.sprite, name:enc.character.name, anim:null },
        phase:'speak',
        steps:expandScene(enc.scene, enc),
        sceneIdx:0,
        spawn:{ x:adj.x, y:adj.y },
        homePath:null
      };
    } else {
      state.cutscene = {
        active:true,
        encounter:enc,
        npc:{ x:spawn.x, y:spawn.y, dir:'down',
              sprite:enc.character.sprite, name:enc.character.name, anim:null },
        phase:'walk_in',
        steps:expandScene(enc.scene, enc),
        sceneIdx:0,
        spawn:{ x:spawn.x, y:spawn.y },
        homePath:null
      };
    }
    state.mode = 'cutscene';
    if (window.PR_SFX) window.PR_SFX.play('select');
    // If we skipped the walk-in (cramped interior fallback) start the
    // dialog immediately so the player isn't staring at a frozen
    // screen waiting for a phase that has nothing to advance.
    if (state.cutscene.phase === 'speak') {
      openSceneStep(state);
    }
    return true;
  }

  // Walk a 4-direction BFS over walkable tiles toward a goal tile. Capped
  // for cost. Returns an array of [x,y] from start to (one tile before)
  // goal — we stop one tile before the goal so the NPC ends adjacent.
  function pathTo(world, sx, sy, gx, gy, maxNodes) {
    maxNodes = maxNodes || 80;
    const seen = new Set();
    const startKey = sx + ',' + sy;
    seen.add(startKey);
    const q = [[sx, sy, null]];
    let goal = null;
    while (q.length && seen.size <= maxNodes) {
      const [x, y, parent] = q.shift();
      // Stop once we've reached an adjacent tile (Manhattan dist 1).
      if (Math.abs(x - gx) + Math.abs(y - gy) === 1) { goal = [x, y, parent]; break; }
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = x + dx, ny = y + dy;
        const key = nx + ',' + ny;
        if (seen.has(key)) continue;
        if (!walkableForCutscene(world, nx, ny)) continue;
        seen.add(key);
        q.push([nx, ny, [x, y, parent]]);
      }
    }
    if (!goal) return null;
    const out = [];
    let cur = goal;
    while (cur) { out.unshift([cur[0], cur[1]]); cur = cur[2]; }
    return out;
  }

  function walkableForCutscene(world, x, y) {
    const m = world.currentMap();
    if (!m) return false;
    if (y < 0 || y >= m.tiles.length) return false;
    const row = m.tiles[y];
    if (x < 0 || x >= row.length) return false;
    const code = row[x];
    const props = window.PR_MAPS && window.PR_MAPS.TILE_PROPS && window.PR_MAPS.TILE_PROPS[code];
    if (!props) return false;
    if (props.walk !== true && props.walk !== 'south') return false;
    if (world.player && world.player.x === x && world.player.y === y) return false;
    return true;
  }

  function pickAdjacentTile(world) {
    const px = world.player.x, py = world.player.y;
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = px + dx, ny = py + dy;
      if (walkableForCutscene(world, nx, ny)) return { x:nx, y:ny };
    }
    return null;
  }

  // Pick a walkable spawn tile that is far enough away to feel like a
  // walk-in but close enough to actually path-find to.
  function pickSpawnTile(world) {
    const px = world.player.x, py = world.player.y;
    // Try a ring of candidates ~5-8 tiles away, prefer the player's facing
    // direction, then fall back to any direction.
    const candidates = [];
    for (let dist = 6; dist <= 9; dist++) {
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]) {
        candidates.push([px + dx * dist, py + dy * dist]);
      }
    }
    for (const [x, y] of candidates) {
      if (!walkableForCutscene(world, x, y)) continue;
      const path = pathTo(world, x, y, px, py, 120);
      if (path && path.length >= 2) return { x, y, path };
    }
    return null;
  }

  function facingTo(fromX, fromY, tx, ty) {
    const dx = tx - fromX, dy = ty - fromY;
    if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
    return dy > 0 ? 'down' : 'up';
  }

  // Build a "linear" sequence of dialog steps from an encounter's scene,
  // including resolving 'next' references in choice options to nested
  // segments. (Kept simple: choices either set flags + continue inline
  // or replace the remaining steps via a labelled segment in enc.scenes.)
  function expandScene(scene, enc) {
    const steps = [];
    for (const s of (scene || [])) steps.push(s);
    return steps;
  }

  // ---- Per-frame tick (called from game loop) ----------------------------
  function tickCutscene(state, dt) {
    const cs = state.cutscene;
    if (!cs || !cs.active) return;
    const world = state.world;
    if (!world) return;
    if (cs.phase === 'walk_in') {
      // Pre-compute path on first tick.
      if (!cs.homePath) {
        const path = pathTo(world, cs.npc.x, cs.npc.y, world.player.x, world.player.y, 200);
        cs.homePath = path || [];
        cs.pathIdx = 0;
        cs.stepTimer = 0;
        // Safety net: if BFS didn't reach the player at all, skip the
        // walk-in entirely and start the dialog. Better than locking
        // state.mode = 'cutscene' forever and forcing a refresh.
        if (cs.homePath.length < 2) {
          cs.npc.dir = facingTo(cs.npc.x, cs.npc.y, world.player.x, world.player.y);
          cs.phase = 'speak';
          openSceneStep(state);
          return;
        }
      }
      cs.stepTimer = (cs.stepTimer || 0) - dt;
      if (cs.stepTimer <= 0) {
        cs.stepTimer = 0.16; // tile per ~160ms; matches player walk speed
        const next = cs.homePath[cs.pathIdx + 1];
        if (!next) {
          // Arrived adjacent — face the player.
          cs.npc.dir = facingTo(cs.npc.x, cs.npc.y, world.player.x, world.player.y);
          cs.phase = 'speak';
          openSceneStep(state);
        } else {
          cs.npc.dir = facingTo(cs.npc.x, cs.npc.y, next[0], next[1]);
          cs.npc.x = next[0]; cs.npc.y = next[1];
          cs.pathIdx++;
        }
      }
    } else if (cs.phase === 'walk_out') {
      cs.stepTimer = (cs.stepTimer || 0) - dt;
      if (cs.stepTimer <= 0) {
        cs.stepTimer = 0.16;
        if (!cs.outPath) {
          const back = pathTo(world, cs.npc.x, cs.npc.y, cs.spawn.x, cs.spawn.y, 200);
          cs.outPath = back || [];
          cs.outIdx = 0;
        }
        const next = cs.outPath[cs.outIdx + 1];
        if (!next) {
          finishEncounter(state);
        } else {
          cs.npc.dir = facingTo(cs.npc.x, cs.npc.y, next[0], next[1]);
          cs.npc.x = next[0]; cs.npc.y = next[1];
          cs.outIdx++;
        }
      }
    }
    // 'speak' phase is owned by the dialog system; advance() resumes us.
  }

  // Render hook (called by world.render after the regular NPC pass).
  function renderCutsceneNpc(world, ctx, camX, camY, npcFrame, TS, VIEW_W, VIEW_H) {
    const cs = world.state && world.state.cutscene;
    if (!cs || !cs.active || !cs.npc) return;
    const sx = cs.npc.x * TS - camX;
    const sy = cs.npc.y * TS - camY;
    if (sx < -TS - 8 || sx > VIEW_W + 8 || sy < -TS - 8 || sy > VIEW_H + 8) return;
    if (window.PR_CHARS && window.PR_CHARS.drawNpc) {
      window.PR_CHARS.drawNpc(ctx, sx, sy, cs.npc.sprite, cs.npc.dir, npcFrame);
    }
  }

  // ---- Dialog driver ------------------------------------------------------
  // We push scene steps into the existing dialog system but augment it to
  // support choice prompts (game.js extension reads state.dialog.choice).
  function openSceneStep(state) {
    const cs = state.cutscene;
    if (!cs || cs.phase !== 'speak') return;
    if (cs.sceneIdx >= cs.steps.length) {
      // Scene done — start walking out.
      cs.phase = 'walk_out';
      cs.outPath = null; cs.outIdx = 0; cs.stepTimer = 0.16;
      return;
    }
    const step = cs.steps[cs.sceneIdx];
    const charName = (cs.encounter.character && cs.encounter.character.name) || '';
    if (step.kind === 'line') {
      const text = (step.who === false || !charName) ? step.text : charName + ': ' + step.text;
      window.PR_GAME.openDialog([text], () => {
        cs.sceneIdx++;
        if (state.cutscene === cs) openSceneStep(state);
      }, { cutscene:true });
    } else if (step.kind === 'choice') {
      // Open a branching prompt; game.js draws the choice list.
      state.dialog = {
        choice: {
          prompt: step.prompt || '',
          options: step.options.map(o => o.label),
          cursor: 0,
          onPick: (idx) => {
            const opt = step.options[idx] || step.options[0];
            applyChoice(state, opt);
            cs.sceneIdx++;
            // If the option supplies a `goto` label, jump steps; else
            // fall through to next step normally.
            if (opt && opt.goto) {
              const target = cs.steps.findIndex(s => s.label === opt.goto);
              if (target >= 0) cs.sceneIdx = target;
            }
            state.dialog = null;
            state.mode = 'cutscene';
            if (state.cutscene === cs) openSceneStep(state);
          }
        }
      };
      state.mode = 'choice';
    } else if (step.kind === 'set') {
      // Pure flag mutation, no UI.
      applySet(state, step.flags || step.set);
      cs.sceneIdx++;
      openSceneStep(state);
    } else if (step.kind === 'gift') {
      const items = window.PR_ITEMS;
      const count = step.count || 1;
      if (items && items.add) items.add(state, step.item, count);
      const def = items && items.ITEMS && items.ITEMS[step.item];
      const name = (def && def.name) || step.item;
      const lines = [
        (charName ? charName + ': ' : '') + (step.text || ('Take this ' + name + '!')),
        'Got ' + count + ' ' + name + '!'
      ];
      if (window.PR_SFX) window.PR_SFX.play('confirm');
      // Flash banner so the player can't miss the gift even if they
      // tap-mash through the dialog.
      if (state.showFlash) state.showFlash('GOT ' + count + ' ' + name.toUpperCase() + '!');
      window.PR_GAME.openDialog(lines, () => {
        cs.sceneIdx++;
        if (state.cutscene === cs) openSceneStep(state);
      }, { cutscene:true });
    } else if (step.kind === 'battle') {
      // Hand off to a trainer battle. Stash the cutscene; on battle end,
      // if the cutscene was mid-flight, the world resumes 'cutscene' mode
      // and we walk out.
      const team = step.team || (cs.encounter.rivalTeamFn && cs.encounter.rivalTeamFn(state));
      if (!team) { cs.sceneIdx++; openSceneStep(state); return; }
      // Reuse the trainer-battle path by faking an npc shape.
      const fakeNpc = {
        name: charName,
        trainer: { team, reward: step.reward || 0, defeat: step.defeat || ['...'] }
      };
      state._cutsceneAfterBattle = () => {
        if (state.cutscene === cs && cs.active) {
          cs.sceneIdx++;
          state.mode = 'cutscene';
          openSceneStep(state);
        }
      };
      window.PR_GAME.startBattleAgainstTrainer(fakeNpc, 'cutscene:' + cs.encounter.id);
    } else {
      cs.sceneIdx++;
      openSceneStep(state);
    }
  }

  function applyChoice(state, opt) {
    if (!opt) return;
    if (opt.set) applySet(state, opt.set);
    if (opt.gift && window.PR_ITEMS && window.PR_ITEMS.add) {
      window.PR_ITEMS.add(state, opt.gift.item, opt.gift.count || 1);
    }
  }
  function applySet(state, kv) {
    if (!kv) return;
    ensureFlags(state);
    for (const k of Object.keys(kv)) state.flags[k] = kv[k];
  }

  function finishEncounter(state) {
    const cs = state.cutscene;
    if (!cs) return;
    const enc = cs.encounter;
    ensureFlags(state);
    state.flags.encountersDone.add(enc.id);
    if (enc.chain) {
      state.flags.chains[enc.chain] = (state.flags.chains[enc.chain] || 0) + 1;
      // Park the chain in cooldown so the next encounter in this chain
      // can't fire immediately if its threshold is already satisfied.
      state.flags.chainCooldowns[enc.chain] =
        ((state.player && state.player.steps) || 0) + CHAIN_COOLDOWN_STEPS;
      // Reset visit counts for any home character bound to this chain so
      // their next walk-up dialog opens with the new phase's "first" lines.
      const list = (window.PR_STORY_ENCOUNTERS && window.PR_STORY_ENCOUNTERS.STORY_CHARACTERS) || [];
      for (const c of list) {
        if (c.chain === enc.chain) state.flags.npcVisits[c.id] = 0;
      }
    }
    state.cutscene = null;
    state.mode = 'overworld';
    if (window.PR_SAVE && window.PR_SAVE.save) window.PR_SAVE.save(state);
    // Try to drain another queued encounter (e.g. catch + level_up arriving
    // in the same frame — the second one queues; this lets it fire next).
    setTimeout(() => drainQueue(state), 100);
  }

  // ---- Home characters: registry lookup + state-aware dialog ------------

  function findCharacter(id) {
    const list = (window.PR_STORY_ENCOUNTERS && window.PR_STORY_ENCOUNTERS.STORY_CHARACTERS) || [];
    return list.find(c => c.id === id) || null;
  }

  // Resolve a phase entry to a flat array of strings. Handles the three
  // shapes used in the registry:
  //   - undefined / null      -> null (caller falls back)
  //   - string[]              -> returned as-is
  //   - (state) -> string[]   -> called and returned
  function resolveLines(entry, state) {
    if (!entry) return null;
    if (typeof entry === 'function') {
      try { return entry(state); }
      catch (err) { console.warn('[story] line fn threw', err); return null; }
    }
    if (Array.isArray(entry)) return entry;
    return null;
  }

  // Auto-prefix the speaker name unless a line already includes a colon
  // or the speaker is empty. Cosmetic — keeps dialog consistent with
  // cutscenes which do the same prefix.
  function prefixWithName(name, lines) {
    if (!name || !Array.isArray(lines)) return lines || ['...'];
    return lines.map((l, i) => {
      const s = String(l == null ? '' : l);
      if (i === 0 && s && s.indexOf(':') === -1 && s[0] !== '(' && s[0] !== '.') {
        return name + ': ' + s;
      }
      return s;
    });
  }

  // Pick the first phase whose chainStep < phase.upTo (Infinity caps the
  // last phase) AND any extra `condition(state)` returns true. If multiple
  // phases share an upTo (used for non-chain-driven characters who key on
  // dex types or counters), we pick the first whose condition matches.
  function pickPhase(c, state) {
    const chainStep = c.chain ? (state.flags.chains[c.chain] || 0) : 0;
    for (const phase of c.phases || []) {
      const cap = phase.upTo === undefined ? Infinity : phase.upTo;
      if (chainStep >= cap && cap !== Infinity) continue;
      // Phases with cap === 0 are condition-only (no chainStep gating).
      if (phase.condition) {
        try { if (!phase.condition(state)) continue; }
        catch (_) { continue; }
      }
      return phase;
    }
    // Fallback: last phase if all conditions failed.
    return (c.phases && c.phases[c.phases.length - 1]) || null;
  }

  function npcDialog(state, storyId) {
    const c = findCharacter(storyId);
    if (!c) return ['...'];
    ensureFlags(state);
    const visits = (state.flags.npcVisits[storyId] || 0) + 1;
    state.flags.npcVisits[storyId] = visits;
    const phase = pickPhase(c, state);
    if (!phase) return ['...'];
    let lines = null;
    if (visits === 1) {
      lines = resolveLines(phase.firstFn, state) || resolveLines(phase.first, state);
    } else if (visits === 2) {
      lines = resolveLines(phase.second, state) || resolveLines(phase.first, state);
    } else if (visits === 3) {
      lines = resolveLines(phase.third, state) || resolveLines(phase.second, state) ||
              resolveLines(phase.first, state);
    } else {
      const rot = phase.idle || phase.rotation || [phase.first];
      const idx = ((visits - 4) % rot.length + rot.length) % rot.length;
      lines = resolveLines(rot[idx], state);
      if (!lines) lines = resolveLines(phase.first, state);
    }
    if (!lines || !lines.length) return ['...'];
    return prefixWithName(c.name, lines);
  }

  // Install all home characters as resident NPCs in their `home.map`.
  // Mutates the static MAPS table (idempotent — won't add duplicates if
  // called twice during hot reload).
  function installCharacterHomes(MAPS) {
    if (!MAPS) return;
    const list = (window.PR_STORY_ENCOUNTERS && window.PR_STORY_ENCOUNTERS.STORY_CHARACTERS) || [];
    for (const c of list) {
      if (!c.home || !c.home.map) continue;
      const m = MAPS[c.home.map];
      if (!m) continue;
      if (!m.npcs) m.npcs = [];
      // Skip if already installed (storyId match).
      if (m.npcs.some(n => n.storyId === c.id)) continue;
      // Optionally remove existing static NPC sharing the sprite/name (for
      // BLAINE in rival_house, who's defined statically there today).
      if (c.home.replaceExisting) {
        m.npcs = m.npcs.filter(n => n.name !== c.name && n.sprite !== c.sprite);
      }
      m.npcs.push({
        x: c.home.x, y: c.home.y, dir: c.home.dir || 'down',
        sprite: c.sprite, name: c.name, storyId: c.id,
        dialog: ['...']
      });
    }
  }

  // Public API
  window.PR_STORY = {
    emit, tryEncounter, isPlaying, startEncounter, tickCutscene,
    renderCutsceneNpc, drainQueue, findEncounter, ensureFlags,
    badgeCount, caughtCount, partyMaxLevel, partyHasType,
    npcDialog, installCharacterHomes, findCharacter
  };

  // Install home NPCs into the static MAPS table immediately. Script
  // load order ensures js/maps.js and js/story_encounters.js have
  // already populated their globals.
  if (window.PR_MAPS && window.PR_MAPS.MAPS) {
    installCharacterHomes(window.PR_MAPS.MAPS);
  }
})();
