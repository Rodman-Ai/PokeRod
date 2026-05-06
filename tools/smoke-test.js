// Headless smoke test: load the game via a static server, dismiss the
// title overlay to enter the world, take a screenshot of the canvas, and
// verify the atlas loaded and the world is rendering tiles.
'use strict';

const path = require('path');
const fs = require('fs');
const http = require('http');
const url = require('url');

const ROOT = path.resolve(__dirname, '..');
const PORT = 0;

function existingExecutable(candidates) {
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

function startStaticServer(root, port) {
  const mime = {
    '.html':'text/html', '.htm':'text/html',
    '.js':'application/javascript', '.css':'text/css',
    '.json':'application/json', '.png':'image/png',
    '.svg':'image/svg+xml', '.webmanifest':'application/manifest+json'
  };
  const server = http.createServer((req, res) => {
    const u = url.parse(req.url);
    let p = path.normalize(path.join(root, decodeURIComponent(u.pathname)));
    if (!p.startsWith(root)) { res.statusCode = 403; return res.end('forbidden'); }
    fs.stat(p, (err, st) => {
      if (err) { res.statusCode = 404; return res.end('not found'); }
      if (st.isDirectory()) p = path.join(p, 'index.html');
      fs.readFile(p, (err2, buf) => {
        if (err2) { res.statusCode = 404; return res.end('not found'); }
        const ext = path.extname(p).toLowerCase();
        res.setHeader('Content-Type', mime[ext] || 'application/octet-stream');
        res.end(buf);
      });
    });
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

async function main() {
  let playwright;
  const candidates = ['playwright'];
  if (process.env.NODE_PATH) {
    for (const p of process.env.NODE_PATH.split(path.delimiter)) {
      if (p) candidates.push(path.join(p, 'playwright'));
    }
  }
  if (process.env.USERPROFILE) {
    candidates.push(path.join(process.env.USERPROFILE,
      '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
  }
  for (const candidate of candidates) {
    try {
      playwright = require(candidate);
      break;
    } catch (_) {}
  }
  if (!playwright) {
    const g = require('child_process').execSync('npm root -g').toString().trim();
    playwright = require(path.join(g, 'playwright'));
  }
  const { chromium } = playwright;

  const server = await startStaticServer(ROOT, PORT);
  const executablePath = existingExecutable([
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  ]);
  const launchOptions = { headless: true };
  if (executablePath) launchOptions.executablePath = executablePath;
  const browser = await chromium.launch(launchOptions);
  let exitCode = 0;
  try {
    const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 } });
    const page = await ctx.newPage();
    page.on('console', (msg) => console.log('[page]', msg.type(), msg.text()));
    page.on('pageerror', (err) => { console.error('[pageerror]', err.message); exitCode = 1; });
    await page.goto('http://127.0.0.1:' + server.address().port + '/', { waitUntil: 'load' });
    // Wait for atlas to load.
    await page.waitForFunction(() => window.PR_ATLAS && window.PR_ATLAS.isReady(), { timeout: 8000 });
    console.log('atlas loaded');

    // Press Enter many times to: dismiss title, advance intro, choose
    // starter (any), close starter dialog, etc.
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(120);
    }
    // Press z/x a few more times in case the boot uses A/B.
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('z');
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(400);

    // Read the canvas as a data URL.
    const dataUrl = await page.evaluate(() => {
      const c = document.getElementById('game');
      return c ? c.toDataURL('image/png') : null;
    });
    if (!dataUrl) throw new Error('no canvas');
    const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
    const outPath = path.join(ROOT, 'tools/smoke-screenshot.png');
    fs.writeFileSync(outPath, buf);
    console.log('wrote', outPath, 'bytes=', buf.length);

    const styleChecks = await page.evaluate(async () => {
      const styles = ['gb_red', 'gbc_yellow', 'gba_firered', 'ds_diamond'];
      const out = [];
      for (const id of styles) {
        const ok = await window.PR_ATLAS.setPreset(id);
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const c = document.getElementById('game');
        const cx = c.getContext('2d');
        const p = cx.getImageData(c.width / 2 | 0, c.height / 2 | 0, 1, 1).data;
        out.push({ id, ok, active:window.PR_ATLAS.getPreset(), center:[p[0], p[1], p[2], p[3]] });
      }
      return out;
    });
    console.log('style checks:', styleChecks);
    for (const check of styleChecks) {
      const sum = check.center[0] + check.center[1] + check.center[2];
      if (!check.ok || check.active !== check.id || sum === 0) {
        console.error('graphics preset failed:', check);
        exitCode = 2;
      }
    }

    const trainerRouteChecks = await page.evaluate(async () => {
      const cases = [
        { id:'gb_red', map:'route1', x:13, y:19, sprite:'trainer_bug_catcher' },
        { id:'gbc_yellow', map:'route2', x:31, y:26, sprite:'trainer_camper' },
        { id:'gba_firered', map:'searoute', x:37, y:25, sprite:'trainer_sailor' },
        { id:'ds_diamond', map:'desert', x:28, y:30, sprite:'trainer_ruin_maniac' }
      ];
      const out = [];
      for (const t of cases) {
        const ok = await window.PR_ATLAS.setPreset(t.id);
        const state = window.PR_GAME && window.PR_GAME.state;
        if (state) {
          state.mode = 'overworld';
          state.player.map = t.map;
          state.player.x = t.x;
          state.player.y = t.y;
          state.player.dir = 'up';
          if (state.world) state.world.justEntered = true;
        }
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const c = document.getElementById('game');
        const cx = c.getContext('2d');
        let sum = 0;
        for (const [px, py] of [[60,60],[120,80],[180,100],[80,130],[200,40]]) {
          const p = cx.getImageData(px, py, 1, 1).data;
          sum += p[0] + p[1] + p[2] + p[3];
        }
        const map = window.PR_MAPS && window.PR_MAPS.MAPS && window.PR_MAPS.MAPS[t.map];
        const hasNpc = !!(map && map.npcs && map.npcs.some((n) => n.sprite === t.sprite));
        out.push({ id:t.id, map:t.map, sprite:t.sprite, ok, active:window.PR_ATLAS.getPreset(), hasNpc, sum });
      }
      return out;
    });
    console.log('trainer route checks:', trainerRouteChecks);
    for (const check of trainerRouteChecks) {
      if (!check.ok || check.active !== check.id || !check.hasNpc || check.sum === 0) {
        console.error('trainer route render failed:', check);
        exitCode = 2;
      }
    }

    // Force a battle by walking into tall grass repeatedly.
    for (let i = 0; i < 80; i++) {
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(60);
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(60);
      const inBattle = await page.evaluate(() => window.PR_GAME && window.PR_GAME.state && window.PR_GAME.state.mode === 'battle');
      if (inBattle) { console.log('entered battle on step', i); break; }
    }
    await page.waitForTimeout(600);
    const battleUrl = await page.evaluate(() => document.getElementById('game').toDataURL('image/png'));
    const battleBuf = Buffer.from(battleUrl.split(',')[1], 'base64');
    const battlePath = path.join(ROOT, 'tools/smoke-battle.png');
    fs.writeFileSync(battlePath, battleBuf);
    console.log('wrote', battlePath, 'bytes=', battleBuf.length);

    // Inspect canvas size + read a center pixel to verify it's not all black.
    const info = await page.evaluate(() => {
      const c = document.getElementById('game');
      const cx = c.getContext('2d');
      const id = cx.getImageData(c.width / 2 | 0, c.height / 2 | 0, 1, 1).data;
      return { w: c.width, h: c.height, center: [id[0], id[1], id[2], id[3]] };
    });
    console.log('canvas:', info);
    const sum = info.center[0] + info.center[1] + info.center[2];
    if (sum === 0) {
      console.error('center pixel is black; world likely not rendering');
      exitCode = 2;
    }
  } catch (e) {
    console.error('SMOKE FAIL:', e);
    exitCode = 3;
  } finally {
    await browser.close();
    server.close();
  }
  process.exit(exitCode);
}

main();
