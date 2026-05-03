// Headless PWA icon generator. Loads tools/generate-icons.html in a
// Chromium browser (via Playwright), invokes window.__pokerodGenerateIcons(),
// and writes the resulting PNGs to assets/icon-{192,512}.png.
//
// Usage:  node tools/run-icons-generator.js
'use strict';

const path = require('path');
const fs = require('fs');
const http = require('http');
const url = require('url');

const ROOT = path.resolve(__dirname, '..');
const PORT = 5176;

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
  let playwright;
  try { playwright = require('playwright'); }
  catch (e) {
    const g = require('child_process').execSync('npm root -g').toString().trim();
    playwright = require(path.join(g, 'playwright'));
  }
  const { chromium } = playwright;

  console.log('starting static server...');
  const server = await startStaticServer(ROOT, PORT);
  console.log('launching headless chromium...');
  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({ viewport: { width: 800, height: 800 } });
    const page = await ctx.newPage();
    page.on('console', (msg) => console.log('[page]', msg.type(), msg.text()));
    page.on('pageerror', (err) => console.error('[pageerror]', err.message));
    const target = 'http://127.0.0.1:' + PORT + '/tools/generate-icons.html';
    await page.goto(target, { waitUntil: 'load' });
    await page.waitForFunction(() => typeof window.__pokerodGenerateIcons === 'function', { timeout: 10000 });
    const result = await page.evaluate(async () => window.__pokerodGenerateIcons());
    const assetsDir = path.join(ROOT, 'assets');
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.writeFileSync(path.join(assetsDir, 'icon-512.png'), dataUrlToBuffer(result.icon512));
    fs.writeFileSync(path.join(assetsDir, 'icon-192.png'), dataUrlToBuffer(result.icon192));
    console.log('wrote assets/icon-512.png and assets/icon-192.png');
  } finally {
    await browser.close();
    server.close();
  }
  console.log('done.');
}

main().catch((e) => { console.error(e); process.exit(1); });
