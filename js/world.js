// Overworld: tile-by-tile movement, NPCs, encounters, transitions.
'use strict';

(function(){
  const TS = 16;
  const VIEW_W = 240, VIEW_H = 160;
  const VIEW_TX = VIEW_W / TS; // 15
  const VIEW_TY = VIEW_H / TS; // 10

  function World(state) {
    this.state = state;
    this.player = state.player;
    this.anim = { moving:false, fromX:0, fromY:0, t:0, duration:0.16 };
    this.frame = 0;            // walk anim frame
    this.frameTimer = 0;
    this.npcFrameTimer = 0;
    this.npcFrame = 0;
    this.encounterCooldown = 0;
    this.justEntered = true;
    this._ambient = [];
    this._initAmbient();
  }

  World.prototype._initAmbient = function() {
    const m = this.currentMap();
    this._ambient = [];
    if (!m || !m.ambient) return;
    for (const a of m.ambient) {
      this._ambient.push({
        species: a.species,
        x: a.x, y: a.y,
        homeX: a.x, homeY: a.y,
        range: a.range || 2,
        dir: 'down',
        anim: { moving:false, t:0, duration:0.4, fromX:a.x, fromY:a.y, toX:a.x, toY:a.y },
        moveTimer: Math.random() * 2,
        nextDelay: 1.5 + Math.random() * 2,
        frame: 0, frameTimer: 0
      });
    }
  };

  World.prototype.currentMap = function() {
    return window.PR_MAPS.MAPS[this.player.map];
  };

  World.prototype.tileAt = function(x, y) {
    const m = this.currentMap();
    return window.PR_MAPS.tileAt(m, x, y);
  };

  World.prototype.canWalk = function(x, y, dir) {
    const code = this.tileAt(x, y);
    const props = window.PR_MAPS.TILE_PROPS[code];
    if (!props) return false;
    if (props.walk === true) {
      // No NPC blocking?
      return !this.npcAt(x, y);
    }
    if (props.walk === 'south' && dir === 'down') return !this.npcAt(x, y);
    return false;
  };

  World.prototype.npcAt = function(x, y) {
    const m = this.currentMap();
    if (!m.npcs) return null;
    for (const n of m.npcs) {
      if (n.x === x && n.y === y) return n;
    }
    return null;
  };

  World.prototype.tryMove = function(dir) {
    if (this.anim.moving) return;
    const p = this.player;
    p.dir = dir;
    let nx = p.x, ny = p.y;
    if (dir === 'up') ny--;
    else if (dir === 'down') ny++;
    else if (dir === 'left') nx--;
    else if (dir === 'right') nx++;

    const code = this.tileAt(nx, ny);
    const props = window.PR_MAPS.TILE_PROPS[code];

    // Edge transition
    if (code === 'X') {
      this.tryEdgeTransition(nx, ny);
      return;
    }

    if (!props || (!props.walk && props.walk !== 'south')) {
      this.frameTimer = 0; // bump
      window.PR_SFX && window.PR_SFX.play('bump');
      return;
    }
    if (props.walk === 'south' && dir !== 'down') return;
    if (this.npcAt(nx, ny)) return;

    // Ledge: jump 2 tiles south.
    if (code === 'L') {
      const after = this.tileAt(nx, ny + 1);
      const afterProps = window.PR_MAPS.TILE_PROPS[after];
      if (afterProps && afterProps.walk === true) {
        this.startMove(p.x, p.y, nx, ny + 1, 0.28);
        return;
      }
    }

    this.startMove(p.x, p.y, nx, ny, this.anim.duration);
  };

  World.prototype.startMove = function(fx, fy, tx, ty, dur) {
    this.anim.moving = true;
    this.anim.fromX = fx; this.anim.fromY = fy;
    this.anim.toX = tx;   this.anim.toY = ty;
    this.anim.t = 0;
    this.anim.duration = dur || 0.16;
  };

  World.prototype.tryEdgeTransition = function(nx, ny) {
    const m = this.currentMap();
    if (!m.edges) return;
    for (const side of Object.keys(m.edges)) {
      const e = m.edges[side];
      if ((side === 'north' && ny <= e.y) ||
          (side === 'south' && ny >= e.y) ||
          (side === 'east'  && nx >= e.y) ||
          (side === 'west'  && nx <= e.y)) {
        this.transitionTo(e.to, e.tx, e.ty);
        return;
      }
    }
  };

  World.prototype.tryDoorAt = function(x, y) {
    const m = this.currentMap();
    if (!m.doors) return false;
    const key = x + ',' + y;
    const door = m.doors[key];
    if (!door) return false;
    this.transitionTo(door.to, door.x, door.y);
    return true;
  };

  World.prototype.transitionTo = function(mapId, x, y) {
    this.player.map = mapId;
    this.player.x = x;
    this.player.y = y;
    this.anim.moving = false;
    this.justEntered = true;
    this._initAmbient();
    if (this.state.onMapChange) this.state.onMapChange();
  };

  World.prototype.tryInteract = function() {
    const p = this.player;
    let ix = p.x, iy = p.y;
    if (p.dir === 'up') iy--;
    else if (p.dir === 'down') iy++;
    else if (p.dir === 'left') ix--;
    else if (p.dir === 'right') ix++;

    const npc = this.npcAt(ix, iy);
    if (npc) {
      // Face the player.
      const opp = { up:'down', down:'up', left:'right', right:'left' };
      npc.dir = opp[p.dir] || npc.dir;
      this.state.onNpcInteract(npc);
      return true;
    }
    // Ambient creature on the facing tile (or its lerp destination).
    const amb = this._ambientAt && this._ambientAt(ix, iy, null);
    if (amb && this.state.onAmbient) {
      const opp2 = { up:'down', down:'up', left:'right', right:'left' };
      amb.dir = opp2[p.dir] || amb.dir;
      // Pause this ambient briefly so it stays put for the chat.
      amb.moveTimer = 0;
      amb.nextDelay = 1.5 + Math.random() * 1.5;
      this.state.onAmbient(amb);
      return true;
    }
    const m = this.currentMap();
    const code = this.tileAt(ix, iy);
    if (code === 'S' && m.signs) {
      const text = m.signs[ix + ',' + iy];
      if (text) { this.state.onSign(text); return true; }
    }
    if (code === 'H') {
      this.state.onHealer();
      return true;
    }
    return false;
  };

  World.prototype._ambientAt = function(x, y, exclude) {
    if (!this._ambient) this._ambient = [];
    for (const a of this._ambient) {
      if (a === exclude) continue;
      // Block both source and destination tiles while lerping.
      if ((a.x === x && a.y === y) ||
          (a.anim.moving && a.anim.toX === x && a.anim.toY === y)) return a;
    }
    return null;
  };

  World.prototype._isAmbientWalkable = function(x, y, a) {
    const code = this.tileAt(x, y);
    const props = window.PR_MAPS.TILE_PROPS[code];
    if (!props || props.walk !== true) return false;
    if (this.npcAt(x, y)) return false;
    if (this.player.x === x && this.player.y === y) return false;
    if (this.anim.moving && this.anim.toX === x && this.anim.toY === y) return false;
    if (this._ambientAt(x, y, a)) return false;
    return true;
  };

  World.prototype._updateAmbient = function(dt) {
    for (const a of this._ambient) {
      a.frameTimer += dt;
      if (a.frameTimer > 0.35) { a.frameTimer = 0; a.frame ^= 1; }
      if (a.anim.moving) {
        a.anim.t += dt;
        if (a.anim.t >= a.anim.duration) {
          a.x = a.anim.toX; a.y = a.anim.toY;
          a.anim.moving = false;
          a.moveTimer = 0;
          a.nextDelay = 1.5 + Math.random() * 2;
        }
        continue;
      }
      a.moveTimer += dt;
      if (a.moveTimer < a.nextDelay) continue;
      // Try a random cardinal step within range from home.
      const dirs = ['up','down','left','right'];
      // Shuffle so we don't bias direction.
      for (let i = dirs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = dirs[i]; dirs[i] = dirs[j]; dirs[j] = t;
      }
      let moved = false;
      for (const d of dirs) {
        let nx = a.x, ny = a.y;
        if (d === 'up') ny--;
        else if (d === 'down') ny++;
        else if (d === 'left') nx--;
        else if (d === 'right') nx++;
        if (Math.abs(nx - a.homeX) > a.range) continue;
        if (Math.abs(ny - a.homeY) > a.range) continue;
        if (!this._isAmbientWalkable(nx, ny, a)) continue;
        a.dir = d;
        a.anim.moving = true;
        a.anim.t = 0;
        a.anim.fromX = a.x; a.anim.fromY = a.y;
        a.anim.toX = nx;    a.anim.toY = ny;
        moved = true;
        break;
      }
      if (!moved) {
        // Idle - look around occasionally.
        a.dir = dirs[0];
        a.moveTimer = 0;
        a.nextDelay = 1.0 + Math.random() * 1.5;
      }
    }
  };

  World.prototype.update = function(dt) {
    this.frameTimer += dt;
    this.npcFrameTimer += dt;
    if (this.npcFrameTimer > 0.5) { this.npcFrameTimer = 0; this.npcFrame ^= 1; }
    if (this._ambient && this._ambient.length) {
      try { this._updateAmbient(dt); }
      catch (err) {
        console.error('[PokeRod] ambient tick error:', err);
        this._ambient = [];
      }
    }

    if (this.anim.moving) {
      this.anim.t += dt;
      const k = Math.min(1, this.anim.t / this.anim.duration);
      if (k >= 1) {
        const wasOnLedge = false;
        this.player.x = this.anim.toX;
        this.player.y = this.anim.toY;
        this.anim.moving = false;
        this.player.steps = (this.player.steps || 0) + 1;
        this.frame ^= 1;
        // Check for door / encounter / edge after step.
        const code = this.tileAt(this.player.x, this.player.y);
        if (code === 'X') { this.tryEdgeTransition(this.player.x, this.player.y); return; }
        if (this.tryDoorAt(this.player.x, this.player.y)) return;

        const props = window.PR_MAPS.TILE_PROPS[code];
        if (props && props.encounter && this.encounterCooldown <= 0) {
          if (Math.random() < 0.12) {
            this.state.onWildEncounter();
          }
        }
        if (this.encounterCooldown > 0) this.encounterCooldown -= 1;
      }
      return;
    }

    // Read input for movement / interaction.
    const I = window.PR_INPUT;
    if (this.state.onPause && I.consumePressed('Enter')) {
      this.state.onPause();
      return;
    }
    if (I.consumePressed('z')) {
      if (this.tryInteract()) return;
    }
    const dir = I.dirHeld();
    if (dir) {
      this.tryMove(dir);
    }
  };

  // --- Rendering ---
  World.prototype.render = function(ctx) {
    const m = this.currentMap();
    const px = this.getPlayerPx();
    const camX = Math.max(0, Math.min(m.tiles[0].length * TS - VIEW_W, px.x - VIEW_W/2 + TS/2));
    const camY = Math.max(0, Math.min(m.tiles.length * TS - VIEW_H, px.y - VIEW_H/2 + TS/2));

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    const startTx = Math.floor(camX / TS);
    const startTy = Math.floor(camY / TS);
    const offX = -(camX - startTx * TS);
    const offY = -(camY - startTy * TS);

    for (let ty = 0; ty <= VIEW_TY; ty++) {
      for (let tx = 0; tx <= VIEW_TX; tx++) {
        const wx = startTx + tx, wy = startTy + ty;
        if (wy < 0 || wy >= m.tiles.length) continue;
        const row = m.tiles[wy];
        if (wx < 0 || wx >= row.length) continue;
        const code = row[wx];
        window.PR_TILES.drawTile(ctx, code, offX + tx*TS, offY + ty*TS);
      }
    }

    // Ambient roaming creatures (drawn under NPCs/player).
    for (const a of this._ambient) {
      let ax = a.x, ay = a.y;
      if (a.anim.moving) {
        const k = Math.min(1, a.anim.t / a.anim.duration);
        ax = a.anim.fromX + (a.anim.toX - a.anim.fromX) * k;
        ay = a.anim.fromY + (a.anim.toY - a.anim.fromY) * k;
      }
      const sx = ax * TS - camX;
      const sy = ay * TS - camY;
      if (sx < -TS || sx > VIEW_W || sy < -TS || sy > VIEW_H) continue;
      const bob = a.anim.moving
        ? -Math.round(Math.sin(Math.min(1, a.anim.t / a.anim.duration) * Math.PI))
        : (a.frame ? -1 : 0);
      window.PR_MONS.drawCreature(ctx, a.species, sx - 2, sy - 4 + bob, 20, false);
    }

    // NPCs
    if (m.npcs) {
      for (const n of m.npcs) {
        const sx = n.x * TS - camX;
        const sy = n.y * TS - camY;
        if (sx < -TS || sx > VIEW_W || sy < -TS || sy > VIEW_H) continue;
        if (n.sprite === 'ball') {
          // Hide ball if starter taken.
          if (this.state.flags.starterChosen && n.ballSlot !== undefined) continue;
        }
        window.PR_CHARS.drawNpc(ctx, sx, sy, n.sprite, n.dir, this.npcFrame);
      }
    }

    // Player (with mid-step bob + half-step leg swap for a 4-pose walk).
    let bobY = 0, walkFrame = 0;
    if (this.anim.moving) {
      const p = Math.min(1, this.anim.t / this.anim.duration);
      bobY = -Math.round(Math.sin(p * Math.PI));
      walkFrame = this.frame ^ (p > 0.5 ? 1 : 0);
    }
    window.PR_CHARS.drawPlayer(ctx, px.x - camX, (px.y - camY) + bobY, this.player.dir, walkFrame);

    // Map name banner on entry.
    if (this.justEntered) {
      this.bannerTimer = 1.6;
      this.bannerName = m.name;
      this.justEntered = false;
    }
    if (this.bannerTimer > 0) {
      this.bannerTimer -= 1/60;
      const w = Math.min(VIEW_W - 20, this.bannerName.length * 6 + 16);
      const x = (VIEW_W - w) / 2 | 0, y = 8;
      window.PR_UI.box(ctx, x, y, w, 16, '#fff', '#202020');
      window.PR_UI.drawText(ctx, this.bannerName, x + 8, y + 5, '#202020');
    }
  };

  World.prototype.getPlayerPx = function() {
    const p = this.player;
    if (this.anim.moving) {
      const k = Math.min(1, this.anim.t / this.anim.duration);
      const fx = this.anim.fromX + (this.anim.toX - this.anim.fromX) * k;
      const fy = this.anim.fromY + (this.anim.toY - this.anim.fromY) * k;
      return { x: fx * TS, y: fy * TS };
    }
    return { x: p.x * TS, y: p.y * TS };
  };

  window.PR_WORLD = { World };
})();
