// Generate assets/atlas-gb-pocket.png + atlas-gb-pocket.json + the
// sprites-gb-pocket/ directory by mapping every Game-Boy-Red pixel
// from the 4-tone green DMG palette to the matching greyscale shade
// from the Game Boy Pocket B&W LCD.
//
// Run: node tools/derive-gb-pocket.js
//
// The headless-browser generator (tools/run-generator.js) is the
// canonical way to author new atlases, but it requires Playwright +
// Chromium. This one-off script derives the pocket atlas from the
// already-generated gb_red assets using just node's built-in
// zlib + a minimal PNG codec — so the new era can land in CI-free
// environments.
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');

// Greyscale 4-tone palette for the Pocket LCD. Indexed by luminance
// bucket — must match the lum thresholds in atlas-art.js applyGbRed
// so the recolour stays consistent with the existing atlas.
const POCKET = [
  [22, 22, 26],
  [80, 80, 88],
  [160, 160, 168],
  [222, 222, 226]
];

// --------------------------------------------------------------------
// PNG decode (lifted in spirit from tools/validate-atlases.js).
// --------------------------------------------------------------------
function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function readPng(buf) {
  const sig = '89504e470d0a1a0a';
  if (buf.subarray(0, 8).toString('hex') !== sig) throw new Error('not a PNG');
  let offset = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset); offset += 4;
    const type = buf.subarray(offset, offset + 4).toString('ascii'); offset += 4;
    const data = buf.subarray(offset, offset + len); offset += len;
    offset += 4;
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') break;
  }
  if (bitDepth !== 8 || (colorType !== 6 && colorType !== 2)) {
    throw new Error(`unsupported PNG bitDepth=${bitDepth} colorType=${colorType}`);
  }
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(width * height * channels);
  let rawOffset = 0, outOffset = 0;
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[rawOffset++];
    const row = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const src = raw[rawOffset + x];
      const left = x >= channels ? row[x - channels] : 0;
      const up = prev[x] || 0;
      const upLeft = x >= channels ? prev[x - channels] : 0;
      let delta = 0;
      if (filter === 1) delta = left;
      else if (filter === 2) delta = up;
      else if (filter === 3) delta = (left + up) >> 1;
      else if (filter === 4) delta = paeth(left, up, upLeft);
      else if (filter !== 0) throw new Error('bad PNG filter ' + filter);
      row[x] = (src + delta) & 255;
    }
    rawOffset += stride;
    row.copy(out, outOffset);
    outOffset += stride;
    prev = row;
  }
  // If the source was RGB (no alpha), expand to RGBA so the writer
  // below can emit a uniform RGBA PNG.
  if (channels === 3) {
    const rgba = Buffer.alloc(width * height * 4);
    for (let i = 0, j = 0; i < out.length; i += 3, j += 4) {
      rgba[j] = out[i]; rgba[j+1] = out[i+1]; rgba[j+2] = out[i+2]; rgba[j+3] = 255;
    }
    return { width, height, channels: 4, data: rgba };
  }
  return { width, height, channels, data: out };
}

// --------------------------------------------------------------------
// PNG encode (RGBA 8-bit, filter type 0 / "None" on every row —
// browsers render this cleanly even though it isn't the smallest).
// --------------------------------------------------------------------
const CRC_TABLE = (function() {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xff];
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const tBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([tBuf, data])), 0);
  return Buffer.concat([len, tBuf, data, crc]);
}

function writePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;     // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// --------------------------------------------------------------------
// Pixel transform (DMG green tones → Pocket greys).
// --------------------------------------------------------------------
function toPocket(rgba) {
  const out = Buffer.from(rgba);
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] < 8) continue;
    const lum = out[i] * 0.2126 + out[i + 1] * 0.7152 + out[i + 2] * 0.0722;
    const idx = lum < 66 ? 0 : lum < 128 ? 1 : lum < 190 ? 2 : 3;
    const p = POCKET[idx];
    out[i] = p[0]; out[i + 1] = p[1]; out[i + 2] = p[2];
  }
  return out;
}

function convertPng(inputPath, outputPath) {
  const buf = fs.readFileSync(inputPath);
  const img = readPng(buf);
  const pocket = toPocket(img.data);
  fs.writeFileSync(outputPath, writePng(img.width, img.height, pocket));
}

// --------------------------------------------------------------------
// Driver
// --------------------------------------------------------------------
function run() {
  // 1. Main atlas image.
  const srcAtlasPng = path.join(ASSETS, 'atlas-gb-red.png');
  const dstAtlasPng = path.join(ASSETS, 'atlas-gb-pocket.png');
  convertPng(srcAtlasPng, dstAtlasPng);
  const atlasBytes = fs.statSync(dstAtlasPng).size;
  console.log('wrote', path.relative(ROOT, dstAtlasPng), '(' + atlasBytes + ' bytes)');

  // 2. Atlas JSON — coords/keys identical to gb_red, but the
  // style metadata + image filename must be rewritten so
  // validate-atlases.js doesn't flag a mismatch.
  const srcAtlasJson = path.join(ASSETS, 'atlas-gb-red.json');
  const dstAtlasJson = path.join(ASSETS, 'atlas-gb-pocket.json');
  const j = JSON.parse(fs.readFileSync(srcAtlasJson, 'utf8'));
  j.style = { id:'gb_pocket', label:'GB POCKET' };
  j.image = 'atlas-gb-pocket.png';
  fs.writeFileSync(dstAtlasJson, JSON.stringify(j));
  console.log('wrote', path.relative(ROOT, dstAtlasJson));

  // 3. Per-asset sprites directory.
  const srcSprites = path.join(ASSETS, 'sprites-gb-red');
  const dstSprites = path.join(ASSETS, 'sprites-gb-pocket');
  fs.mkdirSync(dstSprites, { recursive: true });
  let count = 0;
  for (const file of fs.readdirSync(srcSprites)) {
    if (!file.endsWith('.png')) continue;
    convertPng(path.join(srcSprites, file), path.join(dstSprites, file));
    count++;
  }
  console.log('wrote', count, 'sprite PNGs to', path.relative(ROOT, dstSprites));
}

run();
