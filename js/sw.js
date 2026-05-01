// PokeRod service worker - caches the app shell for offline play.
'use strict';

const CACHE = 'pokerod-shell-v29';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './js/data.js',
  './js/maps.js',
  './js/sprites.js',
  './js/sprites_chars.js',
  './js/sprites_mons.js',
  './js/input.js',
  './js/ui.js',
  './js/world.js',
  './js/battle.js',
  './js/save.js',
  './js/audio.js',
  './js/audio_sfx.js',
  './js/audio_music.js',
  './js/chatter.js',
  './js/items.js',
  './js/quests.js',
  './js/game.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.all(
      ASSETS.map((url) => c.add(url).catch(() => {}))
    ))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      // Cache successful same-origin responses (best-effort).
      if (res && res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
