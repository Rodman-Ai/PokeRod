// Validate that every graphics preset atlas has matching frame keys,
// complete tile-code coverage, and usable variant metadata.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const STYLES = [
  { id:'gb_red', label:'GB RED', image:'atlas-gb-red.png', json:'atlas-gb-red.json' },
  { id:'gbc_yellow', label:'GBC YELLOW', image:'atlas-gbc-yellow.png', json:'atlas-gbc-yellow.json' },
  { id:'gba_firered', label:'GBA FIRERED', image:'atlas.png', json:'atlas.json' },
  { id:'ds_diamond', label:'DS DIAMOND', image:'atlas-ds-diamond.png', json:'atlas-ds-diamond.json' }
];

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function readPngPixels(filePath) {
  const buf = fs.readFileSync(filePath);
  const sig = '89504e470d0a1a0a';
  if (buf.subarray(0, 8).toString('hex') !== sig) throw new Error(filePath + ': not a PNG');
  let offset = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset); offset += 4;
    const type = buf.subarray(offset, offset + 4).toString('ascii'); offset += 4;
    const data = buf.subarray(offset, offset + len); offset += len;
    offset += 4; // CRC
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }
  if (bitDepth !== 8 || (colorType !== 6 && colorType !== 2)) {
    throw new Error(filePath + `: unsupported PNG format bitDepth=${bitDepth} colorType=${colorType}`);
  }
  const channels = colorType === 6 ? 4 : 3;
  const bpp = channels;
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
      const left = x >= bpp ? row[x - bpp] : 0;
      const up = prev[x] || 0;
      const upLeft = x >= bpp ? prev[x - bpp] : 0;
      let delta = 0;
      if (filter === 1) delta = left;
      else if (filter === 2) delta = up;
      else if (filter === 3) delta = (left + up) >> 1;
      else if (filter === 4) delta = paeth(left, up, upLeft);
      else if (filter !== 0) throw new Error(filePath + ': bad PNG filter ' + filter);
      row[x] = (src + delta) & 255;
    }
    rawOffset += stride;
    row.copy(out, outOffset);
    outOffset += stride;
    prev = row;
  }
  return { width, height, channels, data: out };
}

function opaqueColorSet(filePath) {
  const png = readPngPixels(filePath);
  const colors = new Set();
  for (let i = 0; i < png.data.length; i += png.channels) {
    const r = png.data[i], g = png.data[i + 1], b = png.data[i + 2];
    const a = png.channels === 4 ? png.data[i + 3] : 255;
    if (a < 8) continue;
    const key = r + ',' + g + ',' + b;
    if (key === '255,0,255') continue; // editor-only atlas grid
    colors.add(key);
  }
  return colors;
}

const context = { window:{}, console };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8'), context);
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/maps.js'), 'utf8'), context);
const tileCodes = Object.keys(context.window.PR_MAPS.TILE_PROPS);
const creatureIds = Object.keys(context.window.PR_DATA.CREATURES);

let baselineKeys = null;
let checked = 0;

for (const style of STYLES) {
  const imagePath = path.join(ROOT, 'assets', style.image);
  const jsonPath = path.join(ROOT, 'assets', style.json);
  if (!fs.existsSync(imagePath)) fail(`${style.id}: missing assets/${style.image}`);
  if (!fs.existsSync(jsonPath)) fail(`${style.id}: missing assets/${style.json}`);
  if (!fs.existsSync(jsonPath)) continue;

  if (style.id === 'gbc_yellow' && fs.existsSync(imagePath)) {
    const colors = opaqueColorSet(imagePath);
    if (colors.size > 56) fail(`${style.id}: atlas uses ${colors.size} opaque non-grid colors; expected at most 56`);
  }

  const atlas = readJson(path.join('assets', style.json));
  const frames = atlas.frames || {};
  const frameKeys = Object.keys(frames).sort();
  if (!baselineKeys) baselineKeys = frameKeys;
  else if (baselineKeys.join('\n') !== frameKeys.join('\n')) {
    fail(`${style.id}: frame keys differ from GBA baseline`);
  }

  const codeMap = atlas.tile_code_to_key || {};
  const missingCodes = tileCodes.filter((code) => !codeMap[code]);
  if (missingCodes.length) fail(`${style.id}: missing tile codes ${JSON.stringify(missingCodes)}`);
  for (const [code, key] of Object.entries(codeMap)) {
    if (!frames[key]) fail(`${style.id}: tile ${JSON.stringify(code)} references missing frame ${key}`);
  }

  const variants = atlas.tile_variants || {};
  for (const [code, meta] of Object.entries(variants)) {
    for (const key of meta.random || []) {
      if (!frames[key]) fail(`${style.id}: random variant for ${JSON.stringify(code)} references missing frame ${key}`);
    }
    for (const [name, key] of Object.entries(meta.context || {})) {
      if (!frames[key]) fail(`${style.id}: context variant ${name} for ${JSON.stringify(code)} references missing frame ${key}`);
    }
  }

  for (const id of creatureIds) {
    const key = 'creature_' + id;
    if (!frames[key]) fail(`${style.id}: missing creature frame ${key}`);
  }

  if (!atlas.style || atlas.style.id !== style.id) fail(`${style.id}: missing or incorrect style metadata`);
  if (atlas.image !== style.image) fail(`${style.id}: image metadata should be ${style.image}, got ${atlas.image}`);
  checked++;
}

if (!process.exitCode) {
  console.log(`validated ${checked} atlas styles with ${tileCodes.length} tile codes and ${creatureIds.length} creatures`);
}
