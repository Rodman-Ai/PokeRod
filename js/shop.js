// Mart shop UI: browse-and-buy a tier-gated inventory.
'use strict';

(function(){
  const QTY_OPTIONS = [1, 5, 10];

  function open(state, npc) {
    if (!window.PR_ITEMS) return;
    window.PR_ITEMS.ensureBag(state);
    const inv = window.PR_ITEMS.computeShopInventory(npc.shop || {}, state);
    state.shopView = {
      npc,
      list: inv,
      idx: 0,
      qtyIdx: 0,
      mode: 'browse',  // 'browse' | 'qty'
      flash: null,
      flashUntil: 0
    };
    state.mode = 'shop';
    if (window.PR_SFX) window.PR_SFX.play('confirm');
  }

  function close(state) {
    state.shopView = null;
    state.mode = 'overworld';
  }

  function update(state) {
    const I = window.PR_INPUT;
    const v = state.shopView;
    if (!v) { state.mode = 'overworld'; return; }
    const items = v.list;
    if (v.mode === 'browse') {
      if (I.consumePressed('ArrowDown') && items.length) {
        v.idx = (v.idx + 1) % items.length;
        if (window.PR_SFX) window.PR_SFX.play('select');
      }
      if (I.consumePressed('ArrowUp') && items.length) {
        v.idx = (v.idx + items.length - 1) % items.length;
        if (window.PR_SFX) window.PR_SFX.play('select');
      }
      if (I.consumePressed('x')) { close(state); return; }
      if (I.consumePressed('z') || I.consumePressed('Enter')) {
        if (!items.length) return;
        v.qtyIdx = 0;
        v.mode = 'qty';
        if (window.PR_SFX) window.PR_SFX.play('confirm');
      }
      return;
    }
    // qty mode
    if (I.consumePressed('ArrowLeft')) {
      v.qtyIdx = (v.qtyIdx + QTY_OPTIONS.length - 1) % QTY_OPTIONS.length;
      if (window.PR_SFX) window.PR_SFX.play('select');
    }
    if (I.consumePressed('ArrowRight')) {
      v.qtyIdx = (v.qtyIdx + 1) % QTY_OPTIONS.length;
      if (window.PR_SFX) window.PR_SFX.play('select');
    }
    if (I.consumePressed('x')) { v.mode = 'browse'; return; }
    if (I.consumePressed('z') || I.consumePressed('Enter')) {
      const id = items[v.idx];
      const qty = QTY_OPTIONS[v.qtyIdx];
      buy(state, id, qty);
      v.mode = 'browse';
    }
  }

  function buy(state, itemId, qty) {
    const v = state.shopView;
    const def = window.PR_ITEMS.ITEMS[itemId];
    if (!def) { flash(v, 'Unknown item.'); return; }
    const price = (def.price | 0) * qty;
    if (state.player.money < price) {
      flash(v, 'Not enough money.');
      if (window.PR_SFX) window.PR_SFX.play('error');
      return;
    }
    state.player.money -= price;
    window.PR_ITEMS.add(state, itemId, qty);
    flash(v, 'Bought ' + qty + ' x ' + def.name + '.');
    if (window.PR_SFX) window.PR_SFX.play('confirm');
    if (window.PR_SAVE) window.PR_SAVE.save(state);
  }

  function flash(v, msg) {
    v.flash = msg;
    v.flashUntil = (typeof performance !== 'undefined' ? performance.now() : Date.now()) + 1400;
  }

  function draw(ctx, state, viewW, viewH) {
    const v = state.shopView;
    if (!v) return;
    const x = 4, y = 4, w = viewW - 8, h = viewH - 8;
    window.PR_UI.panel(ctx, x, y, w, h, { fill:'#fff8e8', border:'#202020', shadow:'#c89048' });
    // Header
    const shopName = (v.npc && v.npc.name) || 'MART';
    window.PR_UI.drawText(ctx, shopName, x + 6, y + 4, '#202020');
    window.PR_UI.drawText(ctx, '$' + state.player.money, x + w - 56, y + 4, '#385890');
    window.PR_UI.drawText(ctx, 'X:EXIT', x + w - 28, y + 4, '#806040');
    // Divider
    ctx.fillStyle = '#202020';
    ctx.fillRect(x + 4, y + 14, w - 8, 1);

    const items = v.list;
    const listX = x + 5, listY = y + 18, listW = 104;
    const detailX = x + 114, detailY = y + 18, detailW = w - 119, detailH = h - 58;
    const rows = 7, rowH = 13;
    if (!items.length) {
      window.PR_UI.drawText(ctx, 'No items in stock.', x + 8, listY, '#806040');
      return;
    }
    const start = Math.max(0, Math.min(items.length - rows, v.idx - 3));
    for (let r = 0; r < rows; r++) {
      const i = start + r;
      if (i >= items.length) break;
      const cy = listY + r * rowH;
      const id = items[i];
      const def = window.PR_ITEMS.ITEMS[id];
      if (!def) continue;
      if (i === v.idx) window.PR_UI.selectBar(ctx, listX, cy - 1, listW, 12, true);
      if (window.PR_ITEMS.drawIcon) window.PR_ITEMS.drawIcon(ctx, id, listX + 2, cy, 10);
      window.PR_UI.drawText(ctx, def.name.slice(0, 8), listX + 17, cy + 2, '#202020');
      const owned = (state.player.bag && state.player.bag[id]) || 0;
      if (owned > 0) {
        window.PR_UI.drawText(ctx, 'x' + owned, listX + listW - 55, cy + 2, '#806040');
      }
      window.PR_UI.drawText(ctx, '$' + (def.price | 0), listX + listW - 34, cy + 2, '#385890');
    }
    // Detail card + qty prompt or hint
    const sel = items[v.idx];
    const selDef = sel ? window.PR_ITEMS.ITEMS[sel] : null;
    if (selDef && window.PR_ITEMS.drawCard) {
      const owned = (state.player.bag && state.player.bag[sel]) || 0;
      window.PR_ITEMS.drawCard(ctx, sel, detailX, detailY, detailW, detailH, {
        price:selDef.price | 0, count:owned, lines:3, compact:true
      });
    }
    const footerY = y + h - 28;
    ctx.fillStyle = '#202020';
    ctx.fillRect(x + 4, footerY - 2, w - 8, 1);
    if (v.mode === 'qty') {
      // Quantity selector strip
      const stripY = y + h - 22;
      window.PR_UI.drawText(ctx, 'QTY:', x + 8, stripY, '#202020');
      let cx = x + 32;
      for (let i = 0; i < QTY_OPTIONS.length; i++) {
        const txt = String(QTY_OPTIONS[i]);
        if (i === v.qtyIdx) {
          ctx.fillStyle = '#f0c020';
          ctx.fillRect(cx - 2, stripY - 1, 14, 9);
        }
        window.PR_UI.drawText(ctx, txt, cx, stripY, '#202020');
        cx += 16;
      }
      const totalQty = QTY_OPTIONS[v.qtyIdx];
      const totalCost = (selDef ? (selDef.price | 0) : 0) * totalQty;
      window.PR_UI.drawText(ctx, ('TOTAL $' + totalCost).slice(0, 12), x + w - 72, stripY, '#385890');
      window.PR_UI.drawText(ctx, 'A:OK  B:BACK', x + 8, y + h - 10, '#806040');
    } else {
      window.PR_UI.drawText(ctx, 'Z:BUY  X:EXIT', x + 8, y + h - 12, '#806040');
    }
    // Flash message
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (v.flash && now < v.flashUntil) {
      ctx.fillStyle = '#202020';
      ctx.fillRect(x + 4, y + 14, w - 8, 9);
      window.PR_UI.drawText(ctx, v.flash, x + 8, y + 15, '#fff');
    }
  }

  window.PR_SHOP = { open, close, update, draw };
})();
