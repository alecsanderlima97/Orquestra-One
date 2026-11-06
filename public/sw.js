// Orquestra One — abre sem internet. Páginas: rede primeiro (sempre a versão nova quando há conexão).
// Arquivos de build (/_next/static, com hash no nome): cache primeiro. API e Firebase nunca passam por aqui.
const CACHE = "orquestra-one-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname === "/icon.svg") {
    event.respondWith(caches.match(request).then((hit) => hit || fetch(request).then((response) => {
      if (response.ok) { const copy = response.clone(); caches.open(CACHE).then((cache) => cache.put(request, copy)); }
      return response;
    })));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok && !response.redirected) { const copy = response.clone(); caches.open(CACHE).then((cache) => cache.put(request, copy)); }
      return response;
    }).catch(() => caches.match(request).then((hit) => hit || caches.match("/") || new Response("<h1>Sem conexão</h1><p>Abra o Orquestra One com internet uma vez para usar sem conexão.</p>", { headers: { "content-type": "text/html; charset=utf-8" } }))));
  }
});
