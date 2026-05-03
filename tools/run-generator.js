// Headless atlas generator runner. Loads tools/generate-atlas.html in a
// Chromium browser (via Playwright), invokes window.__pokerodGenerate(),
// and writes the resulting PNG + JSON + per-asset PNGs to disk.
//
// Usage:  node tools/run-generator.js
//
// Outputs:
//   assets/atlas.png
//   assets/atlas.json
//   assets/sprites/<key>.png   (one PNG per asset for individual editing)
'use strict';

const path = require('path');
const fs = require('fs');
const http = require('http');
const url = require('url');

const ROOT = path.resolve(__dirname, '..');
const PORT = 5174;

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

function dataUrlToBuffer(dataUrl) {
  const m = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!m) throw new Error('not a base64 data URL');
  return Buffer.from(m[2], 'base64');
}

async function main() {
  // Resolve playwright from globally installed npm modules.
  let playwright;
  try {
    playwright = require('playwright');
  } catch (e) {
    const globalNodeModules = require('child_process').execSync('npm root -g').toString().trim();
    playwright = require(path.join(globalNodeModules, 'playwright'));
  }
  const { chromium } = playwright;

  console.log('starting static server...');
  const server = await startStaticServer(ROOT, PORT);

  console.log('launching headless chromium...');
  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 1280 } });
    const page = await ctx.newPage();
    page.on('console', (msg) => console.log('[page]', msg.type(), msg.text()));
    page.on('pageerror', (err) => console.error('[pageerror]', err.message));
    const target = 'http://127.0.0.1:' + PORT + '/tools/generate-atlas.html';
    console.log('loading', target);
    await page.goto(target, { waitUntil: 'load' });
    // Wait for the generator hook to attach.
    await page.waitForFunction(() => typeof window.__pokerodGenerate === 'function', { timeout: 15000 });
    console.log('running generator...');
    const result = await page.evaluate(async () => {
      const r = await window.__pokerodGenerate();
      return r;
    });
    console.log('counts:', result.counts, 'atlas:', result.width + 'x' + result.height);

    // Write atlas.png + atlas.json.
    const assetsDir = path.join(ROOT, 'assets');
    const spritesDir = path.join(assetsDir, 'sprites');
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.mkdirSync(spritesDir, { recursive: true });
    fs.writeFileSync(path.join(assetsDir, 'atlas.png'), dataUrlToBuffer(result.atlasPng));
    fs.writeFileSync(path.join(assetsDir, 'atlas.json'), result.atlasJson);
    console.log('wrote assets/atlas.png and assets/atlas.json');

    // Write per-asset PNGs.
    let n = 0;
    for (const [key, dataUrl] of Object.entries(result.perAssetPNGs)) {
      fs.writeFileSync(path.join(spritesDir, key + '.png'), dataUrlToBuffer(dataUrl));
      n++;
    }
    console.log('wrote', n, 'per-asset PNGs to assets/sprites/');
  } finally {
    await browser.close();
    server.close();
  }
  console.log('done.');
}

main().catch((e) => { console.error(e); process.exit(1); });
