// Minimal service worker: makes the site installable and opens the last-loaded screen when offline.
// Data (logins, applications) always comes live from Supabase; openings.json is fetched fresh when online.
const CACHE = "opphub-v1";
self.addEventListener("install", (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/", "/manifest.webmanifest", "/icon-192.png"]))); });
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return; // never touch Supabase calls
  e.respondWith(fetch(req).then((res) => {
    if (res.ok && (req.mode === "navigate" || /\/assets\/|openings\.json|icon|manifest/.test(req.url))) {
      const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req.mode === "navigate" ? "/" : req, copy));
    }
    return res;
  }).catch(() => caches.match(req.mode === "navigate" ? "/" : req)));
});
