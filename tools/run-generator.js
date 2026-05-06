// Headless atlas generator runner. Loads tools/generate-atlas.html in a
// Chromium browser (via Playwright), invokes window.__pokerodGenerate(),
// and writes the resulting PNG + JSON + per-asset PNGs to disk.
//
// Usage:  node tools/run-generator.js
//
// Outputs:
//   assets/atlas*.png
//   assets/atlas*.json
//   assets/sprites*/<key>.png   (one PNG per asset for individual editing)
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

function dataUrlToBuffer(dataUrl) {
  const m = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!m) throw new Error('not a base64 data URL');
  return Buffer.from(m[2], 'base64');
}

async function main() {
  // Resolve playwright from globally installed npm modules.
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
    const globalNodeModules = require('child_process').execSync('npm root -g').toString().trim();
    playwright = require(path.join(globalNodeModules, 'playwright'));
  }
  const { chromium } = playwright;

  console.log('starting static server...');
  const server = await startStaticServer(ROOT, PORT);

  console.log('launching headless chromium...');
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
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 1280 } });
    const page = await ctx.newPage();
    page.on('console', (msg) => console.log('[page]', msg.type(), msg.text()));
    page.on('pageerror', (err) => console.error('[pageerror]', err.message));
    const target = 'http://127.0.0.1:' + server.address().port + '/tools/generate-atlas.html';
    console.log('loading', target);
    await page.goto(target, { waitUntil: 'load' });
    // Wait for the generator hook to attach.
    await page.waitForFunction(() => typeof window.__pokerodGenerate === 'function', { timeout: 15000 });
    console.log('running generator...');
    const results = await page.evaluate(async () => {
      return await window.__pokerodGenerateAll();
    });

    const assetsDir = path.join(ROOT, 'assets');
    fs.mkdirSync(assetsDir, { recursive: true });
    for (const result of results) {
      const style = result.style || {};
      const imageName = style.image || 'atlas.png';
      const jsonName = style.json || 'atlas.json';
      const spritesDir = path.join(assetsDir, style.spritesDir || 'sprites');
      console.log('counts:', style.label || style.id, result.counts, 'atlas:', result.width + 'x' + result.height);

      fs.mkdirSync(spritesDir, { recursive: true });
      fs.writeFileSync(path.join(assetsDir, imageName), dataUrlToBuffer(result.atlasPng));
      fs.writeFileSync(path.join(assetsDir, jsonName), result.atlasJson);
      console.log('wrote assets/' + imageName + ' and assets/' + jsonName);

      let n = 0;
      for (const [key, dataUrl] of Object.entries(result.perAssetPNGs)) {
        fs.writeFileSync(path.join(spritesDir, key + '.png'), dataUrlToBuffer(dataUrl));
        n++;
      }
      console.log('wrote', n, 'per-asset PNGs to assets/' + (style.spritesDir || 'sprites') + '/');
    }
  } finally {
    await browser.close();
    server.close();
  }
  console.log('done.');
}

main().catch((e) => { console.error(e); process.exit(1); });
