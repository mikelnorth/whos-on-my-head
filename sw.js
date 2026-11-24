// Keeps the game and the character pictures on the phone, so it still works with weak signal in line.
const SHELL = 'who-shell-v1';
const PICS = 'who-pics-v1';
const SHELL_FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './apple-touch-icon.png'];
const PIC_HOSTS = ['upload.wikimedia.org', 'static.wikia.nocookie.net'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== PICS).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // The game itself: try the network first so updates arrive, fall back to the saved copy.
  if (url.origin === self.location.origin) {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(SHELL).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html'))));
    return;
  }

  // Character pictures: use the saved copy if we have one.
  if (PIC_HOSTS.includes(url.hostname)) {
    e.respondWith(caches.open(PICS).then(async cache => {
      const hit = await cache.match(req.url);
      if (hit) return hit;
      try {
        const res = await fetch(req.url, { mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer' });
        if (res.ok) cache.put(req.url, res.clone());
        return res;
      } catch (err) {
        return fetch(req); // host without CORS: still show it, just don't save it
      }
    }));
  }
});
