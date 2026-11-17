// Service worker: offline shell, cached audio (with Range support), API fallback.
// Paths are relative to the worker's scope, so it also works under a subpath (GitHub Pages).
// Imported stories live in IndexedDB and play from blob: URLs, which never reach this worker.
const VERSION = "v21";
const SHELL_CACHE = `shell-${VERSION}`;
const AUDIO_CACHE = `audio-${VERSION}`;
const API_CACHE = `api-${VERSION}`;
const CURRENT = [SHELL_CACHE, AUDIO_CACHE, API_CACHE];

const SCOPE = new URL(self.registration.scope);
const SHELL = [
  "./", "style.css", "js/app.js", "js/logic.js", "js/library.js", "js/zip.js", "manifest.webmanifest",
  "icon-192.png", "icon-512.png", "icon-maskable-512.png",
  "fonts/grandstander-700-latin.woff2", "fonts/grandstander-700-latin-ext.woff2",
  "fonts/andika-400-latin.woff2", "fonts/andika-400-latin-ext.woff2",
  "fonts/andika-700-latin.woff2", "fonts/andika-700-latin-ext.woff2",
];

self.addEventListener("install", (event) => {
  // Straight from the server, not the browser's HTTP cache: one stale module next to fresh ones breaks the app.
  event.waitUntil(caches.open(SHELL_CACHE)
    .then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !CURRENT.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // never intercept POST (events) or anything else
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE.pathname)) return;
  const path = url.pathname.slice(SCOPE.pathname.length);

  if (path.startsWith("stories/") && path.endsWith(".mp3")) {
    event.respondWith(audioResponse(req));
  } else if (path.startsWith("api/")) {
    event.respondWith(networkFirst(req, API_CACHE));
  } else if (req.mode === "navigate") {
    event.respondWith(navigation(req));
  } else {
    event.respondWith(networkFirst(req, SHELL_CACHE)); // updates show up when online; offline falls back to the precache
  }
});

// Network first, so updates show up; but a network that neither answers nor fails (wifi without internet)
// gets SLOW_MS before the cached copy is used, and the download still refreshes the cache when it arrives.
const SLOW_MS = 3000;

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const network = fetch(req, { cache: "no-cache" }) // revalidate: never mix files of two versions
    .then(async (res) => { if (res.ok) await cache.put(req, res.clone()); return res; });
  network.catch(() => {}); // a late failure after the cached copy was used is not an error
  const slow = new Promise((resolve) => setTimeout(resolve, SLOW_MS, null));
  try {
    const first = await Promise.race([network, slow]);
    if (first) return first;
    return (await cache.match(req)) ?? (await network);
  } catch (err) {
    const hit = await cache.match(req);
    if (hit) return hit;
    throw err;
  }
}

// The page itself: like the shell, the cached copy after SLOW_MS or when offline.
async function navigation(req) {
  const network = fetch(req);
  network.catch(() => {}); // a late failure after the cached copy was used is not an error
  const slow = new Promise((resolve) => setTimeout(resolve, SLOW_MS, null));
  try {
    const first = await Promise.race([network, slow]);
    if (first) return first;
    return (await caches.match(SCOPE.href)) ?? (await network);
  } catch {
    return caches.match(SCOPE.href);
  }
}

// Audio: cache-first. Always store a full 200 response (fetched without Range),
// and answer Range requests with a 206 sliced from the cached body.
async function audioResponse(req) {
  const cache = await caches.open(AUDIO_CACHE);
  const key = new Request(req.url); // ignore Range and other request headers
  let full = await cache.match(key);
  if (!full) {
    try {
      full = await fetch(key);
    } catch {
      return Response.error();
    }
    if (!full.ok || full.status !== 200) return full;
    await cache.put(key, full.clone());
  }
  const range = req.headers.get("range");
  return range ? rangeResponse(full, range) : full;
}

async function rangeResponse(full, rangeHeader) {
  const buf = await full.arrayBuffer();
  const size = buf.byteLength;
  const m = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!m || (m[1] === "" && m[2] === "")) return new Response(buf, { status: 200, headers: full.headers }); // the body is read
  let start;
  let end;
  if (m[1] === "") { // suffix range: last N bytes
    start = Math.max(0, size - Number(m[2]));
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (start >= size || start > end) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  }
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      "Content-Type": full.headers.get("Content-Type") || "audio/mpeg",
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
    },
  });
}
