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
  }

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

  World.prototype.update = function(dt) {
    this.frameTimer += dt;
    this.npcFrameTimer += dt;
    if (this.npcFrameTimer > 0.5) { this.npcFrameTimer = 0; this.npcFrame ^= 1; }

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

    // Player
    window.PR_CHARS.drawPlayer(ctx, px.x - camX, px.y - camY, this.player.dir, this.anim.moving ? this.frame : 0);

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
