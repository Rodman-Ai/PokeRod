// Headless smoke test: load the game via a static server, dismiss the
// title overlay to enter the world, take a screenshot of the canvas, and
// verify the atlas loaded and the world is rendering tiles.
'use strict';

const path = require('path');
const fs = require('fs');
const http = require('http');
const url = require('url');

const ROOT = path.resolve(__dirname, '..');
const PORT = 5175;

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
  try { playwright = require('playwright'); }
  catch (e) {
    const g = require('child_process').execSync('npm root -g').toString().trim();
    playwright = require(path.join(g, 'playwright'));
  }
  const { chromium } = playwright;

  const server = await startStaticServer(ROOT, PORT);
  const browser = await chromium.launch({ headless: true });
  let exitCode = 0;
  try {
    const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 } });
    const page = await ctx.newPage();
    page.on('console', (msg) => console.log('[page]', msg.type(), msg.text()));
    page.on('pageerror', (err) => { console.error('[pageerror]', err.message); exitCode = 1; });
    await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load' });
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
